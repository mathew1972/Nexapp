import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate
from datetime import date, datetime

@frappe.whitelist()
def get_dashboard_data(filters=None):
    if filters and isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    query_filters = {}
    if filters:
        for key, val in filters.items():
            if val:
                query_filters[key] = val

    data = {
        "metrics": get_metrics(query_filters),
        "status_distribution": get_status_distribution(query_filters),
        "all_status_distribution": get_all_status_distribution(query_filters),
        "delivered_live_by_territory": get_delivered_live_by_territory(query_filters),
        "delivered_last_6_months": get_delivered_last_6_months(query_filters),
        "lms_delivered_last_6_months": get_lms_delivered_last_6_months(query_filters),
        "lms_supplier_last_6_months": get_lms_supplier_last_6_months(query_filters),
        "lms_bandwidth_last_6_months": get_lms_bandwidth_last_6_months(query_filters),
        "lms_stage_distribution": get_lms_stage_distribution(query_filters),
        "monthly_trends": get_monthly_trends(query_filters),
        "territory_backlog": get_territory_backlog(query_filters),
        "cancelled_last_6_months": get_cancelled_last_6_months(query_filters),
        "disconnections_last_6_months": get_disconnections_last_6_months(query_filters),
        "recent_sites": get_recent_sites(query_filters)
    }
    return data

def get_cancelled_last_6_months(filters):
    from frappe.utils import add_months, get_first_day, now_datetime
    
    # Generate last 6 months labels including current
    months = []
    curr = get_first_day(now_datetime())
    for i in range(5, -1, -1):
        d = add_months(curr, -i)
        months.append({
            "label": d.strftime("%b %Y"),
            "sort_val": d.year * 100 + d.month,
            "count": 0
        })

    conditions = ["site_status = 'Cancelled'"]
    if filters.get("territory"):
        conditions.append("territory = '%s'" % frappe.db.escape(filters["territory"]).strip("'"))
    if filters.get("customer"):
        conditions.append("customer = '%s'" % frappe.db.escape(filters["customer"]).strip("'"))
    
    where_clause = " WHERE " + " AND ".join(conditions)
    
    db_data = frappe.db.sql("""
        SELECT 
            (YEAR(modified) * 100 + MONTH(modified)) as sort_val,
            COUNT(*) as count
        FROM `tabSite`
        {where}
        GROUP BY sort_val
    """.format(where=where_clause), as_dict=True)
    
    data_map = {d.sort_val: d.count for d in db_data}
    for m in months:
        m['count'] = data_map.get(m['sort_val'], 0)
        
    return months

def get_disconnections_last_6_months(filters):
    from frappe.utils import add_months, get_first_day, now_datetime
    
    # Generate last 6 months labels
    months = []
    curr = get_first_day(now_datetime())
    for i in range(5, -1, -1):
        d = add_months(curr, -i)
        months.append({
            "label": d.strftime("%b %Y"),
            "sort_val": d.year * 100 + d.month,
            "count": 0
        })

    conditions = ["site_status IN ('Disconnection In Process', 'Disconnected')"]
    if filters.get("territory"):
        conditions.append("territory = '%s'" % frappe.db.escape(filters["territory"]).strip("'"))
    if filters.get("customer"):
        conditions.append("customer = '%s'" % frappe.db.escape(filters["customer"]).strip("'"))
    
    where_clause = " WHERE " + " AND ".join(conditions)
    
    db_data = frappe.db.sql("""
        SELECT 
            (YEAR(modified) * 100 + MONTH(modified)) as sort_val,
            COUNT(*) as count
        FROM `tabSite`
        {where}
        GROUP BY sort_val
    """.format(where=where_clause), as_dict=True)
    
    data_map = {d.sort_val: d.count for d in db_data}
    for m in months:
        m['count'] = data_map.get(m['sort_val'], 0)
        
    return months

def get_lms_bandwidth_last_6_months(filters):
    from frappe.utils import add_months, get_first_day, now_datetime
    
    # Range: last 6 months
    start_date = get_first_day(add_months(now_datetime(), -5))
    
    where_clause = " WHERE lms.lms_stage = 'Delivered' AND lms.lms_delivery_date >= '%s' AND lms.bandwith_type IS NOT NULL AND lms.bandwith_type != ''" % start_date
    if filters.get("territory"):
        where_clause += " AND s.territory = '%s'" % frappe.db.escape(filters["territory"]).strip("'")
    if filters.get("customer"):
        where_clause += " AND s.customer = '%s'" % frappe.db.escape(filters["customer"]).strip("'")

    return frappe.db.sql("""
        SELECT 
            lms.bandwith_type as label,
            COUNT(*) as count
        FROM `tabLastmile Services Master` lms
        JOIN `tabSite` s ON lms.circuit_id = s.name
        {where}
        GROUP BY lms.bandwith_type
        ORDER BY count DESC
    """.format(where=where_clause), as_dict=True)

