# /home/mathew/frappe-bench/apps/nexapp/nexapp/api.py



import re
import frappe
import json
import datetime as dt
import requests
import zipfile
import io
import os

def get_bank_gl_account(bank_account_name):
    """
    Returns the GL Account name for a given Bank Account doc name.
    Prioritizes custom_account_head if it exists as a valid GL Account.
    """
    if not bank_account_name:
        return None
    
    # Check if this is a Bank Account record
    acc_data = frappe.db.get_value("Bank Account", bank_account_name, ["account", "custom_account_head"], as_dict=1)
    if not acc_data:
        # If not a Bank Account doc, assume it's already a GL Account or raw string
        return bank_account_name
        
    # Priority 1: custom_account_head (must exist in Account doctype)
    if acc_data.get("custom_account_head") and frappe.db.exists("Account", acc_data.custom_account_head):
        return acc_data.custom_account_head
        
    # Priority 2: Standard account field
    return acc_data.account

@frappe.whitelist()
def handle_ticket_master(ticket_master):
    # Parse JSON string into a dictionary
    ticket_master_doc = json.loads(ticket_master)

    circuit_id = ticket_master_doc.get('circuit_id')
    subject = ticket_master_doc.get('subject')
    description = ticket_master_doc.get('description')
    ticket_master_name = ticket_master_doc.get('name')  # Ensure 'name' is included if needed

    # Try to find a matching circuit record
    circuit = frappe.get_all(
        'Circuit',
        filters={'circuit_id': circuit_id},
        fields=['circuit_id', 'circuit_company']
    )

    if circuit:
        circuit_data = circuit[0]
        frappe.db.set_value('Ticket Master', ticket_master_name, 'company', circuit_data['circuit_company'])
    else:
        # Extract the 8-digit numeric circuit_id from the subject
        v_circuit_id = re.search(r'\b\d{8}\b', subject)
        if v_circuit_id:
            v_circuit_id = v_circuit_id.group()
            frappe.db.set_value('Ticket Master', ticket_master_name, 'circuit_id', v_circuit_id)

        # Map values to Issue Doctype
        issue_data = {
            'doctype': 'Issue',
            'custom_circuit_id': v_circuit_id or circuit_id,
            'subject': subject,
            'raised_by': ticket_master_doc['raised_by_email'],
            'description': description
        }
        issue_doc = frappe.get_doc(issue_data)
        issue_doc.insert()

    # If no circuit match, update description and process 8-digit number
    if not circuit:
        v_circuit_id = re.search(r'\b\d{8}\b', description)
        if v_circuit_id:
            v_circuit_id = v_circuit_id.group()
            frappe.db.set_value('Ticket Master', ticket_master_name, 'circuit_id', v_circuit_id)
            # Create Issue as above
            issue_data['custom_circuit_id'] = v_circuit_id
            issue_doc = frappe.get_doc(issue_data)
            issue_doc.insert()

    return "Processed Successfully"

###########################################################
# Sales Order to Site
import frappe
from frappe.utils import now
from frappe import _

@frappe.whitelist()
def sales_order_to_site(sales_order):
    so_doc = frappe.get_doc("Sales Order", sales_order)

    if not so_doc.po_no:
        frappe.throw(_("Client PO Number is missing in the Sales Order"))

    # Proceed only if order_type is one of the allowed types
    allowed_order_types = ["Service", "Upgrade", "Degrade", "Shifting", "Supply"]
    if so_doc.order_type not in allowed_order_types:
        frappe.logger().info("Site creation skipped for order_type: {}".format(so_doc.order_type))
        return

    grouped_sites = {}

    for item in so_doc.items:
        feasibility = item.custom_feasibility
        if feasibility not in grouped_sites:
            grouped_sites[feasibility] = {
                "circuit_id": feasibility,
                "site_name": item.custom_site_info,
                "items": []
            }
        grouped_sites[feasibility]["items"].append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "qty": item.qty
        })

    project_doc = frappe.get_doc("Project", so_doc.project) if so_doc.project else None

    for feasibility, site_data in grouped_sites.items():
        feasibility_doc = frappe.get_doc("Feasibility", feasibility)

        if not feasibility_doc:
            frappe.throw(_("Feasibility with circuit_id {0} not found").format(feasibility))

        feasibility_doc.sales_order = so_doc.name
        feasibility_doc.sales_order_date = so_doc.transaction_date
        feasibility_doc.save(ignore_permissions=True)

        site_doc = frappe.new_doc("Site")
        site_doc.customer = so_doc.customer
        site_doc.customer_po_no = so_doc.po_no
        site_doc.customer_po_date = so_doc.po_date
        site_doc.sales_order = so_doc.name
        site_doc.sales_order_amount = so_doc.grand_total
        site_doc.customer_po_amount = so_doc.custom_customer_purchase_amount
        site_doc.sales_order_date = so_doc.transaction_date
        site_doc.delivery_date = so_doc.delivery_date
        site_doc.project = so_doc.project
        site_doc.circuit_id = site_data["circuit_id"]
        site_doc.site_name = site_data["site_name"]
        site_doc.order_type = so_doc.order_type

        # From Feasibility
        site_doc.primary_contact = feasibility_doc.primary_contact
        site_doc.primary_contact_mobile = feasibility_doc.primary_contact_mobile
        site_doc.email = feasibility_doc.email
        site_doc.alternate_contact_person = feasibility_doc.alternate_contact_person
        site_doc.alternate_contact = feasibility_doc.alternate_contact
        site_doc.alternate_contact_mobile = feasibility_doc.alternate_contact_mobile
        site_doc.secondary_email = feasibility_doc.secondary_email
        site_doc.site_id__legal_code = feasibility_doc.site_id__legal_code
        site_doc.site_type = feasibility_doc.site_type
        site_doc.solution = feasibility_doc.solution
        site_doc.region = feasibility_doc.region
        site_doc.exiting_circuit_id = feasibility_doc.exiting_circuit_id
        site_doc.territory = feasibility_doc.territory
        site_doc.customer_type = feasibility_doc.customer_type
        site_doc.description = feasibility_doc.description
        site_doc.address = feasibility_doc.address
        site_doc.solution_code = feasibility_doc.solution_code
        site_doc.solution_name = feasibility_doc.solution_name
        site_doc.static_ip = feasibility_doc.static_ip
        site_doc.nos_of_static_ip_required = feasibility_doc.no_of_static_ip_required
        site_doc.primary_data_plan = feasibility_doc.primary_data_plan
        site_doc.secondary_plan = feasibility_doc.secondary_data_plan
        site_doc.managed_services = feasibility_doc.managed_services
        site_doc.config_type = feasibility_doc.config_type
        site_doc.child_project = so_doc.custom_child_project
        site_doc.contact_person = feasibility_doc.contact_person

        site_doc.central_spoke = feasibility_doc.central_spoke
        site_doc.mobile = feasibility_doc.mobile
        site_doc.central_email = feasibility_doc.central_email
        site_doc.sales_person = feasibility_doc.sales_person

        # Address Fields
        site_doc.address_street = feasibility_doc.address_street
        site_doc.pincode = feasibility_doc.pincode
        site_doc.district = feasibility_doc.district
        site_doc.state = feasibility_doc.state
        site_doc.country = feasibility_doc.country
        site_doc.city = feasibility_doc.city

        if project_doc:
            site_doc.project_name = project_doc.project_name
            site_doc.expected_start_date = project_doc.expected_start_date
            site_doc.expected_end_date = project_doc.expected_end_date

        # ---------------------- Site Items ----------------------
        for item in site_data["items"]:
            product_bundle = frappe.get_all(
                "Product Bundle",
                filters={"new_item_code": item["item_code"]},
                fields=["new_item_code"]
            )

            if product_bundle:
                product_bundle_doc = frappe.get_doc("Product Bundle", product_bundle[0].new_item_code)
                for bundle_item in product_bundle_doc.items:
                    item_doc = frappe.get_doc("Item", bundle_item.item_code) if frappe.db.exists("Item", bundle_item.item_code) else None
                    site_doc.append("site_item", {
                        "solution": product_bundle_doc.new_item_code,
                        "parent_item": product_bundle_doc.new_item_code,
                        "item_code": bundle_item.item_code,
                        "item_name": item_doc.item_name if item_doc else "",
                        "qty": bundle_item.qty
                    })
            else:
                site_doc.append("site_item", {
                    "item_code": item["item_code"],
                    "item_name": item["item_name"],
                    "qty": item["qty"]
                })

        # ---------------------- LMS Vendors ----------------------
        for lms in feasibility_doc.lms_provider:
            site_doc.append("lms_vendor", {
                "lms_supplier": lms.lms_supplier,
                "bandwith_type": lms.bandwith_type,
                "media": lms.media,
                "support_mode": lms.support_mode,
                "supplier_contact": lms.supplier_contact,
                "static_ip": lms.static_ip,
                "supplier_name": lms.supplier_name,
                "email_id": lms.email_id,
                "mobile": lms.mobile,
                "bandwidth": lms.bandwidth,
                "billing_mode": lms.billing_mode,
                "billing_terms": lms.billing_terms,
                "otc": lms.otc,
                "validity": lms.validity,
                "security_deposit": lms.security_deposit,
                "mrc": lms.mrc,
                "arc": lms.arc,
                "static_ip_cost": lms.static_ip_cost
            })

        # ---------------------- Wireless ----------------------
        for wireless in feasibility_doc.wireless_feasiblity:
            site_doc.append("wireless", {
                "operator": wireless.operator,
                "3g": wireless.get("3g"),
                "4g": wireless.get("4g"),
                "5g": wireless.get("5g")
            })

        # ==========================================================
        # 🟩 NEW SECTION: Fill Site LMS Feasibility (site_lms_feasibility)
        # ==========================================================
        for lms in feasibility_doc.lms_provider:
            site_doc.append("site_lms_feasibility", {
                "lms_supplier": lms.lms_supplier,
                "bandwith_type": lms.bandwith_type,
                "media": lms.media,
                "support_mode": lms.support_mode,
                "lms_status": lms.lms_status,
                "feasibility_type": lms.feasibility_type,
                "static_ip": lms.static_ip,
                "bandwidth": lms.bandwidth,
                "bandwidth_name": lms.bandwidth_name
            })
        # ==========================================================

        site_doc.insert(ignore_permissions=True)
        frappe.db.commit()

        frappe.logger().info(f"Site created for feasibility: {feasibility}")

    return {"status": "success"}

##############################################################

import frappe

@frappe.whitelist()
def get_stock_details(item_code, warehouse):
    """
    Fetches stock balance and reserved quantities for a given item and warehouse.
    """
    if not item_code or not warehouse:
        return {"item_balance": 0, "item_reserved": 0}
    
    query = """
        SELECT
            SUM(actual_qty) AS item_balance,
            SUM(reserved_qty) AS item_reserved
        FROM
            `tabBin`
        WHERE
            item_code = %s AND warehouse = %s
    """
    result = frappe.db.sql(query, (item_code, warehouse), as_dict=True)
    
    if result and result[0]:
        return {
            "item_balance": result[0].get("item_balance", 0),
            "item_reserved": result[0].get("item_reserved", 0),
        }
    return {"item_balance": 0, "item_reserved": 0}

#################################################################################
import frappe

@frappe.whitelist(allow_guest=True)
def get_filtered_feasibility(customer):
    # Define possible feasibility statuses
    feasibility_statuses = ["Feasible", "Partial Feasible", "High Commercials"]

    # Fetch feasibility records where:
    # 1. The customer matches.
    # 2. The feasibility_status is valid.
    # 3. The sales_order field is empty or null.
    # 4. The document status is 'Submitted' (docstatus = 1).
    feasibilities = frappe.get_all('Feasibility', filters={
        'customer': customer,
        'feasibility_status': ['in', feasibility_statuses],
        'sales_order': ['in', [None, '', 'null']],  # Ensure the sales_order is empty or null
        #'docstatus': 1  # Ensure the document is 'Submitted'
    }, fields=['circuit_id'])

    # Extract the circuit_ids from the feasibility records
    circuit_ids = [feasibility['circuit_id'] for feasibility in feasibilities]

    # Return the list of circuit_ids (empty list if no records found)
    return circuit_ids if circuit_ids else []
############################################################################################3
import frappe

def update_custom_circuit_id_in_stock_reservation(doc, method):
    """
    This function updates the 'custom_circuit_id' in the Stock Reservation Entries
    based on the Sales Order Item's 'custom_feasibility' when the Sales Order is submitted.
    
    Args:
        doc: The current Sales Order document.
        method (str): The event (e.g., 'on_submit') that triggered this function.
    """
    try:
        # Loop through each Sales Order Item
        for item in doc.items:
            # Check if the item has a custom feasibility value
            if item.custom_feasibility:
                # Get the Stock Reservation Entries linked to this Sales Order Item
                stock_reservation_entries = frappe.get_all(
                    "Stock Reservation Entry",
                    filters={"voucher_no": doc.name, "voucher_detail_no": item.name},
                    fields=["name"]
                )

                # Loop through each Stock Reservation Entry
                for entry in stock_reservation_entries:
                    # Update the 'custom_circuit_id' in the Stock Reservation Entry
                    frappe.db.set_value(
                        "Stock Reservation Entry", entry.name, "custom_circuit_id", item.custom_feasibility
                    )
                    frappe.msgprint(f"Updated custom_circuit_id for Stock Reservation Entry: {entry.name}")

    except frappe.DoesNotExistError:
        frappe.msgprint(f"Error: Sales Order {doc.name} does not exist.")
    except Exception as e:
        frappe.msgprint(f"An error occurred: {str(e)}")

###############################################################################
import frappe

@frappe.whitelist()
def fetch_provisioning_items(custom_circuit_id):
    # Validate input
    if not custom_circuit_id:
        return {"error": "Custom Circuit ID is required."}

    # Fetch the Site document with the matching Circuit ID
    site_doc = frappe.get_all("Site", filters={"circuit_id": custom_circuit_id}, fields=["name"])
    if not site_doc:
        return {"error": f"No Site found with Circuit ID: {custom_circuit_id}"}

    site_name = site_doc[0]["name"]
    site_data = frappe.get_doc("Site", site_name)

    # Prepare data for 'custom_product_' (existing functionality)
    provisioning_items = []
    if hasattr(site_data, "provisioning_item"):
        for item in site_data.provisioning_item:
            provisioning_items.append({
                "product_code": item.product_code or None, 
                "product_name": item.product or None,                               
                "serial_number": item.serial_number or None,
                "warranty_expiry_date": item.warranty_expiry_date or None,
                "warranty_period_days": item.warranty_period_days or None               
                
            })

    # Prepare data for 'custom_lms_vendor' (new functionality, corrected to 'lms_vendor')
    lms_items = []
    if hasattr(site_data, "lms_vendor"):  # Corrected to 'lms_vendor'
        for item in site_data.lms_vendor:
            lms_items.append({
                "lms_supplier": item.lms_supplier or None,
                "bandwith_type": item.bandwith_type or None,
                "media": item.media or None,
                "otc": item.otc or 0,
                "static_ip_cost": item.static_ip_cost or 0,
                "billing_terms": item.billing_terms,
                "support_mode": item.support_mode or None,
                "contact_person": item.contact_person or None,
                "supplier_contact": item.supplier_contact or None,
                "lms_bandwith": item.lms_bandwith or None,
                "static_ip": item.static_ip or None,
                "mrc": item.mrc or 0,
                "security_deposit": item.security_deposit or 0,
                "billing_mode": item.billing_mode 
            })

    # Return data
    return {
        "provisioning_items": provisioning_items,
        "lms_items": lms_items
    }

#################################################################################
import frappe

def update_site_status_on_delivery_note_save(doc, method):
    """Update the site_status of Site Doctype based on Delivery Note Items,
    except for certain custom_change_management types or return Delivery Notes."""

    # Skip updating if custom_change_management is one of the excluded types
    excluded_types = ["Project Change Management", "Support Change Management", "Others"]
    if doc.get("custom_change_management") in excluded_types:
        return  # Do not update site_status

    # Skip updating if this Delivery Note is a return
    if doc.get("is_return") == 1:
        return  # Do not update site_status

    for item in doc.items:
        # Check if custom_circuit_id exists for the item
        if item.custom_circuit_id:
            # Search for the Site doctype with matching circuit_id
            site = frappe.db.get_value("Site", {"circuit_id": item.custom_circuit_id}, "name")
            
            if site:
                # Get the Site document
                site_doc = frappe.get_doc("Site", site)
                
                # Update the site_status field
                site_doc.site_status = "In-process"
                
                # Save the updated Site document
                site_doc.save(ignore_permissions=True)

################################# HelpDesk ############################################import frappe
import frappe
import re
from datetime import timedelta
from email.utils import getaddresses


REOPEN_WINDOW = timedelta(hours=4)


def create_hd_ticket_from_communication(doc, method):
    try:

        # =========================================================
        # 0️⃣ PROCESS ONLY INCOMING EMAILS
        # =========================================================
        if doc.sent_or_received != "Received":
            return

        sender = (doc.sender or "").lower()
        recipients = doc.recipients or ""

        recipient_emails = [
            email.strip().lower()
            for _, email in getaddresses([recipients])
        ]

        # =========================================================
        # 1️⃣ ONLY SUPPORT / NMS EMAILS
        # =========================================================
        if (
            "techsupport@nexapp.co.in" not in recipient_emails
            and "nms@nexapp.co.in" not in sender
        ):
            return

        # =========================================================
        # 2️⃣ SKIP AUTO / BOUNCE EMAILS
        # =========================================================
        auto_senders = ["mailer-daemon", "postmaster@", "no-reply", "mailer@"]

        if any(x in sender for x in auto_senders):
            return

        combined_failure_check = f"{doc.subject or ''} {doc.content or ''}".lower()

        failure_keywords = [
            "delivery failed",
            "could not be delivered",
            "mail delivery subsystem",
            "permanent error",
        ]

        if any(keyword in combined_failure_check for keyword in failure_keywords):
            return

        # =========================================================
        # 3️⃣ EXTRACT CIRCUIT ID
        # =========================================================
        combined_text = f"{doc.subject or ''} {doc.content or ''}"

        circuit_match = re.search(
            r"(?:circuit[#_ ]|^|[^0-9])(\d{5})(?=[^0-9]|$)",
            combined_text,
            flags=re.IGNORECASE,
        )

        circuit_id = circuit_match.group(1) if circuit_match else ""

        if not circuit_id:
            return

        # =========================================================
        # 4️⃣ GET LATEST TICKET
        # =========================================================
        existing_ticket = frappe.db.get_value(
            "HD Ticket",
            {"custom_circuit_id": circuit_id},
            ["name", "status", "custom_close_datetime", "resolution_date"],
            as_dict=True,
            order_by="creation desc",
        )

        # =========================================================
        # 🟢 CASE A — OPEN TICKET EXISTS
        # =========================================================
        if existing_ticket and existing_ticket.status not in ["Closed", "Resolved"]:

            frappe.db.set_value(
                "Communication",
                doc.name,
                {
                    "reference_doctype": "HD Ticket",
                    "reference_name": existing_ticket.name,
                    "status": "Linked",
                },
            )

            if sender != "nms@nexapp.co.in":
                frappe.enqueue(
                    send_ticket_reply,
                    queue="short",
                    enqueue_after_commit=True,
                    communication_name=doc.name,
                    sender=sender,
                    ticket_name=existing_ticket.name,
                    circuit_id=circuit_id,
                    status=existing_ticket.status,
                    template="existing",
                )

            return

        # =========================================================
        # 🟡 CASE B — CLOSED / RESOLVED
        # =========================================================
        if existing_ticket and existing_ticket.status in ["Closed", "Resolved"]:

            close_time = (
                existing_ticket.custom_close_datetime
                or existing_ticket.resolution_date
            )

            if close_time:

                close_dt = frappe.utils.get_datetime(close_time)
                now_dt = frappe.utils.now_datetime()

                if now_dt - close_dt <= REOPEN_WINDOW:

                    ticket_doc = frappe.get_doc("HD Ticket", existing_ticket.name)

                    ticket_doc.status = "Open"
                    ticket_doc.add_comment(
                        "Info",
                        "Ticket reopened automatically due to new email within allowed time.",
                    )

                    ticket_doc.save(ignore_permissions=True)

                    frappe.db.set_value(
                        "Communication",
                        doc.name,
                        {
                            "reference_doctype": "HD Ticket",
                            "reference_name": ticket_doc.name,
                            "status": "Linked",
                        },
                    )

                    if sender != "nms@nexapp.co.in":
                        frappe.enqueue(
                            send_ticket_reply,
                            queue="short",
                            enqueue_after_commit=True,
                            communication_name=doc.name,
                            sender=sender,
                            ticket_name=ticket_doc.name,
                            circuit_id=circuit_id,
                            status="Reopened",
                            template="reopened",
                        )

                    return

        # =========================================================
        # 🔴 CASE C — CREATE NEW TICKET
        # =========================================================
        if frappe.db.exists("Site", circuit_id):

            # =====================================================
            # 🆕 EXTRACT LMS ID FROM SUBJECT (IMPROVED)
            # =====================================================
            custom_lms_id = ""
            subject_text = doc.subject or ""

            if "offline alert" in subject_text.lower():

                lms_match = re.search(
                    r"(?:MBB|ILL)[_\-\s]?(\d{6})",
                    subject_text,
                    re.IGNORECASE,
                )

                if lms_match:
                    var = lms_match.group(1)
                    custom_lms_id = f"LMS- {var}"

            # =====================================================
            # CREATE TICKET
            # =====================================================
            ticket = frappe.get_doc({
                "doctype": "HD Ticket",
                "subject": doc.subject,
                "description": doc.content,
                "raised_by": sender,
                "status": "Open",
                "custom_circuit_id": circuit_id,
                "custom_lms_id": custom_lms_id,
                "custom_channel": "NMS"
                if "nms@nexapp.co.in" in sender
                else "Email",
            })

            ticket.insert(ignore_permissions=True)

            frappe.db.set_value(
                "Communication",
                doc.name,
                {
                    "reference_doctype": "HD Ticket",
                    "reference_name": ticket.name,
                    "status": "Linked",
                },
            )

            if sender != "nms@nexapp.co.in":
                frappe.enqueue(
                    send_ticket_reply,
                    queue="short",
                    enqueue_after_commit=True,
                    communication_name=doc.name,
                    sender=sender,
                    ticket_name=ticket.name,
                    circuit_id=circuit_id,
                    status="Open",
                    template="new",
                )

            return

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "HD Ticket Auto-Creation Error",
        )


# =========================================================
# 📧 EMAIL REPLY FUNCTION
# =========================================================

def send_ticket_reply(communication_name, sender, ticket_name, circuit_id, status, template):

    subject = f"Re: Circuit {circuit_id} — Ticket {ticket_name}"

    if template == "reopened":
        body = f"""
        Your previous ticket has been reopened.<br><br>
        <b>Ticket:</b> {ticket_name}<br>
        <b>Circuit:</b> {circuit_id}<br><br>
        Our team will continue working on this issue.
        """

    elif template == "new":
        body = f"""
        Your previous ticket could not be reopened because the 4-hour reopening window had already expired.
        As a result, a new support ticket has been created to address your request.<br><br>

        <b>New Ticket Number:</b> {ticket_name}<br>
        <b>Circuit ID:</b> {circuit_id}<br><br>

        Our support team will continue working on this issue under the new ticket.
        All further updates will be shared through this ticket.<br><br>

        Thank you for your cooperation.
        """

    else:
        body = f"""
        Your email has been linked to the existing ticket.<br><br>
        <b>Ticket:</b> {ticket_name}<br>
        <b>Circuit:</b> {circuit_id}<br>
        <b>Status:</b> {status}
        """

    message = f"""
    Dear Customer,<br><br>
    Thank you for contacting Nexapp Support.<br><br>
    {body}<br><br>
    Thanks & Regards,<br>
    Nexapp Technologies Private Limited<br>
    Support Team
    Phone: 02067629999
    """

    reply = frappe.get_doc({
        "doctype": "Communication",
        "communication_type": "Communication",
        "communication_medium": "Email",
        "sent_or_received": "Sent",
        "subject": subject,
        "content": message,
        "sender": "techsupport@nexapp.co.in",
        "recipients": sender,
        "in_reply_to": communication_name,
        "reference_doctype": "HD Ticket",
        "reference_name": ticket_name,
    })

    reply.insert(ignore_permissions=True)

    frappe.sendmail(
        recipients=[sender],
        subject=subject,
        message=message,
        reference_doctype="HD Ticket",
        reference_name=ticket_name,
        communication=reply.name,
    )
################################# End of HelpDesk Code################################
import frappe
from frappe.utils import get_url
from frappe.utils.pdf import get_pdf
import hashlib

@frappe.whitelist()
def download_subcategory_pdf(subcategory):
    # Get documents with strict filters
    docs = frappe.get_all("Document",
        filters={
            "sub_category": subcategory,
            "published": 1
        },
        fields=["name", "title", "content", "attach_file"],
        order_by="creation"
    )

    # Advanced duplicate prevention
    seen = set()
    html = """
    <style>
        body { font-family: Arial; margin: 20px; }
        h1 { color: #2d3e50; border-bottom: 2px solid #eee; }
        .document { margin-bottom: 30px; }
        img { max-width: 100%%; height: auto; margin: 15px 0; }
    </style>
    <h1>%s Documentation</h1>
    """ % subcategory

    for doc in docs:
        # Create unique hash for content
        content_hash = hashlib.md5(f"{doc.title}{doc.content}".encode()).hexdigest()
        if content_hash in seen:
            continue
        seen.add(content_hash)
        
        image_html = f'<img src="{get_url(doc.attach_file)}">' if doc.attach_file else ''
        html += f"""
        <div class="document">
            <h2>{doc.title}</h2>
            <div>{doc.content}</div>
            {image_html}
        </div>
        <hr style="margin:20px 0; border-top:1px solid #eee;">
        """

    pdf_data = get_pdf(html)
    frappe.local.response.filename = f"{subcategory}-documentation.pdf"
    frappe.local.response.filecontent = pdf_data
    frappe.local.response.type = "pdf"

######################################################################
import frappe

def customer_created(doc, method):
    # Fetch all Feasibility records where 'customer' matches the new Customer name
    feasibilities = frappe.get_all(
        "Feasibility",
        filters={"customer": doc.customer_name},
        fields=["name", "party_name", "feaseibility_from"]
    )

    for feas in feasibilities:
        # If 'feaseibility_from' is not already 'Customer', update it
        if feas.feaseibility_from != "Customer":
            frappe.db.set_value("Feasibility", feas.name, "feaseibility_from", "Customer")
        
        # If 'party_name' matches the Customer name, also set 'customer' = 'party_name'
        if feas.party_name == doc.customer_name:
            frappe.db.set_value("Feasibility", feas.name, "customer", feas.party_name)

#########################################################################################
import frappe

@frappe.whitelist()
def create_site_from_feasibility(doc, method=None):
    # If doc is passed as a string (usually docname), fetch the document
    if isinstance(doc, str):
        doc = frappe.get_doc("Feasibility", doc)

    # Proceed only if customer is POC
    if doc.customer_type == "POC Customer":
        site = frappe.new_doc("Site")

        # Map relevant fields from Feasibility to Site
        site.site_name = doc.site_name
        site.customer = doc.customer
        site.site_type = doc.site_type
        site.territory = doc.territory
        site.customer_type = doc.customer_type
        site.order_type = doc.order_type
        site.circuit_id = doc.name  # using the feasibility doc name as circuit ID
        site.site_id__legal_code = doc.site_id__legal_code
        site.description = doc.description

        # Address and contact details
        site.address_street = doc.address_street
        site.city = doc.city
        site.contact_person = doc.contact_person
        site.primary_contact_mobile = doc.primary_contact_mobile
        site.email = doc.email
        site.pincode = doc.pincode
        site.district = doc.district
        site.state = doc.state
        site.country = doc.country
        site.alternate_contact_person = doc.alternate_contact_person
        site.alternate_contact_mobile = doc.alternate_contact_mobile
        site.secondary_email = doc.secondary_email

        # Technical and solution-specific fields
        site.solution_code = doc.solution_code
        site.solution_name = doc.solution_name
        site.static_ip = doc.static_ip
        site.nos_of_static_ip_required = doc.no_of_static_ip_required
        site.primary_data_plan = doc.primary_data_plan
        site.secondary_plan = doc.secondary_data_plan
        site.managed_services = doc.managed_services
        site.config_type = doc.config_type

        # Insert new Site document ignoring permissions
        site.insert(ignore_permissions=True)
        frappe.db.commit()  # Save to DB before modifying child table

        # Add child items from the matching Product Bundle
        try:
            product_bundle = frappe.get_doc("Product Bundle", doc.solution_code)
            for item in product_bundle.items:
                site.append("site_item", {
                    "item_code": item.item_code,
                    "qty": item.qty
                })
            site.save()
        except frappe.DoesNotExistError:
            frappe.msgprint(f"No Product Bundle found with name '{doc.solution_code}'")

        frappe.msgprint(f"Site '{site.name}' POC Customer directly created.")
        return site.name  # Return Site name for confirmation on frontend

    return "Not POC Customer"
#####################################################################################

def update_site_and_stock_management(doc, method):
    # Stop if change management type is in restricted list
    if doc.custom_change_management in [
        "Project Change Management",
        "Support Change Management",
        "Others"
    ]:
        return

    if not doc.custom_circuit_id or not doc.tracking_status:
        return

    # Define status mappings for Site, Site Item, and Stock Management
    status_mapping = {
        "In Progress": {
            "stage": "Shipment In-Transit",
            "site_item_status": "Shipment In-Transit",
            "stock_status": "Stock Shipment In-Transit"
        },
        "Delivered": {
            "stage": "Stock Delivered",
            "site_item_status": "Stock Delivered",
            "stock_status": "Stock Delivered"
        },
        "Returned": {
            "stage": "Stock Returned",
            "site_item_status": "Stock Returned",
            "stock_status": "Stock Returned"
        },
        "Lost": {
            "stage": "Stock Lost",
            "site_item_status": "Stock Lost",
            "stock_status": "Stock Lost"
        }
    }

    # Get the appropriate statuses from mapping
    mapping = status_mapping.get(doc.tracking_status, {})
    if not mapping:
        return

    # 1. Update Stock Management records where circuit_id matches
    stock_management_records = frappe.get_all(
        "Stock Management",
        filters={"circuit_id": doc.custom_circuit_id},
        fields=["name"]
    )

    for stock in stock_management_records:
        stock_doc = frappe.get_doc("Stock Management", stock.name)
        stock_doc.update({
            "shipment_id": doc.name,
            "service_provider": doc.service_provider,
            "delivery_date": doc.custom_delivery_date,
            "pickup_date": doc.pickup_date,
            "awb_number": doc.awb_number,
            "carrier": doc.carrier,
            "carrier_service": doc.carrier_service,
            "tracking_status": doc.tracking_status,
            "status": mapping["stock_status"]
        })
        stock_doc.save(ignore_permissions=True)
        frappe.msgprint(f"Updated Stock Management {stock.name} to {mapping['stock_status']}")

    def update_site_with_items(site_doc):
        """Helper function to update Site doc and its site_item child table"""
        # Update main Site fields
        site_doc.update({
            "shipment_id": doc.name,
            "service_provider": doc.service_provider,
            "delivery_date": doc.custom_delivery_date,
            "pickup_date": doc.pickup_date,
            "awb_number": doc.awb_number,
            "carrier": doc.carrier,
            "carrier_service": doc.carrier_service,
            "tracking_status": doc.tracking_status,
            "stage": mapping["stage"]
        })

        # Update site_item child table status if exists
        if hasattr(site_doc, 'site_item') and site_doc.get('site_item'):
            for item in site_doc.site_item:
                item.status = mapping["site_item_status"]

        site_doc.save(ignore_permissions=True)
        return site_doc

    # 2. Update Site where name matches custom_circuit_id
    if frappe.db.exists("Site", doc.custom_circuit_id):
        site_doc = frappe.get_doc("Site", doc.custom_circuit_id)
        updated_doc = update_site_with_items(site_doc)
        frappe.msgprint(f"Updated Site {doc.custom_circuit_id} stage to {mapping['stage']} and items to {mapping['site_item_status']}")

    # 3. Update Sites where circuit_id matches custom_circuit_id
    sites_with_circuit_id = frappe.get_all(
        "Site",
        filters={"circuit_id": doc.custom_circuit_id},
        fields=["name"]
    )

    for site in sites_with_circuit_id:
        site_doc = frappe.get_doc("Site", site.name)
        updated_doc = update_site_with_items(site_doc)
        frappe.msgprint(f"Updated Site {site.name} (via circuit_id) stage to {mapping['stage']} and items to {mapping['site_item_status']}")

    frappe.db.commit()

####################################################################################
# Updating Site From Delivery Note
import frappe
from frappe import _

def validate_delivery_note(doc, method):
    """Update Site status, Site Items, and map serial numbers when Delivery Note is saved"""
    try:
        # Values for which we skip updating Site stage
        skip_values = ["Project Change Management", "Support Change Management", "Others"]

        # Run update only if order type is Service, circuit_id exists, and not a return
        if (
            doc.get("custom_order_type") == "Service" 
            and doc.get("custom_dn_circuit_id") 
            and not doc.get("is_return")
        ):
            
            # Skip if custom_change_management is in skip_values
            if doc.get("custom_change_management") in skip_values:
                frappe.logger().info(
                    f"Skipped site stage update because change management is '{doc.get('custom_change_management')}'"
                )
                return  # exit without updating site stage

            site_name = doc.custom_dn_circuit_id

            # Update main Site document
            frappe.db.set_value(
                "Site", 
                site_name, 
                "stage", 
                "Stock Delivery In-Process",
                update_modified=False
            )

            # Get all Site Items for this Site
            site_items = frappe.get_all(
                "Site Item",
                filters={"parent": site_name},
                fields=["name", "item_code"]
            )

            # Get all packed items from Delivery Note
            packed_items = doc.get("packed_items", [])

            # Build a list of packed_items with item_code and serial_no
            packed_serial_items = [
                pi for pi in packed_items
                if pi.item_code and pi.serial_no
            ]

            # Copy the packed list so we can consume items as we match
            remaining_packed = packed_serial_items[:]

            # Match each Site Item with one corresponding packed item
            for site_item in site_items:
                for i, packed in enumerate(remaining_packed):
                    if packed.item_code == site_item.item_code:
                        # Load the full Site Item document
                        site_item_doc = frappe.get_doc("Site Item", site_item.name)
                        site_item_doc.status = "Delivery In-Process"
                        site_item_doc.serial_no_sim_no = packed.serial_no

                        # Save and trigger fetch_from
                        site_item_doc.save(ignore_permissions=True)

                        # Optional: real-time UI update
                        frappe.publish_realtime('doc_update', {
                            'doc': site_item_doc.as_dict(),
                            'name': site_item_doc.name,
                            'doctype': 'Site Item'
                        })

                        # Remove used packed item to avoid duplicate usage
                        remaining_packed.pop(i)
                        break  # Go to next Site Item

            # Optional: refresh parent Site document on the UI
            frappe.publish_realtime('doc_update', {
                'doc': frappe.get_doc("Site", site_name).as_dict(),
                'name': site_name,
                'doctype': 'Site'
            })

        else:
            if doc.get("is_return"):
                frappe.logger().info("Skipped site stage update because Delivery Note is a return")

    except Exception as e:
        frappe.log_error(f"Error updating Site from Delivery Note: {e}")
        frappe.throw(_("Error updating Site. Please check error logs."))

