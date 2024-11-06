import frappe
from datetime import datetime

@frappe.whitelist(allow_guest=True)
def get_upcoming_holiday():
    today = datetime.today().date()
    try:
        holiday_list_name = 'Holiday List 2024'  # Ensure this matches the actual list name
        frappe.logger().info(f"Fetching holidays for parent: {holiday_list_name}")
        
        holidays = frappe.get_list(
            'Holiday',
            filters={
                'parent': holiday_list_name,
                'holiday_date': ('>=', today)
            },
            fields=['holiday_date', 'description'],
            order_by='holiday_date asc',
            limit=1
        )
        
        frappe.logger().info(f"Holidays fetched: {holidays}")

        if holidays:
            holiday = holidays[0]
            return {
                "holiday_date": holiday['holiday_date'],
                "description": holiday['description']
            }
        else:
            return {"message": "No upcoming holidays"}
    except Exception as e:
        frappe.log_error(message=str(e), title="Holiday Fetch Error")
        return {"error": "Unable to fetch holiday data"}
