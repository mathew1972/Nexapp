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

    // --------------------------------------------------
    // Load Outstanding Sales Invoices (Child Table)
    // --------------------------------------------------
    load_outstanding_invoices(frm) {

        frm.clear_table('custom_outstanding_amount');

        frappe.call({
            method: 'nexapp.api.get_customer_outstanding_invoices',
            args: {
                customer: frm.doc.name
            },
            callback: function (r) {
                if (!r.message) return;

                r.message.forEach(inv => {
                    let row = frm.add_child('custom_outstanding_amount');
                    row.sales_invoice_no = inv.sales_invoice_no;
                    row.sales_invoice_date = inv.sales_invoice_date;
                    row.outstanding_amount = inv.outstanding_amount;
                    // unallocated_amount is USER INPUT
                });

                frm.refresh_field('custom_outstanding_amount');
            }
        });
    },

    // --------------------------------------------------
    // Load Customer Unallocated Amount (TOP FIELD)
    // Source: Ledger (Advance Balance)
    // --------------------------------------------------
    load_customer_unallocated_amount(frm) {

        frappe.call({
            method: 'nexapp.api.get_customer_unallocated_amount',
            args: {
                customer: frm.doc.name
            },
            callback: function (r) {
                if (r.message !== undefined && r.message !== null) {
                    // ✅ THIS FIELD EXISTS
                    frm.set_value('custom_unallocated_amount', r.message);
                }
            }
        });
    },

    // --------------------------------------------------
    // On Customer Form Refresh
    // --------------------------------------------------
    refresh(frm) {

        if (frm.is_new()) return;

        frm.trigger('load_outstanding_invoices');
        frm.trigger('load_customer_unallocated_amount');
    },

    // --------------------------------------------------
    // Button: Create Unallocated Payment Entry
    // --------------------------------------------------
    custom_create_unallocated_payment_entry(frm) {

        let invoices = [];

        frm.doc.custom_outstanding_amount.forEach(row => {

            if (
                row.sales_invoice_no &&
                row.unallocated_amount &&
                flt(row.unallocated_amount) > 0
            ) {

                // 🔒 Validation
                if (flt(row.unallocated_amount) > flt(row.outstanding_amount)) {
                    frappe.throw(
                        __('Unallocated Amount cannot exceed Outstanding Amount for Sales Invoice {0}', [
                            row.sales_invoice_no
                        ])
                    );
                }

                invoices.push({
                    sales_invoice_no: row.sales_invoice_no,
                    amount: row.unallocated_amount
                });
            }
        });

        if (!invoices.length) {
            frappe.msgprint(__('Enter Unallocated Amount for at least one invoice.'));
            return;
        }

        frappe.call({
            method: 'nexapp.api.create_unallocated_payment_entry',
            args: {
                customer: frm.doc.name,
                invoices: invoices
            },
            freeze: true,
            freeze_message: __('Creating Payment Entry...'),
            callback: function (r) {

                if (r.message && r.message.payment_entry) {

                    frappe.msgprint({
                        title: __('Success'),
                        indicator: 'green',
                        message: __(
                            'Payment Entry <b>{0}</b> has been successfully created.',
                            [r.message.payment_entry]
                        )
                    });

                    // 🔑 Refresh after reconciliation
                    frm.trigger('load_outstanding_invoices');
                    frm.trigger('load_customer_unallocated_amount');
                }
            }
        });
    }
});
