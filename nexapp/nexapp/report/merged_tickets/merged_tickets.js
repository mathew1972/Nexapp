// Copyright (c) 2026, mathew1972 and contributors
// For license information, please see license.txt

frappe.query_reports["Merged Tickets"] = {
	"filters": [
		{
			"fieldname": "customer",
			"label": __("Customer"),
			"fieldtype": "Link",
			"options": "Customer"
		},
		{
			"fieldname": "from_date",
			"label": __("Date From (Ticket Created)"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1)
		},
		{
			"fieldname": "to_date",
			"label": __("Date To (Ticket Created)"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today()
		}
	]
};
