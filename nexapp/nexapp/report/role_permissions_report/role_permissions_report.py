# Copyright (c) 2026, Nexapp and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data

def get_columns():
	return [
		{
			"fieldname": "doctype",
			"label": _("Document Type"),
			"fieldtype": "Link",
			"options": "DocType",
			"width": 150
		},
		{
			"fieldname": "role",
			"label": _("Role"),
			"fieldtype": "Link",
			"options": "Role",
			"width": 150
		},
		{
			"fieldname": "if_owner",
			"label": _("If Owner"),
			"fieldtype": "Check",
			"width": 80
		},
		{
			"fieldname": "permlevel",
			"label": _("Level"),
			"fieldtype": "Int",
			"width": 60
		},
		{
			"fieldname": "read",
			"label": _("Read"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "write",
			"label": _("Write"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "create",
			"label": _("Create"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "delete",
			"label": _("Delete"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "submit",
			"label": _("Submit"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "cancel",
			"label": _("Cancel"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "amend",
			"label": _("Amend"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "report",
			"label": _("Report"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "export",
			"label": _("Export"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "import",
			"label": _("Import"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "share",
			"label": _("Share"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "print",
			"label": _("Print"),
			"fieldtype": "Check",
			"width": 60
		},
		{
			"fieldname": "email",
			"label": _("Email"),
			"fieldtype": "Check",
			"width": 60
		}
	]

def get_data(filters):
	data = []
	
	doctype_filter = filters.get("doctype_filter")
	role_filter = filters.get("role")
	
	# Fetch all doctypes that have custom permissions
	custom_permissions_doctypes = frappe.db.get_all("Custom DocPerm", fields=["parent"], distinct=True)
	custom_doctypes = [d.parent for d in custom_permissions_doctypes]
	
	# Fetch Custom Permissions
	custom_perms = frappe.db.get_all("Custom DocPerm", 
		fields=["parent as doctype", "role", "if_owner", "permlevel", "read", "write", "create", 
				"delete", "submit", "cancel", "amend", "report", "export", 
				"import", "share", "print", "email"],
		filters=get_perm_filters("Custom DocPerm", filters)
	)
	data.extend(custom_perms)
	
	# Fetch Standard Permissions for doctypes that don't have custom ones
	standard_filters = get_perm_filters("DocPerm", filters)
	
	# If no specific doctype filter, exclude doctypes that have custom overrides
	if not doctype_filter:
		standard_filters["parent"] = ["not in", custom_doctypes]
	else:
		# If specific doctype filter is provided, only include standard if not customized
		if doctype_filter in custom_doctypes:
			standard_filters["parent"] = "DO_NOT_INCLUDE" # Custom already added

	if standard_filters.get("parent") != "DO_NOT_INCLUDE":
		standard_perms = frappe.db.get_all("DocPerm",
			fields=["parent as doctype", "role", "if_owner", "permlevel", "read", "write", "create", 
					"delete", "submit", "cancel", "amend", "report", "export", 
					"import", "share", "print", "email"],
			filters=standard_filters
		)
		data.extend(standard_perms)
		
	return data

def get_perm_filters(perm_doctype, filters):
	query_filters = {}
	if filters.get("doctype_filter"):
		query_filters["parent"] = filters.get("doctype_filter")
	if filters.get("role"):
		query_filters["role"] = filters.get("role")
	return query_filters
