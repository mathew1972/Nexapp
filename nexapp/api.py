# /home/mathew/frappe-bench/apps/nexapp/nexapp/api.py



import re
import frappe
import json

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

################################# HelpDesk ############################################
import frappe
import re
from email.utils import getaddresses

def create_hd_ticket_from_communication(doc, method):
    try:
        # 🚫 Step 0A: Skip bounce or automated emails (sender-based)
        if (
            doc.sender
            and (
                "mailer-daemon" in doc.sender.lower()
                or "postmaster@" in doc.sender.lower()
                or "no-reply" in doc.sender.lower()
                or "mailer@" in doc.sender.lower()
            )
        ):
            frappe.logger().info(f"Ignored auto-generated email from {doc.sender}")
            return

        # 🚫 Step 0B: Skip delivery failure / policy violation emails (content-based)
        failure_keywords = [
            "delivery failed",
            "could not be delivered",
            "email policy violation",
            "mail delivery subsystem",
            "554 5.7.7",
            "message could not be delivered",
            "permanent error"
        ]

        combined_failure_check = f"{doc.subject or ''} {doc.content or ''}".lower()

        if any(keyword in combined_failure_check for keyword in failure_keywords):
            frappe.logger().info(
                f"Ignored email failure/bounce message from {doc.sender}"
            )
            return

        # 0️⃣ Pre-check: Only process relevant incoming emails
        recipient_emails = [email.strip() for _, email in getaddresses([doc.recipients])]
        if not ("techsupport@nexapp.co.in" in recipient_emails or doc.sender == "nms@nexapp.co.in"):
            return

        if not (doc.sent_or_received == "Received" and doc.status == "Open"):
            return

        # 1️⃣ Extract 5-digit circuit ID from subject + content
        combined_text = f"{doc.subject} {doc.content}"
        circuit_match = re.search(
            r'(?:circuit[#_ ]|^|[^0-9])(\d{5})(?=[^0-9]|$)',
            combined_text,
            flags=re.IGNORECASE
        )
        circuit_id = circuit_match.group(1) if circuit_match else ""

        # 2️⃣ Try to find existing HD Ticket with matching circuit ID
        existing_ticket = None
        if circuit_id:
            existing_ticket = frappe.db.get_value(
                "HD Ticket",
                {"custom_circuit_id": circuit_id},
                ["name", "status", "owner"],
                as_dict=True
            )

        # 3️⃣ If matching open ticket found
        if existing_ticket and existing_ticket.status not in ["Closed", "Resolved"]:
            doc.reference_doctype = "HD Ticket"
            doc.reference_name = existing_ticket.name
            doc.status = "Linked"
            doc.save(ignore_permissions=True)

            # Send polite reply (only if not from NMS)
            if doc.sender.lower() != "nms@nexapp.co.in":
                email_subject = f"Ticket Already Opened: {existing_ticket.name} (Circuit ID: {circuit_id})"
                email_message = (
                    f"Dear Customer,<br><br>"
                    f"Thank you for your email. We already have an open ticket "
                    f"<b>{existing_ticket.name}</b> for your circuit ID "
                    f"<b>{circuit_id}</b>. Your email has been added to this ticket.<br><br>"
                    f"Thanks & Regards,<br>"
                    f"Nexapp Technologies Private Limited<br>"
                    f"Support Team"
                )

                cc_list = []
                ticket_owner = existing_ticket.owner
                if ticket_owner and ticket_owner.lower() != doc.sender.lower():
                    cc_list = [ticket_owner]

                frappe.sendmail(
                    recipients=doc.sender,
                    cc=cc_list,
                    subject=email_subject,
                    message=email_message,
                    sender="techsupport@nexapp.co.in"
                )

            frappe.get_doc("HD Ticket", existing_ticket.name).add_comment(
                "Info",
                f"New email from {doc.sender} linked to this ticket."
            )
            return

        # 4️⃣ No matching HD Ticket — check if circuit ID exists in Site
        circuit_valid = False
        if circuit_id:
            circuit_valid = frappe.db.exists("Site", circuit_id)

        if circuit_valid:
            ticket = frappe.get_doc({
                "doctype": "HD Ticket",
                "subject": doc.subject,
                "description": doc.content,
                "raised_by": doc.sender,
                "status": "Open",
                "custom_circuit_id": circuit_id,
                "custom_channel": "NMS" if "nms@nexapp.co.in" in doc.sender else "Email"
            })
            ticket.insert(ignore_permissions=True)

            doc.reference_doctype = "HD Ticket"
            doc.reference_name = ticket.name
            doc.status = "Linked"
            doc.save(ignore_permissions=True)
            return

        # 5️⃣ Circuit ID doesn't match HD Ticket or Site
        if doc.sender.lower() != "nms@nexapp.co.in":
            original_body = frappe.utils.strip_html_tags(doc.content or "")
            snippet = (original_body[:500] + "...") if len(original_body) > 500 else original_body

            email_subject = f"[Invalid Circuit ID] From: {doc.sender} | Subject: {doc.subject}"
            email_message = (
                f"Dear Customer,<br><br>"
                f"The circuit number you provided does not match our records, "
                f"and we are unable to open a ticket in our system.<br><br>"
                f"📌 <b>Original Sender:</b> {doc.sender}<br>"
                f"📌 <b>Original Subject:</b> {doc.subject}<br><br>"
                f"📌 <b>Original Message :</b><br>"
                f"<div style='border:1px solid #ccc; padding:10px;'>"
                f"{frappe.utils.escape_html(snippet)}</div><br>"
                f"For assistance, please contact "
                f"<a href='mailto:techsupport@nexapp.co.in'>techsupport@nexapp.co.in</a> "
                f"or call 020-67629999.<br><br>"
                f"Thanks & Regards,<br>"
                f"Nexapp Technologies Private Limited<br>"
                f"Support Team"
            )

            frappe.sendmail(
                recipients=doc.sender,
                cc=["ganpati.g@nexapp.co.in", "vaishali.k@nexapp.co.in"],
                subject=email_subject,
                message=email_message,
                sender="techsupport@nexapp.co.in"
            )

        return

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "HD Ticket Auto-Creation Error")
        frappe.throw(f"Error creating ticket: {str(e)}")

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
            "paid_amount": paid_amount,  # Set to allocated amount (14062.00)
            "received_amount": received_amount,  # Set to allocated amount (14062.00)
            "reference_no": stmt.description,
            "reference_date": stmt.transaction_date,
            "posting_date": stmt.transaction_date,
            "paid_to": get_default_bank_account(company, "Receive"),
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

    # NEW: update Bank Statement Entry reference_no and reconciled
    frappe.db.set_value("Bank Statement Entry", stmt.name, "reference_no", payment_entry.name)
    frappe.db.set_value("Bank Statement Entry", stmt.name, "reconciled", 1)

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
    allow_overpayment=False
):
    try:
        if not isinstance(invoices, list):
            invoices = frappe.parse_json(invoices)

        stmt = frappe.get_doc("Bank Statement Entry", statement_name)

        if not company:
            company = frappe.db.get_value("Bank Account", stmt.bank_account, "company")

        is_deposit = bool(stmt.deposit and float(stmt.deposit) > 0)

        if is_deposit:
            payment_type = "Receive"
            paid_to = get_default_bank_account(company, payment_type)
            paid_from = None
        else:
            payment_type = "Pay"
            paid_from = get_default_bank_account(company, payment_type)
            paid_to = None

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
                allow_overpayment=allow_overpayment
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
                    "paid_from": paid_from,
                    "paid_to": paid_to,
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
                    "paid_from": paid_from,
                    "paid_to": paid_to,
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

        # NEW: update reference_no and reconciled on Bank Statement Entry
        frappe.db.set_value("Bank Statement Entry", statement_name, "reference_no", payment_entry.name)
        frappe.db.set_value("Bank Statement Entry", statement_name, "reconciled", 1)

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

        # NEW: update reference_no and reconciled on Bank Statement Entry
        frappe.db.set_value("Bank Statement Entry", stmt.name, "reference_no", journal_entry.name)
        frappe.db.set_value("Bank Statement Entry", stmt.name, "reconciled", 1)

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

        # NEW: update reference_no and reconciled on Bank Statement Entry
        frappe.db.set_value("Bank Statement Entry", stmt.name, "reference_no", journal_entry.name)
        frappe.db.set_value("Bank Statement Entry", stmt.name, "reconciled", 1)

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
def create_itemized_journal_entry(statement_name, itemized_entries, company=None):
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

        # Credit Bank Account
        journal_entry.append("accounts", {
            "account": get_default_bank_account(company, "Pay"),
            "debit_in_account_currency": 0,
            "credit_in_account_currency": total_amount,
            "party_type": "",
            "party": "",
            "cost_center": get_default_cost_center(company)
        })

        journal_entry.insert()
        journal_entry.submit()

        # NEW: update reference_no and reconciled on Bank Statement Entry
        frappe.db.set_value("Bank Statement Entry", stmt.name, "reference_no", journal_entry.name)
        frappe.db.set_value("Bank Statement Entry", stmt.name, "reconciled", 1)

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
                allow_overpayment=False
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
        frappe.db.set_value("Bank Statement Entry", statement_name, "reconciled", 0)
        return {"status": "ok"}
    except Exception as e:
        frappe.log_error(title="BR_UNDO_ERROR", message=frappe.get_traceback())
        return {"status": "fail", "error": str(e)}
