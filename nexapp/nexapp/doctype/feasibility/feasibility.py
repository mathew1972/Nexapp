import frappe
from frappe.model.document import Document

class Feasibility(Document):
    def before_validate(self):
        self.flags.ignore_mandatory = True

    def after_save(self):
        # 1) Check ISP Change Feasibility child table for LMS Requests
        lms_requested_cmrs = []
        if hasattr(self, "isp_change_feasibility") and self.isp_change_feasibility:
            for row in self.isp_change_feasibility:
                if row.lms_request_id and row.change_management_request_id:
                    try:
                        frappe.db.set_value("Change Management Request", row.change_management_request_id, "stage", "LMS Requested")
                        lms_requested_cmrs.append(row.change_management_request_id)
                    except Exception:
                        pass

        # 2) Default stage update for parent Change Management Request
        if self.change_management_request_id and self.change_management_request_id not in lms_requested_cmrs:
            try:
                current_stage = frappe.db.get_value("Change Management Request", self.change_management_request_id, "stage")
                if current_stage != "LMS Requested":
                    frappe.db.set_value("Change Management Request", self.change_management_request_id, "stage", "Feasibility Pending")
            except Exception:
                pass

    def before_save(self):
        sol_name = self.solution_name
        if not sol_name and self.solution_code:
            sol_name = frappe.db.get_value("Item", self.solution_code, "item_name")
        
        if sol_name:
            sol_name_upper = sol_name.upper()
            if "MBB" in sol_name_upper:
                self.solution_type = "MBB"
            elif "ILL" in sol_name_upper:
                self.solution_type = "ILL"
            else:
                self.solution_type = "SIM"
        else:
            self.solution_type = "SIM"

        p_plan = bool(self.primary_data_plan)
        s_plan = bool(self.secondary_data_plan)
        sol_name_upper = (self.solution_name or "").upper()
        
        if "MBB" in sol_name_upper and "LTE" in sol_name_upper:
            self.lms_type = "Single"
        elif "ILL" in sol_name_upper and "LTE" in sol_name_upper:
            self.lms_type = "Single"
        elif self.solution_type == "SIM":
            self.lms_type = "No LMS"
        elif p_plan and s_plan:
            self.lms_type = "Dual"
        elif p_plan and not s_plan:
            self.lms_type = "Single"
        elif not p_plan and s_plan:
            self.lms_type = "Single"
        else:
            self.lms_type = "No LMS"

        self.calculate_tat()

    def calculate_tat(self):
        # Calculate Feasibility TAT (Turnaround Time) and SLA Status
        from frappe.utils import now_datetime, time_diff_in_hours, add_days, getdate, today, date_diff

        # Align feasibility_created_date and tat_start_date with creation date
        if self.creation:
            self.feasibility_created_date = getdate(self.creation)
        elif not self.feasibility_created_date:
            self.feasibility_created_date = getdate(now_datetime())
        self.tat_start_date = self.feasibility_created_date

        # Determine solution_type based on solution_name if not already set
        sol_name = self.solution_name
        if not sol_name and self.solution_code:
            sol_name = frappe.db.get_value("Item", self.solution_code, "item_name")
        
        if sol_name:
            sol_name_upper = sol_name.upper()
            if "MBB" in sol_name_upper:
                self.solution_type = "MBB"
            elif "ILL" in sol_name_upper:
                self.solution_type = "ILL"
            else:
                self.solution_type = "SIM"
        else:
            self.solution_type = "SIM"

        # Fetch rules dynamically from TAT Master/Rule using the exact solution_type
        period_days, status_map = get_feasibility_tat_rules(self.solution_type)

        # Reset tracking only on brand-new document creation
        if self.is_new():
            self.hold_days = 0
            self.on_hold_since = None
            self.feasibility_completed_date = None
            self.feasibility_tat = 0.0

        # 1. Track Transitions for "On Hold" (or any status mapped to "Pause")
        doc_before = None
        try:
            doc_before = self.get_doc_before_save()
        except Exception:
            pass
        old_status = doc_before.feasibility_status if doc_before else None
        new_status = self.feasibility_status

        was_paused = status_map.get(old_status) == "Pause" if old_status else False
        is_paused = status_map.get(new_status) == "Pause"

        if is_paused and not was_paused:
            self.on_hold_since = now_datetime()
        elif was_paused and not is_paused:
            if self.on_hold_since:
                hours_on_hold = time_diff_in_hours(now_datetime(), self.on_hold_since)
                # Convert to integer days by standard rounding
                days_on_hold = int(round(hours_on_hold / 24.0))
                self.hold_days = (self.hold_days or 0) + days_on_hold
                self.on_hold_since = None

        # 2. Set Due Date (Creation Date + period_days + Hold Days) using calculate_tat_due_date
        creation = self.feasibility_created_date or self.creation or now_datetime()
        total_tat_days = period_days + (self.hold_days or 0)
        from nexapp.api import calculate_tat_due_date
        self.due_date = calculate_tat_due_date(creation, total_tat_days)

        # 3. Calculate Feasibility TAT, SLA Status, and TAT Status based on Action Map
        action = status_map.get(self.feasibility_status)

        if action == "Fulfilled":
            if not self.feasibility_completed_date:
                if not self.is_new() and self.creation and time_diff_in_hours(now_datetime(), self.creation) > 24:
                    historical_completion = None
                    try:
                        versions = frappe.get_all("Version", filters={"docname": self.name, "ref_doctype": "Feasibility"}, fields=["creation", "data"], order_by="creation asc", limit=0)
                        for v in versions:
                            try:
                                v_data = frappe.parse_json(v.data)
                                if isinstance(v_data, dict) and v_data.get("changed"):
                                    for change in v_data.get("changed"):
                                        if change and len(change) >= 3 and change[0] == "feasibility_status" and str(change[2]).strip() in ["Feasible", "High Commercials", "Not Feasible"]:
                                            historical_completion = v.creation
                                            break
                            except Exception:
                                pass
                            if historical_completion:
                                break
                    except Exception:
                        pass
                    self.feasibility_completed_date = historical_completion or self.modified or now_datetime()
                else:
                    self.feasibility_completed_date = now_datetime()
            
            hours = time_diff_in_hours(self.feasibility_completed_date, creation)
            total_days = hours / 24.0
            actual_tat = max(0.0, total_days - (self.hold_days or 0))
            self.feasibility_tat = round(actual_tat, 2)
            self.sla_status = "Completed"
            
            # Check if completed within due date
            if getdate(self.feasibility_completed_date) <= getdate(self.due_date):
                self.tat_status = "Fulfilled"
            else:
                self.tat_status = "Failed"
        else:
            if action == "Pause":
                self.sla_status = "Paused"
                self.tat_status = "Paused"
            else:
                self.feasibility_completed_date = None
                self.feasibility_tat = 0.0
                
                # Check against Due Date to determine initial sla_status
                current_date = getdate(today())
                target_due_date = getdate(self.due_date)
                diff_days = date_diff(target_due_date, current_date)
                
                if diff_days > 1:
                    self.sla_status = "Within TAT"
                    self.tat_status = "Resolution Due"
                elif diff_days >= 0:
                    self.sla_status = "Near Due"
                    self.tat_status = "Resolution Due"
                else:
                    self.sla_status = "Overdue"
                    self.tat_status = "Failed"

        # Calculate Remaining Days & Overdue Days fields for DB persistence
        current_date = getdate(today())
        target_due_date = getdate(self.due_date)

        self.overdue_days = 0
        if self.sla_status == "Completed":
            completed_date = getdate(self.feasibility_completed_date)
            diff_days = date_diff(target_due_date, completed_date)
            if diff_days >= 0:
                self.remaining_days = "Completed within TAT"
                self.overdue_days = 0
            else:
                self.remaining_days = f"Overdue by {abs(diff_days)} Day{'s' if abs(diff_days) > 1 else ''}"
                self.overdue_days = abs(diff_days)
        elif self.sla_status == "Paused":
            hold_start = getdate(self.on_hold_since or now_datetime())
            diff_days = date_diff(target_due_date, hold_start)
            if diff_days > 1:
                self.remaining_days = f"Paused ({diff_days} Days Left)"
            elif diff_days == 1:
                self.remaining_days = "Paused (1 Day Left)"
            elif diff_days == 0:
                self.remaining_days = "Paused (Due Today)"
            else:
                self.remaining_days = f"Paused (Overdue by {abs(diff_days)} Day{'s' if abs(diff_days) > 1 else ''})"
                self.overdue_days = abs(diff_days)
        else:
            diff_days = date_diff(target_due_date, current_date)
            if diff_days > 1:
                self.remaining_days = f"{diff_days} Days Left"
            elif diff_days == 1:
                self.remaining_days = "1 Day Left"
            elif diff_days == 0:
                self.remaining_days = "Due Today"
            else:
                self.remaining_days = f"Overdue by {abs(diff_days)} Day{'s' if abs(diff_days) > 1 else ''}"
                self.overdue_days = abs(diff_days)

