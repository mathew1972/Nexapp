frappe.ui.form.on('Quotation', {
    refresh: function(frm) {
        const fields = [
            'customer_section', 'title', 'quotation_to', 'party_name', 'customer_name',
            'is_reverse_charge', 'is_export_with_gst', 'column_break_7', 'transaction_date', 
            'order_type', 'valid_till', 'company', 'amended_from', 'custom_section_break_0evvy',
            'naming_series', 'column_break_34', 'column_break1', 'currency_and_price_list', 
            'currency', 'conversion_rate', 'column_break2', 'selling_price_list', 'price_list_currency',
            'plc_conversion_rate', 'ignore_pricing_rule', 'items_section', 'scan_barcode', 'items', 
            'sec_break23', 'total_qty', 'total_net_weight', 'column_break_28', 'base_total', 
            'base_net_total', 'column_break_31', 'total', 'net_total', 'taxes_section', 
            'tax_category', 'taxes_and_charges', 'column_break_36', 'shipping_rule', 'incoterm', 
            'named_place', 'section_break_36', 'taxes', 'section_break_39', 'base_total_taxes_and_charges', 
            'column_break_42', 'total_taxes_and_charges', 'totals', 'base_grand_total', 
            'base_rounding_adjustment', 'base_rounded_total', 'base_in_words', 'column_break3', 
            'grand_total', 'rounding_adjustment', 'rounded_total', 'in_words', 'section_break_44', 
            'apply_discount_on', 'base_discount_amount', 'coupon_code', 'column_break_46', 
            'additional_discount_percentage', 'discount_amount', 'referral_sales_partner', 
            'sec_tax_breakup', 'other_charges_calculation', 'section_gst_breakup', 'gst_breakup_table', 
            'bundle_items_section', 'packed_items', 'pricing_rule_details', 'pricing_rules', 
            'address_and_contact_tab', 'billing_address_section', 'customer_address', 'address_display', 
            'billing_address_gstin', 'gst_category', 'place_of_supply', 'col_break98', 
            'contact_person', 'contact_display', 'contact_mobile', 'contact_email', 'shipping_address_section', 
            'shipping_address_name', 'column_break_81', 'shipping_address', 'company_address_section', 
            'company_address', 'company_gstin', 'column_break_87', 'company_address_display', 
            'terms_tab', 'payment_schedule_section', 'payment_terms_template', 'payment_schedule', 
            'terms_section_break', 'tc_name', 'terms', 'more_info_tab', 'subscription_section', 
            'auto_repeat', 'update_auto_repeat_reference', 'print_settings', 'letter_head', 
            'group_same_items', 'column_break_73', 'select_print_heading', 'language', 
            'lost_reasons_section', 'lost_reasons', 'competitors', 'column_break_117', 
            'order_lost_reason', 'additional_info_section', 'status', 'customer_group', 
            'territory', 'column_break_108', 'campaign', 'source', 'column_break4', 
            'opportunity', 'supplier_quotation', 'enq_det', 'connections_tab'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                // Apply styles based on whether the field is required
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

                // Apply focus and blur effects
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
    }
});
