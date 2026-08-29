import frappe
import json
from frappe.utils import getdate, date_diff, time_diff_in_seconds

TRACKED_FIELDS = {"status", "expected_closure_date", "probability", "deal_value", "deal_owner"}

def audit_version_history():
    """
    Dry-run / Audit function for V11-B Step 3.
    Scans Version history and existing CRM Deal Event records without writing to the database.
    """
    return backfill_crm_deal_events(dry_run=True)


def backfill_crm_deal_events(dry_run=True):
    """
    Reconstructs historical CRM Deal Events from tabVersion records.
    Strictly safe: No fake timestamps, no artificial baseline generation.
    Supports dry-run mode.
    """
    summary = {
        "dry_run": dry_run,
        "total_deals_examined": 0,
        "total_versions_examined": 0,
        "events_reconstructable": {
            "CREATED": 0,
            "STAGE_CHANGED": 0,
            "CLOSE_DATE_CHANGED": 0,
            "PROBABILITY_CHANGED": 0,
            "VALUE_CHANGED": 0,
            "OWNER_CHANGED": 0,
        },
        "skipped_existing_events": 0,
        "unreconstructable_events": [],
        "suspicious_records": [],
        "planned_insertions": []
    }

    deals = frappe.get_all("CRM Deal", fields=["name", "creation", "owner", "deal_owner", "status", "deal_value"])
    summary["total_deals_examined"] = len(deals)

    for deal in deals:
        versions = frappe.get_all(
            "Version",
            filters={"ref_doctype": "CRM Deal", "docname": deal.name},
            fields=["name", "owner", "creation", "data"],
            order_by="creation asc"
        )
        summary["total_versions_examined"] += len(versions)

        for v in versions:
            if not v.data:
                continue
            try:
                v_data = json.loads(v.data)
            except Exception as e:
                summary["suspicious_records"].append({"version": v.name, "deal": deal.name, "reason": f"Invalid JSON: {str(e)}"})
                continue

            changed = v_data.get("changed", [])
            for change in changed:
                if len(change) < 3:
                    continue
                field_name, old_val, new_val = change[0], change[1], change[2]
                if field_name not in TRACKED_FIELDS:
                    continue

                event_type = _map_field_to_event_type(field_name)
                if not event_type:
                    continue

                v_user = v_data.get("user") or v.owner or "Administrator"
                event_dict = {
                    "doctype": "CRM Deal Event",
                    "deal": deal.name,
                    "deal_owner": deal.deal_owner or deal.owner or "Administrator",
                    "event_type": event_type,
                    "field_name": field_name,
                    "old_value": str(old_val if old_val is not None else ""),
                    "new_value": str(new_val if new_val is not None else ""),
                    "event_timestamp": v.creation,
                    "changed_by": v_user
                }

                # Detailed field-specific calculations
                if event_type == "STAGE_CHANGED":
                    dwell_days = _calculate_historical_dwell_days(deal.name, v.creation)
                    if dwell_days is not None:
                        event_dict["dwell_days"] = dwell_days

                elif event_type == "CLOSE_DATE_CHANGED":
                    days_pushed = _calculate_days_pushed(old_val, new_val)
                    if days_pushed is not None and days_pushed != 0:
                        event_dict["days_pushed"] = days_pushed
                    else:
                        continue  # Skip 0 days push or invalid date change

                elif event_type == "PROBABILITY_CHANGED":
                    try:
                        event_dict["numeric_old_value"] = float(old_val or 0.0)
                        event_dict["numeric_new_value"] = float(new_val or 0.0)
                    except ValueError:
                        pass

                elif event_type == "VALUE_CHANGED":
                    try:
                        event_dict["numeric_old_value"] = float(old_val or 0.0)
                        event_dict["numeric_new_value"] = float(new_val or 0.0)
                    except ValueError:
                        pass

                elif event_type == "OWNER_CHANGED":
                    event_dict["deal_owner"] = str(new_val or event_dict["deal_owner"])

                # Check for existing event (Idempotency)
                if _event_already_exists(event_dict):
                    summary["skipped_existing_events"] += 1
                    continue

                summary["events_reconstructable"][event_type] += 1
                summary["planned_insertions"].append(event_dict)

                if not dry_run:
                    doc = frappe.get_doc(event_dict)
                    doc.insert(ignore_permissions=True)

    if not dry_run:
        frappe.db.commit()

    return summary


def _map_field_to_event_type(field_name):
    mapping = {
        "status": "STAGE_CHANGED",
        "expected_closure_date": "CLOSE_DATE_CHANGED",
        "probability": "PROBABILITY_CHANGED",
        "deal_value": "VALUE_CHANGED",
        "deal_owner": "OWNER_CHANGED",
    }
    return mapping.get(field_name)


def _calculate_historical_dwell_days(deal_name, current_ts):
    last_ts = frappe.db.get_value(
        "CRM Deal Event",
        {"deal": deal_name, "event_type": "STAGE_CHANGED", "event_timestamp": ["<", current_ts]},
        "event_timestamp",
        order_by="event_timestamp desc"
    )
    if not last_ts:
        return None
    seconds = time_diff_in_seconds(current_ts, last_ts)
    return round(seconds / 86400.0, 2)


def _calculate_days_pushed(old_date, new_date):
    if not old_date or not new_date:
        return None
    try:
        d_old = getdate(old_date)
        d_new = getdate(new_date)
        return date_diff(d_new, d_old)
    except Exception:
        return None


def _event_already_exists(event_dict):
    """
    Strict Idempotency Check:
    Checks if a CRM Deal Event already exists matching deal, event_type, field_name, event_timestamp, old_value, new_value.
    """
    filters = {
        "deal": event_dict["deal"],
        "event_type": event_dict["event_type"],
        "field_name": event_dict["field_name"],
        "event_timestamp": event_dict["event_timestamp"],
        "old_value": event_dict["old_value"],
        "new_value": event_dict["new_value"],
    }
    return frappe.db.exists("CRM Deal Event", filters)