@frappe.whitelist()
def add_lms_supplier(feasibility_name, row_names):
    return add_lms_suppliers(feasibility_name, row_names)

@frappe.whitelist()
def add_lms_suppliers(feasibility_name, row_names):
    import json
    row_names = json.loads(row_names)
    
    feasibility = frappe.get_doc("Feasibility", feasibility_name)

    selected_providers = []
    for provider in feasibility.lms_provider:
        if provider.name in row_names:
            selected_providers.append(provider)

    # Fallback for when JS passes temporary local row names (e.g. 'new-lms-provider-1')
    if not selected_providers:
        for provider in feasibility.lms_provider:
            if provider.feasibility_type == "New Supplier" and not provider.lms_request_id and provider.lms_supplier:
                selected_providers.append(provider)

    if not selected_providers:
        frappe.throw("Selected LMS Providers not found.")

    # Check if LMS Request already exists with circuit_id = feasibility.name
    lms_request = frappe.get_all(
        "LMS Request",
        filters={"circuit_id": feasibility.name},
        fields=["name"]
    )

    if lms_request:
        # Fetch existing LMS Request
        lms_request_doc = frappe.get_doc("LMS Request", lms_request[0].name)
    else:
        # Create new LMS Request
        lms_request_doc = frappe.new_doc("LMS Request")
        lms_request_doc.circuit_id = feasibility.name
        lms_request_doc.save(ignore_permissions=True)

    site_updated = False

    for selected_provider in selected_providers:
        # Append new child to LMS Request
        lms_request_doc.append("lms_fesible_suppliers", {
            "lms_feasibility_partner": selected_provider.lms_supplier,
            "supplier_name": selected_provider.supplier_contact,
            "bandwith_type": selected_provider.bandwith_type,
            "media": selected_provider.media,
            "support_mode": selected_provider.support_mode,
            "feasibility_type": selected_provider.feasibility_type,
            "email_id": selected_provider.email_id,
            "mobile": selected_provider.mobile,
            "static_ip": selected_provider.static_ip,
            "bandwidth": selected_provider.bandwidth,
            "lms_feasibility_status": selected_provider.lms_status,
            "billing_mode": selected_provider.billing_mode,
            "billing_terms": selected_provider.billing_terms,
            "validity": selected_provider.validity,
            "feasibility_mrc": selected_provider.mrc,
            "feasibility_otc": selected_provider.otc,
            "feasibility_arc": selected_provider.arc,
            "feasibility_static_ip_cost": selected_provider.static_ip_cost,
            "feasibility_security_deposit": selected_provider.security_deposit,
            "description": selected_provider.description,
        })



    lms_request_doc.save(ignore_permissions=True)

    # Update LMS Request ID in feasibility row
    for selected_provider in selected_providers:
        frappe.db.set_value(selected_provider.doctype, selected_provider.name, "lms_request_id", lms_request_doc.name)

    return {
        "lms_request": lms_request_doc.name,
        "site_updated": site_updated
    }

