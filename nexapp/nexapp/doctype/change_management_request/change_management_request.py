import frappe
from frappe.model.document import Document

class ChangeManagementRequest(Document):
	pass

@frappe.whitelist()
def get_lms_pl_data(circuit_id, supplier):
    # Prepare supplier for loose matching
    supplier_lower = (supplier or "").lower().strip()

    def is_match(pi_supplier):
        if not supplier_lower: return True
        pi_sup_lower = (pi_supplier or "").lower().strip()
        return supplier_lower in pi_sup_lower or pi_sup_lower in supplier_lower

    def calculate_line_item_total(pi):
        items = frappe.get_all(
            "Purchase Invoice Item",
            filters={"parent": pi.name, "circuit_id": circuit_id},
            fields=["amount"],
            ignore_permissions=True
        )
        if not items:
            items = frappe.get_all(
                "Purchase Invoice Item",
                filters={"parent": pi.name, "custom_circuit_id": circuit_id},
                fields=["amount"],
                ignore_permissions=True
            )
        if items:
            pi.grand_total = sum((item.amount or 0) for item in items)
            
        if pi.supplier:
            pi.custom_notice_period = frappe.db.get_value("Supplier", pi.supplier, "custom_notice_period") or ""
            
        return pi

    # Helper to fetch PI and check supplier
    def fetch_and_check(filters):
        pi_data = frappe.get_all(
            "Purchase Invoice",
            filters=filters,
            fields=["name", "bill_no", "bill_date", "grand_total", "status", "custom_payment_type", "custom_payment_cycle", "custom_dutation_from", "custom_duration_to", "supplier"],
            order_by="creation desc",
            ignore_permissions=True
        )
        for pi in pi_data:
            if is_match(pi.supplier):
                return calculate_line_item_total(pi)
        return None

    # Step 1: Direct check on Purchase Invoice header
    res = fetch_and_check({"custom_circuit_id": circuit_id, "docstatus": 1})
    if res: return res

    # Step 2: Check Purchase Invoice Item table directly
    pi_items = frappe.get_all(
        "Purchase Invoice Item",
        filters={"circuit_id": circuit_id, "docstatus": 1},
        fields=["parent"],
        ignore_permissions=True
    )
    if pi_items:
        pi_ids = list(set([d.parent for d in pi_items]))
        res = fetch_and_check({"name": ("in", pi_ids), "docstatus": 1})
        if res: return res
        
    # Step 3: Fallback to Purchase Order Items
    po_items = frappe.get_all(
        "Purchase Order Item",
        filters={"custom_circuit_id": circuit_id, "docstatus": 1},
        fields=["parent"],
        ignore_permissions=True
    )
    
    if po_items:
        po_ids = list(set([d.parent for d in po_items]))
        pi_items = frappe.get_all(
            "Purchase Invoice Item",
            filters={"purchase_order": ("in", po_ids), "docstatus": 1},
            fields=["parent"],
            ignore_permissions=True
        )
        if pi_items:
            pi_ids = list(set([d.parent for d in pi_items]))
            res = fetch_and_check({"name": ("in", pi_ids), "docstatus": 1})
            if res: return res
                
    return None

