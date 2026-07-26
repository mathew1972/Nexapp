// Copyright (c) 2026, Nexapp Technologies Private Limited and contributors
// For license information, please see license.txt

frappe.query_reports["PO vs SO Balance"] = {
	"filters": [
		{
			"fieldname": "customer",
			"label": __("Customer"),
			"fieldtype": "Link",
			"options": "Customer",
			"width": "80"
		}
	],
    "formatter": function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        
        if (column.fieldname == "balance_amount" && data && data.balance_amount < 0) {
            value = "<span style='color:red; font-weight:bold'>" + value + "</span>";
        }
        return value;
    }
};
