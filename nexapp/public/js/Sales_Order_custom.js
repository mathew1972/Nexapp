frappe.ui.form.on('Sales Order', {
    refresh: function(frm) {
        const fields = [
            'title', 'naming_series', 'customer', 'customer_name', 'tax_id',
            'order_type', 'transaction_date', 'delivery_date', 'po_no', 'po_date',
            'company', 'skip_delivery_note', 'is_reverse_charge', 'is_export_with_gst', 
            'amended_from', 'cost_center', 'project', 'currency_and_price_list', 
            'currency', 'conversion_rate', 'selling_price_list', 'price_list_currency', 
            'plc_conversion_rate', 'ignore_pricing_rule', 'sec_warehouse', 
            'scan_barcode', 'set_warehouse', 'reserve_stock', 'items', 'total_qty', 
            'total_net_weight', 'base_total', 'base_net_total', 'total', 'net_total', 
            'tax_category', 'taxes_and_charges', 'shipping_rule', 'incoterm', 
            'named_place', 'taxes', 'base_total_taxes_and_charges', 
            'total_taxes_and_charges', 'totals', 'base_grand_total', 
            'base_rounding_adjustment', 'base_rounded_total', 'base_in_words', 
            'grand_total', 'rounding_adjustment', 'rounded_total', 'in_words', 
            'advance_paid', 'disable_rounded_total', 'apply_discount_on', 
            'base_discount_amount', 'coupon_code', 'additional_discount_percentage', 
            'discount_amount', 'other_charges_calculation', 'packing_list', 
            'packed_items', 'pricing_rule_details', 'pricing_rules', 'contact_info', 
            'billing_address_column', 'customer_address', 'address_display', 
            'billing_address_gstin', 'gst_category', 'place_of_supply', 
            'customer_group', 'territory', 'contact_person', 'contact_display', 
            'contact_phone', 'contact_mobile', 'contact_email', 'shipping_address_column', 
            'shipping_address_name', 'shipping_address', 'dispatch_address_name', 
            'dispatch_address', 'company_address', 'company_gstin', 
            'company_address_display', 'payment_terms_template', 'payment_schedule', 
            'tc_name', 'terms', 'more_info', 'status', 'delivery_status', 
            'per_delivered', 'per_billed', 'per_picked', 'billing_status', 
            'sales_partner', 'amount_eligible_for_commission', 'commission_rate', 
            'total_commission', 'sales_team', 'loyalty_points_redemption', 
            'loyalty_points', 'loyalty_amount', 'from_date', 'to_date', 'auto_repeat', 
            'update_auto_repeat_reference', 'printing_details', 'letter_head', 
            'group_same_items', 'select_print_heading', 'language', 
            'represents_company', 'source', 'inter_company_order_reference', 
            'campaign', 'party_account_currency', 'connections_tab', 
            'ecommerce_gstin'
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
