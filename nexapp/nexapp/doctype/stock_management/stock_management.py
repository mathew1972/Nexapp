# Copyright (c) 2025, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt
import frappe
from frappe import _
from frappe.model.document import Document

class StockManagement(Document):
    def validate(self):
        """Run all validations before saving"""
        self.validate_serial_sim_numbers()
        self.prevent_duplicate_identifiers()
    
    def before_submit(self):
        """Validation before submission"""
        self.validate()

    def prevent_duplicate_identifiers(self):
        """Prevent duplicate SIM and Serial numbers in items"""
        seen_sim = set()
        seen_serial = set()
        duplicates = {'sim': [], 'serial': []}
        
        for idx, item in enumerate(self.get("stock_management_item"), 1):
            if item.sim_no:
                if item.sim_no in seen_sim:
                    duplicates['sim'].append(f"Row {idx}: {item.sim_no}")
                seen_sim.add(item.sim_no)
            
            if item.serial_no:
                if item.serial_no in seen_serial:
                    duplicates['serial'].append(f"Row {idx}: {item.serial_no}")
                seen_serial.add(item.serial_no)
        
        if duplicates['sim'] or duplicates['serial']:
            error_msg = self._format_duplicate_message(duplicates)
            frappe.throw(error_msg, title=_("Duplicate Error"))

    def validate_serial_sim_numbers(self):
        """Validate all items have either serial or SIM number"""
        missing = []
        for idx, item in enumerate(self.get("stock_management_item"), 1):
            if not (item.serial_no or item.sim_no):
                name = item.item_name or item.item_code
                missing.append(f"Row {idx}: {item.item_code} - {name}")
        
        if missing:
            msg = self._format_validation_message(missing)
            frappe.throw(msg, title=_("Validation Error"), is_minimizable=True)

    @frappe.whitelist()
    def stock_reserve(self):
        """Reserve stock after validation"""
        self.validate()
        self._update_status("Stock Reserved")
        return {"success": True}

    @frappe.whitelist()
    def stock_unreserve(self):
        """Unreserve stock only if all SIM/Serial numbers are cleared"""
        if not self._can_unreserve():
            return {"success": False}
        
        self._update_status("Stock Unreserved")
        return {"success": True}

    @frappe.whitelist()
    def delivery_request(self):
        """Create Delivery Note with single line item"""
        self.validate()
        
        try:
            dn = frappe.new_doc("Delivery Note")
            dn.customer = self.customer_name
            
            # Create just ONE item line using parent document's data
            dn.append("items", {
                "item_code": self.solution_code,  # From parent document
                "qty": 1,                        # Fixed quantity of 1
                "custom_circuit_id": self.circuit_id  # From parent document
            })
            
            dn.insert(ignore_permissions=True)
            self._update_status("Stock Delivered")
            
            return {
                "success": True,
                "delivery_note": dn.name
            }
            
        except Exception as e:
            frappe.log_error(_("Delivery Note creation failed"), str(e))
            frappe.throw(
                _("Failed to create Delivery Note: {0}").format(str(e)),
                title=_("Delivery Error")
            )
            return {"success": False}

    def _can_unreserve(self):
        """Check if stock can be unreserved (no SIM/Serial numbers)"""
        items_with_ids = []
        
        for idx, item in enumerate(self.get("stock_management_item"), 1):
            if item.serial_no or item.sim_no:
                items_with_ids.append(
                    f"Row {idx}: {item.item_code} - {item.item_name or 'No Name'}"
                )
        
        if items_with_ids:
            msg = self._format_unreserve_error(items_with_ids)
            frappe.throw(msg, title=_("Cannot Unreserve"), is_minimizable=True)
            return False
        return True

    def _update_status(self, status):
        """Update status across all related documents"""
        self.db_set("status", status)
        
        site_name = self._get_linked_site()
        if site_name:
            try:
                if self._field_exists("Site", "status"):
                    frappe.db.set_value("Site", site_name, "status", status)
                
                if self._field_exists("Site Item", "status"):
                    frappe.db.sql("""
                        UPDATE `tabSite Item`
                        SET status = %s
                        WHERE stock_management_id = %s
                    """, (status, self.name))
                
                frappe.msgprint(_("Status updated successfully"), indicator="green")
            except Exception as e:
                frappe.log_error(_("Status update error"), str(e))
                frappe.msgprint(_("Status partially updated"), indicator="orange")

    def _format_duplicate_message(self, duplicates):
        """Format duplicate error message"""
        message = []
        if duplicates['sim']:
            message.append(_("Duplicate SIM Numbers found:"))
            message.extend([f"• {sim}" for sim in duplicates['sim']])
        if duplicates['serial']:
            if message:
                message.append("")
            message.append(_("Duplicate Serial Numbers found:"))
            message.extend([f"• {serial}" for serial in duplicates['serial']])
        return "<br>".join(message)

    def _format_validation_message(self, missing_items):
        """Format validation error message"""
        return f"""
            <div style='margin-bottom:15px'>
                {frappe.bold(_("Missing Serial/SIM Numbers:"))}
            </div>
            <ul style='margin-left:20px;color:#e74c3c'>
                {"".join([f"<li>{item}</li>" for item in missing_items])}
            </ul>
            <div style='margin-top:10px;color:#7f8c8d'>
                {_("Please add identifiers before proceeding.")}
            </div>
        """

    def _format_unreserve_error(self, items_with_ids):
        """Format unreserve validation error"""
        return f"""
            <div style='margin-bottom:15px'>
                {frappe.bold(_("Cannot Unreserve - Items still have identifiers:"))}
            </div>
            <ul style='margin-left:20px;color:#e74c3c'>
                {"".join([f"<li>{item}</li>" for item in items_with_ids])}
            </ul>
            <div style='margin-top:10px;color:#7f8c8d'>
                {_("Please clear all SIM/Serial numbers before unreserving.")}
            </div>
        """

    def _field_exists(self, doctype, fieldname):
        """Check if field exists in doctype"""
        return frappe.db.exists("DocField", {
            "parent": doctype,
            "fieldname": fieldname
        })

    def _get_linked_site(self):
        """Get linked Site through any available method"""
        try:
            if hasattr(self, 'site') and self.site:
                return self.site
                
            return frappe.db.get_value(
                "Site Item",
                {"stock_management_id": self.name},
                "parent"
            )
        except Exception:
            return None