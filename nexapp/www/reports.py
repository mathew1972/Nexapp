import frappe

def get_context(context):
    if hasattr(frappe, "session") and hasattr(frappe.session, "data"):
        context.csrf_token = frappe.session.data.csrf_token
    context.no_cache = 1

