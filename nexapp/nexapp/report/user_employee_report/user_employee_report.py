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
			"fieldname": "full_name",
			"label": _("Full Name"),
			"fieldtype": "Data",
			"width": 150
		},
		{
			"fieldname": "email",
			"label": _("Email"),
			"fieldtype": "Data",
			"width": 180
		},
		{
			"fieldname": "role_profile_name",
			"label": _("Role Profile"),
		},
		{
			"fieldname": "module_profile",
			"label": _("Module Profile"),
			"fieldtype": "Link",
			"options": "Module Profile",
			"width": 150
		},
		{
			"fieldname": "user_status",
			"label": _("User Status"),
			"fieldtype": "Data",
			"width": 100
		},
		{
			"fieldname": "department",
			"label": _("Department"),
			"fieldtype": "Link",
			"options": "Department",
			"width": 120
		},
		{
			"fieldname": "designation",
			"label": _("Designation"),
			"fieldtype": "Link",
			"options": "Designation",
			"width": 120
		},
		{
			"fieldname": "reports_to",
			"label": _("Reports to"),
			"fieldtype": "Data",
			"width": 150
		},
		{
			"fieldname": "expense_approver",
			"label": _("Expense Approver"),
			"fieldtype": "Data",
			"width": 150
		},
		{
			"fieldname": "leave_approver",
			"label": _("Leave Approver"),
			"fieldtype": "Data",
			"width": 150
		},
		{
			"fieldname": "shift_request_approver",
			"label": _("Shift Request Approver"),
			"fieldtype": "Data",
			"width": 150
		},
		{
			"fieldname": "employment_type",
			"label": _("Employment Type"),
			"fieldtype": "Link",
			"options": "Employment Type",
			"width": 120
		},
		{
			"fieldname": "employee_status",
			"label": _("Employee Status"),
			"fieldtype": "Data",
			"width": 120
		}
	]

def get_data(filters):
	conditions = []
	values = {}
	
	if filters.get("department"):
		conditions.append("e.department = %(department)s")
		values["department"] = filters.get("department")
		
	if filters.get("designation"):
		conditions.append("e.designation = %(designation)s")
		values["designation"] = filters.get("designation")

	if filters.get("role_profile"):
		conditions.append("u.role_profile_name = %(role_profile)s")
		values["role_profile"] = filters.get("role_profile")

	if filters.get("module_profile"):
		conditions.append("u.module_profile = %(module_profile)s")
		values["module_profile"] = filters.get("module_profile")

	if filters.get("user_status"):
		status_val = 1 if filters.get("user_status") == "Active" else 0
		conditions.append("u.enabled = %(user_status_val)s")
		values["user_status_val"] = status_val

	if filters.get("reports_to"):
		conditions.append("e.reports_to = %(reports_to)s")
		values["reports_to"] = filters.get("reports_to")

	if filters.get("employee_status"):
		conditions.append("e.status = %(employee_status)s")
		values["employee_status"] = filters.get("employee_status")

	if filters.get("full_name"):
		conditions.append("u.full_name LIKE %(full_name)s")
		values["full_name"] = f"%{filters.get('full_name')}%"
		
	where_clause = ""
	if conditions:
		where_clause = " WHERE " + " AND ".join(conditions)

	data = frappe.db.sql(f"""
		SELECT
			u.full_name,
			u.email,
			u.role_profile_name,
			u.module_profile,
			CASE WHEN u.enabled=1 THEN 'Active' ELSE 'Disabled' END as user_status,
			e.department,
			e.designation,
			er.employee_name as reports_to,
			ea.full_name as expense_approver,
			la.full_name as leave_approver,
			sa.full_name as shift_request_approver,
			e.employment_type,
			e.status as employee_status
		FROM
			`tabUser` u
		LEFT JOIN
			`tabEmployee` e ON e.user_id = u.email
		LEFT JOIN
			`tabEmployee` er ON e.reports_to = er.name
		LEFT JOIN
			`tabUser` ea ON e.expense_approver = ea.email
		LEFT JOIN
			`tabUser` la ON e.leave_approver = la.email
		LEFT JOIN
			`tabUser` sa ON e.shift_request_approver = sa.email
		{where_clause}
		ORDER BY
			u.full_name ASC
	""", values, as_dict=True)
	
	return data
