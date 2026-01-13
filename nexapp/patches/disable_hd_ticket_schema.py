import frappe

def execute():
    from frappe.database.schema import DBTable

    original_alter = DBTable.alter

    def safe_alter(self):
        if self.table_name == "tabHD Ticket":
            frappe.logger().warning("⛔ Skipping schema alter for HD Ticket (prod safety)")
            return
        return original_alter(self)

    DBTable.alter = safe_alter
