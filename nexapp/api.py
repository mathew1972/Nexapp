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

###########################################################3
import frappe
from frappe.utils import nowdate, add_days

@frappe.whitelist()
def create_sales_order(site_name):
    """
    Create a Sales Order for the given Site with validation for customer_po_no and project.
    """
    try:
        # Fetch the Site document
        site = frappe.get_doc("Site", site_name)
        
        # Ensure the Site has a linked customer
        if not site.customer:
            frappe.throw(f"Customer not linked to Site {site_name}")

        # Validate that customer_po_no and project are not blank
        if not site.customer_po_no or not site.project:
            frappe.throw("Please update both Customer PO Number (customer_po_no) and Project for the Site.")

        # Fetch the value of customer_po_no and project from the first site
        first_site_customer_po_no = site.customer_po_no
        first_site_project = site.project

        # Loop through selected sites to check that all have the same customer_po_no and project
        for site_item in site.get("site_item"):
            if site_item.customer_po_no != first_site_customer_po_no:
                frappe.throw("All selected sites must have the same Customer PO Number (customer_po_no).")
            if site_item.project != first_site_project:
                frappe.throw("All selected sites must have the same Project.")

        # Prepare Sales Order details
        sales_order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": site.customer,
            "delivery_date": add_days(nowdate(), 30),  # Delivery date: 30 days from today
            "items": []
        })

        # Add items from the Site's child table (Site Item) to the Sales Order
        for site_item in site.get("site_item"):
            sales_order.append("items", {
                "item_code": site_item.product_name,
                "qty": site_item.qty,
                "custom_feasibility": site.circuit_id,  # Assuming this maps to custom_feasibility
                "custom_site_info": site_name,  # Map the Site name to custom_site_info
                "customer_po_no": site.customer_po_no,  # Include the PO number from the parent Site Doctype
                "project": site.project  # Include the project from the parent Site Doctype
            })

        # Insert the Sales Order in draft mode
        sales_order.insert()

        # Return the created Sales Order name
        return sales_order.name

    except frappe.ValidationError as e:
        frappe.throw(str(e))
    except Exception as e:
        frappe.log_error(message=str(e), title="Sales Order Creation Error")
        frappe.throw(f"An unexpected error occurred: {str(e)}")

##########################################################
import frappe

@frappe.whitelist()
def get_filtered_circuit_ids(customer):
    """
    Fetch the list of circuit_ids from the Feasibility doctype
    where the customer matches the selected customer.
    """
    if not customer:
        return []

    # Fetch Feasibility records where customer matches
    feasibility_records = frappe.get_all('Feasibility', filters={'customer': customer}, fields=['circuit_id'])

    # Extract the circuit_id from the records
    circuit_ids = [record['circuit_id'] for record in feasibility_records]

    return circuit_ids
###################################################################
import frappe
from frappe.utils import now