@frappe.whitelist()
def get_lms_pl_ai_evaluation(circuit_id, supplier, disconnect_date, invoice_data, lms_id=None):
    import json
    import requests
    import datetime

    try:
        invoice = json.loads(invoice_data) if isinstance(invoice_data, str) else invoice_data
    except Exception:
        invoice = {}

    today = datetime.date.today().isoformat()

    try:
        api_config = frappe.get_doc("API Configuration")
    except Exception:
        api_configs = frappe.get_all("API Configuration", limit=1)
        if not api_configs:
            frappe.throw("No API Configuration found.")
        api_config = frappe.get_doc("API Configuration", api_configs[0].name)

    api_key = api_config.get_password("api_key") or api_config.api_key
    base_url = api_config.api_base_url
    model_name = api_config.model_name

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": frappe.utils.get_url(),
        "X-Title": "Nexapp LMS P&L Evaluation"
    }

    system_prompt = """You are a Senior Finance Controller and LMS (Last Mile Service) Risk Analyst for a Telecom company.
Your task is to produce an enterprise-grade financial impact evaluation for disconnecting a leased circuit.
Think like a CFO. Be precise, professional, and actionable.

CRITICAL RULES — READ CAREFULLY:

RULE 1: THREE MANDATORY BUSINESS CHECKS ONLY.
1. Supplier Invoice (Financial): Verify if Purchase Invoice is submitted, paid, and remaining prepaid amount is ₹0.
2. Purchase Order (Commercial Contract): If PO Status is To Receive and Bill, To Bill, To Receive, Completed, or Delivered, it is an ACTIVE Supplier Contract.
3. Notice Period:
   - Calculate Available Days = Calendar days between Today's Date and Proposed Disconnect Date.
   - If Available Days >= Notice Period -> Satisfied (no additional notice-period liability).
   - If Available Days < Notice Period -> Not Satisfied (liable for shortfall).
   - If Notice Period is blank or NULL -> 'Not Applicable' (Satisfied, do not reduce confidence).

RULE 2: NO SALES INVOICES. Do NOT use active Sales Invoices as a blocker. They belong to customer billing and MUST NOT reduce AI confidence, increase Business Risk, or prevent "100% SAFE TO DISCONNECT".

RULE 3: FINAL DECISION LOGIC - EVALUATION, NOT COMMAND.
- NEVER instruct management whether to disconnect or not. Never use "DO NOT DISCONNECT".
- "🟢 FINANCIALLY SAFE TO DISCONNECT": Only when Supplier Invoice fully paid, billing period completed, remaining prepaid = ₹0, Purchase Order closed (or no commercial liability), and Notice Period satisfied/Not Applicable.
- "🟡 EARLY DISCONNECTION – NOTICE PERIOD PENDING": When there is no direct prepaid loss, but the Notice Period is Not Satisfied or the Purchase Order is actively pending closure.
- "🔴 EARLY DISCONNECTION – FINANCIAL LIABILITY EXISTS": When there is a calculated Notice Penalty, remaining prepaid amount exists, or significant financial liability exists.

RULE 4: FINANCIAL LOSS & PENALTY CALCULATION.
- If Notice Period is Not Satisfied, you MUST calculate the Penalty Amount.
- Penalty Amount = (Invoice Amount / Invoice Duration Days) * additional_liability_days.
- The Estimated Financial Loss = unused_prepaid_amount + Penalty Amount.
- In the "money_flow" array, the "Financial Loss" MUST reflect this total estimated loss (including the notice penalty).

RULE 5: AI PHILOSOPHY - BE A DECISION SUPPORT ASSISTANT.
- Avoid long paragraphs. Use concise business points.
- The decision to disconnect belongs to management. Present the evaluation objectively.
- Always answer: What is the estimated financial liability? Why does the liability exist? What is the earliest zero-loss disconnection date? What actions will reduce the liability to zero?
- If Notice Period is Not Satisfied, explicitly state: "If the circuit is disconnected on [Date], the supplier notice period will not be completed. The estimated additional contractual liability is [Amount]." and calculate the earliest date on which liability becomes ₹0.00.

RULE 6: CONFIDENCE SCORING. Do not reduce confidence for Sales Invoices or missing Notice Period (which means Not Applicable). Only reduce confidence if core financial or PO data is completely unreadable from the provided context.

Return ONLY a valid JSON object (no markdown, no explanation) with EXACTLY this structure:

{
  "decision": "🟢 FINANCIALLY SAFE TO DISCONNECT" or "🔴 EARLY DISCONNECTION – FINANCIAL LIABILITY EXISTS" or "🟡 EARLY DISCONNECTION – NOTICE PERIOD PENDING",
  "decision_reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "recommended_action": "Proceed with Zero Loss" or "Management Approval Required for Financial Liability" or "Await Notice Period Expiry",
  "confidence": <number 0-100>,
  "confidence_factors": ["<factor checked>", "<factor checked>"],
  "confidence_deductions": ["<what is missing and why it reduced confidence>"],
  "action_plan": [
    {"action": "<e.g. Supplier Invoice Paid>", "status": "Completed" or "Pending"},
    {"action": "<e.g. Billing Period Completed>", "status": "Completed" or "Pending"},
    {"action": "<e.g. Purchase Order Closed (or Commercial Obligation Ended)>", "status": "Pending"},
    {"action": "<e.g. Supplier Confirmation Received>", "status": "Pending"},
    {"action": "<e.g. Future Supplier Billing Confirmed Stopped>", "status": "Pending"}
  ],
  "supplier_contract": {
    "po_number": "<PO number or Not Found>",
    "po_status": "<status>",
    "status": "Active" or "Closed" or "Not Found",
    "contract_liability": true or false,
    "commercial_obligation": true or false
  },
  "notice_evaluation": {
    "today_date": "<DD-MM-YYYY>",
    "proposed_disconnect_date": "<DD-MM-YYYY>",
    "notice_period": "<X Days or Not Applicable>",
    "available_days": <number>,
    "notice_status": "Satisfied" or "Not Satisfied",
    "additional_liability_days": <number>
  },
  "decision_factors": ["<factor 1>", "<factor 2>", "<factor 3>", "<factor 4>", "<factor 5>"],
  "business_risk": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
  "estimated_loss": <number>,
  "estimated_saving": <number>,
  "net_impact": <number>,
  "recommended_date": "<DD-MM-YYYY>",
  "earliest_safe_date": "<DD-MM-YYYY>",
  "best_financial_date": "<DD-MM-YYYY>",
  "contract_status": "Active" or "Expired" or "Near Expiry" or "Unknown",
  "remaining_days": <number>,
  "notice_satisfied": true or false,
  "notice_shortfall_days": <number>,
  "billing_cycle_label": "<e.g. Quarterly>",
  "covered_period_start": "<DD-MM-YYYY>",
  "covered_period_end": "<DD-MM-YYYY>",
  "unused_prepaid_days": <number>,
  "unused_prepaid_amount": <number>,
  "total_paid_amount": <number>,
  "consumed_amount": <number>,
  "penalty_amount": <number>,
  "credit_note_eligible": true or false,
  "refund_possible": true or false,
  "financial_timeline": [
    {"label": "Invoice Duration Start", "date": "<DD-MMM-YYYY>", "color": "green"},
    {"label": "Invoice Duration End", "date": "<DD-MMM-YYYY>", "color": "gray"},
    {"label": "Today", "date": "<DD-MMM-YYYY>", "color": "blue"},
    {"label": "Proposed Disconnect", "date": "<DD-MMM-YYYY>", "color": "orange"}
  ],
  "money_flow": [
    {"label": "Invoice Amount", "amount": <number>, "type": "total"},
    {"label": "Consumed", "amount": <number>, "type": "consumed"},
    {"label": "Remaining", "amount": <number>, "type": "remaining"},
    {"label": "Financial Loss", "amount": <number>, "type": "loss"}
  ],
  "risks": [
    {"risk": "Financial Risk", "severity": "Low" or "Medium" or "High" or "Critical" or "Unknown", "description": "<state what ERP data says, or 'Unable to determine — data not available'>"},
    {"risk": "Supplier Risk", "severity": "Low" or "Medium" or "High" or "Critical" or "Unknown", "description": "<based on notice period, contract status, and payment status from ERP>"},
    {"risk": "Billing Risk", "severity": "Low" or "Medium" or "High" or "Critical" or "Unknown", "description": "<state what ERP data says, or 'Unable to determine — billing data incomplete'>"},
    {"risk": "Customer Impact", "severity": "Low" or "Medium" or "High" or "Critical" or "Unknown", "description": "<state what ERP data says, or 'Unable to determine — customer status not verified'>"},
    {"risk": "Operational Risk", "severity": "Low" or "Medium" or "High" or "Critical" or "Unknown", "description": "<state what ERP data says, or 'Unable to determine — operational status not verified'>"}
  ],
  "alerts": ["<alert 1>", "<alert 2>"],
  "management_approvals": [
    {"role": "Finance", "status": "Recommended" or "Pending Review"},
    {"role": "Procurement", "status": "Recommended" or "Pending Review"},
    {"role": "Operations", "status": "Recommended" or "Pending Review"}
  ],
  "overall_approval_status": "READY FOR APPROVAL" or "REQUIRES REVIEW" or "DO NOT APPROVE",
  "simulation": [
    {"scenario": "Disconnect Today", "date": "<DD-MMM-YYYY>", "loss": <number>, "saving": <number>, "financial_status": "Clear" or "Loss", "operational_status": "Clear" or "Unknown" or "Blocked", "final_verdict": "Recommended" or "Review Required" or "Not Recommended"},
    {"scenario": "After Notice Period", "date": "<DD-MMM-YYYY>", "loss": <number>, "saving": <number>, "financial_status": "Clear" or "Loss", "operational_status": "Clear" or "Unknown" or "Blocked", "final_verdict": "Recommended" or "Review Required" or "Not Recommended"},
    {"scenario": "End of Billing Cycle", "date": "<DD-MMM-YYYY>", "loss": <number>, "saving": <number>, "financial_status": "Clear" or "Loss", "operational_status": "Clear" or "Unknown" or "Blocked", "final_verdict": "Recommended" or "Review Required" or "Not Recommended"}
  ],
  "ai_recommendation": "<Objective evaluation format. e.g. Status: EARLY DISCONNECTION – NOTICE PERIOD SHORTFALL. Estimated Liability: X. Recommendation: If disconnected today, estimated liability is X. If disconnected on [Date], liability becomes 0. Avoid commanding management.>",
  "executive_summary": {
    "financial_impact": <number>,
    "business_risk": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
    "operational_risk": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL" or "UNKNOWN",
    "recommendation": "FINANCIALLY SAFE" or "EARLY DISCONNECTION EVALUATION" or "MANAGEMENT DECISION REQUIRED",
    "reason": "<one concise sentence>"
  },
  "clearance_matrix": {
    "financial": {"status": "APPROVED" or "PENDING" or "BLOCKED", "reason": "<brief>"},
    "operations": {"status": "APPROVED" or "PENDING" or "BLOCKED", "reason": "<brief>"},
    "customer": {"status": "APPROVED" or "PENDING" or "BLOCKED", "reason": "<brief>"},
    "supplier": {"status": "APPROVED" or "PENDING" or "UNKNOWN", "reason": "<brief>"}
  },
  "ai_observations": ["<observation 1>", "<observation 2>", "<observation 3>"],
  "decision_evidence": [
    {"label": "Purchase Invoice", "value": "<invoice name or N/A>"},
    {"label": "Purchase Order", "value": "<PO name or N/A>"},
    {"label": "Payment Status", "value": "<Paid / Unpaid / Partial>"},
    {"label": "Supplier", "value": "<supplier name>"},
    {"label": "Notice Period", "value": "<X Days or No Notice Period>"},
    {"label": "Invoice Duration", "value": "<from> to <to>"},
    {"label": "Circuit ID", "value": "<circuit id>"},
    {"label": "Proposed Disconnect Date", "value": "<date>"},
    {"label": "Circuit Amount", "value": "INR <amount>"},
    {"label": "LMS Stage", "value": "<stage or Unknown>"},
    {"label": "Open Tickets", "value": "<count or None>"},
    {"label": "Open Change Requests", "value": "<count or None>"}
  ]
}"""

    billing_cycle_map = {
        "Monthly": 30, "Quarterly": 90, "QRC": 90,
        "Half Yearly": 180, "HRC": 180, "Annual": 365,
        "YRC": 365, "OTC": 0, "MRC": 30
    }
    payment_cycle = invoice.get("custom_payment_cycle", "")
    billing_days = billing_cycle_map.get(payment_cycle, 30)

    # Notice Period: blank/undefined = No Notice Period
    raw_notice = invoice.get("custom_notice_period", "")
    if raw_notice and str(raw_notice).strip() and str(raw_notice).strip() != "0":
        notice_str = f"{raw_notice} Days"
    else:
        notice_str = "Not Applicable"

    # Fetch Operational Context
    try:
        tickets = frappe.get_all("Helpdesk Ticket", filters={"custom_circuit_id": circuit_id, "status": ("not in", ["Closed", "Resolved"])}, fields=["name", "subject", "status"], limit=5)
        tickets_str = ", ".join([f"{t.name} ({t.status})" for t in tickets]) if tickets else "None"
        tickets_count = len(tickets)
    except Exception:
        tickets_str = "Unable to query"
        tickets_count = 0

    try:
        lms_records = frappe.get_all("Lastmile Services Master", filters={"circuit_id": circuit_id}, fields=["name", "lms_stage"], limit=1)
        lms_stage = lms_records[0].lms_stage if lms_records else "Unknown"
    except Exception:
        lms_stage = "Unknown"

    try:
        cmrs = frappe.get_all("Change Management Request", filters={"circuit_id": circuit_id, "status": ("not in", ["Completed", "Closed", "Cancelled"])}, fields=["name", "status", "change_type"], limit=5)
        cmrs_str = ", ".join([f"{c.name} ({c.change_type} - {c.status})" for c in cmrs]) if cmrs else "None"
        cmrs_count = len(cmrs)
    except Exception:
        cmrs_str = "Unable to query"
        cmrs_count = 0

    # Check for active Sales Invoices for this circuit
    try:
        active_si = frappe.get_all("Sales Invoice Item", filters={"custom_circuit_id": circuit_id, "docstatus": 1}, fields=["parent"], limit=5, ignore_permissions=True)
        if not active_si:
            active_si = frappe.get_all("Sales Invoice Item", filters={"circuit_id": circuit_id, "docstatus": 1}, fields=["parent"], limit=5, ignore_permissions=True)
        si_list = list(set([s.parent for s in active_si])) if active_si else []
        si_str = ", ".join(si_list) if si_list else "None (no active customer billing)"
        si_count = len(si_list)
    except Exception:
        si_str = "None (unable to query)"
        si_count = 0

    # Check Site status — Site name IS the circuit_id
    try:
        site_doc = frappe.db.get_value("Site", circuit_id, ["name", "site_status", "customer"], as_dict=True)
        if site_doc:
            site_status = f"{site_doc.name} (Status: {site_doc.site_status or 'N/A'}, Customer: {site_doc.customer or 'N/A'})"
        else:
            site_status = "No site record found for this circuit ID"
    except Exception:
        site_status = "Unable to query"

    # Check Purchase Order for this circuit using lms_id (Highest Priority)
    po_list = []
    po_statuses = []
    try:
        if lms_id:
            # Priority 1: Purchase Order Item.custom_lms_id
            po_items = frappe.get_all("Purchase Order Item", filters={"custom_lms_id": lms_id, "docstatus": 1}, fields=["parent"], limit=3, ignore_permissions=True)
            if po_items:
                po_list = list(set([p.parent for p in po_items]))
            else:
                # Priority 2: Purchase Order Header custom_lms_id
                pos = frappe.get_all("Purchase Order", filters={"custom_lms_id": lms_id, "docstatus": 1}, limit=3, ignore_permissions=True)
                po_list = [p.name for p in pos]
        
        if not po_list:
            # Priority 3: Fallback to circuit_id
            po_items = frappe.get_all("Purchase Order Item", filters={"custom_circuit_id": circuit_id, "docstatus": 1}, fields=["parent"], limit=3, ignore_permissions=True)
            if not po_items:
                po_items = frappe.get_all("Purchase Order Item", filters={"circuit_id": circuit_id, "docstatus": 1}, fields=["parent"], limit=3, ignore_permissions=True)
            po_list = list(set([p.parent for p in po_items])) if po_items else []
            
        po_str = ", ".join(po_list) if po_list else "Not Found"
        if po_list:
            for p in po_list:
                status = frappe.db.get_value("Purchase Order", p, "status")
                if status: po_statuses.append(status)
        po_status_str = ", ".join(list(set(po_statuses))) if po_statuses else "N/A"
    except Exception:
        po_str = "Unable to query"
        po_status_str = "Unable to query"

    user_prompt = f"""Evaluate the financial impact of disconnecting this leased circuit. Think like a Senior Finance Controller.

TODAY'S DATE: {today}
PROPOSED DISCONNECT DATE: {disconnect_date}

SUPPLIER CONTRACT (PURCHASE ORDER):
- Purchase Order(s): {po_str}
- Purchase Order Status: {po_status_str}
(Note: 'To Receive and Bill', 'To Bill', 'To Receive', 'Completed', 'Delivered' indicate an Active Contract)

CIRCUIT & CONTRACT DATA:
- Supplier: {invoice.get('supplier', supplier)}
- Circuit ID: {circuit_id}
- Notice Period: {notice_str}
- Payment Type: {invoice.get('custom_payment_type', 'N/A')}
- Payment Cycle: {payment_cycle} (approx {billing_days} days)
- Invoice Duration From: {invoice.get('custom_dutation_from', 'N/A')}
- Invoice Duration To: {invoice.get('custom_duration_to', 'N/A')}
NOTE: The above dates are INVOICE billing period dates, NOT contract start/end dates.

INVOICE DATA:
- Purchase Invoice: {invoice.get('name', 'N/A')}
- Invoice No (Bill No): {invoice.get('bill_no', 'N/A')}
- Invoice Date: {invoice.get('bill_date', 'N/A')}
- Invoice Status: {invoice.get('status', 'N/A')}
- Total Circuit Amount (line items for this circuit): INR {invoice.get('grand_total', 0)}

OPERATIONAL DATA:
- Site Status: {site_status}
- Active LMS Stage: {lms_stage}
- Open Helpdesk Tickets: {tickets_str} (Count: {tickets_count})
- Open Change Requests: {cmrs_str} (Count: {cmrs_count})
(Note: Sales Invoices are informational only and MUST NOT block the recommendation)

REMEMBER: Evaluate the Purchase Order as the most important contract document. Notice Period "Not Applicable" means no obligation exists.
Produce the complete enterprise-grade financial evaluation JSON."""

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1
    }

    try:
        response = requests.post(base_url, headers=headers, json=payload, timeout=45)
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)

    except Exception as e:
        frappe.log_error(f"LMS P&L AI Evaluation Failed: {str(e)}", "LMS AI Evaluation")
        frappe.throw(f"AI Evaluation Failed: {str(e)}")




