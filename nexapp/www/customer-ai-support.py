import frappe

def get_context(context):
    # Check if the user is not logged in (is a Guest)
    if frappe.session.user == "Guest":
        # Redirect them to the login page immediately
        frappe.local.flags.redirect_location = "/login"
        raise frappe.Redirect
