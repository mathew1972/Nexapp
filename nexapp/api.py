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
from frappe.utils import now

@frappe.whitelist()
def sales_order_to_site(sales_order):
    # Fetch the Sales Order Document by its name
    so_doc = frappe.get_doc("Sales Order", sales_order)
    
    # Check if the PO Number is present in the Sales Order; raise an error if not
    if not so_doc.po_no:
        frappe.throw(_("Client PO Number is missing in the Sales Order"))
    
    # Dictionary to group items by their custom feasibility
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
        # Add item to the corresponding feasibility group
        grouped_sites[feasibility]["items"].append({
            "item_code": item.item_code,
            "qty": item.qty
        })
    
    # Fetch the associated Project details, if any
    project_doc = None
    if so_doc.project:
        project_doc = frappe.get_doc("Project", so_doc.project)

    # Create Site Doctypes for each grouped feasibility
    for feasibility, site_data in grouped_sites.items():
        # Fetch the Feasibility document using the circuit_id
        feasibility_doc = frappe.get_doc("Feasibility", feasibility)
        
        # Raise an error if the Feasibility document is not found
        if not feasibility_doc:
            frappe.throw(_("Feasibility with circuit_id {0} not found").format(feasibility))
        
        # Update the Feasibility document with Sales Order name and transaction date
        feasibility_doc.sales_order = so_doc.name
        feasibility_doc.sales_order_date = so_doc.transaction_date  # Update the sales_order_date field
        feasibility_doc.save(ignore_permissions=True)

        # Create a new Site document and populate its fields
        site_doc = frappe.new_doc("Site")
        site_doc.customer = so_doc.customer
        site_doc.customer_po_no = so_doc.po_no
        site_doc.customer_po_date = so_doc.po_date  # Map PO date to customer_po_date in Site
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

        # Map additional fields from Feasibility to Site
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
        
        # Map the 'region' and 'phase' fields from Feasibility to Site
        site_doc.region = feasibility_doc.region  # Assign region from Feasibility to Site
        site_doc.phase = feasibility_doc.phase  # Assign phase from Feasibility to Site

        # Map fields from Project to Site (if project exists)
        if project_doc:
            site_doc.project_name = project_doc.project_name
            site_doc.expected_start_date = project_doc.expected_start_date
            site_doc.expected_end_date = project_doc.expected_end_date

        # Validate that the 'site_item' field exists in the Site Doctype
        if not hasattr(site_doc, "site_item"):
            frappe.throw(_("The 'site_item' field is missing in the Site Doctype. Please ensure the field is correctly defined."))

        # Add items to the Site Item child table
        for item in site_data["items"]:
            site_doc.append("site_item", {
                "item_code": item["item_code"],
                "qty": item["qty"]
            })

        # Save the new Site document
        site_doc.insert(ignore_permissions=True)
        frappe.db.commit()

    # Return a success message
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
    feasibilities = frappe.get_all('Feasibility', filters={
        'customer': customer,
        'feasibility_status': ['in', feasibility_statuses],
        'sales_order': ['in', [None, '', 'null']]  # Ensure the sales_order is empty or null
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
from frappe import _

@frappe.whitelist()
def fetch_site_items(custom_circuit_id):
    # Validate input
    if not custom_circuit_id:
        frappe.throw(_("Custom Circuit ID is required."))

    # Fetch the Site document with the matching Circuit ID
    site_doc = frappe.get_all("Site", filters={"circuit_id": custom_circuit_id}, fields=["name"])
    if not site_doc:
        frappe.throw(_("No Site found with Circuit ID: {0}").format(custom_circuit_id))

    # Get the first matching Site document name
    site_name = site_doc[0]["name"]
    site_data = frappe.get_doc("Site", site_name)

    # Ensure the Site has a 'site_item' child table
    if not hasattr(site_data, "site_item"):
        frappe.throw(_("The 'site_item' field is missing in the Site Doctype. Please ensure the field is correctly defined."))

    # Prepare the list of items to return, including item_name
    items = []
    for item in site_data.site_item:
        items.append({
            "product_code": item.item_code or None,
            "qty": item.qty or 0,
            "warehouse": item.warehouse or None,
            "serial_number": item.serial_no or None,
            "item_name": item.item_name or None
            
        })

    # Return the fetched items
    return items
