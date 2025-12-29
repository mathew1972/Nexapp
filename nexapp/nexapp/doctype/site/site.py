# Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt
import frappe
from frappe import _
from frappe.model.document import Document

class Site(Document):
    
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