# --- START: New Supplier LMS Creation ---
@frappe.whitelist()
def create_single_lms_request(feasibility_name, provider_data):
    import json
    
    provider_data = json.loads(provider_data)

    # Check if LMS Request already exists with circuit_id = feasibility.name
    lms_request = frappe.get_all(
        "LMS Request",
        filters={"circuit_id": feasibility_name},
        fields=["name"]
    )

    if lms_request:
        lms_request_doc = frappe.get_doc("LMS Request", lms_request[0].name)
    else:
        lms_request_doc = frappe.new_doc("LMS Request")
        lms_request_doc.circuit_id = feasibility_name
        lms_request_doc.save(ignore_permissions=True)

    # Append new child to LMS Request
    lms_request_doc.append("lms_fesible_suppliers", {
        "lms_feasibility_partner": provider_data.get("lms_supplier"),
        "supplier_name": provider_data.get("supplier_contact"),
        "bandwith_type": provider_data.get("bandwith_type"),
        "media": provider_data.get("media"),
        "support_mode": provider_data.get("support_mode"),
        "feasibility_type": provider_data.get("feasibility_type"),
        "email_id": provider_data.get("email_id"),
        "mobile": provider_data.get("mobile"),
        "static_ip": provider_data.get("static_ip"),
        "bandwidth": provider_data.get("bandwidth"),
        "lms_feasibility_status": provider_data.get("lms_status"),
        "billing_mode": provider_data.get("billing_mode"),
        "billing_terms": provider_data.get("billing_terms"),
        "validity": provider_data.get("validity"),
        "feasibility_mrc": provider_data.get("mrc"),
        "feasibility_otc": provider_data.get("otc"),
        "feasibility_arc": provider_data.get("arc"),
        "feasibility_static_ip_cost": provider_data.get("static_ip_cost"),
        "feasibility_security_deposit": provider_data.get("security_deposit"),
        "description": provider_data.get("description"),
    })

    lms_request_doc.save(ignore_permissions=True)

    return {
        "lms_request": lms_request_doc.name
    }
