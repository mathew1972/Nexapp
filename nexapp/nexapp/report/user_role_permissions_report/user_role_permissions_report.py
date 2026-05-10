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
		# User/Employee Section (Yellow)
		{"fieldname": "full_name", "label": _("Full Name"), "fieldtype": "Data", "width": 150},
		{"fieldname": "designation", "label": _("Designation"), "fieldtype": "Link", "options": "Designation", "width": 120},
		{"fieldname": "department", "label": _("Department"), "fieldtype": "Link", "options": "Department", "width": 120},
		{"fieldname": "role_profile", "label": _("Role Profile"), "fieldtype": "Link", "options": "Role Profile", "width": 120},
		{"fieldname": "module_profile", "label": _("Module Profile"), "fieldtype": "Link", "options": "Module Profile", "width": 120},
		{"fieldname": "user_status", "label": _("User Status"), "fieldtype": "Data", "width": 100},
		
		# Permissions Section (Green)
		{"fieldname": "doctype_name", "label": _("Document Type"), "fieldtype": "Link", "options": "DocType", "width": 150},
		# Note: We include Role name to distinguish permissions if not aggregated, 
		# but the user didn't explicitly ask for it in the screenshot. 
		# However, "join Role Profile / Role" implies per-role permissions.
		{"fieldname": "role", "label": _("Role"), "fieldtype": "Link", "options": "Role", "width": 120},
		{"fieldname": "if_owner", "label": _("If Owner"), "fieldtype": "Check", "width": 80},
		{"fieldname": "permlevel", "label": _("Level"), "fieldtype": "Int", "width": 60},
		{"fieldname": "read", "label": _("Read"), "fieldtype": "Check", "width": 60},
		{"fieldname": "write", "label": _("Write"), "fieldtype": "Check", "width": 60},
		{"fieldname": "create", "label": _("Create"), "fieldtype": "Check", "width": 60},
		{"fieldname": "delete", "label": _("Delete"), "fieldtype": "Check", "width": 60},
		{"fieldname": "submit", "label": _("Submit"), "fieldtype": "Check", "width": 60},
		{"fieldname": "cancel", "label": _("Cancel"), "fieldtype": "Check", "width": 60},
		{"fieldname": "amend", "label": _("Amend"), "fieldtype": "Check", "width": 60},
		{"fieldname": "report", "label": _("Report"), "fieldtype": "Check", "width": 60},
		{"fieldname": "export", "label": _("Export"), "fieldtype": "Check", "width": 60},
		{"fieldname": "import", "label": _("Import"), "fieldtype": "Check", "width": 60},
		{"fieldname": "share", "label": _("Share"), "fieldtype": "Check", "width": 60},
		{"fieldname": "print", "label": _("Print"), "fieldtype": "Check", "width": 60},
		{"fieldname": "email", "label": _("Email"), "fieldtype": "Check", "width": 60}
	]

def get_data(filters):
	data = []
	
	users = get_users(filters)
	if not users:
		return []

	# Get Roles for each User's Role Profile
	role_profiles = list(set([u.role_profile for u in users if u.role_profile]))
	roles_by_profile = {}
	if role_profiles:
		profile_roles = frappe.db.get_all("Has Role", 
			filters={"parent": ["in", role_profiles], "parenttype": "Role Profile"},
			fields=["parent", "role"]
		)
		for pr in profile_roles:
			if pr.parent not in roles_by_profile:
				roles_by_profile[pr.parent] = []
			roles_by_profile[pr.parent].append(pr.role)

	# Fetch Permissions
	all_roles = []
	for u in users:
		if u.role_profile and u.role_profile in roles_by_profile:
			all_roles.extend(roles_by_profile[u.role_profile])
	
	all_roles = list(set(all_roles))
	if not all_roles:
		return []

	perm_filters = {"role": ["in", all_roles]}
	if filters.get("document_type"):
		perm_filters["parent"] = filters.get("document_type")

	# Logic similar to role_permissions_report.py
	custom_perms = frappe.db.get_all("Custom DocPerm",
		fields=["parent as doctype_name", "role", "if_owner", "permlevel", "read", "write", "create", 
				"delete", "submit", "cancel", "amend", "report", "export", 
				"import", "share", "print", "email"],
		filters=perm_filters
	)
	
	custom_doctypes = list(set([p.doctype_name for p in custom_perms]))
	
	# Fetch Standard Permissions for doctypes not overridden by custom ones
	standard_filters = perm_filters.copy()
	if custom_doctypes and not filters.get("document_type"):
		# If no document_type filter, we need to handle overrides per doctype.
		# This is complex in a single query. We'll fetch all and filter in Python.
		pass
	
	standard_perms = frappe.db.get_all("DocPerm",
		fields=["parent as doctype_name", "role", "if_owner", "permlevel", "read", "write", "create", 
				"delete", "submit", "cancel", "amend", "report", "export", 
				"import", "share", "print", "email"],
		filters=standard_filters
	)

	# Combine permissions: Custom DocPerm overrides DocPerm for a (DocType, Role)
	perms_by_key = {} # (doctype, role) -> perm dict
	
	# Sort standard first, then overwrite with custom
	for p in standard_perms:
		perms_by_key[(p.doctype_name, p.role, p.permlevel)] = p
	
	for p in custom_perms:
		perms_by_key[(p.doctype_name, p.role, p.permlevel)] = p

	# Final Join
	for u in users:
		user_roles = roles_by_profile.get(u.role_profile, [])
		if not user_roles:
			continue
			
		for role in user_roles:
			# Find all permissions for this role
			for key, perm in perms_by_key.items():
				p_doctype, p_role, p_level = key
				if p_role == role:
					row = u.copy()
					row.update(perm)
					data.append(row)

	return data

def get_users(filters):
	conditions = []
	values = {}
	
	if filters.get("department"):
		conditions.append("e.department = %(department)s")
		values["department"] = filters.get("department")
		
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

	if filters.get("full_name"):
		conditions.append("u.full_name LIKE %(full_name)s")
		values["full_name"] = f"%{filters.get('full_name')}%"
		
	where_clause = ""
	if conditions:
		where_clause = " WHERE " + " AND ".join(conditions)

	return frappe.db.sql(f"""
		SELECT
			u.full_name,
			e.designation,
			e.department,
			u.role_profile_name as role_profile,
			u.module_profile,
			CASE WHEN u.enabled=1 THEN 'Active' ELSE 'Disabled' END as user_status
		FROM
			`tabUser` u
		LEFT JOIN
			`tabEmployee` e ON e.user_id = u.email
		{where_clause}
		ORDER BY
			u.full_name ASC
	""", values, as_dict=True)
