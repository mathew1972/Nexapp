import frappe
from frappe.utils import get_url

import json

@frappe.whitelist()
def send_approval_request(site_name, customer_email, selected_images=None):
    """Generate token, save web_form_link, and send approval email."""
    site = frappe.get_doc("Site", site_name)

    if selected_images:
        try:
            visible_names = json.loads(selected_images)
            inst_notes = frappe.get_all("Installation Note", filters={"custom_circuit_id": site_name, "docstatus": 1}, limit=1)
            if inst_notes:
                inst_doc = frappe.get_doc("Installation Note", inst_notes[0].name)
                if hasattr(inst_doc, "custom_installation_note_attachment"):
                    for item in inst_doc.custom_installation_note_attachment:
                        is_visible = 1 if item.name in visible_names else 0
                        if item.visible_to_customer != is_visible:
                            frappe.db.set_value('Installation Note Attachment', item.name, 'visible_to_customer', is_visible)
        except Exception as e:
            frappe.log_error(title="Failed to parse selected_images in approval_api", message=str(e))

    # Generate token and store in cache (valid for 30 days)
    token = frappe.generate_hash(length=20)
    frappe.cache().set_value(f"site_approval_{token}", site_name, expires_in_sec=30*24*60*60)
    frappe.cache().set_value(f"site_approval_active_{site_name}", token, expires_in_sec=30*24*60*60)

    # Build the public approval URL
    web_form_url = get_url(f"/installation_approval?token={token}")

    return web_form_url

@frappe.whitelist(allow_guest=True)
def get_site_details(token):
    """Fetch site details + installation note images for the approval page."""
    site_name = frappe.cache().get_value(f"site_approval_{token}")
    if not site_name:
        return None

    site_name_str = str(site_name)
    site = frappe.get_doc("Site", site_name_str)

    # Only the latest generated link is valid — compare token against stored web_form_link
    stored_link = getattr(site, "web_form_link", "") or ""
    if stored_link and f"token={token}" not in stored_link:
        return None

    # Link is ONLY active if status is strictly "Awaiting Customer Approval"
    if site.site_status != "Awaiting Customer Approval":
        return None

    # Fetch Installation Note attachments (submitted only)
    attachments = []
    inst_notes = frappe.get_all(
        "Installation Note",
        filters={"custom_circuit_id": site_name, "docstatus": 1},
        fields=["name"],
        limit=1
    )

    if inst_notes:
        inst_doc = frappe.get_doc("Installation Note", inst_notes[0].name)
        if hasattr(inst_doc, "custom_installation_note_attachment"):
            for item in inst_doc.custom_installation_note_attachment:
                if item.attachment and item.visible_to_customer == 1:
                    attachments.append({
                        "url": get_url(item.attachment),
                        "label": item.select_mqjl or "Installation Photo"
                    })

    return {
        "circuit_id": site.circuit_id,
        "delivery_date": str(getattr(site, "date", "")) if getattr(site, "date", "") else "",
        "customer_name": getattr(site, "customer_name", getattr(site, "customer", "")),
        "site_name": site.site_name,
        "site_id": getattr(site, "site_id__legal_code", ""),
        "address": getattr(site, "address_street", ""),
        "additional_information": getattr(site, "additional_information_for_customer", ""),
        "attachments": attachments
    }

@frappe.whitelist()
def get_site_images_for_selection(site_name):
    """Fetch all images from Installation Note to allow staff to select which ones to send."""
    inst_notes = frappe.get_all(
        "Installation Note",
        filters={"custom_circuit_id": site_name, "docstatus": 1},
        fields=["name"],
        limit=1
    )
    if not inst_notes:
        return []

    images = []
    inst_doc = frappe.get_doc("Installation Note", inst_notes[0].name)
    if hasattr(inst_doc, "custom_installation_note_attachment"):
        for item in inst_doc.custom_installation_note_attachment:
            if item.attachment:
                images.append({
                    "name": item.name,
                    "url": get_url(item.attachment),
                    "label": item.select_mqjl or "Photo",
                    "visible": item.visible_to_customer
                })
    return images



@frappe.whitelist(allow_guest=True)
def approve_installation(token, channel="Portal", rating=None, ip_address=None, device_type=None, approver_mobile=None):
    """Mark installation as approved."""
    site_name = frappe.cache().get_value(f"site_approval_{token}")
    if not site_name:
        return {"status": "error", "message": "Invalid or expired token."}

    site_name_str = str(site_name)
    site = frappe.get_doc("Site", site_name_str)

    # Only the latest link is valid
    stored_link = getattr(site, "web_form_link", "") or ""
    if stored_link and f"token={token}" not in stored_link:
        return {"status": "error", "message": "This link has expired."}

    # Link is ONLY active if status is strictly "Awaiting Customer Approval"
    if site.site_status != "Awaiting Customer Approval":
        return {"status": "error", "message": "This link has expired."}

    site.client_installation_approval_status = "Approved"
    site.client_installation_approval_date = frappe.utils.now_datetime()
    site.approval_channel = channel

    if not ip_address:
        ip_address = frappe.local.request_ip if hasattr(frappe.local, 'request_ip') else None

    if ip_address:
        site.customer_ip_address = ip_address
    if device_type:
        site.device_type = device_type
    if rating:
        site.service_rating = float(rating) / 5.0  # Frappe rating is 0-1 scale
    if approver_mobile:
        site.customer_arrpoved_mobile_no = approver_mobile

    site.site_status = "Delivered and Live"
    site.save(ignore_permissions=True)
    frappe.db.commit()

    # If from email direct link, return a web page
    if channel == "Email":
        frappe.respond_as_web_page("Success", "Installation Approved Successfully.", success=True)
        return

    return {"status": "success", "message": "Installation approved successfully."}


@frappe.whitelist(allow_guest=True)
def reject_installation(token, reason=None, channel="Portal", ip_address=None, device_type=None, approver_mobile=None):
    """Mark installation as rejected."""
    site_name = frappe.cache().get_value(f"site_approval_{token}")
    if not site_name:
        return {"status": "error", "message": "Invalid or expired token."}

    site_name_str = str(site_name)
    site = frappe.get_doc("Site", site_name_str)

    # Only the latest link is valid
    stored_link = getattr(site, "web_form_link", "") or ""
    if stored_link and f"token={token}" not in stored_link:
        return {"status": "error", "message": "This link has expired."}

    # Link is ONLY active if status is strictly "Awaiting Customer Approval"
    if site.site_status != "Awaiting Customer Approval":
        return {"status": "error", "message": "This link has expired."}

    site.client_installation_approval_status = "Rejected"
    site.client_installation_approval_date = frappe.utils.now_datetime()
    site.approval_channel = channel

    if not ip_address:
        ip_address = frappe.local.request_ip if hasattr(frappe.local, 'request_ip') else None

    if ip_address:
        site.customer_ip_address = ip_address
    if device_type:
        site.device_type = device_type
    if approver_mobile:
        site.customer_arrpoved_mobile_no = approver_mobile

    site.rejected_reason = reason or "Rejected via Portal"
    site.site_status = "Rejected"
    site.save(ignore_permissions=True)
    frappe.db.commit()

    if channel == "Email":
        frappe.respond_as_web_page("Rejected", "Installation Rejected.", success=True)
        return

    return {"status": "success", "message": "Installation rejected."}