#########################################
# PO Update to Site and LMS
import frappe
from frappe.utils import now

def update_lastmile_on_po_save(doc, method):
    if not doc.custom_lms_id:
        return

    frappe.db.set_value("Lastmile Services Master", doc.custom_lms_id, {
        "lms_stage": "In process",
        "po_number": doc.name,
        "po_released_datetime": now()
    })
##################################################
import frappe

def update_lms_on_payment_submit(doc, method):
    if not doc.lms_id:
        frappe.msgprint("No LMS ID provided. Skipping update.")
        return

    # Update the Lastmile Services Master document
    frappe.db.set_value("Lastmile Services Master", doc.lms_id, {
        "payment_details": doc.payment_details,
        "payment_date": doc.date_of_payment,
        "payment_type": doc.payment_type,
        "payment_amount": doc.payment_amount,
        "lms_payment_request": "LMS Payment Released"
    })

    frappe.msgprint(f"Updated Lastmile Services Master: {doc.lms_id}")
#################################################################################3
import frappe

def update_site_child_table(doc, method):
    frappe.logger().info(f"[DEBUG] Running update_site_child_table for {doc.name}")

    # ---------------------------------------------------------
    # NEW CONDITION: Run only when lms_stage == "In process"
    # ---------------------------------------------------------
    if doc.lms_stage != "In process":
        frappe.logger().info(f"[DEBUG] lms_stage is not 'In process' for {doc.name}, exiting.")
        return

    # Exit if no delivery date is set
    if not doc.lms_delivery_date:
        frappe.logger().info(f"[DEBUG] No delivery date set for {doc.name}, exiting.")
        return

    # Ensure lms_stage is updated to Delivered in the Master
    if doc.lms_stage != "Delivered":
        doc.db_set("lms_stage", "Delivered")
        frappe.logger().info(f"[DEBUG] lms_stage updated to Delivered for {doc.name}")

    if doc.circuit_id:
        try:
            site = frappe.get_doc("Site", doc.circuit_id)
            found = False

            # Check if a child row with lms_id == doc.name already exists
            for row in site.get("lms_vendor", []):
                if row.lms_id == doc.name:
                    found = True
                    break

            # If no matching row found, create a new child row
            if not found:
                new_row = site.append("lms_vendor", {})
                new_row.lms_id = doc.name
                new_row.lms_supplier = doc.lms_feasibility_partner
                new_row.supplier_contact = doc.supplier_contact
                new_row.bandwith_type = doc.bandwith_type
                new_row.media = doc.media
                new_row.lms_requested_id = doc.lms_request_id
                new_row.mobile = doc.suppliernumber
                new_row.bandwidth = doc.lms_bandwith
                new_row.brandwidth_name = doc.lms_brandwith_name
                frappe.logger().info(f"[DEBUG] New child row created in Site: {site.name}")

            # Update the matching child row
            for row in site.get("lms_vendor", []):
                if row.lms_id == doc.name:
                    row.stage = "LMS Delivered"
                    row.mode = doc.mode1
                    row.static_ip1 = doc.get("static_ip")
                    row.url = doc.get("url")
                    row.user_id = doc.get("user_id")
                    row.password = doc.get("password")
                    row.lms_delivery_date = doc.lms_delivery_date
                    frappe.logger().info(f"[DEBUG] Child row updated in Site: {site.name}")
                    break

            # Update lms_stage of Site
            lms_type = site.get("lms_type")
            current_stage = site.get("lms_stage")

            if lms_type == "Dual":
                if current_stage == "In process":
                    site.lms_stage = "LMS Partially Delivered"
                else:
                    site.lms_stage = "LMS Delivered"
            elif lms_type == "Single":
                site.lms_stage = "LMS Delivered"

            site.save()
            frappe.logger().info(f"[DEBUG] Site {site.name} saved with updated lms_stage.")

        except frappe.DoesNotExistError:
            frappe.throw(f"Site {doc.circuit_id} does not exist")

######################################################################################
import frappe

@frappe.whitelist()
def generate_and_update_mac_addresses(work_order_name):
    OUI = '840A9E'  # 3-byte OUI hex string (no separators)

    # Parse OUI hex to integer
    v = 0
    for ch in OUI:
        if '0' <= ch <= '9':
            d = ord(ch) - ord('0')
        elif 'A' <= ch <= 'F':
            d = ord(ch) - ord('A') + 10
        else:
            d = 0
        v = v * 16 + d

    base_int = v * (16 ** 6)  # Shift left 24 bits

    try:
        doc = frappe.get_doc("Work Order", work_order_name)
        count_per_sn = int(doc.custom_nos_of_mac_address or 0)
        mac_type = doc.custom_mac_type
    except Exception:
        return "Invalid Work Order or custom_nos_of_mac_address"

    if count_per_sn <= 0 and mac_type == "ETH":
        return "No MAC addresses requested"

    # Get Serial Nos linked to the Work Order
    serial_rows = frappe.db.sql(
        "SELECT name FROM `tabSerial No` WHERE work_order=%s",
        (work_order_name,), as_list=True
    )

    if not serial_rows:
        return "No Serial Nos linked to this Work Order"

    # Check if any Serial No already has MAC addresses in child table 'custom_mac'
    for sn_name in [r[0] for r in serial_rows]:
        mac_count = frappe.db.count('MAC Address', filters={'parent': sn_name, 'parentfield': 'custom_mac'})
        if mac_count > 0:
            return "MAC address already created"

    # Get all existing MAC addresses globally to avoid duplicates
    existing_macs = set()
    rows = frappe.db.sql("SELECT mac_address FROM `tabMAC Address`", as_list=True)
    for row in rows:
        existing_macs.add(row[0].upper())

    shifts = [44,40,36,32,28,24,20,16,12,8,4,0]
    digits = '0123456789ABCDEF'

    macs_generated = 0
    mac_int_counter = 0

    def get_unique_mac():
        nonlocal mac_int_counter
        while True:
            mac_int = base_int + mac_int_counter
            mac_int_counter += 1

            mac_hex = ''
            for shift in shifts:
                nibble = (mac_int >> shift) & 0xF
                mac_hex += digits[nibble]
                if shift > 0 and shift % 8 == 0:
                    mac_hex += ':'

            mac_hex = mac_hex.upper()
            if mac_hex not in existing_macs:
                existing_macs.add(mac_hex)
                return mac_hex

    for sn_name in [r[0] for r in serial_rows]:
        sn = frappe.get_doc("Serial No", sn_name)
        sn.set("custom_mac", [])  # Clear existing MACs just in case

        if mac_type == "ETH":
            # Generate MACs with ETH1, ETH2, ... up to ETH10
            for i in range(1, min(count_per_sn, 10) + 1):
                mac_hex = get_unique_mac()
                sn.append("custom_mac", {
                    "mac_address": mac_hex,
                    "interface": f"ETH{i}"
                })
                macs_generated += 1

        elif mac_type == "LAN/WAN/WIFI":
            # New behavior: generate 3 MACs for LAN, WAN, WIFI
            for iface in ["LAN", "WAN", "WIFI"]:
                mac_hex = get_unique_mac()
                sn.append("custom_mac", {
                    "mac_address": mac_hex,
                    "interface": iface
                })
                macs_generated += 1

        sn.save(ignore_permissions=True)

    return f"Generated and assigned {macs_generated} MAC addresses"

#############################################################################3
   
import frappe

@frappe.whitelist()
def is_l1_support_user():
    """Check if current user has ONLY L1 Support role (not other admin/support roles)"""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    # Strict check - only hide if user has L1 Support and no other privileged roles
    if "L1 Support" in roles and not any(role in ["Administrator", "System Manager", "Support Manager"] for role in roles):
        return True
    return False
#####################################################################################
import frappe
from frappe import _
from frappe.utils import nowdate

@frappe.whitelist()
def check_feasibility_or_site(circuit_id):
    if frappe.db.exists("Feasibility", circuit_id):
        return {"status": "feasibility_exists"}

    site_doc = frappe.db.get("Site", circuit_id)
    if site_doc:
        return {"status": "site_exists"}

    return {"status": "not_found"}


@frappe.whitelist()
def create_feasibility_from_site(circuit_id):
    if frappe.db.exists("Feasibility", circuit_id):
        return _("Feasibility already exists for Circuit ID: {0}").format(circuit_id)

    site_doc = frappe.db.get("Site", circuit_id)
    if not site_doc:
        return _("Site not found for Circuit ID: {0}").format(circuit_id)

    frappe.publish_realtime('msgprint', {
        "message": _("System is creating Feasibility. Please wait a few seconds..."),
        "title": _("Please Wait"),
        "indicator": "orange"
    })

    # Create Feasibility doc
    feasibility_doc = frappe.get_doc({
        "doctype": "Feasibility",
        "customer_type": site_doc.customer_type,
        "order_type": site_doc.order_type,
        "customer": site_doc.customer,
        "feasibility_status": "Feasible",
        "site_name": site_doc.site_name,
        "customer_request": nowdate(),
        "site_type": site_doc.site_type,
        "territory": site_doc.territory,
        "solution_code": site_doc.solution_code,
        "static_ip": site_doc.static_ip,
        "managed_services": site_doc.managed_services,
        "config_type": site_doc.config_type,
        "address_street": site_doc.address_street,
        "pincode": site_doc.pincode,
        "district": site_doc.district,
        "state": site_doc.state,
        "country": site_doc.country,
        "city": site_doc.city,
        "contact_person": site_doc.contact_person,
        "primary_contact_mobile": site_doc.primary_contact_mobile,
    })

    feasibility_doc.insert(ignore_permissions=True, ignore_mandatory=True)

    # Rename feasibility
    old_name = feasibility_doc.name
    if old_name != circuit_id:
        frappe.rename_doc("Feasibility", old_name, circuit_id, force=True, merge=False)

    # Update related CMR
    cmr_name = frappe.db.get_value("Change Management Request", {"circuit_id": circuit_id})
    if cmr_name:
        cmr_doc = frappe.get_doc("Change Management Request", cmr_name)

        # ✅ Ensure isp_status is updated
        frappe.db.set_value("Change Management Request", cmr_name, {
            "isp_status": "Feasibility Requested"
        })

        # ✅ Update Feasibility from CMR
        frappe.db.set_value("Feasibility", circuit_id, {
            "isp_change_feasibility_check": 1,
            "lms_id": cmr_doc.lms_id,
            "isp_change_issue": cmr_doc.isp_change_issue,
            "supplier": cmr_doc.supplier,
            "purchase_order_number": cmr_doc.purchase_order_number,
            "purchase_order_date": cmr_doc.purchase_order_date,
            "change_management_request_id": cmr_name,
            "expected_date": cmr_doc.expected_date
        })

        # ✅ Sync LMS ID back to CMR if not present
        if not cmr_doc.lms_id:
            feasibility_lms_id = frappe.db.get_value("Feasibility", circuit_id, "lms_id")
            if feasibility_lms_id:
                frappe.db.set_value("Change Management Request", cmr_name, "lms_id", feasibility_lms_id)

    return _("Feasibility created, renamed, and updated for Circuit ID: {0}").format(circuit_id)


def on_update(doc, method):
    if not doc.circuit_id:
        frappe.msgprint(_("Change Management Request {}").format("created successfully" if doc.is_new() else "updated"))
        return

    if not frappe.db.exists("Feasibility", doc.circuit_id):
        frappe.msgprint(
            title=_("Updated"),
            msg=_("Change Management Request updated") + "<br><span style='color:red'>" + _("Feasibility not found.") + "</span>",
            indicator="blue"
        )
        return

    # ✅ Update feasibility
    frappe.db.set_value("Feasibility", doc.circuit_id, {
        "isp_change_feasibility_check": 1,
        "lms_id": doc.lms_id,
        "isp_change_issue": doc.isp_change_issue,
        "supplier": doc.supplier,
        "purchase_order_number": doc.purchase_order_number,
        "purchase_order_date": doc.purchase_order_date,
        "change_management_request_id": doc.name,
        "expected_date": doc.expected_date
    })

    # ✅ Update isp_status consistently
    frappe.db.set_value("Change Management Request", doc.name, "isp_status", "Feasibility Requested")

    # ✅ Sync LMS ID from Feasibility if missing in CMR
    lms_synced = False
    if not doc.lms_id:
        feasibility_lms_id = frappe.db.get_value("Feasibility", doc.circuit_id, "lms_id")
        if feasibility_lms_id:
            frappe.db.set_value("Change Management Request", doc.name, "lms_id", feasibility_lms_id)
            lms_synced = True

    msg = _("Change Management Request {}").format("created successfully" if doc.is_new() else "updated")
    msg += "<br>" + _("Feasibility updated")
    if lms_synced:
        msg += "<br>" + _("LMS ID synced from Feasibility")

    frappe.msgprint(
        title=_("Success") if doc.is_new() else _("Updated"),
        msg=msg,
        indicator="green" if doc.is_new() else "blue"
    )

#######################################################################
#LMS Request Supplier Payment Detail
@frappe.whitelist()
def get_latest_invoice_for_lms(lms_id):
    if not lms_id:
        return None

    # Get all parent Purchase Invoice names that have this LMS ID
    item_parents = frappe.get_all("Purchase Invoice Item",
        filters={"lms_id": lms_id},
        fields=["parent"]
    )

    if not item_parents:
        return None

    parent_ids = [item['parent'] for item in item_parents]

    # Get Purchase Invoices sorted by custom_dutation_from DESC
    invoices = frappe.get_all("Purchase Invoice",
        filters={"name": ["in", parent_ids]},
        fields=["name", "custom_dutation_from", "custom_duration_to"],
        order_by="custom_dutation_from desc"
    )

    if invoices:
        return invoices[0]  # Return the latest one
    else:
        return None
#####################################################################
#PO Cancel Task Creation form LMS Request
import frappe
from frappe import _
from frappe.utils import nowdate

@frappe.whitelist()
def create_po_cancel_task(lms_request):
    if not lms_request:
        frappe.throw(_("LMS Request ID is required."))

    # Check if task already created
    current_stage = frappe.db.get_value("LMS Request", lms_request, "po_stage")
    if current_stage == "PO Cancel Task Created":
        frappe.throw(_("PO Cancel Task is already created for this LMS Request."))

    # Get LMS Request doc
    lms_doc = frappe.get_doc("LMS Request", lms_request)

    # Create Task with mapped fields
    task = frappe.get_doc({
        "doctype": "Task",
        "subject": f"PO Cancel Task for {lms_request}",
        "reference_type": "LMS Request",
        "reference_name": lms_request,
        "status": "Open",
        "type": "Purchase Order Cancel",  
        "custom_customer": lms_doc.customer,
        "custom_purchase_order_no": lms_doc.purchase_order_number,
        "custom_purchase_order_date": lms_doc.purchase_order_date,
        "exp_start_date": nowdate(),
        "exp_end_date": nowdate(),
        "description": lms_doc.isp_change_issue
    })
    task.insert(ignore_permissions=True)

    # Update LMS Request stage
    lms_doc.po_stage = "PO Cancel Task Created"
    lms_doc.save(ignore_permissions=True)

    return "success"
################################################################################

## Disconnection Multiple
import frappe

@frappe.whitelist()
def start_disconnection_enqueue(docname):
    """Called from JS when user clicks 'Get Circuit Details'"""

    # 🔔 Show 'fetching' alert for 20 seconds on client
    frappe.publish_realtime('show_fetching_alert', {
        'message': 'Fetching data, please wait… This may take a few moments.'
    })

    # 🚀 Enqueue background job
    frappe.enqueue(
        method=process_disconnection_background,
        queue='default',
        timeout=600,
        is_async=True,
        docname=docname
    )


def process_disconnection_background(docname):
    """Runs in background to process circuits and update Disconnection Request"""

    doc = frappe.get_doc("Disconnection Request", docname)

    # 🧹 Clear old child table data
    doc.disconnection_request = []
    doc.lms_details = []

    circuit_ids = []
    site_list = []

    # ✅ Case 1: Circuits entered manually
    if doc.disconnection_circuit_details:
        circuit_ids = [c.strip() for c in doc.disconnection_circuit_details.split(',') if c.strip()]
        if circuit_ids:
            site_list = frappe.get_all(
                "Site",
                filters={
                    "circuit_id": ["in", circuit_ids],
                    "site_status": "Delivered and Live"
                },
                pluck="name"
            )

    # ✅ Case 2: No circuits → fallback to customer name
    else:
        if not doc.customer_name_2:
            frappe.throw(
                "Disconnection cannot be processed because 'Disconnection Circuit Details' "
                "is blank and no Customer is specified."
            )
        site_list = frappe.get_all(
            "Site",
            filters={
                "customer": doc.customer_name_2,
                "site_status": "Delivered and Live"
            },
            pluck="name"
        )

    # ❌ No matching sites found
    if not site_list:
        frappe.throw("No eligible Sites found with status 'Delivered and Live' for disconnection.")

    unique_circuits = set()
    fetched_circuits = set()

    # 🔄 Process each site and fetch related data
    for site_name in site_list:
        site_doc = frappe.get_doc("Site", site_name)
        fetched_circuits.add(site_doc.circuit_id)

        # 🧾 Add Site Items to Disconnection Request child table
        for item in site_doc.site_item:
            doc.append("disconnection_request", {
                "circuit_id": site_doc.circuit_id,
                "site_name": site_doc.site_name,
                "item_code": item.item_code,
                "item_name": item.item_name,
                "qty": item.qty,
                "serial_no_sim_no": item.serial_no_sim_no,
                "item_group": item.item_group,
                "warranty_expiry_date": item.warranty_expiry_date,
                "lan_mac": item.lan_mac,
                "hardware_version": item.hardware_version,
                "wlan_mac": item.wlan_mac,
                "wan_mac": item.wan_mac,
                "module": item.module,
                "warranty_period_days": item.warranty_period_days,
                "imei": item.imei,
                "mobile_no": item.mobile_no,
                "activation_date": item.activation_date,
                "validity": item.validity,
                "data_plan": item.data_plan,
                "recharge_end_date": item.recharge_end_date
            })

        # 🧾 Add LMS details (if delivered)
        for lms in site_doc.lms_vendor:
            if lms.stage == "LMS Delivered" and lms.lms_id:
                doc.append("lms_details", {
                    "lms_id": lms.lms_id,
                    "status": lms.stage
                })

        if site_doc.circuit_id:
            unique_circuits.add(site_doc.circuit_id)

    # 🧮 Summary Calculations
    total_input = len(circuit_ids)
    total_fetched = len(fetched_circuits)
    not_fetched = set(circuit_ids) - fetched_circuits if circuit_ids else set()

    # 🎨 Build HTML Summary Table
    html_summary = f"""
    <div style="font-family: Arial, sans-serif; background:#f9f9f9; border:1px solid #ccc;
                border-radius:10px; padding:18px; margin-top:10px;">
        <h3 style="color:#2c3e50; margin-bottom:15px;">Disconnection Summary</h3>

        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <div><strong style="color:green;">✅ Circuits Fetched:</strong> {total_fetched}</div>
            <div><strong style="color:red;">❌ Circuits Not Fetched:</strong> {len(not_fetched)}</div>
            <div><strong>Total Entered:</strong> {total_input}</div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
                <tr style="background:#2c3e50; color:white;">
                    <th style="padding:8px; text-align:left;">#</th>
                    <th style="padding:8px; text-align:left;">Circuit ID</th>
                    <th style="padding:8px; text-align:left;">Status</th>
                </tr>
            </thead>
            <tbody>
    """

    index = 1
    for cid in circuit_ids:
        status = "✅ Fetched" if cid in fetched_circuits else "❌ Not Fetched"
        color = "green" if cid in fetched_circuits else "red"
        html_summary += f"""
            <tr style="background:{'#ecf0f1' if index % 2 == 0 else '#ffffff'};">
                <td style="padding:6px;">{index}</td>
                <td style="padding:6px;">{cid}</td>
                <td style="padding:6px; color:{color}; font-weight:bold;">{status}</td>
            </tr>
        """
        index += 1

    html_summary += """
            </tbody>
        </table>
    </div>
    """

    # 🧾 Force-save HTML Summary to Database (important for HTML fields)
    doc.db_set('note_html', html_summary, update_modified=False)
    doc.db_set('total_circuit_id', len(unique_circuits), update_modified=False)

    # 💾 Save and commit transaction
    try:
        frappe.db.commit()

        # 🔔 Notify frontend (JS) to refresh document
        frappe.publish_realtime(
            event='disconnection_summary_ready',
            message={'docname': doc.name},
            user=frappe.session.user
        )

        frappe.logger().info(f"✅ Disconnection Request {doc.name} processed successfully.")

    except Exception as e:
        frappe.logger().error(f"❌ Error saving Disconnection Request {doc.name}: {e}")

###########################################################################
##Site to LMS Request update
import frappe

@frappe.whitelist()
def create_lms_request(site_name):
    site_doc = frappe.get_doc("Site", site_name)

    if site_doc.lms_stage != "Pending":
        frappe.throw("LMS Request can only be created when LMS Stage is 'Pending'.")

    allowed_status = ['Feasible', 'High Commercials']
    valid_vendors = [row for row in site_doc.lms_vendor if row.lms_status in allowed_status]

    if not valid_vendors:
        frappe.throw("No vendors with valid LMS status found.")

    # Check if LMS Request already exists for any vendor
    if any(row.lms_requested_id for row in valid_vendors):
        frappe.throw("LMS Request already created for one or more vendors.")

    # Only proceed with Feasible vendors
    feasible_vendors = [row for row in valid_vendors if row.lms_status in ["Feasible", "High Commercials"]]

    if not feasible_vendors:
        frappe.throw("No feasible vendors found to create LMS Request.")

    lms_suppliers = []
    for vendor in feasible_vendors:
        lms_suppliers.append({
            "lms_feasibility_partner": vendor.lms_supplier,
            "lms_feasibility_status": vendor.lms_status,
            "supplier_contact": vendor.supplier_contact,
            "bandwith_type": vendor.bandwith_type,
            "media": vendor.media,
            "support_mode": vendor.support_mode,
            "email_id": vendor.email_id,
            "mobile": vendor.mobile,
            "static_ip": vendor.static_ip,
            "bandwidth": vendor.bandwidth,
            "billing_mode": vendor.billing_mode,
            "billing_terms": vendor.billing_terms,
            "feasibility_otc": vendor.otc,
            "validity": vendor.validity,
            "feasibility_security_deposit": vendor.security_deposit,
            "feasibility_mrc": vendor.mrc,
            "feasibility_arc": vendor.arc,
            "feasibility_static_ip_cost": vendor.static_ip_cost
        })

    # Create LMS Request
    lms_request = frappe.get_doc({
        "doctype": "LMS Request",
        "circuit_id": site_doc.name,
        "lms_fesible_suppliers": lms_suppliers
    })
    lms_request.insert(ignore_permissions=True)

    # Update child table entries only once per vendor
    for row in site_doc.lms_vendor:
        if row.lms_status in allowed_status and not row.lms_requested_id:
            frappe.db.set_value(row.doctype, row.name, {
                "lms_requested_id": lms_request.name,
                "stage": "LMS Initiated"
            })

    # Update main Site fields
    frappe.db.set_value("Site", site_name, {
        "lms_stage": "LMS Initiated",
        "site_status": "In-process"
    })

    return lms_request.name
#######################################################################
### Task to n8n
import frappe
import requests

@frappe.whitelist()
def send_to_n8n(task_id, subject, description, due_date=None, type=None):
    """
    Sends Task details from ERPNext to n8n webhook.
    """
    url = "https://chatty-chicken-91.hooks.n8n.cloud/webhook/task-chat"
    payload = {
        "task_id": task_id,
        "subject": subject,
        "description": description,
        "due_date": due_date,
        "type": type
    }
    try:
        r = requests.post(url, json=payload, timeout=5)
        return {
            "status": r.status_code,
            "response": r.text
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "N8N Webhook Error")
        return {
            "status": "error",
            "message": str(e)
        }

###############################################################################
## Disconnection Request creating record in Stock Management
import frappe
from collections import defaultdict

def on_submit_disconnection_request(doc, method):
    # ✅ Check customer type
    if doc.customer_type != "Opex (Rental)":
        frappe.msgprint("Since the customer type is Capex, hardware recovery is not applicable.")
        return  # Exit if not Opex

    circuit_map = defaultdict(list)

    # Group disconnection lines by curcit_id
    for row in doc.disconnection_request:
        if row.curcit_id:
            circuit_map[row.curcit_id].append(row)

    for circuit_id, rows in circuit_map.items():
        stock_management = frappe.new_doc("Stock Management")
        stock_management.circuit_id = circuit_id
        stock_management.status = "Disconnection"
        stock_management.stock_management_type = "Disconnection"

        for row in rows:
            stock_management.append("stock_management_disconnection", {
                "item_code": row.item_code,
                "qty": row.qty,
                "serial_no_sim_no": row.serial_no_sim_no
            })

        stock_management.insert()

    frappe.msgprint("As the customer type is Opex (Rental), hardware recovery is applicable; therefore, the Stock Management record has been created successfully.")
################################################################################33
# Lastmile Services Master - LMS Review Update to Site
import frappe

def sync_lms_review_to_site(doc, method):
    # Check if circuit_id is set
    if not doc.circuit_id:
        return

    # Find Site record with name equal to circuit_id
    site_doc = frappe.get_doc("Site", doc.circuit_id)

    # Update lms_review in Site if different
    if site_doc.lms_review != doc.lms_review:
        site_doc.lms_review = doc.lms_review
        site_doc.save(ignore_permissions=True)  # Optional: ignore if required
        frappe.db.commit()
####################################################################################
import frappe
import json

@frappe.whitelist()
def get_site_data(limit=20):
    """Return site data with limit (0 = ALL)"""
    try:
        filters = [
            ["site_status", "=", "Delivered and Live"],
            ["billing_status", "in", ["Pending", "Partially Completed"]]
        ]

        # Get total count
        total = frappe.db.count("Site", filters=filters)

        if limit and int(limit) > 0:
            sites = frappe.db.get_all(
                "Site",
                fields=[
                    "name",
                    "circuit_id",
                    "customer",
                    "site_name",
                    "site_status",
                    "billing_status"
                ],
                filters=filters,
                limit=int(limit),
                order_by="creation desc"
            )
        else:  # ALL records
            sites = frappe.db.get_all(
                "Site",
                fields=[
                    "name",
                    "circuit_id",
                    "customer",
                    "site_name",
                    "site_status",
                    "billing_status"
                ],
                filters=filters,
                order_by="creation desc"
            )

        return {"sites": sites, "total": total}
    except Exception as e:
        frappe.log_error(f"Failed to get site data: {str(e)}")
        return {"sites": [], "total": 0}


@frappe.whitelist()
def get_sales_order_items_for_sites(site_names):
    """Return sales order items for the given sites based on the conditions"""
    try:
        if not isinstance(site_names, list):
            site_names = json.loads(site_names)
            
        # Get the sites data
        sites = frappe.get_all(
            "Site",
            filters={"name": ["in", site_names]},
            fields=["name", "circuit_id", "customer", "site_name"]
        )
        
        if not sites:
            return []
            
        items = []
        
        for site in sites:
            # 🔹 Get only submitted Sales Orders for this customer
            sales_orders = frappe.get_all(
                "Sales Order",
                filters={
                    "customer": site.customer,
                    "docstatus": 1  # ✅ Submitted only
                },
                fields=["name"]
            )
            
            if not sales_orders:
                continue
                
            # 🔹 Get items from these sales orders where custom_feasibility matches circuit_id
            for so in sales_orders:
                so_items = frappe.get_all(
                    "Sales Order Item",
                    filters={
                        "parent": so.name,
                        "custom_feasibility": site.circuit_id
                    },
                    fields=[
                        "item_name",
                        "rate",
                        "qty",
                        "amount",
                        "custom_feasibility",
                        "custom_site_info",
                        "name",
                        "parent"
                    ]
                )
                
                if so_items:
                    items.extend(so_items)
        
        return items
    except Exception as e:
        frappe.log_error(f"Failed to get sales order items: {str(e)}")
        return []


@frappe.whitelist()
def create_sales_invoice_from_items(items):
    """Create a sales invoice from the given items"""
    try:
        if not isinstance(items, list):
            items = json.loads(items)
            
        if not items:
            frappe.throw("No items provided to create invoice")
            
        # Create new sales invoice
        invoice = frappe.new_doc("Sales Invoice")
        invoice.customer = frappe.db.get_value("Sales Order", items[0].get("parent"), "customer")
        
        # Add items
        for item in items:
            invoice.append("items", {
                "item_name": item.get("item_name"),
                "qty": item.get("qty"),
                "rate": item.get("rate"),
                "amount": item.get("amount"),
                "so_detail": item.get("name"),
                "sales_order": item.get("parent")
            })
        
        invoice.insert()
        invoice.submit()
        
        return {
            "invoice_url": frappe.utils.get_url_to_form("Sales Invoice", invoice.name),
            "invoice_name": invoice.name
        }
    except Exception as e:
        frappe.log_error(f"Failed to create sales invoice: {str(e)}")
        frappe.throw("Failed to create invoice. Please check error logs.")

##################################################################################3
# Installation Note Create
import frappe
from frappe.utils import nowdate

@frappe.whitelist()
def create_installation_note(site_name):
    # Get Site document
    site_doc = frappe.get_doc("Site", site_name)

    # Check if Installation Note already exists
    if site_doc.installation_note:
        frappe.throw(f"Installation Note already exists: {site_doc.installation_note}")

    # Create new Installation Note
    installation_doc = frappe.new_doc("Installation Note")
    installation_doc.custom_circuit_id = site_doc.name
    installation_doc.inst_date = site_doc.date or nowdate()

    # Set installation type based on lms_stage in Site
    if site_doc.lms_stage == "LMS Partially Delivered":
        installation_doc.custom_installation_type = "Partially Installed"
    elif site_doc.lms_stage == "LMS Delivered":
        installation_doc.custom_installation_type = "Fully Installed"

    # Copy Site Items where status == "Stock Delivered"
    for site_item in site_doc.site_item:
        if site_item.status == "Stock Delivered":
            installation_doc.append("items", {
                "item_code": site_item.item_code,
                "serial_no": site_item.serial_no_sim_no,
                "qty": site_item.qty
            })

    # Copy LMS Site rows where stage == "LMS Delivered"
    for lms_row in site_doc.lms_vendor:
        if lms_row.stage == "LMS Delivered":
            installation_doc.append("custom_lms_installation_item", {
                "lms_id": lms_row.lms_id
                # Add more fields if needed
            })

    # Insert Installation Note
    installation_doc.insert()
    # installation_doc.submit()  # Uncomment if you want to auto-submit

    # Update Site document fields
    site_doc.db_set({
        "installation_note": installation_doc.name,
        "installation_document_status": "Draft"
    })

    frappe.db.commit()

    return installation_doc.name
#################################################################################
# Updateing the status of Installation Note
import frappe

def update_site_on_installation_note(doc, method):
    if doc.custom_circuit_id:
        # Check if a Site exists with this name
        if frappe.db.exists("Site", doc.custom_circuit_id):
            site_doc = frappe.get_doc("Site", doc.custom_circuit_id)
            
            # Update based on status
            if doc.status == "Submitted":
                site_doc.installation_document_status = "Submitted"
                site_doc.installation_note = doc.name
            
            elif doc.status == "Cancelled":
                site_doc.installation_document_status = "Cancelled"
                site_doc.installation_note = doc.name

            elif doc.status == "Draft":
                site_doc.installation_document_status = "Draft"
                site_doc.installation_note = doc.name
            
            site_doc.save(ignore_permissions=True)
        else:
            frappe.throw(f"Site with name '{doc.custom_circuit_id}' not found.")

##########################################################
import frappe
from frappe.utils import now
from frappe import _

@frappe.whitelist(allow_guest=True)
def update_installation_approval_status(site=None):
    if not site:
        frappe.respond_as_web_page("Missing Site ID", "<p>Site ID is required.</p>", http_status_code=400)
        return

    try:
        doc = frappe.get_doc("Site", site)

        # If already accepted, don't update again
        if doc.client_installation_approval_status == "Accepted":
            frappe.respond_as_web_page(
                "✅ Already Accepted",
                f"""
                <div style="text-align: center; font-family: Arial, sans-serif; padding: 30px;">
                  <h2 style="color: green;">✅ Already Accepted</h2>
                  <p>This installation has already been marked as <strong>Accepted</strong> on {doc.client_installation_approval_date}.</p>
                  <p style="margin-top: 40px;">– Nexapp Technologies Private Limited</p>
                </div>
                """,
                http_status_code=200
            )
            return

        # Update status and timestamp only once
        frappe.db.set_value("Site", site, {
            "client_installation_approval_status": "Accepted",
            "client_installation_approval_date": now(),
            "site_status": "Delivered and Live"
        })
        frappe.db.commit()

        # Show success page
        frappe.respond_as_web_page(
            "✅ Installation Accepted",
            """
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 30px;">
              <h2 style="color: green;">✅ Installation Accepted</h2>
              <p>Thank you for confirming. The installation has been marked as <strong>Accepted</strong> and status set to <strong>Delivered and Live</strong>.</p>
              <p style="margin-top: 40px;">– Nexapp Technologies Private Limited</p>
            </div>
            """,
            http_status_code=200
        )

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Installation Approval Error")
        frappe.respond_as_web_page(
            "❌ Error",
            f"<p>Something went wrong: {frappe.get_traceback()}</p>",
            http_status_code=500
        )

#################################################################################
## Bank Reocnimport frappe

import frappe
import re
from difflib import SequenceMatcher

# ------------------------------------------------------------
# Helpers: list/get entries
# ------------------------------------------------------------

@frappe.whitelist()
def get_bank_statement_entries(bank_account=None, start_date=None, end_date=None):
    filters = {"reconciled": 0}
    if bank_account:
        filters["bank_account"] = bank_account
    if start_date and end_date:
        filters["transaction_date"] = ["between", [start_date, end_date]]

    entries = frappe.get_all(
        "Bank Statement Entry",
        filters=filters,
        fields=["name", "transaction_date", "description", "deposit", "withdrawal", "bank_account"],
        order_by="transaction_date asc",
    )

    for entry in entries:
        entry["date"] = entry.pop("transaction_date")

    return entries


def clean_string(s):
    return re.sub(r"[^a-zA-Z0-9\s\-]", "", (s or "")).lower()


def extract_keywords(description):
    parts = clean_string(description).split()
    keywords = [p for p in parts if len(p) > 2 and not p.isdigit()]
    return keywords