# --- END: New Supplier LMS Creation ---

@frappe.whitelist()
def get_supplier_pool_by_pincode(pincode, circuit_id=None):
    sql = """
        SELECT 
            supplier,
            supplier_contact,
            suppliernumber,
            email_address,
            pin_code,
            po_number,
            circuit_id,
            city,
            bandwith_type,
            media,
            billing_mode,
            billing_terms
        FROM `tabLastmile Services Master`
        WHERE pin_code = %s AND lms_stage = 'Delivered'
    """
    results = frappe.db.sql(sql, (pincode,), as_dict=True)
    
    cleaned = []
    seen = set()
    suppliers_with_po = set()
    
    for r in results:
        supp_name = r.supplier or 'N/A'
        if supp_name in seen:
            continue
        
        
        circuit_val = r.circuit_id or 'N/A'
        b_type = r.bandwith_type or 'N/A'
        
        po_info = None
        if r.po_number:
            try:
                # Check if PO is cancelled, skip supplier entirely if true
                status_sql = "SELECT docstatus, status FROM `tabPurchase Order` WHERE name = %s"
                status_res = frappe.db.sql(status_sql, (r.po_number,), as_dict=True)
                if status_res and (status_res[0].docstatus == 2 or status_res[0].status == 'Cancelled'):
                    continue
                    
                po_sql = """
                    SELECT name, grand_total, currency, transaction_date 
                    FROM `tabPurchase Order` 
                    WHERE name = %s AND docstatus < 2 AND status != 'Cancelled'
                """
                po = frappe.db.sql(po_sql, (r.po_number,), as_dict=True)
                if po:
                    po_name = po[0].name
                    curr = po[0].currency or '₹'
                    if curr == 'INR':
                        curr = '₹'
                    total = po[0].grand_total or 0.0
                    date_str = po[0].transaction_date or ''
                    
                    items_query = """
                        SELECT item_code, item_name, rate
                        FROM `tabPurchase Order Item`
                        WHERE parent = %s
                    """
                    po_items_raw = frappe.db.sql(items_query, (po_name,), as_dict=True)
                    
                    formatted_items = []
                    for item in po_items_raw:
                        formatted_items.append({
                            "item_code": item.item_code,
                            "item_name": item.item_name or 'Item',
                            "rate": item.rate,
                            "rate_str": frappe.utils.fmt_money(item.rate, currency="INR")
                        })
                    
                    po_info = {
                        "po_name": po_name,
                        "circuit_id": str(circuit_val),
                        "grand_total": f"{curr} {total:,.2f}",
                        "po_date": str(date_str),
                        "items": formatted_items
                    }
                    suppliers_with_po.add(supp_name.lower())
            except Exception:
                po_info = None
                
        if r.supplier_contact:
            clean_contact = r.supplier_contact.split('-')[0].strip()
        else:
            clean_contact = ""
        
        cleaned.append({
            "supplier_name": supp_name,
            "contact_person": clean_contact,
            "phone": r.suppliernumber or 'N/A',
            "email_id": r.email_address or 'N/A',
            "city": r.city or 'N/A',
            "pincode": r.pin_code or pincode,
            "source": "LMS Master",
            "origin_site": str(circuit_val),
            "bandwith_type": b_type,
            "media": r.media or '',
            "billing_mode": r.billing_mode or '',
            "billing_terms": r.billing_terms or '',
            "latest_po": po_info
        })
        seen.add(supp_name)
        
    def get_sort_key(item):
        if item["latest_po"] and item["latest_po"]["po_date"]:
            return str(item["latest_po"]["po_date"])
        return "0000-00-00"
        
    cleaned.sort(key=get_sort_key, reverse=True)
    
    feas_suppliers = []
    if pincode:
        feas_docs = frappe.db.get_all("Feasibility", filters={"pincode": pincode}, fields=["name", "circuit_id", "feasibility_completed_date"])
        for f_doc in feas_docs:
            f_name = f_doc.name
            c_id = f_doc.circuit_id or f_name or 'N/A'
            comp_date = f_doc.get("feasibility_completed_date")
            lms_providers = frappe.db.get_all("LMS Feasibility", 
                filters={"parent": f_name, "parenttype": "Feasibility"},
                fields=["lms_supplier", "supplier_contact", "mobile", "email_id", "mrc", "otc", "otc_details", "static_ip_cost", "bandwidth_name", "bandwidth", "bandwith_type", "security_deposit", "feasibility_updated_date", "lms_status", "media", "billing_mode", "billing_terms"]
            )
            for p in lms_providers:
                supp_name = p.lms_supplier or 'N/A'
                if supp_name.lower() in suppliers_with_po or supp_name == 'N/A':
                    continue
                
                # Check if already added to feas_suppliers
                if any(x["supplier_name"].lower() == supp_name.lower() for x in feas_suppliers):
                    continue
                    
                c_person = ""
                if p.supplier_contact:
                    c_person = p.supplier_contact.split('-')[0].strip()
                    
                feas_suppliers.append({
                    "supplier_name": supp_name,
                    "contact_person": c_person,
                    "phone": p.mobile or 'N/A',
                    "email_id": p.email_id or 'N/A',
                    "mrc": p.mrc or 0.0,
                    "otc": p.otc or 0.0,
                    "otc_details": p.otc_details or 'N/A',
                    "static_ip_cost": p.static_ip_cost or 0.0,
                    "security_deposit": p.security_deposit or 0.0,
                    "origin_site": str(c_id),
                    "bandwidth_name": p.bandwidth_name or 'MRC',
                    "bandwidth": p.bandwidth or '',
                    "bandwith_type": p.bandwith_type or 'N/A',
                    "updated_date": str(p.feasibility_updated_date or comp_date or ''),
                    "lms_status": p.lms_status or 'N/A',
                    "media": p.media or '',
                    "billing_mode": p.billing_mode or '',
                    "billing_terms": p.billing_terms or ''
                })

    return {
        "isp_pool": cleaned,
        "feas_pool": feas_suppliers
    }


