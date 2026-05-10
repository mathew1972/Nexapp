// Copyright (c) 2026, Nexapp and contributors
// For license information, please see license.txt

frappe.query_reports["User Role Permissions Report"] = {
    "filters": [
        {
            "fieldname": "full_name",
            "label": __("Full Name"),
            "fieldtype": "Data"
        },
        {
            "fieldname": "department",
            "label": __("Department"),
            "fieldtype": "Link",
            "options": "Department"
        },
        {
            "fieldname": "role_profile",
            "label": __("Role Profile"),
            "fieldtype": "Link",
            "options": "Role Profile"
        },
        {
            "fieldname": "module_profile",
            "label": __("Module Profile"),
            "fieldtype": "Link",
            "options": "Module Profile"
        },
        {
            "fieldname": "user_status",
            "label": __("User Status"),
            "fieldtype": "Select",
            "options": ["", "Active", "Disabled"]
        },
        {
            "fieldname": "document_type",
            "label": __("Document Type"),
            "fieldtype": "Link",
            "options": "DocType"
        }
    ]
};
