frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        const fields = [
            'title', 'customer', 'due_date', 'irn', 'customer_name', 'ewaybill', 
            'e_waybill_status', 'tax_id', 'company', 'company_tax_id', 
            'posting_date', 'posting_time', 'set_posting_time', 'is_pos', 
            'pos_profile', 'is_consolidated', 'is_return', 'return_against', 
            'update_outstanding_for_self', 'update_billed_amount_in_sales_order', 
            'update_billed_amount_in_delivery_note', 'is_debit_note', 
            'is_reverse_charge', 'is_export_with_gst', 'amended_from', 
            'naming_series', 'cost_center', 'project', 'currency_and_price_list', 
            'currency', 'conversion_rate', 'selling_price_list', 'price_list_currency', 
            'plc_conversion_rate', 'ignore_pricing_rule', 'scan_barcode', 
            'update_stock', 'set_warehouse', 'set_target_warehouse', 'items', 
            'total_qty', 'total_net_weight', 'base_total', 'base_net_total', 
            'total', 'net_total', 'tax_category', 'taxes_and_charges', 
            'shipping_rule', 'incoterm', 'named_place', 'taxes', 
            'base_total_taxes_and_charges', 'total_taxes_and_charges', 'totals', 
            'base_grand_total', 'base_rounding_adjustment', 'base_rounded_total', 
            'base_in_words', 'grand_total', 'rounding_adjustment', 
            'use_company_roundoff_cost_center', 'rounded_total', 'in_words', 
            'total_advance', 'outstanding_amount', 'disable_rounded_total', 
            'apply_discount_on', 'base_discount_amount', 'is_cash_or_non_trade_discount', 
            'additional_discount_account', 'additional_discount_percentage', 
            'discount_amount', 'other_charges_calculation', 'pricing_rule_details', 
            'pricing_rules', 'packing_list', 'packed_items', 'product_bundle_help', 
            'time_sheet_list', 'timesheets', 'total_billing_hours', 
            'total_billing_amount', 'payments_tab', 'cash_bank_account', 'payments', 
            'base_paid_amount', 'paid_amount', 'base_change_amount', 'change_amount', 
            'account_for_change_amount', 'allocate_advances_automatically', 
            'only_include_allocated_payments', 'get_advances', 'advances', 
            'write_off_amount', 'base_write_off_amount', 
            'write_off_outstanding_amount_automatically', 'write_off_account', 
            'write_off_cost_center', 'loyalty_points_redemption', 'redeem_loyalty_points', 
            'loyalty_points', 'loyalty_amount', 'loyalty_program', 
            'loyalty_redemption_account', 'loyalty_redemption_cost_center', 
            'contact_and_address_tab', 'address_and_contact', 'customer_address', 
            'address_display', 'billing_address_gstin', 'gst_category', 
            'place_of_supply', 'contact_person', 'contact_display', 'contact_mobile', 
            'contact_email', 'territory', 'shipping_address_name', 'shipping_address', 
            'port_address', 'dispatch_address_name', 'dispatch_address', 
            'company_address', 'company_gstin', 'company_address_display', 'terms_tab', 
            'ignore_default_payment_terms_template', 'payment_terms_template', 
            'payment_schedule', 'tc_name', 'terms', 'more_info_tab', 
            'customer_po_details', 'po_no', 'po_date', 'more_info', 'debit_to', 
            'party_account_currency', 'is_opening', 'unrealized_profit_loss_account', 
            'against_income_account', 'sales_partner', 'amount_eligible_for_commission', 
            'commission_rate', 'total_commission', 'sales_team', 
            'edit_printing_settings', 'letter_head', 'group_same_items', 'invoice_copy', 
            'select_print_heading', 'language', 'transporter_info', 'transporter', 
            'gst_transporter_id', 'driver', 'lr_no', 'vehicle_no', 'distance', 
            'transporter_name', 'mode_of_transport', 'driver_name', 'lr_date', 
            'gst_vehicle_type', 'ecommerce_gstin', 'port_code', 'shipping_bill_number', 
            'shipping_bill_date', 'ecommerce_supply_type', 'subscription', 'from_date', 
            'auto_repeat', 'to_date', 'update_auto_repeat_reference', 'more_information', 
            'status', 'einvoice_status', 'inter_company_invoice_reference', 'campaign', 
            'represents_company', 'source', 'customer_group', 'is_internal_customer', 
            'is_discounted', 'remarks', 'connections_tab', 'custom_start_date', 'custom_end_date',
            'custom_sales_order', 'custom_order_type','custom_invoice_mode'
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


frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 0) {
            // Add a custom top-level button named "Subscription Update"
            frm.add_custom_button(__('Subscription Update'), function () {
                run_subscription_mapping(frm);
            }).addClass('custom-update-btn');

            // Apply custom styles (black, white text, bold, oval shape)
            setTimeout(() => {
                const btn = document.querySelector('.custom-update-btn');
                if (btn) {
                    btn.style.backgroundColor = '#000000';  // Black background
                    btn.style.color = '#ffffff';            // White text
                    btn.style.fontWeight = 'bold';          // Bold font
                    btn.style.border = 'none';
                    btn.style.padding = '8px 20px';
                    btn.style.borderRadius = '999px';       // Oval shape
                    btn.style.marginRight = '8px';
                }
            }, 100);
        }
    }
});

// Logic to run when Subscription Update button is clicked
function run_subscription_mapping(frm) {
    if (frm.doc.subscription) {
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Subscription',
                name: frm.doc.subscription
            },
            callback: function(response) {
                if (response.message) {
                    let subscription_doc = response.message;
                    let circuits = [];
                    let site_names = [];

                    // Set header-level fields
                    frm.set_value('po_no', subscription_doc.custom_customers_purchase_orde);
                    frm.set_value('po_date', subscription_doc.custom_customers_purchase_order_date);
                    frm.set_value('custom_start_date', subscription_doc.current_invoice_start);
                    frm.set_value('custom_end_date', subscription_doc.current_invoice_end);
                    frm.set_value('custom_sales_order', subscription_doc.custom_sales_order);
                    frm.set_value('custom_order_type', 'Service');

                    // Collect values from child table in Subscription
                    if (subscription_doc.plans) {
                        subscription_doc.plans.forEach(plan => {
                            circuits.push(plan.custom_circuit || "");
                            site_names.push(plan.custom_site_name || "");
                        });
                    }

                    // Update child table in Sales Invoice
                    if (frm.doc.items && frm.doc.items.length > 0) {
                        frm.doc.items.forEach((item, index) => {
                            if (circuits[index]) {
                                frappe.model.set_value(item.doctype, item.name, 'custom_circuit_id', circuits[index]);
                            }
                            if (site_names[index]) {
                                frappe.model.set_value(item.doctype, item.name, 'custom_site_info', site_names[index]);
                            }
                        });

                        frm.refresh_field('items');
                    }

                    // Save and refresh the form
                    frm.save_or_update();
                }
            }
        });
    }
}

frappe.ui.form.on('Sales Invoice', {
    is_return: function(frm) {
        if (frm.doc.is_return) {
            frm.set_value('naming_series', 'CN-.YY.-');
        } else {
            frm.set_value('naming_series', 'INV-.YY.-');
        }
    }
});