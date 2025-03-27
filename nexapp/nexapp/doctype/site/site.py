# Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

class Site(Document):
    @frappe.whitelist()
    def create_stock_request(self):
        """Handle Stock Request creation/update"""
        return self.handle_status_update(
            site_status="Stock Requested",
            sm_status="Stock Requested"
        )

    @frappe.whitelist()
    def stock_reserve(self):
        """Handle Stock Reserve action"""
        return self.handle_status_update(
            site_status="Stock Reserve Requested",
            sm_status="Stock Reserve Requested"
        )

    @frappe.whitelist()
    def stock_unreserve(self):
        """Handle Stock Unreserve action"""
        return self.handle_status_update(
            site_status="Stock Unreserve Requested",
            sm_status="Stock Unreserve Requested"
        )

    @frappe.whitelist()
    def delivery_request(self):
        """Handle Delivery Request action"""
        return self.handle_status_update(
            site_status="Delivery Requested",
            sm_status="Delivery Requested"
        )

    @frappe.whitelist()
    def cancel_request(self):
        """Handle Cancel Request action"""
        return self.handle_status_update(
            site_status="Cancel Requested",
            sm_status="Cancel Requested"
        )

    def handle_status_update(self, site_status, sm_status):
        """Common method to handle status updates"""
        # Update Site and Site Item statuses
        self.status = site_status
        for site_item in self.site_item:
            site_item.status = site_status

        existing_sm = None
        for site_item in self.site_item:
            if site_item.stock_management_id:
                existing_sm = site_item.stock_management_id
                break

        if existing_sm and frappe.db.exists("Stock Management", existing_sm):
            # Update existing Stock Management
            sm = frappe.get_doc("Stock Management", existing_sm)
            sm.status = sm_status
            sm.save()
            frappe.publish_realtime('list_refresh', 'Stock Management')
            msg = _("Updated Stock Management: {0}").format(existing_sm)
        else:
            # Create new Stock Management
            sm = frappe.get_doc({
                "doctype": "Stock Management",
                "status": sm_status,
                "site": self.name,
                "circuit_id": self.circuit_id,
                "stock_management_item": []
            }).insert(ignore_permissions=True)

            # Link items
            for site_item in self.site_item:
                site_item.stock_management_id = sm.name
                sm.append("stock_management_item", {
                    "item_code": site_item.item_code,
                    "qty": site_item.qty,
                    "warehouse": site_item.warehouse,
                    "site_item": site_item.name
                })

            sm.save(ignore_permissions=True)
            frappe.publish_realtime('list_refresh', 'Stock Management')
            msg = _("Created Stock Management: {0}").format(sm.name)

        self.save(ignore_permissions=True)
        frappe.msgprint(msg)
        return sm.name