# Copyright (c) 2026, Nexapp and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate

def execute(filters=None):
	if not filters:
		filters = {}
	
	columns = get_columns()
	data = get_data(filters)
	return columns, data

def get_columns():
	return [
		{"label": _("Circuit Id"), "fieldname": "circuit_id", "fieldtype": "Data", "width": 120},
		{"label": _("Item Code"), "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
		{"label": _("Item Name"), "fieldname": "item_name", "fieldtype": "Data", "width": 150},
		{"label": _("Item Group"), "fieldname": "item_group", "fieldtype": "Link", "options": "Item Group", "width": 120},
		{"label": _("Order Type"), "fieldname": "order_type", "fieldtype": "Data", "width": 100},
		{"label": _("Serial No./Sim No"), "fieldname": "serial_no_sim_no", "fieldtype": "Small Text", "width": 150},
		{"label": _("Mobile NO."), "fieldname": "mobile_no", "fieldtype": "Data", "width": 120},
		{"label": _("Brand"), "fieldname": "brand", "fieldtype": "Data", "width": 100},
		{"label": _("Data Plan"), "fieldname": "data_plan", "fieldtype": "Data", "width": 120},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 100},
		{"label": _("Inward Date"), "fieldname": "inward_date", "fieldtype": "Date", "width": 100},
		{"label": _("Outward Date"), "fieldname": "outward_date", "fieldtype": "Date", "width": 100},
		{"label": _("Account Name"), "fieldname": "account_name", "fieldtype": "Link", "options": "Customer", "width": 150},
		{"label": _("Site Status"), "fieldname": "site_status", "fieldtype": "Select", "options": "Site Status", "width": 120},
		{"label": _("Stock stage"), "fieldname": "stock_stage", "fieldtype": "Data", "width": 120},
		{"label": _("Solution Code"), "fieldname": "solution_code", "fieldtype": "Link", "options": "Item", "width": 120},
		{"label": _("Solution Name"), "fieldname": "solution_name", "fieldtype": "Data", "width": 150},
		{"label": _("Delivery Note ID"), "fieldname": "delivery_note_id", "fieldtype": "Link", "options": "Delivery Note", "width": 140},
		{"label": _("Delivery Note Type"), "fieldname": "delivery_note_type", "fieldtype": "Data", "width": 120},
		{"label": _("Change management"), "fieldname": "change_management", "fieldtype": "Data", "width": 140},
		{"label": _("Ckt Disconnection Status"), "fieldname": "ckt_disconnection_status", "fieldtype": "Data", "width": 140},
		{"label": _("Extra Inventory Count"), "fieldname": "extra_inventory_count", "fieldtype": "Int", "width": 100},
		{"label": _("Shipment ID"), "fieldname": "shipment_id", "fieldtype": "Link", "options": "Shipment", "width": 120},
		{"label": _("Tracking Status"), "fieldname": "tracking_status", "fieldtype": "Data", "width": 120},
		{"label": _("AWB Number"), "fieldname": "awb_number", "fieldtype": "Data", "width": 120},
		{"label": _("Carrier"), "fieldname": "carrier", "fieldtype": "Data", "width": 120},
		{"label": _("Carrier Service"), "fieldname": "carrier_service", "fieldtype": "Data", "width": 120},
		{"label": _("Pickup Date"), "fieldname": "pickup_date", "fieldtype": "Date", "width": 100},
		{"label": _("Delivery Date"), "fieldname": "delivery_date", "fieldtype": "Date", "width": 100},
		{"label": _("Aging Delivery in Days"), "fieldname": "aging_delivery_in_days", "fieldtype": "Int", "width": 100}
	]

def get_data(filters):
	conditions = get_conditions(filters)
	
	query = f"""
		SELECT
			dni.custom_circuit_id AS circuit_id,
			dni.item_code,
			dni.item_name,
			dni.item_group,
			s.order_type,
			dni.serial_no AS serial_no_sim_no,
			s.mobile AS mobile_no,
			i.brand,
			s.primary_data_plan AS data_plan,
			s.site_status AS status,
			dn.posting_date AS inward_date,
			dn.posting_date AS outward_date,
			dn.customer AS account_name,
			s.site_status,
			s.stage AS stock_stage,
			s.solution_code,
			s.solution_name,
			dn.name AS delivery_note_id,
			dn.custom_delivery_type AS delivery_note_type,
			dn.custom_change_management AS change_management,
			'' AS ckt_disconnection_status,
			0 AS extra_inventory_count,
			s.shipment_id,
			ship.tracking_status,
			ship.awb_number,
			ship.carrier,
			ship.carrier_service,
			ship.pickup_date,
			ship.custom_delivery_date AS delivery_date,
			DATEDIFF(%(today)s, ship.custom_delivery_date) AS aging_delivery_in_days
		FROM `tabDelivery Note Item` dni
		INNER JOIN `tabDelivery Note` dn ON dn.name = dni.parent
		LEFT JOIN `tabSite` s ON s.circuit_id = dni.custom_circuit_id
		LEFT JOIN `tabItem` i ON i.name = dni.item_code
		LEFT JOIN `tabShipment` ship ON ship.name = s.shipment_id
		WHERE
			dn.docstatus = 1
			{conditions}
		ORDER BY
			dn.posting_date DESC, dn.name DESC
	"""
	
	filters["today"] = nowdate()
	data = frappe.db.sql(query, filters, as_dict=True)
	
	# Adjust Aging Delivery in Days if delivery date is missing or in future
	for row in data:
		if not row.delivery_date:
			row.aging_delivery_in_days = 0
		elif row.aging_delivery_in_days <0:
			row.aging_delivery_in_days = 0
			
	return data

def get_conditions(filters):
	conditions = ""
	if filters.get("from_date"):
		conditions += " AND dn.posting_date >= %(from_date)s"
	if filters.get("to_date"):
		conditions += " AND dn.posting_date <= %(to_date)s"
	if filters.get("customer"):
		conditions += " AND dn.customer = %(customer)s"
	if filters.get("site_status"):
		conditions += " AND s.site_status = %(site_status)s"
	if filters.get("circuit_id"):
		conditions += " AND dni.custom_circuit_id LIKE %(circuit_id)s"
		
	return conditions
