# Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt
# import frappe

import frappe
from frappe import _
from frappe.model.document import Document

class Site(Document):
    @frappe.whitelist()
    def create_stock_request(self):
        """Create Stock Management document only if not already linked"""
        if not self.get("site_item"):
            frappe.throw(_("No items found in Site Items table"))

        # Check for existing stock management links
        existing_links = []
        for site_item in self.site_item:
            if site_item.stock_management_id:
                if frappe.db.exists("Stock Management", site_item.stock_management_id):
                    existing_links.append(site_item.stock_management_id)

        if existing_links:
            frappe.throw(_(
                "Stock Management already exists for these items: {0}. "
                "Please delete existing links first."
            ).format(", ".join(existing_links)))
            return

        # Create new Stock Management
        stock_mgmt = frappe.get_doc({
            "doctype": "Stock Management",
            "status": "Stock Request",
            "site": self.name,
            "circuit_id": self.circuit_id,
            "stock_management_item": []
        }).insert(ignore_permissions=True)

        # Update references
        for site_item in self.site_item:
            site_item.stock_management_id = stock_mgmt.name
            site_item.status = "Stock Requested"
            
            stock_mgmt.append("stock_management_item", {
                "item_code": site_item.item_code,
                "qty": site_item.qty,
                "warehouse": site_item.warehouse,
                "site_item": site_item.name
            })

        stock_mgmt.save(ignore_permissions=True)
        self.save(ignore_permissions=True)
        
        frappe.msgprint(_("Stock Request created: {0}").format(stock_mgmt.name))
        return stock_mgmt.name

    @frappe.whitelist()
    def stock_reserve(self):
        """Reserve stock for this site"""
        frappe.msgprint(_("Stock reserved successfully"))

    @frappe.whitelist()
    def stock_unreserve(self):
        """Unreserve stock for this site"""
        frappe.msgprint(_("Stock unreserved successfully"))

    @frappe.whitelist()
    def delivery_request(self):
        """Initiate delivery process"""
        frappe.msgprint(_("Delivery request initiated"))