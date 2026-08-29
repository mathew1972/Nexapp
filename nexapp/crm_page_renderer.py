"""
Nexapp Custom Page Renderer for CRM Dashboard Integration.

Intercepts /crm routes (excluding /crm/not-permitted) and serves
nexapp/www/crm.html (which includes crm_extensions.js) instead of
the CRM app's own crm.html.

Root cause context:
  TemplatePage.set_pymodule() derives the .py module path from
  self.template_path.  When template_path uses a Jinja PrefixLoader
  prefix (e.g. "nexapp/www/crm.html"), the file-existence check
  joins self.app_path ("/…/nexapp/") + "nexapp/www/crm.py" →
  doubling the package directory, so crm.py is never found and
  get_context() is never called.

  We fix this by overriding set_pymodule() to construct the correct
  absolute path and Python module name directly.

Zero modifications to apps/crm, apps/frappe, or apps/erpnext.
"""

import os

import frappe
from frappe.website.page_renderers.template_page import TemplatePage


class NexappCRMPageRenderer(TemplatePage):
    """Serves nexapp/www/crm.html for /crm routes."""

    def __init__(self, path, http_status_code=None):
        # Initialize without calling TemplatePage.__init__ / set_template_path()
        # which would find the CRM app's template first.
        self.headers = None
        self.http_status_code = http_status_code or 200
        self.path = path.strip("/ ")
        self.basepath = ""
        self.basename = ""
        self.name = ""
        self.route = ""
        self.file_dir = None
        self.template_path = ""
        self.source = ""

        if self._is_crm_route():
            self._set_nexapp_crm_template()
            self.set_pymodule()

    def _is_crm_route(self):
        # Exclude /crm/not-permitted so native CRM fallback can render
        if self.path == "crm/not-permitted" or self.path.startswith("crm/not-permitted/"):
            return False
        return self.path == "crm" or self.path.startswith("crm/")

    def _set_nexapp_crm_template(self):
        self.app = "nexapp"
        self.app_path = frappe.get_app_path("nexapp")
        self.file_dir = "www"

        template_file = os.path.join(self.app_path, "www", "crm.html")
        if os.path.isfile(template_file):
            # Jinja PrefixLoader needs the "nexapp/" prefix to resolve
            # to the correct app directory
            self.template_path = "nexapp/www/crm.html"
            self.basepath = os.path.join(self.app_path, "www")
            self.basename = os.path.join(self.basepath, "crm")
            self.filename = "crm.html"
            self.name = "crm"
        else:
            self.template_path = None

    def set_pymodule(self):
        """Override to fix the double-directory bug.

        TemplatePage.set_pymodule() joins self.app_path (which already
        contains the package dir) with self.pymodule_path derived from
        self.template_path (which also contains the package prefix for
        Jinja).  This causes a doubled path like:
            .../nexapp/nexapp/nexapp/www/crm.py

        We bypass this by computing the pymodule path directly from
        the known filesystem location.
        """
        self.pymodule_name = None
        py_file = os.path.join(self.app_path, "www", "crm.py")
        if os.path.isfile(py_file):
            # "www/crm.py" relative to self.app_path
            self.pymodule_path = "www/crm.py"
            # Python import path: nexapp.nexapp.www.crm
            # (app_name.package_name.www.crm)
            self.pymodule_name = "nexapp.www.crm"

    def can_render(self):
        return (
            self._is_crm_route()
            and hasattr(self, "template_path")
            and self.template_path
        )
