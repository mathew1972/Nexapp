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
            "qty": item.qty,
            "item_name": item.item_name
            
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
                "qty": item["qty"],
                "item_name": item["item_name"]                
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
    # 4. The document status is 'Submitted' (docstatus = 1).
    feasibilities = frappe.get_all('Feasibility', filters={
        'customer': customer,
        'feasibility_status': ['in', feasibility_statuses],
        'sales_order': ['in', [None, '', 'null']],  # Ensure the sales_order is empty or null
        'docstatus': 1  # Ensure the document is 'Submitted'
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

############################################################################3
@frappe.whitelist()
def update_serial_and_batch_entry_and_provisioning_item(serial_and_batch_bundle, custom_circuit_id):
    """
    Updates the custom_circuit field in Serial and Batch Entry based on the Serial and Batch Bundle.
    Also checks and updates the serial_number and product_code in Provisioning Item under the Site Doctype if circuit_id matches.
    """
    try:
        # Check if Serial and Batch Bundle exists
        serial_and_batch_bundle_doc = frappe.get_doc("Serial and Batch Bundle", serial_and_batch_bundle)
        if not serial_and_batch_bundle_doc:
            message = f"Serial and Batch Bundle '{serial_and_batch_bundle}' not found."
            frappe.log_error(message, "Serial and Batch Entry Update")
            return message

        # Fetch the item_code from the Serial and Batch Bundle
        item_code = serial_and_batch_bundle_doc.item_code
        if not item_code:
            message = "Item Code is missing in Serial and Batch Bundle."
            frappe.log_error(message, "Serial and Batch Entry Update")
            return message

        # Iterate over the Serial and Batch Entry child table and update 'custom_circuit'
        for entry in serial_and_batch_bundle_doc.entries:
            serial_no = entry.serial_no  # Fetch the serial_no for the entry
            
            # Update the custom_circuit field in Serial and Batch Entry
            frappe.db.set_value(
                "Serial and Batch Entry",
                entry.name,  # Entry name in Serial and Batch Entry table
                "custom_circuit",
                custom_circuit_id
            )

            # Check if 'Site' exists where circuit_id matches the custom_circuit_id
            site_doc = frappe.db.get_value("Site", {"circuit_id": custom_circuit_id}, "name")
            if site_doc:
                # Fetch the Site document
                site_doc = frappe.get_doc("Site", site_doc)

                # Check if 'product_code' is missing in the Provisioning Item child table and update
                provisioning_item = site_doc.provisioning_item
                serial_numbers = [item.serial_number for item in provisioning_item]

                # Only update if serial_number is not already present
                if serial_no not in serial_numbers:
                    # Append the new serial_no and item_code to the Provisioning Item child table
                    new_item = site_doc.append("provisioning_item", {})
                    new_item.serial_number = serial_no
                    new_item.product_code = item_code  # Set the product_code from the Serial and Batch Bundle
                    
                # Save the updated Site document
                site_doc.save()

        frappe.db.commit()  # Commit the transaction
        return "success"

    except Exception as e:
        error_message = f"Error in update_serial_and_batch_entry_and_provisioning_item: {str(e)}"
        frappe.log_error(frappe.get_traceback(), error_message)
        return f"error: {str(e)}"
##########################################################################
import frappe

@frappe.whitelist()
def update_logistics(shipment):
    try:
        shipment_data = frappe.parse_json(shipment)
        frappe.log_error(shipment_data, "Debug - Shipment Data Received")  # Log the received shipment data
        
        # Get details from Shipment
        carrier = shipment_data.get("carrier")  
        awb_number = shipment_data.get("awb_number")
        tracking_status = shipment_data.get("tracking_status")
        pickup_date = shipment_data.get("pickup_date")
        shipment_sites = shipment_data.get("shipment_site")  # Child table entries
        
        # Debug the shipment sites data
        frappe.log_error(shipment_sites, "Debug - Shipment Sites")

        if not shipment_sites:
            frappe.throw("No Shipment Sites found to process.")
        
        for site in shipment_sites:
            circuit_id = site.get("circuit_id")
            frappe.log_error(circuit_id, "Debug - Circuit ID")  # Log circuit ID
            if not circuit_id:
                continue

            # Find matching Logistics child rows by circuit_id
            logistics_entries = frappe.get_all("Logistics", filters={}, fields=["name"])
            frappe.log_error(logistics_entries, "Debug - Logistics Entries")  # Log fetched logistics entries
            
            for entry in logistics_entries:
                logistics_doc = frappe.get_doc("Logistics", entry.name)
                frappe.log_error(logistics_doc, "Debug - Logistics Document")  # Log the logistics document
                
                for row in logistics_doc.get("logistics"):
                    frappe.log_error(row.circuit_id, "Debug - Row Circuit ID")  # Log each row's circuit ID
                    if row.circuit_id == circuit_id:
                        # Update matching row
                        row.carrier = carrier
                        row.awb_number = awb_number
                        row.tracking_status = tracking_status
                        row.pickup_date = pickup_date

                        logistics_doc.save()
                        frappe.db.commit()  # Commit the changes
                        frappe.log_error("Logistics entry updated successfully", "Debug - Update Success")
                        break
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Debug - Update Logistics Error")
        raise e
