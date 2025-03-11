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
import frappe
from frappe.utils import now

@frappe.whitelist()
def sales_order_to_site(sales_order):
    so_doc = frappe.get_doc("Sales Order", sales_order)
    
    if not so_doc.po_no:
        frappe.throw(_("Client PO Number is missing in the Sales Order"))
    
    grouped_sites = {}

    for item in so_doc.items:
        feasibility = item.custom_feasibility
        if feasibility not in grouped_sites:
            grouped_sites[feasibility] = {
                "circuit_id": feasibility,
                "site_name": item.custom_site_info,
                "order_type": item.custom_order_type,
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
        site_doc.order_type = site_data["order_type"]
        
        site_doc.primary_contact = feasibility_doc.primary_contact
        site_doc.alternate_contact = feasibility_doc.alternate_contact
        site_doc.site_id__legal_code = feasibility_doc.site_id__legal_code
        site_doc.site_type = feasibility_doc.site_type
        site_doc.solution = feasibility_doc.solution
        site_doc.region = feasibility_doc.region
        site_doc.phase = feasibility_doc.phase
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
        
        # Newly added fields
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
        
        for item in site_data["items"]:
            product_bundle = frappe.get_all("Product Bundle",
                                            filters={"new_item_code": item["item_code"]},
                                            fields=["new_item_code"])
            
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
        
        for lms in feasibility_doc.lms_provider:
            site_doc.append("lms_vendor", {
                "lms_supplier": lms.lms_supplier,
                "bandwith_type": lms.bandwith_type,
                "media": lms.media,
                "support_mode": lms.support_mode,
                "supplier_contact": lms.supplier_contact,
                "static_ip": lms.static_ip
            })
        
        for wireless in feasibility_doc.wireless_feasiblity:
            site_doc.append("wireless", {
                "operator": wireless.operator,
                "3g": wireless.get("3g"),
                "4g": wireless.get("4g"),
                "5g": wireless.get("5g")
            })
        
        site_doc.insert(ignore_permissions=True)
        frappe.db.commit()

    return {"status": "success"}
###############################################################

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
                "billing_terms": item.billing_terms or None,
                "support_mode": item.support_mode or None,
                "contact_person": item.contact_person or None,
                "supplier_contact": item.supplier_contact or None,
                "lms_bandwith": item.lms_bandwith or None,
                "static_ip": item.static_ip or None,
                "mrc": item.mrc or 0,
                "security_deposit": item.security_deposit or 0,
                "billing_mode": item.billing_mode or None
            })

    # Return data
    return {
        "provisioning_items": provisioning_items,
        "lms_items": lms_items
    }

#################################################################################
import frappe

def update_site_status_on_delivery_note_save(doc, method):
    """Update the site_status of Site Doctype based on Delivery Note Items."""
    
    for item in doc.items:
        # Check if custom_circuit_id exists for the item
        if item.custom_circuit_id:
            # Search for the Site doctype with matching circuit_id
            site = frappe.db.get_value("Site", {"circuit_id": item.custom_circuit_id}, "name")
            
            if site:
                # Get the Site document
                site_doc = frappe.get_doc("Site", site)
                
                # Update the site_status field
                site_doc.site_status = "Delivered"
                
                # Save the updated Site document
                site_doc.save(ignore_permissions=True)

############################################################################
import frappe
import re

def create_hd_ticket_from_communication(doc, method):
    # Step 1: Check if the email is received by helpdesk@nexapp.co.in OR sent from nms@nexapp.co.in
    if (
        (doc.recipients == "helpdesk@nexapp.co.in" or doc.sender == "nms@nexapp.co.in") 
        and doc.sent_or_received == "Received" 
        and doc.status == "Open"
    ):
        # Step 2: Extract Circuit ID from subject or content
        circuit_id = extract_circuit_id(doc.subject) or extract_circuit_id(doc.content)

        # Step 3: Validate Circuit ID and determine status
        if circuit_id:
            if len(circuit_id) == 5:
                # Check if Circuit ID exists in Site doctype with "Delivered and Live" stage
                site = frappe.get_all("Site", filters={"circuit_id": circuit_id}, fields=["name", "stage"])
                
                if site and site[0].get("stage") == "Delivered and Live":
                    # Step 4: Check for existing open tickets
                    existing_ticket = frappe.get_all("HD Ticket", filters={
                        "custom_circuit_id": circuit_id,
                        "status": ["in", ["Open", "Replied", "Resolved"]]
                    })
                    
                    if existing_ticket:
                        return  # Stop if ticket already exists
                    
                    # Step UM-000015: Create new ticket or reopen closed one
                    closed_ticket = frappe.get_all("HD Ticket", filters={
                        "custom_circuit_id": circuit_id,
                        "status": "Closed"
                    })

                    if closed_ticket:
                        create_hd_ticket(circuit_id, "Open", doc.sender, doc.subject, doc.content)
                    else:
                        create_hd_ticket(circuit_id, "Open", doc.sender, doc.subject, doc.content)
                else:
                    # Invalid stage
                    create_hd_ticket(circuit_id, "Wrong Circuit", doc.sender, doc.subject, doc.content)
            else:
                # Invalid Circuit ID length
                create_hd_ticket(None, "Wrong Circuit", doc.sender, doc.subject, doc.content)
        else:
            # No Circuit ID found
            create_hd_ticket(None, "Wrong Circuit", doc.sender, doc.subject, doc.content)