@frappe.whitelist()
def sales_order_to_site(sales_order):
    # Fetch the Sales Order Document
    so_doc = frappe.get_doc("Sales Order", sales_order)
    
    if not so_doc.po_no:
        frappe.throw(_("Client PO Number is missing in the Sales Order"))
    
    grouped_sites = {}

    # Group items by custom_feasibility
    for item in so_doc.items:
        feasibility = item.custom_feasibility
        if feasibility not in grouped_sites:
            grouped_sites[feasibility] = {
                "circuit_id": feasibility,
                "site_name": item.custom_site_info,
                "order_type": item.custom_order_type,  # Fetch the custom_order_type here
                "items": []
            }
        grouped_sites[feasibility]["items"].append({
            "item_code": item.item_code,
            "qty": item.qty
        })
    
    # Fetch the associated Project details
    project_doc = None
    if so_doc.project:
        project_doc = frappe.get_doc("Project", so_doc.project)

    # Create Site Doctypes for each group
    for feasibility, site_data in grouped_sites.items():
        # Fetch the Feasibility document using the circuit_id
        feasibility_doc = frappe.get_doc("Feasibility", feasibility)
        if not feasibility_doc:
            frappe.throw(_("Feasibility with circuit_id {0} not found").format(feasibility))
        
        # Create the Site document
        site_doc = frappe.new_doc("Site")
        site_doc.customer = so_doc.customer
        site_doc.customer_po_no = so_doc.po_no
        site_doc.customer_po_date = so_doc.po_date  # Map po_date to customer_po_date in Site
        site_doc.sales_order = so_doc.name          # Map Sales Order name to sales_order in Site
        site_doc.sales_order_amount = so_doc.grand_total  # Map grand_total to sales_order_amount in Site
        site_doc.customer_po_amount = so_doc.custom_customer_purchase_amount  # Map custom_customer_purchase_amount to customer_po_amount
        site_doc.sales_order_date = so_doc.transaction_date  # Map transaction_date to sales_order_date in Site
        site_doc.delivery_date = so_doc.delivery_date
        site_doc.project = so_doc.project
        site_doc.circuit_id = site_data["circuit_id"]
        site_doc.site_name = site_data["site_name"]
        site_doc.order_type = site_data["order_type"]  # Assign custom_order_type to order_type
        
        # Map Feasibility fields to Site fields
        site_doc.street = feasibility_doc.street
        site_doc.city = feasibility_doc.city
        site_doc.country = feasibility_doc.country
        site_doc.pincode = feasibility_doc.pincode
        site_doc.district = feasibility_doc.district
        site_doc.state = feasibility_doc.state
        site_doc.longitude = feasibility_doc.longitude
        site_doc.latitude = feasibility_doc.latitude

        # Map additional fields from Feasibility
        site_doc.contact_person = feasibility_doc.contact_person
        site_doc.contact_mobile = feasibility_doc.contact_mobile
        site_doc.email_id = feasibility_doc.email_id
        site_doc.designation = feasibility_doc.designation
        site_doc.department = feasibility_doc.department
        site_doc.other_person = feasibility_doc.other_person
        site_doc.other_mobile = feasibility_doc.other_mobile
        site_doc.other_email_id = feasibility_doc.other_email_id
        site_doc.other_designation = feasibility_doc.other_designation
        site_doc.other_department = feasibility_doc.other_department

        # Map fields from Project to Site (if project exists)
        if project_doc:
            site_doc.project_name = project_doc.project_name
            site_doc.expected_start_date = project_doc.expected_start_date
            site_doc.expected_end_date = project_doc.expected_end_date

        # Validate that the 'site_item' field exists in the Site Doctype
        if not hasattr(site_doc, "site_item"):
            frappe.throw(_("The 'site_item' field is missing in the Site Doctype. Please ensure the field is correctly defined."))

        # Add items to Site Item child table
        for item in site_data["items"]:
            site_doc.append("site_item", {
                "item_code": item["item_code"],
                "qty": item["qty"]
            })

        # Save the new Site document
        site_doc.insert(ignore_permissions=True)
        frappe.db.commit()

    return {"status": "success"}

########################################################################3
#STOCK BALANCE
#########################################################################

import frappe

@frappe.whitelist()
def get_stock_details(item_code, warehouse):
    """
    Fetch stock balance and reserved stock for the given item and warehouse.
    """
    if not item_code or not warehouse:
        return {"item_balance": 0, "item_reserved": 0}

    # Fetch stock details for the specified item and warehouse
    stock_details = frappe.db.get_value(
        "Bin", 
        {"item_code": item_code, "warehouse": warehouse}, 
        ["actual_qty", "reserved_qty"], 
        as_dict=True
    )

    if stock_details:
        return {
            "item_balance": stock_details.get("actual_qty", 0),
            "item_reserved": stock_details.get("reserved_qty", 0),
        }
    
    return {"item_balance": 0, "item_reserved": 0}

###################################################################################
#STICK STOCK
###################################################################################
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

############################################################################