def get_lms_supplier_last_6_months(filters):
    from frappe.utils import add_months, get_first_day, now_datetime
    
    # Range: last 6 months (starting from current month start - 5 months)
    start_date = get_first_day(add_months(now_datetime(), -5))
    
    where_clause = " WHERE lms.lms_stage = 'Delivered' AND lms.lms_delivery_date >= '%s'" % start_date
    if filters.get("territory"):
        where_clause += " AND s.territory = '%s'" % frappe.db.escape(filters["territory"]).strip("'")
    if filters.get("customer"):
        where_clause += " AND s.customer = '%s'" % frappe.db.escape(filters["customer"]).strip("'")

    # Group by supplier and count
    return frappe.db.sql("""
        SELECT 
            lms.supplier as label,
            COUNT(*) as count
        FROM `tabLastmile Services Master` lms
        JOIN `tabSite` s ON lms.circuit_id = s.name
        {where}
        GROUP BY lms.supplier
        ORDER BY count DESC
        LIMIT 10
    """.format(where=where_clause), as_dict=True)

def get_lms_delivered_last_6_months(filters):
    from frappe.utils import add_months, get_first_day, now_datetime
    
    # Generate last 6 months labels including current
    months = []
    curr = get_first_day(now_datetime())
    for i in range(5, -1, -1):
        d = add_months(curr, -i)
        months.append({
            "label": d.strftime("%b %Y"),
            "sort_val": d.year * 100 + d.month,
            "count": 0
        })

    where_clause = " WHERE lms.lms_stage = 'Delivered' AND lms.lms_delivery_date IS NOT NULL"
    if filters.get("territory"):
        where_clause += " AND s.territory = '%s'" % frappe.db.escape(filters["territory"]).strip("'")
    if filters.get("customer"):
        where_clause += " AND s.customer = '%s'" % frappe.db.escape(filters["customer"]).strip("'")

    db_data = frappe.db.sql("""
        SELECT 
            (YEAR(lms.lms_delivery_date) * 100 + MONTH(lms.lms_delivery_date)) as sort_val,
            COUNT(*) as count
        FROM `tabLastmile Services Master` lms
        JOIN `tabSite` s ON lms.circuit_id = s.name
        {where}
        GROUP BY sort_val
    """.format(where=where_clause), as_dict=True)
    
    # Map data to months
    data_map = {d.sort_val: d.count for d in db_data}
    for m in months:
        m['count'] = data_map.get(m['sort_val'], 0)
        
    return months

def get_delivered_last_6_months(filters):
    from frappe.utils import add_months, get_first_day, now_datetime
    
    # Generate last 6 months labels including current
    months = []
    curr = get_first_day(now_datetime())
    for i in range(5, -1, -1):
        d = add_months(curr, -i)
        months.append({
            "label": d.strftime("%b %Y"),
            "sort_val": d.year * 100 + d.month,
            "count": 0
        })

    conditions = ["site_status = 'Delivered and Live'", "date IS NOT NULL"]
    if filters.get("territory"):
        conditions.append("territory = '%s'" % frappe.db.escape(filters["territory"]).strip("'"))
    if filters.get("customer"):
        conditions.append("customer = '%s'" % frappe.db.escape(filters["customer"]).strip("'"))
    
    where_clause = " WHERE " + " AND ".join(conditions)
    
    db_data = frappe.db.sql("""
        SELECT 
            (YEAR(date) * 100 + MONTH(date)) as sort_val,
            COUNT(*) as count
        FROM `tabSite`
        {where}
        GROUP BY sort_val
    """.format(where=where_clause), as_dict=True)
    
    # Map data to months
    data_map = {d.sort_val: d.count for d in db_data}
    for m in months:
        m['count'] = data_map.get(m['sort_val'], 0)
        
    return months

WIP_STATUSES = [
    "Pending",
    "In-process",
    "Installation Initiated",
    "On Hold",
    "Provisioning",
    "Partially Provisioning Completed",
    "Provisioning Completed",
    "Awaiting Customer Approval"
]

ALL_OPERATIONAL_STATUSES = WIP_STATUSES + [
    "Delivered and Live",
    "Disconnection In Process",
    "Disconnected",
    "Cancelled",
    "Site Shifted to new location",
    "Site Upgraded to new Circuit",
    "Site degraded to new Circuit"
]

def get_metrics(filters):
    total_circuits = frappe.db.count("Site", filters)
    
    wip_filters = filters.copy()
    wip_filters["site_status"] = ["in", WIP_STATUSES]
    wip_sites = frappe.db.count("Site", wip_filters)
    
    live_filters = filters.copy()
    live_filters["site_status"] = "Delivered and Live"
    live_sites = frappe.db.count("Site", live_filters)
    
    # Avg WIP Age (Days sites have been in WIP)
    wip_age = frappe.db.sql("""
        SELECT 
            AVG(DATEDIFF(IFNULL(date, NOW()), site_created_date)) as avg_wip_age
        FROM `tabSite`
        WHERE site_status IN %s AND site_created_date IS NOT NULL
    """ % (str(tuple(WIP_STATUSES))), as_dict=True)
    
    avg_wip_age = flt(wip_age[0].avg_wip_age) if wip_age else 0
    
    return {
        "total_circuits": total_circuits,
        "wip_sites": wip_sites,
        "live_sites": live_sites,
        "avg_wip_age": round(avg_wip_age, 1)
    }

