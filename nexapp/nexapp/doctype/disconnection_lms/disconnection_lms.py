import frappe
from frappe.model.document import Document

class DisconnectionLMS(Document):
    pass


@frappe.whitelist()
def process_disconnection(lms_id, circuit_id):
    """Disconnect LMS: Update Lastmile Services Master and Site > lms_vendor child table."""

    # ----------- UPDATE LASTMILE SERVICES MASTER -----------
    if frappe.db.exists("Lastmile Services Master", lms_id):
        frappe.db.set_value(
            "Lastmile Services Master",
            lms_id,
            "lms_stage",
            "Disconnected"
        )

    # ----------- UPDATE SITE CHILD TABLE: lms_vendor -----------
    if frappe.db.exists("Site", circuit_id):
        site_doc = frappe.get_doc("Site", circuit_id)

        # Use EXACT field you mentioned: lms_vendor
        child_table = "lms_vendor"

        if not hasattr(site_doc, child_table):
            frappe.throw("Child table 'lms_vendor' does not exist in Site. Please check fieldname.")

        updated = False

        for row in getattr(site_doc, child_table):
            if row.lms_id == lms_id:  # match LMS ID
                row.stage = "LMS Disconnected"
                updated = True

        if updated:
            site_doc.save(ignore_permissions=True)

    # ----------- CONFIRM MESSAGE -----------
    return f"""
        LMS ID <b>{lms_id}</b> is now <b>Disconnected</b> in Lastmile Services Master.<br>
        Site <b>{circuit_id}</b> updated to <b>LMS Disconnected</b> under LMS Vendor table.
    """
