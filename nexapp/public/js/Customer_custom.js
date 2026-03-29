frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        const fields = [
            'basic_info', 'naming_series', 'salutation', 'customer_name', 
            'customer_type', 'customer_group', 'territory', 'gender', 
            'lead_name', 'opportunity_name', 'prospect_name', 'account_manager', 
            'image', 'defaults_tab', 'default_currency', 'default_bank_account', 
            'default_price_list', 'is_internal_customer', 'represents_company', 
            'companies', 'more_info', 'market_segment', 'industry', 
            'customer_pos_id', 'website', 'language', 'customer_details', 
            'address_contacts', 'address_html', 'contact_html', 
            'primary_address_and_contact_detail', 'customer_primary_address', 
            'primary_address', 'customer_primary_contact', 'mobile_no', 
            'email_id', 'tax_tab', 'tax_id', 'column_break_21', 
            'tax_category', 'tax_withholding_category', 'gstin', 'pan', 
            'gst_category', 'payment_terms', 'credit_limits', 
            'default_receivable_accounts', 'accounts', 'loyalty_program', 
            'loyalty_program_tier', 'sales_team', 'default_sales_partner', 
            'default_commission_rate', 'settings_tab', 'so_required', 
            'dn_required', 'is_frozen', 'disabled', 'portal_users'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                if (frm.fields_dict[field].df.reqd) {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-left': '4px solid red',
                        'border-radius': '7px',
                        'padding': '5px',
                        'outline': 'none',
                        'background-color': '#ffffff',
                        'transition': '0.3s ease-in-out'
                    });
                } else {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-radius': '7px',
                        'padding': '5px',
                        'outline': 'none',
                        'background-color': '#ffffff',
                        'transition': '0.3s ease-in-out'
                    });
                }

                fieldElement.on('focus', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #80bdff',
                            'border-left': '5px solid red',
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                            'background-color': '#ffffff'
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #80bdff',
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                            'background-color': '#ffffff'
                        });
                    }
                });

                fieldElement.on('blur', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #ccc',
                            'border-left': '5px solid red',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #ccc',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    }
                });
            }
        });

        let style = `
            .input-icon-right-wrapper {
                position: relative;
                display: inline-block;
                width: 100%;
            }
            .input-icon-right-wrapper input {
                padding-right: 40px;
                width: 100%;
                box-sizing: border-box;
            }
            .input-icon-right {
                position: absolute;
                right: 4px;
                top: 50%;
                transform: translateY(-50%);
                color: #888;
                pointer-events: none;
            }
            .input-icon-right i {
                font-size: 18px;
            }
        `;
        let styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = style;
        document.head.appendChild(styleSheet);

        // Set query for opportunity_owner to dynamically load user list
        frm.set_query('opportunity_owner', function() {
            return {
                query: 'frappe.core.doctype.user.user.user_query',
                filters: { 'enabled': 1 }
            };
        });
    }
});

///////////////////////////////////////////////////////////////////////////////////