def get_status_distribution(filters):
    return frappe.db.sql("""
        SELECT site_status as label, count(*) as count
        FROM `tabSite`
        WHERE site_status IN %s
        GROUP BY site_status
        ORDER BY count DESC
    """ % (str(tuple(WIP_STATUSES))), as_dict=True)

def get_all_status_distribution(filters):
    """Return counts for ALL statuses, including those with 0 records."""
    # Query actual counts
    result = frappe.db.sql("""
        SELECT site_status as label, count(*) as count
        FROM `tabSite`
        WHERE site_status IS NOT NULL AND site_status != ''
        GROUP BY site_status
        ORDER BY count DESC
    """, as_dict=True)

    # Build a dict of actual counts
    count_map = {r['label']: r['count'] for r in result}

    # Ensure every status from ALL_OPERATIONAL_STATUSES is present
    final = []
    for status in ALL_OPERATIONAL_STATUSES:
        count = count_map.get(status, 0)
        if count > 0:  # Only include statuses with actual records
            final.append({
                'label': status,
                'count': count
            })

    # Sort by count descending
    final.sort(key=lambda x: x['count'], reverse=True)
    return final

def get_lms_stage_distribution(filters):
    return frappe.db.sql("""
        SELECT lms_stage as label, count(*) as count
        FROM `tabSite`
        WHERE site_status IN %s AND lms_stage IS NOT NULL AND lms_stage != ''
        GROUP BY lms_stage
        ORDER BY count DESC
    """ % (str(tuple(WIP_STATUSES))), as_dict=True)

def get_monthly_trends(filters):
    # Monthly WIP Created Trend
    return frappe.db.sql("""
        SELECT 
            DATE_FORMAT(site_created_date, '%%Y-%%m') as month, 
            COUNT(*) as count
        FROM `tabSite`
        WHERE site_status IN %s AND site_created_date IS NOT NULL
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
    """ % (str(tuple(WIP_STATUSES))), as_dict=True)

def get_territory_backlog(filters):
    return frappe.db.sql("""
        SELECT territory as label, count(*) as count
        FROM `tabSite`
        WHERE site_status IN %s AND territory IS NOT NULL AND territory != ''
        GROUP BY territory
        ORDER BY count DESC
        LIMIT 10
    """ % (str(tuple(WIP_STATUSES))), as_dict=True)

def get_delivered_live_by_territory(filters):
    return frappe.db.sql("""
        SELECT territory as label, count(*) as count
        FROM `tabSite`
        WHERE site_status = 'Delivered and Live'
        GROUP BY territory
        ORDER BY count DESC
        LIMIT 10
    """, as_dict=True)

def get_recent_sites(filters):
    from frappe.utils import now_datetime
    from datetime import timedelta
    cutoff = now_datetime() - timedelta(hours=24)

    site_filters = filters.copy() if filters else {}
    site_filters["modified"] = [">=", cutoff]

    sites = frappe.db.get_all("Site",
        fields=["name", "site_name", "customer", "site_status", "date", "modified", "modified_by"],
        filters=site_filters,
        order_by="modified desc",
        limit=200
    )

    # Resolve modified_by email to full name
    for site in sites:
        if site.get("modified_by"):
            site["updated_by"] = frappe.get_cached_value("User", site["modified_by"], "full_name") or site["modified_by"]
        else:
            site["updated_by"] = "-"

    return sites
@frappe.whitelist()
def get_site_drilldown_data(card_type="wip", filters=None):
    if filters and isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    if card_type == "live":
        results = frappe.db.sql("""
            SELECT 
                name, 
                site_name, 
                customer as customer_name, 
                customer_type, 
                solution_name, 
                client_installation_approval_date as delivery_date,
                city,
                state,
                territory
            FROM `tabSite`
            WHERE site_status = 'Delivered and Live'
            ORDER BY client_installation_approval_date DESC
        """, as_dict=True)
    else:
        results = frappe.db.sql("""
            SELECT 
                name, 
                site_name, 
                customer as customer_name, 
                site_status, 
                stage as stock_stage, 
                lms_stage, 
                customer_type, 
                solution_name, 
                project_review,
                lms_review,
                task_ownership,
                IFNULL(site_created_date, DATE(creation)) as circuit_created_date,
                DATEDIFF(NOW(), IFNULL(site_created_date, DATE(creation))) as aging
            FROM `tabSite`
            WHERE site_status IN %s
            ORDER BY aging DESC
        """ % (str(tuple(WIP_STATUSES))), as_dict=True)
    
    return results

@frappe.whitelist()
def get_wip_drilldown_data(filters=None):
    return get_site_drilldown_data("wip", filters)

