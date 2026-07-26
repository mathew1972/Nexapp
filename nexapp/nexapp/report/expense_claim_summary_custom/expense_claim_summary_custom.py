# Copyright (c) 2026, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	if not filters:
		filters = {}

	claims_list = get_claims(filters)
	columns = get_columns()

	if not claims_list:
		return columns, []

	from frappe.utils import flt

	advances_dict = get_claims_advances()
	payments_dict = get_claims_payments()

	data = []
	for claim in claims_list:
		claim_advances = advances_dict.get(claim.name, [])
		advance_paid_sum = sum([flt(d.advance_paid) for d in claim_advances])
		
		claim_payments = payments_dict.get(claim.name, [])
		payment_paid = sum([flt(d.allocated_amount) for d in claim_payments])
		payment_balance = flt(claim.total_sanctioned_amount) - advance_paid_sum - payment_paid

		row = {
			"employee": claim.employee_name,
			"department": claim.department,
			"company": claim.company,
			"posting_date": claim.posting_date,
			"total_claimed_amount": claim.total_claimed_amount,
			"total_sanctioned_amount": claim.total_sanctioned_amount,
			"total_advance_amount": advance_paid_sum,
			"approval_status": claim.approval_status,
			"payment_paid": payment_paid,
			"payment_balance": payment_balance,
		}
		data.append(row)

	return columns, data


def get_columns():
	return [
		{
			"label": _("Employee"),
			"fieldname": "employee",
			"fieldtype": "Data",
			"width": 140,
		},
		{
			"label": _("Department"),
			"fieldname": "department",
			"fieldtype": "Link",
			"options": "Department",
			"width": 120,
		},
		{
			"label": _("Company"),
			"fieldname": "company",
			"fieldtype": "Link",
			"options": "Company",
			"width": 120,
		},
		{"label": _("Posting Date"), "fieldname": "posting_date", "fieldtype": "Date", "width": 120},
		{
			"label": _("Total Claimed Amount"),
			"fieldname": "total_claimed_amount",
			"fieldtype": "Currency",
			"width": 140,
		},
		{
			"label": _("Total Sanctioned Amount"),
			"fieldname": "total_sanctioned_amount",
			"fieldtype": "Currency",
			"width": 140,
		},
		{
			"label": _("Total Advance Amount"),
			"fieldname": "total_advance_amount",
			"fieldtype": "Currency",
			"width": 140,
		},
		{"label": _("Approval Status"), "fieldname": "approval_status", "fieldtype": "Data", "width": 120},
		{"label": _("Payment Paid"), "fieldname": "payment_paid", "fieldtype": "Currency", "width": 120},
		{"label": _("Payment Balance"), "fieldname": "payment_balance", "fieldtype": "Currency", "width": 120},
	]


def get_conditions(filters):
	conditions = ""

	if filters.get("employee"):
		conditions += "and employee = %(employee)s"
	if filters.get("company"):
		conditions += " and company = %(company)s"
	if filters.get("approval_status"):
		conditions += " and approval_status = %(approval_status)s"
	if filters.get("from_date"):
		conditions += " and posting_date>=%(from_date)s"
	if filters.get("to_date"):
		conditions += " and posting_date<=%(to_date)s"

	return conditions


def get_claims(filters):
	conditions = get_conditions(filters)
	return frappe.db.sql(
		"""select name, employee, employee_name, department, company, posting_date,
		total_claimed_amount, total_sanctioned_amount, total_advance_amount, total_amount_reimbursed, grand_total, status, approval_status
		from `tabExpense Claim`
		where docstatus<2 %s order by posting_date, name desc"""
		% conditions,
		filters,
		as_dict=1,
	)


def get_claims_advances():
	advances = frappe.get_all(
		"Expense Claim Advance",
		fields=["parent", "employee_advance", "advance_paid"],
		order_by="idx",
	)
	advances_dict = {}
	for d in advances:
		advances_dict.setdefault(d.parent, []).append(d)
	return advances_dict


def get_claims_payments():
	payments = frappe.db.sql(
		"""
		select ref.reference_name, ref.allocated_amount
		from `tabPayment Entry Reference` ref
		inner join `tabPayment Entry` pe on pe.name = ref.parent
		where ref.reference_doctype = 'Expense Claim'
		and pe.docstatus = 1
		""",
		as_dict=1
	)
	payments_dict = {}
	for d in payments:
		payments_dict.setdefault(d.reference_name, []).append(d)
	return payments_dict