def extract_circuit_id(text):
    """Extracts a 5-digit Circuit ID even if surrounded by underscores or other characters"""
    if text:
        match = re.search(r"\b\d{5}\b|\d{5}(?=\D)", text)  # Match standalone or before a non-digit
        return match.group(0) if match else None
    return None

def create_hd_ticket(circuit_id, status, sender, subject, content):
    """Create HD Ticket with channel detection"""
    # Create new ticket doc
    ticket = frappe.get_doc({
        "doctype": "HD Ticket",
        "subject": subject,
        "description": content,
        "raised_by": sender,
        "status": status,
        "custom_circuit_id": circuit_id
    })

    # Set channel exactly like your working sample
    if not ticket.raised_by:
        return
    ticket.custom_channel = "NMS" if "nms@nexapp.co.in" in ticket.raised_by else "Email"

    # Save the ticket
    ticket.insert(ignore_permissions=True)
    frappe.db.commit()

############################################################################
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
from frappe.utils import get_url
from frappe.utils.pdf import get_pdf
import hashlib

@frappe.whitelist()
def download_subcategory_pdf(subcategory):
    docs = frappe.get_all("Document",
        filters={
            "sub_category": subcategory,
            "published": 1
        },
        fields=["name", "title", "content", "attach_file"],
        order_by="creation"
    )

    seen = set()
    html = """
    <style>
        body { font-family: Arial; margin: 20px; }
        h1 { color: #2d3e50; border-bottom: 2px solid #eee; }
        .document { margin-bottom: 30px; }
        img { max-width: 100%%; height: autoTable of Contents
Introduction
1.1 Purpose
1.2 Intended Audience
1.3 System Requirements
1.4 Conventions Used

Getting Started
2.1 Installation & Setup
2.2 Logging In
2.3 User Interface Overview; margin: 15px 0; }
    </style>
    <h1>%s Documentation</h1>
    """ % subcategory

    for doc in docs:
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

@frappe.whitelist()
def download_full_pdf():
    docs = frappe.get_all("Document",
        filters={"published": 1},
        fields=["name", "title", "content", "attach_file", "category", "sub_category"],
        order_by="category, sub_category, creation"
    )

    categories = {}
    for doc in docs:
        category = doc.category
        sub_category = doc.sub_category
        if category not in categories:
            categories[category] = {}
        if sub_category not in categories[category]:
            categories[category][sub_category] = []
        categories[category][sub_category].append(doc)

    html = """
    <style>
        body { font-family: Arial; margin: 30px; }
        h1 { color: #2d3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .category { margin: 40px 0; }
        .subcategory { margin: 30px 0 20px 15px; }
        .document { margin-bottom: 25px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        img { max-width: 100%; height: auto; margin: 15px 0; }
        h2 { color: #2d3e50; font-size: 1.5em; }
        h3 { color: #4a5c6b; font-size: 1.3em; margin-bottom: 15px; }
    </style>
    <h1>Complete Documentation</h1>
    """

    seen = set()
    for category, subcats in categories.items():
        html += f'<div class="category"><h2>{category}</h2>'
        for subcat, documents in subcats.items():
            html += f'<div class="subcategory"><h3>{subcat}</h3>'
            for doc in documents:
                content_hash = hashlib.md5(f"{doc.title}{doc.content}".encode()).hexdigest()
                if content_hash in seen:
                    continue
                seen.add(content_hash)
                
                image_html = f'<img src="{get_url(doc.attach_file)}">' if doc.attach_file else ''
                html += f"""
                <div class="document">
                    <h4>{doc.title}</h4>
                    <div>{doc.content}</div>
                    {image_html}
                </div>
                """
            html += '</div>'
        html += '</div>'

    pdf_data = get_pdf(html)
    frappe.local.response.filename = "complete-documentation.pdf"
    frappe.local.response.filecontent = pdf_data
    frappe.local.response.type = "pdf"