@frappe.whitelist()
def get_latest_po_reference(suppliers, pincode):
    import json
    if isinstance(suppliers, str):
        suppliers = json.loads(suppliers)
    
    if not suppliers or not pincode:
        return None

    format_strings = ','.join(['%s'] * len(suppliers))
    
    pos = []
    params_pin = tuple(suppliers) * 4 + (pincode,)
    params_fallback = tuple(suppliers) * 4
    
    try:
        po_sql = f"""
            SELECT name, transaction_date 
            FROM `tabPurchase Order` 
            WHERE (supplier IN ({format_strings}) OR supplier_name IN ({format_strings}) OR contact_person IN ({format_strings}) OR custom_supplier_email_id IN ({format_strings})) AND custom_pin_code = %s AND docstatus < 2 
            ORDER BY transaction_date DESC 
            LIMIT 1
        """
        pos = frappe.db.sql(po_sql, params_pin, as_dict=True)
    except Exception:
        pos = []
        
    if not pos:
        try:
            po_sql = f"""
                SELECT po.name, po.transaction_date 
                FROM `tabPurchase Order` po
                LEFT JOIN `tabSite` st ON st.name = po.custom_site_circuit_id
                WHERE (po.supplier IN ({format_strings}) OR po.supplier_name IN ({format_strings}) OR po.contact_person IN ({format_strings}) OR po.custom_supplier_email_id IN ({format_strings})) AND st.pincode = %s AND po.docstatus < 2 
                ORDER BY po.transaction_date DESC 
                LIMIT 1
            """
            pos = frappe.db.sql(po_sql, params_pin, as_dict=True)
        except Exception:
            pos = []
            
    if not pos:
        try:
            po_sql = f"""
                SELECT name, transaction_date 
                FROM `tabPurchase Order` 
                WHERE (supplier IN ({format_strings}) OR supplier_name IN ({format_strings}) OR contact_person IN ({format_strings}) OR custom_supplier_email_id IN ({format_strings})) AND docstatus < 2 
                ORDER BY transaction_date DESC 
                LIMIT 1
            """
            pos = frappe.db.sql(po_sql, params_fallback, as_dict=True)
        except Exception:
            pos = []
        
    if not pos:
        return None

    po_name = pos[0].name
    po_date = pos[0].transaction_date or ''

    items_sql = """
        SELECT item_name, item_code, rate 
        FROM `tabPurchase Order Item` 
        WHERE parent = %s
    """
    items = frappe.db.sql(items_sql, (po_name,), as_dict=True)

    return {
        "po_name": po_name,
        "transaction_date": str(po_date),
        "items": items
    }


