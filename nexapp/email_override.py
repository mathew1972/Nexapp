import frappe

def set_hd_ticket_sender(doc, method):
    try:
        if doc.reference_doctype == "HD Ticket":

            email = "techsupport@nexapp.co.in"

            # ✅ Force clean sender (NO NAME)
            doc.sender = email

            # ✅ Remove any display name
            doc.sender_full_name = None

            # ✅ VERY IMPORTANT (this removes "Rajat Deo")
            doc.from_email = email

            # Set correct Email Account
            email_account = frappe.db.get_value(
                "Email Account",
                {"email_id": email},
                "name"
            )

            if email_account:
                doc.email_account = email_account

    except Exception:
        frappe.log_error(frappe.get_traceback(), "HD Ticket Email Override Error")