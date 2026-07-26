import frappe

def execute(filters=None):
    if not filters:
        filters = {}

    columns = get_columns()
    data = get_data(filters)
    
    if not data:
        return columns, [], None, None, []
        
    opening_balance = data[0].get("running_balance", 0)
    
    total_debit = sum([float(row.get("debit") or 0) for row in data[1:]])
    total_credit = sum([float(row.get("credit") or 0) for row in data[1:]])
    closing_balance = data[-1].get("running_balance", 0) if data else 0

    company_currency = frappe.defaults.get_global_default("default_currency")
    if filters.get("bank_account"):
        company = frappe.db.get_value("Account", filters.get("bank_account"), "company")
        if company:
            company_currency = frappe.db.get_value("Company", company, "default_currency")

    report_summary = [
        {
            "value": opening_balance,
            "indicator": "Blue",
            "label": "Opening Balance",
            "datatype": "Currency",
            "currency": company_currency
        },
        {
            "value": total_debit,
            "indicator": "Green",
            "label": "Total Debit",
            "datatype": "Currency",
            "currency": company_currency
        },
        {
            "value": total_credit,
            "indicator": "Red",
            "label": "Total Credit",
            "datatype": "Currency",
            "currency": company_currency
        },
        {
            "value": closing_balance,
            "indicator": "Blue",
            "label": "Closing Balance",
            "datatype": "Currency",
            "currency": company_currency
        }
    ]

    return columns, data, None, None, report_summary

def get_columns():
    return [
        {"label": "Bank", "fieldname": "bank", "fieldtype": "Data", "width": 200},
        {"label": "Posting Date", "fieldname": "posting_date", "fieldtype": "Data", "width": 120},
        {"label": "Payment Date", "fieldname": "payment_date", "fieldtype": "Date", "width": 120},
        {"label": "Supplier/Customer Name", "fieldname": "party_name", "fieldtype": "Data", "width": 250},
        {"label": "Cheque/Reference No", "fieldname": "reference_no", "fieldtype": "Data", "width": 180},
        {"label": "Cheque/Reference Date", "fieldname": "reference_date", "fieldtype": "Date", "width": 120},
        {"label": "Debit", "fieldname": "debit", "fieldtype": "Currency", "width": 120},
        {"label": "Credit", "fieldname": "credit", "fieldtype": "Currency", "width": 120},
        {"label": "Balance", "fieldname": "running_balance", "fieldtype": "Currency", "width": 150}
    ]

def get_data(filters):
    bank_account = filters.get("bank_account")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    if not (bank_account and from_date and to_date):
        return []

    # Get Opening Balance
    opening_balance_result = frappe.db.sql("""
        SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
        FROM `tabGL Entry`
        WHERE account = %s AND posting_date < %s AND is_cancelled = 0
    """, (bank_account, from_date))
    
    opening_balance = opening_balance_result[0][0] if opening_balance_result else 0

    data = []
    
    # Opening Balance Row
    data.append({
        "bank": bank_account,
        "posting_date": "Opening",
        "payment_date": "",
        "party_name": "Opening Balance",
        "reference_no": "",
        "reference_date": "",
        "debit": None,
        "credit": None,
        "running_balance": opening_balance
    })

    # Get Transactions
    gl_entries = frappe.db.sql("""
        SELECT 
            name, posting_date, voucher_type, voucher_no, debit, credit, creation
        FROM `tabGL Entry`
        WHERE 
            account = %s 
            AND posting_date BETWEEN %s AND %s 
            AND is_cancelled = 0 
            AND voucher_type IN ('Payment Entry', 'Journal Entry')
        ORDER BY posting_date ASC, creation ASC
    """, (bank_account, from_date, to_date), as_dict=True)

    running_balance = opening_balance

    for entry in gl_entries:
        running_balance += (entry.debit - entry.credit)
        
        party_name = ""
        reference_no = ""
        reference_date = ""
        payment_date = entry.posting_date

        if entry.voucher_type == "Payment Entry":
            pe = frappe.db.get_value("Payment Entry", entry.voucher_no, 
                ["party_name", "party", "reference_no", "reference_date"], as_dict=True)
            if pe:
                party_name = pe.party_name or pe.party or ""
                reference_no = pe.reference_no or ""
                reference_date = pe.reference_date or ""
                
        elif entry.voucher_type == "Journal Entry":
            je = frappe.db.get_value("Journal Entry", entry.voucher_no, 
                ["cheque_no", "cheque_date"], as_dict=True)
            if je:
                reference_no = je.cheque_no or ""
                reference_date = je.cheque_date or ""
                
            # Opposite party from Journal Entry Accounts
            jea_party = frappe.db.sql("""
                SELECT party_type, party
                FROM `tabJournal Entry Account`
                WHERE parent = %s AND account != %s AND party_type IN ('Customer', 'Supplier', 'Employee', 'Shareholder')
                LIMIT 1
            """, (entry.voucher_no, bank_account), as_dict=True)
            
            if jea_party and jea_party[0].party:
                party_name = jea_party[0].party
                try:
                    if jea_party[0].party_type == "Customer":
                        party_name = frappe.db.get_value("Customer", jea_party[0].party, "customer_name") or jea_party[0].party
                    elif jea_party[0].party_type == "Supplier":
                        party_name = frappe.db.get_value("Supplier", jea_party[0].party, "supplier_name") or jea_party[0].party
                    elif jea_party[0].party_type == "Employee":
                        party_name = frappe.db.get_value("Employee", jea_party[0].party, "employee_name") or jea_party[0].party
                    elif jea_party[0].party_type == "Shareholder":
                        party_name = frappe.db.get_value("Shareholder", jea_party[0].party, "title") or jea_party[0].party
                except Exception:
                    pass
            else:
                party_name = "Journal Entry"

        data.append({
            "bank": bank_account,
            "posting_date": frappe.utils.formatdate(entry.posting_date),
            "payment_date": payment_date,
            "party_name": party_name,
            "reference_no": reference_no,
            "reference_date": reference_date,
            "debit": entry.debit,
            "credit": entry.credit,
            "running_balance": running_balance
        })

    return data
