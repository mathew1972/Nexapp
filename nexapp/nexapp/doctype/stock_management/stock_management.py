# Copyright (c) 2025, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt
import frappe
from frappe import _
from frappe.model.document import Document
from functools import wraps

def save_before_action(func):
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        # Save the document if it has unsaved changes (using __unsaved flag for Frappe v15)
        if getattr(self, '__unsaved', False):
            self.save()
        return func(self, *args, **kwargs)
    return wrapper

class StockManagement(Document):
    def validate(self):
        """Run validations before saving"""
        if hasattr(self, 'flags') and getattr(self.flags, 'skip_validation', False):
            return
            
        self.validate_serial_sim_numbers()
        self.prevent_duplicate_identifiers()
    
    def before_submit(self):
        """Final validation before submission"""
        self.validate()

    def on_update(self):
        """Handle status changes"""
        if self.has_value_changed("status") and self.status == "Stock Unreserve Requested":
            self._update_site_items_status("Stock Unreserve Requested")
        elif self.has_value_changed("status") and self.status == "Update Serial/ SIM No":
            self._update_site_items_status("Stock Delivery In-Process")

    def validate_serial_sim_numbers(self):
        """
        Validate identifiers only for:
        - Items with use_serial_no__batch_fields=1
        - When specific actions are performed
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
        """Prevent duplicate SIM/Serial numbers in all items"""
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
    @save_before_action
    def stock_reserve(self):
        """Reserve stock and update all Site Items with popup confirmation"""
        try:
            frappe.flags.validate_for_action = True
            self.validate()
            
            self._update_status("Stock Reserved", update_site_items=True)
            
            frappe.msgprint(
                _("Stock has been successfully reserved!"),
                title=_("Stock Reserved"),
                indicator="green"
            )
            
            return {
                "success": True,
                "message": _("Stock Reserved Successfully")
            }
        finally:
            frappe.flags.pop("validate_for_action", None)

    @frappe.whitelist()
    @save_before_action
    def stock_unreserve(self):
        """First show confirmation before clearing identifiers"""
        # Prevent unreserve if status is 'Stock Delivery Requested'
        if self.status == "Stock Delivery Requested":
            frappe.throw(
                _("Cannot unreserve stock when status is 'Stock Delivery Requested'"),
                title=_("Action Not Allowed")
            )
        
        items_with_ids = []
        for item in self.stock_management_item:
            if item.serial_no or item.sim_no:
                items_with_ids.append(f"Row {item.idx}: {item.item_code}")
        
        if not items_with_ids:
            self._update_status("Stock Unreserved", update_site_items=True)
            return {
                "success": True,
                "message": _("Stock Unreserved Successfully")
            }
        
        return {
            "needs_confirmation": True,
            "message": self._format_unreserve_warning(items_with_ids),
            "title": _("Confirm Unreserve Stock"),
            "indicator": "orange"
        }

    @frappe.whitelist()
    @save_before_action
    def confirm_stock_unreserve(self):
        """Actually clear identifiers after confirmation"""
        try:
            # Prevent unreserve if status is 'Stock Delivery Requested'
            if self.status == "Stock Delivery Requested":
                frappe.throw(
                    _("Cannot unreserve stock when status is 'Stock Delivery Requested'"),
                    title=_("Action Not Allowed")
                )
                
            for item in self.stock_management_item:
                if self.status != "Stock Delivery Requested":
                    item.serial_no = ""
                    item.sim_no = ""
            
            self.save()
            self._update_status("Stock Unreserved", update_site_items=True)
            
            return {
                "success": True,
                "message": _("Stock unreserved successfully!"),
                "indicator": "green"
            }
        except Exception as e:
            frappe.log_error(_("Stock unreserve failed"), str(e))
            return {
                "success": False,
                "message": _("Failed to unreserve stock: {0}").format(str(e))
            }

    @frappe.whitelist()
    @save_before_action
    def delivery_request(self):
        """Create Delivery Note while preserving identifiers"""
        try:
            frappe.flags.validate_for_action = True
            self.validate()
            
            dn = frappe.new_doc("Delivery Note")
            dn.customer = self.customer_name
            
            dn.append("items", {
                "item_code": self.solution_code,
                "qty": 1,
                "custom_circuit_id": self.circuit_id
            })
            
            for sm_item in self.stock_management_item:
                dn.append("packed_items", {
                    "parent_item": self.solution_code,
                    "item_code": sm_item.item_code,
                    "qty": 1,
                    "serial_no": sm_item.serial_no or "",
                    "sim_no": sm_item.sim_no or ""
                })
            
            dn.insert(ignore_permissions=True)
            
            self.db_set("delivery_note_id", dn.name)
            self._update_status("Update Serial/ SIM No", update_site_items=True)
            
            frappe.msgprint(
                _("Delivery Note created!"),
                title=_("Delivery Processed"),
                indicator="blue"
            )
            
            return {
                "success": True,
                "message": _("Delivery Note {0} created").format(dn.name)
            }
        except Exception as e:
            frappe.log_error(_("Delivery Note creation failed"), str(e))
            return {
                "success": False,
                "message": _("Failed to create Delivery Note: {0}").format(str(e))
            }
        finally:
            frappe.flags.pop("validate_for_action", None)

    def _update_site_items_status(self, status):
        """Update status in related Site Items without clearing data"""
        site_items = frappe.get_all("Site Item",
            filters={"stock_management_id": self.name},
            pluck="name"
        )
        
        for site_item in site_items:
            frappe.db.set_value("Site Item", site_item, "status", status)
        
        frappe.publish_realtime('list_refresh', {'doctype': 'Site Item'})

    @frappe.whitelist()
    @save_before_action
    def update_serial_sim_no(self):
        """Update existing packed items with identifiers"""
        self.validate()
        
        if not self.delivery_note_id:
            frappe.throw(_("No Delivery Note linked"), title=_("Update Error"))
            
        try:
            dn = frappe.get_doc("Delivery Note", self.delivery_note_id)
            
            if dn.docstatus != 0:
                frappe.throw(
                    _("Submitted Delivery Note cannot be modified"),
                    title=_("Update Error")
                )

            processed_indices = []
            updated_count = 0
            stock_items = self.stock_management_item

            for stock_idx, sm_item in enumerate(stock_items):
                identifier = sm_item.sim_no or sm_item.serial_no
                if not identifier:
                    frappe.throw(
                        _("Row {0}: Missing both SIM and Serial Number").format(stock_idx+1),
                        title=_("Update Error")
                    )

                for packed_idx, packed_item in enumerate(dn.packed_items):
                    if (packed_item.item_code == sm_item.item_code and
                        packed_idx not in processed_indices):
                        
                        packed_item.serial_no = sm_item.serial_no or ""
                        packed_item.sim_no = sm_item.sim_no or ""
                        processed_indices.append(packed_idx)
                        updated_count += 1
                        break

            if updated_count != len(stock_items):
                frappe.throw(
                    _("Only {0}/{1} items updated. Check item codes match").format(
                        updated_count, len(stock_items)),
                    title=_("Partial Update")
                )

            dn.save()
            self._update_status("Stock Delivery In-Process", update_site_items=True)
            
            return {
                "success": True,
                "message": _("Successfully updated {0} items").format(updated_count)
            }
            
        except Exception as e:
            frappe.log_error(_("Update failed"), str(e))
            return {
                "success": False,
                "message": _("Update failed: {0}").format(str(e))
            }

    def _update_status(self, status, update_site_items=False):
        """
        Update status in:
        - Stock Management document
        - Optionally update related Site Items
        """
        self.db_set("status", status)
        
        if update_site_items:
            if status == "Update Serial/ SIM No":
                self._update_site_items_status("Stock Delivery In-Process")
            else:
                self._update_site_items_status(status)

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

    def _format_unreserve_warning(self, items_with_ids):
        return f"""
            <div style='margin-bottom:15px'>
                {frappe.bold(_("The following identifiers will be cleared:"))}
            </div>
            <ul style='margin-left:20px;color:#e67e22'>
                {"".join([f"<li>{item}</li>" for item in items_with_ids])}
            </ul>
            <div style='margin-top:10px;color:#7f8c8d'>
                {_("Are you sure you want to proceed?")}
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