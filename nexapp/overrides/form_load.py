from frappe.desk.form import load

original_get_communications = load._get_communications

def custom_get_communications(doctype, name, *args, **kwargs):
    if doctype == "Company":
        return []

    return original_get_communications(
        doctype,
        name,
        *args,
        **kwargs
    )
