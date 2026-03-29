frappe.ui.form.on('Supplier', {
    refresh: function(frm) {
        render_bank_account_html(frm);
    },
    after_save: function(frm) {
        render_bank_account_html(frm);
    }
});

function render_bank_account_html(frm) {
    if (!frm.doc.name) {
        frm.fields_dict.custom_bank_details_html.$wrapper.html('');
        return;
    }

    frappe.db.get_list('Bank Account', {
        filters: {
            party_type: 'Supplier',
            party: frm.doc.name
        },
        fields: [
            'account_name',
            'custom_details',
            'bank',
            'account_type',
            'custom_ifsc',
            'bank_account_no',
            'is_default'
        ]
    }).then(records => {
        if (!records || records.length === 0) {
            frm.fields_dict.custom_bank_details_html.$wrapper.html('<p style="color:red;">No linked Bank Account found for this supplier.</p>');
            return;
        }

        let html = '';
        records.forEach((record, i) => {
            html += `
                <div style="width: 100%; border:2px solid #d9534f; background:#fff6f6; padding:30px; margin-bottom:30px; border-radius:12px;">
                    <h4 style="background-color:#f8d7da; color:#721c24; padding:14px 24px; border-radius:8px; margin-bottom:25px; font-size:18px;">
                        🏦 Bank Account ${i + 1}
                    </h4>
                    <table style="width:100%; border-collapse: collapse; font-size:15px;">
                        <tr>
                            <td style="width: 50%; padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Account Name</strong><br>${record.account_name || '-'}</td>
                            <td style="width: 50%; padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Bank</strong><br>${record.bank || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Alias</strong><br>${record.custom_details || '-'}</td>
                            <td style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Account Type</strong><br>${record.account_type || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Bank Account No</strong><br>${record.bank_account_no || '-'}</td>
                            <td style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>IFSC Code</strong><br>${record.custom_ifsc || '-'}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Is Default</strong><br>${record.is_default ? '✅ Yes' : '❌ No'}</td>
                        </tr>
                    </table>
                </div>
            `;
        });

        frm.fields_dict.custom_bank_details_html.$wrapper.html(html);
    });
}

///////////////////////////////////////////////////////////////////////////////////
// Unallocated Amount

