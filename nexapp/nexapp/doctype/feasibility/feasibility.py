# Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class Feasibility(Document):
    def before_save(self):
        if self.feasibility_status == "Completed":
            # Check if the site_name exists in the Feasibility Doctype
            if not self.site_name:
                frappe.throw("Site Name is required in Feasibility Doctype.")

            try:
                # Check if Site with the same Circuit ID already exists
                existing_site = frappe.get_all('Site', filters={'circuit_id': self.circuit_id}, limit=1)

                if existing_site:
                    frappe.throw(f"Site with Circuit ID '{self.circuit_id}' already exists. Please use a unique Circuit ID.")

                # Create a new Site document
                site_doc = frappe.new_doc("Site")
                site_doc.site_name = self.site_name

                # Populate parent fields from Feasibility to Site
                site_doc.customer = self.customer
                site_doc.pincode = self.pincode
                site_doc.street = self.street
                site_doc.district = self.district
                site_doc.city = self.city
                site_doc.state = self.state
                site_doc.country = self.country
                site_doc.longitude = self.longitude
                site_doc.latitude = self.latitude
                site_doc.feasibility_project_manager = self.feasibility_project_manager
                site_doc.contact_person = self.contact_person
                site_doc.other_person = self.other_person
                site_doc.contact_mobile = self.contact_mobile
                site_doc.other_mobile = self.other_mobile
                site_doc.email_id = self.email_id
                site_doc.other_email_id = self.other_email_id
                site_doc.designation = self.designation
                site_doc.other_designation = self.other_designation
                site_doc.department = self.department
                site_doc.other_department = self.other_department  
                site_doc.order_type = self.order_type
                site_doc.solution = self.solution
                site_doc.customer_request = self.customer_request
                site_doc.phase = self.phase
                site_doc.feasibility_status = self.feasibility_status
                site_doc.circuit_id = self.circuit_id
                site_doc.region = self.region
                site_doc.feasibility_completed_date = frappe.utils.now()

                # Populate LMS Site child table with data from LMS Feasibility
                if self.lms_provider:
                    for feasibility_child in self.lms_provider:
                        site_child = site_doc.append("lms_provider", {})
                        site_child.lms_supplier = feasibility_child.lms_supplier
                        site_child.bandwith_type = feasibility_child.bandwith_type
                        site_child.media = feasibility_child.media
                        site_child.otc = feasibility_child.otc
                        site_child.static_ip_cost = feasibility_child.static_ip_cost
                        site_child.billing_terms = feasibility_child.billing_terms
                        site_child.support_mode = feasibility_child.support_mode
                        site_child.supplier_contact = feasibility_child.supplier_contact
                        site_child.lms_bandwith = feasibility_child.lms_bandwith
                        site_child.static_ip = feasibility_child.static_ip
                        site_child.mrc = feasibility_child.mrc
                        site_child.security_deposit = feasibility_child.security_deposit
                        site_child.billing_mode = feasibility_child.billing_mode

                # Save the new Site document
                site_doc.insert(ignore_permissions=True)

                # Update feasibility_completed_date in Feasibility and save
                self.feasibility_completed_date = frappe.utils.now()
                frappe.db.set_value("Feasibility", self.name, "feasibility_completed_date", self.feasibility_completed_date)

                #frappe.msgprint(f"Site '{site_doc.name}' created successfully from Feasibility '{self.name}'.")

            except Exception as e:
                frappe.log_error(message=str(e), title="Error in Feasibility to Site Creation")
                frappe.throw("An error occurred while creating the Site document. Please check the logs.")