def calculate_match_score(description, target, amount, target_amount):
    try:
        amount = float(amount)
        target_amount = float(target_amount)
    except Exception:
        amount = amount or 0.0
        target_amount = target_amount or 0.0

    name_score = SequenceMatcher(None, clean_string(description), clean_string(target)).ratio()
    amount_diff = abs(float(amount) - float(target_amount))
    mx = max(float(amount), float(target_amount)) if max(float(amount), float(target_amount)) else 0.0
    amount_score = 1 - (amount_diff / mx) if mx else 0
    return round((0.7 * amount_score + 0.3 * name_score) * 100, 1)


@frappe.whitelist()
def find_matching_invoices(amount, description=None):
    try:
        amount = float(amount)
    except Exception:
        return []

    if not description:
        description = ""

    matches = []
    _ = extract_keywords(description)

    purchase_invoices = frappe.get_all(
        "Purchase Invoice",
        filters={"docstatus": 1, "outstanding_amount": [">", 0], "status": ["!=", "Paid"]},
        fields=[
            "name",
            "supplier as party",
            "outstanding_amount",
            "bill_no",
            "bill_date",
            "supplier as party_name",
            "company",
        ],
    )

    sales_invoices = frappe.get_all(
        "Sales Invoice",
        filters={"docstatus": 1, "outstanding_amount": [">", 0], "status": ["!=", "Paid"]},
        fields=[
            "name",
            "customer as party",
            "outstanding_amount",
            "posting_date",
            "customer as party_name",
            "company",
        ],
    )

    all_invoices = purchase_invoices + sales_invoices

    for inv in all_invoices:
        inv_name = inv.get("name")
        party = inv.get("party") or ""
        inv_amount = inv.get("outstanding_amount") or 0.0

        if "bill_no" in inv:
            bill_no = inv.get("bill_no", "")
            bill_date = inv.get("bill_date", "")
            doctype = "Purchase Invoice"
        elif "posting_date" in inv:
            bill_no = ""
            bill_date = inv.get("posting_date", "")
            doctype = "Sales Invoice"
        else:
            bill_no = ""
            bill_date = ""
            doctype = inv.get("doctype") or ""

        score = calculate_match_score(description, f"{inv_name} {party}", amount, inv_amount)

        matches.append(
            {
                "name": inv_name,
                "party": party,
                "party_name": inv.get("party_name", ""),
                "outstanding_amount": inv_amount,
                "match_score": score,
                "bill_no": bill_no,
                "bill_date": bill_date,
                "doctype": doctype,
                "company": inv.get("company"),
            }
        )

    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:5]


# ------------------------------------------------------------
# NEW: Get customer outstanding invoices (Deposit)
# ------------------------------------------------------------

@frappe.whitelist()
def get_customer_outstanding_invoices(customer=None, company=None):
    filters = {
        "docstatus": 1,
        "outstanding_amount": [">", 0],
        "status": ["!=", "Paid"]
    }

    if customer:
        filters["customer"] = customer

    if company:
        filters["company"] = company

    sales_invoices = frappe.get_all(
        "Sales Invoice",
        filters=filters,
        fields=[
            "name",
            "customer as party",
            "outstanding_amount",
            "posting_date",
            "due_date",
            "customer as party_name",
            "company",
        ],
        order_by="posting_date desc"
    )

    result = []
    for inv in sales_invoices:
        result.append({
            "name": inv.get("name"),
            "party": inv.get("party"),
            "party_name": inv.get("party_name"),
            "outstanding_amount": inv.get("outstanding_amount"),
            "posting_date": inv.get("posting_date"),
            "due_date": inv.get("due_date"),
            "doctype": "Sales Invoice",
            "company": inv.get("company")
        })

    return result


# ------------------------------------------------------------
# GET OUTSTANDING EXPENSE CLAIMS FOR EMPLOYEE
# ------------------------------------------------------------

@frappe.whitelist()
def get_outstanding_expense_claims(employee=None, company=None):
    if not company:
        company = frappe.defaults.get_default("company")

    filters = {
        "employee": employee,
        "docstatus": 1,
        "status": "Unpaid"
    }

    expense_claims = frappe.get_all(
        "Expense Claim",
        filters=filters,
        fields=[
            "name",
            "employee",
            "employee_name",
            "posting_date",
            "description",
            "total_sanctioned_amount",
            "total_amount_reimbursed",
            "grand_total",
            "outstanding_amount"
        ],
        order_by="posting_date asc",
        limit_page_length=0
    )

    # Calculate outstanding amount if not available
    for claim in expense_claims:
        if not claim.get("outstanding_amount"):
            total_sanctioned = claim.get("total_sanctioned_amount") or claim.get("grand_total") or 0
            total_reimbursed = claim.get("total_amount_reimbursed") or 0
            claim["outstanding_amount"] = total_sanctioned - total_reimbursed

    return expense_claims


# ------------------------------------------------------------
# OUTSTANDING INVOICE FETCHER (Manual Category)
# ------------------------------------------------------------

@frappe.whitelist()
def get_outstanding_invoices(doctype, party_field, party_name, company=None):
    if not company:
        company = frappe.defaults.get_default("company")

    if doctype == "Sales Invoice":
        fields = [
            "name",
            "customer as party",
            "posting_date",
            "grand_total",
            "outstanding_amount",
            "due_date"
        ]
        try:
            invoice_field_exists = frappe.db.sql("""
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'tabSales Invoice' AND column_name = 'invoice'
            """)
            if invoice_field_exists[0][0] > 0:
                fields.append("invoice as bill_no")
            else:
                fields.append("name as bill_no")
        except:
            fields.append("name as bill_no")

    else:
        fields = [
            "name",
            "supplier as party",
            "posting_date",
            "grand_total",
            "outstanding_amount",
            "due_date"
        ]
        try:
            bill_no_field_exists = frappe.db.sql("""
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'tabPurchase Invoice' AND column_name = 'bill_no'
            """)
            if bill_no_field_exists[0][0] > 0:
                fields.append("bill_no")
            else:
                fields.append("name as bill_no")
        except:
            fields.append("name as bill_no")

    filters = {
        party_field: party_name,
        "docstatus": 1,
        "outstanding_amount": [">", 0],
        "company": company
    }

    invoices = frappe.get_all(
        doctype,
        filters=filters,
        fields=fields,
        order_by="posting_date asc",
        limit_page_length=0
    )

    return invoices


# ------------------------------------------------------------
# TAX ROW ADDER
# ------------------------------------------------------------

def _add_tax_rows_to_payment(payment_entry, tax_adjustments_list):
    try:
        available_tables = [(f.fieldname, f.options) for f in payment_entry.meta.fields if f.fieldtype == "Table"]
    except Exception:
        available_tables = []

    chosen_table = None    # fieldname on Payment Entry
    child_doctype = None   # child DocType name

    for fn, options in available_tables:
        if options and (
            "advance" in (options or "").lower()
            or "tax" in (options or "").lower()
            or "charge" in (options or "").lower()
        ):
            chosen_table = fn
            child_doctype = options
            break

    if not chosen_table:
        available_names = [fn for fn, _ in available_tables]
        for k in ("taxes", "taxes_and_charges", "advance_taxes", "advance_taxes_and_charges", "other_charges", "advances", "deductions"):
            if k in available_names:
                chosen_table = k
                child_doctype = dict(available_tables).get(k)
                break

    if not chosen_table:
        if frappe.db.exists("DocType", "Advance Taxes and Charges"):
            chosen_table = "taxes"
            child_doctype = "Advance Taxes and Charges"
        else:
            frappe.throw("No suitable child table found in Payment Entry to add tax adjustments.")

    child_meta = frappe.get_meta(child_doctype) if child_doctype else None
    child_fields = [f.fieldname for f in (child_meta.fields if child_meta else [])]

    appended_rows = []

    for tax_adj in (tax_adjustments_list or []):
        account_head = tax_adj.get("account_head")
        try:
            tax_amount = float(tax_adj.get("tax_amount", 0) or 0)
        except Exception:
            tax_amount = 0.0

        if not account_head or not frappe.db.exists("Account", account_head):
            frappe.throw(f"Account head not found or invalid: {account_head}")

        row = {}
        if "charge_type" in child_fields:
            row["charge_type"] = "Actual"
        if "account_head" in child_fields:
            row["account_head"] = account_head
        elif "account" in child_fields:
            row["account"] = account_head
        if "tax_amount" in child_fields:
            row["tax_amount"] = tax_amount
        if "amount" in child_fields:
            row["amount"] = tax_amount
        if "description" in child_fields:
            row["description"] = tax_adj.get("description") or account_head
        if "add_deduct_tax" in child_fields:
            row["add_deduct_tax"] = "Deduct"

        payment_entry.append(chosen_table, row)
        appended_rows.append(row)

    try:
        frappe.log_error(title="BR_TAX_ROWS", message=frappe.as_json(appended_rows))
    except Exception:
        pass

    return chosen_table


# ------------------------------------------------------------
# GST FIELD SETTER
# ------------------------------------------------------------

def _ensure_customer_address_with_gst(customer, company):
    try:
        customer_gstin = frappe.db.get_value("Customer", customer, "gstin")
        if not customer_gstin:
            return None

        addresses = frappe.get_all(
            "Address",
            filters={"link_doctype": "Customer", "link_name": customer},
            fields=["name", "gstin", "is_primary_address"]
        )

        if addresses:
            for addr in addresses:
                if not addr.gstin:
                    frappe.db.set_value("Address", addr.name, "gstin", customer_gstin)
                if not addr.is_primary_address:
                    frappe.db.set_value("Address", addr.name, "is_primary_address", 1)
            return addresses[0].name

        address_doc = frappe.get_doc({
            "doctype": "Address",
            "address_title": customer,
            "address_type": "Billing",
            "address_line1": "Auto-created for GST",
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "pincode": "400001",
            "gstin": customer_gstin,
            "is_primary_address": 1,
            "is_your_company_address": 0,
            "links": [{"link_doctype": "Customer", "link_name": customer}]
        })

        address_doc.insert(ignore_permissions=True)
        return address_doc.name

    except Exception as e:
        frappe.log_error(f"Address Creation Failed for {customer}", str(e))
        return None


def _set_gst_fields(payment_entry, party, party_type, company, doctype=None, invoice_name=None):
    company_gstin = frappe.db.get_value("Company", company, "gstin")
    if company_gstin:
        payment_entry.company_gstin = company_gstin
    else:
        company_address = frappe.db.get_value("Address", {"is_primary_company_address": 1, "company": company}, "gstin")
        if company_address:
            payment_entry.company_gstin = company_address

    party_gstin = None
    if party_type == "Customer":
        party_gstin = frappe.db.get_value("Customer", party, "gstin")
        _ensure_customer_address_with_gst(party, company)
    elif party_type == "Supplier":
        party_gstin = frappe.db.get_value("Supplier", party, "gstin")

    allowed_categories = ["Overseas", "Unregistered"]

    if party_type == "Customer":
        gst_category = frappe.db.get_value("Customer", party, "gst_category")
    else:
        gst_category = frappe.db.get_value("Supplier", party, "gst_category")

    if party_gstin:
        try:
            frappe.db.set_value(party_type, party, "gst_category", "Unregistered")
            frappe.db.commit()
        except Exception:
            pass
        payment_entry.gst_category = "Unregistered"
    elif gst_category in allowed_categories:
        payment_entry.gst_category = gst_category
    else:
        payment_entry.gst_category = "Unregistered"

    if party_gstin:
        payment_entry.party_gstin = party_gstin

    if party_type == "Customer" and party_gstin:
        addresses = frappe.get_all(
            "Address",
            filters={"link_doctype": "Customer", "link_name": party, "gstin": ["!=", ""]},
            fields=["name"],
            limit=1
        )
        if addresses:
            payment_entry.customer_address = addresses[0].name


# ------------------------------------------------------------
# UPDATED: NEW CLEAN CUSTOMER PAYMENT FUNCTION
# ------------------------------------------------------------

def process_customer_payment(stmt, invoices, company, customer, tax_adjustments_list, allow_overpayment=False):
    statement_amount = abs(float(stmt.deposit or 0))
    total_allocated = sum(float(inv.get("amount") or 0) for inv in invoices)
    
    # Calculate total deductions from tax adjustments
    total_deductions = 0
    if tax_adjustments_list:
        for tax_adj in tax_adjustments_list:
            total_deductions += float(tax_adj.get("tax_amount") or 0)
    
    # Calculate net payment (allocated - deductions)
    net_payment = total_allocated - total_deductions
    
    # IMPORTANT: paid_amount and received_amount should be the ALLOCATED amount
    # NOT the statement amount or net payment amount
    paid_amount = total_allocated  # This should be 14062.00 in your example
    received_amount = total_allocated  # Same as paid_amount
    
    # Resolve paid_from from first invoice's debit_to (Debtors account)
    customer_receivable = None
    for inv in invoices:
        if inv.get("doctype") == "Sales Invoice" and inv.get("invoice"):
            customer_receivable = frappe.db.get_value("Sales Invoice", inv["invoice"], "debit_to")
            if customer_receivable:
                break
    if not customer_receivable:
        customer_receivable = frappe.db.get_value("Company", company, "default_receivable_account")

    # Resolve Bank GL Account
    bank_account_gl = get_bank_gl_account(stmt.bank_account)

    # For Payment Entry, we use the allocated amount for paid_amount/received_amount
    # The deductions will be handled separately in the taxes table
    payment_entry = frappe.get_doc(
        {
            "doctype": "Payment Entry",
            "payment_type": "Receive",
            "mode_of_payment": "Wire Transfer",
            "company": company,
            "party_type": "Customer",
            "party": customer,
            "paid_amount": paid_amount,  # Set to allocated amount
            "received_amount": received_amount,  # Set to allocated amount
            "reference_no": stmt.description,
            "reference_date": stmt.transaction_date,
            "posting_date": stmt.transaction_date,
            "paid_from": customer_receivable,  # Debtors account
            "paid_to": bank_account_gl or get_default_bank_account(company, "Receive"),  # Bank GL account
            "bank_account": (to_account or from_account or stmt.bank_account)
        }
    )

    reference_rows = []
    for inv in invoices:
        reference_rows.append(
            {
                "reference_doctype": inv.get("doctype"),
                "reference_name": inv.get("invoice"),
                "allocated_amount": float(inv.get("amount") or 0),
            }
        )

    payment_entry.set("references", reference_rows)

    if invoices:
        first = invoices[0]
        _set_gst_fields(
            payment_entry,
            customer,
            "Customer",
            company,
            first.get("doctype"),
            first.get("invoice")
        )

    if tax_adjustments_list:
        _add_tax_rows_to_payment(payment_entry, tax_adjustments_list)

    payment_entry.insert()
    payment_entry.submit()

    # Update Bank Statement Entry
    frappe.db.set_value("Bank Statement Entry", stmt.name, {
        "reference_no": payment_entry.name,
        "reconciled": 1,
        "match_type": "Auto"
    })

    return {
        "status": "ok",
        "payment_entry": payment_entry.name,
        "allocated": total_allocated,  # 14062.00
        "deductions": total_deductions,  # 1191.60
        "net_payment": net_payment,  # 12870.40
        "statement_amount": statement_amount,
        "paid_amount": paid_amount,  # 14062.00
        "allow_overpayment": allow_overpayment,
        "excess_amount": statement_amount - net_payment  # Bank amount vs what actually reaches customer
    }


# ------------------------------------------------------------
# UPDATED MAIN FUNCTION WITH EMPLOYEE EXPENSE CLAIM SUPPORT
# ------------------------------------------------------------