frappe.ui.form.on('Customer', {

    load_outstanding_invoices(frm) {
        frm.clear_table('custom_outstanding_amount');

        frappe.call({
            method: 'nexapp.api.get_customer_outstanding_invoices',
            args: { customer: frm.doc.name },
            callback: function (r) {
                if (!r.message) return;

                r.message.forEach(inv => {
                    let row = frm.add_child('custom_outstanding_amount');
                    row.sales_invoice_no = inv.sales_invoice_no;
                    row.sales_invoice_date = inv.sales_invoice_date;
                    row.outstanding_amount = inv.outstanding_amount;
                });

                frm.refresh_field('custom_outstanding_amount');
            }
        });
    },

    load_customer_unallocated_amount(frm) {
        frappe.call({
            method: 'nexapp.api.get_customer_unallocated_amount',
            args: { customer: frm.doc.name },
            callback: function (r) {
                if (r.message !== undefined && r.message !== null) {
                    frm.set_value('custom_unallocated_amount', r.message);
                }
            }
        });
    },

    refresh(frm) {
        if (frm.is_new()) return;

        frm.trigger('load_outstanding_invoices');
        frm.trigger('load_customer_unallocated_amount');
    },

    custom_create_unallocated_payment_entry(frm) {

        let selected_entry = null;
        let total_all_amount = 0;

        let d = new frappe.ui.Dialog({
            title: 'Unallocated Payment Entries',
            size: 'extra-large',
            fields: [{ fieldname: 'html', fieldtype: 'HTML' }]
        });

        d.show();

        let wrapper = d.fields_dict.html.$wrapper;

        d.$wrapper.find('.modal-dialog').css({
            'max-width': '90%',
            'margin-top': '20px'
        });

        d.$wrapper.find('.modal-content').css({
            'height': '85vh',
            'display': 'flex',
            'flex-direction': 'column'
        });

        wrapper.html(`
            <div style="text-align:center; padding:40px;">
                <div class="spinner-border text-primary"></div>
                <p>Loading Payment Entries...</p>
            </div>
        `);

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Payment Entry',
                fields: ['name', 'posting_date', 'reference_no', 'unallocated_amount'],
                filters: {
                    party: frm.doc.name,
                    unallocated_amount: ['>', 0],
                    docstatus: 1
                },
                limit_page_length: 50
            },
            callback: function (r) {

                let data = r.message || [];

                if (!data.length) {
                    wrapper.html(`<div style="padding:40px; text-align:center;">No records found</div>`);
                    return;
                }

                total_all_amount = 0;
                data.forEach(row => {
                    total_all_amount += flt(row.unallocated_amount);
                });

                let html = `
                    <div style="display:flex; flex-direction:column; height:100%;">

                        <div style="flex:1; overflow-y:auto; border:1px solid #e5e7eb; border-radius:8px;">
                            <table class="table" style="margin:0;">
                                <thead style="background:#f9fafb; position:sticky; top:0;">
                                    <tr>
                                        <th style="width:40px;"></th>
                                        <th>Payment Entry</th>
                                        <th>Posting Date</th>
                                        <th>Reference No</th>
                                        <th style="text-align:right;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                data.forEach(row => {
                    html += `
                        <tr data-name="${row.name}">
                            <td><input type="checkbox" class="pe-check"></td>

                            <td style="color:#2563eb; cursor:pointer;"
                                onclick="frappe.set_route('Form','Payment Entry','${row.name}')">
                                ${row.name}
                            </td>

                            <td>${frappe.datetime.str_to_user(row.posting_date) || '-'}</td>

                            <td>${row.reference_no || '-'}</td>

                            <td style="text-align:right; font-weight:600;">
                                ${format_currency(row.unallocated_amount)}
                            </td>
                        </tr>
                    `;
                });

                html += `
                                </tbody>
                            </table>
                        </div>

                        <div style="border-top:1px solid #e5e7eb;padding:12px 16px;display:flex;justify-content:space-between;">
                            <div style="font-weight:600;">
                                Total Available: ${format_currency(total_all_amount)}
                            </div>

                            <button class="btn btn-primary continue-btn">
                                Continue
                            </button>
                        </div>
                    </div>
                `;

                wrapper.html(html);

                wrapper.find('.pe-check').on('change', function () {
                    wrapper.find('.pe-check').not(this).prop('checked', false);
                    wrapper.find('tr').css('background', '');

                    let row = $(this).closest('tr');
                    let name = row.data('name');

                    if (this.checked) {
                        selected_entry = name;
                        row.css('background', '#eef6ff');
                    } else {
                        selected_entry = null;
                    }
                });

                wrapper.find('.continue-btn').on('click', function () {
                    if (!selected_entry) {
                        frappe.msgprint('Please select a Payment Entry.');
                        return;
                    }

                    d.hide();
                    open_allocation_window(selected_entry);
                });
            }
        });

        function open_allocation_window(payment_entry_name) {

            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Payment Entry',
                    name: payment_entry_name
                },
                callback: function (res) {

                    let pe = res.message;
                    let max_amount = flt(pe.unallocated_amount);

                    let dialog = new frappe.ui.Dialog({
                        title: 'Allocate Payment Entry',
                        size: 'extra-large',
                        fields: [{ fieldname: 'html', fieldtype: 'HTML' }]
                    });

                    dialog.show();

                    let w = dialog.fields_dict.html.$wrapper;

                    w.html(`
                        <div style="display:flex;flex-direction:column;height:80vh;padding:20px;">
                            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:15px;background:#f5f7fa;padding:15px;border-radius:10px;">
                                <div><b>Payment Entry</b><br>${pe.name}</div>
                                <div><b>Posting Date</b><br>${frappe.datetime.str_to_user(pe.posting_date)}</div>
                                <div><b>Reference No</b><br>${pe.reference_no || '-'}</div>
                                <div><b>Amount</b><br>${format_currency(max_amount)}</div>
                            </div>

                            <div id="remaining" style="font-weight:600;margin-bottom:10px;">
                                Remaining: ${format_currency(max_amount)}
                            </div>

                            <div style="flex:1;overflow-y:auto;border:1px solid #e5e7eb;border-radius:10px;">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Sales Invoice</th>
                                            <th>Outstanding Amount</th>
                                            <th>Allocated Amount</th>
                                            <th>Account Head</th>
                                            <th>TDS Amount</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody id="alloc-body"></tbody>
                                </table>
                            </div>

                            <div style="display:flex;justify-content:space-between;margin-top:10px;">
                                <button class="btn btn-light add-row">+ Add Row</button>

                                <div>
                                    <b>Total Allocated:</b>
                                    <span id="total-amount">₹ 0.00</span>

                                    <button class="btn btn-primary create-btn">
                                        Create Payment Entry
                                    </button>
                                </div>
                            </div>
                        </div>
                    `);

                    let invoices_list = [];

                    frappe.call({
                        method: 'nexapp.api.get_customer_outstanding_invoices',
                        args: { customer: frm.doc.name },
                        callback: function (r) {
                            invoices_list = r.message || [];
                            add_row();
                        }
                    });

                    function update_total() {
                        let total = 0;

                        w.find('.amount-input').each(function () {
                            total += flt($(this).val());
                        });

                        w.find('#total-amount').text(format_currency(total));
                        return total;
                    }

                    function add_row() {

                        let options = `<option value="">Select Invoice</option>`;
                        invoices_list.forEach(inv => {
                            options += `<option value="${inv.sales_invoice_no}" data-amount="${inv.outstanding_amount}">
                                ${inv.sales_invoice_no}
                            </option>`;
                        });

                        let row = $(`
                            <tr>
                                <td><select class="form-control invoice-select">${options}</select></td>
                                <td><input type="number" class="form-control outstanding-amount" readonly value="0"></td>
                                <td><input type="number" class="form-control amount-input" placeholder="Enter amount"></td>
                                <td><input type="text" class="form-control account-head" value="TDS Receivable - NTPL"></td>
                                <td><input type="number" class="form-control tds-input" value="0"></td>
                                <td><button class="btn btn-danger btn-sm remove-row">✕</button></td>
                            </tr>
                        `);

                        w.find('#alloc-body').append(row);

                        row.find('.invoice-select').on('change', function () {
                            let amt = $(this).find(':selected').data('amount') || 0;
                            row.find('.outstanding-amount').val(amt);
                        });

                        row.find('.amount-input').on('input', update_total);

                        row.find('.remove-row').on('click', function () {
                            row.remove();
                            update_total();
                        });
                    }

                    w.find('.add-row').on('click', add_row);

                    w.find('.create-btn').on('click', function () {

                        let invoices = [];
                        let taxes = [];

                        w.find('#alloc-body tr').each(function () {

                            let invoice = $(this).find('.invoice-select').val();
                            let amount = flt($(this).find('.amount-input').val());
                            let tds = flt($(this).find('.tds-input').val());
                            let account = $(this).find('.account-head').val();

                            if (invoice && amount > 0) {
                                invoices.push({
                                    sales_invoice_no: invoice,
                                    amount: amount
                                });
                            }

                            if (tds > 0) {
                                taxes.push({
                                    account_head: account,
                                    amount: tds
                                });
                            }
                        });

                        if (!invoices.length && !taxes.length) {
                            frappe.msgprint('Please add at least Invoice or TDS.');
                            return;
                        }

                        frappe.call({
                            method: 'nexapp.api.create_unallocated_payment_entry',
                            args: {
                                customer: frm.doc.name,
                                invoices: invoices,
                                taxes: taxes,
                                selected_payment_entry: payment_entry_name
                            },
                            freeze: true,
                            freeze_message: 'Creating Payment Entry...',
                            callback: function (r) {

                                if (r.message) {
                                    frappe.msgprint({
                                        title: 'Success',
                                        indicator: 'green',
                                        message: `Payment Entry <b>${r.message.payment_entry}</b> created`
                                    });

                                    dialog.hide();

                                    frm.trigger('load_outstanding_invoices');
                                    frm.trigger('load_customer_unallocated_amount');
                                }
                            }
                        });
                    });
                }
            });
        }
    }
});