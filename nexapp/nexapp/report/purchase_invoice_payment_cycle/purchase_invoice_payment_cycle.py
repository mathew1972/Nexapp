# Copyright (c) 2026, Nexapp and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
	if not filters:
		filters = {}
	
	columns = get_columns()
	data = get_data(filters)
	return columns, data

def get_columns():
	return [
		{"label": _("Company"), "fieldname": "company", "fieldtype": "Link", "options": "Company", "width": 180},
		{"label": _("Supplier"), "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 180},
		{"label": _("Bill No"), "fieldname": "bill_no", "fieldtype": "Data", "width": 140},
		{"label": _("Bill Date"), "fieldname": "bill_date", "fieldtype": "Date", "width": 120},
		{"label": _("Grand Total"), "fieldname": "grand_total", "fieldtype": "Currency", "width": 120},
		{"label": _("Rounded Total"), "fieldname": "rounded_total", "fieldtype": "Currency", "width": 120},
		{"label": _("Outstanding Amount"), "fieldname": "outstanding_amount", "fieldtype": "Currency", "width": 120},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 120},
		{"label": _("Posting Date"), "fieldname": "posting_date", "fieldtype": "Date", "width": 120},
		{"label": _("Duration From"), "fieldname": "duration_from", "fieldtype": "Date", "width": 120},
		{"label": _("Duration To"), "fieldname": "duration_to", "fieldtype": "Date", "width": 120},
		{"label": _("Payment Cycle"), "fieldname": "payment_cycle", "fieldtype": "Data", "width": 120},
		{"label": _("Payment Type"), "fieldname": "payment_type", "fieldtype": "Data", "width": 120},
		{"label": _("Payment Category"), "fieldname": "payment_category", "fieldtype": "Data", "width": 140},
		{"label": _("Circuit ID (PI)"), "fieldname": "circuit_id", "fieldtype": "Data", "width": 160},
		{"label": _("Site Name"), "fieldname": "site_name", "fieldtype": "Data", "width": 200},
		{"label": _("Site Customer"), "fieldname": "site_customer", "fieldtype": "Link", "options": "Customer", "width": 180},
		{"label": _("Site Status"), "fieldname": "site_status", "fieldtype": "Data", "width": 120},
		{"label": _("LMS ID"), "fieldname": "lms_id", "fieldtype": "Data", "width": 140},
		{"label": _("LMS Stage"), "fieldname": "lms_stage", "fieldtype": "Data", "width": 140},
		{"label": _("Bank Account Holder-1"), "fieldname": "bank_account_holder_1", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-1"), "fieldname": "bank_account_no_1", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-1"), "fieldname": "ifsc_code_1", "fieldtype": "Data", "width": 120},
		{"label": _("Bank Account Holder-2"), "fieldname": "bank_account_holder_2", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-2"), "fieldname": "bank_account_no_2", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-2"), "fieldname": "ifsc_code_2", "fieldtype": "Data", "width": 120},
		{"label": _("Bank Account Holder-3"), "fieldname": "bank_account_holder_3", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-3"), "fieldname": "bank_account_no_3", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-3"), "fieldname": "ifsc_code_3", "fieldtype": "Data", "width": 120},
		{"label": _("Bank Account Holder-4"), "fieldname": "bank_account_holder_4", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-4"), "fieldname": "bank_account_no_4", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-4"), "fieldname": "ifsc_code_4", "fieldtype": "Data", "width": 120},
		{"label": _("Bank Account Holder-5"), "fieldname": "bank_account_holder_5", "fieldtype": "Data", "width": 150},
		{"label": _("Bank Account No-5"), "fieldname": "bank_account_no_5", "fieldtype": "Data", "width": 150},
		{"label": _("IFSC Code-5"), "fieldname": "ifsc_code_5", "fieldtype": "Data", "width": 120}
	]

def get_data(filters):
	conditions = get_conditions(filters)
	
	query = f"""
		SELECT
			pi.company,
			pi.supplier,
			pi.bill_no,
			pi.bill_date,
			pi.grand_total,
			pi.rounded_total,
			pi.outstanding_amount,
			pi.status,
			pi.posting_date,
			pi.custom_dutation_from as duration_from,
			pi.custom_duration_to as duration_to,
			pi.custom_payment_cycle as payment_cycle,
			pi.custom_payment_type as payment_type,
			pi.custom_payment_catogery as payment_category,
			pi.custom_circuit_id as circuit_id,
			s.site_name,
			s.customer as site_customer,
			s.site_status,
			pi.custom_lms_id as lms_id,
			lms.lms_stage,
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
			MAX(CASE WHEN bo.rn = 5 THEN bo.custom_ifsc END) AS ifsc_code_5
		FROM `tabPurchase Invoice` pi
		LEFT JOIN `tabSite` s ON s.name = pi.custom_circuit_id
		LEFT JOIN `tabLastmile Services Master` lms ON lms.name = pi.custom_lms_id
		LEFT JOIN (
			SELECT
				ba.party,
				ba.account_name,
				ba.bank_account_no,
				ba.custom_ifsc,
				ROW_NUMBER() OVER (
					PARTITION BY ba.party
					ORDER BY ba.creation
				) AS rn
			FROM `tabBank Account` ba
			WHERE
				ba.party_type = 'Supplier'
				AND ba.disabled = 0
		) bo ON bo.party = pi.supplier
		WHERE
			pi.status != 'Cancelled'
			AND pi.docstatus = 1
			{conditions}
		GROUP BY
			pi.name, pi.company, pi.supplier, pi.bill_no, pi.bill_date, pi.grand_total,
			pi.rounded_total, pi.outstanding_amount, pi.status, pi.posting_date,
			pi.custom_dutation_from, pi.custom_duration_to, pi.custom_payment_cycle,
			pi.custom_payment_type, pi.custom_payment_catogery, pi.custom_circuit_id,
			s.site_name, s.customer, s.site_status, pi.custom_lms_id, lms.lms_stage
		ORDER BY
			pi.posting_date DESC
	"""
	
	data = frappe.db.sql(query, filters, as_dict=1)
	return data

def get_conditions(filters):
	conditions = ""
	if filters.get("company"):
		conditions += " AND pi.company LIKE %(company)s"
	if filters.get("supplier"):
		conditions += " AND pi.supplier = %(supplier)s"
	if filters.get("status"):
		conditions += " AND pi.status = %(status)s"
	
	if filters.get("customer"):
		# MultiSelect field returns comma separated string
		customers = filters.get("customer")
		if isinstance(customers, str):
			customers = [c.strip() for c in customers.split(",") if c.strip()]
		
		if customers:
			filters["customer_list"] = tuple(customers)
			conditions += " AND s.customer IN %(customer_list)s"
	
	return conditions
