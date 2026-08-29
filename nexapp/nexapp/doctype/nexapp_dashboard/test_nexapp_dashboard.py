import frappe
from frappe.tests.utils import FrappeTestCase
from nexapp.reporting_api import save_dashboard, get_dashboard, execute_dashboard_batch, execute_dashboard_widget, get_dashboards
import json

class TestNexappDashboard(FrappeTestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        for d in frappe.get_all("Nexapp Dashboard"):
            frappe.delete_doc("Nexapp Dashboard", d.name, force=1)
        for w in frappe.get_all("Nexapp Dashboard Widget"):
            frappe.delete_doc("Nexapp Dashboard Widget", w.name, force=1)
            
        if not frappe.db.exists("User", "dash_test_1@example.com"):
            user = frappe.new_doc("User")
            user.email = "dash_test_1@example.com"
            user.first_name = "Dash1"
            user.insert(ignore_permissions=True)
            
        if not frappe.db.exists("User", "dash_test_2@example.com"):
            user = frappe.new_doc("User")
            user.email = "dash_test_2@example.com"
            user.first_name = "Dash2"
            user.insert(ignore_permissions=True)
            
        if not frappe.db.exists("Role", "Dashboard Reviewer"):
            frappe.get_doc({"doctype": "Role", "role_name": "Dashboard Reviewer"}).insert(ignore_permissions=True)
            
        frappe.get_doc("User", "dash_test_1@example.com").add_roles("Dashboard Reviewer")
        
        # We need a report to use in tests
        from nexapp.reporting_api import save_report
        try:
            save_report("Test Dash Report", "User", '{"fields": ["name"], "limit": 10}', "Public")
        except:
            pass

    def test_private_dashboard(self):
        frappe.set_user("dash_test_1@example.com")
        save_dashboard("Private Dash", "Desc", "Private", "{}", "[]")
        
        # Owner can read
        self.assertTrue(get_dashboard("Private Dash"))
        
        # Another user cannot
        frappe.set_user("dash_test_2@example.com")
        self.assertRaises(frappe.PermissionError, get_dashboard, "Private Dash")
        
        # Admin can read
        frappe.set_user("Administrator")
        self.assertTrue(get_dashboard("Private Dash"))
        
    def test_public_dashboard(self):
        frappe.set_user("dash_test_1@example.com")
        save_dashboard("Public Dash", "Desc", "Public", "{}", "[]")
        
        frappe.set_user("dash_test_2@example.com")
        self.assertTrue(get_dashboard("Public Dash"))
        
    def test_specific_user_shared(self):
        frappe.set_user("dash_test_1@example.com")
        shares = json.dumps([{"share_type": "User", "user": "dash_test_2@example.com"}])
        save_dashboard("User Dash", "Desc", "Specific Users", "{}", "[]", shares)
        
        frappe.set_user("dash_test_2@example.com")
        self.assertTrue(get_dashboard("User Dash"))
        
        # Unshared user cannot read
        if not frappe.db.exists("User", "dash_test_3@example.com"):
            user = frappe.new_doc("User")
            user.email = "dash_test_3@example.com"
            user.first_name = "Dash3"
            user.insert(ignore_permissions=True)
            
        frappe.set_user("dash_test_3@example.com")
        self.assertRaises(frappe.PermissionError, get_dashboard, "User Dash")
        
    def test_role_shared(self):
        frappe.set_user("dash_test_2@example.com")
        shares = json.dumps([{"share_type": "Role", "role": "Dashboard Reviewer"}])
        save_dashboard("Role Dash", "Desc", "Roles", "{}", "[]", shares)
        
        # dash_test_1 has Role
        frappe.set_user("dash_test_1@example.com")
        self.assertTrue(get_dashboard("Role Dash"))
        
        # Admin removes role from user 3 for test
        frappe.set_user("dash_test_3@example.com")
        self.assertRaises(frappe.PermissionError, get_dashboard, "Role Dash")
        
    def test_endpoint_consistency(self):
        frappe.set_user("dash_test_1@example.com")
        layout = json.dumps({"lyt_1": {"x":0,"y":0,"w":6,"h":4}})
        widgets = json.dumps([{"title": "W1", "type": "Table", "report": "Test Dash Report", "config": {"layout_id": "lyt_1"}}])
        save_dashboard("Secure Dash", "Desc", "Private", layout, widgets)
        
        dash = frappe.get_doc("Nexapp Dashboard", {"dashboard_name": "Secure Dash"})
        wname = frappe.get_all("Nexapp Dashboard Widget", {"parent_dashboard": dash.name})[0].name
        
        frappe.set_user("dash_test_2@example.com")
        self.assertRaises(frappe.PermissionError, get_dashboard, "Secure Dash")
        self.assertRaises(frappe.PermissionError, execute_dashboard_widget, wname)
        self.assertRaises(frappe.PermissionError, execute_dashboard_batch, "Secure Dash")
        
    def test_widget_regression(self):
        frappe.set_user("dash_test_1@example.com")
        layout = json.dumps({"lyt_2": {"x":1,"y":2,"w":3,"h":4}})
        widgets = json.dumps([{"title": "W2", "type": "Table", "report": "Test Dash Report", "config": {"layout_id": "lyt_2"}}])
        save_dashboard("Reg Dash", "Desc", "Private", layout, widgets)
        
        dash = get_dashboard("Reg Dash")
        wname = dash["widgets"][0].name
        self.assertTrue(wname)
        layout_dict = json.loads(dash["layout_config"]) if isinstance(dash["layout_config"], str) else dash["layout_config"]
        
        self.assertEqual(layout_dict["lyt_2"]["x"], 1)
        self.assertEqual(layout_dict["lyt_2"]["y"], 2)
        
        # Update
        widgets_update = json.dumps([{"name": wname, "title": "W2 Update", "type": "Table", "report": "Test Dash Report", "config": {"layout_id": "lyt_2"}}])
        save_dashboard("Reg Dash", "Desc", "Private", layout, widgets_update)
        
        dash2 = get_dashboard("Reg Dash")
        self.assertEqual(dash2["widgets"][0].name, wname)
        self.assertEqual(dash2["widgets"][0].widget_title, "W2 Update")

    def test_sharing_mutation(self):
        frappe.set_user("dash_test_1@example.com")
        shares = json.dumps([{"share_type": "User", "user": "dash_test_2@example.com"}])
        save_dashboard("Mut Dash", "Desc", "Specific Users", "{}", "[]", shares)
        
        d = get_dashboard("Mut Dash")
        self.assertEqual(len(d["shares"]), 1)
        self.assertEqual(d["shares"][0]["share_type"], "User")
        
        shares2 = json.dumps([{"share_type": "Role", "role": "Dashboard Reviewer"}])
        save_dashboard("Mut Dash", "Desc", "Roles", "{}", "[]", shares2)
        d2 = get_dashboard("Mut Dash")
        self.assertEqual(len(d2["shares"]), 1)
        self.assertEqual(d2["shares"][0]["share_type"], "Role")

    def test_batch_performance_cache(self):
        frappe.set_user("dash_test_1@example.com")
        layout = json.dumps({
            "lyt_1": {"x":0,"y":0,"w":6,"h":4},
            "lyt_2": {"x":6,"y":0,"w":6,"h":4}
        })
        widgets = json.dumps([
            {"title": "W1", "type": "Table", "report": "Test Dash Report", "config": {"layout_id": "lyt_1"}},
            {"title": "W2", "type": "Table", "report": "Test Dash Report", "config": {"layout_id": "lyt_2"}}
        ])
        save_dashboard("Perf Dash", "Desc", "Public", layout, widgets)
        
        # We test that execute_dashboard_batch returns both widgets successfully
        res = execute_dashboard_batch("Perf Dash")
        self.assertEqual(len(res.keys()), 2)
        for k in res:
            self.assertEqual(res[k]["status"], "success")

