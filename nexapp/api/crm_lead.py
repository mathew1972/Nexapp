# Nexapp CRM Lead Metadata & Dynamic Intelligence Engine
# 0% Core Modifications — Strictly inside Nexapp

import json
from datetime import datetime
import frappe
from frappe.utils import get_datetime, now_datetime, time_diff_in_hours, time_diff_in_seconds

@frappe.whitelist()
def get_metadata(doctype="CRM Lead"):
    """
    Returns effective metadata, dynamic layout sections, available statuses, and currency settings for CRM Lead.
    """
    meta = frappe.get_meta(doctype)
    
    # 1. Effective DocFields incorporating Property Setters and Custom Fields
    docfields = []
    for f in meta.fields:
        docfields.append({
            "fieldname": f.fieldname,
            "label": f.label or f.fieldname,
            "fieldtype": f.fieldtype,
            "options": f.options,
            "reqd": f.reqd or 0,
            "hidden": f.hidden or 0,
            "read_only": f.read_only or 0,
            "default": f.default,
            "depends_on": f.depends_on,
            "is_custom_field": 1 if f.get("is_custom_field") else 0,
            "idx": f.idx
        })
        
    # 2. Child Table Metadata
    child_meta = {}
    for f in meta.fields:
        if f.fieldtype == "Table" and f.options:
            c_meta = frappe.get_meta(f.options)
            child_meta[f.options] = [
                {
                    "fieldname": cf.fieldname,
                    "label": cf.label or cf.fieldname,
                    "fieldtype": cf.fieldtype,
                    "options": cf.options,
                    "hidden": cf.hidden or 0
                }
                for cf in c_meta.fields if not cf.hidden and cf.fieldtype not in ("Section Break", "Column Break", "Tab Break")
            ]

    # 3. Derive Sections from CRM Fields Layout + DocType Section Breaks
    sections = []
    seen_fields = set()
    
    # Try CRM Fields Layout first
    layout_name = f"{doctype}-Data Fields"
    if not frappe.db.exists("CRM Fields Layout", layout_name):
        layout_name = f"{doctype}-Side Panel"
        
    if frappe.db.exists("CRM Fields Layout", layout_name):
        layout_doc = frappe.get_doc("CRM Fields Layout", layout_name)
        try:
            layout_json = json.loads(layout_doc.layout)
            for sec in layout_json:
                sec_label = sec.get("label") or sec.get("name", "").replace("_", " ").title()
                sec_fields = []
                for col in sec.get("columns", []):
                    for fname in col.get("fields", []):
                        if fname not in seen_fields:
                            sec_fields.append(fname)
                            seen_fields.add(fname)
                if sec_fields:
                    sections.append({
                        "label": sec_label,
                        "fields": sec_fields
                    })
        except Exception as e:
            frappe.log_error(f"Error parsing CRM Fields Layout: {e}")

    # Fallback / Addition from DocType Section Breaks for unassigned fields
    current_sec_label = "General Information"
    current_sec_fields = []
    
    for f in meta.fields:
        if f.fieldtype == "Section Break":
            if current_sec_fields:
                unassigned = [fn for fn in current_sec_fields if fn not in seen_fields]
                if unassigned:
                    sections.append({"label": current_sec_label, "fields": unassigned})
                    seen_fields.update(unassigned)
            current_sec_label = f.label or "Additional Information"
            current_sec_fields = []
        elif f.fieldtype not in ("Tab Break", "Column Break"):
            if f.fieldname and not f.hidden:
                current_sec_fields.append(f.fieldname)
                
    if current_sec_fields:
        unassigned = [fn for fn in current_sec_fields if fn not in seen_fields]
        if unassigned:
            sections.append({"label": current_sec_label, "fields": unassigned})
            seen_fields.update(unassigned)

    # 4. CRM Lead Statuses from Database
    db_statuses = frappe.get_all("CRM Lead Status", fields=["name", "lead_status", "type", "color", "position"], order_by="position asc")
    
    # 5. Global Currency
    currency = frappe.db.get_single_value("Global Defaults", "default_currency") or "USD"
    
    return {
        "doctype": doctype,
        "fields": docfields,
        "child_meta": child_meta,
        "sections": sections,
        "statuses": db_statuses,
        "currency": currency
    }