@frappe.whitelist()
def download_site_xlsx(card_type="wip", filters=None):
    if filters and isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    data = get_site_drilldown_data(card_type, filters)
    
    title = "WIP Aging Details" if card_type == "wip" else "Delivery & Live Details"
    
    if card_type == "live":
        columns = [
            "Circuit ID", "Site Name", "Customer Name", "Customer Type", 
            "Solution Name", "Delivery Date", "City", "State", "Territory"
        ]
        rows = [columns]
        for d in data:
            rows.append([
                d.name, d.site_name, d.customer_name, d.customer_type,
                d.solution_name, d.delivery_date, d.city, d.state, d.territory
            ])
    else:
        columns = [
            "Circuit ID", "Site Name", "Customer Name", "Site Status", 
            "Stock Stage", "LMS Stage", "Customer Type", "Solution Name", 
            "Project Review", "LMS Review", "Task Ownership",
            "Created Date", "Aging"
        ]
        rows = [columns]
        for d in data:
            rows.append([
                d.name, d.site_name, d.customer_name, d.site_status,
                d.stock_stage, d.lms_stage, d.customer_type, d.solution_name,
                d.project_review, d.lms_review, d.task_ownership,
                d.circuit_created_date, d.aging
            ])
    
    from frappe.utils.xlsxutils import make_xlsx
    xlsx_file = make_xlsx(rows, title)
    
    frappe.response['filename'] = title.replace(" ", "_") + ".xlsx"
    frappe.response['filecontent'] = xlsx_file.getvalue()
    frappe.response['type'] = "binary"

@frappe.whitelist()
def download_wip_xlsx(filters=None):
    return download_site_xlsx("wip", filters)

@frappe.whitelist()
def get_total_circuits_filter_options():
    customers = frappe.db.sql("""
        SELECT DISTINCT customer FROM `tabSite` 
        WHERE customer IS NOT NULL AND customer != '' 
        ORDER BY customer
    """, as_list=True)
    
    statuses = frappe.db.sql("""
        SELECT DISTINCT site_status FROM `tabSite` 
        WHERE site_status IS NOT NULL AND site_status != '' 
        ORDER BY site_status
    """, as_list=True)
    
    customer_types = frappe.db.sql("""
        SELECT DISTINCT customer_type FROM `tabSite` 
        WHERE customer_type IS NOT NULL AND customer_type != '' 
        ORDER BY customer_type
    """, as_list=True)
    
    circuit_ids = frappe.db.sql("""
        SELECT name FROM `tabSite` 
        ORDER BY name
    """, as_list=True)
    
    lms_stages = frappe.db.sql("""
        SELECT DISTINCT lms_stage FROM `tabLastmile Services Master` 
        WHERE lms_stage IS NOT NULL AND lms_stage != '' 
        ORDER BY lms_stage
    """, as_list=True)
    
    return {
        "customers": [c[0] for c in customers],
        "statuses": [s[0] for s in statuses],
        "customer_types": [ct[0] for ct in customer_types],
        "circuit_ids": [cid[0] for cid in circuit_ids],
        "lms_stages": [ls[0] for ls in lms_stages]
    }

@frappe.whitelist()
def get_total_circuits_data(date_range="All", from_date=None, to_date=None, customer=None, site_status=None, customer_type=None):
    conditions = []
    
    if date_range == "Current Month":
        conditions.append("MONTH(IFNULL(site_created_date, DATE(creation))) = MONTH(NOW()) AND YEAR(IFNULL(site_created_date, DATE(creation))) = YEAR(NOW())")
    elif date_range == "Last 3 Months":
        conditions.append("IFNULL(site_created_date, DATE(creation)) >= DATE_SUB(NOW(), INTERVAL 3 MONTH)")
    elif date_range == "Custom" and from_date and to_date:
        conditions.append("IFNULL(site_created_date, DATE(creation)) BETWEEN '%s' AND '%s'" % (from_date, to_date))
    
    if customer and customer != "All":
        conditions.append("customer = '%s'" % frappe.db.escape(customer).strip("'"))
    
    if site_status and site_status != "All":
        conditions.append("site_status = '%s'" % frappe.db.escape(site_status).strip("'"))
    
    if customer_type and customer_type != "All":
        conditions.append("customer_type = '%s'" % frappe.db.escape(customer_type).strip("'"))
    
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    results = frappe.db.sql("""
        SELECT 
            name, 
            site_name, 
            customer as customer_name, 
            customer_type, 
            solution_name, 
            site_status,
            client_installation_approval_date as delivery_date,
            city,
            state,
            territory
        FROM `tabSite`
        {where}
        ORDER BY name DESC
    """.format(where=where_clause), as_dict=True)
    
    return results

@frappe.whitelist()
def download_total_circuits_xlsx(date_range="All", from_date=None, to_date=None, customer=None, site_status=None, customer_type=None):
    data = get_total_circuits_data(date_range, from_date, to_date, customer, site_status, customer_type)
    
    columns = [
        "Circuit ID", "Site Name", "Customer Name", "Customer Type", 
        "Solution Name", "Status", "Delivery Date", "City", "State", "Territory"
    ]
    
    rows = [columns]
    for d in data:
        rows.append([
            d.name, d.site_name, d.customer_name, d.customer_type,
            d.solution_name, d.site_status, d.delivery_date, d.city, d.state, d.territory
        ])
    
    from frappe.utils.xlsxutils import make_xlsx
    xlsx_file = make_xlsx(rows, "Total Circuits Report")
    
    frappe.response['filename'] = "Total_Circuits_Report.xlsx"
    frappe.response['filecontent'] = xlsx_file.getvalue()
    frappe.response['type'] = "binary"

