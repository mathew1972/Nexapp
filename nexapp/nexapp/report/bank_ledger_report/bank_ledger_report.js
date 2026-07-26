frappe.query_reports["Bank Ledger Report"] = {
	"filters": [
		{
			"fieldname": "bank_account",
			"label": __("Bank Account"),
			"fieldtype": "Link",
			"options": "Account",
			"mandatory": 1,
			"get_query": function() {
				return {
					"filters": {
						"account_type": "Bank",
						"is_group": 0
					}
				}
			}
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"mandatory": 1,
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1)
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"mandatory": 1,
			"default": frappe.datetime.get_today()
		}
	],
	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		if (data && data.posting_date === "Opening") {
			if (column.fieldname === "debit" || column.fieldname === "credit") {
				value = "";
			}
		}
		return value;
	}
};