def ensure_default_tat_master():
    # Check if there is an active TAT Master for "Feasibility"
    doc_name = "Feasibility TAT"
    if frappe.db.exists("TAT Master", doc_name):
        return
    
    doc = frappe.new_doc("TAT Master")
    doc.name = doc_name
    doc.tat_name = doc_name
    doc.tat_process = "Feasibility"
    doc.is_active = 1
    
    rules = [
        # ILL (7 days)
        {"solution_type": "ILL", "tat_period": 7, "status": "Feasible", "tat_action": "Fulfilled"},
        {"solution_type": "ILL", "tat_period": 7, "status": "High Commercials", "tat_action": "Fulfilled"},
        {"solution_type": "ILL", "tat_period": 7, "status": "Not Feasible", "tat_action": "Fulfilled"},
        {"solution_type": "ILL", "tat_period": 7, "status": "On Hold", "tat_action": "Pause"},
        # MBB (3 days)
        {"solution_type": "MBB", "tat_period": 3, "status": "Feasible", "tat_action": "Fulfilled"},
        {"solution_type": "MBB", "tat_period": 3, "status": "High Commercials", "tat_action": "Fulfilled"},
        {"solution_type": "MBB", "tat_period": 3, "status": "Not Feasible", "tat_action": "Fulfilled"},
        {"solution_type": "MBB", "tat_period": 3, "status": "On Hold", "tat_action": "Pause"},
        # SIM (1 day)
        {"solution_type": "SIM", "tat_period": 1, "status": "Feasible", "tat_action": "Fulfilled"},
        {"solution_type": "SIM", "tat_period": 1, "status": "High Commercials", "tat_action": "Fulfilled"},
        {"solution_type": "SIM", "tat_period": 1, "status": "Not Feasible", "tat_action": "Fulfilled"},
        {"solution_type": "SIM", "tat_period": 1, "status": "On Hold", "tat_action": "Pause"}
    ]
    
    for r in rules:
        doc.append("tat_rules", r)
        
    doc.insert(ignore_permissions=True)
    frappe.db.commit()


