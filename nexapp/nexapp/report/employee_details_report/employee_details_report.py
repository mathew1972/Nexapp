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
			"fieldname": "employee_name",
			"label": _("Full Name"),
			"fieldtype": "Data",
			"width": 180
		},
		{
			"fieldname": "gender",
			"label": _("Gender"),
			"fieldtype": "Link",
			"options": "Gender",
			"width": 100
		},
		{
			"fieldname": "date_of_joining",
			"label": _("Date of Joining"),
			"fieldtype": "Date",
			"width": 120
		},
		{
			"fieldname": "designation",
			"label": _("Designation"),
			"fieldtype": "Link",
			"options": "Designation",
			"width": 160
		},
		{
			"fieldname": "branch",
			"label": _("Branch"),
			"fieldtype": "Link",
			"options": "Branch",
			"width": 140
		},
		{
			"fieldname": "department",
			"label": _("Department"),
			"fieldtype": "Link",
			"options": "Department",
			"width": 160
		},
		{
			"fieldname": "reports_to",
			"label": _("Reports to"),
			"fieldtype": "Link",
			"options": "Employee",
			"width": 160
		},
		{
			"fieldname": "employment_type",
			"label": _("Employment Type"),
			"fieldtype": "Link",
			"options": "Employment Type",
			"width": 140
		},
		{
			"fieldname": "grade",
			"label": _("Grade"),
			"fieldtype": "Link",
			"options": "Employee Grade",
			"width": 120
		},
		{
			"fieldname": "custom_sub_grade",
			"label": _("Sub Grade"),
			"fieldtype": "Data",
			"width": 120
		},
		{
			"fieldname": "custom_level",
			"label": _("Level"),
			"fieldtype": "Link",
			"options": "Employee Level",
			"width": 120
		},
		{
			"fieldname": "status",
			"label": _("Status"),
			"fieldtype": "Select",
			"width": 100
		}
	]

def get_data(filters):
	query_filters = {}
	if isinstance(filters, dict):
		for key, val in filters.items():
			if val:
				query_filters[key] = val

	data = frappe.db.get_all("Employee",
		fields=[
			"employee_name", "gender", "date_of_joining", "designation",
			"branch", "department", "reports_to", "employment_type",
			"grade", "custom_sub_grade", "custom_level", "status"
		],
		filters=query_filters,
		order_by="employee_name"
	)
	return data