@frappe.whitelist()
def categorize_manually(
    statement_name,
    invoices,
    category=None,
    employee=None,
    expense_account=None,
    supplier=None,
    company=None,
    tax_adjustments=None,
    customer=None,
    from_account=None,
    to_account=None,
    transfer_description=None,
    allow_overpayment=False,
    purchase_order=None,
    sales_order=None
):
    try:
        if not isinstance(invoices, list):
            invoices = frappe.parse_json(invoices)

        stmt = frappe.get_doc("Bank Statement Entry", statement_name)

        if not company:
            company = frappe.db.get_value("Bank Account", stmt.bank_account, "company")

        # Resolve Bank Account GL Head from Statement or passed values
        bank_account_gl = get_bank_gl_account(stmt.bank_account)

        # Save original names for linking in Payment Entry
        from_account_orig = from_account
        to_account_orig = to_account

        # Resolve UI passed accounts
        from_account = get_bank_gl_account(from_account)
        to_account = get_bank_gl_account(to_account)

        is_deposit = bool(stmt.deposit and float(stmt.deposit) > 0)

        if is_deposit:
            payment_type = "Receive"
            # Prioritize UI passed to_account, then Statement bank account, then Default
            paid_to = (to_account or bank_account_gl or get_default_bank_account(company, payment_type))
            paid_from = from_account
        else:
            payment_type = "Pay"
            # Prioritize UI passed from_account, then Statement bank account, then Default
            paid_from = (from_account or bank_account_gl or get_default_bank_account(company, payment_type))
            paid_to = to_account

        statement_amount = abs(float(stmt.deposit or stmt.withdrawal) or 0.0)

        total_allocated = sum(float(inv.get("amount") or 0) for inv in invoices)

        tax_adjustments_list = []
        if tax_adjustments:
            if isinstance(tax_adjustments, str):
                tax_adjustments_list = frappe.parse_json(tax_adjustments)
            elif isinstance(tax_adjustments, list):
                tax_adjustments_list = tax_adjustments
            else:
                tax_adjustments_list = frappe.parse_json(frappe.as_json(tax_adjustments))

        # -----------------------------------------------------------
        # CUSTOMER PAYMENT → SEPARATE FUNCTION (UPDATED)
        # -----------------------------------------------------------
        if category == "Customer Payment":
            return process_customer_payment(
                stmt=stmt,
                invoices=invoices,
                company=company,
                customer=customer,
                tax_adjustments_list=tax_adjustments_list,
                allow_overpayment=allow_overpayment,
                bank_account=to_account_orig # ⭐ Pass UI selection
            )

        # -----------------------------------------------------------
        # EMPLOYEE EXPENSE CLAIM
        # -----------------------------------------------------------
        elif category == "Employee Expense Claim":
            if not employee:
                return {"status": "fail", "error": "Employee is required for Expense Claim"}

            # Validate employee exists
            if not frappe.db.exists("Employee", employee):
                return {"status": "fail", "error": f"Employee {employee} not found"}

            # Resolve paid_to from expense claim's payable_account
            emp_payable = None
            for inv in invoices:
                if inv.get("invoice"):
                    emp_payable = frappe.db.get_value("Expense Claim", inv["invoice"], "payable_account")
                    if emp_payable:
                        break
            if not emp_payable:
                emp_payable = frappe.db.get_value("Company", company, "default_payable_account")

            # For Employee Expense Claim, use allocated amount NOT statement amount
            paid_amount = total_allocated
            received_amount = total_allocated

            payment_entry = frappe.get_doc(
                {
                    "doctype": "Payment Entry",
                    "payment_type": payment_type,
                    "mode_of_payment": "Wire Transfer",
                    "company": company,
                    "party_type": "Employee",  # Set party_type to Employee
                    "party": employee,  # Use employee ID
                    "paid_amount": paid_amount,  # Use allocated amount
                    "received_amount": received_amount,  # Use allocated amount
                    "reference_no": stmt.description,
                    "reference_date": stmt.transaction_date,
                    "posting_date": stmt.transaction_date,
                    "paid_from": (bank_account_gl or get_default_bank_account(company, "Pay")),  # Bank GL account
                    "paid_to": emp_payable,  # Employee's payable account
                }
            )

            references = []
            for inv in invoices:
                # For Expense Claim, reference doctype should be "Expense Claim"
                references.append(
                    {
                        "reference_doctype": "Expense Claim",
                        "reference_name": inv.get("invoice"),
                        "allocated_amount": float(inv.get("amount") or 0),
                    }
                )

            payment_entry.set("references", references)

        # -----------------------------------------------------------
        # SUPPLIER PAYMENT
        # -----------------------------------------------------------
        elif category == "Supplier Payment":
            if not supplier:
                return {"status": "fail", "error": "Supplier is required for Supplier Payment"}

            # Resolve paid_to from invoice's credit_to (Creditors account)
            supplier_payable = None
            for inv in invoices:
                if inv.get("doctype") == "Purchase Invoice" and inv.get("invoice"):
                    supplier_payable = frappe.db.get_value("Purchase Invoice", inv["invoice"], "credit_to")
                    if supplier_payable:
                        break
            if not supplier_payable:
                supplier_payable = frappe.db.get_value("Company", company, "default_payable_account")

            # For Supplier Payment, use allocated amount NOT statement amount
            paid_amount = total_allocated
            received_amount = total_allocated

            payment_entry = frappe.get_doc(
                {
                    "doctype": "Payment Entry",
                    "payment_type": payment_type,
                    "mode_of_payment": "Wire Transfer",
                    "company": company,
                    "party_type": "Supplier",
                    "party": supplier,
                    "paid_amount": paid_amount,  # Use allocated amount
                    "received_amount": received_amount,  # Use allocated amount
                    "reference_no": stmt.description,
                    "reference_date": stmt.transaction_date,
                    "posting_date": stmt.transaction_date,
                    "paid_from": (bank_account_gl or get_default_bank_account(company, "Pay")),  # Bank GL account
                    "paid_to": supplier_payable,  # Supplier's Creditors account
                    "bank_account": (from_account_orig or to_account_orig or stmt.bank_account)
                }
            )

            references = []
            for inv in invoices:
                references.append(
                    {
                        "reference_doctype": inv.get("doctype"),
                        "reference_name": inv.get("invoice"),
                        "allocated_amount": float(inv.get("amount") or 0),
                    }
                )

            payment_entry.set("references", references)

        # -----------------------------------------------------------
        # EXPENSE CATEGORY
        # -----------------------------------------------------------
        elif category == "Expense":
            if not expense_account:
                return {"status": "fail", "error": "Expense Account is required for Expense category"}

            # Create a Journal Entry for expense
            return create_expense_journal_entry(
                stmt=stmt,
                expense_account=expense_account,
                amount=statement_amount,
                company=company
            )

        # -----------------------------------------------------------
        # TRANSFER TO ANOTHER ACCOUNT
        # -----------------------------------------------------------
        elif category == "Transfer To Another Account":
            if not from_account or not to_account:
                return {"status": "fail", "error": "From Account and To Account are required for Transfer"}

            # Create a Journal Entry for transfer
            return create_bank_transfer_journal(
                stmt=stmt,
                from_account=from_account,
                to_account=to_account,
                description=transfer_description,
                company=company
            )

        # -----------------------------------------------------------
        # SUPPLIER ADVANCE
        # -----------------------------------------------------------
        elif category == "Supplier Advance":
            if not supplier:
                return {"status": "fail", "error": "Supplier is required for Supplier Advance"}
            
            return create_supplier_advance_payment(
                supplier=supplier,
                amount=statement_amount,
                statement_entry=statement_name,
                purchase_order=purchase_order,
                bank_account=from_account # ⭐ Pass from UI
            )

        # -----------------------------------------------------------
        # CUSTOMER ADVANCE
        # -----------------------------------------------------------
        elif category == "Customer Advance":
            if not customer:
                return {"status": "fail", "error": "Customer is required for Customer Advance"}
            
            return create_customer_advance_payment(
                customer=customer,
                amount=statement_amount,
                statement_entry=statement_name,
                sales_order=sales_order,
                bank_account=to_account # ⭐ Pass from UI
            )

        else:
            return {"status": "fail", "error": f"Unknown category: {category}"}

        # Validate total allocated matches statement amount
        # SKIP for Customer Payment (allow excess)
        if category != "Customer Payment":
            if not frappe.utils.flt(total_allocated, 2) == frappe.utils.flt(statement_amount, 2):
                return {
                    "status": "fail",
                    "error": f"Total allocated amount {total_allocated} doesn't match statement amount {statement_amount}"
                }

        if tax_adjustments_list:
            _add_tax_rows_to_payment(payment_entry, tax_adjustments_list)

        payment_entry.insert()
        payment_entry.submit()

        # Update Bank Statement Entry
        frappe.db.set_value("Bank Statement Entry", statement_name, {
            "reference_no": payment_entry.name,
            "reconciled": 1,
            "match_type": "Auto"
        })

        # Create reconciliation log
        if frappe.db.exists("DocType", "Bank Reconciliation Log"):
            for inv in invoices:
                log = frappe.get_doc(
                    {
                        "doctype": "Bank Reconciliation Log",
                        "invoice": inv.get("invoice"),
                        "invoice_type": inv.get("doctype"),
                        "bank_statement": statement_name,
                        "matched_amount": inv.get("amount"),
                        "payment_entry": payment_entry.name,
                        "reconciliation_date": frappe.utils.nowdate(),
                        "reconciliation_type": "Manual",
                        "category": category,
                        "employee": employee if category == "Employee Expense Claim" else None,
                        "supplier": supplier if category == "Supplier Payment" else None,
                        "expense_account": expense_account,
                        "is_deposit": is_deposit,
                    }
                )
                log.insert(ignore_permissions=True)

        return {
            "status": "ok",
            "payment_entry": payment_entry.name,
            "total_allocated": total_allocated,
            "paid_amount": paid_amount,
            "is_deposit": is_deposit,
        }

    except Exception as e:
        frappe.log_error(title="BR_MANUAL_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}


# ------------------------------------------------------------
# CREATE EXPENSE JOURNAL ENTRY
# ------------------------------------------------------------

def create_expense_journal_entry(stmt, expense_account, amount, company):
    try:
        journal_entry = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Journal Entry",
            "posting_date": stmt.transaction_date,
            "company": company,
            "cheque_no": stmt.description,
            "cheque_date": stmt.transaction_date,
            "user_remark": f"Expense payment from bank statement: {stmt.description}",
        })

        # Debit Expense Account
        journal_entry.append("accounts", {
            "account": expense_account,
            "debit_in_account_currency": amount,
            "credit_in_account_currency": 0,
            "party_type": "",
            "party": "",
            "cost_center": get_default_cost_center(company)
        })

        # Credit Bank Account
        journal_entry.append("accounts", {
            "account": get_default_bank_account(company, "Pay"),
            "debit_in_account_currency": 0,
            "credit_in_account_currency": amount,
            "party_type": "",
            "party": "",
            "cost_center": get_default_cost_center(company)
        })

        journal_entry.insert()
        journal_entry.submit()

        # Update Bank Statement Entry
        frappe.db.set_value("Bank Statement Entry", stmt.name, {
            "reference_no": journal_entry.name,
            "reconciled": 1,
            "match_type": "Auto"
        })

        return {
            "status": "ok",
            "journal_entry": journal_entry.name,
            "amount": amount,
            "expense_account": expense_account
        }

    except Exception as e:
        frappe.log_error(title="BR_EXPENSE_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}


# ------------------------------------------------------------
# BANK TRANSFER JOURNAL ENTRY FUNCTION
# ------------------------------------------------------------

def create_bank_transfer_journal(stmt, from_account, to_account, description, company):
    try:
        amount = abs(float(stmt.deposit or stmt.withdrawal) or 0.0)

        journal_entry = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Bank Entry",
            "posting_date": stmt.transaction_date,
            "company": company,
            "cheque_no": stmt.description,
            "cheque_date": stmt.transaction_date,
            "user_remark": description or f"Bank transfer from {from_account} to {to_account}",
        })

        # Debit To Account
        journal_entry.append("accounts", {
            "account": to_account,
            "debit_in_account_currency": amount,
            "credit_in_account_currency": 0,
            "party_type": "",
            "party": "",
            "cost_center": get_default_cost_center(company)
        })

        # Credit From Account
        journal_entry.append("accounts", {
            "account": from_account,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": amount,
            "party_type": "",
            "party": "",
            "cost_center": get_default_cost_center(company)
        })

        journal_entry.insert()
        journal_entry.submit()

        # Update Bank Statement Entry
        frappe.db.set_value("Bank Statement Entry", stmt.name, {
            "reference_no": journal_entry.name,
            "reconciled": 1,
            "match_type": "Auto"
        })

        return {
            "status": "ok",
            "journal_entry": journal_entry.name,
            "amount": amount,
            "from_account": from_account,
            "to_account": to_account
        }

    except Exception as e:
        frappe.log_error(title="BR_TRANSFER_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}


# ------------------------------------------------------------
# ITEMIZED JOURNAL ENTRY FUNCTION
# ------------------------------------------------------------

@frappe.whitelist()
def create_itemized_journal_entry(
    statement_name=None,
    itemized_entries=None,
    from_account=None, # ⭐ Added
    company=None
):
    try:
        if not company:
            company = frappe.defaults.get_default("company")

        stmt = frappe.get_doc("Bank Statement Entry", statement_name)

        if not isinstance(itemized_entries, list):
            itemized_entries = frappe.parse_json(itemized_entries)

        total_amount = sum(float(entry.get("amount") or 0) for entry in itemized_entries)
        statement_amount = abs(float(stmt.deposit or stmt.withdrawal) or 0.0)

        # Validate total amount matches statement amount
        if abs(total_amount - statement_amount) > 0.01:
            return {
                "status": "fail",
                "error": f"Total itemized amount {total_amount} doesn't match statement amount {statement_amount}"
            }

        journal_entry = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Journal Entry",
            "posting_date": stmt.transaction_date,
            "company": company,
            "cheque_no": stmt.description,
            "cheque_date": stmt.transaction_date,
            "user_remark": f"Itemized expense payment from bank statement: {stmt.description}",
            "bank_account": (from_account or stmt.bank_account) # ⭐ Set the Bank Account doc name
        })

        # Add debit entries for each expense account
        for entry in itemized_entries:
            journal_entry.append("accounts", {
                "account": entry.get("account"),
                "debit_in_account_currency": float(entry.get("amount") or 0),
                "credit_in_account_currency": 0,
                "party_type": "",
                "party": "",
                "cost_center": get_default_cost_center(company)
            })

        # Resolve Bank Account GL Head
        # Prioritize UI passed from_account, then statement bank
        final_bank_account = from_account or stmt.bank_account
        bank_account_gl = get_bank_gl_account(final_bank_account)

        # Credit Bank Account
        journal_entry.append("accounts", {
            "account": bank_account_gl or get_default_bank_account(company, "Pay"),
            "debit_in_account_currency": 0,
            "credit_in_account_currency": total_amount,
            "party_type": "",
            "party": "",
            "cost_center": get_default_cost_center(company)
        })

        journal_entry.insert()
        journal_entry.submit()

        # Update Bank Statement Entry
        frappe.db.set_value("Bank Statement Entry", stmt.name, {
            "reference_no": journal_entry.name,
            "reconciled": 1,
            "match_type": "Auto"
        })

        return {
            "status": "ok",
            "journal_entry": journal_entry.name,
            "total_amount": total_amount,
            "num_items": len(itemized_entries)
        }

    except Exception as e:
        frappe.log_error(title="BR_ITEMIZED_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}


# ------------------------------------------------------------
# MATCH NOW CREATE JOURNAL FUNCTION
# ------------------------------------------------------------

@frappe.whitelist()
def match_now_create_journal(statement_name, expense_account):
    try:
        stmt = frappe.get_doc("Bank Statement Entry", statement_name)
        company = frappe.db.get_value("Bank Account", stmt.bank_account, "company")

        amount = abs(float(stmt.withdrawal or 0))

        return create_expense_journal_entry(
            stmt=stmt,
            expense_account=expense_account,
            amount=amount,
            company=company
        )

    except Exception as e:
        frappe.log_error(title="BR_MATCH_NOW_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}


# ------------------------------------------------------------
# CREATE BANK TRANSFER FUNCTION
# ------------------------------------------------------------

@frappe.whitelist()
def create_bank_transfer(statement_name, from_account, to_account, amount, description):
    try:
        stmt = frappe.get_doc("Bank Statement Entry", statement_name)
        company = frappe.db.get_value("Bank Account", stmt.bank_account, "company")

        return create_bank_transfer_journal(
            stmt=stmt,
            from_account=from_account,
            to_account=to_account,
            description=description,
            company=company
        )

    except Exception as e:
        frappe.log_error(title="BR_TRANSFER_CREATE_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}


# ------------------------------------------------------------
# RECONCILE TRANSACTION FUNCTION
# ------------------------------------------------------------

@frappe.whitelist()
def reconcile_transaction(invoice, amount, statement_name, allocated_amount=0, tax_adjustments=None):
    try:
        stmt = frappe.get_doc("Bank Statement Entry", statement_name)
        company = frappe.db.get_value("Bank Account", stmt.bank_account, "company")

        # Get invoice doctype
        if frappe.db.exists("Sales Invoice", invoice):
            doctype = "Sales Invoice"
            party_field = "customer"
        elif frappe.db.exists("Purchase Invoice", invoice):
            doctype = "Purchase Invoice"
            party_field = "supplier"
        else:
            return {"status": "fail", "error": f"Invoice {invoice} not found"}

        # Get invoice details
        inv = frappe.get_doc(doctype, invoice)
        party = inv.get(party_field)

        # Process payment
        invoices_list = [{
            "invoice": invoice,
            "amount": float(allocated_amount or amount),
            "doctype": doctype,
            "party": party
        }]

        tax_adjustments_list = []
        if tax_adjustments:
            tax_adjustments_list = frappe.parse_json(tax_adjustments)

        if doctype == "Sales Invoice":
            return process_customer_payment(
                stmt=stmt,
                invoices=invoices_list,
                company=company,
                customer=party,
                tax_adjustments_list=tax_adjustments_list,
                allow_overpayment=False,
                bank_account=stmt.bank_account # ⭐ For auto-match, use statement bank
            )
        else:
            # For Purchase Invoice, create Supplier Payment
            return categorize_manually(
                statement_name=statement_name,
                invoices=invoices_list,
                category="Supplier Payment",
                supplier=party,
                company=company,
                tax_adjustments=tax_adjustments
            )

    except Exception as e:
        frappe.log_error(title="BR_RECONCILE_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}


# ------------------------------------------------------------
# UTILITIES
# ------------------------------------------------------------

def get_default_bank_account(company, payment_type):
    account_type = "Bank"
    if payment_type == "Pay":
        field = "default_payable_account"
    else:
        field = "default_receivable_account"

    account = frappe.get_value("Company", company, field)

    if account and frappe.get_value("Account", account, "account_type") == account_type:
        return account

    default_bank = frappe.get_value("Company", company, "default_bank_account")
    if default_bank and frappe.get_value("Account", default_bank, "account_type") == account_type:
        return default_bank

    # Try to get any bank account for the company
    bank_accounts = frappe.get_all(
        "Account",
        filters={
            "company": company,
            "account_type": "Bank",
            "is_group": 0
        },
        fields=["name"],
        limit=1
    )

    if bank_accounts:
        return bank_accounts[0].name

    return None


def get_default_cost_center(company):
    cost_center = frappe.get_value("Company", company, "cost_center")
    if cost_center and frappe.db.exists("Cost Center", cost_center):
        return cost_center

    # Get first active cost center for the company
    cost_centers = frappe.get_all(
        "Cost Center",
        filters={"company": company, "is_active": 1},
        fields=["name"],
        limit=1
    )

    if cost_centers:
        return cost_centers[0].name

    return None


@frappe.whitelist()
def undo_reconciliation(statement_name):
    try:
        frappe.db.set_value("Bank Statement Entry", statement_name, {
            "reconciled": 0,
            "reference_no": "",
            "match_type": ""
        })
        return {"status": "ok"}
    except Exception as e:
        frappe.log_error(title="BR_UNDO_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}
##################SEPARATE FUNCTION: process_customer_payment()#################
def process_customer_payment(stmt, invoices, company, customer, tax_adjustments_list, allow_overpayment=False, bank_account=None):
    """
    Clean & independent Customer Payment processor.
    """

    # -------------------------------
    # 1. Calculate amounts
    # -------------------------------
    statement_amount = abs(float(stmt.deposit or 0))
    total_allocated = sum(float(inv.get("amount") or 0) for inv in invoices)

    # ⭐ FIX — USE STATEMENT AMOUNT
    paid_amount = statement_amount
    received_amount = statement_amount

    # Resolve Bank Account GL Head
    # Prioritize passed bank_account, then stmt.bank_account
    final_bank_account = bank_account or stmt.bank_account
    bank_account_gl = get_bank_gl_account(final_bank_account)

    # Resolve paid_from from first invoice's debit_to (Debtors account)
    customer_receivable = None
    for inv in invoices:
        if inv.get("doctype") == "Sales Invoice" and inv.get("invoice"):
            customer_receivable = frappe.db.get_value("Sales Invoice", inv["invoice"], "debit_to")
            if customer_receivable:
                break
    if not customer_receivable:
        customer_receivable = frappe.db.get_value("Company", company, "default_receivable_account")

    # -------------------------------
    # 2. Build Payment Entry
    # -------------------------------
    payment_entry = frappe.get_doc(
        {
            "doctype": "Payment Entry",
            "payment_type": "Receive",
            "mode_of_payment": "Wire Transfer",
            "company": company,
            "party_type": "Customer",
            "party": customer,
            "paid_amount": paid_amount,
            "received_amount": received_amount,
            "reference_no": stmt.description,
            "reference_date": stmt.transaction_date,
            "posting_date": stmt.transaction_date,
            "paid_from": customer_receivable,  # Debtors account
            "paid_to": bank_account_gl or get_default_bank_account(company, "Receive"),  # Bank GL account
            "bank_account": final_bank_account, # ⭐ Use doc name
        }
    )

    # -------------------------------
    # 3. Allocate invoices
    # -------------------------------
    reference_rows = []
    for inv in invoices:
        reference_rows.append(
            {
                "reference_doctype": inv.get("doctype"),
                "reference_name": inv.get("invoice"),
                "allocated_amount": float(inv.get("amount") or 0),
            }
        )

    payment_entry.set("references", reference_rows)

    # -------------------------------
    # 4. GST setup
    # -------------------------------
    if invoices:
        first = invoices[0]
        _set_gst_fields(
            payment_entry,
            customer,
            "Customer",
            company,
            first.get("doctype"),
            first.get("invoice")
        )

    # -------------------------------
    # 5. Tax adjustments
    # -------------------------------
    if tax_adjustments_list:
        _add_tax_rows_to_payment(payment_entry, tax_adjustments_list)

    # -------------------------------
    # 6. Save & Submit
    # -------------------------------
    payment_entry.insert()
    payment_entry.submit()

    # -------------------------------
    # 7. Update Bank Statement Entry
    # -------------------------------
    frappe.db.set_value("Bank Statement Entry", stmt.name, {
        "reference_no": payment_entry.name,
        "reconciled": 1,
        "match_type": "Auto"
    })

    # -------------------------------
    # 8. Return response
    # -------------------------------
    return {
        "status": "ok",
        "payment_entry": payment_entry.name,
        "allocated": total_allocated,
        "statement_amount": statement_amount,
        "paid_amount": paid_amount,
        "allow_overpayment": allow_overpayment,
        "excess_amount": paid_amount - total_allocated
    }

####################################### End of Bank Recon #################################################
# Notification
def notify_assignment(doc, method):
    if doc.reference_type == "HD Ticket":
        assigned_user = doc.owner
        hd_ticket = frappe.get_doc(doc.reference_type, doc.reference_name)

        ticket_title = hd_ticket.subject or "No Subject"
        priority = hd_ticket.priority or "Normal"
        customer = hd_ticket.customer or "Unknown"
        ticket_link = f"/app/hd-ticket/{hd_ticket.name}"

        message = f"""
        <div style='color: black; background-color: #66FF00; padding: 10px; border-radius: 8px; font-weight: bold;'>
            🤖 <b>Ticket Assigned!</b><br>
            📄 <b>Subject:</b> {ticket_title}<br>
            👤 <b>Customer:</b> {customer}<br>
            ⚠️ <b>Priority:</b> {priority}<br>
            🔗 <a href="{ticket_link}">View Ticket</a>
        </div>
        """

        frappe.publish_realtime(
            event='hd_ticket_assignment',
            message={
                'message': message,
                'ticket_name': hd_ticket.name
            },
            user=assigned_user
        )
###############################################################################
import frappe

@frappe.whitelist()
def get_lms_records(circuit_id):
    # Fetch parent LMS records with ignore_permissions
    lms_records = frappe.get_all(
        'Lastmile Services Master',
        filters={'circuit_id': circuit_id, 'lms_stage': 'Delivered'},
        fields=[
            'name', 'lms_feasibility_partner', 'supplier_contact', 'solution',
            'lms_stage', 'lms_delivery_date', 'suppliernumber', 'lms_brandwith_name',
            'media', 'mode1', 'static_ip', 'static_ip_1', 'url', 'user_id', 'password',

            # New fields for LMS PMT Portal
            'payment_mode_1', 'bank', 'portal_login_id', 'portal_login_password'
        ],
        ignore_permissions=True
    )

    # Append escalation details for each record
    for record in lms_records:
        contacts = frappe.get_all(
            'LMS Contact Escalation',
            filters={'parent': record.name},
            fields=[
                'level',
                'link_zitr',
                'link_syot',
                'designation',
                'department',
                'contact_phone'
            ],
            ignore_permissions=True
        )
        record['contacts'] = contacts

    return lms_records
######################################################################################
import frappe
from frappe import _

@frappe.whitelist()
def create_contact_and_add_escalation(
    lms_name,
    link_doctype='Supplier',
    link_name=None,
    first_name=None,
    last_name=None,
    custom_type='LMS Supplier',
    designation=None,
    department=None,
    email_id=None,
    is_primary_email=1,
    phone=None,
    is_primary_mobile_no=1,
    level=None
):
    """
    Creates a Contact (with email_ids, phone_nos, links if those child tables exist),
    then appends a row to the Lastmile Services Master child table 'table_oeiw' where
    link_zitr should store the created contact id.

    Returns: { "success": True, "contact": contact.name } or
             { "success": False, "error": "..." }
    """
    try:
        # === Validate inputs ===
        if not first_name and not last_name:
            frappe.throw(_("Either First Name or Last Name is required."))

        if not link_name:
            frappe.throw(_("Supplier (link_name) is required."))

        # Ensure level formatting
        valid_levels = [f"Level-{i}" for i in range(1, 6)]
        if level and level not in valid_levels:
            frappe.throw(_("Invalid Level. Allowed values are: {0}").format(", ".join(valid_levels)))

        # === Create Contact doc ===
        contact_meta = frappe.get_meta('Contact')
        contact = frappe.new_doc('Contact')

        contact.first_name = first_name or ''
        contact.last_name = last_name or ''

        # custom_type (user provided field name)
        if contact_meta.get_field('custom_type'):
            contact.custom_type = custom_type

        # designation / department if present
        if contact_meta.get_field('designation') and designation:
            contact.designation = designation
        if contact_meta.get_field('department') and department:
            contact.department = department

        # add email child row if email provided and child table exists
        if email_id and contact_meta.get_field('email_ids'):
            contact.append('email_ids', {
                'email_id': email_id,
                'is_primary': int(is_primary_email)
            })

        # add phone child row if phone provided and child table exists
        if phone and contact_meta.get_field('phone_nos'):
            contact.append('phone_nos', {
                'phone': phone,
                'is_primary_mobile_no': int(is_primary_mobile_no)
            })

        # add dynamic link to Contact if links child table exists
        if contact_meta.get_field('links'):
            contact.append('links', {
                'link_doctype': link_doctype,
                'link_name': link_name
            })

        # Insert contact
        contact.insert(ignore_permissions=True)
        frappe.db.commit()

        # === Append escalation row to Lastmile Services Master ===
        child_table_field = 'table_oeiw'
        lms_meta = frappe.get_meta('Lastmile Services Master')

        if not lms_meta.get_field(child_table_field):
            frappe.throw(_("Child table '{0}' not found on Lastmile Services Master.").format(child_table_field))

        lms_doc = frappe.get_doc('Lastmile Services Master', lms_name)

        child_row = {
            'link_zitr': contact.name,  # Contact ID
            'link_syot': email_id or '',
            'contact_phone': phone or '',
            'designation': designation or '',
            'department': department or '',
            'level': level or ''
        }

        lms_doc.append(child_table_field, child_row)
        lms_doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {'success': True, 'contact': contact.name}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), 'create_contact_and_add_escalation')
        return {'success': False, 'error': str(e)}

#######################################################################################
## Payment Entry update to Expense Claim     

import frappe

def update_expense_claim_status(doc, method):
    """
    Called when Payment Entry is submitted.
    Updates Expense Claim's custom_payment_status to 'Paid'
    if linked in references.
    """
    for ref in doc.references:
        if ref.reference_doctype == "Expense Claim" and ref.reference_name:
            frappe.db.set_value("Expense Claim", ref.reference_name, "custom_payment_status", "Paid")
###########################################################################################

# HD Ticket Auto email to the manager
import frappe
from frappe.utils import now_datetime, get_datetime, formatdate
from openpyxl import Workbook
import io


@frappe.whitelist()
def get_engineer_ticket_summary():
    """Return ticket summary grouped by engineer with SLA buckets + detailed tickets"""
    statuses = ["Open", "On Hold", "Replied"]

    tickets = frappe.get_all(
        "HD Ticket",
        filters={"status": ["in", statuses]},
        fields=[
            "name",
            "custom_circuit_id",
            "customer",
            "custom_agent_name",
            "custom_channel",
            "priority",
            "custom_stage",
            "status",
            "opening_date",
            "opening_time"
        ]
    )

    summary = {}
    detailed_rows = []

    for t in tickets:
        # 🚫 Skip if Circuit ID or Customer is missing
        if not t.custom_circuit_id or not t.customer:
            continue

        engineer = t.custom_agent_name or "Unassigned"
        open_datetime = get_datetime(f"{t.opening_date} {t.opening_time}")
        age_hours = (now_datetime() - open_datetime).total_seconds() / 3600

        # SLA bucket
        if age_hours <= 4:
            age_bucket = "0-4 hrs"
        elif age_hours <= 24:
            age_bucket = "<24 hrs"
        else:
            age_bucket = ">24 hrs"

        # Summary calculation
        if engineer not in summary:
            summary[engineer] = {"0-4 hrs": 0, "<24 hrs": 0, ">24 hrs": 0, "Total": 0}

        summary[engineer][age_bucket] += 1
        summary[engineer]["Total"] += 1

        # Detailed row
        detailed_rows.append({
            "custom_circuit_id": t.custom_circuit_id,
            "ticket_no": t.name, 
            "customer": t.customer,
            "custom_agent_name": engineer,
            "custom_channel": t.custom_channel,
            "priority": t.priority,
            "custom_stage": t.custom_stage,
            "status": t.status,
            "opening_date": str(t.opening_date),
            "hours": age_bucket
        })

    # grand totals
    grand = {"0-4 hrs": 0, "<24 hrs": 0, ">24 hrs": 0, "Total": 0}
    for eng in summary.values():
        for k in grand:
            grand[k] += eng[k]

    return {"summary": summary, "grand": grand, "detailed": detailed_rows}


def format_engineer_ticket_email(data):
    summary = data["summary"]
    grand = data["grand"]

    now_dt = now_datetime()
    formatted_date = formatdate(now_dt, "d MMMM yyyy")
    formatted_time = now_dt.strftime("%I:%M %p")  # ✅ AM/PM format

    rows = ""
    for eng, counts in summary.items():
        rows += f"""
        <tr>
            <td style="padding:6px; border:1px solid #ccc; text-align:left;">{eng}</td>
            <td align="center" style="padding:6px; border:1px solid #ccc;">{counts['0-4 hrs']}</td>
            <td align="center" style="padding:6px; border:1px solid #ccc;">{counts['<24 hrs']}</td>
            <td align="center" style="padding:6px; border:1px solid #ccc;">{counts['>24 hrs']}</td>
            <td align="center" style="padding:6px; border:1px solid #ccc; font-weight:bold;">{counts['Total']}</td>
        </tr>
        """

    grand_row = f"""
    <tr style="background:#d1e7dd; font-weight:bold;">
        <td style="padding:6px; border:1px solid #ccc; text-align:left;">Grand Total</td>
        <td align="center" style="padding:6px; border:1px solid #ccc;">{grand['0-4 hrs']}</td>
        <td align="center" style="padding:6px; border:1px solid #ccc;">{grand['<24 hrs']}</td>
        <td align="center" style="padding:6px; border:1px solid #ccc;">{grand['>24 hrs']}</td>
        <td align="center" style="padding:6px; border:1px solid #ccc;">{grand['Total']}</td>
    </tr>
    """

    html = f"""
    <div style="font-family: Arial, sans-serif;">
        <p>Hello Team,</p>
        <p>
            Please find Open ticket report as on time, 
            <b>needs to push more on tickets open beyond 24 hours to closure.</b>
        </p>

        <div style="background:#0047ab; color:#fff; padding:12px; border-radius:8px; margin-top:15px; width:70%;">
            <h2 style="margin:0;">📊 Engineer SLA Ticket Report</h2>
            <p style="margin:5px 0;">As of {formatted_date} – Time : {formatted_time}</p>
        </div>

        <table style="width:70%; border-collapse:collapse; margin-top:15px; font-size:13px;">
            <tr style="background:#eaf0f6;">
                <th style="padding:6px; border:1px solid #ccc; text-align:left;">Engineer</th>
                <th style="padding:6px; border:1px solid #ccc;">0-4 hrs</th>
                <th style="padding:6px; border:1px solid #ccc;">&lt;24 hrs</th>
                <th style="padding:6px; border:1px solid #ccc;">&gt;24 hrs</th>
                <th style="padding:6px; border:1px solid #ccc;">Total</th>
            </tr>
            {rows}
            {grand_row}
        </table>

        <p style="margin-top:20px; font-size:13px;">
            Data in Excel format attached for your reference.
        </p>

        <p style="margin-top:10px; font-size:12px; color:#666;">
            This is an automated SLA report from ERPNext.
        </p>
    </div>
    """
    return html, formatted_date, formatted_time


def generate_excel_report(data, formatted_date, formatted_time):
    """Generate Excel with detailed ticket info"""
    tickets = data["detailed"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Tickets"

    # Title
    ws.append([f"Engineer SLA Ticket Report - {formatted_date}, {formatted_time}"])
    ws.append([])

    # Headers
    headers = [
        "Circuit ID",
        "Ticket No",
        "Customer",
        "Agent Name",
        "Channel",
        "Priority",
        "Stage",
        "Status",
        "Opening Date",
        "Hours"
    ]
    ws.append(headers)

    # Ticket rows
    for t in tickets:
        ws.append([
            t["custom_circuit_id"],
            t["ticket_no"],
            t["customer"] or "",
            t["custom_agent_name"] or "",
            t["custom_channel"] or "",
            t["priority"] or "",
            t["custom_stage"] or "",
            t["status"] or "",
            t["opening_date"] or "",
            t["hours"]
        ])

    # Save to BytesIO
    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    return bio.read()


@frappe.whitelist()
def send_engineer_ticket_report():
    data = get_engineer_ticket_summary()
    message, formatted_date, formatted_time = format_engineer_ticket_email(data)

    # Generate detailed Excel attachment
    excel_bytes = generate_excel_report(data, formatted_date, formatted_time)

    subject = f"📌 Open Ticket Report as on {formatted_date}, Time : {formatted_time}"

    frappe.sendmail(
        recipients=["support.team@nexapp.co.in"],
        subject=subject,
        message=message,
        attachments=[
            {
                "fname": f"Engineer_SLA_Report_{formatted_date}.xlsx",
                "fcontent": excel_bytes
            }
        ]
    )
    return "Report sent successfully with Excel attachment!"
##############################################################################

import frappe

def update_task_circuit_sales_order(doc, method):
    """Update Task Circuit ID.sales_order_no when Sales Order is saved"""
    try:
        # Step 1: Ensure Sales Order has a linked Task
        if not doc.custom_task:
            return

        # Step 2: Check Task exists
        task_exists = frappe.db.exists("Task", doc.custom_task)
        if not task_exists:
            return

        # Step 3: Loop through Sales Order Items
        for item in doc.items:
            if not item.custom_feasibility:
                continue

            # Step 4: Find matching Task Circuit ID child rows
            task_circuits = frappe.get_all(
                "Task Circuit ID",
                filters={
                    "parent": doc.custom_task,   # belongs to the Task
                    "custom_circuit_id": item.custom_feasibility
                },
                fields=["name"]
            )

            # Step 5: Update sales_order_no
            for tc in task_circuits:
                frappe.db.set_value(
                    "Task Circuit ID",
                    tc.name,
                    "sales_order_no",
                    doc.name
                )

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "update_task_circuit_sales_order Error")

#####################################################################################
# Site To Invoice MAnagement 
import frappe

def update_invoice_and_lms(doc, method):
    """
    ✅ Creates new Invoice Management record when Site is Delivered & Live
    ✅ Prevents duplicate Invoice Management records
    ✅ Adds SO Item Invoice & LMS Item rows
    """

    # ✅ 1. Only proceed if Site is "Delivered and Live"
    if doc.doctype != "Site" or doc.site_status != "Delivered and Live":
        return

    # ✅ 2. Check if Invoice Management already exists for this Site (avoid duplicates)
    existing_invoice = frappe.get_value("Invoice Management", {"circuit_id": doc.name}, "name")
    if existing_invoice:
        invoice = frappe.get_doc("Invoice Management", existing_invoice)  # Use existing record
    else:
        # ✅ Create new Invoice Management record
        invoice = frappe.new_doc("Invoice Management")
        invoice.circuit_id = doc.name
        invoice.customer = doc.customer  # Optional – you can map more fields if required
        invoice.insert(ignore_permissions=True)

    # ✅ 3. Add Sales Order Items into SO Item Invoice Table
    if doc.sales_order:
        so = frappe.get_doc("Sales Order", doc.sales_order)
        for item in so.items:
            if item.custom_feasibility == doc.name:
                # Prevent duplication
                exists = any(row.item_code == item.item_code for row in invoice.so_item_invoice)
                if not exists:
                    invoice.append("so_item_invoice", {
                        "item_code": item.item_code,
                        "rate": item.rate,
                        "qty": item.qty,
                        "amount": item.amount
                    })

    # ✅ 4. Add LMS Delivered rows into SO Item LMS Table
    if hasattr(doc, "lms_vendor"):
        for lms in doc.lms_vendor:
            if lms.stage == "LMS Delivered":
                # Prevent duplication
                exists = any(row.lms_id == (lms.lms_id or lms.name) for row in invoice.so_item_lms)
                if not exists:
                    invoice.append("so_item_lms", {
                        "lms_id": lms.lms_id or lms.name,
                        "bandwidth": lms.bandwidth,
                        "bandwith_type": lms.bandwith_type,
                        "lms_delivery_date": lms.lms_delivery_date,
                        "lms_status": lms.stage
                    })

    # ✅ 5. Sanitize invalid Billing Terms (fix ValidationError)
    # Some child tables may have billing_terms = "none" which is not allowed.
    if hasattr(invoice, "items"):
        for item in invoice.items:
            if getattr(item, "billing_terms", None) == "none":
                item.billing_terms = ""  # replace invalid value with blank

    # ✅ 6. Save Invoice after cleaning data
    invoice.save(ignore_permissions=True)
    frappe.db.commit()

#################################################################################
# Bank Recon - Employe Expense Claim
import frappe
from frappe import _
from frappe.utils import flt, nowdate

@frappe.whitelist()
def get_bank_statement_entries(bank_account=None):
    """Get bank statement entries for reconciliation"""
    filters = {"reconciled": 0}
    
    if bank_account:
        filters["bank_account"] = bank_account
    
    entries = frappe.get_all(
        "Bank Statement Entry",
        filters=filters,
        fields=["name", "transaction_date", "description", "deposit", "withdrawal", "bank_account"],
        order_by="transaction_date desc"
    )
    
    # Add posting_date field for compatibility with frontend
    for entry in entries:
        entry["posting_date"] = entry.get("transaction_date")
    
    return entries

@frappe.whitelist()
def get_outstanding_expense_claims(employee, company=None):
    """Get outstanding expense claims for an employee"""
    if not company:
        company = frappe.defaults.get_user_default("company")
    
    expense_claims = frappe.get_all(
        "Expense Claim",
        filters={
            "employee": employee,
            "docstatus": 1,
            "status": ["!=", "Paid"],
            "company": company
        },
        fields=["name", "posting_date", "total_sanctioned_amount"],
        order_by="posting_date desc"
    )
    
    return expense_claims
############################################################################
#Employee PAyment Entry

import frappe
from frappe.utils import flt, nowdate

@frappe.whitelist()
def create_employee_expense_payment(statement_name, invoices, employee, company=None):
    """
    Create Payment Entry for Employee Expense Claim during Bank Reconciliation
    """

    invoices = frappe.parse_json(invoices)
    if not invoices:
        return {"status": "error", "error": "No expense claim invoices provided"}

    if not employee:
        return {"status": "error", "error": "Employee is required"}

    company = company or frappe.defaults.get_default("company")

    # Get Bank Statement Entry
    statement = frappe.get_doc("Bank Statement Entry", statement_name)
    bank_amount = flt(statement.withdrawal or statement.deposit or 0)

    # Calculate allocated amount
    total_allocated = sum([flt(inv.get("amount")) for inv in invoices])

    if total_allocated <= 0:
        return {"status": "error", "error": "Allocated amount must be > 0"}

    if total_allocated > bank_amount:
        return {
            "status": "error",
            "error": f"Allocated amount ({total_allocated}) cannot exceed bank amount ({bank_amount})"
        }

    # Create Payment Entry
    pe = frappe.new_doc("Payment Entry")
    pe.payment_type = "Pay"                         # Expense Claim is always Pay
    pe.company = company
    pe.posting_date = statement.date
    pe.mode_of_payment = "Bank"
    pe.reference_no = statement.name
    pe.reference_date = statement.date

    # IMPORTANT — FIXES YOUR ERROR
    pe.party_type = "Employee"
    pe.party = employee

    # Paid From (Bank GL account)
    if statement.bank_account:
        pe.paid_from = get_bank_gl_account(statement.bank_account)
    else:
        return {"status": "error", "error": "Bank account missing in statement"}

    # Paid To (Employee's payable account from Expense Claim or Company default)
    emp_payable = None
    for inv in invoices:
        if inv.get("invoice"):
            emp_payable = frappe.db.get_value("Expense Claim", inv["invoice"], "payable_account")
            if emp_payable:
                break
    pe.paid_to = emp_payable or frappe.db.get_value("Company", company, "default_payable_account")

    pe.paid_amount = total_allocated
    pe.received_amount = amount

    # Add references
    for inv in invoices:
        pe.append("references", {
            "reference_doctype": "Expense Claim",
            "reference_name": inv.get("invoice"),
            "allocated_amount": flt(inv.get("amount")),
        })

    # Save & Submit Payment Entry
    pe.insert(ignore_permissions=True)
    pe.submit()

    # Mark statement as reconciled
    frappe.db.set_value("Bank Statement Entry", statement_name, {
        "reference_no": pe.name,
        "reconciled": 1,
        "match_type": "Auto"
    })

    return {
        "status": "ok",
        "payment_entry": pe.name
    }

####################################################################################
# AI Page        
import frappe
import requests
from html import escape
from frappe.utils import get_fullname

# ✅ Call n8n and return reply text; longer timeout to avoid 60s read timeout
@frappe.whitelist(allow_guest=True)
def chat_with_n8n(message):
    try:
        url = "https://nexapp.app.n8n.cloud/webhook/erp-chat"
        response = requests.post(url, json={"message": message}, timeout=180)

        if response.status_code == 200:
            # ✅ Try JSON first; fallback to raw text
            try:
                data = response.json()
                return data.get("reply") or "No reply"
            except Exception:
                return (response.text or "").strip() or "No reply"
        else:
            return f"Error: n8n returned {response.status_code}"

    except requests.exceptions.Timeout:
        return "Error: Connection to n8n timed out. Try again."

    except Exception as e:
        return f"Error: {str(e)}"


# ✅ Send a well-formatted HTML email with Question + Answer
@frappe.whitelist()
def email_ai_response(question: str, body: str):
    """
    Sends an HTML email to the logged-in user's email address.
    Includes the question and the AI's answer in a clean format.
    """
    try:
        user = frappe.session.user

        # ✅ Get email from User doctype
        email = frappe.db.get_value("User", user, "email") or (user if "@" in user else None)
        if not email:
            return {"status": "fail", "msg": "No email found for current user."}

        # ✅ Get user full name (fallback to 'there')
        try:
            full_name = get_fullname(user) or "there"
        except Exception:
            full_name = "there"

        # ✅ Escape special characters for safety, convert line breaks to HTML <br>
        q_html = escape(question or "").replace("\n", "<br>")
        a_html = escape(body or "").replace("\n", "<br>")

        subject = "Response from ERPNext AI Assistant"

        # ✅ Clean HTML email body
        html_body = f"""
        <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif; font-size:14px; color:#111827; line-height:1.6;">
          <p>Hello {escape(full_name)},</p>

          <p><b>You asked:</b></p>
          <div style="background:#F3F4F6; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin:8px 0 16px;">
            {q_html}
          </div>

          <p><b>Here is the answer from ERPNext AI Assistant:</b></p>
          <div style="background:#FFFFFF; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin:8px 0 16px;">
            {a_html}
          </div>

          <p style="margin-top:18px;">
            Thank you,<br>
            <b>ERPNext AI Agent</b>
          </p>
        </div>
        """

        # ✅ Correct email method in Frappe → use message= (HTML allowed)  
        frappe.sendmail(
            recipients=[email],
            subject=subject,
            message=html_body,   # ✅ HTML directly supported
            delayed=False        # ✅ Send instantly
        )

        return {"status": "ok"}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "email_ai_response_failed")
        return {"status": "fail", "msg": str(e)}
################################################################################
# Disconnection Request 
import frappe

@frappe.whitelist()
def fetch_items_from_site(docname):
    doc = frappe.get_doc("Disconnection Request", docname)

    if not doc.circuit_id:
        frappe.throw("Circuit ID is required.")

    if not frappe.db.exists("Site", doc.circuit_id):
        frappe.throw(f"Site '{doc.circuit_id}' does not exist.")

    # Clear child table to prevent duplicates
    doc.disconnection_multiple = []

    # Fetch Site Items
    site_items = frappe.get_all("Site Item",
        filters={"parent": doc.circuit_id},
        fields=[
            "item_name", "qty", "item_code", "serial_no_sim_no", "item_group",
            "status", "warranty_expiry_date", "lan_mac", "hardware_version",
            "wlan_mac", "wan_mac", "module", "warranty_period_days", "imei",
            "mobile_no", "activation_date", "validity", "data_plan",
            "recharge_end_date", "rental_plan", "brand"
        ]
    )

    for item in site_items:
        doc.append("disconnection_multiple", {
            "circuit_id": doc.circuit_id,
            "item_name": item.item_name,
            "qty": item.qty,
            "item_code": item.item_code,
            "serial_no_sim_no": item.serial_no_sim_no,
            "item_group": item.item_group,
            "stage": item.status,
            "warranty_expiry_date": item.warranty_expiry_date,
            "lan_mac": item.lan_mac,
            "hardware_version": item.hardware_version,
            "wlan_mac": item.wlan_mac,
            "wan_mac": item.wan_mac,
            "module": item.module,
            "warranty_period_days": item.warranty_period_days,
            "imei": item.imei,
            "mobile_no": item.mobile_no,
            "activation_date": item.activation_date,
            "validity": item.validity,
            "data_plan": item.data_plan,
            "recharge_end_date": item.recharge_end_date,
            "rental_plan": item.rental_plan,
            "brand": item.brand
        })

    doc.save(ignore_permissions=True)

############################################################################
# apps/nexapp/nexapp/api.py

import frappe

@frappe.whitelist()
def create_disconnection_lms(disconnection_request):
    """Creates or updates Disconnection LMS, Stock Management, SIM Disconnection.
       Also updates Site and LMS stages when status = 'Approved'.
    """

    doc = frappe.get_doc("Disconnection Request", disconnection_request)

    # ✅ Duplicate prevention
    existing_lms = frappe.db.exists("Disconnection LMS", {"disconnection_request_id": doc.name})
    existing_sm = frappe.db.exists("Stock Management Disconnection", {"disconnection_request_id": doc.name})
    existing_sim = frappe.db.exists("SIM Disconnection", {"disconnection_request_id": doc.name})

    if existing_lms or existing_sm or existing_sim:
        frappe.msgprint("⚠️ Records already created for this Disconnection Request.", indicator="orange")
        return {"duplicate": True}

    # ------------------------------------------------------------------
    # ✅ ONLY LMS with lms_stage = "Delivered"
    # ------------------------------------------------------------------
    lms_map = frappe._dict()
    for d in frappe.get_all(
        "Lastmile Services Master",
        filters={"lms_stage": "Delivered"},
        fields=["name", "circuit_id"]
    ):
        if d.circuit_id:
            lms_map.setdefault(d.circuit_id, []).append(d.name)

    site_map = frappe._dict({
        d.circuit_id: d.name
        for d in frappe.get_all("Site", fields=["name", "circuit_id"])
    })

    # ------------------ PART 1: CREATE LMS & STOCK MANAGEMENT ------------------
    for row in (doc.circuit_disconnection or []):
        circuit_id = (row.circuit_id or "").strip()
        if not circuit_id:
            continue

        try:
            # --- Create Disconnection LMS (Delivered LMS only) ---
            for lms_name in lms_map.get(circuit_id, []):

                if not frappe.db.exists(
                    "Disconnection LMS",
                    {"lms_id": lms_name, "disconnection_request_id": doc.name}
                ):
                    new_lms = frappe.new_doc("Disconnection LMS")
                    new_lms.circuit_id = circuit_id
                    new_lms.lms_id = lms_name
                    new_lms.disconnection_request_id = doc.name
                    new_lms.insert(ignore_permissions=True)

            # --- Create/Update Stock Management ---
            site_name = site_map.get(circuit_id)
            if not site_name:
                continue

            sm_name = frappe.db.exists("Stock Management", {"circuit_id": site_name})
            if not sm_name:
                sm_doc = frappe.new_doc("Stock Management")
                sm_doc.circuit_id = site_name
                sm_doc.disconnection_stage = "Open"
                sm_doc.stock_management_type = "Disconnection"
                sm_doc.status = "Disconnection"
                sm_doc.disconnection_request_id = doc.name
                sm_doc.insert(ignore_permissions=True)
            else:
                sm_doc = frappe.get_doc("Stock Management", sm_name)
                sm_doc.disconnection_request_id = doc.name
                sm_doc.flags.ignore_validate = True
                sm_doc.save(ignore_permissions=True)

            # ------------------ PART 3: STOCK MGMT DISCONNECTION + SIM DISCONNECTION ------------------

            exists_child = frappe.db.exists(
                "Stock Management Disconnection",
                {"parent": sm_doc.name, "disconnection_request_id": doc.name}
            )

            if not exists_child:

                site_items = frappe.get_all(
                    "Site Item",
                    filters={"parent": site_name},
                    fields=["item_code", "item_name", "qty", "serial_no_sim_no", "item_group"]
                )

                for it in site_items:

                    if it.item_group != "Telecom":
                        sm_doc.append("stock_management_disconnection", {
                            "item_code": it.item_code,
                            "item_name": it.item_name,
                            "qty": it.qty,
                            "serial_no_sim_no": it.serial_no_sim_no,
                            "item_group": it.item_group,
                            "disconnection_request_id": doc.name
                        })
                    else:
                        sim_doc = frappe.new_doc("SIM Disconnection")
                        sim_doc.circuit_id = site_name
                        sim_doc.item_code = it.item_code
                        sim_doc.sim_no = it.serial_no_sim_no
                        sim_doc.disconnection_request_id = doc.name
                        sim_doc.insert(ignore_permissions=True)

                        frappe.db.set_value(
                            "SIM Disconnection",
                            sim_doc.name,
                            "disconnection_request_id",
                            doc.name
                        )

                sm_doc.flags.ignore_mandatory = True
                sm_doc.flags.ignore_validate = True
                sm_doc.flags.dirty = True
                sm_doc.save(ignore_permissions=True)

            existing_sim_records = frappe.get_all(
                "SIM Disconnection",
                filters={"circuit_id": site_name},
                fields=["name"]
            )

            for sim in existing_sim_records:
                frappe.db.set_value(
                    "SIM Disconnection",
                    sim.name,
                    "disconnection_request_id",
                    doc.name
                )

        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"Error processing Circuit ID {circuit_id}"
            )
            continue

    # ------------------ PART 4: UPDATE SITE & LMS STAGE IF APPROVED ------------------
    if doc.status == "Approved":

        for row in doc.circuit_disconnection or []:
            if row.circuit_id:
                try:
                    frappe.db.set_value("Site", row.circuit_id, {
                        "site_status": "Disconnection In Process",
                        "lms_stage": "Disconnection In Process"
                    })
                except Exception as e:
                    frappe.log_error(
                        f"Error updating Site for circuit_id {row.circuit_id}",
                        str(e)
                    )

        for row in doc.circuit_disconnection or []:
            for lms_id in lms_map.get(row.circuit_id, []):
                try:
                    frappe.db.set_value("Lastmile Services Master", lms_id, {
                        "lms_stage": "Disconnection In Process"
                    })
                except Exception as e:
                    frappe.log_error(
                        f"Error updating LMS for lms_id {lms_id}",
                        str(e)
                    )

    return {"updated": True}


def process_disconnection_request_submit(doc, method):
    """Hook triggered on submit of Disconnection Request."""
    res = create_disconnection_lms(doc.name)

    if res.get("duplicate"):
        return

    frappe.msgprint(
        "✅ LMS, SIM & Stock Management Updated Successfully",
        title="Update Complete",
        indicator="green"
    )


###############################################################################
# LMS Cancel Code

import frappe

@frappe.whitelist()
def cancel_lms_service(lms_id, circuit_id):
    """
    Final logic:
    1. Cancel LMS Master FIRST (so hooks skip processing)
    2. Check Site status
    3. Update child table row → stage = LMS Cancelled
    """

    # ------------------------------
    # Validate Inputs
    # ------------------------------
    if not lms_id:
        return "LMS ID missing."

    if not circuit_id:
        return "Circuit ID missing."

    # ------------------------------
    # STEP 1 — CANCEL LMS MASTER FIRST
    # ------------------------------
    try:
        lms = frappe.get_doc("Lastmile Services Master", lms_id)
    except frappe.DoesNotExistError:
        return f"LMS '{lms_id}' not found."

    # Set LMS stage to Cancelled BEFORE anything
    lms.lms_stage = "Cancelled"
    lms.save(ignore_permissions=True)

    # Now the hook update_site_child_table() will skip execution
    # because it checks doc.lms_stage == "Cancelled"

    # ------------------------------
    # STEP 2 — Fetch Site
    # ------------------------------
    try:
        site = frappe.get_doc("Site", circuit_id)
    except frappe.DoesNotExistError:
        return f"Site '{circuit_id}' not found."

    # ------------------------------
    # BLOCK CANCELLATION if Delivered & Live
    # ------------------------------
    if site.site_status == "Delivered and Live":
        return "Cannot cancel Supplier—site is ‘Delivered & Live’. Use Change Management."

    # ------------------------------
    # STEP 3 — Update child table row lms_vendor
    # ------------------------------
    clean_lms_id = (lms_id or "").strip()
    child_found = False

    for row in site.lms_vendor:
        if (row.lms_id or "").strip() == clean_lms_id:
            frappe.db.set_value("LMS Site", row.name, "stage", "LMS Cancelled")
            child_found = True
            break

    if not child_found:
        return "Matching LMS ID not found in Site's LMS Vendor table."

    return "The Lastmile Service has been cancelled successfully."

##############################################################################
#Bank Recon  Journal Entry

import frappe

@frappe.whitelist()
def match_now_create_journal(statement_name, expense_account):
    """
    Create & Submit Journal Entry for a withdrawal transaction.
    Debit: Selected Expense Account
    Credit: Bank Ledger Account (bank_account_head)
    """

    # 🔹 Load Bank Statement Entry
    stmt = frappe.get_doc("Bank Statement Entry", statement_name)

    # 🔹 Withdrawal Amount
    amount = float(stmt.withdrawal or 0)
    if amount <= 0:
        return {"status": "fail", "error": "No withdrawal amount found"}

    # 🔹 Bank Ledger Account
    ledger_account = stmt.bank_account_head
    if not ledger_account:
        return {
            "status": "fail",
            "error": "Please set Bank Account Head in the Bank Statement Entry."
        }

    # 🔹 Company of Ledger Account
    company = frappe.db.get_value("Account", ledger_account, "company")

    # 🔹 Create Journal Entry
    je = frappe.get_doc({
        "doctype": "Journal Entry",
        "voucher_type": "Bank Entry",
        "company": company,
        "posting_date": stmt.transaction_date,

        "cheque_no": stmt.description or "",
        "cheque_date": stmt.transaction_date,
        "remark": stmt.description or "",
        "mode_of_payment": "Wire Transfer",

        "user_remark": f"Auto-created from Bank Statement {statement_name}",

        "accounts": [
            {
                "account": expense_account,
                "debit_in_account_currency": amount
            },
            {
                "account": ledger_account,
                "credit_in_account_currency": amount
            }
        ]
    })

    je.flags.ignore_mandatory = True

    # 🔹 Save (Draft)
    je.insert(ignore_permissions=True)

    # 🔹 Submit the Journal Entry
    je.submit()

    # 🔹 Mark Bank Statement as Reconciled
    frappe.db.set_value("Bank Statement Entry", statement_name, {
        "reference_no": je.name,
        "reconciled": 1,
        "match_type": "Auto"
    })

    return {
        "status": "ok",
        "journal_entry": je.name,
        "amount": amount,
        "submitted": True
    }

########################################################################3
#Bank Recon - Transfer To Another Bank

import frappe

@frappe.whitelist()
def create_bank_transfer(statement_name, from_account, to_account, amount, description):
    """
    Create Journal Entry for 'Transfer To Another Account'
    (DRAFT JE + Mark Statement Reconciled)
    """

    try:
        amount = float(amount)

        # ----------------------------
        # 1. Get Bank Statement Entry
        # ----------------------------
        statement = frappe.get_doc("Bank Statement Entry", statement_name)

        # SAFE posting date extraction
        posting_date = (
            statement.get("date") 
            or statement.get("transaction_date")
            or statement.get("posting_date")
            or statement.get("creation")
            or frappe.utils.nowdate()
        )

        # SAFE company value
        company = frappe.db.get_single_value("Global Defaults", "default_company")

        # ----------------------------
        # 2. Create Journal Entry (DRAFT ONLY)
        # ----------------------------
        je = frappe.new_doc("Journal Entry")
        je.voucher_type = "Bank Entry"
        je.posting_date = posting_date
        je.company = company

        je.user_remark = description or (statement.description or "")
        je.cheque_no = statement.description
        je.cheque_date = posting_date

        # DR → TO Account
        je.append("accounts", {
            "account": to_account,
            "debit_in_account_currency": amount,
            "debit": amount
        })

        # CR → FROM Account
        je.append("accounts", {
            "account": from_account,
            "credit_in_account_currency": amount,
            "credit": amount
        })

        # SAVE ONLY — NO SUBMIT
        je.save(ignore_permissions=True)

        # ----------------------------
        # 3. Mark Statement as Reconciled
        # ----------------------------
        frappe.db.set_value("Bank Statement Entry", statement_name, {
            "reconciled": 1,
            "reference_no": je.name,
            "match_type": "Auto"
        })

        return {
            "status": "ok",
            "journal_entry": je.name,
            "message": "Draft JE created + Statement Reconciled"
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Bank Transfer Error")
        return {"status": "error", "error": str(e)}

###########################################################################
# Itemized Posting Code
import frappe
import json

@frappe.whitelist()
def reconcile_bank_statement_with_payment(statement_name, payment_entry):
    """
    Utility function to reconcile a bank statement entry with a payment entry.
    Updates reference_no, reconciled=1 and match_type='Auto'.
    """
    try:
        frappe.db.set_value("Bank Statement Entry", statement_name, {
            "reference_no": payment_entry,
            "reconciled": 1,
            "match_type": "Auto"
        })
        return {"status": "ok"}
    except Exception as e:
        frappe.log_error(title="BR_RECONCILE_Utility_Error", message=frappe.get_traceback())
        return {"status": "error", "error": str(e)}

#############################################################################
# HD Ticket Customer Potal

import frappe
import json
from datetime import datetime
from frappe.desk.reportview import get_filters_cond, get_match_cond

# =============================================================================
#  GET TICKETS WITH USER PERMISSION + POS LOGIC - UPDATED
# =============================================================================
@frappe.whitelist()
def get_tickets(filters=None, page=1, page_size=20):
    """
    Ticket filtering logic:

    1️⃣ User Permission Logic:
        If User Permission → allow = Customer
        then user sees ONLY those customers.

    2️⃣ custom_pos_customer Logic:
        For each customer:
            If custom_pos_customer = 1:
                Only tickets where Site.customer_type = 'POC Customer'
            If custom_pos_customer = 0:
                Site.customer_type IN ('POC Customer', 'Paid Customer', '')

    3️⃣ Dynamic UI Filters:
        ticket_no, channel, circuit_id, customer, site_name, status
    """

    # -----------------------------
    # Convert JSON Filters
    # -----------------------------
    if isinstance(filters, str):
        try:
            filters = json.loads(filters)
        except:
            filters = {}
    filters = filters or {}

    # Better debug logging without title truncation
    debug_messages = []
    debug_messages.append(f"DEBUG: Received filters: {filters}")

    allowed = {
        "ticket_no": "name",
        "channel": "custom_channel",
        "circuit_id": "custom_circuit_id",
        "customer": "customer",
        "site_name": "custom_site_name",
        "status": "status",
    }

    # -----------------------------
    # Dynamic Filters - FIXED FOR ALL FILTERS
    # -----------------------------
    conditions = []
    params = []

    for k, v in filters.items():
        if v and k in allowed:
            # For ALL fields, use LIKE for partial matching
            conditions.append(f"`{allowed[k]}` LIKE %s")
            params.append(f"%{v}%")
            debug_messages.append(f"DEBUG: Added filter {k}='{v}' for field {allowed[k]}")

    where_clause = ""
    if conditions:
        where_clause = " AND " + " AND ".join(conditions)
    
    debug_messages.append(f"DEBUG: Where clause: {where_clause}")
    debug_messages.append(f"DEBUG: Filter params before customer: {params}")

    # ============================================================
    # USER PERMISSION → FETCH ALLOWED CUSTOMERS
    # ============================================================
    user = frappe.session.user
    debug_messages.append(f"DEBUG: Current user: {user}")

    # GET USER'S PERMITTED CUSTOMERS
    allowed_customers = get_allowed_customers_for_user(user)
    
    if not allowed_customers:
        debug_messages.append("DEBUG: No user permissions found or user has no access")
        frappe.log_error("\n".join(debug_messages), "get_tickets - No permissions")
        return {"tickets": [], "total": 0}

    debug_messages.append(f"DEBUG: Allowed customers for user {user}: {allowed_customers}")

    # ============================================================
    # BUILD PER-CUSTOMER CONDITION (POS LOGIC) - USER SPECIFIC
    # ============================================================
    per_customer_conditions = []
    per_customer_params = []

    for cust in allowed_customers:
        pos_flag = frappe.db.get_value("Customer", cust, "custom_pos_customer")
        debug_messages.append(f"DEBUG: Customer '{cust}' has POS flag: {pos_flag}")

        if pos_flag == 1:
            # Only tickets where Site.customer_type = 'POC Customer'
            per_customer_conditions.append(
                """(customer=%s AND EXISTS (
                    SELECT 1 FROM `tabSite` s 
                    WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                    AND s.customer_type = 'POC Customer'
                ))"""
            )
            per_customer_params.append(cust)
        else:
            # POC or Paid or Empty customer type from Site
            per_customer_conditions.append(
                """(customer=%s AND (
                    NOT EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                        AND s.customer_type NOT IN ('POC Customer', 'Paid Customer', '')
                    )
                    OR `tabHD Ticket`.custom_circuit_id IS NULL
                    OR `tabHD Ticket`.custom_circuit_id = ''
                ))"""
            )
            per_customer_params.append(cust)

    # Combine with OR
    final_customer_clause = " AND (" + " OR ".join(per_customer_conditions) + ")"
    
    debug_messages.append(f"DEBUG: Final customer clause: {final_customer_clause}")

    # Combine all params - customer params first, then filter params
    all_params = per_customer_params + params
    
    debug_messages.append(f"DEBUG: All params (customer+filter): {all_params}")

    # ============================================================
    # Pagination
    # ============================================================
    try:
        page = int(page)
        if page < 1:
            page = 1
    except:
        page = 1

    try:
        page_size = int(page_size)
        if page_size <= 0 or page_size > 2000:
            page_size = 20
    except:
        page_size = 20

    offset = (page - 1) * page_size

    # ============================================================
    # COUNT QUERY
    # ============================================================
    count_query = f"""
        SELECT COUNT(*)
        FROM `tabHD Ticket`
        WHERE 1=1
        {final_customer_clause}
        {where_clause}
    """
    
    debug_messages.append(f"DEBUG: Count query: {count_query}")
    
    try:
        total = frappe.db.sql(
            count_query,
            tuple(all_params),
        )[0][0]
        
        debug_messages.append(f"DEBUG: Total count: {total}")
    except Exception as e:
        debug_messages.append(f"DEBUG: Error in count query: {str(e)}")
        total = 0

    # ============================================================
    # MAIN DATA QUERY - UPDATED TO INCLUDE custom_rca (RESOLUTION FIELD)
    # ============================================================
    data_query = f"""
        SELECT
            name,
            custom_channel,
            custom_circuit_id,
            customer,
            custom_site_name,
            custom_site_type,
            priority,
            custom_agent_name,
            custom_agent_responded_on,
            resolution_by,
            first_responded_on,
            creation,
            custom_close_datetime,
            resolution_date,
            subject,
            description,
            custom_site_id__legal_code,
            status,
            custom_rca  -- ADDED: Resolution field from HD Ticket
        FROM `tabHD Ticket`
        WHERE 1=1
        {final_customer_clause}
        {where_clause}
        ORDER BY creation DESC
        LIMIT %s OFFSET %s
    """
    
    all_params_with_pagination = all_params + [page_size, offset]
    
    debug_messages.append(f"DEBUG: Data query: {data_query}")
    
    try:
        tickets = frappe.db.sql(
            data_query,
            tuple(all_params_with_pagination),
            as_dict=True,
        )
        
        debug_messages.append(f"DEBUG: Tickets found: {len(tickets)}")
        if tickets:
            # Log only the first 3 tickets to avoid too much data
            for i, ticket in enumerate(tickets[:3]):
                debug_messages.append(f"DEBUG: Ticket {i+1}: {ticket.get('name')} - Created: {ticket.get('creation')} - Closed: {ticket.get('custom_close_datetime')} - RCA: {ticket.get('custom_rca')}")
    except Exception as e:
        debug_messages.append(f"DEBUG: Error in data query: {str(e)}")
        tickets = []

    # Log all debug messages at once
    frappe.log_error("\n".join(debug_messages), "get_tickets")
    
    return {"tickets": tickets, "total": total}


# =============================================================================
#  HELPER FUNCTIONS
# =============================================================================

def get_allowed_customers_for_user(user):
    """
    Get list of customers user is allowed to see based on User Permission
    """
    if user == "Administrator":
        # Administrator can see all customers
        return []
    
    user_permissions = frappe.db.get_all(
        "User Permission",
        filters={"user": user, "allow": "Customer"},
        fields=["for_value"],
        distinct=True
    )
    
    allowed_customers = [x.for_value for x in user_permissions if x.for_value]
    return allowed_customers


def apply_user_permission_filter(user, doctype, query):
    """
    Apply User Permission filter to any query
    This function can be used in other places to enforce permissions
    """
    if user == "Administrator":
        return query
    
    allowed_customers = get_allowed_customers_for_user(user)
    
    if not allowed_customers:
        # User has no permissions, show nothing
        query = query.where(f"{doctype}.customer = ''")
    else:
        # User can only see specific customers
        query = query.where(f"{doctype}.customer IN %(allowed_customers)s")
        query = query.values(allowed_customers=tuple(allowed_customers))
    
    return query


# =============================================================================
#  HD TICKET PERMISSION QUERY - THIS IS THE CRITICAL FIX
# =============================================================================
def get_permission_query_conditions(user):
    """
    This is called by Frappe's permission system
    It adds WHERE conditions to ALL queries on HD Ticket
    This ensures User Permissions are applied EVERYWHERE
    """
    if not user:
        user = frappe.session.user
    
    if user == "Administrator":
        return ""
    
    allowed_customers = get_allowed_customers_for_user(user)
    
    if not allowed_customers:
        # User has no permissions, show nothing
        return """(`tabHD Ticket`.customer = '' AND `tabHD Ticket`.customer IS NOT NULL)"""
    
    # Apply POS logic for each customer
    conditions = []
    
    for cust in allowed_customers:
        pos_flag = frappe.db.get_value("Customer", cust, "custom_pos_customer")
        
        if pos_flag == 1:
            conditions.append(
                f"""(customer='{cust}' AND EXISTS (
                    SELECT 1 FROM `tabSite` s 
                    WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                    AND s.customer_type = 'POC Customer'
                ))"""
            )
        else:
            conditions.append(
                f"""(customer='{cust}' AND (
                    NOT EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                        AND s.customer_type NOT IN ('POC Customer', 'Paid Customer', '')
                    )
                    OR `tabHD Ticket`.custom_circuit_id IS NULL
                    OR `tabHD Ticket`.custom_circuit_id = ''
                ))"""
            )
    
    # Combine conditions with OR
    final_condition = "(" + " OR ".join(conditions) + ")"
    
    return final_condition


# =============================================================================
#  HD TICKET HAS PERMISSION CHECK - ADDITIONAL SECURITY
# =============================================================================
def has_permission(doc, user):
    """
    Check if user has permission to access this specific HD Ticket
    Called when accessing individual tickets
    """
    if user == "Administrator":
        return True
    
    allowed_customers = get_allowed_customers_for_user(user)
    
    if not allowed_customers:
        return False
    
    if doc.customer not in allowed_customers:
        return False
    
    # Check POS logic for this customer
    pos_flag = frappe.db.get_value("Customer", doc.customer, "custom_pos_customer")
    
    if pos_flag == 1:
        # Check if Site exists and has customer_type = 'POC Customer'
        if doc.custom_circuit_id:
            site_customer_type = frappe.db.get_value("Site", doc.custom_circuit_id, "customer_type")
            return site_customer_type == 'POC Customer'
        else:
            return False
    else:
        # User can see tickets where Site.customer_type is POC, Paid, or empty
        if doc.custom_circuit_id:
            site_customer_type = frappe.db.get_value("Site", doc.custom_circuit_id, "customer_type")
            return site_customer_type in ['POC Customer', 'Paid Customer', None, '']
        else:
            return True


# =============================================================================
#  GET TICKET STATS - TOTAL COUNTS FOR ALL STATUSES
# =============================================================================
@frappe.whitelist()
def get_ticket_stats():
    """
    Get total ticket counts for all statuses considering user permissions
    """
    try:
        user = frappe.session.user

        # Get allowed customers for user
        allowed_customers = get_allowed_customers_for_user(user)

        if not allowed_customers:
            return {
                "total": 0,
                "open": 0,
                "replied": 0,
                "on_hold": 0,
                "resolved": 0,
                "closed": 0
            }

        # Build per-customer conditions with POS logic
        per_customer_conditions = []
        per_customer_params = []

        for cust in allowed_customers:
            pos_flag = frappe.db.get_value("Customer", cust, "custom_pos_customer")

            if pos_flag == 1:
                # Only tickets where Site.customer_type = 'POC Customer'
                per_customer_conditions.append(
                    """(customer=%s AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                        AND s.customer_type = 'POC Customer'
                    ))"""
                )
                per_customer_params.append(cust)
            else:
                # POC or Paid or Empty customer type from Site
                per_customer_conditions.append(
                    """(customer=%s AND (
                        NOT EXISTS (
                            SELECT 1 FROM `tabSite` s 
                            WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                            AND s.customer_type NOT IN ('POC Customer', 'Paid Customer', '')
                        )
                        OR `tabHD Ticket`.custom_circuit_id IS NULL
                        OR `tabHD Ticket`.custom_circuit_id = ''
                    ))"""
                )
                per_customer_params.append(cust)

        final_customer_clause = " AND (" + " OR ".join(per_customer_conditions) + ")"

        # Query for total counts by status
        status_counts = frappe.db.sql("""
            SELECT 
                status,
                COUNT(*) as count
            FROM `tabHD Ticket`
            WHERE 1=1
            {customer_clause}
            GROUP BY status
        """.format(customer_clause=final_customer_clause), tuple(per_customer_params), as_dict=True)

        # Initialize counts
        stats = {
            "total": 0,
            "open": 0,
            "replied": 0,
            "on_hold": 0,
            "resolved": 0,
            "closed": 0
        }

        # Map statuses to our categories
        for row in status_counts:
            status = (row.status or "").lower()
            count = row.count
            
            stats["total"] += count
            
            if "open" in status:
                stats["open"] += count
            elif "replied" in status:
                stats["replied"] += count
            elif "on hold" in status:
                stats["on_hold"] += count
            elif "resolved" in status:
                stats["resolved"] += count
            elif "closed" in status:
                stats["closed"] += count

        return stats

    except Exception as e:
        frappe.log_error(f"Error getting ticket stats: {str(e)}")
        return {
            "total": 0,
            "open": 0,
            "replied": 0,
            "on_hold": 0,
            "resolved": 0,
            "closed": 0
        }


# =============================================================================
#  GET TICKET ACTIVITY (Communication + Version log)
# =============================================================================
@frappe.whitelist()
def get_ticket_activity(ticket_name):
    """Returns all activity linked to a ticket: Email + Version Log."""

    if not ticket_name:
        return {"activity": []}

    # Check if user has permission to view this ticket
    user = frappe.session.user
    if user != "Administrator":
        ticket = frappe.db.get_value("HD Ticket", ticket_name, ["customer", "custom_circuit_id"], as_dict=True)
        if ticket:
            allowed_customers = get_allowed_customers_for_user(user)
            if ticket.customer not in allowed_customers:
                return {"activity": [], "error": "Permission denied"}
            
            # Check POS logic
            pos_flag = frappe.db.get_value("Customer", ticket.customer, "custom_pos_customer")
            if pos_flag == 1:
                # Check if Site has customer_type = 'POC Customer'
                if ticket.custom_circuit_id:
                    site_customer_type = frappe.db.get_value("Site", ticket.custom_circuit_id, "customer_type")
                    if site_customer_type != 'POC Customer':
                        return {"activity": [], "error": "Permission denied"}

    # -----------------------------------
    # Communications (Email) Logs
    # -----------------------------------
    comms = frappe.db.sql(
        """
        SELECT
            name, communication_type, sender, recipients,
            subject, content, creation
        FROM `tabCommunication`
        WHERE reference_doctype = 'HD Ticket'
          AND reference_name = %s
        ORDER BY creation DESC
        """,
        (ticket_name,),
        as_dict=True,
    )

    comm_list = []
    for c in comms:
        comm_list.append({
            "type": "Communication",
            "sender": c.sender,
            "subject": c.subject,
            "content_html": c.content,  # raw HTML email
            "content": c.content,  # plain text fallback
            "creation": str(c.creation),
        })

    # -----------------------------------
    # Version Logs (System Changes)
    # -----------------------------------
    versions = frappe.db.sql(
        """
        SELECT name, data, owner, creation
        FROM `tabVersion`
        WHERE ref_doctype='HD Ticket'
          AND docname=%s
        ORDER BY creation DESC
        """,
        (ticket_name,),
        as_dict=True,
    )

    ver_list = []
    for v in versions:
        try:
            parsed_data = json.loads(v.data)
        except:
            parsed_data = v.data

        ver_list.append(
            {
                "type": "Version",
                "owner": v.owner,
                "data": parsed_data,
                "creation": str(v.creation),
            }
        )

    # Merge + sort by timestamp
    all_activity = comm_list + ver_list
    activity = sorted(all_activity, key=lambda x: x["creation"], reverse=True)

    return {"activity": activity}


# =============================================================================
#  GET SITE INFORMATION BY CIRCUIT ID
# =============================================================================
@frappe.whitelist()
def get_site_by_circuit_id(circuit_id):
    """
    Get Site document information by circuit_id
    """
    try:
        if not circuit_id:
            return None
            
        # Check if Site document exists with this name
        if frappe.db.exists("Site", circuit_id):
            site = frappe.get_doc("Site", circuit_id)
            return {
                "address_street": site.get("address_street"),
                "district": site.get("district"),
                "city": site.get("city"),
                "pincode": site.get("pincode"),
                "state": site.get("state"),
                "territory": site.get("territory"),
                "contact_person": site.get("contact_person"),
                "primary_contact_mobile": site.get("primary_contact_mobile")
            }
        else:
            return None
    except Exception as e:
        frappe.log_error(f"Error getting site by circuit_id {circuit_id}: {str(e)}")
        return None


# =============================================================================
#  UPDATE TICKET STATUS
# =============================================================================
@frappe.whitelist()
def update_ticket_status(ticket_name, new_status):
    """
    Update HD Ticket status
    """
    try:
        if not ticket_name or not new_status:
            return {"status": "error", "message": "Missing required parameters"}
            
        if not frappe.db.exists("HD Ticket", ticket_name):
            return {"status": "error", "message": "Ticket not found"}
        
        # Check if user has permission to update this ticket
        user = frappe.session.user
        if user != "Administrator":
            ticket = frappe.db.get_value("HD Ticket", ticket_name, ["customer", "custom_circuit_id"], as_dict=True)
            if ticket:
                allowed_customers = get_allowed_customers_for_user(user)
                if ticket.customer not in allowed_customers:
                    return {"status": "error", "message": "Permission denied to update this ticket"}
                
                # Check POS logic
                pos_flag = frappe.db.get_value("Customer", ticket.customer, "custom_pos_customer")
                if pos_flag == 1:
                    # Check if Site has customer_type = 'POC Customer'
                    if ticket.custom_circuit_id:
                        site_customer_type = frappe.db.get_value("Site", ticket.custom_circuit_id, "customer_type")
                        if site_customer_type != 'POC Customer':
                            return {"status": "error", "message": "Permission denied to update this ticket"}
            
        ticket = frappe.get_doc("HD Ticket", ticket_name)
        ticket.status = new_status
        ticket.save(ignore_permissions=True)
        
        frappe.db.commit()
        
        return {"status": "success", "message": f"Ticket status updated to {new_status}"}
        
    except Exception as e:
        frappe.log_error(f"Error updating ticket status {ticket_name}: {str(e)}")
        return {"status": "error", "message": str(e)}


# =============================================================================
#  GET TICKET STATUS OPTIONS
# =============================================================================
@frappe.whitelist()
def get_ticket_status_options():
    """
    Get all available status options from HD Ticket doctype
    """
    try:
        status_options = frappe.get_meta("HD Ticket").get_field("status").options
        if status_options:
            # Convert string of options to list
            status_list = [status.strip() for status in status_options.split("\n") if status.strip()]
            return {"status_options": status_list}
        else:
            return {"status_options": ["Open", "Replied", "On Hold", "Resolved", "Closed"]}
    except Exception as e:
        frappe.log_error(f"Error getting ticket status options: {str(e)}")
        return {"status_options": ["Open", "Replied", "On Hold", "Resolved", "Closed"]}


# =============================================================================
#  CHECK CREATE TICKET PERMISSION
# =============================================================================
@frappe.whitelist()
def check_create_ticket_permission():
    """
    Check if current user can create tickets
    based on custom_create_ticket flag in Customer
    """
    try:
        user = frappe.session.user
        
        if user == "Administrator":
            # Administrator can always create tickets
            return {
                "can_create": True,
                "customer_name": "Administrator",
                "message": "Administrator has full access"
            }
        
        # Get user's allowed customers
        allowed_customers = get_allowed_customers_for_user(user)
        
        if not allowed_customers:
            return {
                "can_create": False,
                "customer_name": None,
                "message": "No customers assigned to user"
            }
        
        # Check if any allowed customer has custom_create_ticket = 1
        for cust in allowed_customers:
            custom_create_ticket = frappe.db.get_value("Customer", cust, "custom_create_ticket")
            customer_name = frappe.db.get_value("Customer", cust, "customer_name")
            
            if custom_create_ticket == 1:
                return {
                    "can_create": True,
                    "customer_name": customer_name,
                    "customer": cust,
                    "message": f"User can create tickets for {customer_name}"
                }
        
        # No customer with create permission
        return {
            "can_create": False,
            "customer_name": None,
            "message": "No customer with create ticket permission"
        }
        
    except Exception as e:
        frappe.log_error(f"Error checking create ticket permission: {str(e)}")
        return {
            "can_create": False,
            "customer_name": None,
            "error": str(e)
        }


# =============================================================================
#  GET TICKETS BY STATUS (For debugging stats vs filtered results)
# =============================================================================
@frappe.whitelist()
def get_tickets_by_status(status):
    """
    Get tickets by specific status for debugging
    """
    try:
        user = frappe.session.user

        # Get allowed customers for user
        allowed_customers = get_allowed_customers_for_user(user)

        if not allowed_customers:
            return {"tickets": [], "total": 0}

        # Build per-customer conditions with POS logic
        per_customer_conditions = []
        per_customer_params = []

        for cust in allowed_customers:
            pos_flag = frappe.db.get_value("Customer", cust, "custom_pos_customer")

            if pos_flag == 1:
                # Only tickets where Site.customer_type = 'POC Customer'
                per_customer_conditions.append(
                    """(customer=%s AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                        AND s.customer_type = 'POC Customer'
                    ))"""
                )
                per_customer_params.append(cust)
            else:
                # POC or Paid or Empty customer type from Site
                per_customer_conditions.append(
                    """(customer=%s AND (
                        NOT EXISTS (
                            SELECT 1 FROM `tabSite` s 
                            WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                            AND s.customer_type NOT IN ('POC Customer', 'Paid Customer', '')
                        )
                        OR `tabHD Ticket`.custom_circuit_id IS NULL
                        OR `tabHD Ticket`.custom_circuit_id = ''
                    ))"""
                )
                per_customer_params.append(cust)

        final_customer_clause = " AND (" + " OR ".join(per_customer_conditions) + ")"

        # Add status filter - FIXED: Use LIKE instead of = for better matching
        status_condition = " AND status LIKE %s"
        per_customer_params.append(f"%{status}%")

        # Count query
        total = frappe.db.sql(
            f"""
            SELECT COUNT(*)
            FROM `tabHD Ticket`
            WHERE 1=1
            {final_customer_clause}
            {status_condition}
            """,
            tuple(per_customer_params),
        )[0][0]

        # Data query - UPDATED TO INCLUDE custom_rca (RESOLUTION FIELD)
        tickets = frappe.db.sql(
            f"""
            SELECT
                name,
                custom_channel,
                custom_circuit_id,
                customer,
                custom_site_name,
                custom_site_type,
                priority,
                custom_agent_name,
                custom_agent_responded_on,
                resolution_by,
                first_responded_on,
                creation,
                custom_close_datetime,
                resolution_date,
                subject,
                description,
                custom_site_id__legal_code,
                status,
                custom_rca  -- ADDED: Resolution field from HD Ticket
            FROM `tabHD Ticket`
            WHERE 1=1
            {final_customer_clause}
            {status_condition}
            ORDER BY creation DESC
            LIMIT 50
            """,
            tuple(per_customer_params),
            as_dict=True,
        )

        return {
            "tickets": tickets, 
            "total": total,
            "status": status,
            "debug_info": {
                "user": user,
                "allowed_customers": allowed_customers,
                "status_used": status
            }
        }

    except Exception as e:
        frappe.log_error(f"Error getting tickets by status {status}: {str(e)}")
        return {"tickets": [], "total": 0, "error": str(e)}


# =============================================================================
#  DEBUG: GET ALL STATUS VALUES
# =============================================================================
@frappe.whitelist()
def get_all_status_values():
    """
    Get all distinct status values from HD Ticket for debugging
    """
    try:
        user = frappe.session.user

        # Get allowed customers for user
        allowed_customers = get_allowed_customers_for_user(user)

        if not allowed_customers:
            return {"status_values": []}

        # Build per-customer conditions with POS logic
        per_customer_conditions = []
        per_customer_params = []

        for cust in allowed_customers:
            pos_flag = frappe.db.get_value("Customer", cust, "custom_pos_customer")

            if pos_flag == 1:
                # Only tickets where Site.customer_type = 'POC Customer'
                per_customer_conditions.append(
                    """(customer=%s AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                        AND s.customer_type = 'POC Customer'
                    ))"""
                )
                per_customer_params.append(cust)
            else:
                # POC or Paid or Empty customer type from Site
                per_customer_conditions.append(
                    """(customer=%s AND (
                        NOT EXISTS (
                            SELECT 1 FROM `tabSite` s 
                            WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                            AND s.customer_type NOT IN ('POC Customer', 'Paid Customer', '')
                        )
                        OR `tabHD Ticket`.custom_circuit_id IS NULL
                        OR `tabHD Ticket`.custom_circuit_id = ''
                    ))"""
                )
                per_customer_params.append(cust)

        final_customer_clause = " AND (" + " OR ".join(per_customer_conditions) + ")"

        # Get all distinct status values
        status_values = frappe.db.sql(
            f"""
            SELECT DISTINCT status, COUNT(*) as count
            FROM `tabHD Ticket`
            WHERE 1=1
            {final_customer_clause}
            GROUP BY status
            ORDER BY status
            """,
            tuple(per_customer_params),
            as_dict=True,
        )

        return {
            "status_values": status_values,
            "debug_info": {
                "user": user,
                "allowed_customers": allowed_customers,
                "total_customers": len(allowed_customers)
            }
        }

    except Exception as e:
        frappe.log_error(f"Error getting status values: {str(e)}")
        return {"status_values": [], "error": str(e)}


# =============================================================================
#  GET ALL TICKETS WITHOUT FILTERS (For debugging)
# =============================================================================
@frappe.whitelist()
def get_all_tickets_for_debug():
    """
    Get all tickets without any filters for debugging
    """
    try:
        user = frappe.session.user

        # Get allowed customers for user
        allowed_customers = get_allowed_customers_for_user(user)

        if not allowed_customers:
            return {"tickets": [], "total": 0}

        # Build per-customer conditions with POS logic
        per_customer_conditions = []
        per_customer_params = []

        for cust in allowed_customers:
            pos_flag = frappe.db.get_value("Customer", cust, "custom_pos_customer")

            if pos_flag == 1:
                # Only tickets where Site.customer_type = 'POC Customer'
                per_customer_conditions.append(
                    """(customer=%s AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                        AND s.customer_type = 'POC Customer'
                    ))"""
                )
                per_customer_params.append(cust)
            else:
                # POC or Paid or Empty customer type from Site
                per_customer_conditions.append(
                    """(customer=%s AND (
                        NOT EXISTS (
                            SELECT 1 FROM `tabSite` s 
                            WHERE s.name = `tabHD Ticket`.custom_circuit_id 
                            AND s.customer_type NOT IN ('POC Customer', 'Paid Customer', '')
                        )
                        OR `tabHD Ticket`.custom_circuit_id IS NULL
                        OR `tabHD Ticket`.custom_circuit_id = ''
                    ))"""
                )
                per_customer_params.append(cust)

        final_customer_clause = " AND (" + " OR ".join(per_customer_conditions) + ")"

        # Get all tickets without filters - UPDATED TO INCLUDE custom_rca (RESOLUTION FIELD)
        tickets = frappe.db.sql(
            f"""
            SELECT
                name,
                custom_channel,
                custom_circuit_id,
                customer,
                custom_site_name,
                custom_site_type,
                priority,
                custom_agent_name,
                custom_agent_responded_on,
                resolution_by,
                first_responded_on,
                creation,
                custom_close_datetime,
                resolution_date,
                subject,
                description,
                custom_site_id__legal_code,
                status,
                custom_rca  -- ADDED: Resolution field from HD Ticket
            FROM `tabHD Ticket`
            WHERE 1=1
            {final_customer_clause}
            ORDER BY creation DESC
            LIMIT 100
            """,
            tuple(per_customer_params),
            as_dict=True,
        )

        # Count all tickets
        total = frappe.db.sql(
            f"""
            SELECT COUNT(*)
            FROM `tabHD Ticket`
            WHERE 1=1
            {final_customer_clause}
            """,
            tuple(per_customer_params),
        )[0][0]

        return {
            "tickets": tickets, 
            "total": total,
            "debug_info": {
                "user": user,
                "allowed_customers": allowed_customers,
                "total_customers": len(allowed_customers),
                "sample_tickets": len(tickets)
            }
        }

    except Exception as e:
        frappe.log_error(f"Error getting all tickets for debug: {str(e)}")
        return {"tickets": [], "total": 0, "error": str(e)}


# =============================================================================
#  DEBUG: GET USER PERMISSIONS AND CUSTOMER POS SETTINGS
# =============================================================================
@frappe.whitelist()
def get_user_customer_permissions():
    """
    Debug function to check user permissions and customer POS settings
    """
    try:
        user = frappe.session.user
        
        debug_info = {
            "user": user,
            "permissions": [],
            "customers": []
        }
        
        # Get user permissions for customers
        user_permissions = frappe.db.get_all(
            "User Permission",
            filters={"user": user, "allow": "Customer"},
            fields=["for_value", "name", "creation"],
            order_by="creation desc"
        )
        
        debug_info["permissions"] = user_permissions
        
        allowed_customers = [x.for_value for x in user_permissions if x.for_value]
        
        # Get customer details including POS flag and create ticket flag
        for cust in allowed_customers:
            customer_info = frappe.db.get_value(
                "Customer", 
                cust, 
                ["customer_name", "custom_pos_customer", "custom_customer_type", "custom_create_ticket"],
                as_dict=True
            )
            
            if customer_info:
                debug_info["customers"].append({
                    "customer": cust,
                    "customer_name": customer_info.get("customer_name"),
                    "pos_flag": customer_info.get("custom_pos_customer"),
                    "customer_type": customer_info.get("custom_customer_type"),
                    "can_create_ticket": customer_info.get("custom_create_ticket")
                })
        
        # Count tickets for each customer with new POS logic
        for cust_info in debug_info["customers"]:
            cust = cust_info["customer"]
            pos_flag = cust_info["pos_flag"]
            
            if pos_flag == 1:
                # Only tickets where Site.customer_type = 'POC Customer'
                ticket_count = frappe.db.sql("""
                    SELECT COUNT(*) as count
                    FROM `tabHD Ticket` t
                    WHERE t.customer=%s 
                    AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = t.custom_circuit_id 
                        AND s.customer_type = 'POC Customer'
                    )
                """, (cust,), as_dict=True)[0]["count"]
                
                poc_count = frappe.db.sql("""
                    SELECT COUNT(*) as count
                    FROM `tabHD Ticket` t
                    WHERE t.customer=%s 
                    AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = t.custom_circuit_id 
                        AND s.customer_type = 'POC Customer'
                    )
                """, (cust,), as_dict=True)[0]["count"]
                
                paid_count = frappe.db.sql("""
                    SELECT COUNT(*) as count
                    FROM `tabHD Ticket` t
                    WHERE t.customer=%s 
                    AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = t.custom_circuit_id 
                        AND s.customer_type = 'Paid Customer'
                    )
                """, (cust,), as_dict=True)[0]["count"]
                
                cust_info["ticket_counts"] = {
                    "total": ticket_count,
                    "poc_tickets": poc_count,
                    "paid_tickets": paid_count,
                    "user_can_see": "Only POC tickets (from Site)"
                }
            else:
                # Both POC and Paid tickets from Site
                ticket_count = frappe.db.sql("""
                    SELECT COUNT(*) as count
                    FROM `tabHD Ticket` t
                    WHERE t.customer=%s 
                    AND (
                        NOT EXISTS (
                            SELECT 1 FROM `tabSite` s 
                            WHERE s.name = t.custom_circuit_id 
                            AND s.customer_type NOT IN ('POC Customer', 'Paid Customer', '')
                        )
                        OR t.custom_circuit_id IS NULL
                        OR t.custom_circuit_id = ''
                    )
                """, (cust,), as_dict=True)[0]["count"]
                
                poc_count = frappe.db.sql("""
                    SELECT COUNT(*) as count
                    FROM `tabHD Ticket` t
                    WHERE t.customer=%s 
                    AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                        WHERE s.name = t.custom_circuit_id 
                        AND s.customer_type = 'POC Customer'
                    )
                """, (cust,), as_dict=True)[0]["count"]
                
                paid_count = frappe.db.sql("""
                    SELECT COUNT(*) as count
                    FROM `tabHD Ticket` t
                    WHERE t.customer=%s 
                    AND EXISTS (
                        SELECT 1 FROM `tabSite` s 
                            WHERE s.name = t.custom_circuit_id 
                            AND s.customer_type = 'Paid Customer'
                    )
                """, (cust,), as_dict=True)[0]["count"]
                
                cust_info["ticket_counts"] = {
                    "total": ticket_count,
                    "poc_tickets": poc_count,
                    "paid_tickets": paid_count,
                    "user_can_see": "Both POC & Paid tickets (from Site)"
                }
        
        return debug_info
        
    except Exception as e:
        frappe.log_error(f"Error getting user customer permissions: {str(e)}")
        return {"error": str(e)}


# =============================================================================
#  DEBUG: GET TICKETS BY CUSTOMER
# =============================================================================
@frappe.whitelist()
def get_tickets_by_customer(customer):
    """
    Get tickets for a specific customer to debug permission issues
    """
    try:
        user = frappe.session.user
        
        # Check if user has permission for this customer
        has_permission = frappe.db.exists(
            "User Permission",
            {
                "user": user,
                "allow": "Customer",
                "for_value": customer
            }
        )
        
        if not has_permission and user != "Administrator":
            return {
                "error": f"User {user} does not have permission for customer {customer}",
                "tickets": []
            }
        
        # Get customer POS flag
        pos_flag = frappe.db.get_value("Customer", customer, "custom_pos_customer")
        
        if pos_flag == 1:
            # Only tickets where Site.customer_type = 'POC Customer'
            tickets = frappe.db.sql("""
                SELECT
                    t.name,
                    s.customer_type,
                    t.status,
                    t.subject,
                    t.creation,
                    t.custom_close_datetime,
                    t.custom_rca  -- ADDED: Resolution field from HD Ticket
                FROM `tabHD Ticket` t
                LEFT JOIN `tabSite` s ON s.name = t.custom_circuit_id
                WHERE t.customer=%s 
                AND s.customer_type = 'POC Customer'
                ORDER BY t.creation DESC
                LIMIT 20
            """, (customer,), as_dict=True)
        else:
            # Both POC and Paid tickets from Site
            tickets = frappe.db.sql("""
                SELECT
                    t.name,
                    s.customer_type,
                    t.status,
                    t.subject,
                    t.creation,
                    t.custom_close_datetime,
                    t.custom_rca  -- ADDED: Resolution field from HD Ticket
                FROM `tabHD Ticket` t
                LEFT JOIN `tabSite` s ON s.name = t.custom_circuit_id
                WHERE t.customer=%s 
                AND (
                    s.customer_type IN ('POC Customer', 'Paid Customer', '')
                    OR s.customer_type IS NULL
                    OR t.custom_circuit_id IS NULL
                    OR t.custom_circuit_id = ''
                )
                ORDER BY t.creation DESC
                LIMIT 20
            """, (customer,), as_dict=True)
        
        return {
            "customer": customer,
            "pos_flag": pos_flag,
            "ticket_count": len(tickets),
            "tickets": tickets
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting tickets by customer {customer}: {str(e)}")
        return {"error": str(e), "tickets": []}


# =============================================================================
#  HD TICKET HOOKS - APPLY PERMISSIONS AT DOCTYPE LEVEL
# =============================================================================
# Add these hooks in your HD Ticket doctype's Python code or in hooks.py

def on_hd_ticket_permission_query(user):
    """
    Hook to apply permission query to HD Ticket
    """
    return get_permission_query_conditions(user)


def on_hd_ticket_has_permission(doc, user):
    """
    Hook to check permissions on individual HD Ticket documents
    """
    return has_permission(doc, user)
###############################################################################

import frappe
from frappe import _

@frappe.whitelist()
def check_ticket_creation_permission():
    """Check if current user has permission to create tickets based on User Permission and Customer settings"""
    try:
        current_user = frappe.session.user
        
        # Check if user has any User Permission for Customer doctype
        user_permissions = frappe.get_all(
            "User Permission",
            filters={
                "user": current_user,
                "allow": "Customer"
            },
            fields=["for_value"]
        )
        
        allowed_customers = [perm.for_value for perm in user_permissions]
        can_create_ticket = False
        
        if allowed_customers:
            # Check each customer's custom_create_ticket field
            for customer_name in allowed_customers:
                try:
                    customer = frappe.get_doc("Customer", customer_name)
                    if customer.get("custom_create_ticket") == 1:
                        can_create_ticket = True
                        break
                except frappe.DoesNotExistError:
                    continue
        
        return {
            "can_create_ticket": can_create_ticket,
            "allowed_customers": allowed_customers
        }
        
    except Exception as e:
        frappe.log_error(f"Error checking ticket creation permission: {str(e)}")
        return {
            "can_create_ticket": False,
            "allowed_customers": [],
            "error": str(e)
        }
###################################################################################
# Revesal api

import frappe
import json

@frappe.whitelist()
def reverse_bank_entries(entry_names):
    """
    Reverse selected bank statement entries
    """

    try:
        if isinstance(entry_names, str):
            entry_names = json.loads(entry_names)

        if not isinstance(entry_names, list):
            entry_names = [entry_names]

        success_count = 0
        failed_entries = []

        for entry_name in entry_names:
            try:
                bank_entry = frappe.get_doc("Bank Statement Entry", entry_name)

                reference_no = bank_entry.get("reference_no")

                # Cancel Payment Entry
                if reference_no and reference_no.startswith("ACC-PAY"):
                    if frappe.db.exists("Payment Entry", reference_no):
                        pe = frappe.get_doc("Payment Entry", reference_no)
                        if pe.docstatus != 2:
                            pe.cancel()
                            frappe.db.commit()

                # Cancel Journal Entry
                elif reference_no and reference_no.startswith("ACC-JV"):
                    if frappe.db.exists("Journal Entry", reference_no):
                        je = frappe.get_doc("Journal Entry", reference_no)
                        if je.docstatus != 2:
                            je.cancel()
                            frappe.db.commit()

                # ---------- FIXED: Update ONLY valid fields ----------
                frappe.db.set_value("Bank Statement Entry", entry_name, {
                    "reconciled": 0,      # Check field
                    "reference_no": ""    # Your actual reference field
                })

                frappe.db.commit()

                bank_entry.add_comment(text="Entry reversed and reconciliation reset to 0")

                success_count += 1

            except Exception as e:
                failed_entries.append({
                    "entry": entry_name,
                    "error": str(e)
                })
                frappe.log_error(f"Failed to reverse entry {entry_name}: {str(e)}", "Reverse Bank Entry")

        if failed_entries:
            return {
                "status": "partial",
                "message": f"{success_count} entries reversed. {len(failed_entries)} failed.",
                "success_count": success_count,
                "failed_count": len(failed_entries),
                "failed_entries": failed_entries
            }

        return {
            "status": "success",
            "message": f"{success_count} entries reversed successfully.",
            "success_count": success_count
        }

    except Exception as e:
        frappe.log_error(f"Error in reverse_bank_entries: {str(e)}", "Reverse Bank Entry")
        return {"status": "error", "message": str(e)}
#########################################################################
# Employee Advance
@frappe.whitelist()
def get_unpaid_employee_advances(employee):
    """Return all unpaid Employee Advances for selected employee."""

    advances = frappe.get_all(
        "Employee Advance",
        filters={
            "employee": employee,
            "docstatus": 1,
            "status": "Unpaid"      # ← FIXED (Do NOT use pending_amount filter)
        },
        fields=["name", "posting_date", "advance_amount", "paid_amount"],
        order_by="posting_date asc"
    )

    # Calculate pending amount manually
    for adv in advances:
        paid = adv.get("paid_amount") or 0
        total = adv.get("advance_amount") or 0
        adv["pending_amount"] = total - paid

    return advances
###############################################################################
import frappe
from frappe.utils import flt, nowdate

@frappe.whitelist()
def create_payment_entry_for_employee_advance(statement_name, employee, advance_name, amount, company=None, bank_account=None):
    """
    Create Payment Entry for Employee Advance Settlement
    Bank Account MUST come from the frontend selection.
    """

    amount = flt(amount)

    # -------------------------------
    # Basic Validations
    # -------------------------------
    if not employee:
        return {"status": "error", "error": "Employee is required"}

    if not bank_account:
        return {"status": "error", "error": "Bank Account not provided from UI"}

    if amount <= 0:
        return {"status": "error", "error": "Amount must be > 0"}

    company = company or frappe.defaults.get_default("company")

    # -------------------------------
    # Load Bank Statement Entry
    # -------------------------------
    statement = frappe.get_doc("Bank Statement Entry", statement_name)
    bank_amount = flt(statement.withdrawal or statement.deposit or 0)

    if amount > bank_amount:
        return {
            "status": "error",
            "error": f"Amount ({amount}) exceeds bank amount ({bank_amount})"
        }

    posting_date = (
        getattr(statement, "date", None)
        or getattr(statement, "transaction_date", None)
        or nowdate()
    )

    # -------------------------------
    # Convert Bank Account DocType → GL Account
    # -------------------------------
    gl_bank_account = get_bank_gl_account(bank_account)

    if not gl_bank_account:
        return {
            "status": "error",
            "error": f"No GL account linked to Bank Account: {bank_account}"
        }

    # Validate GL Account is active
    if frappe.db.get_value("Account", gl_bank_account, "disabled"):
        return {
            "status": "error",
            "error": f"GL Account '{gl_bank_account}' is DISABLED. Enable it in Chart of Accounts."
        }

    # -------------------------------
    # Employee Advance Account
    # -------------------------------
    advance_account = frappe.db.get_value(
        "Company",
        company,
        "default_employee_advance_account"
    )

    if not advance_account:
        return {"status": "error", "error": "Default Employee Advance Account not set in Company"}

    # -------------------------------
    # Create Payment Entry
    # -------------------------------
    pe = frappe.new_doc("Payment Entry")
    pe.payment_type = "Pay"            # Company paying employee
    pe.company = company
    pe.bank_account = bank_account_name # ⭐ Added
    pe.posting_date = posting_date
    pe.mode_of_payment = "Wire Transfer"
    pe.reference_no = statement.name
    pe.reference_date = posting_date

    pe.party_type = "Employee"
    pe.party = employee

    # Money OUT → Bank GL Account
    pe.paid_from = gl_bank_account

    # Money INTO → Employee Advance Account
    pe.paid_to = advance_account

    # ERPNext mandatory pairing for Pay
    pe.paid_amount = amount
    pe.received_amount = amount

    # -------------------------------
    # Add reference to Employee Advance
    # -------------------------------
    pe.append("references", {
        "reference_doctype": "Employee Advance",
        "reference_name": advance_name,
        "allocated_amount": amount
    })

    # Save & Submit
    pe.insert(ignore_permissions=True)
    pe.submit()

    # Mark the bank statement entry as reconciled
    frappe.db.set_value("Bank Statement Entry", statement_name, {
        "reconciled": 1,
        "reference_no": pe.name,
        "match_type": "Auto"
    })

    return {
        "status": "ok",
        "payment_entry": pe.name
    }
##############################################################################
#Invoice Management
import frappe

# ============================================================
# MAIN LIST API
# ============================================================

@frappe.whitelist()
def get_sales_orders(filters=None, page=1, page_size=20):

    rows = frappe.db.sql(
        """
        SELECT
            bs.name AS billing_statement_no,
            bs.sales_order_no,
            bs.customer AS customer_name,
            bs.order_type,
            IFNULL(bs.sales_order_amount, 0) AS sales_order_amount
        FROM `tabBilling Statement` bs
        ORDER BY bs.creation DESC
        """,
        as_dict=True
    )

    for r in rows:
        billed = get_billed_amount(r.sales_order_no)
        r["billed_amount"] = billed
        r["balance_to_bill"] = r["sales_order_amount"] - billed

    return {
        "total": len(rows),
        "orders": rows,
        "page": 1,
        "page_size": len(rows)
    }


# ============================================================
# BILLED AMOUNT (FIXED FIELD)
# ============================================================

def get_billed_amount(sales_order_no):
    if not sales_order_no:
        return 0

    return frappe.db.sql(
        """
        SELECT IFNULL(SUM(sii.base_net_amount), 0)
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si
            ON si.name = sii.parent
        WHERE si.docstatus = 1
        AND sii.sales_order = %s
        """,
        sales_order_no
    )[0][0]


# ============================================================
# DASHBOARD STATS
# ============================================================

@frappe.whitelist()
def get_invoice_stats():

    total = frappe.db.sql(
        "SELECT COUNT(*) FROM `tabBilling Statement`"
    )[0][0]

    total_amount = frappe.db.sql(
        "SELECT IFNULL(SUM(sales_order_amount), 0) FROM `tabBilling Statement`"
    )[0][0]

    billed_amount = frappe.db.sql(
        """
        SELECT IFNULL(SUM(sii.base_net_amount), 0)
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si
            ON si.name = sii.parent
        WHERE si.docstatus = 1
        """
    )[0][0]

    balance = total_amount - billed_amount
    percentage = round((billed_amount / total_amount) * 100, 2) if total_amount else 0

    return {
        "total": total,
        "billed": billed_amount,
        "balance": balance,
        "percentage": percentage
    }


# ============================================================
# TEST API (ADD BACK SO ERROR STOPS)
# ============================================================

@frappe.whitelist()
def test_api():
    data = frappe.db.sql(
        """
        SELECT
            name,
            sales_order_no,
            customer,
            order_type,
            sales_order_amount
        FROM `tabBilling Statement`
        """,
        as_dict=True
    )

    return {
        "count": len(data),
        "data": data
    }
############################ Invoice End ###############################################
#Unallocated - Customer
import frappe
from frappe.utils import flt, nowdate

# ---------------------------------------------------------
# 1. Fetch Outstanding Sales Invoices
# ---------------------------------------------------------
@frappe.whitelist()
def get_customer_outstanding_invoices(customer):

    if not customer:
        return []

    return frappe.db.sql(
        """
        SELECT
            si.name AS sales_invoice_no,
            si.posting_date AS sales_invoice_date,
            si.outstanding_amount
        FROM `tabSales Invoice` si
        WHERE
            si.customer = %s
            AND si.docstatus = 1
            AND si.outstanding_amount > 0
        ORDER BY si.posting_date
        """,
        customer,
        as_dict=True
    )


# ---------------------------------------------------------
# 2. Create Unallocated Payment Entry (RECONCILES AUTOMATICALLY)
# ---------------------------------------------------------
@frappe.whitelist()
def create_unallocated_payment_entry(customer, invoices):

    invoices = frappe.parse_json(invoices)

    if not customer or not invoices:
        frappe.throw("Missing customer or invoice data")

    total_amount = sum(flt(inv.get("amount")) for inv in invoices)
    if total_amount <= 0:
        frappe.throw("Total amount must be greater than zero")

    company = frappe.defaults.get_user_default("Company")
    company_currency = frappe.get_cached_value("Company", company, "default_currency")

    paid_to_account = frappe.get_value(
        "Mode of Payment Account",
        {
            "parent": "Wire Transfer",
            "company": company
        },
        "default_account"
    )

    if not paid_to_account:
        frappe.throw(
            f"No default account set for Mode of Payment 'Wire Transfer' for {company}"
        )

    today = nowdate()

    pe = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "party_type": "Customer",
        "party": customer,
        "company": company,

        "posting_date": today,
        "reference_date": today,
        "reference_no": f"UNALLOC-{customer}-{today}",

        "mode_of_payment": "Wire Transfer",
        "paid_to": paid_to_account,

        "paid_amount": total_amount,
        "received_amount": total_amount,

        "source_exchange_rate": 1,
        "target_exchange_rate": 1,
        "paid_to_account_currency": company_currency,

        "references": []
    })

    for inv in invoices:
        pe.append("references", {
            "reference_doctype": "Sales Invoice",
            "reference_name": inv.get("sales_invoice_no"),
            "allocated_amount": flt(inv.get("amount"))
        })

    pe.insert(ignore_permissions=True)
    pe.submit()

    return {
        "payment_entry": pe.name
    }


# ---------------------------------------------------------
# 3. Customer Unallocated Amount (Advance Balance)
# ---------------------------------------------------------
@frappe.whitelist()
def get_customer_unallocated_amount(customer):

    if not customer:
        return 0.0

    total_paid = frappe.db.sql(
        """
        SELECT IFNULL(SUM(pe.paid_amount), 0)
        FROM `tabPayment Entry` pe
        WHERE
            pe.party_type = 'Customer'
            AND pe.party = %s
            AND pe.docstatus = 1
        """,
        customer
    )[0][0]

    total_allocated = frappe.db.sql(
        """
        SELECT IFNULL(SUM(per.allocated_amount), 0)
        FROM `tabPayment Entry Reference` per
        INNER JOIN `tabPayment Entry` pe
            ON pe.name = per.parent
        WHERE
            pe.party_type = 'Customer'
            AND pe.party = %s
            AND pe.docstatus = 1
        """,
        customer
    )[0][0]

    return flt(total_paid) - flt(total_allocated)
###############################################################################

# HD Ticket Assignment

import frappe

def sync_custom_agent_from_todo(doc, method):
    """
    Sync custom_agent immediately when a user is assigned
    via Assign To (ToDo)
    """

    # Only assignments linked to HD Ticket
    if doc.reference_type != "HD Ticket":
        return

    # Ignore cancelled / closed todos
    if doc.status != "Open":
        return

    # The REAL assigned user
    assigned_user = doc.allocated_to

    if not assigned_user:
        return

    try:
        frappe.db.set_value(
            "HD Ticket",
            doc.reference_name,
            "custom_agent",
            assigned_user,
            update_modified=False
        )

        # 🔁 push realtime update so open form refreshes instantly
        frappe.publish_realtime(
            event="custom_agent_updated",
            message={
                "doctype": "HD Ticket",
                "name": doc.reference_name,
                "custom_agent": assigned_user
            }
        )

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "HD Ticket custom_agent sync failed"
        )
