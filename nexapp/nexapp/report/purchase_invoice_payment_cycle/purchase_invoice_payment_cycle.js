// Copyright (c) 2026, Nexapp and contributors
// For license information, please see license.txt

frappe.query_reports["Purchase Invoice Payment Cycle"] = {
    "filters": [
        {
            "fieldname": "company",
            "label": __("Company"),
            "fieldtype": "Link",
            "options": "Company",
            "default": "Nexapp Technologies Private Limited"
        },
        {
            "fieldname": "supplier",
            "label": __("Supplier"),
            "fieldtype": "Link",
            "options": "Supplier"
        },
        {
            "fieldname": "status",
            "label": __("Status"),
            "fieldtype": "Select",
            "options": "\nDraft\nBilled\nCancelled\nOverdue\nPaid\nPartly Paid\nReturn\nUnpaid\nUnpaid and Overdue"
        },
        {
            "fieldname": "customer",
            "label": __("Customer"),
            "fieldtype": "Link",
            "options": "Customer"
        }
    ]
};