@frappe.whitelist()
def get_circuit_flow_data(circuit_id):
    """Fetch flow data across Site, Stock Management, Shipment, LMS, and Provisioning for a Circuit ID."""
    if not circuit_id:
        frappe.throw(_("Circuit ID is required"))

    # 1. Site
    site = frappe.db.get_value("Site", circuit_id, [
        "name", "site_name", "customer", "site_status", "stage",
        "lms_stage", "customer_type", "solution_name", "lms_type", 
        "order_type", "project_review", "lms_review", "task_ownership", "creation"
    ], as_dict=True)

    if not site:
        frappe.throw(_("Site {0} not found").format(circuit_id))

    # 2. Stock Management
    stock = frappe.db.get_value("Stock Management", {"circuit_id": circuit_id}, [
        "name", "status", "delivery_note_id", "creation"
    ], as_dict=True) or {}

    # 3. Shipment (via custom_circuit_id)
    shipment = frappe.db.get_value("Shipment", {"custom_circuit_id": circuit_id}, [
        "name", "status", "awb_number", "pickup_date", "carrier", 
        "carrier_service", "custom_person_name", "tracking_status_info", 
        "custom_delivery_date", "creation"
    ], as_dict=True) or {}

    # 4. Lastmile Services Master
    lms = frappe.db.get_value("Lastmile Services Master", {"circuit_id": circuit_id}, [
        "name", "lms_stage", "supplier", "lms_delivery_date", "expected_delivery_date", "creation"
    ], as_dict=True) or {}

    # 5. Provisioning
    provisioning = frappe.db.get_value("Provisioning", {"circuit_id": circuit_id}, [
        "name", "status", "provisioning_date", "creation"
    ], as_dict=True) or {}

    return {
        "site": site,
        "stock": stock,
        "shipment": shipment,
        "lms": lms,
        "provisioning": provisioning
    }

