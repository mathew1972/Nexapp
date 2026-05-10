// Copyright (c) 2026, Nexapp and contributors
// For license information, please see license.txt

frappe.query_reports["User Employee Report"] = {
    "filters": [
        {
            "fieldname": "department",
            "label": __("Department"),
            "fieldtype": "Link",
            "options": "Department"
        },
        {
            "fieldname": "designation",
            "label": __("Designation"),
            "fieldtype": "Link",
            "options": "Designation"
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
            "fieldname": "reports_to",
            "label": __("Reports to"),
            "fieldtype": "Link",
            "options": "Employee"
        },
        {
            "fieldname": "employee_status",
            "label": __("Employee Status"),
            "fieldtype": "Select",
            "options": ["", "Active", "Inactive", "Left", "Suspended"]
        },
        {
            "fieldname": "full_name",
            "label": __("Full Name"),
            "fieldtype": "Data"
        }
    ]
};
