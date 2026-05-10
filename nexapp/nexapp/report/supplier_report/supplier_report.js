// Copyright (c) 2024, Nexapp Technologies and contributors
// For license information, please see license.txt

frappe.query_reports["Supplier Report"] = {
    "filters": [
        {
            "fieldname": "supplier_name",
            "label": __("Supplier Name"),
            "fieldtype": "Link",
            "options": "Supplier"
        },
        {
            "fieldname": "supplier_group",
            "label": __("Supplier Group"),
            "fieldtype": "Link",
            "options": "Supplier Group",
            "default": "ISP"
        },
        {
            "fieldname": "status",
            "label": __("Status"),
            "fieldtype": "Select",
            "options": "\nActive\nDisabled",
            "default": "Active"
        },
        {
            "fieldname": "from_date",
            "label": __("From Date"),
            "fieldtype": "Date",
            "default": frappe.datetime.add_months(frappe.datetime.get_today(), -1)
        },
        {
            "fieldname": "to_date",
            "label": __("To Date"),
            "fieldtype": "Date",
            "default": frappe.datetime.get_today()
        }
    ],
    "onload": function (report) {
        if (frappe.user.has_role(['Projects User', 'Projects Manager'])) {
            report.get_filter('supplier_group').set_value('ISP');
            report.get_filter('supplier_group').df.read_only = 1;
            report.get_filter('supplier_group').refresh();
        }
    }
};
