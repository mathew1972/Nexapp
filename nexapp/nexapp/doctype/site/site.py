# Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt
import frappe
from frappe import _
from frappe.model.document import Document

class Site(Document):
    
    def before_save(self):
        self.calculate_tat()

    def on_update(self):
        doc_before = self.get_doc_before_save()
        if doc_before and doc_before.site_status != "Cancelled" and self.site_status == "Cancelled":
            from frappe.utils import now_datetime
            dt_str = now_datetime().strftime("%d-%b-%Y %I:%M %p")
            user_fullname = frappe.utils.get_fullname(frappe.session.user)
            
            content = f"""Site cancelled by {user_fullname}<br>
<br>
Previous Status : {doc_before.site_status}<br>
New Status      : Cancelled<br>
<br>
Date & Time     : {dt_str}"""
            
            self.add_comment("Info", content)


    def calculate_tat(self):
        from frappe.utils import now_datetime, time_diff_in_hours, getdate

        # Set site_created_date if not set
        if not self.site_created_date and self.creation:
            self.site_created_date = self.creation
        elif not self.site_created_date:
            self.site_created_date = now_datetime()

        if self.is_new():
            self.hold_days = 0
            self.on_hold_since = None
            self.site_completed_date = None
            self.site_tat = 0.0

        doc_before = None
        try:
            doc_before = self.get_doc_before_save()
        except Exception:
            pass

        old_status = doc_before.site_status if doc_before else None
        new_status = self.site_status

        was_paused = (old_status == "On Hold")
        is_paused = (new_status == "On Hold")

        if is_paused and not was_paused:
            self.on_hold_since = now_datetime()
        elif was_paused and not is_paused:
            if self.on_hold_since:
                hours_on_hold = time_diff_in_hours(now_datetime(), self.on_hold_since)
                # Convert to integer days by standard rounding
                days_on_hold = int(round(hours_on_hold / 24.0))
                self.hold_days = (self.hold_days or 0) + days_on_hold
                self.on_hold_since = None

        # 2. Set Due Date
        creation = self.site_created_date or self.creation or now_datetime()
        from frappe.utils import get_datetime, add_days
        
        dt_creation = get_datetime(creation)
        if dt_creation.hour >= 13:
            effective_start_date = add_days(dt_creation, 1)
        else:
            effective_start_date = dt_creation
            
        from nexapp.api import get_tat_target, calculate_tat_due_date, calculate_tat_working_days
        
        # Get TAT target strictly from Master using lms_type
        period_days = get_tat_target("Site", self.lms_type)
        total_tat_days = period_days + (self.hold_days or 0)
        self.due_date = calculate_tat_due_date(effective_start_date, total_tat_days)

        # 3. Calculate TAT and Statuses
        if self.site_status == "Delivered and Live":
            if self.date:
                self.site_completed_date = self.date
            elif not self.site_completed_date:
                if not self.is_new() and self.creation and time_diff_in_hours(now_datetime(), self.creation) > 24:
                    historical_completion = None
                    try:
                        versions = frappe.get_all("Version", filters={"docname": self.name, "ref_doctype": "Site"}, fields=["creation", "data"], order_by="creation asc", limit=0)
                        for v in versions:
                            try:
                                v_data = frappe.parse_json(v.data)
                                if isinstance(v_data, dict) and v_data.get("changed"):
                                    for change in v_data.get("changed"):
                                        if change and len(change) >= 3 and change[0] == "site_status" and str(change[2]).strip() == "Delivered and Live":
                                            historical_completion = v.creation
                                            break
                            except Exception:
                                pass
                            if historical_completion:
                                break
                    except Exception:
                        pass
                    self.site_completed_date = historical_completion or self.modified or now_datetime()
                else:
                    self.site_completed_date = now_datetime()
            
            completed_dt = getattr(self, "site_completed_date", None) or now_datetime()
            
            # Use the new working days calculation to match due_date logic
            total_working_days = calculate_tat_working_days(effective_start_date, completed_dt)
            # Ensure it's not negative and subtract hold days (assuming hold_days are also working days)
            actual_tat = max(0.0, float(total_working_days) - (self.hold_days or 0))
            self.site_tat = round(actual_tat, 2)
            self.sla_status = "Completed"
            
            # Check if completed within due date
            if getdate(self.site_completed_date) <= getdate(self.due_date):
                self.tat_status = "Fulfilled"
            else:
                self.tat_status = "Failed"
                
        elif self.site_status == "On Hold":
            self.sla_status = "Paused"
            self.tat_status = "Paused"
            
        else:
            self.site_completed_date = None
            self.site_tat = 0.0
            self.tat_status = "Resolution Due"
            
            # Dynamic SLA tracking for ongoing
            if self.due_date:
                hours_remaining = time_diff_in_hours(self.due_date, now_datetime())
                # If negative, it's overdue
                if hours_remaining < 0:
                    self.sla_status = "Overdue"
                elif hours_remaining <= 48:
                    self.sla_status = "Near Due"
                else:
                    self.sla_status = "Within TAT"

    @frappe.whitelist()
    def create_stock_request(self):
        return self.handle_status_update(
            site_status="Stock Requested",
            sm_status="Stock Requested",
            site_item_status="Stock Requested"
        )

    @frappe.whitelist()
    def delivery_request(self, delivery_date=None, is_different_instruction=None, shipment_instruction=None,
                      is_different_address=None, shipment_address=None, shipment_pincode=None, 
                      shipment_city=None, shipment_district=None, shipment_state=None, shipment_country=None,
                      is_different_contact=None, shipment_contact_person=None, contact_mobile_no=None):
        frappe.logger().debug(f"[DELIVERY_REQUEST] Incoming delivery_date: {delivery_date}")

        # Update delivery date in Site
        if delivery_date:
            self.delivery_requested_date = delivery_date
            self.delivery_date = delivery_date

        # Update shipment instruction if provided
        if is_different_instruction and shipment_instruction:
            self.instructions = shipment_instruction

        self.status = "Stock Delivery Requested"
        self.site_status = "In-process"
        self.stage = "Stock Delivery Requested"

        self.save(ignore_permissions=True)

        return self.handle_status_update(
            site_status="Stock Delivery Requested",
            sm_status="Stock Delivery Requested",
            site_item_status="Stock Delivery Requested",
            skip_validation=True,
            is_different_address=is_different_address,
            shipment_address=shipment_address,
            shipment_pincode=shipment_pincode,
            shipment_city=shipment_city,
            shipment_district=shipment_district,
            shipment_state=shipment_state,
            shipment_country=shipment_country,
            is_different_contact=is_different_contact,
            shipment_contact_person=shipment_contact_person,
            contact_mobile_no=contact_mobile_no,
            shipment_instruction=shipment_instruction
        )

    @frappe.whitelist()
    def stock_return_request(self):
        self.stage = "Stock Return Requested"
        self.save(ignore_permissions=True)
        
        return self.handle_status_update(
            site_status="Return Requested",
            sm_status="Stock Return Requested",
            site_item_status="Stock Return Request"
        )

    @frappe.whitelist()
    def cancel_stock_request(self):
        self.stage = "Cancelled"
        self.save(ignore_permissions=True)
        
        return self.handle_status_update(
            site_status="Cancelled",
            sm_status="Cancelled",
            site_item_status="Cancelled"
        )

    @frappe.whitelist()
    def mark_on_hold(self):
        self.stage = "On Hold"
        self.save(ignore_permissions=True)
        
        return self.handle_status_update(
            site_status="On Hold",
            sm_status="On Hold",
            site_item_status="On Hold"
        )

    def handle_status_update(self, site_status, sm_status, site_item_status, skip_validation=False, **kwargs):
        self.reload()

        # Update parent Site status
        self.status = site_status
        if site_status == "Stock Requested":
            self.stage = "Stock Requested"
            self.site_status = "In-process"

        # Update Site Item child table status (all rows)
        for item in self.site_item:
            item.status = site_item_status

        self.save(ignore_permissions=True)

        # Check if Stock Management already exists using field in parent
        if self.stock_management_id and frappe.db.exists("Stock Management", self.stock_management_id):
            sm = frappe.get_doc("Stock Management", self.stock_management_id)
            if skip_validation:
                sm.flags.skip_validation = True
            sm.status = sm_status

            if self.delivery_requested_date:
                sm.delivery_requested_date = self.delivery_requested_date

            # Update shipment details in Stock Management (removed different_shipment_address)
            if kwargs.get('is_different_address') is not None:
                if kwargs.get('is_different_address'):
                    sm.shipment_details = kwargs.get('shipment_address')
                    sm.shipping_pincode = kwargs.get('shipment_pincode')
                    sm.shipping_district = kwargs.get('shipment_district')
                    sm.shipping_state = kwargs.get('shipment_state')
                    sm.shipping_country = kwargs.get('shipment_country')
                    sm.shipping_city = kwargs.get('shipment_city')
                else:
                    site = frappe.get_doc("Site", self.name)
                    sm.shipment_details = site.address_street
                    sm.shipping_pincode = site.pincode
                    sm.shipping_district = site.district
                    sm.shipping_state = site.state
                    sm.shipping_country = site.country
                    sm.shipping_city = site.city

            # Update contact info in Stock Management
            if kwargs.get('is_different_contact') is not None:
                if kwargs.get('is_different_contact'):
                    sm.shipping_contact_person = kwargs.get('shipment_contact_person')
                    sm.shippling_primary_contact_mobile = kwargs.get('contact_mobile_no')
                else:
                    site = frappe.get_doc("Site", self.name)
                    sm.shipping_contact_person = site.contact_person
                    sm.shippling_primary_contact_mobile = site.primary_contact_mobile

            # Update instructions
            if kwargs.get('shipment_instruction'):
                sm.instructions = kwargs.get('shipment_instruction')

            sm.save()
            msg = _("Updated Stock Management: {0}").format(sm.name)

        else:
            sm = frappe.new_doc("Stock Management")
            sm.update({
                "status": sm_status,
                "site": self.name,
                "circuit_id": self.circuit_id,
                "delivery_requested_date": self.delivery_requested_date or None,
                "customer_type": self.customer_type
            })

            # Set shipment details for new Stock Management (removed different_shipment_address)
            if kwargs.get('is_different_address') is not None:
                if kwargs.get('is_different_address'):
                    sm.shipment_details = kwargs.get('shipment_address')
                    sm.shipping_pincode = kwargs.get('shipment_pincode')
                    sm.shipping_district = kwargs.get('shipment_district')
                    sm.shipping_state = kwargs.get('shipment_state')
                    sm.shipping_country = kwargs.get('shipment_country')
                    sm.shipping_city = kwargs.get('shipment_city')
                else:
                    site = frappe.get_doc("Site", self.name)
                    sm.shipment_details = site.address_street
                    sm.shipping_pincode = site.pincode
                    sm.shipping_district = site.district
                    sm.shipping_state = site.state
                    sm.shipping_country = site.country
                    sm.shipping_city = site.city

            # Set contact info for new Stock Management
            if kwargs.get('is_different_contact') is not None:
                if kwargs.get('is_different_contact'):
                    sm.shipping_contact_person = kwargs.get('shipment_contact_person')
                    sm.shipping_primary_contact_mobile = kwargs.get('contact_mobile_no')
                else:
                    site = frappe.get_doc("Site", self.name)
                    sm.shipping_contact_person = site.contact_person
                    sm.shipping_primary_contact_mobile = site.primary_contact_mobile

            # Set instructions for new Stock Management
            if kwargs.get('shipment_instruction'):
                sm.instructions = kwargs.get('shipment_instruction')

            for site_item in self.site_item:
                sm.append("stock_management_item", {
                    "item_code": site_item.item_code,
                    "qty": site_item.qty,
                    "warehouse": site_item.warehouse,
                    "site_item": site_item.name,
                    "status": site_item_status
                })

            if hasattr(self, "wireless") and getattr(self, "wireless"):
                for wireless_entry in self.wireless:
                    sm.append("table_znyq", {
                        "operator": wireless_entry.operator,
                        "3g": wireless_entry.get("3g") or "",
                        "4g": wireless_entry.get("4g") or "",
                        "5g": wireless_entry.get("5g") or ""
                    })

            sm.insert(ignore_permissions=True)
            if skip_validation:
                sm.flags.skip_validation = True
            sm.save()

            # Set Stock Management ID in parent
            self.db_set("stock_management_id", sm.name)
            msg = _("Created Stock Management: {0}").format(sm.name)

        self.save(ignore_permissions=True)
        frappe.msgprint(msg)
        frappe.publish_realtime('list_refresh', 'Stock Management')
        return sm.name

    @frappe.whitelist()
    def validate_site_cancellation(self):
        # 1. Check Delivery Notes
        dn_records = []
        dn_items = frappe.db.sql("""
            SELECT parent 
            FROM `tabDelivery Note Item` 
            WHERE custom_circuit_id = %s
        """, self.name, as_dict=True)
        
        if dn_items:
            dn_names = [d.parent for d in dn_items]
            dns = frappe.db.sql("""
                SELECT name, posting_date 
                FROM `tabDelivery Note` 
                WHERE name IN %s AND status IN ('To Bill', 'Completed') AND docstatus < 2 AND is_return = 0
            """, (tuple(dn_names),), as_dict=True)
            for dn in dns:
                dn_records.append({"name": dn.name, "posting_date": dn.posting_date})
                
        # 2. Check Purchase Orders
        po_records = []
        
        po_items = frappe.db.sql("""
            SELECT parent 
            FROM `tabPurchase Order Item` 
            WHERE custom_circuit_id = %s
        """, self.name, as_dict=True)
        
        po_names_from_items = [d.parent for d in po_items]
        
        if po_names_from_items:
            pos = frappe.db.sql("""
                SELECT name, supplier_name, transaction_date 
                FROM `tabPurchase Order` 
                WHERE (custom_site_circuit_id = %s OR name IN %s) 
                AND status IN ('To Receive and Bill', 'To Bill', 'To Receive', 'Completed', 'Delivered')
                AND docstatus < 2
            """, (self.name, tuple(po_names_from_items)), as_dict=True)
        else:
            pos = frappe.db.sql("""
                SELECT name, supplier_name, transaction_date 
                FROM `tabPurchase Order` 
                WHERE custom_site_circuit_id = %s 
                AND status IN ('To Receive and Bill', 'To Bill', 'To Receive', 'Completed', 'Delivered')
                AND docstatus < 2
            """, self.name, as_dict=True)
            
        for po in pos:
            po_records.append({"name": po.name, "supplier_name": po.supplier_name, "transaction_date": po.transaction_date})
            
        return {
            "can_cancel": len(dn_records) == 0 and len(po_records) == 0,
            "delivery_notes": dn_records,
            "purchase_orders": po_records
        }