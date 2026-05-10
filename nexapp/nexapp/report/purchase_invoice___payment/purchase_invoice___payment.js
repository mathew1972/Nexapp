// Copyright (c) 2024, Nexapp and contributors
// For license information, please see license.txt

frappe.query_reports["Purchase Invoice - Payment"] = {
    "filters": [
        {
            "fieldname": "status",
            "label": __("Status"),
            "fieldtype": "Select",
            "options": "\nDraft\nOpen\nPaid\nUnpaid\nOverdue\nCancelled\nPart Paid",
            "default": "Open"
        },
        {
            "fieldname": "supplier",
            "label": __("Supplier"),
            "fieldtype": "Link",
            "options": "Supplier"
        },
        {
            "fieldname": "duration_from",
            "label": __("Duration From"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "duration_to",
            "label": __("Duration To"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "posting_date_from",
            "label": __("Posting Date From"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "posting_date_to",
            "label": __("Posting Date To"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "supplier_group",
            "label": __("Supplier Group"),
            "fieldtype": "Link",
            "options": "Supplier Group"
        },
        {
            "fieldname": "company",
            "label": __("Company"),
            "fieldtype": "Link",
            "options": "Company",
            "default": "Nexapp Technologies Private Limited"
        }
    ]
};
