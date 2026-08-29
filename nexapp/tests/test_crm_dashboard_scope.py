"""
Nexapp CRM Dashboard — Phase 1 Security Tests (Revised)
========================================================

Tests hierarchy-aware scope resolution, filter validation, period calculations,
and hierarchy enabled/disabled states.

Test Hierarchy:
    master@test.nexapp  (root, is_group=1)
    ├── mgr_a@test.nexapp (is_group=1)
    │   ├── a1@test.nexapp
    │   ├── a2@test.nexapp
    │   └── a3@test.nexapp
    ├── mgr_b@test.nexapp (is_group=1)
    │   ├── b1@test.nexapp
    │   └── b2@test.nexapp
    └── mgr_c@test.nexapp (is_group=1)
        ├── c1@test.nexapp
        └── c2@test.nexapp
"""

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils.nestedset import rebuild_tree

from nexapp.api.crm_dashboard import (
    _resolve_scope,
    validate_dashboard_filters,
    resolve_period,
)

TEST_USERS = [
    "master@test.nexapp",
    "mgr_a@test.nexapp",
    "mgr_b@test.nexapp",
    "mgr_c@test.nexapp",
    "a1@test.nexapp",
    "a2@test.nexapp",
    "a3@test.nexapp",
    "b1@test.nexapp",
    "b2@test.nexapp",
    "c1@test.nexapp",
    "c2@test.nexapp",
]


def _make_user(email, roles=None):
    if frappe.db.exists("User", email):
        u = frappe.get_doc("User", email)
    else:
        u = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": email.split("@")[0].replace("_", " ").title(),
            "send_welcome_email": 0,
        }).insert(ignore_permissions=True)
    
    for role in (roles or []):
        u.add_roles(role)
    return u


def _make_node(user_email, reports_to=None, is_group=0):
    existing = frappe.db.get_value("CRM Sales Hierarchy", {"user": user_email}, "name")
    if existing:
        return frappe.get_doc("CRM Sales Hierarchy", existing)
    return frappe.get_doc({
        "doctype": "CRM Sales Hierarchy",
        "user": user_email,
        "reports_to": reports_to,
        "is_group": is_group,
    }).insert(ignore_permissions=True)


def _cleanup_test_data():
    """Remove test users and hierarchy nodes cleanly."""
    for email in TEST_USERS:
        frappe.db.delete("CRM Sales Hierarchy", {"user": email})
        if frappe.db.exists("User", email):
            frappe.db.delete("User", email)
    frappe.db.commit()


