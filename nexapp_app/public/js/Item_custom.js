frappe.ui.form.on('Item', { 
    refresh: function(frm) { 
        // List of all fields to be styled 
        const fields = [ 
            'details', 'naming_series', 'item_code', 'item_name', 'item_group', 'gst_hsn_code', 
            'is_nil_exempt', 'is_non_gst', 'stock_uom', 'column_break0', 'disabled', 
            'show_in_mobile', 'allow_alternative_item', 'is_stock_item', 'has_variants', 
            'opening_stock', 'valuation_rate', 'standard_rate', 'is_fixed_asset', 
            'auto_create_assets', 'is_grouped_asset', 'asset_category', 'asset_naming_series', 
            'over_delivery_receipt_allowance', 'over_billing_allowance', 'image', 'section_break_11', 
            'description', 'brand', 'unit_of_measure_conversion', 'uoms', 'dashboard_tab', 
            'inventory_section', 'inventory_settings_section', 'shelf_life_in_days', 'end_of_life', 
            'default_material_request_type', 'valuation_method', 'column_break1', 'warranty_period', 
            'weight_per_unit', 'weight_uom', 'allow_negative_stock', 'sb_barcodes', 'barcodes', 
            'reorder_section', 'reorder_levels', 'serial_nos_and_batches', 'has_batch_no', 
            'create_new_batch', 'batch_number_series', 'has_expiry_date', 'retain_sample', 
            'sample_quantity', 'column_break_37', 'has_serial_no', 'serial_no_series', 
            'variants_section', 'variant_of', 'variant_based_on', 'attributes', 'accounting', 
            'deferred_accounting_section', 'enable_deferred_expense', 'no_of_months_exp', 
            'column_break_9s9o', 'enable_deferred_revenue', 'no_of_months', 'section_break_avcp', 
            'item_defaults', 'purchasing_tab', 'purchase_uom', 'min_order_qty', 'safety_stock', 
            'is_purchase_item', 'purchase_details_cb', 'lead_time_days', 'last_purchase_rate', 
            'is_customer_provided_item', 'customer', 'supplier_details', 'delivered_by_supplier', 
            'column_break2', 'supplier_items', 'foreign_trade_details', 'country_of_origin', 
            'column_break_59', 'customs_tariff_number', 'sales_details', 'sales_uom', 
            'grant_commission', 'is_sales_item', 'column_break3', 'max_discount', 'customer_details', 
            'customer_items', 'item_tax_section_break', 'is_ineligible_for_itc', 'taxes', 
            'quality_tab', 'inspection_required_before_purchase', 'quality_inspection_template', 
            'inspection_required_before_delivery', 'manufacturing', 'include_item_in_manufacturing', 
            'is_sub_contracted_item', 'default_bom', 'column_break_74', 'customer_code', 
            'default_item_manufacturer', 'default_manufacturer_part_no', 'custom_item','total_projected_qty' 
        ]; 

        // Apply styles and focus/blur effects for each field in the list
        fields.forEach(function(field) { 
            if (frm.fields_dict[field]) { 
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select'); 
                
                // Check if the field is mandatory
                if (['naming_series', 'item_code', 'item_name', 'item_group', 'stock_uom', 'gst_hsn_code', 'custom_item'].includes(field)) { 
                    // Apply red left border (red strip) for mandatory fields
                    fieldElement.css({ 
                        'border': '1px solid #ccc', // Normal border on all sides
                        'border-left': '5px solid red', // Red left border as the "red strip"
                        'border-radius': '7px', // Rounded corners
                        'padding': '5px', // Padding inside the input box
                        'outline': 'none', // Remove default outline
                        'background-color': '#ffffff', // White background on load
                        'transition': '0.3s ease-in-out' // Smooth transition for border and background change
                    }); 
                } else { 
                    // Apply normal border for non-mandatory fields
                    fieldElement.css({ 
                        'border': '1px solid #ccc', // Thin border
                        'border-radius': '7px', // Rounded corners
                        'padding': '5px', // Padding inside the input box
                        'outline': 'none', // Remove default outline
                        'background-color': '#ffffff', // White background on load
                        'transition': '0.3s ease-in-out' // Smooth transition for border and background change
                    }); 
                } 
                
                // Add focus event
                fieldElement.on('focus', function() { 
                    // Check if the field is mandatory
                    if (['naming_series', 'item_code', 'item_name', 'item_group', 'stock_uom'].includes(field)) { 
                        $(this).css({ 
                            'border': '1px solid #80bdff', // Light blue border on all sides
                            'border-left': '5px solid red', // Maintain red left border for mandatory fields
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)', // Glowing effect with blue shadow
                            'background-color': '#ffffff' // Keep white background on focus
                        }); 
                    } else { 
                        $(this).css({ 
                            'border': '1px solid #80bdff', // Light blue border for non-mandatory fields
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)', // Glowing effect with blue shadow
                            'background-color': '#ffffff' // Keep white background on focus
                        }); 
                    } 
                }); 
                
                // Add blur event to revert to original border and background
                fieldElement.on('blur', function() { 
                    // Re-apply appropriate border style based on whether the field is mandatory
                    if (['naming_series', 'item_code', 'item_name', 'item_group', 'stock_uom'].includes(field)) { 
                        $(this).css({ 
                            'border': '1px solid #ccc', // Normal border on all sides
                            'border-left': '5px solid red', // Red left border as the "red strip"
                            'box-shadow': 'none', // Remove glowing effect
                            'background-color': '#ffffff' // Reset to white background
                        }); 
                    } else { 
                        $(this).css({ 
                            'border': '1px solid #ccc', // Thin border for non-mandatory fields
                            'box-shadow': 'none', // Remove glowing effect
                            'background-color': '#ffffff' // Reset to white background
                        }); 
                    } 
                }); 
            } 
        }); 
        
        // Apply thin blue line under 'inventory_section'
        if (frm.fields_dict['inventory_section']) { 
            const sectionBreakElement = $(frm.fields_dict['inventory_section'].wrapper); 
            sectionBreakElement.css({ 
                'border-bottom': '2px solid #007bff', // Thin blue line
                'margin-bottom': '15px' // Optional: Space below the line
            }); 
        } 
    } 
});