##############################################################################
# LMS_HOLIDAY_LIST

import frappe
from datetime import date, datetime, timedelta

HOLIDAY_LIST_NAME = "Holiday 2026"


# --------------------------------------------------
# UTIL: Normalize anything to datetime.date
# --------------------------------------------------
def to_date(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()

    return None


# --------------------------------------------------
# MAIN AGEING CALCULATION (NEW FLOW)
# --------------------------------------------------
def update_lms_ageing(doc):
    """
    FINAL RULE (NEW FLOW):

    Start Date  : lms_requested_date (Lastmile Services Master)
    End Date    :
        - Delivered   -> lms_delivery_date
        - All others  -> Today
    """

    # ---------------------------------------------
    # START DATE
    # ---------------------------------------------
    start_date = to_date(doc.lms_requested_date)
    if not start_date:
        doc.ageing = None
        return

    # ---------------------------------------------
    # END DATE
    # ---------------------------------------------
    if doc.lms_stage == "Delivered" and doc.lms_delivery_date:
        end_date = to_date(doc.lms_delivery_date)
    else:
        end_date = date.today()

    if not end_date:
        doc.ageing = None
        return

    # ---------------------------------------------
    # BUSINESS DAY CALCULATION
    # ---------------------------------------------
    holidays = get_holidays()
    doc.ageing = calculate_business_days(start_date, end_date, holidays)


# --------------------------------------------------
# FETCH HOLIDAYS
# --------------------------------------------------
def get_holidays():
    return {
        to_date(h.holiday_date)
        for h in frappe.get_all(
            "Holiday",
            filters={"parent": HOLIDAY_LIST_NAME},
            fields=["holiday_date"]
        )
        if h.holiday_date
    }


# --------------------------------------------------
# BUSINESS DAY CALCULATION
# --------------------------------------------------
def calculate_business_days(start_date, end_date, holidays):
    if start_date > end_date:
        return 0

    days = 0
    current = start_date

    while current <= end_date:
        weekday = current.weekday()  # Mon=0, Sun=6

        # ❌ Sunday
        if weekday == 6:
            current += timedelta(days=1)
            continue

        # ❌ 2nd & 4th Saturday
        if weekday == 5:
            week_of_month = (current.day - 1) // 7 + 1
            if week_of_month in (2, 4):
                current += timedelta(days=1)
                continue

        # ❌ Holiday
        if current in holidays:
            current += timedelta(days=1)
            continue

        # ✅ Working day
        days += 1
        current += timedelta(days=1)

    return days


# --------------------------------------------------
# DAILY SCHEDULER (SAFE)
# --------------------------------------------------
def recalculate_all_lms_ageing():
    """
    Runs daily via scheduler.
    Updates ONLY the ageing field.
    No validation issues.
    """

    records = frappe.get_all(
        "Lastmile Services Master",
        fields=["name"]
    )

    for r in records:
        doc = frappe.get_doc("Lastmile Services Master", r.name)
        update_lms_ageing(doc)

        frappe.db.set_value(
            "Lastmile Services Master",
            doc.name,
            "ageing",
            doc.ageing,
            update_modified=False
        )
#########################################################################
## Stop the bounce email to techsupport

import frappe
from email.utils import getaddresses

def block_techsupport_bounce_emails(doc, method):
    # 🟢 Step 1: Check if email is meant for Techsupport only
    recipients = []
    if doc.recipients:
        recipients = [email.lower() for _, email in getaddresses([doc.recipients])]

    is_techsupport = any(
        email.startswith("techsupport@") or email.startswith("techsupport+")
        for email in recipients
    )

    if not is_techsupport:
        # Allow other department emails
        return

    # 🟢 Step 2: Detect bounce emails
    bounce_senders = [
        "mailer-daemon",
        "postmaster",
        "mail delivery subsystem"
    ]

    bounce_keywords = [
        "undelivered mail returned to sender",
        "delivery failed",
        "email policy violation",
        "554 5.7.7",
        "permanent error",
        "could not be delivered"
    ]

    text = f"{doc.sender or ''} {doc.subject or ''} {doc.content or ''}".lower()

    if any(s in text for s in bounce_senders) or any(k in text for k in bounce_keywords):
        # 🔇 SILENT BLOCK ONLY FOR TECHSUPPORT
        doc.flags.ignore_permissions = True
        doc.flags.ignore_links = True
        doc.flags.ignore_mandatory = True

        doc.communication_type = "Ignored"
        doc.subject = "[IGNORED TECHSUPPORT BOUNCE EMAIL]"
        doc.content = ""

        frappe.logger().info(
            f"Techsupport bounce email blocked silently: {doc.sender}"
        )

        # ❌ Abort insert cleanly (no error)
        doc._cancel_insert = True
#################################################################################
# Purchase Order list Down - Supplier Advance

import frappe
from frappe import _

@frappe.whitelist()
def get_purchase_orders_by_supplier(supplier):
    """
    Fetch submitted Purchase Orders for a given supplier
    Used in Bank Reconciliation → Supplier Advance
    """

    if not supplier:
        return []

    return frappe.get_all(
        "Purchase Order",
        filters={
            "supplier": supplier,
            "docstatus": 1
        },
        fields=["name"],
        order_by="creation desc"
    )
##################################################################################
# Supplier Advance - Payment Entry    
@frappe.whitelist()
def create_supplier_advance_payment(
    supplier=None,
    amount=None,
    statement_entry=None,
    purchase_order=None,
    bank_account=None, # ⭐ Added
):

    if not supplier:
        frappe.throw("Supplier is required")

    if not amount:
        frappe.throw("Amount is required")

    if not statement_entry:
        frappe.throw("Bank Statement Entry missing")

    amount = float(amount)

    stmt = frappe.get_doc("Bank Statement Entry", statement_entry)

    # Company from Bank Account
    company = frappe.db.get_value("Bank Account", stmt.bank_account, "company")

    posting_date = stmt.transaction_date
    reference_no = stmt.description

    # Prioritize passed bank_account, then stmt.bank_account
    final_bank_account = bank_account or stmt.bank_account
    paid_from = get_bank_gl_account(final_bank_account)

    paid_to = frappe.db.get_value("Company", company, "default_payable_account")

    if not paid_from or not paid_to:
        frappe.throw("Bank or Payable account missing")

    payment_entry = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Pay",
        "mode_of_payment": "Wire Transfer",
        "company": company,
        "party_type": "Supplier",
        "party": supplier,
        "paid_amount": amount,
        "received_amount": amount,
        "posting_date": posting_date,
        "reference_no": reference_no,
        "reference_date": posting_date,
        "paid_from": paid_from,   # GL account
        "paid_to": paid_to,       # Payable account
        "bank_account": final_bank_account # ⭐ Set the Bank Account doc name
    })

    if purchase_order:
        payment_entry.append("references", {
            "reference_doctype": "Purchase Order",
            "reference_name": purchase_order,
            "allocated_amount": amount
        })

    payment_entry.insert(ignore_permissions=True)
    payment_entry.submit()

    frappe.db.set_value("Bank Statement Entry", stmt.name, {
        "reference_no": payment_entry.name,
        "reconciled": 1,
        "match_type": "Auto"
    })

    return {
        "status": "ok",
        "payment_entry": payment_entry.name
    }
