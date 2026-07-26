__version__ = "0.0.1"

from . import api

from frappe.desk.form import load
from nexapp.overrides.form_load import custom_get_communications

load._get_communications = custom_get_communications
