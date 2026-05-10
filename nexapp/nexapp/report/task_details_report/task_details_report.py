# Copyright (c) 2026, Nexapp and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import formatdate

def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data

def get_columns():
	return [
		{"fieldname": "name", "label": _("Task ID"), "fieldtype": "Link", "options": "Task", "width": 150},
		{"fieldname": "type", "label": _("Task Type"), "fieldtype": "Data", "width": 120},
		{"fieldname": "custom_customer", "label": _("Customer"), "fieldtype": "Link", "options": "Customer", "width": 180},
		{"fieldname": "subject", "label": _("Subject"), "fieldtype": "Data", "width": 200},
		{"fieldname": "status", "label": _("Status"), "fieldtype": "Data", "width": 100},
		{"fieldname": "completed_by_name", "label": _("Completed By"), "fieldtype": "Data", "width": 150},
		{"fieldname": "completed_on", "label": _("Completed On"), "fieldtype": "Datetime", "width": 150},
		{"fieldname": "formatted_creation", "label": _("Created On"), "fieldtype": "Data", "width": 120},
		{"fieldname": "owner_name", "label": _("Owner"), "fieldtype": "Data", "width": 180},
		{"fieldname": "priority", "label": _("Priority"), "fieldtype": "Data", "width": 100},
		{"fieldname": "department", "label": _("Department"), "fieldtype": "Link", "options": "Department", "width": 150},
		{"fieldname": "timeline", "label": _("Timeline"), "fieldtype": "Data", "width": 150}
	]

def get_data(filters):
	conditions = []
	values = {}

	# Department restriction for non-System Managers
	if "System Manager" not in frappe.get_roles():
		user_dept = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "department")
		if user_dept:
			conditions.append("t.department = %(user_dept)s")
			values["user_dept"] = user_dept
		elif frappe.session.user != "Administrator":
			# If non-admin user has no department linked, they shouldn't see anything if restriction is active
			return []

	if filters.get("type"):
		conditions.append("t.type = %(type)s")
		values["type"] = filters.get("type")

	if filters.get("custom_customer"):
		conditions.append("t.custom_customer = %(custom_customer)s")
		values["custom_customer"] = filters.get("custom_customer")

	if filters.get("custom_owner"):
		conditions.append("t.custom_owner = %(custom_owner)s")
		values["custom_owner"] = filters.get("custom_owner")

	if filters.get("status"):
		conditions.append("t.status = %(status)s")
		values["status"] = filters.get("status")

	if filters.get("department"):
		conditions.append("t.department = %(department)s")
		values["department"] = filters.get("department")

	if filters.get("from_date"):
		conditions.append("DATE(t.creation) >= %(from_date)s")
		values["from_date"] = filters.get("from_date")

	if filters.get("to_date"):
		conditions.append("DATE(t.creation) <= %(to_date)s")
		values["to_date"] = filters.get("to_date")

	where_clause = ""
	if conditions:
		where_clause = " WHERE " + " AND ".join(conditions)

	data = frappe.db.sql(f"""
		SELECT
			t.name,
			t.type,
			t.custom_customer,
			t.subject,
			t.status,
			e_comp.employee_name as completed_by_name,
			t.completed_on,
			t.creation,
			u_own.full_name as owner_name,
			t.priority,
			t.department
		FROM
			`tabTask` t
		LEFT JOIN
			`tabUser` u_own ON t.custom_owner = u_own.email
		LEFT JOIN
			`tabEmployee` e_comp ON t.completed_by = e_comp.name
		{where_clause}
		ORDER BY
			t.creation DESC
	""", values, as_dict=True)

	for row in data:
		# Format Created On as DD-MM-YYYY
		if row.get("creation"):
			row["formatted_creation"] = row["creation"].strftime("%d-%m-%Y")
		
		# Calculate Timeline (Days, Hours, Minutes)
		if row.get("creation") and row.get("completed_on"):
			duration = row["completed_on"] - row["creation"]
			total_seconds = duration.total_seconds()
			if total_seconds > 0:
				days, remainder = divmod(total_seconds, 86400)
				hours, remainder = divmod(remainder, 3600)
				minutes, seconds = divmod(remainder, 60)
				
				parts = []
				if days > 0:
					parts.append(f"{int(days)}d")
				if hours > 0 or days > 0:
					parts.append(f"{int(hours):02}h")
				parts.append(f"{int(minutes):02}m")
				
				row["timeline"] = " ".join(parts)
			else:
				row["timeline"] = "00m"
		
	return data