@frappe.whitelist()
def check_duplicates(lead_name, email=None, mobile_no=None, phone=None, organization=None):
    """
    Queries CRM Lead database for potential duplicate records based on email, mobile, phone, or organization.
    Returns structured matches with matching field signals.
    """
    if not lead_name:
        return {"status": "ERROR", "duplicates": []}
        
    lead = None
    if frappe.db.exists("CRM Lead", lead_name):
        lead = frappe.get_doc("CRM Lead", lead_name)
        if not email: email = lead.email
        if not mobile_no: mobile_no = lead.mobile_no
        if not phone: phone = getattr(lead, "phone", None)
        if not organization: organization = lead.organization

    or_filters = []
    if email and str(email).strip():
        or_filters.append(["email", "=", str(email).strip()])
    if mobile_no and str(mobile_no).strip():
        or_filters.append(["mobile_no", "=", str(mobile_no).strip()])
    if phone and str(phone).strip():
        or_filters.append(["phone", "=", str(phone).strip()])
    if organization and str(organization).strip():
        or_filters.append(["organization", "=", str(organization).strip()])
        
    if not or_filters:
        return {"status": "NO POTENTIAL DUPLICATES", "count": 0, "duplicates": []}
        
    matches = frappe.get_all(
        "CRM Lead",
        filters=[["name", "!=", lead_name]],
        or_filters=or_filters,
        fields=["name", "lead_name", "email", "mobile_no", "organization", "status"],
        limit=10
    )
    
    enriched_matches = []
    for m in matches:
        signals = []
        if email and m.get("email") and str(m.get("email")).lower().strip() == str(email).lower().strip():
            signals.append("Email")
        if mobile_no and m.get("mobile_no") and str(m.get("mobile_no")).strip() == str(mobile_no).strip():
            signals.append("Mobile")
        if organization and m.get("organization") and str(m.get("organization")).lower().strip() == str(organization).lower().strip():
            signals.append("Organization")
            
        m["match_signals"] = signals
        enriched_matches.append(m)

    if enriched_matches:
        return {
            "status": "POTENTIAL DUPLICATES FOUND",
            "count": len(enriched_matches),
            "duplicates": enriched_matches
        }
    else:
        return {
            "status": "NO POTENTIAL DUPLICATES",
            "count": 0,
            "duplicates": []
        }


