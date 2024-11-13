app_name = "nexapp"
app_title = "Nexapp"
app_publisher = "Nexapp Technologies Private Limited"
app_description = "Nexapp ERP"
app_email = "mathewsamuel10@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "nexapp",
# 		"logo": "/assets/nexapp/logo.png",
# 		"title": "Nexapp",
# 		"route": "/nexapp",
# 		"has_permission": "nexapp.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/nexapp/css/nexapp.css"
# app_include_js = "/assets/nexapp/js/nexapp.js"

# include js, css files in header of web template
# web_include_css = "/assets/nexapp/css/nexapp.css"
# web_include_js = "/assets/nexapp/js/nexapp.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "nexapp/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "nexapp/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinjanexapperp.com
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "nexapp.utils.jinja_methods",
# 	"filters": "nexapp.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "nexapp.install.before_install"
# after_install = "nexapp.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "nexapp.uninstall.before_uninstall"
# after_uninstall = "nexapp.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "nexapp.utils.before_app_install"
# after_app_install = "nexapp.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "nexapp.utils.before_app_uninstall"
# after_app_uninstall = "nexapp.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "nexapp.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"nexapp.tasks.all"
# 	],
# 	"daily": [
# 		"nexapp.tasks.daily"
# 	],
# 	"hourly": [
# 		"nexapp.tasks.hourly"
# 	],
# 	"weekly": [
# 		"nexapp.tasks.weekly"
# 	],
# 	"monthly": [
# 		"nexapp.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "nexapp.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "nexapp.event.get_events"
# }



#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "nexapp.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["nexapp.utils.before_request"]
# after_request = ["nexapp.utils.after_request"]

# Job Events
# ----------
# before_job = ["nexapp.utils.before_job"]
# after_job = ["nexapp.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"nexapp.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

app_include_css = [
    "/assets/nexapp/css/custom.css"    
]

doctype_js = {
    "Lead": "public/js/lead_custom.js",
    "Opportunity": "public/js/Deal_custom.js",
    "Customer": "public/js/Customer_custom.js",
    "Quotation": "public/js/Quotes_custom.js",
    "Item Price": "public/js/Product_Price_custom.js",
    "Sales Order": "public/js/Sales_Order_custom.js",
    "Sales Invoice": "public/js/Sales_Invoice_custom.js",
    "Payment Entry": "public/js/Payment_Entry_custom.js",
    "Territory": "public/js/Territory_custom.js",
    "Job Opening": "public/js/Job_opening _custom.js",
    "Job Applicant": "public/js/Job_applicant_custom.js",
    "Job Offer": "public/js/Job_offer_custom.js",
    "Staffing Plan": "public/js/Staffing_plan_custom.js",
    "Job Requisition": "public/js/Job_requisition_custom.js",
    "Employee Referral": "public/js/Employee_referral_custom.js",
    "Interview Type": "public/js/Interview_type_custom.js",
    "Interview Round": "public/js/Interview_round_custom.js",
    "Interview": "public/js/Interview_custom.js",
    "Interview Feedback": "public/js/Interview_feedback_custom.js",
    "Appointment Letter Template": "public/js/Appointment_letter_template_custom.js",
    "Appointment Letter": "public/js/Appointment_letter_custom.js",
    "Employee": "public/js/Employee_custom.js",
    "Leave Application": "public/js/Leave_application_custom.js",
    "Company": "public/js/Company_custom.js",
    "Branch": "public/js/Branch_custom.js",
    "Department": "public/js/Department_custom.js",
    "Designation": "public/js/Designation_custom.js",
    "Employee Group": "public/js/Employee_group_custom.js",
    "Employee Grade": "public/js/Employee_grade_custom.js",
    "Compensatory Leave Request": "public/js/Compensatory_leave_request_custom.js",
    "HR Settings": "public/js/HR_settings_custom.js",
    "Daily Work Summary Group": "public/js/Daily_work_summary_group_custom.js",
    "Attendance": "public/js/Attendance_custom.js",
    "Attendance Request": "public/js/Attendance_request_custom.js",
    "Employee Checkin": "public/js/Employee_checkin_custom.js",
    "Expense Claim": "public/js/Expense_claim_custom.js",
    "Employee Advance": "public/js/Employee_advance_custom.js",
    "Travel Request": "public/js/Travel_request_custom.js",

    "Delivery Note": "public/js/Stock_custom_ui.js",
    "Material Request": "public/js/Stock_custom_ui.js",
    "Stock Entry": "public/js/Stock_custom_ui.js",
    "Purchase Receipt": "public/js/Stock_custom_ui.js",
    "Item": "public/js/Stock_custom_ui.js",
    "Item Group": "public/js/Stock_custom_ui.js",
    "Product Bundle": "public/js/Stock_custom_ui.js",
    "Shipping Rule": "public/js/Stock_custom_ui.js",
    "Item Alternative": "public/js/Stock_custom_ui.js",
    "Pick List": "public/js/Stock_custom_ui.js",
    "Warehouse": "public/js/Stock_custom_ui.js",
    "UOM": "public/js/Stock_custom_ui.js",
    "Brand": "public/js/Stock_custom_ui.js",
    "Item Attribute": "public/js/Stock_custom_ui.js",
    "Serial No": "public/js/Stock_custom_ui.js",
    "Batch": "public/js/Stock_custom_ui.js",
    "Installation Note": "public/js/Stock_custom_ui.js",
    "Stock Reconciliation": "public/js/Stock_custom_ui.js",
    "Landed Cost Voucher": "public/js/Stock_custom_ui.js",
    "Packing Slip": "public/js/Stock_custom_ui.js",
    "Quality Inspection": "public/js/Stock_custom_ui.js",
    "Quality Inspection Template": "public/js/Stock_custom_ui.js",
    "Quick Stock Balance": "public/js/Stock_custom_ui.js",
   
    "Site": "public/js/Site_custom.js"      
    
}

fixtures = [
    {"dt": "Territory"},
    {"dt": "Site Type"},
    {"dt": "Solution"},
    {"dt": "SOW"},  
    {"dt": "DocType", "filters": [["module", "=", "Nexapp"]]},
    {"dt": "Custom Field", "filters": [["module", "=", "Nexapp"]]},    
    {"dt": "Property Setter"},
    {"dt": "Website Settings"},
    {"dt": "Navbar Settings"},
    {"dt": "Website Theme"},
    {"dt": "Web Page", "filters": [["module", "=", "Nexapp"]]},
    {"dt": "Custom HTML Block", "filters": [["name", "=", "Recruitment Workspace"]]},
    {"dt": "Workspace", "filters": [["name", "=", "HR Recruitment"]]}
]
