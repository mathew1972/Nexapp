frappe.ui.form.on('Sales Order', {
    refresh: function (frm) {
        // List of fields to apply custom styles to
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
            'ecommerce_gstin', 'custom_customers_po', 'custom_customers__po_date',
            'custom_customer_purchase_amount'
        ];

        // Apply custom styles and interactions to each field
        fields.forEach(function (field) {
            const fieldWrapper = frm.fields_dict[field]?.wrapper;
            if (!fieldWrapper) return; // Skip if the field does not exist

            const fieldElement = $(fieldWrapper).find('input, textarea, select');
            const isDropdown = frm.fields_dict[field].df.fieldtype === 'Select';
            const isRequired = frm.fields_dict[field].df.reqd;

            // Base styles
            fieldElement.css({
                'border': '1px solid #ccc',
                'border-radius': '7px',
                'padding': isDropdown ? '5px 10px' : '5px',
                'outline': 'none',
                'background-color': '#ffffff',
                'transition': '0.3s ease-in-out',
                'height': isDropdown ? 'auto' : 'initial'
            });

            // Required field style
            if (isRequired) {
                fieldElement.css({ 'border-left': '4px solid red' });
            }

            // Focus event
            fieldElement.on('focus', function () {
                $(this).css({
                    'border': '1px solid #80bdff',
                    'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                    'background-color': '#ffffff'
                });

                if (isRequired) {
                    $(this).css({ 'border-left': '5px solid red' });
                }
            });

            // Blur event
            fieldElement.on('blur', function () {
                $(this).css({
                    'border': '1px solid #ccc',
                    'box-shadow': 'none',
                    'background-color': '#ffffff'
                });

                if (isRequired) {
                    $(this).css({ 'border-left': '5px solid red' });
                }
            });
        });

        // Example: Style the "delivery_status" button
        const deliveryStatusButton = frm.fields_dict['delivery_status']?.wrapper;
        if (deliveryStatusButton) {
            const buttonElement = $(deliveryStatusButton).find('button');

            buttonElement.css({
                'background-color': '#008CBA', // Stable blue background
                'border': 'none',
                'color': 'white',
                'padding': '10px 20px',
                'text-align': 'center',
                'text-decoration': 'none',
                'font-size': '14px',
                'margin': '4px 2px',
                'cursor': 'pointer',
                'border-radius': '12px', // Rounded corners
                'transition': 'background-color 0.3s ease, box-shadow 0.3s ease',
                'box-shadow': '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)' // Subtle shadow
            });

            // Add hover effect
            buttonElement.hover(
                function () {
                    $(this).css({
                        'background-color': '#5ABBE8',
                        'box-shadow': '0 6px 8px rgba(0,0,0,0.15), 0 4px 6px rgba(0,0,0,0.1)'
                    });
                },
                function () {
                    $(this).css({
                        'background-color': '#008CBA',
                        'box-shadow': '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)'
                    });
                }
            );
        }
    }
});