##################SEPARATE FUNCTION: process_customer_payment()#################
def process_customer_payment(stmt, invoices, company, customer, tax_adjustments_list, allow_overpayment=False):
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
            "paid_to": get_default_bank_account(company, "Receive"),
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
    frappe.db.set_value("Bank Statement Entry", stmt.name, "reference_no", payment_entry.name)  # NEW
    frappe.db.set_value("Bank Statement Entry", stmt.name, "reconciled", 1)

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

    # Paid From (Bank account)
    if statement.bank_account:
        pe.paid_from = statement.bank_account
    else:
        return {"status": "error", "error": "Bank account missing in statement"}

    # Paid To (Expense Claim Account)
    pe.paid_to = "Advance - " + company  # Or use Expense Claim default account

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
    statement.db_set("reconciled", 1)

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
    frappe.db.set_value("Bank Statement Entry", statement_name, "reconciled", 1)

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
        statement.reconciled = 1
        statement.reference_document = je.name
        statement.reference_doctype = "Journal Entry"
        statement.save(ignore_permissions=True)
        statement.db_update()

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
def create_itemized_journal_entry(statement_name, items=None, itemized_entries=None):
    """
    Create and Submit Journal Entry for itemized multi-line accounts.
    Supports BOTH Withdrawal and Deposit.
    """

    # Accept both argument names
    data = items or itemized_entries
    if not data:
        return {"status": "fail", "error": "Itemized entries not received"}

    # Convert JSON string to list
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            return {"status": "fail", "error": "Invalid itemized entries format"}

    items = data

    # --- Load Bank Statement Entry ---
    stmt = frappe.get_doc("Bank Statement Entry", statement_name)

    withdrawal_amount = float(stmt.withdrawal or 0)
    deposit_amount = float(stmt.deposit or 0)

    # 🔴 Allow BOTH
    if withdrawal_amount <= 0 and deposit_amount <= 0:
        return {
            "status": "fail",
            "error": "No withdrawal or deposit amount in statement"
        }

    is_withdrawal = withdrawal_amount > 0
    is_deposit = deposit_amount > 0

    statement_amount = withdrawal_amount if is_withdrawal else deposit_amount

    # --- Validate total ---
    total_entered = sum(float(i.get("amount") or 0) for i in items)
    if abs(total_entered - statement_amount) > 0.001:
        return {
            "status": "fail",
            "error": f"Itemized total ({total_entered}) does not match statement amount ({statement_amount})"
        }

    # --- Bank Ledger ---
    bank_ledger = stmt.bank_account_head
    if not bank_ledger:
        return {"status": "fail", "error": "Bank Ledger (bank_account_head) missing"}

    company = frappe.db.get_value("Account", bank_ledger, "company")

    # --- Prepare JE Rows ---
    account_rows = []

    # 🔁 Itemized accounts
    for row in items:
        amount = float(row.get("amount") or 0)

        account_rows.append({
            "account": row["account"],
            "debit_in_account_currency": amount if is_withdrawal else 0,
            "credit_in_account_currency": amount if is_deposit else 0
        })

    # 🔁 Bank account (opposite side)
    account_rows.append({
        "account": bank_ledger,
        "debit_in_account_currency": statement_amount if is_deposit else 0,
        "credit_in_account_currency": statement_amount if is_withdrawal else 0
    })

    # --- Create JE ---
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
        "accounts": account_rows
    })

    je.flags.ignore_mandatory = True

    # Save & Submit
    je.insert(ignore_permissions=True)
    je.submit()

    # Mark statement as reconciled
    frappe.db.set_value("Bank Statement Entry", statement_name, "reconciled", 1)

    return {
        "status": "ok",
        "journal_entry": je.name,
        "submitted": True,
        "type": "Withdrawal" if is_withdrawal else "Deposit",
        "total": statement_amount
    }

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
    gl_bank_account = frappe.db.get_value("Bank Account", bank_account, "account")

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
    statement.db_set("reconciled", 1)

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

    # 🔥 Correct Accounts
    paid_from = frappe.db.get_value("Bank Account", stmt.bank_account, "account")
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
        "reconciled": 1
    })

    return {
        "status": "success",
        "payment_entry": payment_entry.name
    }
###############################################################################
# Customer Advance
@frappe.whitelist()
def create_customer_advance_payment(
    customer=None,
    amount=None,
    statement_entry=None,
    sales_order=None
):

    if not customer:
        frappe.throw("Customer is required")

    if not amount:
        frappe.throw("Amount is required")

    stmt = frappe.get_doc("Bank Statement Entry", statement_entry)
    company = frappe.db.get_value("Bank Account", stmt.bank_account, "company")

    paid_to = frappe.db.get_value("Bank Account", stmt.bank_account, "account")
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

    return {
        "status": "success",
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
