import frappe
from frappe.utils import now_datetime, getdate, date_diff, time_diff_in_seconds

def on_deal_created(doc, method=None):
    """
    Hook executed after a CRM Deal is inserted (after_insert).
    Creates exactly ONE 'CREATED' event representing deal creation.
    """
    if not doc.name:
        return

    now_ts = now_datetime()
    changed_by = frappe.session.user if frappe.session and frappe.session.user else (doc.owner or "Administrator")
    deal_owner = doc.deal_owner or doc.owner or "Administrator"

    event = frappe.get_doc({
        "doctype": "CRM Deal Event",
        "deal": doc.name,
        "deal_owner": deal_owner,
        "event_type": "CREATED",
        "field_name": "",
        "old_value": "",
        "new_value": str(doc.status or ""),
        "numeric_old_value": 0.0,
        "numeric_new_value": float(doc.deal_value or 0.0),
        "event_timestamp": now_ts,
        "changed_by": changed_by,
    })
    event.insert(ignore_permissions=True)


def on_deal_before_save(doc, method=None):
    """
    Hook executed before a CRM Deal is updated/saved (before_save).
    Detects changes to status, expected_closure_date, probability, deal_value, deal_owner.
    Creates separate event records for each changed field within the same transaction.
    """
    if doc.is_new() or not frappe.db.exists("CRM Deal", doc.name):
        return

    # Retrieve previous field state from doc._doc_before_save or db
    prev_doc = getattr(doc, "_doc_before_save", None)
    if prev_doc:
        old_status = prev_doc.status
        old_close_date = prev_doc.expected_closure_date
        old_prob = prev_doc.probability
        old_val = prev_doc.deal_value
        old_owner = prev_doc.deal_owner
    else:
        db_vals = frappe.db.get_value(
            "CRM Deal",
            doc.name,
            ["status", "expected_closure_date", "probability", "deal_value", "deal_owner"],
            as_dict=True
        ) or {}
        old_status = db_vals.get("status")
        old_close_date = db_vals.get("expected_closure_date")
        old_prob = db_vals.get("probability")
        old_val = db_vals.get("deal_value")
        old_owner = db_vals.get("deal_owner")

    now_ts = now_datetime()
    changed_by = frappe.session.user if frappe.session and frappe.session.user else (doc.owner or "Administrator")
    current_deal_owner = doc.deal_owner or old_owner or doc.owner or "Administrator"

    # --- 1. STAGE_CHANGED ---
    new_status = doc.status
    if new_status and old_status != new_status:
        dwell_days = _calculate_stage_dwell_days(doc.name, now_ts)
        event_dict = {
            "doctype": "CRM Deal Event",
            "deal": doc.name,
            "deal_owner": current_deal_owner,
            "event_type": "STAGE_CHANGED",
            "field_name": "status",
            "old_value": str(old_status or ""),
            "new_value": str(new_status or ""),
            "event_timestamp": now_ts,
            "changed_by": changed_by,
        }
        if dwell_days is not None:
            event_dict["dwell_days"] = dwell_days
        event = frappe.get_doc(event_dict)
        event.insert(ignore_permissions=True)

    # --- 2. CLOSE_DATE_CHANGED ---
    new_close_date = doc.expected_closure_date
    if old_close_date != new_close_date:
        days_pushed = _calculate_days_pushed(old_close_date, new_close_date)
        if days_pushed is not None and days_pushed != 0:
            event = frappe.get_doc({
                "doctype": "CRM Deal Event",
                "deal": doc.name,
                "deal_owner": current_deal_owner,
                "event_type": "CLOSE_DATE_CHANGED",
                "field_name": "expected_closure_date",
                "old_value": str(old_close_date) if old_close_date else "",
                "new_value": str(new_close_date) if new_close_date else "",
                "days_pushed": days_pushed,
                "event_timestamp": now_ts,
                "changed_by": changed_by,
            })
            event.insert(ignore_permissions=True)

    # --- 3. PROBABILITY_CHANGED ---
    old_prob_float = float(old_prob or 0.0)
    new_prob_float = float(doc.probability or 0.0)
    if old_prob is not None and old_prob_float != new_prob_float:
        event = frappe.get_doc({
            "doctype": "CRM Deal Event",
            "deal": doc.name,
            "deal_owner": current_deal_owner,
            "event_type": "PROBABILITY_CHANGED",
            "field_name": "probability",
            "old_value": str(old_prob_float),
            "new_value": str(new_prob_float),
            "numeric_old_value": old_prob_float,
            "numeric_new_value": new_prob_float,
            "event_timestamp": now_ts,
            "changed_by": changed_by,
        })
        event.insert(ignore_permissions=True)

    # --- 4. VALUE_CHANGED ---
    old_val_float = float(old_val or 0.0)
    new_val_float = float(doc.deal_value or 0.0)
    if old_val is not None and old_val_float != new_val_float:
        event = frappe.get_doc({
            "doctype": "CRM Deal Event",
            "deal": doc.name,
            "deal_owner": current_deal_owner,
            "event_type": "VALUE_CHANGED",
            "field_name": "deal_value",
            "old_value": str(old_val_float),
            "new_value": str(new_val_float),
            "numeric_old_value": old_val_float,
            "numeric_new_value": new_val_float,
            "event_timestamp": now_ts,
            "changed_by": changed_by,
        })
        event.insert(ignore_permissions=True)

    # --- 5. OWNER_CHANGED ---
    old_owner_str = str(old_owner or "")
    new_owner_str = str(doc.deal_owner or "")
    if new_owner_str and old_owner_str != new_owner_str:
        event = frappe.get_doc({
            "doctype": "CRM Deal Event",
            "deal": doc.name,
            "deal_owner": new_owner_str,  # Use new owner for event's deal_owner scope
            "event_type": "OWNER_CHANGED",
            "field_name": "deal_owner",
            "old_value": old_owner_str,
            "new_value": new_owner_str,
            "event_timestamp": now_ts,
            "changed_by": changed_by,
        })
        event.insert(ignore_permissions=True)


def _calculate_stage_dwell_days(deal_name, current_ts):
    """
    Fetch previous STAGE_CHANGED event timestamp for this deal.
    If none exists, returns None (no fabricated baseline).
    If previous STAGE_CHANGED exists, returns fractional days elapsed.
    """
    last_event_ts = frappe.db.get_value(
        "CRM Deal Event",
        {"deal": deal_name, "event_type": "STAGE_CHANGED"},
        "event_timestamp",
        order_by="event_timestamp desc",
    )

    if not last_event_ts:
        return None

    seconds_elapsed = time_diff_in_seconds(current_ts, last_event_ts)
    return round(seconds_elapsed / 86400.0, 2)


def _calculate_days_pushed(old_date, new_date):
    """
    Calculate date diff between old_date and new_date.
    If either date is NULL/None, returns None or days difference if valid.
    """
    if not old_date or not new_date:
        return None

    try:
        d_old = getdate(old_date)
        d_new = getdate(new_date)
        return date_diff(d_new, d_old)
    except Exception:
        return None
