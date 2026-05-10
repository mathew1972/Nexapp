# Copyright (c) 2024, Nexapp and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": _("Index"), "fieldname": "index", "fieldtype": "Int", "width": 60},
		{"label": _("Supplier"), "fieldname": "supplier_name", "fieldtype": "Data", "width": 150},
		{"label": _("Invoice ID"), "fieldname": "invoice_id", "fieldtype": "Data", "width": 180},
		{"label": _("Bill No"), "fieldname": "bill_no", "fieldtype": "Data", "width": 120},
		{"label": _("Bill Date"), "fieldname": "bill_date", "fieldtype": "Date", "width": 100},
		{"label": _("Rounded Total"), "fieldname": "rounded_total", "fieldtype": "Currency", "width": 120},
		{"label": _("Outstanding Amount"), "fieldname": "outstanding_amount", "fieldtype": "Currency", "width": 120},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 100},
		{"label": _("Posting Date"), "fieldname": "posting_date", "fieldtype": "Date", "width": 100},
		{"label": _("Duration From"), "fieldname": "custom_dutation_from", "fieldtype": "Date", "width": 100},
		{"label": _("Duration To"), "fieldname": "custom_duration_to", "fieldtype": "Date", "width": 100},
		{"label": _("Payment Cycle"), "fieldname": "custom_payment_cycle", "fieldtype": "Data", "width": 100},
		{"label": _("Payment Type"), "fieldname": "custom_payment_type", "fieldtype": "Data", "width": 100},
		{"label": _("Payment Category"), "fieldname": "custom_payment_catogery", "fieldtype": "Data", "width": 120},
		{"label": _("Circuit ID"), "fieldname": "custom_circuit_id", "fieldtype": "Data", "width": 120},
		{"label": _("Supplier Group"), "fieldname": "supplier_group", "fieldtype": "Data", "width": 120},
		# Bank Account Set 1
		{"label": _("Bank Account Holder-1"), "fieldname": "bank_account_holder_1", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-1"), "fieldname": "bank_account_no_1", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-1"), "fieldname": "ifsc_code_1", "fieldtype": "Data", "width": 120},
		# Bank Account Set 2
		{"label": _("Bank Account Holder-2"), "fieldname": "bank_account_holder_2", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-2"), "fieldname": "bank_account_no_2", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-2"), "fieldname": "ifsc_code_2", "fieldtype": "Data", "width": 120},
		# Bank Account Set 3
		{"label": _("Bank Account Holder-3"), "fieldname": "bank_account_holder_3", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-3"), "fieldname": "bank_account_no_3", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-3"), "fieldname": "ifsc_code_3", "fieldtype": "Data", "width": 120},
		# Bank Account Set 4
		{"label": _("Bank Account Holder-4"), "fieldname": "bank_account_holder_4", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-4"), "fieldname": "bank_account_no_4", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-4"), "fieldname": "ifsc_code_4", "fieldtype": "Data", "width": 120},
		# Bank Account Set 5
		{"label": _("Bank Account Holder-5"), "fieldname": "bank_account_holder_5", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-5"), "fieldname": "bank_account_no_5", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-5"), "fieldname": "ifsc_code_5", "fieldtype": "Data", "width": 120},
		{"label": _("Company"), "fieldname": "company", "fieldtype": "Link", "options": "Company", "width": 150},
	]


def get_data(filters):
	conditions = get_conditions(filters)

	# Using a simpler query structure for Script Report
	# We will fetch invoices first, then fetch bank accounts and map them
	# This avoids the complex session variables and CTEs if possible, or we can use them
	# Let's stick closer to the original query structure but made cleaner

	query = """
		WITH bank_ordered AS (
			SELECT
				ba.*,
				ROW_NUMBER() OVER (
					PARTITION BY ba.party
					ORDER BY ba.creation
				) AS rn
			FROM `tabBank Account` ba
			WHERE ba.party_type = 'Supplier'
		)
		SELECT
			pi.supplier_name,
			CONCAT_WS('-', pi.posting_date, pi.name) AS invoice_id,
			pi.bill_no,
			pi.bill_date,
			pi.rounded_total,
			pi.outstanding_amount,
			pi.status,
			pi.posting_date,
			pi.custom_dutation_from,
			pi.custom_duration_to,
			pi.custom_payment_cycle,
			pi.custom_payment_type,
			pi.custom_payment_catogery,
			pi.custom_circuit_id,
			sup.supplier_group,
			MAX(CASE WHEN bo.rn = 1 THEN bo.account_name END) AS bank_account_holder_1,
			MAX(CASE WHEN bo.rn = 1 THEN bo.bank_account_no END) AS bank_account_no_1,
			MAX(CASE WHEN bo.rn = 1 THEN bo.custom_ifsc END) AS ifsc_code_1,
			MAX(CASE WHEN bo.rn = 2 THEN bo.account_name END) AS bank_account_holder_2,
			MAX(CASE WHEN bo.rn = 2 THEN bo.bank_account_no END) AS bank_account_no_2,
			MAX(CASE WHEN bo.rn = 2 THEN bo.custom_ifsc END) AS ifsc_code_2,
			MAX(CASE WHEN bo.rn = 3 THEN bo.account_name END) AS bank_account_holder_3,
			MAX(CASE WHEN bo.rn = 3 THEN bo.bank_account_no END) AS bank_account_no_3,
			MAX(CASE WHEN bo.rn = 3 THEN bo.custom_ifsc END) AS ifsc_code_3,
			MAX(CASE WHEN bo.rn = 4 THEN bo.account_name END) AS bank_account_holder_4,
			MAX(CASE WHEN bo.rn = 4 THEN bo.bank_account_no END) AS bank_account_no_4,
			MAX(CASE WHEN bo.rn = 4 THEN bo.custom_ifsc END) AS ifsc_code_4,
			MAX(CASE WHEN bo.rn = 5 THEN bo.account_name END) AS bank_account_holder_5,
			MAX(CASE WHEN bo.rn = 5 THEN bo.bank_account_no END) AS bank_account_no_5,
			MAX(CASE WHEN bo.rn = 5 THEN bo.custom_ifsc END) AS ifsc_code_5,
			pi.company
		FROM `tabPurchase Invoice` pi
		LEFT JOIN `tabSupplier` sup ON sup.name = pi.supplier
		LEFT JOIN bank_ordered bo ON bo.party = pi.supplier
		WHERE pi.docstatus < 2 {conditions}
		GROUP BY pi.name
		ORDER BY pi.posting_date DESC
	""".format(conditions=conditions)

	res = frappe.db.sql(query, filters, as_dict=1)

	# Add index manually
	for i, row in enumerate(res):
		row["index"] = i + 1

	return res


def get_conditions(filters):
	conditions = ""

	if filters.get("status"):
		conditions += " AND pi.status = %(status)s"

	if filters.get("supplier"):
		conditions += " AND pi.supplier = %(supplier)s"

	if filters.get("duration_from"):
		conditions += " AND pi.custom_dutation_from >= %(duration_from)s"

	if filters.get("duration_to"):
		conditions += " AND pi.custom_duration_to <= %(duration_to)s"

	if filters.get("posting_date_from"):
		conditions += " AND pi.posting_date >= %(posting_date_from)s"

	if filters.get("posting_date_to"):
		conditions += " AND pi.posting_date <= %(posting_date_to)s"

	if filters.get("supplier_group"):
		conditions += " AND sup.supplier_group = %(supplier_group)s"

	if filters.get("company"):
		conditions += " AND pi.company = %(company)s"

	return conditions