@frappe.whitelist()
def get_lead_intelligence(lead_name):
    """
    Deterministically evaluates Lead Score, Engagement Score, Next Best Action, SLA status,
    and Recommended Next Status based on real database records.
    Permission-checked: Enforces standard read permissions.
    """
    if not frappe.has_permission("CRM Lead", "read", doc=lead_name):
        frappe.throw("Insufficient Permission", frappe.PermissionError)

    if not frappe.db.exists("CRM Lead", lead_name):
        frappe.throw(f"CRM Lead {lead_name} does not exist", frappe.DoesNotExistError)

    doc = frappe.get_doc("CRM Lead", lead_name)
    now = now_datetime()

    # --- 1. COLLECT REAL ACTIVITIES & COMMUNICATIONS ---
    comments = frappe.get_all("Comment", filters={"reference_doctype": "CRM Lead", "reference_name": lead_name}, fields=["name", "creation", "owner", "content"])
    comms = frappe.get_all("Communication", filters={"reference_doctype": "CRM Lead", "reference_name": lead_name}, fields=["name", "creation", "communication_type", "communication_medium", "sender"])
    versions = frappe.get_all("Version", filters={"ref_doctype": "CRM Lead", "docname": lead_name}, fields=["name", "creation", "owner"])

    tasks = []
    if frappe.db.exists("DocType", "CRM Task"):
        meta_task = frappe.get_meta("CRM Task")
        tfnames = [f.fieldname for f in meta_task.fields]
        tfilter = {"reference_name": lead_name} if "reference_name" in tfnames else ({"lead": lead_name} if "lead" in tfnames else {})
        if tfilter:
            tasks = frappe.get_all("CRM Task", filters=tfilter, fields=["name", "title", "status", "due_date", "creation"])

    calls = []
    if frappe.db.exists("DocType", "CRM Call Log"):
        meta_call = frappe.get_meta("CRM Call Log")
        cfnames = [f.fieldname for f in meta_call.fields]
        cfilter = {"reference_name": lead_name} if "reference_name" in cfnames else ({"lead": lead_name} if "lead" in cfnames else {})
        if cfilter:
            calls = frappe.get_all("CRM Call Log", filters=cfilter, fields=["name", "creation", "duration"])

    all_dates = []
    for items in [comments, comms, versions, tasks, calls]:
        for item in items:
            if item.get("creation"):
                all_dates.append(get_datetime(item.get("creation")))

    last_activity_date = max(all_dates) if all_dates else get_datetime(doc.creation)
    days_since_activity = max(0, (now - last_activity_date).days)
    hours_since_activity = max(0, int(time_diff_in_hours(now, last_activity_date)))

    # --- 2. LEAD SCORE CALCULATION (MAX 100) ---
    # Transparent weights based on verified profile & interaction completeness
    score = 0
    strong_signals = []
    weak_signals = []

    # Profile & Contactability (Max 45)
    if doc.email:
        score += 15
        strong_signals.append("Valid business email provided")
    else:
        weak_signals.append("Missing email address")

    if doc.mobile_no or getattr(doc, "phone", None):
        score += 10
        strong_signals.append("Direct phone/mobile contact provided")
    else:
        weak_signals.append("Missing phone/mobile number")

    if doc.organization:
        score += 10
        strong_signals.append("Organization specified")
    else:
        weak_signals.append("No organization details")

    if doc.job_title:
        score += 10
        strong_signals.append(f"Position title recorded ({doc.job_title})")
    else:
        weak_signals.append("No job title specified")

    # Commercial Scope & Scale (Max 25)
    if doc.annual_revenue and float(doc.annual_revenue) > 0:
        score += 15
        strong_signals.append("Annual revenue figures specified")
    if doc.no_of_employees:
        score += 10
        strong_signals.append(f"Company size specified ({doc.no_of_employees})")

    # Engagement & Lifecycle Recency (Max 30)
    total_interactions = len(comments) + len(comms) + len(tasks) + len(calls)
    if total_interactions >= 5:
        score += 20
        strong_signals.append(f"High engagement history ({total_interactions} interactions)")
    elif total_interactions > 0:
        score += 10
        strong_signals.append(f"Active engagement history ({total_interactions} interactions)")
    else:
        weak_signals.append("No engagement records logged yet")

    if days_since_activity <= 3:
        score += 10
        strong_signals.append("Recent interaction within last 3 days")
    elif days_since_activity > 14:
        weak_signals.append(f"Inactive for {days_since_activity} days")

    score = min(100, score)

    # --- 3. ENGAGEMENT INDICATOR CALCULATION ---
    if total_interactions == 0:
        engagement_pct = 0
        engagement_label = "Insufficient activity"
        engagement_status = "Inactive"
    else:
        # Base engagement calculation decaying over time without activity
        base_eng = min(100, total_interactions * 15)
        recency_penalty = min(80, days_since_activity * 4)
        engagement_pct = max(10, base_eng - recency_penalty)
        if days_since_activity <= 2:
            engagement_status = "Highly Active"
        elif days_since_activity <= 7:
            engagement_status = "Active"
        elif days_since_activity <= 14:
            engagement_status = "Moderate"
        else:
            engagement_status = "Cold"
            
        engagement_label = f"{engagement_status} • Last activity {days_since_activity} days ago"

    # --- 4. NEXAI NEXT BEST ACTION DETERMINATION ---
    current_status = doc.status or "New"
    open_tasks = [t for t in tasks if t.get("status") in ["Open", "Pending"]]
    
    action = ""
    reason = ""
    evidence = []
    confidence = "High"
    rec_type = ""

    if current_status in ["Converted", "Qualified"]:
        action = "Review Deal Pipeline Progress"
        reason = f"Lead is in {current_status} state."
        evidence = [f"Lead status: {current_status}", f"Total activities logged: {total_interactions}"]
        rec_type = "review"
    elif open_tasks:
        t_next = open_tasks[0]
        action = f"Complete Pending Task: {t_next.get('title')}"
        reason = "There is an open follow-up task assigned for this lead."
        evidence = [f"Task: {t_next.get('title')}", f"Status: {t_next.get('status')}"]
        rec_type = "task"
    elif days_since_activity >= 5:
        action = f"Initiate Re-engagement Follow-up with {doc.lead_name or doc.name}"
        reason = f"No activity recorded for {days_since_activity} days."
        evidence = [f"Last interaction: {days_since_activity} days ago", f"Current Status: {current_status}"]
        rec_type = "call"
    elif current_status == "New" and (doc.email or doc.mobile_no):
        action = f"Qualify Initial Interest for {doc.lead_name or doc.name}"
        reason = "Lead is newly created with verified contact details."
        evidence = [f"Contact info verified: {doc.email or doc.mobile_no}", "Status: New"]
        rec_type = "email"
    else:
        action = f"Schedule Next Touchpoint with {doc.lead_name or doc.name}"
        reason = "Maintain momentum with key stakeholder."
        evidence = [f"Current Status: {current_status}", f"Total interactions: {total_interactions}"]
        rec_type = "email"

    # --- 5. SLA INTELLIGENCE ---
    sla_info = {
        "status": doc.sla_status or ("ON TRACK" if doc.sla else "NOT APPLICABLE"),
        "response_by": str(doc.response_by) if doc.response_by else None,
        "detail": "No active SLA response constraint set"
    }

    if doc.response_by:
        resp_dt = get_datetime(doc.response_by)
        secs_remaining = time_diff_in_seconds(resp_dt, now)
        if secs_remaining < 0:
            sla_info["status"] = "OVERDUE"
            sla_info["detail"] = f"Response overdue by {abs(int(secs_remaining // 3600))} hours"
        elif secs_remaining <= 7200:
            sla_info["status"] = "AT RISK"
            sla_info["detail"] = f"Response due in {int(secs_remaining // 60)} minutes"
        else:
            sla_info["status"] = "ON TRACK"
            sla_info["detail"] = f"Response due: {resp_dt.strftime('%b %d, %I:%M %p')}"

    # --- 6. LEAD JOURNEY RECOMMENDATION ---
    db_statuses = frappe.get_all("CRM Lead Status", fields=["name", "position", "type"], order_by="position asc")
    status_names = [s.name for s in db_statuses]
    
    rec_status = current_status
    status_why = "Lead is progressing normally."
    
    if current_status == "New" and total_interactions > 0:
        rec_status = "Contacted"
        status_why = "Interaction history exists; lead has been contacted."
    elif current_status == "Contacted" and total_interactions >= 3:
        rec_status = "Nurture"
        status_why = "Multiple interactions completed; active nurturing recommended."
    elif current_status == "Nurture" and doc.organization and doc.annual_revenue:
        rec_status = "Qualified"
        status_why = "Commercial profile criteria met for qualification."

    return {
        "lead_name": lead_name,
        "lead_score": {
            "score": score,
            "max": 100,
            "strong_signals": strong_signals,
            "weak_signals": weak_signals
        },
        "engagement": {
            "percentage": engagement_pct,
            "status": engagement_status,
            "label": engagement_label,
            "days_since_activity": days_since_activity,
            "total_interactions": total_interactions
        },
        "next_best_action": {
            "action": action,
            "reason": reason,
            "evidence": evidence,
            "confidence": confidence,
            "type": rec_type
        },
        "sla": sla_info,
        "recommended_status": {
            "target": rec_status,
            "why": status_why,
            "current": current_status
        },
        "duplicate_check": check_duplicates(lead_name)
    }
