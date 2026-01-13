import frappe

def execute():
    frappe.db.sql("""
        UPDATE tabDocType
        SET allow_rename = 0
        WHERE name = 'HD Ticket'
    """)

    frappe.db.sql("""
        UPDATE tabDocType
        SET allow_import = 0
        WHERE name = 'HD Ticket'
    """)

    frappe.db.commit()
