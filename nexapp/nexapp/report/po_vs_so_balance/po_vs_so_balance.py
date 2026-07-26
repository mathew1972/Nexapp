# Copyright (c) 2026, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt, formatdate


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {
            "fieldname": "customer",
            "label": "Customer",
            "fieldtype": "Link",
            "options": "Customer",
            "width": 150
        },
        {
            "fieldname": "purchase_order_no",
            "label": "Purchase Order No",
            "fieldtype": "Data",
            "width": 150
        },
        {
            "fieldname": "purchase_order_date",
            "label": "Purchase Order Date",
            "fieldtype": "Date",
            "width": 120
        },
        {
            "fieldname": "po_amount",
            "label": "PO Amount",
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "so_details",
            "label": "SO No / SO Date / SO Amount",
            "fieldtype": "Text",
            "width": 250
        },
        {
            "fieldname": "so_total_amount",
            "label": "SO Total Amount",
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "balance_amount",
            "label": "Balance Amount",
            "fieldtype": "Currency",
            "width": 130
        }
    ]

def get_data(filters):
    conditions = ""
    if filters and filters.get("customer"):
        conditions += f" AND t.custom_customer = '{filters.get('customer')}'"

    # Fetch Tasks that have a PO Number OR have a linked SO with a PO Number
    tasks_query = f"""
        SELECT 
            name as task_id,
            custom_customer as customer,
            custom_customer_po_number as purchase_order_no,
            custom_customer_po_date as purchase_order_date,
            custom_po_amount as po_amount
        FROM 
            `tabTask` t
        WHERE 
            (
                (t.custom_customer_po_number IS NOT NULL AND t.custom_customer_po_number != '')
                OR
                t.name IN (
                    SELECT custom_task 
                    FROM `tabSales Order` 
                    WHERE docstatus = 1 
                      AND po_no IS NOT NULL AND po_no != ''
                )
            )
            {conditions}
    """
    tasks = frappe.db.sql(tasks_query, as_dict=True)

    if not tasks:
        return []

    # Fetch linked Sales Orders where custom_task = Task name
    task_names = [t.task_id for t in tasks]
    so_query = """
        SELECT 
            name as so_no, 
            transaction_date as so_date, 
            rounded_total as so_amount, 
            custom_task as task_id,
            custom_customer_purchase_amount,
            po_no,
            po_date
        FROM 
            `tabSales Order`
        WHERE 
            docstatus = 1 
            AND custom_task IN %s
    """
    sales_orders = frappe.db.sql(so_query, (task_names,), as_dict=True)

    # Map SOs to Tasks
    so_map = {}
    for so in sales_orders:
        if so.task_id not in so_map:
            so_map[so.task_id] = []
        so_map[so.task_id].append(so)

    # Group by Resolved PO Number
    po_grouping = {}

    for t in tasks:
        sos = so_map.get(t.task_id, [])

        po_amount = flt(t.po_amount)
        purchase_order_no = t.purchase_order_no
        purchase_order_date = t.purchase_order_date
        
        so_purchase_amount = 0.0
        so_po_no = ""
        so_po_date = None

        for so in sos:
            # Fetch the customer purchase amount from SO if it exists
            if so.custom_customer_purchase_amount and so_purchase_amount == 0:
                so_purchase_amount = flt(so.custom_customer_purchase_amount)
                so_po_no = so.po_no
                so_po_date = so.po_date

        # Fallback to SO Customer Purchase Amount and PO Details if PO Amount is 0
        if po_amount == 0 and so_purchase_amount > 0:
            po_amount = so_purchase_amount
            if so_po_no:
                purchase_order_no = so_po_no
            if so_po_date:
                purchase_order_date = so_po_date

        if not purchase_order_no:
            continue # Skip if we still don't have a PO Number

        if purchase_order_no not in po_grouping:
            po_grouping[purchase_order_no] = {
                "customer": t.customer,
                "purchase_order_no": purchase_order_no,
                "purchase_order_date": purchase_order_date,
                "po_amount": po_amount, # Set initial PO Amount
                "sos": []
            }
        else:
            # Update PO amount if the existing one is 0 and we found a valid one
            if po_grouping[purchase_order_no]["po_amount"] == 0 and po_amount > 0:
                po_grouping[purchase_order_no]["po_amount"] = po_amount

        # Append all SOs for this Task into the PO Group
        for so in sos:
            po_grouping[purchase_order_no]["sos"].append(so)

    # Prepare Final Data
    data = []
    for po_no, group in po_grouping.items():
        so_details_list = []
        so_total_amount = 0.0

        for so in group["sos"]:
            date_str = formatdate(so.so_date) if so.so_date else ''
            so_amount_str = frappe.utils.fmt_money(so.so_amount)
            so_details_list.append(f"{so.so_no} / {date_str} / {so_amount_str}")
            
            so_total_amount += flt(so.so_amount)

        balance_amount = group["po_amount"] - so_total_amount

        data.append({
            "customer": group["customer"],
            "purchase_order_no": group["purchase_order_no"],
            "purchase_order_date": group["purchase_order_date"],
            "po_amount": group["po_amount"],
            "so_details": "\n".join(so_details_list) if so_details_list else "",
            "so_total_amount": so_total_amount,
            "balance_amount": balance_amount
        })

    return data