@frappe.whitelist()
def get_custom_report_data(filters=None, fields=None):
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)
    if isinstance(fields, str):
        fields = frappe.parse_json(fields)

    if not fields:
        return []

    # Map requested labels/fields to actual DB columns
    field_map = {
        "Site": {
            "circuit_id": "s.name as circuit_id",
            "customer": "s.customer",
            "site_status": "s.site_status",
            "customer_type": "s.customer_type",
            "site_name": "s.site_name",
            "order_type": "s.order_type",
            "site_type": "s.site_type",
            "stock_stage": "s.stage as stock_stage",
            "lms_stage": "s.lms_stage as site_lms_stage",
            "site_id__legal_code": "s.site_id__legal_code",
            "lms_type": "s.lms_type as service_type",
            "solution_name": "s.solution_name",
            "central_spoke": "s.central_spoke",
            "mobile": "s.mobile",
            "central_email": "s.central_email",
            "contact_person": "s.contact_person",
            "primary_contact_mobile": "s.primary_contact_mobile",
            "address_street": "s.address_street",
            "city": "s.city",
            "state": "s.state",
            "circuit_delivery_date": "s.date as circuit_delivery_date",
            "project_review": "s.project_review",
            "lms_review": "s.lms_review",
            "task_ownership": "s.task_ownership",
            "creation": "DATE(s.creation)",
            "cancel_reason": "s.cancel_reason",
            "territory": "s.territory",
            "email": "s.email",
            "pincode": "s.pincode",
            "assigned_name": "s._assign as assigned_name"
        },
        "Lastmile Services Master": {
            "lms_id": "lms.name as lms_id",
            "supplier": "lms.supplier",
            "lms_stage": "lms.lms_stage as lms_master_stage",
            "expected_delivery_date": "lms.expected_delivery_date",
            "bandwith_type": "lms.bandwith_type",
            "lms_brandwith_name": "lms.lms_brandwith_name",
            "media": "lms.media",
            "lms_delivery_date": "lms.lms_delivery_date",
            "lms_creation": "DATE(lms.creation)",
            "po_requeste_id": "lms.po_requeste_id",
            "po_requested_date": "lms.po_requested_date",
            "po_released_datetime": "DATE(lms.po_released_datetime) as po_released_datetime",
            "po_number": "lms.po_number",
            "item_name": "'' as item_name",
            "item_rate": "'' as item_rate",
            "qty": "'' as qty",
            "total_amount": "'' as total_amount",
            "level": "'' as level",
            "link_zitr": "'' as link_zitr",
            "contact_phone": "'' as contact_phone",
            "link_syot": "'' as link_syot",
            "designation": "'' as designation",
            "department": "'' as department"
        },
        "Provisioning": {
            "provisioning_status": "prov.status as provisioning_status",
            "provisioning_completed_date": "prov.provisioning_date as provisioning_completed_date",
            "provisioning_partially_completed_date": "prov.provisioning_partially_completed_date",
            "branch_router_ip": "prov.branch_router_ip",
            "provisioning_creation": "DATE(prov.creation)"
        },
        "Shipment": {
            "pickup_from": "ship.pickup_from",
            "custom_person_name": "ship.custom_person_name",
            "delivery_contact": "ship.delivery_contact",
            "shipment_type": "ship.shipment_type",
            "pickup_type": "ship.pickup_type",
            "pickup_date": "ship.pickup_date",
            "carrier": "ship.carrier",
            "carrier_service": "ship.carrier_service",
            "awb_number": "ship.awb_number",
            "tracking_status": "ship.tracking_status",
            "custom_delivery_date": "ship.custom_delivery_date",
            "shipment_creation": "DATE(ship.creation)"
        }
    }

    select_clause = []
    
    for dt, dt_fields in fields.items():
        for f in dt_fields:
            if f in field_map.get(dt, {}):
                sql_col = field_map[dt][f]
                if sql_col not in select_clause:
                    select_clause.append(sql_col)

    # Ensure lms_id is included if child table fields are needed
    lms_fields = fields.get("Lastmile Services Master", [])
    child_fields = ["item_name", "item_rate", "qty", "total_amount", "level", "link_zitr", "contact_phone", "link_syot", "designation", "department"]
    if any(f in lms_fields for f in child_fields) and "lms.name as lms_id" not in select_clause:
        select_clause.append("lms.name as lms_id")

    conditions = []
    if filters:
        if filters.get("date_range") == "Current Month":
            conditions.append("MONTH(DATE(s.creation)) = MONTH(NOW()) AND YEAR(DATE(s.creation)) = YEAR(NOW())")
        elif filters.get("date_range") == "Last 3 Months":
            conditions.append("DATE(s.creation) >= DATE_SUB(NOW(), INTERVAL 3 MONTH)")
        elif filters.get("date_range") == "Custom" and filters.get("from_date") and filters.get("to_date"):
            conditions.append("DATE(s.creation) BETWEEN '%s' AND '%s'" % (filters.get("from_date"), filters.get("to_date")))
        
        # Circuit Delivery Date Filter
        if filters.get("delivery_date_range") == "Current Month":
            conditions.append("MONTH(DATE(s.date)) = MONTH(NOW()) AND YEAR(DATE(s.date)) = YEAR(NOW())")
        elif filters.get("delivery_date_range") == "Last 3 Months":
            conditions.append("DATE(s.date) >= DATE_SUB(NOW(), INTERVAL 3 MONTH)")
        elif filters.get("delivery_date_range") == "Custom" and filters.get("delivery_from_date") and filters.get("delivery_to_date"):
            conditions.append("DATE(s.date) BETWEEN '%s' AND '%s'" % (filters.get("delivery_from_date"), filters.get("delivery_to_date")))
        
        # LMS Delivery Date Filter
        if filters.get("lms_delivery_date_range") == "Current Month":
            conditions.append("MONTH(DATE(lms.lms_delivery_date)) = MONTH(NOW()) AND YEAR(DATE(lms.lms_delivery_date)) = YEAR(NOW())")
        elif filters.get("lms_delivery_date_range") == "Last 3 Months":
            conditions.append("DATE(lms.lms_delivery_date) >= DATE_SUB(NOW(), INTERVAL 3 MONTH)")
        elif filters.get("lms_delivery_date_range") == "Custom" and filters.get("lms_delivery_from_date") and filters.get("lms_delivery_to_date"):
            conditions.append("DATE(lms.lms_delivery_date) BETWEEN '%s' AND '%s'" % (filters.get("lms_delivery_from_date"), filters.get("lms_delivery_to_date")))
        
        if filters.get("lms_status") and filters.get("lms_status") != "All":
            conditions.append("lms.lms_stage = '%s'" % frappe.db.escape(filters.get("lms_status")).strip("'"))
        
        if filters.get("customer") and filters.get("customer") != "All":
            conditions.append("s.customer = '%s'" % frappe.db.escape(filters.get("customer")).strip("'"))
        
        if filters.get("site_status") and filters.get("site_status") != "All":
            conditions.append("s.site_status = '%s'" % frappe.db.escape(filters.get("site_status")).strip("'"))
        
        if filters.get("customer_type") and filters.get("customer_type") != "All":
            conditions.append("s.customer_type = '%s'" % frappe.db.escape(filters.get("customer_type")).strip("'"))

        if filters.get("circuit_id") and filters.get("circuit_id") != "All":
            cids = filters.get("circuit_id")
            if isinstance(cids, str):
                cids = [c.strip() for c in cids.split(',') if c.strip()]
            if cids:
                conditions.append("s.name IN (%s)" % (", ".join(["'%s'" % frappe.db.escape(c).strip("'") for c in cids])))

    # Ensure s.name is included if status_timestamp is needed but circuit_id isn't selected
    if "status_timestamp" in fields.get("Site", []) and "s.name as circuit_id" not in select_clause:
        select_clause.append("s.name as circuit_id")

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    joins = []
    if fields.get("Lastmile Services Master") or (filters and filters.get("lms_delivery_date_range") and filters.get("lms_delivery_date_range") != "All") or (filters and filters.get("lms_status") and filters.get("lms_status") != "All"):
        joins.append("LEFT JOIN `tabLastmile Services Master` lms ON s.name = lms.circuit_id")
    if fields.get("Provisioning"):
        joins.append("LEFT JOIN `tabProvisioning` prov ON s.name = prov.circuit_id")
    if fields.get("Shipment"):
        joins.append("LEFT JOIN `tabShipment` ship ON s.name = ship.custom_circuit_id")

    query = """
        SELECT 
            {select}
        FROM `tabSite` s
        {joins}
        {where}
        ORDER BY s.name DESC
    """.format(
        select=", ".join(select_clause), 
        joins="\n".join(joins),
        where=where_clause
    )

    data = frappe.db.sql(query, as_dict=True)

    if data and "assigned_name" in fields.get("Site", []):
        for d in data:
            if d.get("assigned_name"):
                try:
                    assignees = frappe.parse_json(d.get("assigned_name"))
                    if assignees and isinstance(assignees, list) and len(assignees) > 0:
                        last_assignee = assignees[-1]
                        full_name = frappe.get_cached_value("User", last_assignee, "full_name")
                        d["assigned_name"] = full_name or last_assignee
                    else:
                        d["assigned_name"] = ""
                except Exception:
                    pass
            else:
                d["assigned_name"] = ""

    # Fetch status timestamp from Version if requested
    if data and "status_timestamp" in fields.get("Site", []):
        site_names = [d.get("circuit_id") for d in data if d.get("circuit_id")]
        if site_names:
            # Query versions for site_status changes
            versions = frappe.db.sql("""
                SELECT docname, MAX(creation) as last_change
                FROM `tabVersion`
                WHERE ref_doctype='Site' AND docname IN %s
                AND data LIKE '%%site_status%%'
                GROUP BY docname
            """, (site_names,), as_dict=True)
            
            version_map = {v.docname: v.last_change for v in versions}
            for d in data:
                # Use version timestamp or fallback to record creation
                ts = version_map.get(d.get("circuit_id"), d.get("creation"))
                if ts and isinstance(ts, datetime):
                    ts = ts.date()
                d["status_timestamp"] = ts

    # Process Child Tables for LMS
    costing_fields = ["item_name", "item_rate", "qty", "total_amount"]
    escalation_fields = ["level", "link_zitr", "contact_phone", "link_syot", "designation", "department"]
    
    if any(f in lms_fields for f in costing_fields + escalation_fields):
        lms_ids = [d.get("lms_id") for d in data if d.get("lms_id")]
        if lms_ids:
            lms_map = {d.lms_id: d for d in data if d.get("lms_id")}
            
            if any(f in lms_fields for f in costing_fields):
                items = frappe.db.get_all("LMS PO Item", 
                    fields=["parent", "item_name", "item_rate", "qty", "total_amount"],
                    filters={"parent": ["in", lms_ids]}
                )
                item_data = {}
                for it in items:
                    if it.parent not in item_data: item_data[it.parent] = {f: [] for f in costing_fields}
                    for f in costing_fields:
                        if f in lms_fields: 
                            val = it.get(f)
                            if f in ["item_rate", "total_amount"]:
                                val = "{:.2f}".format(flt(val))
                            item_data[it.parent][f].append(str(val if val is not None else ""))
                
                for lid, d in lms_map.items():
                    if lid in item_data:
                        for f in costing_fields:
                            if f in lms_fields: d[f] = "; ".join(item_data[lid][f])

            if any(f in lms_fields for f in escalation_fields):
                esc = frappe.db.get_all("LMS Contact Escalation",
                    fields=["parent", "level", "link_zitr", "contact_phone", "link_syot", "designation", "department"],
                    filters={"parent": ["in", lms_ids]}
                )
                esc_data = {}
                for e in esc:
                    if e.parent not in esc_data: esc_data[e.parent] = {f: [] for f in escalation_fields}
                    for f in escalation_fields:
                        if f in lms_fields: esc_data[e.parent][f].append(str(e.get(f) or ""))

                for lid, d in lms_map.items():
                    if lid in esc_data:
                        for f in escalation_fields:
                            if f in lms_fields: d[f] = "; ".join(esc_data[lid][f])

    return data

