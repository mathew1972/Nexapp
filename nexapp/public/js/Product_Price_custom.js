frappe.ui.form.on('Item Price', {
    refresh: function(frm) {
        const fields = [
            'details', 'item_code', 'item_name', 'item_group', 
            'gst_hsn_code', 'stock_uom', 'disabled', 
            'allow_alternative_item', 'is_stock_item', 
            'has_variants', 'opening_stock', 'valuation_rate', 
            'standard_rate', 'is_fixed_asset', 'auto_create_assets', 
            'is_grouped_asset', 'asset_category', 'asset_naming_series', 
            'over_delivery_receipt_allowance', 'over_billing_allowance', 
            'image', 'naming_series', 'description', 'brand', 
            'unit_of_measure_conversion', 'uoms', 'dashboard_tab', 
            'shelf_life_in_days', 'end_of_life', 
            'default_material_request_type', 'valuation_method', 
            'warranty_period', 'weight_per_unit', 'weight_uom', 
            'allow_negative_stock', 'sb_barcodes', 'barcodes', 
            'reorder_levels', 'serial_nos_and_batches', 
            'has_batch_no', 'create_new_batch', 'batch_number_series', 
            'has_expiry_date', 'retain_sample', 'sample_quantity', 
            'has_serial_no', 'serial_no_series', 'variant_of', 
            'variant_based_on', 'attributes', 'accounting', 
            'enable_deferred_expense', 'no_of_months_exp', 
            'enable_deferred_revenue', 'no_of_months', 
            'item_defaults', 'purchasing_tab', 'purchase_uom', 
            'min_order_qty', 'safety_stock', 'is_purchase_item', 
            'purchase_details_cb', 'lead_time_days', 'last_purchase_rate', 
            'is_customer_provided_item', 'customer', 'supplier_details', 
            'delivered_by_supplier', 'supplier_items', 
            'foreign_trade_details', 'country_of_origin', 
            'customs_tariff_number', 'sales_details', 'sales_uom', 
            'grant_commission', 'is_sales_item', 'max_discount', 
            'customer_details', 'customer_items', 
            'is_ineligible_for_itc', 'taxes', 
            'inspection_required_before_purchase', 
            'quality_inspection_template', 
            'inspection_required_before_delivery', 'manufacturing', 
            'include_item_in_manufacturing', 'is_sub_contracted_item', 
            'default_bom', 'customer_code', 
            'default_item_manufacturer', 'default_manufacturer_part_no', 
            'total_projected_qty', 'custom_product_type', 'custom_product_category',
            'uom', 'packing_unit', 'item_description', 'price_list_details', 
            'price_list', 'customer', 'supplier', 'batch_no', 'buying', 
            'selling', 'item_details', 'currency', 'price_list_rate', 
            'valid_from', 'lead_time_days', 'valid_upto', 'note', 'reference', 'custom_validity',
            'custom_data_plan', 'custom_billing_terms'
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
    }
})
