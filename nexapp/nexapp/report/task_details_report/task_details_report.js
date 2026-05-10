// Copyright (c) 2026, Nexapp and contributors
// For license information, please see license.txt

frappe.query_reports["Task Details Report"] = {
	"filters": [
		{
			"fieldname": "type",
			"label": __("Task Type"),
			"fieldtype": "Link",
			"options": "Task Type"
		},
		{
			"fieldname": "custom_customer",
			"label": __("Customer"),
			"fieldtype": "Link",
			"options": "Customer"
		},
		{
			"fieldname": "custom_owner",
			"label": __("Owner"),
			"fieldtype": "Link",
			"options": "User"
		},
		{
			"fieldname": "status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options": "\nOpen\nWorking\nPending Review\nOverdue\nCompleted\nCancelled"
		},
		{
			"fieldname": "department",
			"label": __("Department"),
			"fieldtype": "Link",
			"options": "Department"
		},
		{
			"fieldname": "from_date",
			"label": __("Created From"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1)
		},
		{
			"fieldname": "to_date",
			"label": __("Created To"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today()
		}
	]
};
