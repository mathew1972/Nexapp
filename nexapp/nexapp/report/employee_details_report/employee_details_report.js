// Copyright (c) 2026, Nexapp and contributors
// For license information, please see license.txt

frappe.query_reports["Employee Details Report"] = {
    "filters": [
        {
            "fieldname": "company",
            "label": __("Company"),
            "fieldtype": "Link",
            "options": "Company",
            "default": frappe.defaults.get_user_default("Company")
        },
        {
            "fieldname": "status",
            "label": __("Status"),
            "fieldtype": "Select",
            "options": "\nActive\nInactive\nSuspended\nLeft",
            "default": "Active"
        },
        {
            "fieldname": "department",
            "label": __("Department"),
            "fieldtype": "Link",
            "options": "Department"
        },
        {
            "fieldname": "branch",
            "label": __("Branch"),
            "fieldtype": "Link",
            "options": "Branch"
        },
        {
            "fieldname": "designation",
            "label": __("Designation"),
            "fieldtype": "Link",
            "options": "Designation"
        }
    ]
};
