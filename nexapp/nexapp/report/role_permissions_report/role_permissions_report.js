// Copyright (c) 2026, Nexapp and contributors
// For license information, please see license.txt

frappe.query_reports["Role Permissions Report"] = {
    "filters": [
        {
            "fieldname": "doctype_filter",
            "label": __("Document Type"),
            "fieldtype": "Link",
            "options": "DocType",
            "get_query": function () {
                return {
                    filters: {
                        "istable": 0,
                        "issingle": 0
                    }
                };
            }
        },
        {
            "fieldname": "role",
            "label": __("Role"),
            "fieldtype": "Link",
            "options": "Role"
        }
    ]
};
