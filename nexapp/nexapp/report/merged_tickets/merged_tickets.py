import frappe

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {"label": "Ticket ID", "fieldname": "name", "fieldtype": "Link", "options": "HD Ticket", "width": 150},
        {"label": "Circuit ID", "fieldname": "custom_circuit_id", "fieldtype": "Data", "width": 150},
        {"label": "Customer Name", "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 200},
        {"label": "Site Name", "fieldname": "custom_site_name", "fieldtype": "Data", "width": 200},
        {"label": "Merged Customer Email", "fieldname": "merged_emails", "fieldtype": "Data", "width": 300},
        {"label": "Ticket Created Date", "fieldname": "opening_date", "fieldtype": "Date", "width": 150}
    ]

def get_data(filters):
    if not filters:
        filters = {}

    # Basic condition to avoid junk data
    conditions = {"status": ("!=", "Spam")}
    
    # 1. Apply Customer Filter
    if filters.get("customer"):
        conditions["customer"] = filters.get("customer")
    
    # 2. Apply Ticket Created Date (opening_date) Filters
    if filters.get("from_date") and filters.get("to_date"):
        conditions["opening_date"] = ["between", [filters.get("from_date"), filters.get("to_date")]]
    elif filters.get("from_date"):
        conditions["opening_date"] = [">=", filters.get("from_date")]
    elif filters.get("to_date"):
        conditions["opening_date"] = ["<=", filters.get("to_date")]

    # 3. Fetch all tickets matching the basic filters
    tickets = frappe.get_all(
        "HD Ticket",
        filters=conditions,
        fields=["name", "custom_circuit_id", "customer", "custom_site_name", "opening_date"]
    )

    if not tickets:
        return []

    ticket_map = {str(t["name"]): t for t in tickets}
    ticket_names = list(ticket_map.keys())

    # 4. Chunking to avoid database query size limits
    merged_ticket_names = set()
    chunk_size = 1000
    for i in range(0, len(ticket_names), chunk_size):
        chunk = ticket_names[i:i + chunk_size]
        format_strings = ','.join(['%s'] * len(chunk))
        
        # Searching for the system's "already open" auto-response, or manual "merge" comments
        merge_query = f"""
            SELECT DISTINCT c.reference_name as ticket_name
            FROM `tabCommunication` c
            WHERE c.reference_doctype = 'HD Ticket' 
            AND c.reference_name IN ({format_strings})
            AND (c.content LIKE '%%already open%%' OR c.subject LIKE '%%merge%%' OR c.content LIKE '%%merge%%')
            
            UNION
            
            SELECT DISTINCT tc.reference_ticket as ticket_name
            FROM `tabHD Ticket Comment` tc
            WHERE tc.reference_ticket IN ({format_strings})
            AND tc.content LIKE '%%merge%%'
        """
        
        query_params = tuple(chunk) + tuple(chunk)
        merged_results = frappe.db.sql(merge_query, query_params, as_dict=True)
        
        for r in merged_results:
            merged_ticket_names.add(r.ticket_name)

    if not merged_ticket_names:
        return []

    # 5. Build the final rows and extract the customer email
    data = []
    for t_name in merged_ticket_names:
        ticket_doc = ticket_map[t_name]
        
        # Fetch all communications for this ticket to find unique senders
        comms = frappe.get_all(
            "Communication", 
            filters={
                "reference_doctype": "HD Ticket", 
                "reference_name": t_name, 
                "communication_type": "Communication"
            }, 
            fields=["sender"]
        )
        
        # Isolate the customer emails by excluding system emails
        customer_emails = list(set([
            c.sender for c in comms 
            if c.sender 
            and "nms@nexapp.co.in" not in c.sender 
            and "techsupport@nexapp.co.in" not in c.sender
        ]))
        
        data.append({
            "name": t_name,
            "custom_circuit_id": ticket_doc.get("custom_circuit_id"),
            "customer": ticket_doc.get("customer"),
            "custom_site_name": ticket_doc.get("custom_site_name"),
            "merged_emails": ", ".join(customer_emails) if customer_emails else "",
            "opening_date": ticket_doc.get("opening_date")
        })
        
    # Sort the results by Ticket Created Date (Newest first)
    data.sort(key=lambda x: x["opening_date"] if x["opening_date"] else "", reverse=True)
    
    return data