def get_feasibility_tat_rules(solution_type):
    # Ensure default master data exists
    ensure_default_tat_master()
    
    tat_master = frappe.db.get_value("TAT Master", {"tat_process": "Feasibility", "is_active": 1}, "name")
    if not tat_master:
        return 2, {} # Fallback to 2 days default
        
    rules = frappe.get_all("TAT Rule", filters={"parent": tat_master}, fields=["solution_type", "tat_period", "status", "tat_action"], ignore_permissions=True)
    
    # Filter rules for the current solution type (exact case-insensitive match)
    solution_rules = []
    if solution_type:
        for r in rules:
            if r.solution_type and r.solution_type.lower() == str(solution_type).lower():
                solution_rules.append(r)
                
    if not solution_rules:
        # Fallback to 2 days default with standard mapping
        return 2, {
            "Feasible": "Fulfilled",
            "High Commercials": "Fulfilled",
            "Not Feasible": "Fulfilled",
            "On Hold": "Pause"
        }
        
    # Standard period is the period defined in the rules for this solution
    period = solution_rules[0].tat_period
    
    # Map action for each status
    status_map = {r.status: r.tat_action for r in solution_rules}
    
    return period, status_map


@frappe.whitelist()
def get_tat_settings(solution_name=None, solution_code=None):
    try:
        with open("/home/mathew/frappe-bench/apps/nexapp/nexapp/nexapp/doctype/feasibility/log.txt", "a") as f:
            f.write(f"Called with name: {solution_name}, code: {solution_code}\n")
    except Exception:
        pass
    if not solution_name and solution_code:
        solution_name = frappe.db.get_value("Item", solution_code, "item_name")
    
    # Determine the solution_type from solution_name
    solution_type = "SIM"
    if solution_name:
        sol_name_upper = solution_name.upper()
        if "MBB" in sol_name_upper:
            solution_type = "MBB"
        elif "ILL" in sol_name_upper:
            solution_type = "ILL"

    period, status_map = get_feasibility_tat_rules(solution_type)
    try:
        with open("/home/mathew/frappe-bench/apps/nexapp/nexapp/nexapp/doctype/feasibility/log.txt", "a") as f:
            f.write(f"Returned period: {period}\n")
    except Exception:
        pass
    return {
        "period_days": period,
        "status_map": status_map
    }


@frappe.whitelist()
def check_and_update_tat(docname):
    doc = frappe.get_doc("Feasibility", docname)
    old_due_date = doc.due_date
    old_sla_status = doc.sla_status
    old_tat_status = doc.tat_status
    old_feasibility_tat = doc.feasibility_tat
    old_hold_days = doc.hold_days
    old_created = doc.feasibility_created_date
    old_tat_start_date = doc.tat_start_date
    old_remaining_days = doc.remaining_days
    old_overdue_days = doc.overdue_days
    old_completed_date = doc.feasibility_completed_date

    doc.calculate_tat()

    if (doc.due_date != old_due_date or
        doc.sla_status != old_sla_status or
        doc.tat_status != old_tat_status or
        doc.feasibility_tat != old_feasibility_tat or
        doc.hold_days != old_hold_days or
        doc.feasibility_created_date != old_created or
        doc.tat_start_date != old_tat_start_date or
        doc.remaining_days != old_remaining_days or
        doc.feasibility_completed_date != old_completed_date or
        doc.overdue_days != old_overdue_days):
        
        doc.db_set("due_date", doc.due_date)
        doc.db_set("sla_status", doc.sla_status)
        doc.db_set("tat_status", doc.tat_status)
        doc.db_set("feasibility_tat", doc.feasibility_tat)
        doc.db_set("hold_days", doc.hold_days)
        doc.db_set("feasibility_created_date", doc.feasibility_created_date)
        doc.db_set("tat_start_date", doc.tat_start_date)
        doc.db_set("remaining_days", doc.remaining_days)
        doc.db_set("overdue_days", doc.overdue_days)
        doc.db_set("feasibility_completed_date", doc.feasibility_completed_date)
        return {"updated": True}
    return {"updated": False}