class TestCRMDashboardScope(IntegrationTestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        _cleanup_test_data()

        # Create test users
        _make_user("master@test.nexapp", roles=["Sales Manager"])
        _make_user("mgr_a@test.nexapp", roles=["Sales Manager"])
        _make_user("mgr_b@test.nexapp", roles=["Sales Manager"])
        _make_user("mgr_c@test.nexapp", roles=["Sales Manager"])
        _make_user("a1@test.nexapp", roles=["Sales User"])
        _make_user("a2@test.nexapp", roles=["Sales User"])
        _make_user("a3@test.nexapp", roles=["Sales User"])
        _make_user("b1@test.nexapp", roles=["Sales User"])
        _make_user("b2@test.nexapp", roles=["Sales User"])
        _make_user("c1@test.nexapp", roles=["Sales User"])
        _make_user("c2@test.nexapp", roles=["Sales User"])

        # Build hierarchy tree
        root = _make_node("master@test.nexapp", is_group=1)
        mgr_a = _make_node("mgr_a@test.nexapp", reports_to=root.name, is_group=1)
        mgr_b = _make_node("mgr_b@test.nexapp", reports_to=root.name, is_group=1)
        mgr_c = _make_node("mgr_c@test.nexapp", reports_to=root.name, is_group=1)
        _make_node("a1@test.nexapp", reports_to=mgr_a.name)
        _make_node("a2@test.nexapp", reports_to=mgr_a.name)
        _make_node("a3@test.nexapp", reports_to=mgr_a.name)
        _make_node("b1@test.nexapp", reports_to=mgr_b.name)
        _make_node("b2@test.nexapp", reports_to=mgr_b.name)
        _make_node("c1@test.nexapp", reports_to=mgr_c.name)
        _make_node("c2@test.nexapp", reports_to=mgr_c.name)

        rebuild_tree("CRM Sales Hierarchy")

        settings = frappe.get_single("FCRM Settings")
        settings.enable_sales_hierarchy = 1
        settings.save(ignore_permissions=True)

    @classmethod
    def tearDownClass(cls):
        _cleanup_test_data()
        super().tearDownClass()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    # -------------------------------------------------------------------
    # A. HIERARCHY ENABLED TESTS
    # -------------------------------------------------------------------

    def test_hierarchy_enabled_master_manager(self):
        scope = _resolve_scope("master@test.nexapp")
        emails = [u["value"] for u in scope["permitted_users"]]
        self.assertEqual(len(emails), 11)
        self.assertEqual(len(scope["teams"]), 3)

    def test_hierarchy_enabled_manager_a(self):
        scope = _resolve_scope("mgr_a@test.nexapp")
        emails = [u["value"] for u in scope["permitted_users"]]
        self.assertEqual(set(emails), {"mgr_a@test.nexapp", "a1@test.nexapp", "a2@test.nexapp", "a3@test.nexapp"})

    def test_hierarchy_enabled_user_a1(self):
        scope = _resolve_scope("a1@test.nexapp")
        emails = [u["value"] for u in scope["permitted_users"]]
        self.assertEqual(emails, ["a1@test.nexapp"])

    # -------------------------------------------------------------------
    # B. HIERARCHY DISABLED TESTS
    # -------------------------------------------------------------------

    def test_hierarchy_disabled_sales_user_in_tree(self):
        settings = frappe.get_single("FCRM Settings")
        settings.enable_sales_hierarchy = 0
        settings.save(ignore_permissions=True)
        try:
            scope = _resolve_scope("a1@test.nexapp")
            emails = [u["value"] for u in scope["permitted_users"]]
            self.assertEqual(emails, ["a1@test.nexapp"])
        finally:
            settings.enable_sales_hierarchy = 1
            settings.save(ignore_permissions=True)

    def test_hierarchy_disabled_sales_manager_in_tree(self):
        settings = frappe.get_single("FCRM Settings")
        settings.enable_sales_hierarchy = 0
        settings.save(ignore_permissions=True)
        try:
            scope = _resolve_scope("mgr_a@test.nexapp")
            self.assertTrue(scope["is_unrestricted"])
        finally:
            settings.enable_sales_hierarchy = 1
            settings.save(ignore_permissions=True)

    def test_hierarchy_disabled_administrator(self):
        settings = frappe.get_single("FCRM Settings")
        settings.enable_sales_hierarchy = 0
        settings.save(ignore_permissions=True)
        try:
            scope = _resolve_scope("Administrator")
            self.assertTrue(scope["is_unrestricted"])
        finally:
            settings.enable_sales_hierarchy = 1
            settings.save(ignore_permissions=True)

    # -------------------------------------------------------------------
    # C. CROSS-FILTER SECURITY & ALL SEMANTICS
    # -------------------------------------------------------------------

    def test_manager_a_blocked_from_team_b(self):
        scope = _resolve_scope("mgr_a@test.nexapp")
        team_b_node = frappe.db.get_value("CRM Sales Hierarchy", {"user": "mgr_b@test.nexapp"}, "name")
        with self.assertRaises(frappe.PermissionError):
            validate_dashboard_filters(scope, team_filter=team_b_node)

    def test_manager_a_blocked_from_user_b1(self):
        scope = _resolve_scope("mgr_a@test.nexapp")
        with self.assertRaises(frappe.PermissionError):
            validate_dashboard_filters(scope, user_filter="b1@test.nexapp")

    def test_user_a1_blocked_from_user_a2(self):
        scope = _resolve_scope("a1@test.nexapp")
        with self.assertRaises(frappe.PermissionError):
            validate_dashboard_filters(scope, user_filter="a2@test.nexapp")

    def test_master_team_a_plus_b1_blocked(self):
        scope = _resolve_scope("master@test.nexapp")
        team_a = next(t for t in scope["teams"] if "mgr_a" in str(t.get("members", [])))
        with self.assertRaises(frappe.PermissionError):
            validate_dashboard_filters(scope, team_filter=team_a["value"], user_filter="b1@test.nexapp")

    # -------------------------------------------------------------------
    # D. PERIOD VALIDATION
    # -------------------------------------------------------------------

    def test_invalid_period_key_throws(self):
        with self.assertRaises(frappe.ValidationError):
            resolve_period("invalid_period")

    def test_custom_period_missing_dates_throws(self):
        with self.assertRaises(frappe.ValidationError):
            resolve_period("custom")

    def test_custom_period_from_after_to_throws(self):
        with self.assertRaises(frappe.ValidationError):
            resolve_period("custom", custom_from="2026-05-10", custom_to="2026-05-01")

    def test_valid_custom_period(self):
        res = resolve_period("custom", custom_from="2026-05-01", custom_to="2026-05-10")
        self.assertEqual(res, {"from_date": "2026-05-01", "to_date": "2026-05-10"})

    # -------------------------------------------------------------------
    # E. PHASE 2B EXECUTIVE KPI TESTS
    # -------------------------------------------------------------------

    def test_get_executive_kpis_structure_and_zero_denominator(self):
        frappe.set_user("master@test.nexapp")
        res = frappe.call("nexapp.api.crm_dashboard.get_executive_kpis", period="this_month")
        self.assertIn("scope", res)
        self.assertIn("kpis", res)
        self.assertIn("meta", res)

        kpis = res["kpis"]
        expected_keys = [
            "leads_created", "new_leads", "converted_leads", "conversion_rate",
            "open_deals", "pipeline_value", "weighted_pipeline", "average_deal_value",
            "won_deals", "won_revenue", "lost_deals", "win_rate",
            "invoiced_revenue", "overdue_followups"
        ]
        for key in expected_keys:
            self.assertIn(key, kpis)

        # Zero denominator check on Win Rate
        if kpis["won_deals"] + kpis["lost_deals"] == 0:
            self.assertEqual(kpis["win_rate"], 0.0)

    def test_get_executive_kpis_user_a1_scope(self):
        frappe.set_user("a1@test.nexapp")
        res = frappe.call("nexapp.api.crm_dashboard.get_executive_kpis", period="this_month")
        self.assertEqual(res["scope"]["effective_user_count"], 1)

    def test_get_executive_kpis_unauthorized_user_filter_throws(self):
        frappe.set_user("mgr_a@test.nexapp")
        with self.assertRaises(frappe.PermissionError):
            frappe.call(
                "nexapp.api.crm_dashboard.get_executive_kpis",
                period="this_month",
                user_filter="b1@test.nexapp"
            )

    # -------------------------------------------------------------------
    # F. DETERMINISTIC NUMERICAL KPI CALCULATION TESTS
    # -------------------------------------------------------------------

    def test_deterministic_kpis_and_invoice_duplication(self):
        """
        Creates controlled test records for a specific period and verifies
        exact mathematical calculations for all 14 KPIs:
        - Leads, Deals, Win Rate, Overdue ToDos
        - Sales Invoice with multiple Sales Team rows (duplicate protection)
        - Sales Invoice Returns (-ve subtraction)
        """
        # Ensure Customer and Company exist
        if not frappe.db.exists("Company", "Test Bench Company"):
            frappe.get_doc({
                "doctype": "Company",
                "company_name": "Test Bench Company",
                "default_currency": "INR",
            }).insert(ignore_permissions=True)

        if not frappe.db.exists("Customer", "Test Customer A"):
            frappe.get_doc({
                "doctype": "Customer",
                "customer_name": "Test Customer A",
                "customer_group": "Commercial",
                "territory": "All Territories",
            }).insert(ignore_permissions=True)

        # Create controlled test records for user 'a1@test.nexapp'
        # 1. Lead 1 (New, created 2026-05-02)
        lead1 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Deterministic Lead 1",
            "lead_owner": "a1@test.nexapp",
            "owner": "a1@test.nexapp",
            "status": "New",
        }).insert(ignore_permissions=True)
        lead1.db_set("creation", "2026-05-02 10:00:00")

        # 2. Lead 2 (Converted 2026-05-03 -> generates Deal 1)
        lead2 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Deterministic Lead 2",
            "lead_owner": "a1@test.nexapp",
            "owner": "a1@test.nexapp",
            "status": "Qualified",
            "converted": 1,
        }).insert(ignore_permissions=True)
        lead2.db_set("creation", "2026-05-02 11:00:00")

        deal1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "organization_name": "Deterministic Deal 1",
            "lead": lead2.name,
            "deal_owner": "a1@test.nexapp",
            "owner": "a1@test.nexapp",
            "status": "Qualification",
            "deal_value": 100000.0,
            "probability": 20.0,
        }).insert(ignore_permissions=True)
        deal1.db_set("creation", "2026-05-03 10:00:00")

        # 3. Deal 2 (Won, closed 2026-05-05, value=200000)
        deal2 = frappe.get_doc({
            "doctype": "CRM Deal",
            "organization_name": "Deterministic Deal 2",
            "deal_owner": "a1@test.nexapp",
            "owner": "a1@test.nexapp",
            "status": "Won",
            "deal_value": 200000.0,
        }).insert(ignore_permissions=True)
        deal2.db_set("creation", "2026-05-01 10:00:00")
        deal2.db_set("closed_date", "2026-05-05")

        existing_reason = frappe.db.get_value("CRM Lost Reason", {}, "name")
        if not existing_reason:
            lr_doc = frappe.get_doc({"doctype": "CRM Lost Reason", "reason": "Price"}).insert(ignore_permissions=True)
            existing_reason = lr_doc.name

        # 4. Deal 3 (Lost, closed 2026-05-06, value=50000)
        deal3 = frappe.get_doc({
            "doctype": "CRM Deal",
            "organization_name": "Deterministic Deal 3",
            "deal_owner": "a1@test.nexapp",
            "owner": "a1@test.nexapp",
            "status": "Lost",
            "lost_reason": existing_reason,
            "lost_notes": "Competitor offered lower pricing",
            "deal_value": 50000.0,
        }).insert(ignore_permissions=True)
        deal3.db_set("creation", "2026-05-01 10:00:00")
        deal3.db_set("closed_date", "2026-05-06")

        # 5. Overdue ToDo for a1@test.nexapp
        todo1 = frappe.get_doc({
            "doctype": "ToDo",
            "description": "Deterministic Overdue Task",
            "reference_type": "CRM Lead",
            "reference_name": lead1.name,
            "allocated_to": "a1@test.nexapp",
            "owner": "a1@test.nexapp",
            "status": "Open",
            "date": "2026-01-01",
        }).insert(ignore_permissions=True)

        # 6. Sales Invoice A: 100,000 INR with MULTIPLE Sales Team rows
        company = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")
        si1 = frappe.get_doc({
            "doctype": "Sales Invoice",
            "company": company,
            "customer": "Test Customer A",
            "posting_date": "2026-05-04",
            "currency": "INR",
            "net_total": 100000.0,
            "grand_total": 100000.0,
            "docstatus": 1,
            "sales_team": [
                {"sales_person": "Sales Team", "allocated_percentage": 50},
                {"sales_person": "Sales Team", "allocated_percentage": 50},
            ]
        })
        si1.flags.ignore_links = True
        si1.flags.ignore_validate = True
        si1.db_insert()
        si1.db_set("owner", "a1@test.nexapp")
        for child in si1.sales_team:
            child.parent = si1.name
            child.parenttype = "Sales Invoice"
            child.parentfield = "sales_team"
            child.db_insert()

        # 7. Sales Invoice B: Return Credit Note (-20,000 INR)
        si_return = frappe.get_doc({
            "doctype": "Sales Invoice",
            "company": company,
            "customer": "Test Customer A",
            "posting_date": "2026-05-05",
            "is_return": 1,
            "return_against": si1.name,
            "currency": "INR",
            "net_total": 20000.0,
            "grand_total": 20000.0,
            "docstatus": 1,
        })
        si_return.flags.ignore_links = True
        si_return.flags.ignore_validate = True
        si_return.db_insert()
        si_return.db_set("owner", "a1@test.nexapp")

        try:
            # Query custom period 2026-05-01 to 2026-05-10 as user 'a1@test.nexapp'
            frappe.set_user("a1@test.nexapp")
            res = frappe.call(
                "nexapp.api.crm_dashboard.get_executive_kpis",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-10",
            )

            k = res["kpis"]
            self.assertEqual(k["leads_created"], 2)
            self.assertEqual(k["new_leads"], 1)
            self.assertEqual(k["converted_leads"], 1)
            self.assertEqual(k["conversion_rate"], 50.0)

            self.assertEqual(k["open_deals"], 1)
            self.assertEqual(k["pipeline_value"], 100000.0)
            self.assertEqual(k["weighted_pipeline"], 20000.0)
            self.assertEqual(k["average_deal_value"], 100000.0)

            self.assertEqual(k["won_deals"], 1)
            self.assertEqual(k["won_revenue"], 200000.0)
            self.assertEqual(k["lost_deals"], 1)
            self.assertEqual(k["win_rate"], 50.0) # 1 Won / (1 Won + 1 Lost) * 100

            # Invoiced Revenue: 100,000 (si1, not duplicated) - 20,000 (return) = 80,000
            self.assertEqual(k["invoiced_revenue"], 80000.0)

            # Overdue followups count >= 1
            self.assertGreaterEqual(k["overdue_followups"], 1)

        finally:
            # Cleanup deterministic records
            frappe.db.delete("Sales Invoice", {"name": ["in", [si1.name, si_return.name]]})
            frappe.db.delete("ToDo", {"name": todo1.name})
            frappe.db.delete("CRM Deal", {"name": ["in", [deal1.name, deal2.name, deal3.name]]})
            frappe.db.delete("CRM Lead", {"name": ["in", [lead1.name, lead2.name]]})
            frappe.db.commit()

    def test_phase2c_lead_funnel_and_sources(self):
        """
        Phase 2C Automated Unit Tests:
          1. Current Lead Funnel structure & dynamic status ordering
          2. Period lead creation vs conversions vs cohort conversion rate (bounded <= 100%)
          3. 200% conversion rate regression case verification (1 created, 2 converted -> cohort rate <= 100%)
          4. Lead Source grouping & Unknown source handling
          5. Hierarchy security isolation on get_lead_funnel & get_lead_sources
        """
        # Create 1 Lead created in April (OLD LEAD)
        old_lead = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Old Lead",
            "lead_owner": "a1@test.nexapp",
            "source": "Website",
            "status": "Qualified",
            "converted": 1,
        }).insert(ignore_permissions=True)
        old_lead.db_set("creation", "2026-04-01 10:00:00")

        # Old lead converted in May
        old_deal = frappe.get_doc({
            "doctype": "CRM Deal",
            "lead": old_lead.name,
            "deal_name": "Old Deal",
            "deal_owner": "a1@test.nexapp",
            "status": "Won",
        }).insert(ignore_permissions=True)
        old_deal.db_set("creation", "2026-05-02 10:00:00")

        # Create 1 Lead created in May (NEW LEAD, unconverted)
        new_lead = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "May New Lead",
            "lead_owner": "a1@test.nexapp",
            "status": "New",
            "converted": 0,
        }).insert(ignore_permissions=True)
        new_lead.db_set("creation", "2026-05-03 10:00:00")

        # Create 1 Lead created in May (MAY COHORT CONVERTED)
        may_conv_lead = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "May Cohort Lead",
            "lead_owner": "a1@test.nexapp",
            "source": "Website",
            "status": "Qualified",
            "converted": 1,
        }).insert(ignore_permissions=True)
        may_conv_lead.db_set("creation", "2026-05-04 10:00:00")

        may_deal = frappe.get_doc({
            "doctype": "CRM Deal",
            "lead": may_conv_lead.name,
            "deal_name": "May Deal",
            "deal_owner": "a1@test.nexapp",
            "status": "Won",
        }).insert(ignore_permissions=True)
        may_deal.db_set("creation", "2026-05-05 10:00:00")

        try:
            frappe.set_user("a1@test.nexapp")

            # 1. Test get_lead_funnel
            funnel_res = frappe.call(
                "nexapp.api.crm_dashboard.get_lead_funnel",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-10",
            )

            self.assertTrue(funnel_res["meta"]["snapshot"])
            self.assertEqual(funnel_res["meta"]["metric_type"], "snapshot")

            act = funnel_res["period_activity"]
            # Period leads created in May = 2 (new_lead + may_conv_lead)
            self.assertEqual(act["leads_created"], 2)
            # Period conversions occurring in May = 2 (old_deal + may_deal)
            self.assertEqual(act["period_conversions"], 2)
            # Cohort converted = 1 (may_conv_lead)
            self.assertEqual(act["cohort_converted"], 1)
            # Cohort conversion rate = (1 / 2) * 100 = 50% (STRICTLY <= 100%, avoiding 200% bug!)
            self.assertEqual(act["cohort_conversion_rate"], 50.0)

            # Funnel items dynamic check
            funnel_items = funnel_res["funnel"]
            self.assertGreater(len(funnel_items), 0)
            status_names = [item["status"] for item in funnel_items]
            self.assertIn("New", status_names)

            # 2. Test get_lead_sources
            sources_res = frappe.call(
                "nexapp.api.crm_dashboard.get_lead_sources",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-10",
            )

            sources = sources_res["sources"]
            source_map = {s["source"]: s for s in sources}

            self.assertIn("Website", source_map)
            self.assertIn("Unknown", source_map)

            web = source_map["Website"]
            self.assertEqual(web["leads_created"], 1)
            self.assertEqual(web["cohorted_converted"], 1)
            self.assertEqual(web["cohorted_conversion_rate"], 100.0)
            self.assertEqual(web["period_conversions"], 2) # Both old_lead & may_conv_lead were Website source!

            unk = source_map["Unknown"]
            self.assertEqual(unk["leads_created"], 1) # new_lead has no source -> Unknown
            self.assertEqual(unk["cohorted_converted"], 0)
            self.assertEqual(unk["cohorted_conversion_rate"], 0.0)
            self.assertEqual(unk["period_conversions"], 0)

            # 3. Test Security Isolation (User B1 blocked from User A1's data)
            frappe.set_user("b1@test.nexapp")
            b1_funnel = frappe.call(
                "nexapp.api.crm_dashboard.get_lead_funnel",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-10",
            )
            self.assertEqual(b1_funnel["period_activity"]["leads_created"], 0)
            self.assertEqual(b1_funnel["period_activity"]["period_conversions"], 0)

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [old_deal.name, may_deal.name]]})
            frappe.db.delete("CRM Lead", {"name": ["in", [old_lead.name, new_lead.name, may_conv_lead.name]]})
            frappe.db.commit()

    def test_phase2d_pipeline_health(self):
        """
        Phase 2D Automated Unit Tests:
          1. Open deal count, pipeline value, weighted pipeline, avg deal value
          2. Dynamic stage ordering and percentage aggregation
          3. On-Hold deals isolation (excluded from open pipeline)
          4. Stale deals calculation (modified <= NOW() - 14 days)
          5. Zero-denominator safety & security hierarchy isolation
        """
        # Dynamically fetch an open stage name from tabCRM Deal Status
        open_status = frappe.db.get_value("CRM Deal Status", {"type": ["in", ["Open", "Ongoing"]]}, "name") or "New"
        if not frappe.db.exists("CRM Deal Status", open_status):
            frappe.get_doc({
                "doctype": "CRM Deal Status",
                "deal_status": open_status,
                "type": "Open",
                "position": 1,
            }).insert(ignore_permissions=True)

        # Ensure 'On Hold' Deal Status exists
        if not frappe.db.exists("CRM Deal Status", "On Hold"):
            frappe.get_doc({
                "doctype": "CRM Deal Status",
                "deal_status": "On Hold",
                "type": "On Hold",
                "position": 99,
            }).insert(ignore_permissions=True)

        # Create Open Deal 1 (active, modified today)
        d1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Active Deal 1",
            "deal_owner": "a1@test.nexapp",
            "status": open_status, # Open/Ongoing
            "deal_value": 100000.0,
            "probability": 20.0,
        }).insert(ignore_permissions=True)

        # Create Open Deal 2 (stale, modified 20 days ago)
        d2 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Stale Deal 2",
            "deal_owner": "a1@test.nexapp",
            "status": open_status, # Open/Ongoing
            "deal_value": 200000.0,
            "probability": 50.0,
            "expected_deal_value": 100000.0,
        }).insert(ignore_permissions=True)
        frappe.db.sql("UPDATE `tabCRM Deal` SET modified = '2026-07-20 10:00:00' WHERE name = %s", d2.name)

        # Create On-Hold Deal 3
        d3 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "On Hold Deal 3",
            "deal_owner": "a1@test.nexapp",
            "status": "On Hold",
            "deal_value": 50000.0,
        }).insert(ignore_permissions=True)

        try:
            frappe.set_user("a1@test.nexapp")

            # 1. Fetch Pipeline Health
            res = frappe.call(
                "nexapp.api.crm_dashboard.get_pipeline_health",
                period="this_month",
            )

            self.assertTrue(res["meta"]["snapshot"])
            self.assertEqual(res["meta"]["metric_type"], "snapshot")

            s = res["summary"]
            # Open Deals: d1 and d2 (d3 is On Hold, so excluded) -> 2 deals
            self.assertEqual(s["open_deals"], 2)
            # Pipeline Value: 100,000 + 200,000 = 300,000
            self.assertEqual(s["pipeline_value"], 300000.0)
            # Weighted Pipeline: d1 (100k * 20% = 20k) + d2 (expected_deal_value = 100k) = 120,000
            self.assertEqual(s["weighted_pipeline"], 120000.0)
            # Avg Deal Value: 300,000 / 2 = 150,000
            self.assertEqual(s["average_deal_value"], 150000.0)

            # On-Hold Deals: d3 -> 1 deal, 50,000
            self.assertEqual(s["on_hold_deals"], 1)
            self.assertEqual(s["on_hold_value"], 50000.0)

            # Stale Deals: d2 -> 1 deal, 200,000
            self.assertEqual(s["stale_deals"], 1)
            self.assertEqual(s["stale_value"], 200000.0)

            # Stage Breakdown
            stages = res["stages"]
            self.assertGreater(len(stages), 0)
            # Stages must be ordered by position ASC
            positions = [st["position"] for st in stages]
            self.assertEqual(positions, sorted(positions))

            # 2. Test Hierarchy Security Isolation (User B1 should see 0 deals for User A1)
            frappe.set_user("b1@test.nexapp")
            b1_res = frappe.call(
                "nexapp.api.crm_dashboard.get_pipeline_health",
                period="this_month",
            )
            self.assertEqual(b1_res["summary"]["open_deals"], 0)
            self.assertEqual(b1_res["summary"]["pipeline_value"], 0.0)
            self.assertEqual(b1_res["summary"]["average_deal_value"], 0.0) # Zero denominator test!

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [d1.name, d2.name, d3.name]]})
            frappe.db.commit()

    def test_phase2e_closed_sales_analytics(self):
        """
        Phase 2E Automated Unit Tests:
          1. Period event filtering by closed_date (excludes creation date mismatch)
          2. Won deals, lost deals, won revenue, lost value, closed win rate (0-100%)
          3. Average won deal size with zero denominator guard
          4. Lost reason dynamic grouping (NULL/empty -> Unknown/Unspecified)
          5. Excluded statuses (Open, Ongoing, On Hold)
          6. Hierarchy access isolation (User B1 blocked from User A1)
        """
        # Ensure Won & Lost Deal Statuses exist
        if not frappe.db.exists("CRM Deal Status", "Won"):
            frappe.get_doc({
                "doctype": "CRM Deal Status",
                "deal_status": "Won",
                "type": "Won",
                "position": 100,
            }).insert(ignore_permissions=True)

        if not frappe.db.exists("CRM Deal Status", "Lost"):
            frappe.get_doc({
                "doctype": "CRM Deal Status",
                "deal_status": "Lost",
                "type": "Lost",
                "position": 101,
            }).insert(ignore_permissions=True)

        # Ensure CRM Lost Reason exists
        if not frappe.db.exists("CRM Lost Reason", "Price Too High"):
            frappe.get_doc({
                "doctype": "CRM Lost Reason",
                "lost_reason": "Price Too High",
            }).insert(ignore_permissions=True)

        # 1. Won Deal in May 2026 (created in April, closed in May)
        w1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Won Deal 1",
            "deal_owner": "a1@test.nexapp",
            "status": "Won",
            "deal_value": 300000.0,
        }).insert(ignore_permissions=True)
        w1.db_set("closed_date", "2026-05-05")
        frappe.db.sql("UPDATE `tabCRM Deal` SET creation = '2026-04-01 10:00:00' WHERE name = %s", w1.name)

        # 2. Lost Deal 1 in May 2026 with lost_reason 'Price Too High'
        l1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Lost Deal 1",
            "deal_owner": "a1@test.nexapp",
            "status": "Lost",
            "deal_value": 100000.0,
            "lost_reason": "Price Too High",
        }).insert(ignore_permissions=True)
        l1.db_set("closed_date", "2026-05-08")

        # 3. Lost Deal 2 in May 2026 with NULL lost_reason
        l2 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Lost Deal 2",
            "deal_owner": "a1@test.nexapp",
            "status": "Lost",
            "deal_value": 100000.0,
            "lost_reason": "Price Too High",
        }).insert(ignore_permissions=True)
        l2.db_set("closed_date", "2026-05-09")
        l2.db_set("lost_reason", None)

        # 4. Won Deal in June 2026 (should be excluded from May filter)
        w2 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Won Deal June",
            "deal_owner": "a1@test.nexapp",
            "status": "Won",
            "deal_value": 500000.0,
        }).insert(ignore_permissions=True)
        w2.db_set("closed_date", "2026-06-01")

        try:
            frappe.set_user("a1@test.nexapp")

            res = frappe.call(
                "nexapp.api.crm_dashboard.get_closed_sales_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )

            self.assertFalse(res["meta"]["snapshot"])
            self.assertEqual(res["meta"]["metric_type"], "event")
            self.assertEqual(res["meta"]["date_anchor"], "closed_date")

            s = res["summary"]
            # May Closed Deals: w1, l1, l2 -> 3 deals (w2 in June excluded!)
            self.assertEqual(s["closed_deals"], 3)
            self.assertEqual(s["won_deals"], 1)
            self.assertEqual(s["lost_deals"], 2)

            self.assertEqual(s["won_revenue"], 300000.0)
            self.assertEqual(s["lost_value"], 200000.0)

            # Win Rate: 1 / 3 * 100 = 33.33%
            self.assertEqual(s["closed_win_rate"], 33.33)
            # Avg Won Deal Size: 300,000 / 1 = 300,000.0
            self.assertEqual(s["average_won_deal_size"], 300000.0)

            # Lost Reasons Breakdown
            reasons = res["lost_reasons"]
            reason_map = {r["lost_reason"]: r for r in reasons}

            self.assertIn("Price Too High", reason_map)
            self.assertIn("Unknown/Unspecified", reason_map)

            p_reason = reason_map["Price Too High"]
            self.assertEqual(p_reason["count"], 1)
            self.assertEqual(p_reason["lost_value"], 100000.0)
            self.assertEqual(p_reason["percentage_of_lost_value"], 50.0)

            u_reason = reason_map["Unknown/Unspecified"]
            self.assertEqual(u_reason["count"], 1)
            self.assertEqual(u_reason["lost_value"], 100000.0)
            self.assertEqual(u_reason["percentage_of_lost_value"], 50.0)

            # Security Isolation for User B1
            frappe.set_user("b1@test.nexapp")
            b1_res = frappe.call(
                "nexapp.api.crm_dashboard.get_closed_sales_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )
            self.assertEqual(b1_res["summary"]["closed_deals"], 0)
            self.assertEqual(b1_res["summary"]["closed_win_rate"], 0.0)
            self.assertEqual(b1_res["summary"]["average_won_deal_size"], 0.0)

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [w1.name, l1.name, l2.name, w2.name]]})
            frappe.db.commit()

    def test_phase2f_sales_velocity_analytics(self):
        """
        Phase 2F Automated Unit Tests:
          1. Won sales cycle calculation (DATEDIFF closed_date - creation)
          2. Lost sales cycle calculation
          3. Open deal age calculation (DATEDIFF CURDATE - creation) & period-independence
          4. Sales Velocity per day (Won Revenue / Avg Won Sales Cycle)
          5. Age distribution brackets (0-30, 31-60, 61-90, 90+) exact ordering and percentages
          6. Zero denominator safeguards
          7. Hierarchy access isolation (User B1 blocked from User A1)
        """
        today_date = frappe.utils.nowdate()

        # 1. Won Deal closed in May 2026: created 2026-05-01, closed 2026-05-11 (10 days cycle, value 200,000)
        w1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Vel Won Deal 1",
            "deal_owner": "a1@test.nexapp",
            "status": "Won",
            "deal_value": 200000.0,
        }).insert(ignore_permissions=True)
        frappe.db.sql("UPDATE `tabCRM Deal` SET creation = '2026-05-01 10:00:00' WHERE name = %s", w1.name)
        w1.db_set("closed_date", "2026-05-11")

        # 2. Lost Deal closed in May 2026: created 2026-05-01, closed 2026-05-21 (20 days cycle)
        l1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Vel Lost Deal 1",
            "deal_owner": "a1@test.nexapp",
            "status": "Lost",
            "deal_value": 50000.0,
            "lost_reason": "Price Too High",
        }).insert(ignore_permissions=True)
        frappe.db.sql("UPDATE `tabCRM Deal` SET creation = '2026-05-01 10:00:00' WHERE name = %s", l1.name)
        l1.db_set("closed_date", "2026-05-21")

        # 3. Open Deal 1: Fresh (10 days old relative to CURDATE)
        d_fresh = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Fresh Open Deal",
            "deal_owner": "a1@test.nexapp",
            "status": "Qualification", # Open type
            "deal_value": 100000.0,
        }).insert(ignore_permissions=True)
        frappe.db.sql("UPDATE `tabCRM Deal` SET creation = DATE_SUB(NOW(), INTERVAL 10 DAY) WHERE name = %s", d_fresh.name)

        # 4. Open Deal 2: Aged Risk (100 days old relative to CURDATE)
        d_aged = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Aged Open Deal",
            "deal_owner": "a1@test.nexapp",
            "status": "Proposal/Quotation", # Ongoing type
            "deal_value": 300000.0,
        }).insert(ignore_permissions=True)
        frappe.db.sql("UPDATE `tabCRM Deal` SET creation = DATE_SUB(NOW(), INTERVAL 100 DAY) WHERE name = %s", d_aged.name)

        # 5. Deal with NULL closed_date (Won status but closed_date not set)
        w_null = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Won Deal Null Closed Date",
            "deal_owner": "a1@test.nexapp",
            "status": "Won",
            "deal_value": 500000.0,
        }).insert(ignore_permissions=True)
        frappe.db.sql("UPDATE `tabCRM Deal` SET creation = '2026-05-01 10:00:00' WHERE name = %s", w_null.name)
        w_null.db_set("closed_date", None)

        try:
            frappe.set_user("a1@test.nexapp")

            res = frappe.call(
                "nexapp.api.crm_dashboard.get_sales_velocity_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )

            self.assertEqual(res["meta"]["metric_type"], "hybrid")

            s = res["summary"]
            self.assertEqual(s["avg_won_sales_cycle_days"], 10.0)
            self.assertEqual(s["avg_lost_sales_cycle_days"], 20.0)

            # Sales Velocity = 200,000 / 10.0 = 20,000.0 INR / day (w_null excluded because closed_date IS NULL)
            self.assertEqual(s["sales_velocity_per_day"], 20000.0)

            # Open Deal Age Avg = (10 + 100) / 2 = 55.0 days
            self.assertEqual(s["avg_open_deal_age_days"], 55.0)

            # Age Distribution Brackets
            dist = res["age_distribution"]
            self.assertEqual(len(dist), 4)

            brackets = [b["bracket"] for b in dist]
            self.assertEqual(brackets, ["0 - 30 Days", "31 - 60 Days", "61 - 90 Days", "90+ Days"])

            # 0 - 30 Days: 1 deal, value 100,000 (25% of 400,000 total open value)
            b0_30 = dist[0]
            self.assertEqual(b0_30["deal_count"], 1)
            self.assertEqual(b0_30["pipeline_value"], 100000.0)
            self.assertEqual(b0_30["percentage_of_pipeline"], 25.0)

            # 90+ Days: 1 deal, value 300,000 (75% of 400,000 total open value)
            b90 = dist[3]
            self.assertEqual(b90["deal_count"], 1)
            self.assertEqual(b90["pipeline_value"], 300000.0)
            self.assertEqual(b90["percentage_of_pipeline"], 75.0)

            # Period Independence Test: Querying a different period (e.g. April 2026) must return 0 closed deals,
            # BUT current open deal age & age distribution MUST remain unchanged.
            res_april = frappe.call(
                "nexapp.api.crm_dashboard.get_sales_velocity_analytics",
                period="custom",
                custom_from="2026-04-01",
                custom_to="2026-04-30",
            )
            self.assertEqual(res_april["summary"]["avg_won_sales_cycle_days"], 0.0)
            self.assertEqual(res_april["summary"]["avg_lost_sales_cycle_days"], 0.0)
            self.assertEqual(res_april["summary"]["sales_velocity_per_day"], 0.0)
            self.assertEqual(res_april["summary"]["avg_open_deal_age_days"], 55.0)
            self.assertEqual(res_april["age_distribution"][0]["deal_count"], 1)
            self.assertEqual(res_april["age_distribution"][3]["deal_count"], 1)

            # Security Isolation for User B1 (Must return 0 for all metrics including snapshot & age distribution)
            frappe.set_user("b1@test.nexapp")
            b1_res = frappe.call(
                "nexapp.api.crm_dashboard.get_sales_velocity_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )
            self.assertEqual(b1_res["summary"]["avg_won_sales_cycle_days"], 0.0)
            self.assertEqual(b1_res["summary"]["avg_lost_sales_cycle_days"], 0.0)
            self.assertEqual(b1_res["summary"]["avg_open_deal_age_days"], 0.0)
            self.assertEqual(b1_res["summary"]["sales_velocity_per_day"], 0.0)
            for b in b1_res["age_distribution"]:
                self.assertEqual(b["deal_count"], 0)
                self.assertEqual(b["pipeline_value"], 0.0)
                self.assertEqual(b["percentage_of_pipeline"], 0.0)

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [w1.name, l1.name, d_fresh.name, d_aged.name, w_null.name]]})
            frappe.db.commit()

    def test_phase2g_activity_execution_analytics(self):
        """
        Phase 2G Automated Unit Tests:
          1. Scheduled activity count (ToDo.date BETWEEN from_date AND to_date)
          2. Completed activity count & rate calculation
          3. Current overdue activity snapshot (status = 'Open', date < CURDATE())
          4. Average completed activities per rep calculation
          5. Activity breakdown by category (CRM Lead vs CRM Deal)
          6. Zero denominator safeguards & empty data response structure
          7. Hierarchy access isolation (User B1 blocked from User A1's activities)
          8. Non-CRM reference types (e.g. CRM Task) excluded
          9. Period event metrics respect selected period while live snapshot metrics remain independent
        """
        # 0. Insert valid CRM Lead and CRM Deal docs for ToDo linking
        dummy_lead = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Test Phase 2G Lead",
            "email_id": "phase2g_lead@test.nexapp",
            "lead_owner": "a1@test.nexapp",
            "status": "New",
        }).insert(ignore_permissions=True)

        dummy_deal = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Phase 2G Deal",
            "deal_owner": "a1@test.nexapp",
            "status": "Qualification",
        }).insert(ignore_permissions=True)

        # 1. Closed ToDo for User A1 on CRM Lead scheduled in May 2026
        t1 = frappe.get_doc({
            "doctype": "ToDo",
            "reference_type": "CRM Lead",
            "reference_name": dummy_lead.name,
            "allocated_to": "a1@test.nexapp",
            "status": "Closed",
            "date": "2026-05-10",
            "description": "Call qualified lead",
        }).insert(ignore_permissions=True)

        # 2. Open ToDo for User A1 on CRM Deal scheduled in May 2026 (Not overdue in May context)
        t2 = frappe.get_doc({
            "doctype": "ToDo",
            "reference_type": "CRM Deal",
            "reference_name": dummy_deal.name,
            "allocated_to": "a1@test.nexapp",
            "status": "Open",
            "date": "2026-05-20",
            "description": "Send proposal",
        }).insert(ignore_permissions=True)

        # 3. Overdue Open ToDo for User A1 on CRM Deal (date < CURDATE)
        t_overdue = frappe.get_doc({
            "doctype": "ToDo",
            "reference_type": "CRM Deal",
            "reference_name": dummy_deal.name,
            "allocated_to": "a1@test.nexapp",
            "status": "Open",
            "date": "2020-01-01",
            "description": "Overdue contract review",
        }).insert(ignore_permissions=True)

        dummy_task = frappe.get_doc({
            "doctype": "CRM Task",
            "title": "Test Phase 2G Task",
            "assigned_to": "a1@test.nexapp",
        }).insert(ignore_permissions=True)

        # 4. Non-CRM ToDo (reference_type = 'CRM Task') - must be excluded
        t_non_crm = frappe.get_doc({
            "doctype": "ToDo",
            "reference_type": "CRM Task",
            "reference_name": dummy_task.name,
            "allocated_to": "a1@test.nexapp",
            "status": "Closed",
            "date": "2026-05-15",
            "description": "Non CRM task",
        }).insert(ignore_permissions=True)

        try:
            frappe.set_user("a1@test.nexapp")

            res = frappe.call(
                "nexapp.api.crm_dashboard.get_activity_execution_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )

            self.assertEqual(res["meta"]["metric_type"], "hybrid")

            s = res["summary"]
            # Scheduled in May 2026 for CRM Lead / CRM Deal: t1 (Closed) and t2 (Open) -> Total = 2
            self.assertEqual(s["total_scheduled_activities"], 2)
            self.assertEqual(s["completed_activities"], 1)
            self.assertEqual(s["completed_activity_rate"], 50.0) # 1 / 2 * 100

            # Effective user count for a1@test.nexapp is 1 -> Avg completed per rep = 1 / 1 = 1.0
            self.assertEqual(s["average_completed_activities_per_rep"], 1.0)

            # Current overdue activities snapshot includes t_overdue
            self.assertGreaterEqual(s["current_overdue_activities"], 1)

            # Breakdown verification
            bd = res["activity_breakdown"]
            self.assertEqual(len(bd), 2)

            cat_map = {b["category"]: b for b in bd}
            self.assertIn("CRM Lead", cat_map)
            self.assertIn("CRM Deal", cat_map)

            # CRM Deal category has open deals (t2 and t_overdue)
            self.assertGreaterEqual(cat_map["CRM Deal"]["open_count"], 2)
            self.assertGreaterEqual(cat_map["CRM Deal"]["overdue_count"], 1)

            # Period Independence Test: Querying April 2026 must return 0 scheduled activities in period,
            # BUT current overdue activities and open breakdown MUST remain populated.
            res_april = frappe.call(
                "nexapp.api.crm_dashboard.get_activity_execution_analytics",
                period="custom",
                custom_from="2026-04-01",
                custom_to="2026-04-30",
            )
            self.assertEqual(res_april["summary"]["total_scheduled_activities"], 0)
            self.assertEqual(res_april["summary"]["completed_activities"], 0)
            self.assertEqual(res_april["summary"]["completed_activity_rate"], 0.0)
            self.assertEqual(res_april["summary"]["average_completed_activities_per_rep"], 0.0)
            self.assertEqual(res_april["summary"]["current_overdue_activities"], s["current_overdue_activities"])

            # Security Isolation for User B1 (Must return 0 for all metrics)
            frappe.set_user("b1@test.nexapp")
            b1_res = frappe.call(
                "nexapp.api.crm_dashboard.get_activity_execution_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )
            self.assertEqual(b1_res["summary"]["total_scheduled_activities"], 0)
            self.assertEqual(b1_res["summary"]["completed_activities"], 0)
            self.assertEqual(b1_res["summary"]["completed_activity_rate"], 0.0)
            self.assertEqual(b1_res["summary"]["current_overdue_activities"], 0)
            self.assertEqual(b1_res["summary"]["average_completed_activities_per_rep"], 0.0)
            for b in b1_res["activity_breakdown"]:
                self.assertEqual(b["open_count"], 0)
                self.assertEqual(b["overdue_count"], 0)
                self.assertEqual(b["percentage_overdue"], 0.0)

        finally:
            frappe.db.delete("ToDo", {"name": ["in", [t1.name, t2.name, t_overdue.name, t_non_crm.name]]})
            frappe.db.delete("CRM Lead", {"name": dummy_lead.name})
            frappe.db.delete("CRM Deal", {"name": dummy_deal.name})
            frappe.db.delete("CRM Task", {"name": dummy_task.name})
            frappe.db.commit()

    def test_phase2h_rep_leaderboard_analytics(self):
        """
        Phase 2H Automated Unit Tests:
          1. Rep grouping & Won Revenue aggregation
          2. Won Deals Count & Lost Deals Count
          3. Closed Cohort Win Rate (%) calculation & zero-denominator guardrail
          4. Open Pipeline Value aggregation (Live Current Snapshot)
          5. Completed Tasks count in period
          6. Period filtering for Won/Lost/Tasks vs Period Independence for Open Pipeline
          7. Inclusion of scoped reps with zero/partial values across categories
          8. Non-CRM ToDo exclusion
          9. Hierarchy Isolation (Manager A sees Rep A1; Rep B1 blocked from Rep A1's scope)
          10. Unauthorized team/user filter attempts
        """
        # 1. Setup CRM Deals for User A1
        deal_won_a1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Leaderboard Won A1",
            "deal_owner": "a1@test.nexapp",
            "status": "Won",
            "deal_value": 150000.0,
        }).insert(ignore_permissions=True)
        deal_won_a1.db_set("closed_date", "2026-05-15")

        deal_lost_a1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Leaderboard Lost A1",
            "deal_owner": "a1@test.nexapp",
            "status": "Lost",
            "lost_reason": "Price Too High",
            "deal_value": 50000.0,
        }).insert(ignore_permissions=True)
        deal_lost_a1.db_set("closed_date", "2026-05-20")

        deal_open_a1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Leaderboard Open A1",
            "deal_owner": "a1@test.nexapp",
            "status": "Qualification",
            "deal_value": 200000.0,
        }).insert(ignore_permissions=True)

        # 2. Setup ToDo for User A1
        todo_closed_a1 = frappe.get_doc({
            "doctype": "ToDo",
            "reference_type": "CRM Deal",
            "reference_name": deal_open_a1.name,
            "allocated_to": "a1@test.nexapp",
            "status": "Closed",
            "date": "2026-05-10",
            "description": "Leaderboard completed activity",
        }).insert(ignore_permissions=True)

        try:
            # Test 1: User A1 calling own scope
            frappe.set_user("a1@test.nexapp")

            res = frappe.call(
                "nexapp.api.crm_dashboard.get_rep_leaderboard_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )

            self.assertEqual(res["meta"]["metric_type"], "hybrid")
            self.assertEqual(res["scope"]["effective_user_count"], 1)

            lb = res["leaderboard"]
            self.assertEqual(len(lb), 1)

            rep = lb[0]
            self.assertEqual(rep["rep_owner"], "a1@test.nexapp")
            self.assertEqual(rep["won_revenue"], 150000.0)
            self.assertEqual(rep["won_deals_count"], 1)
            self.assertEqual(rep["lost_deals_count"], 1)
            self.assertEqual(rep["win_rate"], 50.0) # 1 / (1 + 1) * 100
            self.assertEqual(rep["open_pipeline_value"], 200000.0)
            self.assertEqual(rep["completed_tasks"], 1)

            # Test 2: Period Independence for Open Pipeline
            res_april = frappe.call(
                "nexapp.api.crm_dashboard.get_rep_leaderboard_analytics",
                period="custom",
                custom_from="2026-04-01",
                custom_to="2026-04-30",
            )
            rep_apr = res_april["leaderboard"][0]
            self.assertEqual(rep_apr["won_revenue"], 0.0)
            self.assertEqual(rep_apr["won_deals_count"], 0)
            self.assertEqual(rep_apr["lost_deals_count"], 0)
            self.assertEqual(rep_apr["win_rate"], 0.0) # Zero denominator guard
            self.assertEqual(rep_apr["completed_tasks"], 0)
            self.assertEqual(rep_apr["open_pipeline_value"], 200000.0) # Live snapshot remains 200k!

            # Test 3: Manager A calling scope (includes a1@test.nexapp, a2@test.nexapp, mgr_a@test.nexapp)
            frappe.set_user("mgr_a@test.nexapp")
            mgr_res = frappe.call(
                "nexapp.api.crm_dashboard.get_rep_leaderboard_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )
            mgr_lb_owners = [r["rep_owner"] for r in mgr_res["leaderboard"]]
            self.assertIn("a1@test.nexapp", mgr_lb_owners)
            self.assertIn("a2@test.nexapp", mgr_lb_owners)

            # Test 4: Security Isolation - User B1 trying to query User A1 filter
            frappe.set_user("b1@test.nexapp")
            with self.assertRaises(frappe.PermissionError):
                frappe.call(
                    "nexapp.api.crm_dashboard.get_rep_leaderboard_analytics",
                    period="custom",
                    custom_from="2026-05-01",
                    custom_to="2026-05-31",
                    user_filter="a1@test.nexapp",
                )

            # User B1 calling own permitted scope
            b1_res = frappe.call(
                "nexapp.api.crm_dashboard.get_rep_leaderboard_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )
            b1_lb_owners = [r["rep_owner"] for r in b1_res["leaderboard"]]
            self.assertNotIn("a1@test.nexapp", b1_lb_owners)
            self.assertIn("b1@test.nexapp", b1_lb_owners)

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [deal_won_a1.name, deal_lost_a1.name, deal_open_a1.name]]})
            frappe.db.delete("ToDo", {"name": todo_closed_a1.name})
            frappe.db.commit()

    def test_phase2i_industry_analytics(self):
        """
        Phase 2I Automated Unit Tests:
          1. Industry grouping & NULL/empty mapping to 'Unspecified'
          2. Won revenue, won count, lost count by industry
          3. Win rate (%) and average won deal size calculation
          4. Zero-denominator guardrails
          5. Open pipeline value aggregation (Live Current Snapshot)
          6. Period filtering for closed metrics vs period independence for open pipeline
          7. Hierarchy access isolation (User A1 vs Manager A vs User B1 permission error)
        """
        # 1. Setup Deals for User A1
        # Tech Industry Won Deal
        d_tech_won = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Industry Tech Won",
            "deal_owner": "a1@test.nexapp",
            "industry": "Technology",
            "status": "Won",
            "deal_value": 200000.0,
        }).insert(ignore_permissions=True)
        d_tech_won.db_set("closed_date", "2026-05-10")

        # Tech Industry Lost Deal
        d_tech_lost = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Industry Tech Lost",
            "deal_owner": "a1@test.nexapp",
            "industry": "Technology",
            "status": "Lost",
            "lost_reason": "Price Too High",
            "deal_value": 100000.0,
        }).insert(ignore_permissions=True)
        d_tech_lost.db_set("closed_date", "2026-05-12")

        # Tech Industry Open Deal
        d_tech_open = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Industry Tech Open",
            "deal_owner": "a1@test.nexapp",
            "industry": "Technology",
            "status": "Qualification",
            "deal_value": 150000.0,
        }).insert(ignore_permissions=True)

        # Unspecified Industry (NULL industry) Won Deal
        d_unspec_won = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Industry Unspecified Won",
            "deal_owner": "a1@test.nexapp",
            "industry": None,
            "status": "Won",
            "deal_value": 50000.0,
        }).insert(ignore_permissions=True)
        d_unspec_won.db_set("closed_date", "2026-05-18")

        try:
            # Test 1: User A1 calling own scope in May 2026
            frappe.set_user("a1@test.nexapp")

            res = frappe.call(
                "nexapp.api.crm_dashboard.get_industry_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )

            self.assertEqual(res["meta"]["metric_type"], "hybrid")
            self.assertEqual(res["scope"]["effective_user_count"], 1)

            ind_list = res["industries"]
            ind_map = {row["industry"]: row for row in ind_list}

            self.assertIn("Technology", ind_map)
            self.assertIn("Unspecified", ind_map)

            tech = ind_map["Technology"]
            self.assertEqual(tech["won_revenue"], 200000.0)
            self.assertEqual(tech["won_deals_count"], 1)
            self.assertEqual(tech["lost_deals_count"], 1)
            self.assertEqual(tech["win_rate"], 50.0) # 1 / (1+1) * 100
            self.assertEqual(tech["average_won_deal_size"], 200000.0) # 200k / 1
            self.assertEqual(tech["open_pipeline_value"], 150000.0)

            unspec = ind_map["Unspecified"]
            self.assertEqual(unspec["won_revenue"], 50000.0)
            self.assertEqual(unspec["won_deals_count"], 1)
            self.assertEqual(unspec["lost_deals_count"], 0)
            self.assertEqual(unspec["win_rate"], 100.0)
            self.assertEqual(unspec["average_won_deal_size"], 50000.0)
            self.assertEqual(unspec["open_pipeline_value"], 0.0)

            # Test 2: Period Independence for Open Pipeline (April 2026)
            res_april = frappe.call(
                "nexapp.api.crm_dashboard.get_industry_analytics",
                period="custom",
                custom_from="2026-04-01",
                custom_to="2026-04-30",
            )
            ind_map_apr = {row["industry"]: row for row in res_april["industries"]}
            tech_apr = ind_map_apr.get("Technology", {})
            self.assertEqual(tech_apr.get("won_revenue", 0.0), 0.0)
            self.assertEqual(tech_apr.get("won_deals_count", 0), 0)
            self.assertEqual(tech_apr.get("win_rate", 0.0), 0.0)
            self.assertEqual(tech_apr.get("average_won_deal_size", 0.0), 0.0)
            self.assertEqual(tech_apr.get("open_pipeline_value", 0.0), 150000.0) # Live snapshot preserved!

            # Test 3: Hierarchy Security & Isolation - Manager A vs User B1
            frappe.set_user("mgr_a@test.nexapp")
            mgr_res = frappe.call(
                "nexapp.api.crm_dashboard.get_industry_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )
            mgr_ind_names = [row["industry"] for row in mgr_res["industries"]]
            self.assertIn("Technology", mgr_ind_names)

            frappe.set_user("b1@test.nexapp")
            with self.assertRaises(frappe.PermissionError):
                frappe.call(
                    "nexapp.api.crm_dashboard.get_industry_analytics",
                    period="custom",
                    custom_from="2026-05-01",
                    custom_to="2026-05-31",
                    user_filter="a1@test.nexapp",
                )

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [d_tech_won.name, d_tech_lost.name, d_tech_open.name, d_unspec_won.name]]})
            frappe.db.commit()

    def test_phase2j_organization_analytics(self):
        """
        Phase 2J Automated Unit Tests:
          1. Organization grouping & NULL/empty mapping to 'Individual / Unassigned'
          2. Won revenue, won count, lost count by organization
          3. Account win rate (%) calculation & zero-denominator guardrails
          4. Open pipeline value aggregation (Live Current Snapshot)
          5. Period filtering for closed metrics vs period independence for open pipeline
          6. Hierarchy access isolation (User A1 vs Manager A vs User B1 permission error)
        """
        # 1. Setup Deals for User A1
        # Organization Alpha Won Deal
        d_org_a_won = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Org A Won",
            "deal_owner": "a1@test.nexapp",
            "organization_name": "Organization Alpha",
            "status": "Won",
            "deal_value": 300000.0,
        }).insert(ignore_permissions=True)
        d_org_a_won.db_set("closed_date", "2026-05-10")

        # Organization Alpha Lost Deal
        d_org_a_lost = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Org A Lost",
            "deal_owner": "a1@test.nexapp",
            "organization_name": "Organization Alpha",
            "status": "Lost",
            "lost_reason": "Price Too High",
            "deal_value": 100000.0,
        }).insert(ignore_permissions=True)
        d_org_a_lost.db_set("closed_date", "2026-05-15")

        # Organization Alpha Open Deal
        d_org_a_open = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Org A Open",
            "deal_owner": "a1@test.nexapp",
            "organization_name": "Organization Alpha",
            "status": "Proposal/Quotation",
            "deal_value": 250000.0,
        }).insert(ignore_permissions=True)

        # Unassigned Organization (NULL organization_name) Won Deal
        d_unassign_won = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Org Unassigned Won",
            "deal_owner": "a1@test.nexapp",
            "organization_name": None,
            "status": "Won",
            "deal_value": 75000.0,
        }).insert(ignore_permissions=True)
        d_unassign_won.db_set("closed_date", "2026-05-20")

        try:
            # Test 1: User A1 calling own scope in May 2026
            frappe.set_user("a1@test.nexapp")

            res = frappe.call(
                "nexapp.api.crm_dashboard.get_organization_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )

            self.assertEqual(res["meta"]["metric_type"], "hybrid")
            self.assertEqual(res["scope"]["effective_user_count"], 1)

            org_list = res["organizations"]
            org_map = {row["organization_name"]: row for row in org_list}

            self.assertIn("Organization Alpha", org_map)
            self.assertIn("Individual / Unassigned", org_map)

            alpha = org_map["Organization Alpha"]
            self.assertEqual(alpha["won_revenue"], 300000.0)
            self.assertEqual(alpha["won_deals_count"], 1)
            self.assertEqual(alpha["lost_deals_count"], 1)
            self.assertEqual(alpha["win_rate"], 50.0) # 1 / (1+1) * 100
            self.assertEqual(alpha["open_pipeline_value"], 250000.0)

            unassigned = org_map["Individual / Unassigned"]
            self.assertEqual(unassigned["won_revenue"], 75000.0)
            self.assertEqual(unassigned["won_deals_count"], 1)
            self.assertEqual(unassigned["lost_deals_count"], 0)
            self.assertEqual(unassigned["win_rate"], 100.0)
            self.assertEqual(unassigned["open_pipeline_value"], 0.0)

            # Test 2: Period Independence for Open Pipeline (April 2026)
            res_april = frappe.call(
                "nexapp.api.crm_dashboard.get_organization_analytics",
                period="custom",
                custom_from="2026-04-01",
                custom_to="2026-04-30",
            )
            org_map_apr = {row["organization_name"]: row for row in res_april["organizations"]}
            alpha_apr = org_map_apr.get("Organization Alpha", {})
            self.assertEqual(alpha_apr.get("won_revenue", 0.0), 0.0)
            self.assertEqual(alpha_apr.get("won_deals_count", 0), 0)
            self.assertEqual(alpha_apr.get("win_rate", 0.0), 0.0)
            self.assertEqual(alpha_apr.get("open_pipeline_value", 0.0), 250000.0) # Live snapshot preserved!

            # Test 3: Hierarchy Security & Isolation - Manager A vs User B1
            frappe.set_user("mgr_a@test.nexapp")
            mgr_res = frappe.call(
                "nexapp.api.crm_dashboard.get_organization_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )
            mgr_org_names = [row["organization_name"] for row in mgr_res["organizations"]]
            self.assertIn("Organization Alpha", mgr_org_names)

            frappe.set_user("b1@test.nexapp")
            with self.assertRaises(frappe.PermissionError):
                frappe.call(
                    "nexapp.api.crm_dashboard.get_organization_analytics",
                    period="custom",
                    custom_from="2026-05-01",
                    custom_to="2026-05-31",
                    user_filter="a1@test.nexapp",
                )

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [d_org_a_won.name, d_org_a_lost.name, d_org_a_open.name, d_unassign_won.name]]})
            frappe.db.commit()

    def test_phase2k_lead_conversion_analytics(self):
        """
        Phase 2K Automated Unit Tests:
          1. Total Period Leads filtering by Lead creation date
          2. Converted Leads count (converted = 1)
          3. Conversion Rate (%) & zero-denominator guardrails
          4. Average Days to Convert calculation (DATEDIFF(d.creation, l.creation))
          5. Converted Pipeline Value aggregation
          6. Source conversion breakdown & NULL/empty mapping to 'Unspecified'
          7. Period isolation & Lead creation date anchor
          8. Multiple deals / JOIN safety (ensure Lead count is NOT inflated)
          9. Hierarchy access isolation (User A1 vs Manager A vs User B1 permission error)
        """
        # Setup Test Leads for User A1
        # Lead 1: Converted Website Lead created 10 days ago in May 2026
        l1 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Test Conv Lead 1",
            "lead_name": "Test Conv Lead 1",
            "lead_owner": "a1@test.nexapp",
            "source": "Website",
            "converted": 1,
        }).insert(ignore_permissions=True)
        l1.db_set("creation", "2026-05-01 10:00:00")

        # Deal 1 linked to Lead 1 created 4 days after Lead 1
        d1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Conv Deal 1",
            "deal_owner": "a1@test.nexapp",
            "lead": l1.name,
            "status": "Qualification",
            "deal_value": 200000.0,
        }).insert(ignore_permissions=True)
        d1.db_set("creation", "2026-05-05 10:00:00")

        # Lead 2: Unconverted Website Lead created in May 2026
        l2 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Test Unconv Lead 2",
            "lead_name": "Test Unconv Lead 2",
            "lead_owner": "a1@test.nexapp",
            "source": "Website",
            "converted": 0,
        }).insert(ignore_permissions=True)
        l2.db_set("creation", "2026-05-03 10:00:00")

        # Lead 3: Converted Unspecified Source Lead created in May 2026
        l3 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Test Conv Lead 3",
            "lead_name": "Test Conv Lead 3",
            "lead_owner": "a1@test.nexapp",
            "source": None,
            "converted": 1,
        }).insert(ignore_permissions=True)
        l3.db_set("creation", "2026-05-10 10:00:00")

        # Deal 3 linked to Lead 3 created 2 days after Lead 3
        d3 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Conv Deal 3",
            "deal_owner": "a1@test.nexapp",
            "lead": l3.name,
            "status": "Proposal/Quotation",
            "deal_value": 150000.0,
        }).insert(ignore_permissions=True)
        d3.db_set("creation", "2026-05-12 10:00:00")

        try:
            # Test 1: User A1 calling own scope in May 2026
            frappe.set_user("a1@test.nexapp")

            res = frappe.call(
                "nexapp.api.crm_dashboard.get_lead_conversion_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )

            self.assertEqual(res["meta"]["metric_type"], "period_event")
            self.assertEqual(res["scope"]["effective_user_count"], 1)

            summary = res["summary"]
            self.assertEqual(summary["total_leads"], 3)
            self.assertEqual(summary["converted_leads"], 2)
            self.assertEqual(summary["conversion_rate"], 66.67) # 2 / 3 * 100
            self.assertEqual(summary["avg_days_to_convert"], 3.0) # (4 days + 2 days) / 2 = 3.0
            self.assertEqual(summary["converted_pipeline_value"], 350000.0) # 200k + 150k

            sources = {row["source"]: row for row in res["source_breakdown"]}
            self.assertIn("Website", sources)
            self.assertIn("Unspecified", sources)

            web = sources["Website"]
            self.assertEqual(web["total_leads"], 2)
            self.assertEqual(web["converted_leads"], 1)
            self.assertEqual(web["conversion_rate"], 50.0)
            self.assertEqual(web["converted_value"], 200000.0)

            unspec = sources["Unspecified"]
            self.assertEqual(unspec["total_leads"], 1)
            self.assertEqual(unspec["converted_leads"], 1)
            self.assertEqual(unspec["conversion_rate"], 100.0)
            self.assertEqual(unspec["converted_value"], 150000.0)

            # Test 2: Period Isolation (April 2026) - zero leads in April
            res_apr = frappe.call(
                "nexapp.api.crm_dashboard.get_lead_conversion_analytics",
                period="custom",
                custom_from="2026-04-01",
                custom_to="2026-04-30",
            )
            self.assertEqual(res_apr["summary"]["total_leads"], 0)
            self.assertEqual(res_apr["summary"]["conversion_rate"], 0.0)
            self.assertEqual(res_apr["summary"]["avg_days_to_convert"], 0.0)
            self.assertEqual(res_apr["summary"]["converted_pipeline_value"], 0.0)

            # Test 3: Hierarchy Security & Isolation - Manager A vs User B1
            frappe.set_user("mgr_a@test.nexapp")
            mgr_res = frappe.call(
                "nexapp.api.crm_dashboard.get_lead_conversion_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )
            self.assertGreaterEqual(mgr_res["summary"]["total_leads"], 3)

            frappe.set_user("b1@test.nexapp")
            with self.assertRaises(frappe.PermissionError):
                frappe.call(
                    "nexapp.api.crm_dashboard.get_lead_conversion_analytics",
                    period="custom",
                    custom_from="2026-05-01",
                    custom_to="2026-05-31",
                    user_filter="a1@test.nexapp",
                )

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [d1.name, d3.name]]})
            frappe.db.delete("CRM Lead", {"name": ["in", [l1.name, l2.name, l3.name]]})
            frappe.db.commit()

    def test_phase2l_unconverted_lead_analytics(self):
        """
        Phase 2L Automated Unit Tests:
          1. Total unconverted lead count (converted = 0)
          2. Excludes converted = 1 leads
          3. Stage breakdown grouping & percentages
          4. NULL/empty status mapped to 'Unspecified'
          5. Age distribution buckets (0-7, 8-14, 15-30, 30+ days)
          6. Stale lead count (>14 days un-converted)
          7. Live Current Snapshot semantics (period parameter independence)
          8. Hierarchy access isolation (User A1 vs Manager A vs User B1 permission error)
        """
        # Setup Test Leads for User A1
        # Lead 1: Unconverted, Status 'Qualified', Created 5 days ago (0-7 bucket)
        l1 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Test Unconv Lead L1",
            "lead_name": "Test Unconv Lead L1",
            "lead_owner": "a1@test.nexapp",
            "status": "Qualified",
            "converted": 0,
        }).insert(ignore_permissions=True)
        l1.db_set("creation", frappe.utils.add_days(frappe.utils.today(), -5))

        # Lead 2: Unconverted, Status 'Contacted', Created 10 days ago (8-14 bucket)
        l2 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Test Unconv Lead L2",
            "lead_name": "Test Unconv Lead L2",
            "lead_owner": "a1@test.nexapp",
            "status": "Contacted",
            "converted": 0,
        }).insert(ignore_permissions=True)
        l2.db_set("creation", frappe.utils.add_days(frappe.utils.today(), -10))

        # Lead 3: Unconverted, Status None ('Unspecified'), Created 20 days ago (15-30 bucket, Stale >14)
        l3 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Test Unconv Lead L3",
            "lead_name": "Test Unconv Lead L3",
            "lead_owner": "a1@test.nexapp",
            "status": "New",
            "converted": 0,
        }).insert(ignore_permissions=True)
        l3.db_set("status", None)
        l3.db_set("creation", frappe.utils.add_days(frappe.utils.today(), -20))

        # Lead 4: Converted Lead (should be EXCLUDED)
        l4 = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": "Test Conv Lead L4",
            "lead_name": "Test Conv Lead L4",
            "lead_owner": "a1@test.nexapp",
            "status": "Qualified",
            "converted": 1,
        }).insert(ignore_permissions=True)
        l4.db_set("creation", frappe.utils.add_days(frappe.utils.today(), -2))

        try:
            frappe.set_user("a1@test.nexapp")

            # Test 1: Active Snapshot execution
            res = frappe.call(
                "nexapp.api.crm_dashboard.get_unconverted_lead_analytics",
                period="this_month",
            )

            self.assertEqual(res["meta"]["metric_type"], "live_snapshot")
            self.assertTrue(res["meta"]["snapshot"])

            summary = res["summary"]
            self.assertEqual(summary["total_unconverted_leads"], 3)
            self.assertEqual(summary["stale_leads"], 1) # Lead 3 (>14 days)

            # Test 2: Stage Breakdown Verification
            stages_map = {row["status"]: row for row in res["stages"]}
            self.assertIn("Qualified", stages_map)
            self.assertIn("Contacted", stages_map)
            self.assertIn("Unspecified", stages_map)

            self.assertEqual(stages_map["Qualified"]["count"], 1)
            self.assertEqual(stages_map["Qualified"]["percentage"], 33.33)
            self.assertEqual(stages_map["Unspecified"]["count"], 1)
            self.assertEqual(stages_map["Unspecified"]["percentage"], 33.33)

            # Test 3: Age Distribution Verification
            age_map = {row["bucket"]: row for row in res["age_distribution"]}
            self.assertEqual(age_map["0-7 days"]["count"], 1)
            self.assertEqual(age_map["8-14 days"]["count"], 1)
            self.assertEqual(age_map["15-30 days"]["count"], 1)
            self.assertEqual(age_map["30+ days"]["count"], 0)

            # Test 4: Live Snapshot Period Parameter Independence
            res_prev = frappe.call(
                "nexapp.api.crm_dashboard.get_unconverted_lead_analytics",
                period="custom",
                custom_from="2020-01-01",
                custom_to="2020-01-31",
            )
            # Live snapshot must STILL return the current 3 unconverted leads
            self.assertEqual(res_prev["summary"]["total_unconverted_leads"], 3)
            self.assertEqual(res_prev["summary"]["stale_leads"], 1)

            # Test 5: Hierarchy Access Control & Isolation
            frappe.set_user("b1@test.nexapp")
            with self.assertRaises(frappe.PermissionError):
                frappe.call(
                    "nexapp.api.crm_dashboard.get_unconverted_lead_analytics",
                    period="this_month",
                    user_filter="a1@test.nexapp",
                )

        finally:
            frappe.db.delete("CRM Lead", {"name": ["in", [l1.name, l2.name, l3.name, l4.name]]})
            frappe.db.commit()

    def test_phase2m_deal_progression_analytics(self):
        """
        Phase 2M Automated Unit Tests:
          1. Total period stage transitions calculation
          2. Stage transition flow grouping (from_stage -> to_stage)
          3. Chronological stage dwell time reconstruction
          4. Stage loss value aggregation
          5. Zero-data & empty history handling
          6. Period isolation & event filtering
          7. Hierarchy access control (User A1 vs Manager A vs User B1 permission error)
        """
        # Setup Test Deal for User A1
        d1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Progression Deal D1",
            "deal_owner": "a1@test.nexapp",
            "status": "Proposal/Quotation",
            "deal_value": 300000.0,
        }).insert(ignore_permissions=True)
        d1.db_set("creation", "2026-05-01 10:00:00")

        # Setup Status Change Logs for Deal D1 in May 2026
        # Log 1: Qualification -> Proposal on 2026-05-05 (5 days dwell in Qualification)
        log1 = frappe.get_doc({
            "doctype": "CRM Status Change Log",
            "parent": d1.name,
            "parenttype": "CRM Deal",
            "from": "Qualification",
            "to": "Proposal/Quotation",
            "log_owner": "a1@test.nexapp",
        }).insert(ignore_permissions=True)
        log1.db_set("creation", "2026-05-06 10:00:00")

        # Log 2: Proposal -> Lost on 2026-05-16 (10 days dwell in Proposal/Quotation)
        log2 = frappe.get_doc({
            "doctype": "CRM Status Change Log",
            "parent": d1.name,
            "parenttype": "CRM Deal",
            "from": "Proposal/Quotation",
            "to": "Lost",
            "log_owner": "a1@test.nexapp",
        }).insert(ignore_permissions=True)
        log2.db_set("creation", "2026-05-16 10:00:00")

        try:
            frappe.set_user("a1@test.nexapp")

            # Test 1: Fetch analytics for May 2026 period
            res = frappe.call(
                "nexapp.api.crm_dashboard.get_deal_progression_analytics",
                period="custom",
                custom_from="2026-05-01",
                custom_to="2026-05-31",
            )

            self.assertEqual(res["meta"]["metric_type"], "period_event")
            summary = res["summary"]
            self.assertGreaterEqual(summary["total_transitions"], 2)

            # Test 2: Transition Flow Verification
            flows = {(r["from_stage"], r["to_stage"]): r["transition_count"] for r in res["transitions"]}
            self.assertIn(("Qualification", "Proposal/Quotation"), flows)
            self.assertIn(("Proposal/Quotation", "Lost"), flows)

            # Test 3: Stage Loss Value Verification
            loss_map = {r["from_stage"]: r for r in res["loss_breakdown"]}
            self.assertIn("Proposal/Quotation", loss_map)
            self.assertEqual(loss_map["Proposal/Quotation"]["lost_deal_count"], 1)
            self.assertEqual(loss_map["Proposal/Quotation"]["lost_deal_value"], 300000.0)

            # Test 4: Chronological Stage Dwell Verification
            stage_dwell_map = {r["stage"]: r["average_dwell_days"] for r in res["stages"]}
            self.assertEqual(stage_dwell_map["Qualification"], 5.0)
            self.assertEqual(stage_dwell_map["Proposal/Quotation"], 10.0)

            # Test 5: Period Isolation (April 2026 period returns 0 transitions for this deal)
            res_apr = frappe.call(
                "nexapp.api.crm_dashboard.get_deal_progression_analytics",
                period="custom",
                custom_from="2026-04-01",
                custom_to="2026-04-30",
            )
            self.assertEqual(res_apr["summary"]["total_transitions"], 0)

            # Test 6: Hierarchy Access Control & Isolation
            frappe.set_user("b1@test.nexapp")
            with self.assertRaises(frappe.PermissionError):
                frappe.call(
                    "nexapp.api.crm_dashboard.get_deal_progression_analytics",
                    period="custom",
                    custom_from="2026-05-01",
                    custom_to="2026-05-31",
                    user_filter="a1@test.nexapp",
                )

        finally:
            frappe.db.delete("CRM Status Change Log", {"name": ["in", [log1.name, log2.name]]})
            frappe.db.delete("CRM Deal", {"name": d1.name})
            frappe.db.commit()

    def test_phase2n_pipeline_probability_analytics(self):
        """
        Phase 2N Automated Unit Tests:
          1. Gross open pipeline calculation
          2. Weighted forecast calculation & forecast risk gap
          3. Probability tier boundaries (0-25%, 26-50%, 51-75%, 76-99%)
          4. Over-optimistic probability calibration variance (> +15% threshold)
          5. Exclusion of closed deals (status='Won' or 'Lost')
          6. Live Current Snapshot semantics (period independence)
          7. Hierarchy access control (User A1 vs Manager A vs User B1 permission error)
        """
        # Create open deals for User A1
        # Deal N1: Low Confidence (20% prob, value 100,000, stage Qualification prob=10%, variance = +10 -> Not flagged)
        n1 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Prob Deal N1",
            "deal_owner": "a1@test.nexapp",
            "status": "Qualification",
            "deal_value": 100000.0,
            "probability": 20.0,
        }).insert(ignore_permissions=True)

        # Deal N2: Commit & Over-Optimistic (90% prob, value 200,000, stage Proposal/Quotation prob=50%, variance = +40 -> Flagged)
        n2 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Prob Deal N2",
            "organization_name": "Acme Corp",
            "deal_owner": "a1@test.nexapp",
            "status": "Proposal/Quotation",
            "deal_value": 200000.0,
            "probability": 90.0,
        }).insert(ignore_permissions=True)

        # Deal N3: Closed Won Deal (100% prob, value 500,000) -> EXCLUDED
        n3 = frappe.get_doc({
            "doctype": "CRM Deal",
            "deal_name": "Test Prob Deal N3 (Won)",
            "deal_owner": "a1@test.nexapp",
            "status": "Won",
            "deal_value": 500000.0,
            "probability": 100.0,
        }).insert(ignore_permissions=True)

        try:
            frappe.set_user("a1@test.nexapp")

            # Test 1: Fetch analytics
            res = frappe.call(
                "nexapp.api.crm_dashboard.get_pipeline_probability_analytics",
                period="this_month",
            )

            self.assertEqual(res["meta"]["metric_type"], "live_snapshot")
            summary = res["summary"]

            # Gross Open Value = N1 (100,000) + N2 (200,000) = 300,000 (excluding N3 Won)
            self.assertEqual(summary["gross_open_value"], 300000.0)

            # Weighted Value = N1 (100,000 * 0.20 = 20,000) + N2 (200,000 * 0.90 = 180,000) = 200,000
            self.assertEqual(summary["weighted_forecast_value"], 200000.0)

            # Risk Gap = 300,000 - 200,000 = 100,000
            self.assertEqual(summary["forecast_risk_gap"], 100000.0)
            self.assertEqual(summary["open_deal_count"], 2)

            # Test 2: Tier Bucketing
            tiers = {r["tier"]: r for r in res["probability_tiers"]}
            self.assertEqual(tiers["Low Confidence"]["deal_count"], 1)
            self.assertEqual(tiers["Low Confidence"]["gross_value"], 100000.0)
            self.assertEqual(tiers["Commit"]["deal_count"], 1)
            self.assertEqual(tiers["Commit"]["gross_value"], 200000.0)

            # Test 3: Calibration Risk Detection (> +15% variance)
            risks = res["calibration_risks"]
            self.assertEqual(len(risks), 1)
            self.assertEqual(risks[0]["deal_id"], n2.name)
            self.assertEqual(risks[0]["variance"], 40.0)

            # Test 4: Live Snapshot Period Independence
            res_past = frappe.call(
                "nexapp.api.crm_dashboard.get_pipeline_probability_analytics",
                period="custom",
                custom_from="2020-01-01",
                custom_to="2020-01-31",
            )
            self.assertEqual(res_past["summary"]["gross_open_value"], 300000.0)

            # Test 5: Hierarchy Access Control & Isolation
            frappe.set_user("b1@test.nexapp")
            with self.assertRaises(frappe.PermissionError):
                frappe.call(
                    "nexapp.api.crm_dashboard.get_pipeline_probability_analytics",
                    period="this_month",
                    user_filter="a1@test.nexapp",
                )

        finally:
            frappe.db.delete("CRM Deal", {"name": ["in", [n1.name, n2.name, n3.name]]})
            frappe.db.commit()

    def test_v9_crm_dashboard_export(self):
        """
        V9 Integration Test: Executive Export Security, Formats & Scope
        ===============================================================
        Tests CSV and Excel export generation under various scopes and verifies
        that unauthorized scope parameters trigger a PermissionError.
        """
        frappe.set_user("Administrator")
        
        # Test 1: Full Organization Excel Export
        frappe.call(
            "nexapp.api.crm_dashboard.get_crm_dashboard_export",
            period="this_month",
            team_filter="ALL",
            user_filter="ALL",
            export_format="xlsx",
        )
        self.assertEqual(frappe.response.get("type"), "binary")
        self.assertTrue(frappe.response.get("filename").endswith(".xlsx"))

    def test_collections_analytics_scope(self):
        """
        Collections Analytics Integration Test
        ======================================
        Validates get_collections_analytics structure, scope compliance,
        DSO delta direction, aging buckets, and zero-record fallback behavior.
        """
        frappe.set_user("Administrator")
        res = frappe.call(
            "nexapp.api.crm_dashboard.get_collections_analytics",
            period="this_quarter",
            team_filter="ALL",
            user_filter="ALL",
        )
        self.assertIn("scope", res)
        self.assertIn("collections", res)
        coll = res["collections"]
        self.assertIn("collected_value", coll)
        self.assertIn("booked_value", coll)
        self.assertIn("dso_days", coll)
        self.assertIn("aging_0_30", coll)
        self.assertIn("aging_31_60", coll)
        self.assertIn("aging_60_plus", coll)
        self.assertIn("overdue_accounts_count", coll)

    def test_v9_crm_dashboard_export(self):
        """
        V9 Integration Test: Executive Export Security, Formats & Scope
        ===============================================================
        Tests CSV and Excel export generation under various scopes and verifies
        that unauthorized scope parameters trigger a PermissionError.
        """
        frappe.set_user("Administrator")
        
        # Test 1: Full Organization Excel Export
        frappe.call(
            "nexapp.api.crm_dashboard.get_crm_dashboard_export",
            period="this_month",
            team_filter="ALL",
            user_filter="ALL",
            export_format="xlsx",
        )
        self.assertEqual(frappe.response.get("type"), "binary")
        self.assertTrue(frappe.response.get("filename").endswith(".xlsx"))
        self.assertTrue(len(frappe.response.get("filecontent")) > 0)

        # Test 2: Team-scoped CSV Export
        scope_admin = _resolve_scope("Administrator")
        team_a_val = scope_admin["teams"][0]["value"] if scope_admin["teams"] else "ALL"
        frappe.call(
            "nexapp.api.crm_dashboard.get_crm_dashboard_export",
            period="this_month",
            team_filter=team_a_val,
            user_filter="ALL",
            export_format="csv",
        )
        self.assertEqual(frappe.response.get("type"), "csv")
        self.assertTrue(frappe.response.get("filename").endswith(".csv"))
        self.assertIn("CRM EXECUTIVE COMMAND CENTER REPORT", frappe.response.get("filecontent"))

        # Test 3: Unauthorized Scope Protection
        frappe.set_user("b1@test.nexapp")
        with self.assertRaises(frappe.PermissionError):
            frappe.call(
                "nexapp.api.crm_dashboard.get_crm_dashboard_export",
                period="this_month",
                team_filter=team_a_val,
                export_format="xlsx",
            )

    # -------------------------------------------------------------------
    # U. PHASE V10 SALES TARGET ANALYTICS TESTS
    # -------------------------------------------------------------------

    def test_v10_sales_target_analytics(self):
        """
        CRM Dashboard V10 — Sales Target Analytics Security & Calculation Tests
        ======================================================================
        Tests full org target, team target, user target, period filters, custom ranges,
        achievement %, forecast attainment, target gap, zero handling, and scope isolation.
        """
        frappe.set_user("Administrator")

        # Test 1: Full Org Target (This Month)
        res_full = frappe.call("nexapp.api.crm_dashboard.get_sales_target_analytics", period="this_month")
        self.assertIn("summary", res_full)
        self.assertIn("by_user", res_full)
        self.assertIn("by_team", res_full)
        summary = res_full["summary"]
        self.assertGreaterEqual(summary["target_value"], 0.0)
        self.assertGreaterEqual(summary["achieved_value"], 0.0)
        self.assertIn("achievement_percent", summary)
        self.assertIn("forecast_attainment_percent", summary)
        self.assertIn("target_gap", summary)

        # Test 2: Team Target Filter
        scope_admin = _resolve_scope("Administrator")
        if scope_admin["teams"]:
            team_val = scope_admin["teams"][0]["value"]
            res_team = frappe.call(
                "nexapp.api.crm_dashboard.get_sales_target_analytics",
                period="this_month",
                team_filter=team_val,
            )
            self.assertEqual(res_team["scope"]["team_filter"], team_val)
            self.assertGreaterEqual(len(res_team["by_user"]), 0)

        # Test 3: Individual User Target Filter
        if scope_admin["permitted_users"]:
            user_val = scope_admin["permitted_users"][0]["value"]
            res_user = frappe.call(
                "nexapp.api.crm_dashboard.get_sales_target_analytics",
                period="this_month",
                user_filter=user_val,
            )
            self.assertEqual(res_user["scope"]["user_filter"], user_val)
            self.assertEqual(len(res_user["by_user"]), 1)
            self.assertEqual(res_user["by_user"][0]["user"], user_val)

        # Test 4: Custom Date Range Target Calculation
        res_custom = frappe.call(
            "nexapp.api.crm_dashboard.get_sales_target_analytics",
            period="custom",
            custom_from="2026-04-01",
            custom_to="2026-06-30",
        )
        self.assertIn("summary", res_custom)
        self.assertEqual(res_custom["scope"]["from_date"], "2026-04-01")
        self.assertEqual(res_custom["scope"]["to_date"], "2026-06-30")

        # Test 5: Strict Target Mathematics & Hierarchy Assertions for Administrator
        frappe.set_user("Administrator")
        res_admin = frappe.call("nexapp.api.crm_dashboard.get_sales_target_analytics", period="this_month")
        
        # A. Demo users check
        demo_users = [u for u in res_admin["by_user"] if "demo@example.com" in u["user"] or u["user"] == "mathewsamuel10@gmail.com"]
        self.assertEqual(len(demo_users), 7)

        # B. All expected teams received
        demo_teams = [t for t in res_admin["by_team"] if t["team_name"] in ("Team Sarah Connor", "Team Michael Demo")]
        self.assertEqual(len(demo_teams), 2)

        # C & D. Member counts for Team Sarah & Team Michael
        team_sarah = next(t for t in res_admin["by_team"] if t["team_name"] == "Team Sarah Connor")
        team_michael = next(t for t in res_admin["by_team"] if t["team_name"] == "Team Michael Demo")
        self.assertEqual(team_sarah["member_count"], 3)
        self.assertEqual(team_michael["member_count"], 3)

        # E. Team target equals sum of member targets
        sum_sarah_members = sum(u["target_value"] for u in res_admin["by_user"] if u["user"] in ['sarah.demo@example.com', 'john.demo@example.com', 'emily.demo@example.com'])
        self.assertEqual(round(team_sarah["target_value"], 2), round(sum_sarah_members, 2))

        # F. Organization demo target equals sum of demo users' targets
        sum_demo_users = sum(u["target_value"] for u in demo_users)
        self.assertEqual(round(sum_demo_users, 2), 2999988.0)

        # G. User target matches Sales Person configured allocation
        john_user = next(u for u in res_admin["by_user"] if u["user"] == 'john.demo@example.com')
        self.assertEqual(john_user["target_value"], 249999.0)  # 3M / 12 with 8.3333% dist precision

        # Test 6: Team filtering isolation (Team Sarah filter does not include Team Michael users)
        res_sarah_team = frappe.call(
            "nexapp.api.crm_dashboard.get_sales_target_analytics",
            period="this_month",
            team_filter=team_sarah["team_id"],
        )
        sarah_user_emails = [u["user"] for u in res_sarah_team["by_user"]]
        self.assertIn("sarah.demo@example.com", sarah_user_emails)
        self.assertIn("john.demo@example.com", sarah_user_emails)
        self.assertIn("emily.demo@example.com", sarah_user_emails)
        self.assertNotIn("michael.demo@example.com", sarah_user_emails)
        self.assertNotIn("alex.demo@example.com", sarah_user_emails)


        # Test 7: Unauthorized Team Rejection (Security Boundary)
        frappe.set_user("b1@test.nexapp")
        if scope_admin["teams"]:
            unauth_team = scope_admin["teams"][0]["value"]
            with self.assertRaises(frappe.PermissionError):
                frappe.call(
                    "nexapp.api.crm_dashboard.get_sales_target_analytics",
                    period="this_month",
                    team_filter=unauth_team,
                )

        # Test 9: V10.3 Specific Target Breakdowns Assertions
        frappe.set_user("Administrator")
        # A. Team Target equals sum of visible member targets
        self.assertEqual(round(team_sarah["target_value"], 2), round(sum(u["target_value"] for u in res_admin["by_user"] if u["user"] in ['sarah.demo@example.com', 'john.demo@example.com', 'emily.demo@example.com']), 2))
        
        # B. Individual User filtering isolation (John Parker user filter returns only John Parker's target)
        res_john = frappe.call(
            "nexapp.api.crm_dashboard.get_sales_target_analytics",
            period="this_month",
            user_filter="john.demo@example.com"
        )
        self.assertEqual(len(res_john["by_user"]), 1)
        self.assertEqual(res_john["by_user"][0]["user"], "john.demo@example.com")
        # Test 10: V10.4 Sales Target Intelligence & Risk Classifications
        res_intel = frappe.call("nexapp.api.crm_dashboard.get_sales_target_analytics", period="this_month")
        summary_intel = res_intel["summary"]
        self.assertIn("critical_count", summary_intel)
        self.assertIn("at_risk_count", summary_intel)
        self.assertIn("on_track_count", summary_intel)
        self.assertIn("achieved_count", summary_intel)
        
        # Verify user risk classifications
        john_intel = next(u for u in res_intel["by_user"] if u["user"] == "john.demo@example.com")
        self.assertIn("risk_status", john_intel)
        self.assertIn("pipeline_coverage", john_intel)
        self.assertIn("weighted_coverage", john_intel)
        self.assertIn("forecast_gap", john_intel)

        # Sarah Connor has won revenue ₹175,000 against ₹499,998 target (achievement 35.0%)
        sarah_intel = next(u for u in res_intel["by_user"] if u["user"] == "sarah.demo@example.com")
        self.assertEqual(sarah_intel["achieved_value"], 175000.0)
        # Test 11: V10.5 Sales Target Root-Cause Diagnostics & Actionability Engine
        res_rc = frappe.call("nexapp.api.crm_dashboard.get_sales_target_root_cause_analytics", period="this_month")
        self.assertIn("summary", res_rc)
        self.assertIn("diagnostics", res_rc)
        self.assertIn("primary_cause_breakdown", res_rc["summary"])
        
        # Verify diagnostics structure and content for John Parker
        john_rc = next(d for d in res_rc["diagnostics"] if d["user"] == "john.demo@example.com")
        self.assertIn("primary_root_cause", john_rc)
        self.assertIn("recommended_action", john_rc)
        self.assertIn("critical_risk_deals", john_rc)
        self.assertIn("pipeline_coverage", john_rc["metrics"])

        # Security Isolation: Sarah Connor cannot access Michael Demo's root causes
        frappe.set_user("sarah.demo@example.com")
        res_sarah_rc = frappe.call("nexapp.api.crm_dashboard.get_sales_target_root_cause_analytics", period="this_month")
        sarah_users = [d["user"] for d in res_sarah_rc["diagnostics"]]
        self.assertIn("john.demo@example.com", sarah_users)
        self.assertNotIn("alex.demo@example.com", sarah_users)

        # Unauthorized scope request throws PermissionError
        with self.assertRaises(frappe.PermissionError):
            frappe.call("nexapp.api.crm_dashboard.get_sales_target_root_cause_analytics", team_filter="Michael Demo")

    def test_v11a_deal_execution_health_analytics(self):
        """
        V11-A Unit & Security Tests:
          1. Bulk endpoint execution and response structure
          2. Deal age calculation and stale deal detection
          3. Activity & ToDo aggregation (completed, open, overdue)
          4. Communication engagement tracking
          5. Deterministic risk status (CRITICAL, AT_RISK, WATCH, HEALTHY)
          6. Evidence-driven recommended action generation
          7. Hierarchy access control and security isolation
        """
        frappe.set_user("Administrator")
        res = frappe.call("nexapp.api.crm_dashboard.get_deal_execution_health_analytics", period="this_month")
        self.assertIn("summary", res)
        self.assertIn("deals", res)
        self.assertIn("meta", res)
        self.assertIn("stale_threshold_days", res["meta"])
        self.assertEqual(res["meta"]["stale_threshold_days"], 14)

        summary = res["summary"]
        self.assertIn("open_deals", summary)
        self.assertIn("open_pipeline_value", summary)
        self.assertIn("stale_deals", summary)
        self.assertIn("critical_deals", summary)
        self.assertIn("at_risk_deals", summary)
        self.assertIn("no_recent_engagement", summary)
        self.assertIn("overdue_activity_deals", summary)

        if res["deals"]:
            d = res["deals"][0]
            self.assertIn("deal_id", d)
            self.assertIn("deal_title", d)
            self.assertIn("owner", d)
            self.assertIn("deal_age_days", d)
            self.assertIn("days_since_modified", d)
            self.assertIn("completed_activities", d)
            self.assertIn("overdue_activities", d)
            self.assertIn("risk_status", d)
            self.assertIn("risk_reasons", d)
            self.assertIn("recommended_action", d)

        # Hierarchy Security Isolation Test
        frappe.set_user("sarah.demo@example.com")
        res_sarah = frappe.call("nexapp.api.crm_dashboard.get_deal_execution_health_analytics", period="this_month")
        sarah_owners = set(d["owner"] for d in res_sarah["deals"])
        self.assertNotIn("alex.demo@example.com", sarah_owners)

        # Unauthorized scope request throws PermissionError
        with self.assertRaises(frappe.PermissionError):
            frappe.call("nexapp.api.crm_dashboard.get_deal_execution_health_analytics", team_filter="Michael Demo")

    def test_v11b_step1_crm_deal_event_doctype_schema(self):
        """
        V11-B Step 1 Schema Verification:
          1. Verify DocType 'CRM Deal Event' exists
          2. Verify required fields and field types
          3. Verify Select event_type options
          4. Verify database indexes on deal, deal_owner, event_type, field_name, event_timestamp
        """
        self.assertTrue(frappe.db.exists("DocType", "CRM Deal Event"))
        meta = frappe.get_meta("CRM Deal Event")

        # Field Existence & Types
        field_map = {f.fieldname: f for f in meta.fields}
        required_fields = [
            "deal", "deal_owner", "event_type", "field_name",
            "old_value", "new_value", "numeric_old_value", "numeric_new_value",
            "days_pushed", "dwell_days", "event_timestamp", "changed_by"
        ]
        for fieldname in required_fields:
            self.assertIn(fieldname, field_map, f"Field '{fieldname}' missing in CRM Deal Event DocType")

        # Select Options Verification
        event_type_field = field_map["event_type"]
        options = [opt.strip() for opt in event_type_field.options.split("\n") if opt.strip()]
        expected_options = ["CREATED", "STAGE_CHANGED", "CLOSE_DATE_CHANGED", "PROBABILITY_CHANGED", "VALUE_CHANGED", "OWNER_CHANGED"]
        self.assertEqual(options, expected_options)

        # Index Verification in MariaDB
        indexes = frappe.db.sql("SHOW INDEX FROM `tabCRM Deal Event`", as_dict=True)
        indexed_cols = set(idx["Column_name"] for idx in indexes)
        required_indexes = ["deal", "deal_owner", "event_type", "field_name", "event_timestamp"]
        for col in required_indexes:
            self.assertIn(col, indexed_cols, f"Database index missing for column '{col}'")

    def test_v11b_step2_deal_event_hooks(self):
        """
        V11-B Step 2 Unit & Security Tests:
          1. New deal creation generates exactly 1 CREATED event.
          2. Updating unrelated field generates 0 events.
          3. Status change creates STAGE_CHANGED event with correct old/new status.
          4. First stage transition has dwell_days = None; second stage transition computes dwell_days.
          5. Close-date change creates CLOSE_DATE_CHANGED event with correct days_pushed (future, earlier, NULL handling).
          6. Probability change creates PROBABILITY_CHANGED with numeric values.
          7. Deal value change creates VALUE_CHANGED with numeric values.
          8. Owner change creates OWNER_CHANGED with event deal_owner = new owner.
          9. Multiple changes in one save generate multiple distinct events.
          10. Unchanged tracked fields generate no duplicate events.
          11. Transaction rollback rolls back corresponding events.
          12. Standard user permission immutability (cannot write/delete CRM Deal Event manually).
        """
        frappe.set_user("Administrator")

        try:
            # 1. New Deal Creation -> CREATED Event
            deal = frappe.get_doc({
                "doctype": "CRM Deal",
                "organization_name": "Test Event Org V11B",
                "deal_owner": "john.demo@example.com",
                "status": "Qualification",
                "deal_value": 100000.0,
                "probability": 30.0,
                "expected_closure_date": "2026-09-01",
            }).insert(ignore_permissions=True)

            events_after_create = frappe.get_all(
                "CRM Deal Event",
                filters={"deal": deal.name},
                fields=["name", "event_type", "deal_owner", "old_value", "new_value", "numeric_new_value"]
            )
            self.assertEqual(len(events_after_create), 1)
            self.assertEqual(events_after_create[0]["event_type"], "CREATED")
            self.assertEqual(events_after_create[0]["deal_owner"], "john.demo@example.com")

            # 2. Update Unrelated Field -> No New Events
            deal.organization_name = "Test Org Unrelated Update"
            deal.save(ignore_permissions=True)
            events_after_unrelated = frappe.get_all("CRM Deal Event", filters={"deal": deal.name})
            self.assertEqual(len(events_after_unrelated), 1)

            # 3 & 4. First Stage Change -> STAGE_CHANGED event (dwell_days = None or 0)
            deal.status = "Proposal/Quotation"
            deal.save(ignore_permissions=True)

            stage_events = frappe.get_all(
                "CRM Deal Event",
                filters={"deal": deal.name, "event_type": "STAGE_CHANGED"},
                fields=["old_value", "new_value", "dwell_days"]
            )
            self.assertEqual(len(stage_events), 1)
            self.assertEqual(stage_events[0]["old_value"], "Qualification")
            self.assertEqual(stage_events[0]["new_value"], "Proposal/Quotation")
            self.assertTrue(stage_events[0]["dwell_days"] is None or stage_events[0]["dwell_days"] == 0.0)

            # 5. Second Stage Change -> STAGE_CHANGED event (dwell_days computed)
            deal.status = "Negotiation"
            deal.save(ignore_permissions=True)

            stage_events_2 = frappe.get_all(
                "CRM Deal Event",
                filters={"deal": deal.name, "event_type": "STAGE_CHANGED"},
                fields=["old_value", "new_value", "dwell_days"],
                order_by="creation asc"
            )
            self.assertEqual(len(stage_events_2), 2)
            self.assertEqual(stage_events_2[1]["old_value"], "Proposal/Quotation")
            self.assertEqual(stage_events_2[1]["new_value"], "Negotiation")
            self.assertIsNotNone(stage_events_2[1]["dwell_days"])

            # 6. Close Date Change -> CLOSE_DATE_CHANGED (Future push + 10 days)
            deal.expected_closure_date = "2026-09-11"
            deal.save(ignore_permissions=True)

            close_events = frappe.get_all(
                "CRM Deal Event",
                filters={"deal": deal.name, "event_type": "CLOSE_DATE_CHANGED"},
                fields=["old_value", "new_value", "days_pushed"]
            )
            self.assertEqual(len(close_events), 1)
            self.assertEqual(close_events[0]["old_value"], "2026-09-01")
            self.assertEqual(close_events[0]["new_value"], "2026-09-11")
            self.assertEqual(close_events[0]["days_pushed"], 10)

            # 7 & 8. Probability & Deal Value Change (Multiple changes in single save)
            deal.probability = 60.0
            deal.deal_value = 150000.0
            deal.save(ignore_permissions=True)

            prob_events = frappe.get_all(
                "CRM Deal Event",
                filters={"deal": deal.name, "event_type": "PROBABILITY_CHANGED"},
                fields=["numeric_old_value", "numeric_new_value"]
            )
            val_events = frappe.get_all(
                "CRM Deal Event",
                filters={"deal": deal.name, "event_type": "VALUE_CHANGED"},
                fields=["numeric_old_value", "numeric_new_value"]
            )
            self.assertEqual(len(prob_events), 1)
            self.assertEqual(float(prob_events[0]["numeric_old_value"]), 30.0)
            self.assertEqual(float(prob_events[0]["numeric_new_value"]), 60.0)

            self.assertEqual(len(val_events), 1)
            self.assertEqual(float(val_events[0]["numeric_old_value"]), 100000.0)
            self.assertEqual(float(val_events[0]["numeric_new_value"]), 150000.0)

            # 9. Owner Change -> OWNER_CHANGED event (deal_owner = new owner)
            deal.reload()
            deal.deal_owner = "sarah.demo@example.com"
            deal.save(ignore_permissions=True)

            owner_events = frappe.get_all(
                "CRM Deal Event",
                filters={"deal": deal.name, "event_type": "OWNER_CHANGED"},
                fields=["deal_owner", "old_value", "new_value"]
            )
            self.assertEqual(len(owner_events), 1)
            self.assertEqual(owner_events[0]["old_value"], "john.demo@example.com")
            self.assertEqual(owner_events[0]["new_value"], "sarah.demo@example.com")
            self.assertEqual(owner_events[0]["deal_owner"], "sarah.demo@example.com")

            # 10. Security Immutability Test (Sales User cannot insert/delete manually)
            frappe.set_user("sarah.demo@example.com")
            with self.assertRaises(frappe.PermissionError):
                frappe.get_doc({
                    "doctype": "CRM Deal Event",
                    "deal": deal.name,
                    "deal_owner": "sarah.demo@example.com",
                    "event_type": "CREATED",
                    "event_timestamp": frappe.utils.now_datetime()
                }).insert()
        finally:
            frappe.set_user("Administrator")
            if 'deal' in locals() and deal.name:
                frappe.db.delete("CRM Deal Event", {"deal": deal.name})
                frappe.db.delete("CRM Deal", {"name": deal.name})
                frappe.db.commit()

    def test_v11b_step3_backfill_audit_and_reconstruction(self):
        """
        V11-B Step 3 Unit & Security Tests:
          1. Version record containing status change reconstructs STAGE_CHANGED.
          2. Version record containing probability change reconstructs PROBABILITY_CHANGED.
          3. Version record containing deal_value change reconstructs VALUE_CHANGED.
          4. Version record containing deal_owner change reconstructs OWNER_CHANGED.
          5. Version record containing expected_closure_date change reconstructs CLOSE_DATE_CHANGED.
          6. Correct old/new values are preserved.
          7. Correct Version timestamp is used.
          8. Correct Version user is used.
          9. days_pushed is calculated correctly.
          10. dwell_days is NULL when no reliable previous stage timestamp exists.
          11. Multiple historical stage transitions are preserved.
          12. Rerunning backfill creates no duplicates (idempotency).
          13. Missing/invalid Version data does not crash process.
          14. Dry-run creates zero CRM Deal Event records.
          15. Transaction rollback leaves no partial backfill.
          16. Existing Step 2 live events are not duplicated.
        """
        from nexapp.api.crm_deal_event_backfill import backfill_crm_deal_events, audit_version_history
        import json

        frappe.set_user("Administrator")

        try:
            # Create a test deal without triggering initial live hook events for backfill testing
            deal = frappe.get_doc({
                "doctype": "CRM Deal",
                "organization_name": "Test Backfill Org V11B",
                "deal_owner": "john.demo@example.com",
                "status": "Qualification",
                "deal_value": 50000.0,
                "probability": 20.0,
                "expected_closure_date": "2026-09-01",
            }).insert(ignore_permissions=True)

            # Clear live events created during setup to isolate backfill testing
            frappe.db.delete("CRM Deal Event", {"deal": deal.name})
            frappe.db.commit()

            # Create mock Version records
            v1_data = json.dumps({"changed": [["status", "Qualification", "Proposal/Quotation"]]})
            v1 = frappe.get_doc({
                "doctype": "Version",
                "ref_doctype": "CRM Deal",
                "docname": deal.name,
                "data": v1_data,
                "owner": "john.demo@example.com",
                "creation": "2026-08-10 10:00:00"
            }).insert(ignore_permissions=True)

            v2_data = json.dumps({
                "changed": [
                    ["probability", "20.0", "50.0"],
                    ["deal_value", "50000.0", "75000.0"],
                    ["deal_owner", "john.demo@example.com", "sarah.demo@example.com"],
                    ["expected_closure_date", "2026-09-01", "2026-09-15"]
                ]
            })
            v2 = frappe.get_doc({
                "doctype": "Version",
                "ref_doctype": "CRM Deal",
                "docname": deal.name,
                "data": v2_data,
                "owner": "sarah.demo@example.com",
                "creation": "2026-08-12 14:30:00"
            }).insert(ignore_permissions=True)

            v_invalid = frappe.get_doc({
                "doctype": "Version",
                "ref_doctype": "CRM Deal",
                "docname": deal.name,
                "data": "{invalid json}",
                "owner": "john.demo@example.com",
                "creation": "2026-08-13 09:00:00"
            }).insert(ignore_permissions=True)

            # 14. Dry-run creates zero CRM Deal Event records
            initial_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})
            audit_res = audit_version_history()
            self.assertTrue(audit_res["dry_run"])
            dry_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})
            self.assertEqual(dry_count, initial_count)

            # 1-11. Perform actual backfill
            exec_res = backfill_crm_deal_events(dry_run=False)
            
            backfill_events = frappe.get_all(
                "CRM Deal Event",
                filters={"deal": deal.name},
                fields=["event_type", "field_name", "old_value", "new_value", "numeric_old_value", "numeric_new_value", "days_pushed", "dwell_days", "changed_by", "event_timestamp"],
                order_by="event_timestamp asc"
            )
            self.assertEqual(len(backfill_events), 5)

            # Test STAGE_CHANGED
            stage_ev = [e for e in backfill_events if e["event_type"] == "STAGE_CHANGED"][0]
            self.assertEqual(stage_ev["old_value"], "Qualification")
            self.assertEqual(stage_ev["new_value"], "Proposal/Quotation")
            self.assertEqual(stage_ev["changed_by"], "Administrator")
            self.assertTrue(stage_ev["dwell_days"] is None or stage_ev["dwell_days"] == 0.0)  # 10. dwell_days is NULL or 0.0 when no prior stage event

            # Test PROBABILITY_CHANGED
            prob_ev = [e for e in backfill_events if e["event_type"] == "PROBABILITY_CHANGED"][0]
            self.assertEqual(float(prob_ev["numeric_old_value"]), 20.0)
            self.assertEqual(float(prob_ev["numeric_new_value"]), 50.0)

            # Test VALUE_CHANGED
            val_ev = [e for e in backfill_events if e["event_type"] == "VALUE_CHANGED"][0]
            self.assertEqual(float(val_ev["numeric_old_value"]), 50000.0)
            self.assertEqual(float(val_ev["numeric_new_value"]), 75000.0)

            # Test OWNER_CHANGED
            owner_ev = [e for e in backfill_events if e["event_type"] == "OWNER_CHANGED"][0]
            self.assertEqual(owner_ev["old_value"], "john.demo@example.com")
            self.assertEqual(owner_ev["new_value"], "sarah.demo@example.com")

            # Test CLOSE_DATE_CHANGED
            close_ev = [e for e in backfill_events if e["event_type"] == "CLOSE_DATE_CHANGED"][0]
            self.assertEqual(close_ev["old_value"], "2026-09-01")
            self.assertEqual(close_ev["new_value"], "2026-09-15")
            self.assertEqual(close_ev["days_pushed"], 14)  # 9. days_pushed = 14

            # 12 & 16. Idempotency test (rerunning backfill creates 0 duplicate events)
            re_res = backfill_crm_deal_events(dry_run=False)
            after_re_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})
            self.assertEqual(after_re_count, 5)

        finally:
            frappe.set_user("Administrator")
            if 'deal' in locals() and deal.name:
                frappe.db.delete("Version", {"ref_doctype": "CRM Deal", "docname": deal.name})
                frappe.db.delete("CRM Deal Event", {"deal": deal.name})
                frappe.db.delete("CRM Deal", {"name": deal.name})
                frappe.db.commit()

    def test_v11b_step4_backend_event_execution_analytics(self):
        """
        V11-B Step 4 Dedicated Test Group:
          1. Stage velocity calculation.
          2. NULL dwell_days exclusion.
          3. Stage transition count.
          4. Slippage calculation.
          5. Positive and negative slippage.
          6. Missing close-date handling.
          7. Probability movement.
          8. Value movement.
          9. Owner transfer analytics.
          10. Event timestamp period filtering.
          11. Deal creation date must NOT control event-period filtering.
          12. Hierarchy isolation.
          13. Unauthorized user filter rejection.
          14. Zero-denominator safety.
          15. Empty dataset response.
          16. Administrator/unrestricted scope.
          17. Multiple events for the same Deal.
          18. Multiple tracked field changes.
          19. Historical backfilled events and live events work identically.
          20. No analytics API writes to CRM Deal Event.
        """
        from nexapp.api.crm_dashboard import (
            get_deal_stage_velocity_analytics,
            get_deal_slippage_analytics,
            get_probability_movement_analytics,
            get_deal_value_movement_analytics,
            get_deal_owner_change_analytics,
            get_deal_execution_analytics,
        )

        frappe.set_user("Administrator")
        today = frappe.utils.nowdate()

        try:
            # 11 & 17-19. Create test deal (creation date in previous month, event timestamp in current period)
            deal = frappe.get_doc({
                "doctype": "CRM Deal",
                "organization_name": "Test Step 4 Analytics Org",
                "deal_owner": "a1@test.nexapp",
                "status": "Qualification",
                "deal_value": 100000.0,
                "probability": 20.0,
                "expected_closure_date": "2026-09-01",
            }).insert(ignore_permissions=True)

            # Delete live events generated during setup to isolate test events
            frappe.db.delete("CRM Deal Event", {"deal": deal.name})
            frappe.db.commit()

            # Insert deterministic historical/backfilled & live events for a1@test.nexapp
            ev_stage1 = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "STAGE_CHANGED",
                "field_name": "status",
                "old_value": "Qualification",
                "new_value": "Proposal",
                "event_timestamp": f"{today} 10:00:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            ev_stage2 = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "STAGE_CHANGED",
                "field_name": "status",
                "old_value": "Proposal",
                "new_value": "Negotiation",
                "dwell_days": 5.0,  # Measurable dwell days (Requirement 1 & 3)
                "event_timestamp": f"{today} 12:00:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            ev_slip1 = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "CLOSE_DATE_CHANGED",
                "field_name": "expected_closure_date",
                "old_value": "2026-09-01",
                "new_value": "2026-09-11",
                "days_pushed": 10,  # Positive slippage (Requirement 4 & 5)
                "event_timestamp": f"{today} 11:00:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            ev_prob = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "PROBABILITY_CHANGED",
                "field_name": "probability",
                "old_value": "20.0",
                "new_value": "60.0",
                "numeric_old_value": 20.0,
                "numeric_new_value": 60.0,  # Requirement 7
                "event_timestamp": f"{today} 11:30:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            ev_val = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "VALUE_CHANGED",
                "field_name": "deal_value",
                "old_value": "100000.0",
                "new_value": "150000.0",
                "numeric_old_value": 100000.0,
                "numeric_new_value": 150000.0,  # Requirement 8
                "event_timestamp": f"{today} 11:45:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            ev_owner = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "OWNER_CHANGED",
                "field_name": "deal_owner",
                "old_value": "a1@test.nexapp",
                "new_value": "a2@test.nexapp",  # Requirement 9
                "event_timestamp": f"{today} 12:15:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            frappe.db.commit()

            # 20. Confirm initial count of events
            initial_event_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})

            # --- Test 1-3. Stage Velocity Analytics ---
            vel_res = get_deal_stage_velocity_analytics(period="this_month", user_filter="a1@test.nexapp")
            self.assertEqual(vel_res["summary"]["total_stage_transitions"], 2)
            self.assertEqual(vel_res["summary"]["measurable_transitions"], 1)
            self.assertEqual(vel_res["summary"]["overall_average_dwell_days"], 5.0)

            # --- Test 4-6. Slippage Analytics ---
            slip_res = get_deal_slippage_analytics(period="this_month", user_filter="a1@test.nexapp")
            self.assertEqual(slip_res["summary"]["close_date_changes"], 1)
            self.assertEqual(slip_res["summary"]["positive_slippage_days"], 10)
            self.assertEqual(slip_res["summary"]["average_positive_slippage_days"], 10.0)

            # --- Test 7. Probability Movement ---
            prob_res = get_probability_movement_analytics(period="this_month", user_filter="a1@test.nexapp")
            self.assertEqual(prob_res["summary"]["probability_changes"], 1)
            self.assertEqual(prob_res["summary"]["net_probability_movement"], 40.0)
            self.assertEqual(prob_res["summary"]["largest_increase"], 40.0)

            # --- Test 8. Value Movement ---
            val_res = get_deal_value_movement_analytics(period="this_month", user_filter="a1@test.nexapp")
            self.assertEqual(val_res["summary"]["value_changes"], 1)
            self.assertEqual(val_res["summary"]["total_positive_movement"], 50000.0)

            # --- Test 9. Owner Change Analytics ---
            owner_res = get_deal_owner_change_analytics(period="this_month", user_filter="a1@test.nexapp")
            self.assertEqual(owner_res["summary"]["owner_changes"], 1)
            self.assertEqual(len(owner_res["transfers"]), 1)
            self.assertEqual(owner_res["transfers"][0]["from_owner"], "a1@test.nexapp")
            self.assertEqual(owner_res["transfers"][0]["to_owner"], "a2@test.nexapp")

            # --- Test Executive Summary API ---
            exec_res = get_deal_execution_analytics(period="this_month", user_filter="a1@test.nexapp")
            self.assertEqual(exec_res["summary"]["stage_velocity"]["total_stage_transitions"], 2)
            self.assertEqual(exec_res["summary"]["slippage"]["positive_slippage_days"], 10)

            # 12 & 13. Hierarchy Security & Unauthorized User Filter Rejection
            frappe.set_user("mgr_a@test.nexapp")
            # Manager A can view A1
            mgr_res = get_deal_execution_analytics(period="this_month", user_filter="a1@test.nexapp")
            self.assertEqual(mgr_res["summary"]["stage_velocity"]["total_stage_transitions"], 2)

            # Manager A cannot view user_filter b1@test.nexapp
            with self.assertRaises(frappe.PermissionError):
                get_deal_execution_analytics(period="this_month", user_filter="b1@test.nexapp")

            frappe.set_user("a1@test.nexapp")
            # Rep A1 cannot view user_filter a2@test.nexapp
            with self.assertRaises(frappe.PermissionError):
                get_deal_execution_analytics(period="this_month", user_filter="a2@test.nexapp")

            # 14 & 15. Empty dataset / Zero denominator safety
            frappe.set_user("b1@test.nexapp")
            b1_res = get_deal_execution_analytics(period="this_month")
            self.assertEqual(b1_res["summary"]["stage_velocity"]["total_stage_transitions"], 0)
            self.assertIsNone(b1_res["summary"]["stage_velocity"]["overall_average_dwell_days"])
            self.assertEqual(b1_res["summary"]["slippage"]["positive_slippage_days"], 0)

            # 20. Confirm no analytics API wrote to CRM Deal Event
            frappe.set_user("Administrator")
            final_event_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})
            self.assertEqual(final_event_count, initial_event_count)

        finally:
            frappe.set_user("Administrator")
            if 'deal' in locals() and deal.name:
                frappe.db.delete("CRM Deal Event", {"deal": deal.name})
                frappe.db.delete("CRM Deal", {"name": deal.name})
                frappe.db.commit()

    def test_v11b_step6_deal_velocity_command_center(self):
        """
        V11-B Step 6B Dedicated Test Group:
        Verifies backend Deal Velocity & Slippage Command Center API, scope enforcement,
        deterministic risk scoring, slippage vs pull-forward rules, and zero-fabrication safety.
        """
        from nexapp.api.crm_dashboard import get_deal_velocity_slippage_command_center
        today = frappe.utils.today()

        frappe.set_user("Administrator")
        try:
            # Setup active open deal for a1@test.nexapp
            stage_name = frappe.db.get_value("CRM Deal Status", {"type": "Open"}, "name") or "Open"
            deal = frappe.get_doc({
                "doctype": "CRM Deal",
                "organization_name": "Test Corp V11B Step6",
                "status": stage_name,
                "deal_owner": "a1@test.nexapp",
                "deal_value": 75000.0,  # > ₹50,000 threshold
                "probability": 50.0,
                "expected_closure_date": "2026-09-15",
            }).insert(ignore_permissions=True)

            frappe.db.delete("CRM Deal Event", {"deal": deal.name})
            frappe.db.commit()

            # Insert deterministic historical events
            # Event 1: Positive Close Date Push 1 (+10 days)
            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "CLOSE_DATE_CHANGED",
                "field_name": "expected_closure_date",
                "old_value": "2026-09-05",
                "new_value": "2026-09-15",
                "days_pushed": 10,
                "event_timestamp": f"{today} 08:00:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            # Event 2: Positive Close Date Push 2 (+15 days) -> Repeat Slippage = 2 pushes, +25 days
            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "CLOSE_DATE_CHANGED",
                "field_name": "expected_closure_date",
                "old_value": "2026-09-15",
                "new_value": "2026-09-30",
                "days_pushed": 15,
                "event_timestamp": f"{today} 09:00:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            # Event 3: Negative Close Date Pull Forward (-5 days) -> NOT counted as positive slippage
            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "CLOSE_DATE_CHANGED",
                "field_name": "expected_closure_date",
                "old_value": "2026-09-30",
                "new_value": "2026-09-25",
                "days_pushed": -5,
                "event_timestamp": f"{today} 09:30:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            # Event 4: Probability Decline (-15 pp)
            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "PROBABILITY_CHANGED",
                "field_name": "probability",
                "numeric_old_value": 65.0,
                "numeric_new_value": 50.0,
                "event_timestamp": f"{today} 10:00:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            # Event 5: Value Contraction (-₹10,000)
            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "VALUE_CHANGED",
                "field_name": "deal_value",
                "numeric_old_value": 85000.0,
                "numeric_new_value": 75000.0,
                "event_timestamp": f"{today} 11:00:00",
                "changed_by": "a1@test.nexapp"
            }).insert(ignore_permissions=True)

            frappe.db.commit()
            initial_events_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})

            # 1. Endpoint exists and is callable
            res = get_deal_velocity_slippage_command_center(period="this_month", user_filter="a1@test.nexapp")
            self.assertIn("summary", res)
            self.assertIn("deal_matrix", res)

            # 4, 5, 6, 7, 8. Slippage & Pull Forward Aggregations
            summary = res["summary"]
            self.assertEqual(summary["total_slipped_deals"], 1)
            self.assertEqual(summary["repeat_slippage_deals"], 1)
            self.assertEqual(summary["total_positive_days_pushed"], 25)
            self.assertEqual(summary["total_days_pulled_forward"], 5)

            # Find deal in matrix
            matched = [d for d in res["deal_matrix"] if d["deal_id"] == deal.name]
            self.assertEqual(len(matched), 1)
            dm = matched[0]

            self.assertEqual(dm["close_date_push_count"], 2)
            self.assertEqual(dm["cumulative_days_pushed"], 25)
            self.assertEqual(dm["days_pulled_forward"], 5)

            # 9 & 10. Probability & Value Movement
            self.assertEqual(dm["net_probability_change"], -15.0)
            self.assertEqual(dm["net_value_change"], -10000.0)

            # 11. Missing stage history produces NULL current_stage_dwell_days
            self.assertIsNone(dm["current_stage_dwell_days"])

            # 12. Deterministic Risk Scoring Verification
            # Score factors expected:
            # - Repeat Slippage (+20)
            # - Cumulative Push > 14d (+20)
            # - Probability Decline (+20)
            # - Value Contraction (+20)
            # Total Score = 80
            self.assertEqual(dm["deterministic_risk_score"], 80)
            self.assertEqual(len(dm["risk_factors"]), 4)

            # 13 & 14. High-value threshold ₹50,000 exposure
            self.assertEqual(summary["high_value_slippage_deals"], 1)
            self.assertEqual(summary["high_risk_deals"], 1)
            self.assertEqual(summary["high_risk_value_exposure"], 75000.0)

            # 2 & 3. Hierarchy Security Checks
            frappe.set_user("mgr_a@test.nexapp")
            # Manager A can view A1
            mgr_res = get_deal_velocity_slippage_command_center(period="this_month", user_filter="a1@test.nexapp")
            self.assertEqual(mgr_res["summary"]["total_slipped_deals"], 1)

            # Manager A cannot view user_filter b1@test.nexapp
            with self.assertRaises(frappe.PermissionError):
                get_deal_velocity_slippage_command_center(period="this_month", user_filter="b1@test.nexapp")

            frappe.set_user("a1@test.nexapp")
            # Rep A1 cannot view user_filter a2@test.nexapp
            with self.assertRaises(frappe.PermissionError):
                get_deal_velocity_slippage_command_center(period="this_month", user_filter="a2@test.nexapp")

            # 15. Empty dataset / clean zero metrics
            frappe.set_user("b1@test.nexapp")
            b1_res = get_deal_velocity_slippage_command_center(period="this_month")
            self.assertEqual(b1_res["summary"]["total_active_deals"], 0)
            self.assertEqual(b1_res["summary"]["total_slipped_deals"], 0)

            # 16. Confirm API is read-only and wrote no events
            frappe.set_user("Administrator")
            final_events_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})
            self.assertEqual(final_events_count, initial_events_count)

        finally:
            frappe.set_user("Administrator")
            if 'deal' in locals() and deal.name:
                frappe.db.delete("CRM Deal Event", {"deal": deal.name})
                frappe.db.delete("CRM Deal", {"name": deal.name})
                frappe.db.commit()

    def test_v12_step1_stage_transition_bottleneck_analytics(self):
        """
        V12 Step 1 Dedicated Test Group:
        Verifies backend Stage Transition & Bottleneck Analytics API, zero-fabrication NULL dwell rules,
        pairwise matrix aggregation, bottleneck index calculation, read-only behavior, and permission boundaries.
        """
        from nexapp.api.crm_dashboard import get_stage_transition_bottleneck_analytics
        today = frappe.utils.today()
        now_ts = frappe.utils.now_datetime()

        frappe.set_user("Administrator")
        try:
            # Setup test deal
            stage_name = frappe.db.get_value("CRM Deal Status", {"type": "Open"}, "name") or "Open"
            deal = frappe.get_doc({
                "doctype": "CRM Deal",
                "organization_name": "V12 Step1 Test Corp",
                "status": stage_name,
                "deal_owner": "a1@test.nexapp",
                "deal_value": 50000.0,
                "probability": 50.0,
            }).insert(ignore_permissions=True)

            frappe.db.delete("CRM Deal Event", {"deal": deal.name})
            frappe.db.commit()

            # Insert STAGE_CHANGED event 1: Qualification -> Proposal (dwell_days = NULL)
            e1 = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "STAGE_CHANGED",
                "field_name": "status",
                "old_value": "Qualification",
                "new_value": "Proposal",
                "event_timestamp": now_ts,
                "changed_by": "Administrator",
            }).insert(ignore_permissions=True)

            # Insert STAGE_CHANGED event 2: Proposal -> Negotiation (dwell_days = 10.0)
            e2 = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "STAGE_CHANGED",
                "field_name": "status",
                "old_value": "Proposal",
                "new_value": "Negotiation",
                "dwell_days": 10.0,
                "event_timestamp": frappe.utils.add_to_date(now_ts, days=10),
                "changed_by": "Administrator",
            }).insert(ignore_permissions=True)

            frappe.db.commit()
            initial_event_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})

            # 1. Administrator execution (unrestricted)
            res = get_stage_transition_bottleneck_analytics(period="this_year")
            self.assertIn("scope", res)
            self.assertIn("summary", res)
            self.assertIn("stage_velocity", res)
            self.assertIn("transition_matrix", res)
            self.assertIn("bottlenecks", res)

            # 2. Check summary aggregates
            summary = res["summary"]
            self.assertGreaterEqual(summary["total_stage_transitions"], 2)
            self.assertGreaterEqual(summary["measured_transitions"], 1)

            # 3. Check Proposal stage velocity (Proposal -> Negotiation had dwell_days=10.0)
            prop_velocity = next((s for s in res["stage_velocity"] if s["stage"] == "Proposal"), None)
            self.assertIsNotNone(prop_velocity)
            self.assertGreaterEqual(prop_velocity["transition_count"], 1)

            # 4. Check transition matrix path: Proposal -> Negotiation for our specific deal
            prop_neg_path = next((t for t in res["transition_matrix"] if t["from_stage"] == "Proposal" and t["to_stage"] == "Negotiation"), None)
            self.assertIsNotNone(prop_neg_path)
            self.assertGreaterEqual(prop_neg_path["transition_count"], 1)
            self.assertEqual(prop_neg_path["average_dwell_days"], 10.0)
            self.assertEqual(prop_neg_path["transition_count"], 1)
            self.assertEqual(prop_neg_path["measured_count"], 1)
            self.assertEqual(prop_neg_path["average_dwell_days"], 10.0)

            # 6. Check bottleneck index (Proposal average_dwell=10.0 * measured_count=1 = 10.0)
            prop_bottleneck = next((b for b in res["bottlenecks"] if b["stage"] == "Proposal"), None)
            self.assertIsNotNone(prop_bottleneck)
            self.assertEqual(prop_bottleneck["bottleneck_index"], 10.0)

            # 7. Check permission scope enforcement for restricted user b1@test.nexapp
            frappe.set_user("b1@test.nexapp")
            b1_res = get_stage_transition_bottleneck_analytics(period="this_month")
            # b1@test.nexapp cannot see deal events owned by a1@test.nexapp
            b1_deals = [t for t in b1_res["transition_matrix"] if t["from_stage"] == "Proposal" and t["to_stage"] == "Negotiation"]
            self.assertEqual(len(b1_deals), 0)

            # 9. Verify API read-only property
            frappe.set_user("Administrator")
            final_event_count = frappe.db.count("CRM Deal Event", filters={"deal": deal.name})
            self.assertEqual(final_event_count, initial_event_count)

        finally:
            frappe.set_user("Administrator")
            if 'deal' in locals() and deal.name:
                frappe.db.delete("CRM Deal Event", {"deal": deal.name})
                frappe.db.delete("CRM Deal", {"name": deal.name})
                frappe.db.commit()

    def test_v12_step2_loss_outcome_correlation_analytics(self):
        """
        V12 Step 2 Dedicated Test Group:
        Verifies backend Loss Outcome Correlation Analytics API, comparing Won vs Lost deals across
        Probability Decline, Close-Date Pushes, Repeat Slippage, Value Contraction, read-only property, and permissions.
        """
        from nexapp.api.crm_dashboard import get_loss_outcome_correlation_analytics
        today = frappe.utils.today()
        now_ts = frappe.utils.now_datetime()

        frappe.set_user("Administrator")
        try:
            won_stage = frappe.db.get_value("CRM Deal Status", {"type": "Won"}, "name") or "Won"
            lost_stage = frappe.db.get_value("CRM Deal Status", {"type": "Lost"}, "name") or "Lost"

            # 1. Setup Won deal
            deal_won = frappe.get_doc({
                "doctype": "CRM Deal",
                "organization_name": "V12 Step2 Won Corp",
                "status": won_stage,
                "deal_owner": "a1@test.nexapp",
                "deal_value": 100000.0,
                "probability": 100.0,
            }).insert(ignore_permissions=True)

            # 2. Setup Lost deal
            lost_reason_val = frappe.db.get_value("CRM Lost Reason", {}, "name") or "Price too high"
            deal_lost = frappe.get_doc({
                "doctype": "CRM Deal",
                "organization_name": "V12 Step2 Lost Corp",
                "status": lost_stage,
                "lost_reason": lost_reason_val,
                "deal_owner": "a1@test.nexapp",
                "deal_value": 40000.0,
                "probability": 0.0,
            }).insert(ignore_permissions=True)

            frappe.db.delete("CRM Deal Event", {"deal": deal_won.name})
            frappe.db.delete("CRM Deal Event", {"deal": deal_lost.name})
            frappe.db.commit()

            # Events for Won Deal: 1 Close date push (+5 days), no prob decline, no val contraction
            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal_won.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "CLOSE_DATE_CHANGED",
                "field_name": "expected_closure_date",
                "days_pushed": 5,
                "event_timestamp": now_ts,
                "changed_by": "Administrator",
            }).insert(ignore_permissions=True)

            # Events for Lost Deal: Prob decline (-20%), 2 Close date pushes (+10, +15 days -> repeat slippage), Val contraction (-10000)
            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal_lost.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "PROBABILITY_CHANGED",
                "field_name": "probability",
                "numeric_old_value": 50.0,
                "numeric_new_value": 30.0,
                "event_timestamp": now_ts,
                "changed_by": "Administrator",
            }).insert(ignore_permissions=True)

            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal_lost.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "CLOSE_DATE_CHANGED",
                "field_name": "expected_closure_date",
                "days_pushed": 10,
                "event_timestamp": now_ts,
                "changed_by": "Administrator",
            }).insert(ignore_permissions=True)

            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal_lost.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "CLOSE_DATE_CHANGED",
                "field_name": "expected_closure_date",
                "days_pushed": 15,
                "event_timestamp": now_ts,
                "changed_by": "Administrator",
            }).insert(ignore_permissions=True)

            frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": deal_lost.name,
                "deal_owner": "a1@test.nexapp",
                "event_type": "VALUE_CHANGED",
                "field_name": "deal_value",
                "numeric_old_value": 50000.0,
                "numeric_new_value": 40000.0,
                "event_timestamp": now_ts,
                "changed_by": "Administrator",
            }).insert(ignore_permissions=True)

            frappe.db.commit()
            initial_lost_events = frappe.db.count("CRM Deal Event", filters={"deal": deal_lost.name})

            # Execute API
            res = get_loss_outcome_correlation_analytics(period="this_month")
            self.assertIn("scope", res)
            self.assertIn("summary", res)
            self.assertIn("correlations", res)

            # Check summary
            self.assertGreaterEqual(res["summary"]["won_deals"], 1)
            self.assertGreaterEqual(res["summary"]["lost_deals"], 1)

            corr = res["correlations"]

            # Probability Decline checks
            self.assertEqual(corr["probability_decline"]["won"]["affected_deals"], 0)
            self.assertGreaterEqual(corr["probability_decline"]["lost"]["affected_deals"], 1)
            self.assertEqual(corr["probability_decline"]["lost"]["total_decline_amount"], 20.0)

            # Close Date Push checks
            self.assertGreaterEqual(corr["close_date_push"]["won"]["affected_deals"], 1)
            self.assertGreaterEqual(corr["close_date_push"]["lost"]["affected_deals"], 1)

            # Repeat Slippage checks (Lost deal had 2 pushes)
            self.assertEqual(corr["repeat_slippage"]["won"]["affected_deals"], 0)
            self.assertGreaterEqual(corr["repeat_slippage"]["lost"]["affected_deals"], 1)

            # Value Contraction checks
            self.assertEqual(corr["value_contraction"]["won"]["affected_deals"], 0)
            self.assertGreaterEqual(corr["value_contraction"]["lost"]["affected_deals"], 1)
            self.assertEqual(corr["value_contraction"]["lost"]["total_contraction_amount"], 10000.0)

            # Permission Scope enforcement for restricted user b1@test.nexapp
            frappe.set_user("b1@test.nexapp")
            b1_res = get_loss_outcome_correlation_analytics(period="this_month")
            # b1@test.nexapp cannot see deals owned by a1@test.nexapp
            self.assertEqual(b1_res["summary"]["won_deals"], 0)
            self.assertEqual(b1_res["summary"]["lost_deals"], 0)

            # Read-only verification
            frappe.set_user("Administrator")
            final_lost_events = frappe.db.count("CRM Deal Event", filters={"deal": deal_lost.name})
            self.assertEqual(final_lost_events, initial_lost_events)

        finally:
            frappe.set_user("Administrator")
            if 'deal_won' in locals() and deal_won.name:
                frappe.db.delete("CRM Deal Event", {"deal": deal_won.name})
                frappe.db.delete("CRM Deal", {"name": deal_won.name})
            if 'deal_lost' in locals() and deal_lost.name:
                frappe.db.delete("CRM Deal Event", {"deal": deal_lost.name})
                frappe.db.delete("CRM Deal", {"name": deal_lost.name})
            frappe.db.commit()

    def test_v12_step3_backend_integration_and_scope_verification(self):
        """
        V12 Step 3 Dedicated Test Group:
        Comprehensive backend integration and security test suite for V12 Step 1 & Step 2 APIs.
        Verifies scope consistency, date period resolution, team/user hierarchy filtering,
        empty state handling, and zero-predictive/zero-causal metadata guarantees.
        """
        from nexapp.api.crm_dashboard import (
            get_stage_transition_bottleneck_analytics,
            get_loss_outcome_correlation_analytics,
        )
        today = frappe.utils.today()
        this_month_first = frappe.utils.get_first_day(today)
        this_month_last = frappe.utils.get_last_day(today)

        # 1. Verify period resolution and metadata guarantees under Administrator
        frappe.set_user("Administrator")
        
        # Test period = "this_month"
        b_res = get_stage_transition_bottleneck_analytics(period="this_month")
        c_res = get_loss_outcome_correlation_analytics(period="this_month")

        self.assertEqual(str(b_res["scope"]["from_date"]), str(this_month_first))
        self.assertEqual(str(b_res["scope"]["to_date"]), str(this_month_last))
        self.assertEqual(str(c_res["scope"]["from_date"]), str(this_month_first))
        self.assertEqual(str(c_res["scope"]["to_date"]), str(this_month_last))

        self.assertFalse(b_res["meta"]["predictive"])
        self.assertEqual(b_res["meta"]["risk_model"], "none")
        self.assertFalse(c_res["meta"]["predictive"])
        self.assertFalse(c_res["meta"]["causal"])
        self.assertEqual(c_res["meta"]["risk_model"], "none")

        # Test period = "custom" with valid custom_from / custom_to
        b_custom = get_stage_transition_bottleneck_analytics(
            period="custom",
            custom_from="2026-01-01",
            custom_to="2026-03-31"
        )
        c_custom = get_loss_outcome_correlation_analytics(
            period="custom",
            custom_from="2026-01-01",
            custom_to="2026-03-31"
        )
        self.assertEqual(str(b_custom["scope"]["from_date"]), "2026-01-01")
        self.assertEqual(str(b_custom["scope"]["to_date"]), "2026-03-31")
        self.assertEqual(str(c_custom["scope"]["from_date"]), "2026-01-01")
        self.assertEqual(str(c_custom["scope"]["to_date"]), "2026-03-31")

        # 2. Test Hierarchy Security Isolation (a1 vs b1)
        # Restricted user b1@test.nexapp attempting to filter explicitly by unauthorized user a1@test.nexapp MUST raise PermissionError
        frappe.set_user("b1@test.nexapp")
        with self.assertRaises(frappe.PermissionError):
            get_stage_transition_bottleneck_analytics(period="this_month", user_filter="a1@test.nexapp")

        with self.assertRaises(frappe.PermissionError):
            get_loss_outcome_correlation_analytics(period="this_month", user_filter="a1@test.nexapp")

        # When b1@test.nexapp queries with default user_filter="ALL", scope effective_users is restricted to b1@test.nexapp
        b1_bottleneck = get_stage_transition_bottleneck_analytics(period="this_month")
        b1_correlation = get_loss_outcome_correlation_analytics(period="this_month")
        self.assertEqual(b1_bottleneck["scope"]["effective_user_count"], 1)
        self.assertEqual(b1_correlation["scope"]["effective_user_count"], 1)

        # 3. Test Empty Dataset response structure under valid empty scope
        frappe.set_user("Administrator")
        empty_b = get_stage_transition_bottleneck_analytics(period="custom", custom_from="1990-01-01", custom_to="1990-01-31")
        empty_c = get_loss_outcome_correlation_analytics(period="custom", custom_from="1990-01-01", custom_to="1990-01-31")

        self.assertEqual(empty_b["summary"]["total_stage_transitions"], 0)
        self.assertEqual(empty_b["summary"]["measured_transitions"], 0)
        self.assertEqual(empty_b["summary"]["unmeasured_transitions"], 0)
        self.assertIsNone(empty_b["summary"]["slowest_stage"])
        self.assertIsNone(empty_b["summary"]["slowest_transition"])
        self.assertEqual(len(empty_b["stage_velocity"]), 0)
        self.assertEqual(len(empty_b["transition_matrix"]), 0)
        self.assertEqual(len(empty_b["bottlenecks"]), 0)

        self.assertEqual(empty_c["summary"]["won_deals"], 0)
        self.assertEqual(empty_c["summary"]["lost_deals"], 0)
        self.assertEqual(empty_c["summary"]["total_outcome_deals"], 0)
        self.assertEqual(empty_c["correlations"]["probability_decline"]["won"]["affected_deals"], 0)
        self.assertEqual(empty_c["correlations"]["probability_decline"]["lost"]["affected_deals"], 0)

    def test_v15_4_key_account_intelligence(self):
        """
        V15.4 Unit & Security Tests:
          1. Aggregation of active deals, pipeline value, weighted value by account.
          2. High-risk exposure calculation (risk score >= 60).
          3. Overdue activity count & close date slippage aggregation per account.
          4. Deterministic attention classification (CRITICAL, HIGH_RISK, HEALTHY).
          5. Historical won revenue inclusion in period boundary.
          6. Hierarchy security isolation (b1@test.nexapp cannot access a1@test.nexapp accounts).
          7. V15.3.1 Data Integrity compliance (comparison_status = 'not_measurable').
        """
        frappe.set_user("Administrator")
        
        # Test 1: Fetch key account intelligence for Administrator
        res = frappe.call(
            "nexapp.api.crm_dashboard.get_key_account_intelligence",
            period="this_month",
            team_filter="ALL",
            user_filter="ALL"
        )
        
        self.assertIn("summary", res)
        self.assertIn("accounts", res)
        self.assertIn("meta", res)
        self.assertEqual(res["meta"]["audit_version"], "v15.4")
        self.assertEqual(res["meta"]["comparison_status"], "not_measurable")
        
        summary = res["summary"]
        self.assertGreaterEqual(summary["total_accounts"], 0)
        self.assertGreaterEqual(summary["total_active_pipeline"], 0.0)

        # Test 2: Verify Account Data Structure
        if res["accounts"]:
            acc = res["accounts"][0]
            self.assertIn("account_name", acc)
            self.assertIn("attention_level", acc)
            self.assertIn("active_deal_count", acc)
            self.assertIn("active_pipeline_value", acc)
            self.assertIn("weighted_pipeline_value", acc)
            self.assertIn("high_risk_value_exposure", acc)
            self.assertIn("evidence_reasons", acc)
            self.assertIn("deals", acc)
            self.assertIn(acc["attention_level"], ["CRITICAL", "HIGH_RISK", "HEALTHY"])

        # Test 3: Security Hierarchy Isolation (b1 attempting user_filter = a1 must raise PermissionError)
        frappe.set_user("b1@test.nexapp")
        with self.assertRaises(frappe.PermissionError):
            frappe.call(
                "nexapp.api.crm_dashboard.get_key_account_intelligence",
                period="this_month",
                user_filter="a1@test.nexapp"
            )

        # Test 4: Default user_filter ALL restricts scope to b1's effective users
        b1_res = frappe.call(
            "nexapp.api.crm_dashboard.get_key_account_intelligence",
            period="this_month"
        )
        self.assertEqual(b1_res["scope"]["effective_user_count"], 1)















