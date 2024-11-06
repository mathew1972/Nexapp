frappe.ui.form.on('Payment Entry', {
    refresh: function(frm) {
        const fields = [
            'type_of_payment', 'naming_series', 'payment_type', 'payment_order_status', 
            'posting_date', 'company', 'mode_of_payment', 'party_type', 'party', 
            'party_name', 'book_advance_payments_in_separate_party_account', 
            'reconcile_on_advance_payment_date', 'bank_account', 'party_bank_account', 
            'contact_person', 'contact_email', 'party_balance', 'paid_from', 
            'paid_from_account_type', 'paid_from_account_currency', 
            'paid_from_account_balance', 'paid_to', 'paid_to_account_type', 
            'paid_to_account_currency', 'paid_to_account_balance', 'paid_amount', 
            'paid_amount_after_tax', 'source_exchange_rate', 'base_paid_amount', 
            'base_paid_amount_after_tax', 'received_amount', 'received_amount_after_tax', 
            'target_exchange_rate', 'base_received_amount', 'base_received_amount_after_tax', 
            'get_outstanding_invoices', 'get_outstanding_orders', 'references', 
            'total_allocated_amount', 'base_total_allocated_amount', 
            'set_exchange_gain_loss', 'unallocated_amount', 'difference_amount', 
            'write_off_difference_amount', 'purchase_taxes_and_charges_template', 
            'sales_taxes_and_charges_template', 'apply_tax_withholding_amount', 
            'tax_withholding_category', 'taxes', 'base_total_taxes_and_charges', 
            'total_taxes_and_charges', 'deductions', 'company_address', 'company_gstin', 
            'place_of_supply', 'customer_address', 'billing_address_gstin', 
            'gst_category', 'transaction_references', 'reference_no', 'reference_date', 
            'clearance_date', 'project', 'cost_center', 'status', 'custom_remarks', 
            'remarks', 'base_in_words', 'is_opening', 'letter_head', 'print_heading', 
            'bank', 'bank_account_no', 'payment_order', 'in_words', 'auto_repeat', 
            'amended_from', 'title'
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
})
