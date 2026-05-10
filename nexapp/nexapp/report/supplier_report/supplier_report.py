# Copyright (c) 2024, Nexapp Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
	columns, data = [], []
	
	# Enforce Supplier Group restriction for Projects User and Projects Manager
	user_roles = frappe.get_roles()
	if "Projects User" in user_roles or "Projects Manager" in user_roles:
		filters["supplier_group"] = "ISP"
	
	columns = get_columns()
	data = get_data(filters)
	
	return columns, data

def get_columns():
	return [
		{
			"label": _("Supplier Name"),
			"fieldname": "supplier_name",
			"fieldtype": "Link",
			"options": "Supplier",
			"width": 250
		},
		{
			"label": _("Supplier Group"),
			"fieldname": "supplier_group",
			"fieldtype": "Link",
			"options": "Supplier Group",
			"width": 180
		},
		{
			"label": _("GST Category"),
			"fieldname": "gst_category",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("GSTIN / UIN"),
			"fieldname": "gstin",
			"fieldtype": "Data",
			"width": 150
		},
		{
			"label": _("PAN"),
			"fieldname": "pan",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Payment Mode"),
			"fieldname": "custom_payment_mode",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Is MSME"),
			"fieldname": "custom_is_msme",
			"fieldtype": "Check",
			"width": 100
		},
		{
			"label": _("Address"),
			"fieldname": "primary_address",
			"fieldtype": "Text",
			"width": 200
		},
		{
			"label": _("Primary Contact"),
			"fieldname": "supplier_primary_contact",
			"fieldtype": "Link",
			"options": "Contact",
			"width": 150
		},
		{
			"label": _("Email"),
			"fieldname": "email_id",
			"fieldtype": "Data",
			"width": 150
		},
		{
			"label": _("Mobile No"),
			"fieldname": "mobile_no",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Status"),
			"fieldname": "status",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Record Created"),
			"fieldname": "creation",
			"fieldtype": "Datetime",
			"width": 160
		}
	]

def get_data(filters):
	conditions = get_conditions(filters)
	
	data = frappe.db.sql(f"""
		SELECT
			creation,
			supplier_name,
			supplier_group,
			primary_address,
			supplier_primary_contact,
			email_id,
			mobile_no,
			gst_category,
			gstin,
			pan,
			custom_payment_mode,
			custom_is_msme,
			CASE WHEN disabled = 1 THEN 'Disabled' ELSE 'Active' END as status
		FROM
			`tabSupplier`
		WHERE
			{conditions}
		ORDER BY
			creation DESC
	""", filters, as_dict=1)
	
	return data

def get_conditions(filters):
	conditions = ["1=1"]
	
	if filters.get("supplier_name"):
		conditions.append("supplier_name = %(supplier_name)s")
	
	if filters.get("supplier_group"):
		conditions.append("supplier_group = %(supplier_group)s")
	
	if filters.get("status"):
		if filters.get("status") == "Active":
			conditions.append("disabled = 0")
		elif filters.get("status") == "Disabled":
			conditions.append("disabled = 1")
			
	if filters.get("from_date"):
		conditions.append("DATE(creation) >= %(from_date)s")
		
	if filters.get("to_date"):
		conditions.append("DATE(creation) <= %(to_date)s")
		
	return " AND ".join(conditions)