@frappe.whitelist()
def download_custom_report_xlsx(filters=None, fields=None):
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)
    if isinstance(fields, str):
        fields = frappe.parse_json(fields)

    # Log the download activity
    try:
        from frappe.utils import now
        user = frappe.session.user
        timestamp = now()
        
        # Format filters for logging
        f_str = ""
        if filters:
            f_parts = []
            for k, v in filters.items():
                if v and v != "All":
                    f_parts.append(f"{k}: {v}")
            f_str = " | ".join(f_parts)
            
        fields_str = ", ".join(fields) if fields else "None"
        
        # 1. Try to record in the new DocType
        try:
            frappe.get_doc({
                "doctype": "Custom Report Log",
                "user": user,
                "report_name": "Site Dashboard",
                "fields_selected": fields_str,
                "filters_applied": f_str if f_str else "None"
            }).insert(ignore_permissions=True)
        except Exception as doctype_err:
            # 2. Fallback to file log if DocType table doesn't exist yet (migration pending)
            import os
            log_dir = os.path.join(frappe.get_site_path(), "logs")
            if not os.path.exists(log_dir): os.makedirs(log_dir)
            log_file = os.path.join(log_dir, "custom_report_downloads.log")
            with open(log_file, "a") as f:
                f.write(f"[{timestamp}] User: {user} | Fields: {fields_str} | Filters: {f_str if f_str else 'None'} (DocType Error: {str(doctype_err)})\n")

    except Exception as e:
        frappe.log_error(f"Failed to log custom report download: {str(e)}")

    data = get_custom_report_data(filters, fields)
    
    # Define Column Header Labels
    label_map = {
        "name": "Circuit ID",
        "circuit_id": "Circuit ID",
        "customer": "Customer",
        "site_status": "Site Status",
        "customer_type": "Customer Type",
        "site_name": "Site Name",
        "order_type": "Order Type",
        "site_type": "Site Type",
        "stock_stage": "Stock Stage",
        "site_lms_stage": "Site LMS Stage",
        "site_id__legal_code": "Site ID / Legal Code",
        "service_type": "Service Type",
        "solution_name": "Solution Name",
        "assigned_name": "Assigned Name",
        "project_review": "Project Review",
        "lms_review": "LMS Review",
        "task_ownership": "Task Ownership",
        "central_spoke": "Central Spoke",
        "mobile": "Mobile",
        "central_email": "Central Email",
        "contact_person": "Contact Person",
        "primary_contact_mobile": "Primary Contact Mobile",
        "address_street": "Address/ Street",
        "city": "City",
        "state": "State",
        "circuit_delivery_date": "Circuit Delivery Date",
        "supplier": "Supplier",
        "lms_master_stage": "LMS Stage (Master)",
        "expected_delivery_date": "Expected Delivery Date",
        "bandwith_type": "Bandwidth Type",
        "lms_brandwith_name": "LMS Bandwidth Name",
        "media": "Media",
        "provisioning_status": "Provisioning Status",
        "provisioning_completed_date": "Provisioning Completed Date",
        "provisioning_partially_completed_date": "Provisioning Partially Completed Date",
        "branch_router_ip": "Branch Router IP",
        "provisioning_creation": "Provisioning Created Date",
        "pickup_from": "Pickup from",
        "custom_person_name": "Site Contact Person",
        "delivery_contact": "Site Contact",
        "shipment_type": "Shipment Type",
        "pickup_type": "Pickup Type",
        "pickup_date": "Pickup Date",
        "carrier": "Carrier",
        "carrier_service": "Carrier Service",
        "awb_number": "AWB Number",
        "tracking_status": "Tracking Status",
        "custom_delivery_date": "Delivery Date",
        "shipment_creation": "Shipment Created Date",
        "item_name": "Item Name",
        "item_rate": "Item Rate",
        "qty": "Qty",
        "total_amount": "Total Amount",
        "po_requeste_id": "PO Requeste ID",
        "po_requested_date": "PO Requested Date",
        "po_released_datetime": "PO Released Date",
        "po_number": "PO Number",
        "level": "Level",
        "link_zitr": "Contact Name",
        "contact_phone": "Contact Phone",
        "link_syot": "Contact Email",
        "designation": "Designation",
        "department": "Department"
    }

    if not data:
        columns = ["No Data Found"]
        rows = [columns]
    else:
        # Get keys from first row to determine column order
        keys = list(data[0].keys())
        columns = [label_map.get(k, k.replace("_", " ").title()) for k in keys]
    # Add filter info as header rows
    filter_info = []
    if filters:
        line1 = []
        if filters.get("date_range"):
            dr = filters.get("date_range")
            line1.append("Circuit From: %s" % dr)
            from_date, to_date = None, None
            
            # Helper to format as DD-MM-YYYY
            def fmt(d):
                if not d: return None
                try:
                    return getdate(d).strftime("%d-%m-%Y")
                except:
                    return str(d)

            if dr == "Current Month":
                from_date = fmt(nowdate()[:-2] + "01")
                to_date = fmt(nowdate())
            elif dr == "Last 3 Months":
                raw_from = frappe.db.sql("SELECT DATE_SUB(NOW(), INTERVAL 3 MONTH)", as_list=True)[0][0]
                from_date = fmt(raw_from)
                to_date = fmt(nowdate())
            elif dr == "Custom":
                from_date = fmt(filters.get("from_date"))
                to_date = fmt(filters.get("to_date"))
            
            if from_date and to_date:
                line1.append("(%s to %s)" % (from_date, to_date))
        
        if filters.get("customer") and filters.get("customer") != "All":
            line1.append("Customer: %s" % filters.get("customer"))
        if line1: filter_info.append([" | ".join(line1)])

        line2 = []
        if filters.get("site_status") and filters.get("site_status") != "All":
            line2.append("Status: %s" % filters.get("site_status"))
        if filters.get("circuit_id") and filters.get("circuit_id") != "All":
            line2.append("Circuit IDs: %s" % filters.get("circuit_id"))
        if line2: filter_info.append([" | ".join(line2)])
    
    if filter_info:
        filter_info.append([]) # Empty row for spacing
        rows = filter_info + [columns]
    else:
        rows = [columns]

    for d in data:
        row = []
        for k in keys:
            val = d.get(k)
            if isinstance(val, datetime):
                val = val.date()
            elif isinstance(val, (str, bytes)) and val:
                # Try to convert string dates to date objects for Excel
                try:
                    if len(val) == 10 and val[4] == "-" and val[7] == "-":
                        val = getdate(val)
                except:
                    pass
            row.append(val)
        rows.append(row)

    from frappe.utils.xlsxutils import make_xlsx
    xlsx_file = make_xlsx(rows, "Custom Site Report")
    
    frappe.response['filename'] = "Custom_Site_Report.xlsx"
    frappe.response['filecontent'] = xlsx_file.getvalue()
    frappe.response['type'] = "binary"

