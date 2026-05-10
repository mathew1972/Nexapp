// Copyright (c) 2026, Nexapp and contributors
// For license information, please see license.txt

frappe.query_reports["Delivery Note Shipment Report"] = {
    "filters": [
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
        },
        {
            "fieldname": "customer",
            "label": __("Customer"),
            "fieldtype": "Link",
            "options": "Customer"
        },
        {
            "fieldname": "site_status",
            "label": __("Site Status"),
            "fieldtype": "Select",
            "options": "\nPending\nIn-process\nInstallation Initiated\nOn Hold\nProvisioning\nPartially Provisioning Completed\nProvisioning Completed\nDelivered and Live\nAwaiting Customer Approval\nDisconnection In Process\nDisconnected\nCancelled\nSite Shifted to new location\nSite Upgraded to new Circuit\nSite degraded to new Circuit"
        },
        {
            "fieldname": "circuit_id",
            "label": __("Circuit ID"),
            "fieldtype": "Data"
        }
    ]
};