###############################################################################
# Customer Advance
@frappe.whitelist()
def create_customer_advance_payment(
    customer=None,
    amount=None,
    statement_entry=None,
    sales_order=None,
    bank_account=None, # ⭐ Added
):

    if not customer:
        frappe.throw("Customer is required")

    if not amount:
        frappe.throw("Amount is required")

    stmt = frappe.get_doc("Bank Statement Entry", statement_entry)
    company = frappe.db.get_value("Bank Account", stmt.bank_account, "company")

    # Prioritize passed bank_account, then stmt.bank_account
    final_bank_account = bank_account or stmt.bank_account
    paid_to = get_bank_gl_account(final_bank_account)

    paid_from = frappe.db.get_value("Company", company, "default_receivable_account")

    pe = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "company": company,
        "party_type": "Customer",
        "party": customer,
        "paid_from": paid_from,
        "paid_to": paid_to,
        "paid_amount": float(amount),
        "received_amount": float(amount),
        "posting_date": stmt.transaction_date,
        "reference_no": stmt.description,
        "reference_date": stmt.transaction_date
    })

    if sales_order:
        pe.append("references", {
            "reference_doctype": "Sales Order",
            "reference_name": sales_order,
            "allocated_amount": float(amount)
        })

    pe.insert(ignore_permissions=True)
    pe.submit()

    # Update Bank Statement Entry
    frappe.db.set_value("Bank Statement Entry", statement_entry, {
        "reference_no": pe.name,
        "reconciled": 1,
        "match_type": "Auto"
    })

    return {
        "status": "ok",
        "payment_entry": pe.name
    }

##############################################################################
#Customer Advance - Sales Order Fetch
@frappe.whitelist()
def get_sales_orders_by_customer(customer):

    if not customer:
        return []

    return frappe.get_all(
        "Sales Order",
        filters={
            "customer": customer,
            "docstatus": 1
        },
        fields=["name"],
        order_by="creation desc"
    )
############################################################################
def set_industry_from_market_segment(doc, method):
    frappe.throw("HOOK RUNNING")

#############################################################################
import frappe
import json
from frappe.utils import get_url, nowdate

@frappe.whitelist()
def get_hd_tickets(
    page_length=20, 
    start=0, 
    search="", 
    view="All Tickets", 
    view_type="status", 
    customer="", 
    circuit_id="", 
    ticket_id="", 
    agent="",
    status="",
    stage="",
    priority="",
    channel="",
    severity="",
    created_from="",
    created_to="",
    closed_from="",
    closed_to="",
    onhold_from="",
    onhold_to=""
):
    page_length = int(page_length)
    start = int(start)

    filters = {}

    # ---------------------------
    # STATUS FILTER MAP
    # ---------------------------
    view_status_map = {
        "Open Tickets": "Open",
        "Replied Tickets": "Replied",
        "On Hold Tickets": "On Hold",
        "Wrong Tickets": "Wrong Circuit",
        "Resolved Tickets": "Resolved",
        "Closed Tickets": "Closed"
    }

    # ---------------------------
    # PRIORITY FILTER MAP
    # ---------------------------
    priority_map = {
        "Urgent": "Urgent",
        "High": "High",
        "Medium": "Medium",
        "Low": "Low"
    }
    
    # ---------------------------
    # SEVERITY FILTER MAP
    # ---------------------------
    severity_map = {
        "Critical": "Critical",
        "Major": "Major",
        "Minor": "Minor"
    }

    # ---------------------------
    # APPLY FILTER BASED ON TYPE
    # ---------------------------
    if view_type == "status":
        if view in view_status_map:
            filters["status"] = view_status_map[view]
        elif view in priority_map:
            filters["priority"] = priority_map[view]
        elif view in severity_map:
            filters["custom_severity"] = severity_map[view]

    elif view_type == "channel":
        filters["custom_channel"] = view

    elif view_type == "stage":
        filters["custom_stage"] = view

    # ---------------------------
    # CUSTOMER FILTER
    # ---------------------------
    if customer:
        filters["customer"] = customer
    
    # ---------------------------
    # CIRCUIT ID FILTER
    # ---------------------------
    if circuit_id:
        filters["custom_circuit_id"] = ["like", f"%{circuit_id}%"]
    
    # ---------------------------
    # TICKET ID FILTER
    # ---------------------------
    if ticket_id:
        filters["name"] = ["like", f"%{ticket_id}%"]
    
    # ---------------------------
    # STATUS FILTER (from sidebar) - handle multi-select
    # ---------------------------
    if status:
        if ',' in status:
            status_list = [s.strip() for s in status.split(',') if s.strip()]
            if status_list:
                filters["status"] = ["in", status_list]
        else:
            filters["status"] = status
    
    # ---------------------------
    # STAGE FILTER - handle multi-select
    # ---------------------------
    if stage:
        if ',' in stage:
            stage_list = [s.strip() for s in stage.split(',') if s.strip()]
            if stage_list:
                filters["custom_stage"] = ["in", stage_list]
        else:
            filters["custom_stage"] = stage
    
    # ---------------------------
    # PRIORITY FILTER - handle multi-select
    # ---------------------------
    if priority:
        if ',' in priority:
            priority_list = [p.strip() for p in priority.split(',') if p.strip()]
            if priority_list:
                filters["priority"] = ["in", priority_list]
        else:
            filters["priority"] = priority
    
    # ---------------------------
    # CHANNEL FILTER - handle multi-select
    # ---------------------------
    if channel:
        if ',' in channel:
            channel_list = [c.strip() for c in channel.split(',') if c.strip()]
            if channel_list:
                filters["custom_channel"] = ["in", channel_list]
        else:
            filters["custom_channel"] = channel
    
    # ---------------------------
    # SEVERITY FILTER - handle multi-select
    # ---------------------------
    if severity:
        if ',' in severity:
            severity_list = [s.strip() for s in severity.split(',') if s.strip()]
            if severity_list:
                filters["custom_severity"] = ["in", severity_list]
        else:
            filters["custom_severity"] = severity
    
    # ---------------------------
    # DATE RANGE FILTERS
    # ---------------------------
    if created_from:
        filters["creation"] = [">=", created_from + " 00:00:00"]
    
    if created_to:
        if "creation" in filters:
            filters["creation"] = ["between", [created_from + " 00:00:00", created_to + " 23:59:59"]]
        else:
            filters["creation"] = ["<=", created_to + " 23:59:59"]
    
    if closed_from or closed_to:
        # Assuming there's a custom_closed_datetime field
        if closed_from:
            filters["custom_closed_datetime"] = [">=", closed_from + " 00:00:00"]
        if closed_to:
            if "custom_closed_datetime" in filters:
                filters["custom_closed_datetime"] = ["between", [closed_from + " 00:00:00", closed_to + " 23:59:59"]]
            else:
                filters["custom_closed_datetime"] = ["<=", closed_to + " 23:59:59"]
    
    if onhold_from or onhold_to:
        # Assuming there's a custom_hold_datetime field
        if onhold_from:
            filters["custom_hold_datetime"] = [">=", onhold_from + " 00:00:00"]
        if onhold_to:
            if "custom_hold_datetime" in filters:
                filters["custom_hold_datetime"] = ["between", [onhold_from + " 00:00:00", onhold_to + " 23:59:59"]]
            else:
                filters["custom_hold_datetime"] = ["<=", onhold_to + " 23:59:59"]
    
    # ---------------------------
    # AGENT FILTER
    # ---------------------------
    if agent:
        # Get all tickets assigned to this agent
        assigned_tickets = frappe.get_all(
            "HD Ticket",
            filters={},
            fields=["name", "_assign"]
        )
        
        ticket_names = []
        for t in assigned_tickets:
            if t.get("_assign"):
                try:
                    assigned = json.loads(t["_assign"])
                    if assigned and agent in assigned:
                        ticket_names.append(t.name)
                except:
                    pass
        
        if ticket_names:
            filters["name"] = ["in", ticket_names]
        else:
            filters["name"] = ["in", []]

    # ---------------------------
    # SEARCH FILTER
    # ---------------------------
    if search:
        filters["subject"] = ["like", f"%{search}%"]

    # ---------------------------
    # FETCH TICKETS (Pagination Safe)
    # ---------------------------
    tickets = frappe.get_all(
        "HD Ticket",
        fields=[
            "name",
            "subject",
            "customer",
            "status",
            "priority",
            "resolution_by",
            "custom_stage",
            "custom_channel",
            "creation",
            "_assign",
            "custom_is_read",
            "custom_severity",
            "custom_circuit_id",
            "custom_impact",
            "custom_closed_datetime",
            "custom_hold_datetime"
        ],
        filters=filters,
        order_by="creation desc",
        start=start,
        limit_page_length=page_length
    )

    # ---------------------------
    # ASSIGNMENT PROCESSING
    # ---------------------------
    users = set()

    for t in tickets:
        t["custom_is_read"] = 1 if str(t.get("custom_is_read")) == "1" else 0

        if t.get("_assign"):
            try:
                assigned = json.loads(t["_assign"])
                if assigned:
                    t["assigned_to"] = assigned[0]
                    users.add(assigned[0])
                else:
                    t["assigned_to"] = ""
            except:
                t["assigned_to"] = ""
        else:
            t["assigned_to"] = ""

    # ---------------------------
    # USER IMAGE FETCH
    # ---------------------------
    user_images = {}

    if users:
        user_data = frappe.get_all(
            "User",
            filters={"name": ["in", list(users)]},
            fields=["name", "user_image"]
        )

        for u in user_data:
            img = u.user_image or ""
            if img and not img.startswith("http"):
                img = get_url(img)
            user_images[u.name] = img

    for t in tickets:
        t["user_image"] = user_images.get(t["assigned_to"], "")

    # ---------------------------
    # TOTAL COUNT
    # ---------------------------
    total_count = frappe.db.count("HD Ticket", filters=filters)

    return {
        "tickets": tickets,
        "count": total_count
    }


