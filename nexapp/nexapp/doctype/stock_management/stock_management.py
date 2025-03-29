# Copyright (c) 2025, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt
import frappe
from frappe import _
from frappe.model.document import Document

class StockManagement(Document):
    def validate(self):
        """Run validations before saving"""
        self.validate_serial_sim_numbers()
        self.prevent_duplicate_identifiers()
    
    def before_submit(self):
        """Final validation before submission"""
        self.validate()

    def validate_serial_sim_numbers(self):
        """
        Validate identifiers for items requiring them
        """
        skip_statuses = [
            "Stock Requested", "Stock Reserve Requested",
            "Stock Unreserve Requested", "Delivery Requested",
            "Cancel Requested", "Stock Return Requested"
        ]

        validate_for_action = frappe.flags.get("validate_for_action", False)
        missing = []
        
        for idx, item in enumerate(self.get("stock_management_item"), 1):
            if validate_for_action and not getattr(item, "use_serial_no__batch_fields", 0):
                continue

            if not validate_for_action and self.status in skip_statuses:
                continue

            if not (item.serial_no or item.sim_no):
                name = item.item_name or item.item_code
                missing.append(f"Row {idx}: {item.item_code} - {name}")
        
        if missing:
            msg = self._format_validation_message(missing)
            frappe.throw(msg, title=_("Validation Error"), is_minimizable=True)

    def prevent_duplicate_identifiers(self):
        """Prevent duplicate SIM/Serial numbers"""
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

    @frappe.whitelist()
    def stock_reserve(self):
        """Reserve stock with validation"""
        try:
            frappe.flags.validate_for_action = True
            self.validate()
            
            self._update_status("Stock Reserved", update_site_items=True)
            
            frappe.msgprint(
                _("Stock reserved successfully!"),
                title=_("Reservation Complete"),
                indicator="green"
            )
            
            return {"success": True, "message": _("Stock Reserved")}
            
        finally:
            frappe.flags.pop("validate_for_action", None)

    @frappe.whitelist()
    def stock_unreserve(self):
        """Unreserve stock and clear identifiers"""
        if not self._can_unreserve():
            return {"success": False}
        
        for item in self.get("stock_management_item"):
            item.db_set("serial_no", "")
            item.db_set("sim_no", "")
        
        self._update_status("Stock Unreserved", update_site_items=True)
        
        frappe.msgprint(
            _("Stock unreserved successfully!"),
            title=_("Unreservation Complete"), 
            indicator="green"
        )
        
        return {"success": True, "message": _("Stock Unreserved")}

    @frappe.whitelist()
    def delivery_request(self):
        """Create Delivery Note with complete packed items in one step"""
        try:
            frappe.flags.validate_for_action = True
            self.validate()
            
            # Create item_code to identifiers mapping
            item_map = {
                item.item_code: (item.serial_no, item.sim_no)
                for item in self.stock_management_item
            }
            
            # Create Delivery Note
            dn = frappe.new_doc("Delivery Note")
            dn.customer = self.customer_name
            
            # Add main item
            dn.append("items", {
                "item_code": self.solution_code,
                "qty": 1,
                "custom_circuit_id": self.circuit_id
            })
            
            # Create packed items with exact item_code matching
            for sm_item in self.stock_management_item:
                if sm_item.item_code not in item_map:
                    frappe.throw(_("Item {0} not found in mapping").format(sm_item.item_code))
                
                serial_no, sim_no = item_map[sm_item.item_code]
                
                dn.append("packed_items", {
                    "parent_item": self.solution_code,
                    "item_code": sm_item.item_code,
                    "qty": sm_item.qty,
                    "serial_no": serial_no or "",
                    "sim_no": sim_no or ""
                })
            
            dn.insert(ignore_permissions=True)
            
            # Update status and references
            self.db_set({
                "delivery_note_id": dn.name,
                "status": "Ready for Dispatch"
            })
            
            frappe.msgprint(
                _("Delivery Note created with {0} items").format(len(self.stock_management_item)),
                title=_("Delivery Created"),
                indicator="green"
            )
            
            return {
                "success": True,
                "message": _("Delivery Note {0} created").format(dn.name)
            }
            
        except Exception as e:
            frappe.log_error(_("Delivery creation failed"), str(e))
            return {
                "success": False,
                "message": _("Failed: {0}").format(str(e))
            }
        finally:
            frappe.flags.pop("validate_for_action", None)

    def _can_unreserve(self):
        """Check unreserve conditions"""
        items_with_ids = []
        for item in self.stock_management_item:
            if item.serial_no or item.sim_no:
                items_with_ids.append(f"Row {item.idx}: {item.item_code}")
        
        if items_with_ids:
            msg = self._format_unreserve_error(items_with_ids)
            frappe.throw(msg, title=_("Cannot Unreserve"), is_minimizable=True)
            return False
        return True

    def _update_status(self, status, update_site_items=False):
        """Update document status"""
        self.db_set("status", status)
        
        if update_site_items:
            site_items = frappe.get_all("Site Item",
                filters={"stock_management_id": self.name},
                pluck="name"
            )
            
            for site_item in site_items:
                frappe.db.set_value("Site Item", site_item, "status", status)
            
            frappe.publish_realtime('list_refresh', {'doctype': 'Site Item'})

    def _format_duplicate_message(self, duplicates):
        message = []
        if duplicates['sim']:
            message.append(_("Duplicate SIM Numbers:"))
            message.extend([f"• {sim}" for sim in duplicates['sim']])
        if duplicates['serial']:
            if message: message.append("")
            message.append(_("Duplicate Serial Numbers:"))
            message.extend([f"• {serial}" for serial in duplicates['serial']])
        return "<br>".join(message)

    def _format_validation_message(self, missing_items):
        return f"""
            <div style='margin-bottom:15px'>
                {frappe.bold(_("Missing Identifiers:"))}
            </div>
            <ul style='margin-left:20px;color:#e74c3c'>
                {"".join([f"<li>{item}</li>" for item in missing_items])}
            </ul>
            <div style='margin-top:10px;color:#7f8c8d'>
                {_("Required items need either SIM or Serial Number")}
            </div>
        """

    def _format_unreserve_error(self, items_with_ids):
        return f"""
            <div style='margin-bottom:15px'>
                {frappe.bold(_("Identifiers Found:"))}
            </div>
            <ul style='margin-left:20px;color:#e74c3c'>
                {"".join([f"<li>{item}</li>" for item in items_with_ids])}
            </ul>
            <div style='margin-top:10px;color:#7f8c8d'>
                {_("Clear all identifiers before unreserving")}
            </div>
        """

    def _get_linked_site(self):
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