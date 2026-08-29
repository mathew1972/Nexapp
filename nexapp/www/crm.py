import frappe

no_cache = 1


def get_context(context):
    from crm.api import check_app_permission
    from crm.www.crm import get_boot
    from frappe.utils.telemetry import capture

    if not check_app_permission():
        frappe.throw(
            frappe._("You do not have permission to access Frappe CRM"),
            frappe.PermissionError,
        )

    frappe.db.commit()
    
    # Safe CSRF token retrieval when session_obj is absent
    try:
        csrf_token = frappe.sessions.get_csrf_token()
    except Exception:
        csrf_token = getattr(frappe.local.session, "data", {}).get("csrf_token", "") if getattr(frappe.local, "session", None) else ""

    boot_data = get_boot()
    boot_data["csrf_token"] = csrf_token
    context.boot = boot_data

    if frappe.session.user != "Guest":
        capture("active_site", "crm")

    # Pre-serialize boot data as JSON safely using frappe.as_json
    context.boot_json = frappe.as_json(context.boot)