frappe.ui.form.on('Supplier', {

    // ---------------------------------------------
    // LOAD SUPPLIER UNALLOCATED AMOUNT
    // ---------------------------------------------
    load_supplier_unallocated_amount(frm) {
        frappe.call({
            method: 'nexapp.api.get_supplier_unallocated_amount',
            args: { supplier: frm.doc.name },
            callback: function (r) {
                if (r.message !== undefined && r.message !== null) {
                    frm.set_value('custom_unallocated_amount', r.message);
                }
            }
        });
    },

    // ---------------------------------------------
    // REFRESH
    // ---------------------------------------------
    refresh(frm) {
        if (frm.is_new()) return;
        frm.trigger('load_supplier_unallocated_amount');
    },

    // ---------------------------------------------
    // BUTTON: OPEN UNALLOCATED PAYMENT ENTRY
    // ---------------------------------------------
    custom_unallocated_amount_details(frm) {

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

        // ---------------------------------------------
        // LOAD PAYMENT ENTRIES (SUPPLIER)
        // ---------------------------------------------
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Payment Entry',
                fields: ['name', 'posting_date', 'reference_no', 'unallocated_amount'],
                filters: {
                    party: frm.doc.name,
                    party_type: 'Supplier',
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

        // ---------------------------------------------
        // SECOND WINDOW (DYNAMIC REMAINING)
        // ---------------------------------------------
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
                        <style>
                            .allocation-table {
                                width: 100%;
                                table-layout: fixed;
                                border-collapse: collapse;
                            }
                            .allocation-table th, .allocation-table td {
                                padding: 8px;
                                vertical-align: middle;
                                border: 1px solid #e5e7eb;
                            }
                            .allocation-table th:first-child, .allocation-table td:first-child {
                                width: 60%;
                            }
                            .allocation-table th:nth-child(2), .allocation-table td:nth-child(2) {
                                width: 30%;
                            }
                            .allocation-table th:last-child, .allocation-table td:last-child {
                                width: 10%;
                                text-align: center;
                            }
                            .ref-container {
                                width: 100%;
                            }
                            .ref-container .control-input-wrapper {
                                width: 100%;
                                margin: 0;
                                padding: 0;
                            }
                            .ref-container .control-input-wrapper input {
                                width: 100% !important;
                                box-sizing: border-box;
                                margin: 0;
                            }
                            .amount-input {
                                width: 100%;
                                box-sizing: border-box;
                                text-align: right;
                            }
                            .remove-row {
                                padding: 4px 8px;
                                white-space: nowrap;
                            }
                        </style>

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
                                <table class="table allocation-table">
                                    <thead>
                                        <tr>
                                            <th>Reference (Purchase Invoice)</th>
                                            <th>Allocated Amount</th>
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

                    // Function to update both total allocated and remaining
                    function update_totals() {
                        let total = 0;
                        w.find('.amount-input').each(function () {
                            total += flt($(this).val());
                        });
                        w.find('#total-amount').text(format_currency(total));
                        let remaining = max_amount - total;
                        w.find('#remaining').text(`Remaining: ${format_currency(remaining)}`);
                        return total;
                    }

                    function add_row() {
                        let row = $(`
                            <tr>
                                <td><div class="ref-container"></div></td>
                                <td><input type="number" class="form-control amount-input"></td>
                                <td><button class="btn btn-danger btn-sm remove-row">✕</button></td>
                            </tr>
                        `);

                        w.find('#alloc-body').append(row);

                        // Create link field for Purchase Invoice
                        let link_field = frappe.ui.form.make_control({
                            parent: row.find('.ref-container')[0],
                            df: {
                                fieldtype: 'Link',
                                fieldname: 'purchase_invoice',
                                label: '',
                                placeholder: 'Select Invoice',
                                options: 'Purchase Invoice',
                                filters: {
                                    supplier: frm.doc.name,
                                    docstatus: 1,                // Only submitted invoices
                                    outstanding_amount: ['>', 0] // With outstanding amount
                                },
                                onchange: function() {
                                    let invoice = this.get_value();
                                    if (invoice) {
                                        // Fetch outstanding amount for the selected invoice
                                        frappe.db.get_value('Purchase Invoice', invoice, 'outstanding_amount', function(data) {
                                            let outstanding = data.outstanding_amount || 0;
                                            row.find('.amount-input').val(outstanding);
                                            update_totals();
                                        });
                                    } else {
                                        row.find('.amount-input').val('');
                                        update_totals();
                                    }
                                }
                            },
                            render_input: true
                        });

                        // Ensure the input field has proper styling
                        let input = row.find('.ref-container input');
                        if (input.length) {
                            input.css({
                                'width': '100%',
                                'box-sizing': 'border-box',
                                'margin': '0'
                            });
                        }

                        // Store reference to the link field for later use
                        row.data('link_field', link_field);

                        row.find('.amount-input').on('input', update_totals);

                        row.find('.remove-row').on('click', function () {
                            row.remove();
                            update_totals();
                        });
                    }

                    w.find('.add-row').on('click', add_row);

                    w.find('.create-btn').on('click', function () {
                        let references = [];
                        let total_allocated = 0;

                        w.find('#alloc-body tr').each(function () {
                            let link_field = $(this).data('link_field');
                            let invoice = link_field ? link_field.get_value() : null;
                            let amount = flt($(this).find('.amount-input').val());

                            if (invoice && amount > 0) {
                                references.push({
                                    purchase_invoice: invoice,
                                    amount: amount
                                });
                                total_allocated += amount;
                            }
                        });

                        if (!references.length) {
                            frappe.msgprint('Please add at least one row with a valid invoice and amount.');
                            return;
                        }

                        if (total_allocated > max_amount) {
                            frappe.msgprint({
                                title: 'Warning',
                                indicator: 'red',
                                message: `Total allocated amount (${format_currency(total_allocated)}) exceeds available amount (${format_currency(max_amount)}). Please adjust allocations.`
                            });
                            return;
                        }

                        frappe.call({
                            method: 'nexapp.api.create_supplier_unallocated_payment_entry',
                            args: {
                                supplier: frm.doc.name,
                                references: references,
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
                                    frm.trigger('load_supplier_unallocated_amount');
                                }
                            }
                        });
                    });

                    // Pre-fill one row
                    add_row();
                }
            });
        }
    }
});