@frappe.whitelist()
def search_agents(text):
    """Search for agents/users"""
    if not text:
        return []
    
    users = frappe.get_all(
        "User",
        filters={
            "name": ["like", f"%{text}%"],
            "enabled": 1
        },
        fields=["name", "full_name", "user_image"],
        limit_page_length=10
    )
    
    result = []
    for user in users:
        result.append({
            "name": user.name,
            "full_name": user.get("full_name") or user.name,
            "user_image": user.get("user_image", "")
        })
    
    return result


@frappe.whitelist()
def get_customer_circuits(customer, search_text=""):
    """Get circuits for a specific customer"""
    filters = {
        "customer": customer
    }
    
    if search_text:
        filters["custom_circuit_id"] = ["like", f"%{search_text}%"]
    
    circuits = frappe.get_all(
        "HD Ticket",
        fields=["custom_circuit_id"],
        filters=filters,
        limit_page_length=20,
        order_by="custom_circuit_id asc"
    )
    
    # Get unique circuits
    unique_circuits = []
    seen = set()
    for c in circuits:
        if c.custom_circuit_id and c.custom_circuit_id not in seen:
            seen.add(c.custom_circuit_id)
            unique_circuits.append(c.custom_circuit_id)
    
    return unique_circuits


@frappe.whitelist()
def get_customer_tickets(customer, search_text=""):
    """Get tickets for a specific customer"""
    filters = {
        "customer": customer
    }
    
    if search_text:
        filters["name"] = ["like", f"%{search_text}%"]
    
    tickets = frappe.get_all(
        "HD Ticket",
        fields=["name"],
        filters=filters,
        limit_page_length=20,
        order_by="creation desc"
    )
    
    return [t.name for t in tickets]


@frappe.whitelist()
def get_customer_agents(customer, search_text=""):
    """Get agents for a specific customer"""
    # Get all tickets for this customer
    tickets = frappe.get_all(
        "HD Ticket",
        fields=["_assign"],
        filters={"customer": customer},
        limit_page_length=200
    )
    
    agents = set()
    for t in tickets:
        if t.get("_assign"):
            try:
                assigned = json.loads(t["_assign"])
                for agent in assigned:
                    agents.add(agent)
            except:
                pass
    
    # If search text, filter agents
    if search_text and agents:
        filtered_agents = []
        for agent in agents:
            if search_text.lower() in agent.lower():
                filtered_agents.append(agent)
        return filtered_agents
    
    return list(agents)


@frappe.whitelist()
def get_filter_options(filter_type):
    """Get options for various filter types"""
    options = {
        "status": ["Open", "Replied", "On Hold", "Wrong Circuit", "Resolved", "Closed"],
        "priority": ["Urgent", "High", "Medium", "Low"],
        "severity": ["Critical", "Major", "Minor"],
        "channel": ["Email", "Portal", "Chat", "Phone", "Web Form", "SSP", "NMS", "NMS-API"],
        "stage": [
            "Inprocess", "Finance Issue", "Customer Issue", "Hardware Dispatch",
            "MBB Issue", "LMS-Re-Feasibility", "Maintenance Visit", "Wrong Circuit",
            "Other", "Configuration Change", "Project"
        ]
    }
    
    return options.get(filter_type, [])
###################################################################################
# Cloud 2.0 ↔ ERPNext HD Ticket Integration

import frappe

@frappe.whitelist(allow_guest=True)
def create_hd_ticket(subject, message, circuit_id):
    ticket = frappe.get_doc({
        "doctype": "HD Ticket",
        "subject": subject,
        "description": message,
        "custom_circuit_id": circuit_id,
        "custom_channel": "NMS-API"
    }).insert(ignore_permissions=True)

    frappe.db.commit()

    return {"status": "success", "ticket_number": ticket.name}

###############################################################################
@frappe.whitelist()
def toggle_ticket_read_status(ticket_id):
    current = frappe.db.get_value("HD Ticket", ticket_id, "custom_is_read") or 0
    new_value = 0 if current else 1

    frappe.db.set_value("HD Ticket", ticket_id, "custom_is_read", new_value)
    frappe.db.commit()

    return new_value

######################################################################
# Solution Chnage
import frappe

def solution_change_update(doc, method):

    circuit_id = doc.circuit_id
    new_code = doc.new_solution_code
    new_name = doc.new_solution_name

    if not circuit_id or not new_code or not new_name:
        frappe.msgprint("Missing Circuit ID or Solution details.")
        return

    updates = 0

    # =====================================================
    # 1) SITE
    # circuit_id = name (Site)
    # =====================================================
    if frappe.db.exists("Site", circuit_id):
        frappe.db.set_value(
            "Site",
            circuit_id,
            {
                "solution_code": new_code,
                "solution_name": new_name
            }
        )
        updates += 1

    # =====================================================
    # 2) LASTMILE SERVICES MASTER
    # circuit_id = circuit_id
    # =====================================================
    lastmile_docs = frappe.get_all(
        "Lastmile Services Master",
        filters={"circuit_id": circuit_id},
        fields=["name"]
    )

    for lm in lastmile_docs:
        frappe.db.set_value(
            "Lastmile Services Master",
            lm.name,
            "solution",
            new_name
        )
        updates += 1

    # =====================================================
    # 3) SALES ORDER ITEM (Child table)
    # custom_feasibility = circuit_id
    # =====================================================
    sales_items = frappe.get_all(
        "Sales Order Item",
        filters={"custom_feasibility": circuit_id},
        fields=["name"]
    )

    for item in sales_items:
        frappe.db.set_value(
            "Sales Order Item",
            item.name,
            "custom_solution",
            new_code
        )
        updates += 1

    # =====================================================
    # 4) STOCK MANAGEMENT
    # circuit_id = circuit_id
    # =====================================================
    stock_docs = frappe.get_all(
        "Stock Management",
        filters={"circuit_id": circuit_id},
        fields=["name"]
    )

    for stock in stock_docs:
        frappe.db.set_value(
            "Stock Management",
            stock.name,
            {
                "solution_code": new_code,
                "solution": new_name
            }
        )
        updates += 1

    # =====================================================
    # 5) FEASIBILITY
    # circuit_id = name (Feasibility)
    # =====================================================
    if frappe.db.exists("Feasibility", circuit_id):
        frappe.db.set_value(
            "Feasibility",
            circuit_id,
            {
                "solution_code": new_code,
                "solution_name": new_name
            }
        )
        updates += 1

    # =====================================================
    # 6) PROVISIONING
    # circuit_id = circuit_id
    # Update solution_name + refresh open form
    # =====================================================
    provisioning_docs = frappe.get_all(
        "Provisioning",
        filters={"circuit_id": circuit_id},
        fields=["name"]
    )

    for prov in provisioning_docs:

        prov_doc = frappe.get_doc("Provisioning", prov.name)

        # Update field
        prov_doc.solution_name = new_name

        # Save to trigger Provisioning logic/workflows
        prov_doc.save(ignore_permissions=True)

        # 🔥 Refresh open form in browser
        prov_doc.notify_update()

        updates += 1

    # =====================================================
    # ✅ CONFIRMATION MESSAGE
    # =====================================================
    frappe.msgprint(
        f"""
        <b>Solution Updated Successfully</b><br><br>
        Circuit ID: <b>{circuit_id}</b><br>
        New Solution Code: <b>{new_code}</b><br>
        New Solution Name: <b>{new_name}</b><br><br>
        Records Updated: <b>{updates}</b>
        """
    )
############################################################################
# HD LMS Ticket Createing from HD Ticket

import frappe
import re


def create_lms_ticket(doc, method):

    # Avoid duplicate LMS ticket
    if frappe.db.exists("HD LMS Ticket", {"customer_ticket_id": doc.name}):
        return

    if not doc.custom_circuit_id:
        return

    # --------------------------------------------------
    # 🔎 Extract LMS ID from Subject
    # --------------------------------------------------
    lms_id_value = None

    if doc.subject:
        match = re.search(r'(ILL|MBB)_(\d{5,})', doc.subject)

        if match:
            extracted_number = match.group(2)

            # ✅ WITH SPACE AFTER LMS-
            lms_id_value = f"LMS- {extracted_number}"

    # --------------------------------------------------
    # 🆕 Create HD LMS Ticket
    # --------------------------------------------------
    lms = frappe.new_doc("HD LMS Ticket")

    lms.circuit_id = doc.custom_circuit_id
    lms.customer_ticket_id = doc.name

    if lms_id_value:
        lms.lms_id = lms_id_value

    lms.insert(ignore_permissions=True)

#################################################################################
# AI for Purchase Invoice Creation

import frappe
import fitz  # PyMuPDF
import requests
import json
import re
import difflib
from datetime import datetime


# =================================================
# 🔧 Helper: Normalize date to YYYY-MM-DD (ERPNext)
# =================================================
def normalize_date(date_str):
    if not date_str:
        return None

    # Initial cleanup: handle ISO T-format and remove commas/punctuation
    date_str = str(date_str).strip().split("T")[0]
    date_str = re.sub(r"[,;.]", " ", date_str).strip()
    # Normalize multiple spaces
    date_str = re.sub(r"\s+", " ", date_str)

    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y/%m/%d",
        "%d.%m.%Y",
        "%Y.%m.%d",
        "%d %b %Y",
        "%d %B %Y",
        "%b %d %Y",
        "%B %d %Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue

    return None


# =================================================
# 🔧 Helper: Safe float conversion
# =================================================
def safe_float(val):
    try:
        return float(val)
    except Exception:
        return 0.0


# =================================================
# 🔧 Helper: Get Prompt from AI Prompt Template
# =================================================
def get_ai_prompt(prompt_code):

    prompt = frappe.get_all(
        "AI Prompt Template",
        filters={
            "prompt_code": prompt_code,
            "active": 1
        },
        fields=["prompt_text"],
        limit=1
    )

    if not prompt:
        frappe.throw(f"Active AI Prompt not found for code: {prompt_code}")

    return prompt[0].prompt_text


# =================================================
# 🚀 UNIVERSAL AI CALLER — NO HARDCODE
# =================================================
def call_ai_model(prompt_text):

    # -------------------------------------------------
    # 🔎 Get active configuration from UI
    # -------------------------------------------------
    try:
        config = frappe.get_doc(
            "API Configuration",
            {"enable_ai_extraction": 1}
        )
    except Exception:
        frappe.throw("No active API Configuration found")

    url = config.api_base_url
    model = config.model_name
    temperature = config.temperature or 0
    max_tokens = config.max_tokens or 1200
    debug = config.debug_mode

    api_key = config.get_password("api_key")

    # ---------------- VALIDATION ----------------
    if not url:
        frappe.throw("API Base URL not configured")

    if not api_key:
        frappe.throw("API Key missing")

    if not model:
        frappe.throw("Model name not configured")

    # -------------------------------------------------
    # 🧠 Universal OpenAI-compatible headers
    # -------------------------------------------------
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # -------------------------------------------------
    # 🧠 Universal payload
    # -------------------------------------------------
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt_text}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    if debug:
        frappe.logger().info(f"AI URL: {url}")
        frappe.logger().info(f"AI Payload: {payload}")

    # -------------------------------------------------
    # 🚀 Call AI API
    # -------------------------------------------------
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=60)
    except requests.exceptions.Timeout:
        frappe.throw("The AI service took too long to respond. Please try again in a moment.")
    except Exception as e:
        frappe.throw("Could not connect to the AI service. Please check your network connection and try again.")

    if r.status_code == 429:
        frappe.throw(
            "The AI service is currently busy or your usage limit has been reached. "
            "Please wait a moment and try again, or contact your system administrator to review the API quota."
        )
    elif r.status_code == 401:
        frappe.throw(
            "The AI service rejected the request due to an invalid or expired API key. "
            "Please update the API key in the API Configuration settings."
        )
    elif r.status_code != 200:
        frappe.throw(
            f"The AI service returned an unexpected response (code {r.status_code}). "
            "Please try again or contact your system administrator if the issue persists."
        )

    data = r.json()

    # -------------------------------------------------
    # Universal response parsing
    # -------------------------------------------------
    try:
        return data["choices"][0]["message"]["content"]
    except Exception:
        frappe.throw(
            "The AI service returned an unrecognised response format. "
            "Please check the model configuration and try again."
        )


# =================================================
# 🚀 MAIN FUNCTION — PURCHASE INVOICE EXTRACTION
# =================================================
@frappe.whitelist()
def extract_purchase_invoice_from_data(file_url, prompt_code, po=None):

    if not file_url:
        frappe.throw("Please attach Supplier Invoice PDF")

    # -------------------------------------------------
    # 🔥 Load prompt from AI Prompt Template
    # -------------------------------------------------
    prompt = get_ai_prompt(prompt_code)

    # -------------------------------------------------
    # 1️⃣ Get file path
    # -------------------------------------------------
    try:
        file_doc = frappe.get_doc("File", {"file_url": file_url})
        file_path = file_doc.get_full_path()
    except Exception:
        frappe.throw("Could not find attached file")

    # -------------------------------------------------
    # 2️⃣ Extract text (FIRST 2 PAGES ONLY)
    # -------------------------------------------------
    text = ""

    try:
        pdf = fitz.open(file_path)

        for page in pdf[:2]:
            text += page.get_text()

        pdf.close()

    except Exception as e:
        frappe.throw(f"PDF read error: {str(e)}")

    if not text.strip():
        frappe.throw("Could not extract text from PDF")

    # ⭐ Trim text for speed
    text = text[:5000]

    # -------------------------------------------------
    # 3️⃣ Build AI Prompt
    # -------------------------------------------------
    full_prompt = f"""
{prompt}

STRICT INSTRUCTIONS:
Return ONLY valid JSON.
Do NOT include explanations.
Do NOT include markdown.
Do NOT include ```.

INVOICE TEXT:
{text}
"""

    # -------------------------------------------------
    # 4️⃣ Call AI
    # -------------------------------------------------
    ai_text = call_ai_model(full_prompt)

    if not ai_text:
        frappe.throw("AI returned empty response")

    # -------------------------------------------------
    # 5️⃣ Clean AI formatting
    # -------------------------------------------------
    cleaned = ai_text.strip()

    cleaned = re.sub(r"^```json", "", cleaned)
    cleaned = re.sub(r"^```", "", cleaned)
    cleaned = re.sub(r"```$", "", cleaned)

    cleaned = re.sub(r",\s*}", "}", cleaned)
    cleaned = re.sub(r",\s*]", "]", cleaned)

    # -------------------------------------------------
    # 6️⃣ Parse JSON safely
    # -------------------------------------------------
    try:
        data = json.loads(cleaned)
    except Exception:
        frappe.throw(f"AI did not return valid JSON:\n\n{cleaned}")

    # -------------------------------------------------
    # 7️⃣ Normalize & sanitize data
    # -------------------------------------------------

    # Normalize invoice date
    if "invoice_date" in data:
        normalized = normalize_date(data["invoice_date"])
        data["invoice_date"] = normalized if normalized else frappe.utils.today()

    # Convert total to float
    if "total" in data:
        data["total"] = safe_float(data.get("total"))

    # Cleanup: Company vs Customer
    # AI might return company, customer or neither. 
    # We want to favor any non-empty value found.
    extracted_company = data.get("company") or data.get("customer") or ""
    data["company"] = extracted_company
    if "customer" in data: data.pop("customer")

    # Map duration fields (handle potential AI key variants and DocType typo)
    for k in ["custom_duration_from", "custom_dutation_from", "from_date", "validity_from"]:
        if k in data and data[k]:
            data["custom_dutation_from"] = normalize_date(data[k])
            break
            
    for k in ["custom_duration_to", "to_date", "validity_to"]:
        if k in data and data[k]:
            data["custom_duration_to"] = normalize_date(data[k])
            break

    # If PO is provided, override LMS data from PO
    if po:
        try:
            po_doc = frappe.get_doc("Purchase Order", po)
            if po_doc.custom_lms_id:
                data["lms_id"] = po_doc.custom_lms_id
                # Also fetch circuit_id from LMS if possible
                if not data.get("circuit_id"):
                    data["circuit_id"] = frappe.db.get_value("Lastmile Services Master", po_doc.custom_lms_id, "circuit_id")
        except frappe.DoesNotExistError:
            frappe.logger().error(f"Purchase Order {po} not found during extraction")
            # Fallback: don't crash, just proceed with AI data
            pass
        except Exception as e:
            frappe.logger().error(f"Error fetching PO doc: {str(e)}")
            pass

    # Clean items
    if "items" not in data or not isinstance(data["items"], list):
        data["items"] = []
    else:
        cleaned_items = []
        for item in data["items"]:
            cleaned_items.append({
                "description": item.get("description") if isinstance(item, dict) else "",
                "qty": safe_float(item.get("qty")) if isinstance(item, dict) else 1,
                "rate": safe_float(item.get("rate")) if isinstance(item, dict) else 0,
            })
        data["items"] = cleaned_items

    # Clean taxes
    if "taxes" not in data or not isinstance(data["taxes"], list):
        data["taxes"] = []
    else:
        cleaned_taxes = []
        for tax in data["taxes"]:
            cleaned_taxes.append({
                "account_head": tax.get("account_head") if isinstance(tax, dict) else "",
                "description": tax.get("description") if isinstance(tax, dict) else "Tax",
                "rate": safe_float(tax.get("rate")) if isinstance(tax, dict) else 0,
                "tax_amount": safe_float(tax.get("tax_amount")) if isinstance(tax, dict) else 0,
            })
        data["taxes"] = cleaned_taxes

    # -------------------------------------------------
    # 🔟 Return clean JSON string
    # -------------------------------------------------
    return json.dumps(data)
###############################################################################
#ai for Purchase Invoice - Matching Company
@frappe.whitelist()
def match_company(name):
    """
    Carefully match a company name to an existing Company record.
    Includes suffix cleaning, word-by-word matching, and fuzzy matching.
    """
    if not name:
        return None
        
    name_str = str(name).strip()
    # Clean common suffixes like "Private Limited", "Pvt Ltd", etc.
    clean_regexp = r"(?i)\b(pvt\.?\s+ltd\.?|p\s+ltd\.?|ltd\.?|private\s+limited|limited|corporation|inc\.?|solutions|llp|group|enterprises|systems|services)\b"
    clean_name = re.sub(clean_regexp, "", name_str).strip()

    # 1. Exact Match (case-insensitive)
    for target in [name_str, clean_name]:
        if not target: continue
        c = frappe.db.get_value("Company", {"company_name": ["like", f"%{target}%"]}, "name")
        if not c: c = frappe.db.get_value("Company", {"name": ["like", f"%{target}%"]}, "name")
        if c: return c
    
    # 2. Fetch all companies for advanced matching
    companies = frappe.get_all("Company", fields=["name", "company_name"])
    name_map = {}
    for comp in companies:
        name_map[comp.name.lower()] = comp.name
        if comp.company_name:
            name_map[comp.company_name.lower()] = comp.name
            
    all_targets = list(name_map.keys())
    
    # 3. Substring Match (Case-insensitive)
    for target in [name_str.lower(), clean_name.lower()]:
        if not target: continue
        for t in all_targets:
            if len(target) > 3 and (target in t or t in target):
                return name_map[t]

    # 4. Fuzzy match original and clean name
    for target in [name_str.lower(), clean_name.lower()]:
        if not target: continue
        matches = difflib.get_close_matches(target, all_targets, n=1, cutoff=0.5)
        if matches: return name_map[matches[0]]
        
    # 5. Word-by-word fallback
    # Filter out common small words
    stop_words = {"and", "the", "of", "for", "in", "on", "at", "by"}
    words = [w.lower() for w in clean_name.split() if len(w) > 2 and w.lower() not in stop_words]
    
    if words:
        for t in all_targets:
            # Check if any significant word from extracted name matches a significant word in target
            t_words = set(t.split())
            if any(w in t_words for w in words):
                return name_map[t]

    return None
############################################################################
# Covert POC To Paid
import frappe


def update_feasibility_and_site_on_so_save(doc, method):

    if not doc.items:
        return

    updated_records = []

    for item in doc.items:

        ref_name = item.custom_feasibility

        if not ref_name:
            continue

        # -------------------------------
        # Update Feasibility
        # -------------------------------
        if frappe.db.exists("Feasibility", ref_name):

            frappe.db.set_value(
                "Feasibility",
                ref_name,
                {
                    "customer_type": "Paid Customer",
                    "sales_order": doc.name,
                    "sales_order_date": doc.transaction_date
                }
            )

            updated_records.append(f"Feasibility: {ref_name}")

        # -------------------------------
        # Update Site
        # -------------------------------
        if frappe.db.exists("Site", ref_name):

            frappe.db.set_value(
                "Site",
                ref_name,
                {
                    "customer_type": "Paid Customer",
                    "sales_order": doc.name,
                    "sales_order_date": doc.transaction_date,
                    "customer_po_no": doc.po_no,
                    "customer_po_date": doc.po_date,
                    "po_end_date": doc.custom_po_end_date
                }
            )

            updated_records.append(f"Site: {ref_name}")

    if updated_records:
        frappe.msgprint(
            "Updated records:<br><b>" + "<br>".join(updated_records) + "</b>"
        )
#################################################################################
# Updateing Billing status to 'Circuit Delivery Backdate' and 'Site

import frappe


def update_billing_status_from_invoice(doc, method=None):

    # Loop through Sales Invoice Items (child table)
    for item in doc.items:

        # Skip if no Sales Order Item link
        if not item.so_detail:
            continue

        # Get custom_feasibility from Sales Order Item
        circuit_id = frappe.db.get_value(
            "Sales Order Item",
            item.so_detail,
            "custom_feasibility"
        )

        if not circuit_id:
            continue

        # ------------------------------------
        # Update Circuit Delivery Backdate
        # ------------------------------------
        backdate_records = frappe.get_all(
            "Circuit Delivery Backdate",
            filters={"circuit_id": circuit_id},
            fields=["name"]
        )

        for row in backdate_records:
            frappe.db.set_value(
                "Circuit Delivery Backdate",
                row.name,
                "billing_status",
                "Billed"
            )

        # ------------------------------------
        # Update Site
        # ------------------------------------
        if frappe.db.exists("Site", circuit_id):
            frappe.db.set_value(
                "Site",
                circuit_id,
                "billing_status",
                "Billed"
            )
##################################################################################
# Updateing the HD Ticket From Task

import frappe
from frappe.utils import now_datetime

def update_hd_ticket_from_task(doc, method=None):

    # Find HD Ticket linked to this Task
    hd_ticket = frappe.db.get_value(
        "HD Ticket",
        {"custom_task": doc.name},
        "name"
    )

    if not hd_ticket:
        return

    # If Task status = Rejected
    if doc.status == "Rejected":

        frappe.db.set_value(
            "HD Ticket",
            hd_ticket,
            {
                "custom_task_status": doc.status,
                "custom_rejected_reason": doc.custom_rejected_reason,
                "custom_rejected_datetime": now_datetime()
            }
        )

    # If Task status = Completed
    elif doc.status == "Completed":

        frappe.db.set_value(
            "HD Ticket",
            hd_ticket,
            {
                "custom_task_status": doc.status,
                "custom_task_closed_datetime": doc.completed_on,
                "custom_completed_by_name": doc.custom_completed_by_name
            }
        )

    # If Task status NOT Rejected or Completed
    else:

        frappe.db.set_value(
            "HD Ticket",
            hd_ticket,
            {
                "custom_task_status": doc.status
            }
        )

####################################################################################
# AI chat user 

@frappe.whitelist()
def get_user_first_name():
    user = frappe.session.user
    user_doc = frappe.get_doc("User", user)

    if user_doc.first_name:
        return user_doc.first_name

    if user_doc.full_name:
        return user_doc.full_name.split(" ")[0]

    return "User"
#####################################################################################    

# AI Chatbot for HD Ticket

import frappe
import json
import datetime as dt
import difflib

# No top-level FAISS import – lazy import in the endpoint

# ---------------------------------------------------------
# FEATURE FLAG
# ---------------------------------------------------------
def is_faiss_enabled():
    return frappe.conf.get("enable_faiss_ai", 0)

@frappe.whitelist()
def is_chatbot_enabled():
    try:
        active = frappe.db.get_value(
            "AI Prompt Template",
            {"prompt_code": "HD_TICKET_CHAT"},
            "active"
        )
        return 1 if active else 0
    except Exception:
        return 0

# ---------------------------------------------------------
# MEMORY (per user + ticket)
# ---------------------------------------------------------
def get_memory_limit():
    try:
        config = frappe.get_single("API Configuration")
        return int(config.memory_limit or 10)
    except Exception:
        return 10

def get_user_memory(user, ticket):
    key = f"chat_memory:{user}:{ticket}"
    return frappe.cache().get_value(key) or []

def set_user_memory(user, ticket, memory):
    key = f"chat_memory:{user}:{ticket}"
    frappe.cache().set_value(key, memory)

def clear_user_memory(user, ticket):
    key = f"chat_memory:{user}:{ticket}"
    frappe.cache().delete_value(key)

def update_memory(user, ticket, question, answer):
    memory = get_user_memory(user, ticket)
    memory.append({"question": question, "answer": answer})
    limit = get_memory_limit()
    memory = memory[-limit:]
    set_user_memory(user, ticket, memory)

def build_memory_context(user, ticket):
    memory = get_user_memory(user, ticket)
    context = ""
    for m in memory:
        context += f"User: {m['question']}\n"
        context += f"Assistant: {m['answer']}\n"
    return context

# ---------------------------------------------------------
# FIELD LABEL MAP & HELPER FUNCTIONS
# ---------------------------------------------------------
FIELD_LABEL_MAP = {
    "name": "ID",
    "subject": "Subject",
    "status": "Status",
    "priority": "Priority",
    "customer": "Customer",
    "custom_circuit_id": "Circuit ID",
    "custom_stage": "Stage",
    "custom_sub_stage": "Sub Stage",
    "custom_solution_name": "Solution Name",
    "site_status": "Site Status",
    "custom_lms_ticket_status": "LMS Ticket Status",
    "lms_stage": "LMS Stage",
}

STOP_WORDS = {
    "what","is","the","of","a","an","please","give","show","tell","me","about"
}

def normalize_word(word):
    word = word.lower()
    replacements = {
        "natted": "nat",
        "nated": "nat",
        "natting": "nat",
    }
    return replacements.get(word, word)

def format_value(value):
    if isinstance(value, dt.datetime):
        return value.strftime("%d-%m-%Y %H:%M")
    if isinstance(value, dt.date):
        return value.strftime("%d-%m-%Y")
    return value

def get_doc_label_map(doctype):
    """Dynamically get the label map for a doctype."""
    meta = frappe.get_meta(doctype)
    label_map = FIELD_LABEL_MAP.copy()
    for f in meta.fields:
        if f.label:
            label_map[f.fieldname] = f.label
    return label_map

def identify_entity(question):
    """Identifies target entity from question keywords."""
    q = question.lower()
    if any(k in q for k in ["site", "address", "location", "customer type", "lms type"]):
        return "Site"
    if any(k in q for k in ["lms", "supplier", "lastmile", "escalation", "contact"]):
        return "Lastmile Services Master"
    if any(k in q for k in ["provisioning", "ip address", "router ip"]):
        return "Provisioning"
    if any(k in q for k in ["installation", "installed", "engineer visit"]):
        return "Installation Master"
    return None

def get_clean_doc_data(doc):
    """Enhanced version: uses metadata-based labels and includes child table data."""
    label_map = get_doc_label_map(doc.doctype)
    exclude_fields = [
        "owner","creation","modified","modified_by",
        "docstatus","idx","_comments","_assign",
        "_liked_by","_seen","_user_tags","__unsaved",
        "doctype"
    ]
    data = {}
    
    # Process main fields
    for field, value in doc.as_dict().items():
        if field in exclude_fields or value in [None, "", []]:
            continue
            
        if field not in label_map and not field == "name":
            continue
            
        label = label_map.get(field, field.replace('_', ' ').title())
        
        # Format values
        if isinstance(value, (dt.datetime, dt.date)):
            value = format_value(value)
        elif isinstance(value, str) and ("<" in value and ">" in value):
            value = frappe.utils.strip_html_tags(value)
            
        data[label] = value

    # Process child tables
    meta = frappe.get_meta(doc.doctype)
    for f in meta.fields:
        if f.fieldtype == "Table":
            child_docs = doc.get(f.fieldname)
            if child_docs:
                child_label = f.label or f.fieldname.replace('_', ' ').title()
                table_data = []
                for child in child_docs:
                    # Use get_clean_doc_data recursively but without deep nesting for efficiency
                    # Just get simple labeled dict for child
                    child_label_map = get_doc_label_map(child.doctype)
                    child_dict = {}
                    for cf, cv in child.as_dict().items():
                        if cf in exclude_fields or cv in [None, "", []]: continue
                        clabel = child_label_map.get(cf, cf.replace('_', ' ').title())
                        child_dict[clabel] = format_value(cv) if isinstance(cv, (dt.date, dt.datetime)) else cv
                    table_data.append(child_dict)
                
                if table_data:
                    data[child_label] = table_data
        
    return data

# ---------------------------------------------------------
# IMPROVED FIELD MATCHING (with synonyms)
# ---------------------------------------------------------
def search_field_answer(doc, question):
    meta = frappe.get_meta(doc.doctype)
    q_lower = question.lower().strip()

    # Synonym mapping
    synonyms = {
        "agent": ["assigned to", "owner", "support agent", "technician"],
        "address": ["address", "location", "site address", "street", "city", "district", "pin code"],
        "impact": ["impact", "severity", "business impact"],
        "stage": ["stage", "status", "state"],
        "installation": ["installation", "activation", "commissioning"],
        "completion": ["completion", "done", "finished", "closed"],
        "escalation": ["escalation matrix", "matrix", "escalation level", "support levels", "contact", "support info", "lms contact"],
        "contact": ["escalation matrix", "matrix", "support info", "support person"]
    }

    def get_label_words(label):
        words = [normalize_word(w) for w in label.split()]
        extra = []
        for w in words:
            for key, syns in synonyms.items():
                if w in syns or w == key:
                    extra.extend(syns)
        return set(words + extra)

    best_match = None
    best_score = 0

    for field in meta.fields:
        label_original = field.label or ""
        if not label_original:
            continue

        label = label_original.lower().strip()
        label_words = get_label_words(label)
        value = doc.get(field.fieldname)

        # Skip empty values unless we are certain
        if value in [None, "", []] and field.fieldtype not in ("Select", "Data", "Link", "Table"):
            continue

        score = 0
        # Label in Question (Phrase Match)
        if label in q_lower:
            # Score based on number of words in the match - favors more specific labels
            # Boost for phrase match significantly
            score += len(label.split()) * 15
        
        # Word overlap (catch-all for jumbled words)
        q_words = set(normalize_word(w) for w in q_lower.split())
        overlap = len(q_words & label_words)
        score += overlap * 2

        # Boost for priority fields
        priority_fields = ["address", "agent", "status", "stage", "impact", "customer type", "escalation"]
        if any(p in label for p in priority_fields):
            score += 2

        if score > best_score:
            best_score = score
            best_match = (label_original, value, field)
        elif score == best_score and best_match:
            # Tie-breaker: prefer longer labels (more specific)
            if len(label_original) > len(best_match[0]):
                best_match = (label_original, value, field)

    if best_match and best_score >= 2:
        label, value, field = best_match
        if value in [None, "", []]:
            return best_score, f"There is no <b>{label}</b>"
            
        # Handle child tables (e.g. Escalation Matrix)
        if field.fieldtype == "Table" and isinstance(value, list) and len(value) > 0:
            header = f"<b>{label}</b>"
            supplier = doc.get("supplier")
            if supplier:
                header += f" for <b>{supplier}</b>"
            
            rows_html = []
            for row in value:
                row_dict = row.as_dict()
                parts = []
                # Map common child fields to readable labels
                field_map = [
                    ("level", "Level"),
                    ("link_zitr", "Name"),
                    ("contact_phone", "Phone"),
                    ("link_syot", "Email"),
                    ("designation", "Designation")
                ]
                for fname, flabel in field_map:
                    v = row_dict.get(fname)
                    if v:
                        parts.append(f"{flabel}: {v}")
                if parts:
                    rows_html.append(" • " + ", ".join(parts))
            
            if rows_html:
                return best_score, f"{header}:<br>" + "<br>".join(rows_html)

        return best_score, f"{label}: <b>{format_value(value)}</b>"

    return 0, None

