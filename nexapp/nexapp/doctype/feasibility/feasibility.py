import frappe
from frappe.model.document import Document

class Feasibility(Document):
    pass

@frappe.whitelist()
def add_lms_supplier(feasibility_name, row_name):
    feasibility = frappe.get_doc("Feasibility", feasibility_name)

    selected_provider = None
    for provider in feasibility.lms_provider:
        if provider.name == row_name:
            selected_provider = provider
            break

    if not selected_provider:
        frappe.throw("Selected LMS Provider not found.")

    # Check if LMS Request already exists with circuit_id = feasibility.name
    lms_request = frappe.get_all(
        "LMS Request",
        filters={"circuit_id": feasibility.name},
        fields=["name"]
    )

    if lms_request:
        # Fetch existing LMS Request
        lms_request_doc = frappe.get_doc("LMS Request", lms_request[0].name)
    else:
        # Create new LMS Request
        lms_request_doc = frappe.new_doc("LMS Request")
        lms_request_doc.circuit_id = feasibility.name
        lms_request_doc.save()

    # Append new child to LMS Request
    lms_request_doc.append("lms_fesible_suppliers", {
        "lms_feasibility_partner": selected_provider.lms_supplier,
        "supplier_name": selected_provider.supplier_contact,
        "bandwith_type": selected_provider.bandwith_type,
        "media": selected_provider.media,
        "support_mode": selected_provider.support_mode,
        "feasibility_type": selected_provider.feasibility_type,
        "email_id": selected_provider.email_id,
        "mobile": selected_provider.mobile,
        "static_ip": selected_provider.static_ip,
        "bandwidth": selected_provider.bandwidth,
        "lms_feasibility_status": selected_provider.lms_status,
        "billing_mode": selected_provider.billing_mode,
        "billing_terms": selected_provider.billing_terms,
        "validity": selected_provider.validity,
        "feasibility_mrc": selected_provider.mrc,
        "feasibility_otc": selected_provider.otc,
        "feasibility_arc": selected_provider.arc,
        "feasibility_static_ip_cost": selected_provider.static_ip_cost,
        "feasibility_security_deposit": selected_provider.security_deposit,
        "description": selected_provider.description,
    })

    lms_request_doc.save()

    # Update LMS Request ID in feasibility row
    selected_provider.lms_request_id = lms_request_doc.name
    feasibility.save()

    frappe.msgprint(f"LMS Request <b>{lms_request_doc.name}</b> updated with new supplier.")

    # Update Site if Site.name == Feasibility.name
    if frappe.db.exists("Site", feasibility.name):
        site = frappe.get_doc("Site", feasibility.name)

        site.append("lms_vendor", {
            "lms_supplier": selected_provider.lms_supplier,
            "supplier_contact": selected_provider.supplier_contact,
            "bandwith_type": selected_provider.bandwith_type,
            "media": selected_provider.media,
            "support_mode": selected_provider.support_mode,
            "feasibility_type": selected_provider.feasibility_type,
            "email_id": selected_provider.email_id,
            "mobile": selected_provider.mobile,
            "static_ip": selected_provider.static_ip,
            "bandwidth": selected_provider.bandwidth,
            "lms_status": selected_provider.lms_status,
            "stage": "LMS Initiated",
            "lms_requested_id": lms_request_doc.name
        })

        site.save()
        frappe.msgprint("Site updated with LMS Vendor data.")

    return lms_request_doc.name