def get_logged_user_info():
    user = frappe.session.user
    user_doc = frappe.get_doc("User", user)
    return f"""
<b>User Information</b><br><br>
First Name: <b>{user_doc.first_name or ""}</b><br>
Full Name: <b>{user_doc.full_name or ""}</b><br>
Login Email: <b>{user_doc.name}</b>
"""

def create_finance_issue_task(ticket):
    task = frappe.new_doc("Task")
    task.type = "Finance Issue"
    task.subject = "Finance Issue Task"
    task.insert(ignore_permissions=True)
    return {"task": task.name, "message": f"Task {task.name} created (Finance Issue)"}

def create_hardware_dispatch_task(ticket):
    task = frappe.new_doc("Task")
    task.type = "Hardware Dispatch"
    task.subject = "Hardware Dispatch Task"
    task.insert(ignore_permissions=True)
    return {"task": task.name, "message": f"Task {task.name} created (Hardware Dispatch)"}

# ---------------------------------------------------------
# DYNAMIC REPORT FOR CLOSED TICKETS
# ---------------------------------------------------------
@frappe.whitelist()
def get_filtered_closed_tickets(filters=None, current_ticket=None):
    if isinstance(filters, str):
        try:
            filters = json.loads(filters)
        except:
            filters = {}
    elif not filters:
        filters = {}
    
    query_filters = {"status": "Closed"}
    limit = None
    
    # Handle History Request
    if filters.get("is_history") and current_ticket:
        circuit_id = frappe.db.get_value("HD Ticket", current_ticket, "custom_circuit_id")
        if circuit_id:
            query_filters["custom_circuit_id"] = circuit_id
            limit = 10 # Last 10 as requested
    else:
        # Standard filter logic
        if filters.get("customer"):
            query_filters["customer"] = ["LIKE", f"%{filters['customer']}%"]
        
        from_date = filters.get("from_date")
        to_date = filters.get("to_date")
        months = filters.get("months")
        specific_month = filters.get("specific_month")
        
        if from_date and to_date:
            query_filters["custom_close_datetime"] = ["between", [from_date, to_date]]
        elif from_date:
            query_filters["custom_close_datetime"] = [">=", from_date]
        elif to_date:
            query_filters["custom_close_datetime"] = ["<=", to_date]
        elif months:
            try:
                start_date = dt.datetime.now() - dt.timedelta(days=int(months)*30)
                query_filters["custom_close_datetime"] = [">=", start_date]
            except: pass
        elif specific_month:
            try:
                now = dt.datetime.now()
                m_names = ["january", "february", "march", "april", "may", "june", 
                           "july", "august", "september", "october", "november", "december"]
                m_idx = -1
                sm = specific_month.lower()
                for i, name in enumerate(m_names):
                    if name in sm:
                        m_idx = i + 1
                        break
                
                if m_idx != -1:
                    year = now.year
                    if m_idx > now.month:
                        year -= 1
                    
                    import calendar
                    last_day = calendar.monthrange(year, m_idx)[1]
                    m_start = dt.datetime(year, m_idx, 1)
                    m_end = dt.datetime(year, m_idx, last_day, 23, 59, 59)
                    query_filters["custom_close_datetime"] = ["between", [m_start, m_end]]
            except: pass
        
        # If no date filter provided, default to last 3 months
        if "custom_close_datetime" not in query_filters:
             start_date = dt.datetime.now() - dt.timedelta(days=90)
             query_filters["custom_close_datetime"] = [">=", start_date]

    fields = [
        "name", "customer", 
        "custom_agent", "custom_channel", "custom_close_datetime", "agreement_status", "custom_rca"
    ]
    
    tickets = frappe.get_all("HD Ticket", filters=query_filters, fields=fields, order_by="custom_close_datetime desc", limit=limit)
    
    # Format date fields
    for t in tickets:
        if t.get("custom_close_datetime"):
            t["custom_close_datetime"] = format_value(t["custom_close_datetime"])

    labels = {
        "name": "Ticket No",
        "customer": "Customer",
        "custom_agent": "Agent",
        "custom_channel": "Channel",
        "custom_close_datetime": "Closed Datetime",
        "agreement_status": "SLA Status",
        "custom_rca": "RCA"
    }
    
    return {"tickets": tickets, "labels": labels}

@frappe.whitelist()
def download_closed_tickets_csv(filters=None, current_ticket=None):
    res = get_filtered_closed_tickets(filters, current_ticket)
    tickets = res["tickets"]
    labels = res["labels"]
    
    from frappe.utils.xlsxutils import make_xlsx
    
    # Prepare rows for XLSX
    header = list(labels.values())
    rows = [header]
    
    for t in tickets:
        row = []
        for key in labels.keys():
            val = t.get(key)
            if isinstance(val, (dt.datetime, dt.date)):
                val = val.strftime("%d-%m-%Y %H:%M")
            row.append(val or "")
        rows.append(row)
    
    xlsx_data = make_xlsx(rows, "Closed Tickets Report")
    
    filename = f"Closed_Tickets_{dt.datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    
    frappe.response['filename'] = filename
    frappe.response['filecontent'] = xlsx_data.getvalue()
    frappe.response['type'] = 'binary'

# ---------------------------------------------------------
# AI MODEL CALL USING API CONFIGURATION DOCTYPE
# ---------------------------------------------------------
def call_ai_model(prompt):
    try:
        config_name = frappe.db.get_value("API Configuration", None, "name")
        if not config_name:
            return "API Configuration not found. Please set up API Configuration."

        config = frappe.get_doc("API Configuration", config_name)

        # Assuming fieldnames: api_key (Password), model_name, api_base_url, temperature, max_tokens
        api_key = config.get_password("api_key")
        model_name = config.model_name
        api_base_url = config.api_base_url
        temperature = config.temperature or 0.7
        max_tokens = config.max_tokens or 500

        if not api_key or not model_name or not api_base_url:
            return "Incomplete API Configuration. Please check API Key, Model Name, and Base URL."

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        response = requests.post(api_base_url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()

        result = response.json()
        if "choices" in result and len(result["choices"]) > 0:
            return result["choices"][0]["message"]["content"]
        elif "response" in result:
            return result["response"]
        else:
            return "Unexpected API response format."

    except requests.exceptions.RequestException as e:
        frappe.log_error(f"API request failed: {str(e)}", "AI Model Call")
        return f"Error calling AI model: {str(e)}"
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "AI Model Call")
        return f"Unexpected error: {str(e)}"

# ---------------------------------------------------------
# MAIN CHAT ENDPOINT
# ---------------------------------------------------------
@frappe.whitelist()
def hd_ticket_ai_chat(ticket, question):
    frappe.flags.mute_messages = True

    if not ticket or not question:
        return "Please provide both ticket and question."

    q_lower = question.strip().lower()
    user = frappe.session.user

    # Clear memory
    if q_lower.strip() in ["clear", "clear memory"]:
        clear_user_memory(user, ticket)
        return "✅ Memory cleared. Starting fresh."

    # Task creation flow (unchanged)
    task_state_key = f"hd_ai_task_state_{user}_{ticket}"
    waiting = frappe.cache().get_value(task_state_key)

    if waiting and (q_lower == "1" or "finance" in q_lower):
        frappe.cache().delete_value(task_state_key)
        result = create_finance_issue_task(ticket)
        return f"✅ {result['message']}<br>Task ID: <b>{result['task']}</b>"

    if waiting and (q_lower == "2" or "hardware" in q_lower):
        frappe.cache().delete_value(task_state_key)
        result = create_hardware_dispatch_task(ticket)
        return f"✅ {result['message']}<br>Task ID: <b>{result['task']}</b>"

    if "create task" in q_lower:
        frappe.cache().set_value(task_state_key, True, expires_in_sec=300)
        return (
            "Which task do you want to create?<br><br>"
            "<b>1.</b> Finance Issue<br>"
            "<b>2.</b> Hardware Dispatch Request<br><br>"
            "Reply with <b>1</b> or <b>2</b>"
        )

    # DYNAMIC REPORT INTENT DETECTION (More flexible keywords)
    report_keywords = [
        "closed ticket", "report", "tickets last", "tickets for", "tickets from", 
        "list of", "closed tickets", "tickets report", "fetch", "show me", "give me tickets",
        "history"
    ]
    is_report_query = any(k in q_lower for k in report_keywords)
    
    if is_report_query:
        # Augment prompt with examples for better NLU
        report_extra = """
If the user is asking for a list, history, or report of closed tickets, you MUST respond in this format:
ACTION:REPORT|{"months": 3, "customer": null, "specific_month": null, "from_date": null, "to_date": null, "is_history": false}

IMPORTANT: Even if the user's phrasing is informal or has poor grammar (e.g., "tickets march", "customer x list", "3 month closed", "history of this ticket"), you must identify the intent and extract the parameters:
- "tickets march" -> specific_month: "March", is_history: false
- "customer x report" -> customer: "Customer X", is_history: false
- "give me 6 month" -> months: 6, is_history: false
- "history of this ticket" or "show history" -> is_history: true
- "from jan to feb" -> from_date: "2024-01-01", to_date: "2024-02-29", is_history: false

Do not return any other text, just the ACTION:REPORT line.
"""
    else:
        report_extra = ""

    if "my name" in q_lower:
        return get_logged_user_info()

    # Get ticket
    ticket_doc = frappe.get_doc("HD Ticket", ticket)
    circuit_id = ticket_doc.custom_circuit_id

    # Smart Context Building
    # We will build context from multiple linked entities if circuit_id exists
    context_data = {"ticket_details": get_clean_doc_data(ticket_doc)}
    entities_found = []

    if circuit_id and not is_report_query:
        # Define field map for related entities
        ENTITY_FIELD_MAP = {
            "Site": "circuit_id",
            "Lastmile Services Master": "circuit_id",
            "Provisioning": "circuit_id",
            "Installation Master": "circuit_id"
        }

        # Targeted Field Search (across all entities)
        best_match_answer = None
        best_match_score = 0
        
        # Check the Ticket itself first
        t_score, ticket_answer = search_field_answer(ticket_doc, question)
        if ticket_answer:
            best_match_answer = ticket_answer
            best_match_score = t_score
            
        # Check all related entities
        related_docs = {} 
        for doctype, field_map in ENTITY_FIELD_MAP.items():
            docname = frappe.db.get_value(doctype, {field_map: circuit_id}, "name")
            if docname:
                doc = frappe.get_doc(doctype, docname)
                related_docs[doctype] = doc
                
                # Run matching on this doc
                e_score, entity_answer = search_field_answer(doc, question)
                if entity_answer:
                    # If this is a very strong match (phrase match for 1+ words), and user specifically 
                    # mentions the entity or it beats the previous best score.
                    target_entity = identify_entity(question)
                    
                    if target_entity == doctype and e_score >= 15:
                        return entity_answer
                    
                    if e_score > best_match_score:
                        best_match_answer = entity_answer
                        best_match_score = e_score
                    elif e_score == best_match_score and best_match_answer:
                         # Tie-breaker: prefer anything other than Ticket if scores are equal
                         best_match_answer = entity_answer

        if best_match_answer:
            return best_match_answer

        # If no direct match found, build context for AI for those found entities
        for doctype, doc in related_docs.items():
            context_data[doctype] = get_clean_doc_data(doc)
            entities_found.append(doctype)
    elif circuit_id and is_report_query:
        # Build minimal context for report if needed, but the report logic handles it
        pass

    # Priority 2: FAISS (if no target identified or as fallback)
    if not entities_found and is_faiss_enabled() and not is_report_query:
        try:
            from nexapp.ai.faiss_engine import faiss_search, fetch_data_by_circuit
            items = faiss_search(question, top_k=3) 
            
            # Fetch data and ensure it's labeled
            faiss_data = fetch_data_by_circuit(circuit_id, items)
            
            # Convert raw fieldnames to labels in FAISS data
            for dtype, ddata in faiss_data.items():
                if dtype in entities_found: continue
                label_map = get_doc_label_map(dtype)
                labeled_ddata = {}
                for f, v in ddata.items():
                    label = label_map.get(f, f.replace('_', ' ').title())
                    labeled_ddata[label] = v
                context_data[dtype] = labeled_ddata
                entities_found.append(dtype)
                
        except Exception as e:
            frappe.log_error(f"FAISS Context Error: {str(e)}", "AI Chat")

        # Fallback: Minimum context if nothing found (Site is often needed)
        if not entities_found:
             docname = frappe.db.get_value("Site", {"circuit_id": circuit_id}, "name")
             if docname:
                 doc = frappe.get_doc("Site", docname)
                 context_data["Site"] = get_clean_doc_data(doc)

    # Prompt template
    prompt_text = frappe.db.get_value(
        "AI Prompt Template",
        {"prompt_code": "HD_TICKET_CHAT"},
        "prompt_text"
    )
    if not prompt_text:
        prompt_text = (
            "You are an AI assistant for helpdesk tickets. "
            "Answer the user's question based on the provided context. "
            "Use a friendly tone and format with HTML <b> and <br> where appropriate."
        )

    # Build memory context (per ticket)
    memory_context = build_memory_context(user, ticket)

    full_prompt = f"""
{prompt_text}
{report_extra}

CONVERSATION HISTORY:
{memory_context}

CONTEXT:
{json.dumps(context_data, default=str, indent=2)}

QUESTION:
{question}
"""

    # Call AI model
    response = call_ai_model(full_prompt)

    # HANDLING REPORT ACTION
    if "ACTION:REPORT|" in response:
        try:
            parts = response.split("ACTION:REPORT|")
            report_json = parts[1].strip()
            # Just return a trigger for the frontend
            return f'<div class="hd-ai-report-trigger" data-filters=\'{report_json}\'>' \
                   f'I can generate a report for the closed tickets you requested.<br>' \
                   f'<button class="hd-ai-report-btn">View Report</button></div>'
        except:
            pass

    # Clean up response
    response = response.replace("**", "").replace("###", "")
    response = response.replace("\\n", "<br>").replace("\n", "<br>")

    if not response or response.strip() == "":
        response = "I'm sorry, I couldn't find an answer to your question."

    update_memory(user, ticket, question, response)

    return response
############################################################################
# Unallocated PAge
import frappe

# ======================================================
# UNALLOCATED RECONCILIATION PAGE METHODS
# ======================================================

@frappe.whitelist()
def get_unallocated_payment_entries(company=None, from_date=None, to_date=None, party=None):
    """
    Returns a list of Payment Entries with unallocated_amount > 0.
    Filters by company, date range and optional party.
    """
    filters = {
        "unallocated_amount": [">", 0],
        "docstatus": 1
    }
    if company:
        filters["company"] = company
    if from_date:
        filters["posting_date"] = [">=", from_date]
    if to_date:
        if "posting_date" in filters:
            filters["posting_date"] = ["between", [from_date, to_date]]
        else:
            filters["posting_date"] = ["<=", to_date]
    if party:
        filters["party"] = party

    fields = ["name", "posting_date", "party", "party_type", "reference_no", "unallocated_amount"]
    entries = frappe.get_list("Payment Entry", filters=filters, fields=fields, order_by="posting_date desc")
    return entries


@frappe.whitelist()
def get_unallocated_parties(company=None, from_date=None, to_date=None):
    """
    Returns a list of distinct party names from Payment Entries
    that have unallocated_amount > 0 and match the filters.
    """
    filters = {
        "unallocated_amount": [">", 0],
        "docstatus": 1
    }
    if company:
        filters["company"] = company
    if from_date:
        filters["posting_date"] = [">=", from_date]
    if to_date:
        if "posting_date" in filters:
            filters["posting_date"] = ["between", [from_date, to_date]]
        else:
            filters["posting_date"] = ["<=", to_date]

    parties = frappe.get_all("Payment Entry", filters=filters, fields=["party"], distinct=True)
    return [p.party for p in parties if p.party]


@frappe.whitelist()
def get_outstanding_invoices(doctype, party_field, party_name, company):
    """
    Returns list of unpaid, uncancelled invoices for a given party.
    doctype: "Purchase Invoice" or "Sales Invoice"
    party_field: "supplier" or "customer"
    party_name: name of the party
    company: company name
    """
    filters = {
        party_field: party_name,
        "company": company,
        "docstatus": 1,
        "status": ["not in", ["Paid", "Cancelled"]],
        "outstanding_amount": [">", 0]
    }
    fields = ["name", "outstanding_amount", "posting_date"]
    if doctype == "Purchase Invoice":
        fields.extend(["bill_no", "bill_date"])

    invoices = frappe.get_all(doctype, filters=filters, fields=fields)
    return invoices


@frappe.whitelist()
def allocate_payment_to_invoices(payment_entry, allocations, company):
    """
    Allocate amounts from a Payment Entry to one or more invoices.
    Edits the existing submitted Payment Entry by appending references.
    allocations: list of dicts with keys 'invoice', 'allocated_amount', 'doctype'
    """
    try:
        if isinstance(allocations, str):
            allocations = frappe.parse_json(allocations)

        pe = frappe.get_doc("Payment Entry", payment_entry)

        # Append new invoice references (preserve existing ones)
        for alloc in allocations:
            invoice_doctype = alloc.get("doctype")
            if not invoice_doctype:
                invoice_doctype = "Purchase Invoice" if alloc["invoice"].startswith("PINV") else "Sales Invoice"

            inv = frappe.get_doc(invoice_doctype, alloc["invoice"])
            
            # Use appropriate account field based on doctype
            account = inv.debit_to if invoice_doctype == "Sales Invoice" else inv.credit_to

            pe.append("references", {
                "reference_doctype": invoice_doctype,
                "reference_name": alloc["invoice"],
                "account": account,
                "due_date": inv.due_date,
                "total_amount": inv.grand_total,
                "outstanding_amount": inv.outstanding_amount,
                "allocated_amount": flt(alloc["allocated_amount"]),
                "exchange_rate": flt(inv.conversion_rate) or 1.0
            })

        # Recalculate totals (total_allocated_amount, unallocated_amount, etc.)
        pe.setup_party_account_field()
        pe.set_amounts()

        # Update GL Entries for submitted document to fix invoice outstanding amounts
        # 1. Reverse old GL entries
        pe.make_gl_entries(cancel=1)

        # Allow saving a submitted document
        pe.flags.ignore_validate_update_after_submit = True
        pe.save(ignore_permissions=True)

        # 2. Create new GL entries (this also updates invoice outstanding)
        pe.make_gl_entries(cancel=0)
        
        frappe.db.commit()

        return {"status": "success", "payment_entry": pe.name}
    except Exception as e:
        frappe.db.rollback()
        return {"status": "error", "error": str(e)}

#########################################################################
# Provisioning Update to Site
import frappe

@frappe.whitelist()
def update_site_from_provisioning(provisioning_name):

    if not provisioning_name:
        frappe.throw("Provisioning document is required")

    # -----------------------------------
    # Get Provisioning document
    # -----------------------------------
    provisioning = frappe.get_doc("Provisioning", provisioning_name)

    if not provisioning.circuit_id:
        frappe.throw("Circuit ID is missing in Provisioning")

    # -----------------------------------
    # Get Site (circuit_id = Site.name)
    # -----------------------------------
    try:
        site = frappe.get_doc("Site", provisioning.circuit_id)
    except frappe.DoesNotExistError:
        frappe.throw(f"Site not found with name: {provisioning.circuit_id}")

    # -----------------------------------
    # CONDITION: Only if provisioning_id is blank
    # -----------------------------------
    if site.provisioning_id:
        frappe.msgprint(f"Site already linked with Provisioning: {site.provisioning_id}")
        return

    # -----------------------------------
    # Prepare update dict (BEST PRACTICE)
    # -----------------------------------
    update_fields = {}

    # -----------------------------------
    # PARTIALLY COMPLETED
    # -----------------------------------
    if provisioning.status == "Partially Completed":

        update_fields = {
            "site_status": "Partially Provisioning Completed",
            "provisioning_partially_completed_date": provisioning.provisioning_partially_completed_date,
            "branch_router_ip": provisioning.branch_router_ip,
            "provisioning_status": provisioning.status
        }

    # -----------------------------------
    # COMPLETED
    # -----------------------------------
    elif provisioning.status == "Completed":

        update_fields = {
            "site_status": "Provisioning Completed",
            "provisioning_id": provisioning.name,
            "provisioning_date": provisioning.provisioning_date,
            "provisioning_status": provisioning.status,
            "branch_router_ip": provisioning.branch_router_ip   # ✅ FIX ADDED
        }

    else:
        return

    # -----------------------------------
    # SINGLE UPDATE (Better than multiple db_set)
    # -----------------------------------
    frappe.db.set_value("Site", site.name, update_fields)

    frappe.db.commit()

    return site.name  # returning for JS use (optional)

#################################################################################
# Shifting Code
import frappe
from frappe.utils import nowdate

@frappe.whitelist()
def update_site_shift(site_name):
    try:
        doc = frappe.get_doc("Site", site_name)

        if (
            doc.order_type == "Shifting"
            and doc.site_status == "Delivered and Live"
            and doc.existing_circuit_id == doc.name
            and not doc.site_shifted_date
        ):
            doc.site_status = "Site Shifted to new location"
            doc.shifted_circuit_id = doc.name
            doc.site_shifted_date = nowdate()

            doc.save(ignore_permissions=True)

        return "Success"

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Site Shift Error")
        return str(e)

#########################################################################
# Employee Survey
import frappe
import json
from frappe.utils import now_datetime


# =========================
# GET SURVEY QUESTIONS
# =========================
@frappe.whitelist(allow_guest=False)
def get_survey_details(survey):

    doc = frappe.get_doc("Employee Survey", survey)
    user = frappe.session.user
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")

    existing_answers = {}
    if employee:
        response = frappe.db.get_value("Survey Response", {
            "survey": survey,
            "employee": employee
        }, "name")

        if response:
            res_doc = frappe.get_doc("Survey Response", response)
            for ans in res_doc.answers:
                # Store answer by question text to match frontend data-question attribute
                existing_answers[ans.question] = ans.answer

    return {
        "title": doc.name,
        "description": doc.description,
        "start_date": doc.start_date,
        "end_date": doc.end_date,
        "is_active": doc.is_active,
        "existing_answers": existing_answers,
        "questions": [{
            "question": q.question,
            "type": q.question_type,
            "options": q.options,
            "mandatory": q.is_mandatory
        } for q in doc.questions]
    }


# =========================
# SAVE SURVEY RESPONSE (FIXED)
# =========================
@frappe.whitelist()
def save_survey_response(survey, answers):

    try:
        if isinstance(answers, str):
            answers = json.loads(answers)

        user = frappe.session.user

        if user == "Guest":
            frappe.throw("Please login to submit the survey")

        employee = frappe.db.get_value("Employee", {"user_id": user}, "name")

        if not employee:
            frappe.throw("No Employee linked to this user")

        # Prevent duplicate
        existing = frappe.db.exists("Survey Response", {
            "survey": survey,
            "employee": employee
        })

        if existing:
            frappe.throw("You already submitted this survey")

        # =========================
        # CREATE DOC
        # =========================
        doc = frappe.new_doc("Survey Response")
        doc.survey = survey
        doc.employee = employee
        doc.submitted_on = now_datetime()

        for ans in answers:
            value = ans.get("answer")

            doc.append("answers", {
                "question": ans.get("question"),
                "answer": value,
                "rating_value": int(value) if str(value).isdigit() else 0
            })

        # 🔥 IMPORTANT
        doc.insert(ignore_permissions=True)

        # 🔥 DEBUG LOG
        frappe.log_error(f"Survey Saved: {doc.name}", "SURVEY SUCCESS")

        return {
            "status": "success",
            "name": doc.name
        }

    except Exception as e:

        # 🔥 LOG ERROR (VERY IMPORTANT)
        frappe.log_error(frappe.get_traceback(), "SURVEY ERROR")

        return {
            "status": "error",
            "message": str(e)
        }
#############################################################################    

import frappe
from frappe.utils import formatdate, now

@frappe.whitelist()
def send_survey_to_employees(survey, send_to=None, department=None, employees=None):
    """
    Enqueue the survey email sending task.
    Returns immediately to avoid blocking the client.
    """
    if not survey:
        return {"status": "error", "message": "Survey not found"}

    survey_doc = frappe.get_doc("Employee Survey", survey)

    # Check if the survey is active
    if not survey_doc.is_active:
        return {
            "status": "error",
            "message": "Survey is not active. Please activate the survey before sending."
        }

    # Enqueue the actual email sending to a background queue
    frappe.enqueue(
        method=process_survey_emails,
        queue="long",
        timeout=600,
        survey=survey,
        send_to=send_to,
        department=department,
        employees=employees,
        job_name=f"send_survey_{survey}"
    )

    return {
        "status": "success",
        "message": "Emails are being sent in background"
    }


def process_survey_emails(survey, send_to=None, department=None, employees=None):
    """
    Actual background task that sends emails and creates survey logs.
    """
    try:
        survey_doc = frappe.get_doc("Employee Survey", survey)

        survey_url = f"https://erp.nexapp.co.in/app/employee-survey-page?survey={survey}"
        description = survey_doc.description or ""
        end_date = formatdate(survey_doc.end_date) if survey_doc.end_date else "N/A"

        # Build the list of employees based on send_to option
        base_filters = {
            "status": "Active",
            "user_id": ["is", "set"]      # user_id must not be null/empty
        }

        if send_to == "All Employees":
            employee_list = frappe.get_all(
                "Employee",
                filters=base_filters,
                fields=["name", "employee_name", "user_id"]
            )
        elif send_to == "By Department":
            if not department:
                frappe.log_error("No department provided for 'By Department'", "Survey Email Error")
                return
            filters = base_filters.copy()
            filters["department"] = department
            employee_list = frappe.get_all(
                "Employee",
                filters=filters,
                fields=["name", "employee_name", "user_id"]
            )
        elif send_to == "Selected Employees":
            if not employees:
                frappe.log_error("No employees provided for 'Selected Employees'", "Survey Email Error")
                return
            if isinstance(employees, str):
                employees = frappe.parse_json(employees)
            employee_list = frappe.get_all(
                "Employee",
                filters={
                    "name": ["in", employees],
                    "status": "Active",
                    "user_id": ["is", "set"]
                },
                fields=["name", "employee_name", "user_id"]
            )
        else:
            frappe.log_error(f"Invalid send_to option: {send_to}", "Survey Email Error")
            return

        if not employee_list:
            frappe.log_error("No active employees with valid user_id found", "Survey Email Error")
            return

        # Send emails and create logs
        for emp in employee_list:
            # Skip if the user is disabled
            user_enabled = frappe.db.get_value("User", emp.user_id, "enabled")
            if not user_enabled:
                continue

            try:
                # Send the email
                frappe.sendmail(
                    recipients=[emp.user_id],
                    sender="notification@nexapp.co.in",
                    subject=f"Employee Survey: {survey_doc.title}",
                    message=f"""
                        Dear {emp.employee_name or "Employee"},<br><br>
                        {description}<br><br>
                        <b>📅 Please complete the survey before:</b> {end_date}<br><br>
                        👉 <a href="{survey_url}">Click here to fill the survey</a><br><br>
                        Your feedback is very important to us.<br><br>
                        Regards,<br>
                        HR Team
                    """
                )

                # Avoid duplicate logs
                if not frappe.db.exists("Survey Log", {"survey": survey, "employee": emp.name}):
                    frappe.get_doc({
                        "doctype": "Survey Log",
                        "survey": survey,
                        "employee": emp.name,
                        "employee_name": emp.employee_name,
                        "email": emp.user_id,
                        "status": "Sent",
                        "sent_on": now()
                    }).insert(ignore_permissions=True)

            except Exception as e:
                frappe.log_error(
                    f"Failed to send survey to {emp.name} ({emp.user_id}): {str(e)}",
                    "Survey Email Error"
                )

    except Exception as e:
        frappe.log_error(f"Survey email background job failed: {str(e)}", "Survey Email Error")

##########################################################################
# AI Customer Potal

import frappe
import re
import os
import requests

# =========================================================
# AI CALL
# =========================================================
def call_ai_model(prompt):
    try:
        config_name = frappe.db.get_value("API Configuration", None, "name")
        if not config_name:
            return ""

        config = frappe.get_doc("API Configuration", config_name)

        api_key = config.get_password("api_key")
        model_name = config.model_name
        api_base_url = config.api_base_url

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 100
        }

        response = requests.post(api_base_url, headers=headers, json=payload, timeout=10)
        result = response.json()

        return result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

    except Exception:
        return ""


# =========================================================
# MAIN FUNCTION
# =========================================================
@frappe.whitelist(allow_guest=True)
def ai_installation_query(question):

    try:
        question_lower = question.lower()

        # =========================================================
        # 🔥 DETECT IMAGE TYPE
        # =========================================================
        image_type = None

        if "ir" in question_lower:
            image_type = "IR Report"
        elif "router" in question_lower:
            image_type = "Router Photo"
        elif "testing" in question_lower:
            image_type = "Testing Photo"
        elif "rack" in question_lower:
            image_type = "Server Rack Photo"
        elif "cable" in question_lower:
            image_type = "Cable Labeling Photo"
        elif "isp" in question_lower:
            image_type = "ISP Device Photo"
        elif "installation" in question_lower or "report" in question_lower:
            image_type = None  # fetch all

        # =========================================================
        # 🔥 EXTRACT INPUTS (NUMBERS + WORDS)
        # =========================================================
        numbers = re.findall(r'\d+', question)
        words = re.findall(r'[A-Za-z0-9]+', question)

        circuit_ids = set()

        # 🔥 1. Direct Circuit ID (numbers)
        for num in numbers:
            if frappe.db.exists("Site", num):
                circuit_ids.add(num)

        # 🔥 2. Legal Code → convert to Circuit ID
        for word in words:
            site = frappe.db.get_value(
                "Site",
                {"site_id__legal_code": word.upper()},
                "name"
            )
            if site:
                circuit_ids.add(site)

        all_images = []
        valid_circuits = []

        # =========================================================
        # 🔥 PROCESS EACH CIRCUIT
        # =========================================================
        for circuit_id in circuit_ids:

            installation = frappe.db.get_value(
                "Installation Note",
                {"custom_circuit_id": circuit_id},
                "name"
            )

            if not installation:
                continue

            # =========================================================
            # 🔥 GET LEGAL CODE FROM SITE
            # =========================================================
            legal_code = frappe.db.get_value(
                "Site",
                {"name": circuit_id},
                "site_id__legal_code"
            ) or "NA"

            # =========================================================
            # 🔥 GET ATTACHMENTS
            # =========================================================
            attachments = frappe.get_all(
                "Installation Note Attachment",
                filters={"parent": installation},
                fields=["attachment", "select_mqjl"]
            )

            for att in attachments:

                if not att.attachment:
                    continue

                # =========================================================
                # 🔥 FILTER ONLY IF SPECIFIC TYPE REQUESTED
                # =========================================================
                if image_type and att.select_mqjl != image_type:
                    continue

                all_images.append({
                    "image": att.attachment,
                    "label": att.select_mqjl,
                    "circuit_id": circuit_id,
                    "legal_code": legal_code
                })

            valid_circuits.append(circuit_id)

        # =========================================================
        # 🔥 AI REPLY
        # =========================================================
        if not all_images:
            if valid_circuits:
                ai_reply = f"No installation images or attachments found for Circuit ID(s): {', '.join(valid_circuits)}."
            else:
                ai_reply = "No data found for the given Circuit ID or Legal Code."
        else:
            if image_type:
                ai_reply = f"Here is the {image_type} for Circuit ID(s): {', '.join(valid_circuits)}"
            else:
                ai_reply = f"Here is the full installation report (all attachments) for Circuit ID(s): {', '.join(valid_circuits)}"

        return {
            "status": "success",
            "images": all_images,
            "circuit_ids": list(valid_circuits),
            "image_type": image_type,
            "ai_reply": ai_reply
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "AI INSTALLATION ERROR")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def download_multi_images(files):
    """
    Creates a ZIP file of multiple images and returns the download URL.
    """
    frappe.logger().info(f"MULTI DOWNLOAD REQUEST: {files}")
    
    if not files:
        return {"status": "error", "message": "No files selected"}

    try:
        if isinstance(files, str):
            files = json.loads(files)

        # ZIP filename from first file metadata
        first_file = files[0] if files else {}
        z_cid = first_file.get("cid", "Unknown")
        z_lc = first_file.get("lc", "NA")
        zip_display_name = f"Installation_Report_{z_cid}_{z_lc}.zip"

        zip_buffer = io.BytesIO()
        files_added = 0
        
        with zipfile.ZipFile(zip_buffer, "w") as zip_file:
            for file_data in files:
                url = file_data.get("url")
                if not url:
                    continue
                
                label = file_data.get("label", "Image")
                fcid = file_data.get("cid", "Unknown")
                flc = file_data.get("lc", "NA")
                
                # Resolve file path
                clean_path = url.lstrip("/")
                site_path = frappe.get_site_path()
                
                possible_paths = [
                    os.path.join(site_path, "public", clean_path),
                    os.path.join(site_path, clean_path),
                    frappe.get_site_path("public", clean_path),
                    frappe.get_site_path("private", clean_path)
                ]
                
                resolved_path = None
                for p in possible_paths:
                    if os.path.exists(p) and os.path.isfile(p):
                        resolved_path = p
                        break
                
                if resolved_path:
                    _, ext = os.path.splitext(resolved_path)
                    # Use provided metadata for internal name
                    internal_name = f"{label}_{fcid}_{flc}{ext}".replace(" ", "_")
                    zip_file.write(resolved_path, internal_name)
                    files_added += 1
                else:
                    frappe.logger().warning(f"Could not resolve file: {url}")

        if files_added == 0:
            return {"status": "error", "message": "None of the selected images could be found on the server."}

        zip_buffer.seek(0)
        
        # Save ZIP to file manager with randomized internal name but return pretty display name
        from frappe.utils import random_string
        fn = f"report_{random_string(6)}.zip"
        
        _file = frappe.get_doc({
            "doctype": "File",
            "file_name": fn,
            "content": zip_buffer.getvalue(),
            "is_private": 0
        })
        _file.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success", 
            "url": _file.file_url,
            "filename": zip_display_name
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MULTI DOWNLOAD ERROR")
        return {"status": "error", "message": f"Server Error: {str(e)}"}