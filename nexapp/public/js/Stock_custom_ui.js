// Customizations for Delivery Note Doctype
frappe.ui.form.on('Delivery Note', {
    refresh: function(frm) {
        const deliveryNoteFields = [
            'naming_series', 'customer', 'tax_id', 'customer_name', 'ewaybill', 'column_break1', 
            'posting_date', 'posting_time', 'set_posting_time', 'is_reverse_charge', 'is_export_with_gst', 
            // List continues with other fields...
        ];

        applyFieldStyles(frm, deliveryNoteFields);
    }
});

// Customizations for Material Request Doctype
frappe.ui.form.on('Material Request', {
    refresh: function(frm) {
        const materialRequestFields = [
            'type_section', 'naming_series', 'title', 'material_request_type', 'customer', 'company', 
            // List continues with other fields...
        ];

        applyFieldStyles(frm, materialRequestFields);
    }
});

// Customizations for Stock Entry Doctype
frappe.ui.form.on('Stock Entry', {
    refresh: function(frm) {
        const stockEntryFields = [
            'stock_entry_details_tab', 'naming_series', 'stock_entry_type', 'outgoing_stock_entry', 
            'purpose', 'add_to_transit', 'work_order', 'purchase_order', 'subcontracting_order', 
            'delivery_note_no', 'sales_invoice_no', 'pick_list', 'purchase_receipt_no', 'asset_repair', 
            'ewaybill', 'col2', 'company', 'posting_date', 'posting_time', 'column_break_eaoa', 
            'set_posting_time', 'inspection_required', 'apply_putaway_rule', 'bom_info_section', 
            'from_bom', 'use_multi_level_bom', 'bom_no', 'cb1', 'fg_completed_qty', 'get_items', 
            'section_break_7qsm', 'process_loss_percentage', 'column_break_e92r', 'process_loss_qty', 
            'section_break_jwgn', 'from_warehouse', 'source_warehouse_address', 'source_address_display', 
            'cb0', 'to_warehouse', 'target_warehouse_address', 'target_address_display', 'sb0', 
            'scan_barcode', 'items_section', 'items', 'get_stock_and_rate', 'section_break_taxes', 
            'taxes_and_charges', 'taxes', 'section_break_total', 'total_taxes', 'cb_grand_total', 
            'base_grand_total', 'section_break_19', 'total_outgoing_value', 'column_break_22', 
            'total_incoming_value', 'value_difference', 'section_break_ref_doc', 'fetch_original_doc_ref', 
            'doc_references', 'additional_costs_section', 'additional_costs', 'total_additional_costs', 
            'supplier_info_tab', 'contact_section', 'supplier', 'supplier_name', 'supplier_address', 
            'address_display', 'tab_break_ewaybill', 'section_break_addresses_contact', 'bill_from_address', 
            'bill_from_address_display', 'bill_from_gstin', 'bill_from_gst_category', 'cb_billing_address', 
            'bill_to_address', 'bill_to_address_display', 'bill_to_gstin', 'bill_to_gst_category', 
            'place_of_supply', 'section_break_shipping_address', 'ship_from_address', 'ship_from_address_display', 
            'cb_shipping_address', 'ship_to_address', 'ship_to_address_display', 'transporter_info', 
            'transporter', 'gst_transporter_id', 'lr_no', 'vehicle_no', 'distance', 'transporter_col_break', 
            'transporter_name', 'mode_of_transport', 'lr_date', 'gst_vehicle_type', 'accounting_dimensions_section', 
            'project', 'other_info_tab', 'printing_settings', 'select_print_heading', 'print_settings_col_break', 
            'letter_head', 'more_info', 'is_opening', 'remarks', 'col5', 'per_transferred', 'total_amount', 
            'job_card', 'amended_from', 'credit_note', 'is_return', 'tab_connections'
        ];

        applyFieldStyles(frm, stockEntryFields);
    }
});

// Customizations for Purchase Receipt Doctype
frappe.ui.form.on('Purchase Receipt', {
    refresh: function(frm) {
        const purchaseReceiptFields = [
            'supplier_section', 'column_break0', 'title', 'naming_series', 'supplier', 'supplier_name', 
            'ewaybill', 'supplier_delivery_note', 'subcontracting_receipt', 'column_break1', 'posting_date', 
            'posting_time', 'set_posting_time', 'column_break_12', 'company', 'apply_putaway_rule', 
            'is_return', 'return_against', 'accounting_dimensions_section', 'cost_center', 'dimension_col_break', 
            'project', 'currency_and_price_list', 'currency', 'conversion_rate', 'column_break2', 
            'buying_price_list', 'price_list_currency', 'plc_conversion_rate', 'ignore_pricing_rule', 
            'sec_warehouse', 'scan_barcode', 'column_break_31', 'set_warehouse', 'set_from_warehouse', 
            'col_break_warehouse', 'rejected_warehouse', 'is_subcontracted', 'supplier_warehouse', 
            'items_section', 'items', 'section_break0', 'total_qty', 'total_net_weight', 'column_break_43', 
            'base_total', 'base_net_total', 'column_break_27', 'total', 'net_total', 'tax_withholding_net_total', 
            'base_tax_withholding_net_total', 'taxes_charges_section', 'tax_category', 'taxes_and_charges', 
            'shipping_col', 'shipping_rule', 'column_break_53', 'incoterm', 'named_place', 'taxes_section', 
            'taxes', 'totals', 'base_taxes_and_charges_added', 'base_taxes_and_charges_deducted', 
            'base_total_taxes_and_charges', 'column_break3', 'taxes_and_charges_added', 
            'taxes_and_charges_deducted', 'total_taxes_and_charges', 'section_break_46', 'base_grand_total', 
            'base_rounding_adjustment', 'base_rounded_total', 'base_in_words', 'column_break_50', 'grand_total', 
            'rounding_adjustment', 'rounded_total', 'in_words', 'disable_rounded_total', 'section_break_42', 
            'apply_discount_on', 'base_discount_amount', 'column_break_44', 'additional_discount_percentage', 
            'discount_amount', 'sec_tax_breakup', 'other_charges_calculation', 'section_gst_breakup', 
            'gst_breakup_table', 'pricing_rule_details', 'pricing_rules', 'raw_material_details', 
            'get_current_stock', 'supplied_items', 'address_and_contact_tab', 'section_addresses', 
            'supplier_address', 'address_display', 'supplier_gstin', 'gst_category', 'col_break_address', 
            'contact_person', 'contact_display', 'contact_mobile', 'contact_email', 'section_break_98', 
            'shipping_address', 'column_break_100', 'shipping_address_display', 'billing_address_section', 
            'billing_address', 'column_break_104', 'billing_address_display', 'company_gstin', 'place_of_supply', 
            'terms_tab', 'tc_name', 'terms', 'more_info_tab', 'status_section', 'status', 'column_break4', 
            'per_billed', 'per_returned', 'subscription_detail', 'auto_repeat', 'printing_settings', 'letter_head', 
            'group_same_items', 'column_break_97', 'select_print_heading', 'language', 'transporter_info', 
            'transporter', 'gst_transporter_id', 'transporter_name', 'vehicle_no', 'distance', 'mode_of_transport', 
            'column_break5', 'lr_no', 'lr_date', 'driver', 'driver_name', 'gst_vehicle_type', 'gst_section', 
            'ineligibility_reason', 'additional_info_section', 'instructions', 'is_internal_supplier', 
            'represents_company', 'inter_company_reference', 'column_break_131', 'remarks', 'range', 
            'amended_from', 'is_old_subcontracting_flow', 'other_details', 'connections_tab', 'is_reverse_charge'
        ];

        applyFieldStyles(frm, purchaseReceiptFields);
    }
});

// Customizations for Item Doctype
frappe.ui.form.on('Item', {
    refresh: function(frm) {
        const itemFields = [
            'details', 'item_code', 'item_name', 'item_group', 'gst_hsn_code', 'stock_uom', 'disabled', 
            'allow_alternative_item', 'is_stock_item', 'has_variants', 'opening_stock', 'valuation_rate', 
            'standard_rate', 'is_fixed_asset', 'auto_create_assets', 'is_grouped_asset', 'asset_category', 
            'asset_naming_series', 'over_delivery_receipt_allowance', 'over_billing_allowance', 'image', 
            'naming_series', 'description', 'brand', 'unit_of_measure_conversion', 'uoms', 'dashboard_tab', 
            'shelf_life_in_days', 'end_of_life', 'default_material_request_type', 'valuation_method', 
            'warranty_period', 'weight_per_unit', 'weight_uom', 'allow_negative_stock', 'sb_barcodes', 
            'barcodes', 'reorder_levels', 'serial_nos_and_batches', 'has_batch_no', 'create_new_batch', 
            'batch_number_series', 'has_expiry_date', 'retain_sample', 'sample_quantity', 'has_serial_no', 
            'serial_no_series', 'variant_of', 'variant_based_on', 'attributes', 'accounting', 
            'enable_deferred_expense', 'no_of_months_exp', 'enable_deferred_revenue', 'no_of_months', 
            'item_defaults', 'purchasing_tab', 'purchase_uom', 'min_order_qty', 'safety_stock', 
            'is_purchase_item', 'purchase_details_cb', 'lead_time_days', 'last_purchase_rate', 
            'is_customer_provided_item', 'customer', 'supplier_details', 'delivered_by_supplier', 
            'supplier_items', 'foreign_trade_details', 'country_of_origin', 'customs_tariff_number', 
            'sales_details', 'sales_uom', 'grant_commission', 'is_sales_item', 'max_discount', 
            'customer_details', 'customer_items', 'is_ineligible_for_itc', 'taxes', 
            'inspection_required_before_purchase', 'quality_inspection_template', 
            'inspection_required_before_delivery', 'manufacturing', 'include_item_in_manufacturing', 
            'is_sub_contracted_item', 'default_bom', 'customer_code', 'default_item_manufacturer', 
            'default_manufacturer_part_no', 'total_projected_qty', 'custom_product_type', 
            'custom_product_category'
        ];

        applyFieldStyles(frm, itemFields);
    }
});

// Customizations for Item Group Doctype
frappe.ui.form.on('Item Group', {
    refresh: function(frm) {
        const itemGroupFields = [
            'gs', 'item_group_name', 'parent_item_group', 'is_group', 'image', 
            'column_break_5', 'defaults', 'gst_hsn_code', 'item_group_defaults', 
            'sec_break_taxes', 'taxes', 'lft', 'old_parent', 'rgt'
        ];

        applyFieldStyles(frm, itemGroupFields);
    }
});

// Customizations for Product Bundle Doctype
frappe.ui.form.on('Product Bundle', {
    refresh: function(frm) {
        const productBundleFields = [
            'basic_section', 'new_item_code', 'description', 'column_break_eonk', 
            'disabled', 'item_section', 'items', 'section_break_4', 'about'
        ];

        applyFieldStyles(frm, productBundleFields);
    }
});

// Customizations for Shipping Rule Doctype
frappe.ui.form.on('Shipping Rule', {
    refresh: function(frm) {
        const shippingRuleFields = [
            'label', 'disabled', 'column_break_4', 'shipping_rule_type', 
            'section_break_10', 'company', 'column_break_12', 'account', 
            'accounting_dimensions_section', 'cost_center', 'dimension_col_break', 
            'shipping_amount_section', 'calculate_based_on', 'column_break_8', 
            'shipping_amount', 'rule_conditions_section', 'conditions', 
            'section_break_6', 'countries'
        ];

        applyFieldStyles(frm, shippingRuleFields);
    }
});

// Customizations for Item Alternative Doctype
frappe.ui.form.on('Item Alternative', {
    refresh: function(frm) {
        const itemAlternativeFields = [
            'item_code', 'alternative_item_code', 'two_way', 
            'column_break_4', 'item_name', 'alternative_item_name'
        ];

        applyFieldStyles(frm, itemAlternativeFields);
    }
});

// Customizations for Pick List Doctype
frappe.ui.form.on('Pick List', {
    refresh: function(frm) {
        const pickListFields = [
            'naming_series', 'company', 'purpose', 'customer', 'customer_name', 
            'work_order', 'material_request', 'for_qty', 'column_break_4', 
            'parent_warehouse', 'consider_rejected_warehouses', 'get_item_locations', 
            'pick_manually', 'ignore_pricing_rule', 'section_break_6', 
            'scan_barcode', 'column_break_13', 'scan_mode', 'prompt_qty', 
            'section_break_15', 'locations', 'amended_from', 
            'print_settings_section', 'group_same_items', 'status'
        ];

        applyFieldStyles(frm, pickListFields);
    }
});

// Customizations for Warehouse Doctype
frappe.ui.form.on('Warehouse', {
    refresh: function(frm) {
        const warehouseFields = [
            'warehouse_detail', 'disabled', 'warehouse_name', 'column_break_3', 
            'is_group', 'parent_warehouse', 'is_rejected_warehouse', 
            'column_break_4', 'account', 'company', 'address_and_contact', 
            'address_html', 'column_break_10', 'contact_html', 'warehouse_contact_info', 
            'email_id', 'phone_no', 'mobile_no', 'column_break0', 'address_line_1', 
            'address_line_2', 'city', 'state', 'pin', 'transit_section', 
            'warehouse_type', 'column_break_qajx', 'default_in_transit_warehouse', 
            'tree_details', 'lft', 'rgt', 'old_parent'
        ];

        applyFieldStyles(frm, warehouseFields);
    }
});

// Customizations for UOM Doctype
frappe.ui.form.on('UOM', {
    refresh: function(frm) {
        const uomFields = [
            'uom_name', 'must_be_whole_number'
        ];

        applyFieldStyles(frm, uomFields);
    }
});

// Customizations for UOM Doctype
frappe.ui.form.on('UOM', {
    refresh: function(frm) {
        const uomFields = [
            'uom_name', 'must_be_whole_number'
        ];

        applyFieldStyles(frm, uomFields);
    }
});

// Customizations for Brand Doctype
frappe.ui.form.on('Brand', {
    refresh: function(frm) {
        const brandFields = [
            'brand', 'image', 'description', 'defaults', 'brand_defaults'
        ];

        applyFieldStyles(frm, brandFields);
    }
});

// Customizations for Item Attribute Doctype
frappe.ui.form.on('Item Attribute', {
    refresh: function(frm) {
        const attributeFields = [
            'attribute_name', 'numeric_values', 'section_break_4', 
            'from_range', 'increment', 'column_break_8', 
            'to_range', 'section_break_5', 'item_attribute_values'
        ];

        applyFieldStyles(frm, attributeFields);
    }
});

// Customizations for Serial No Doctype
frappe.ui.form.on('Serial No', {
    refresh: function(frm) {
        const serialNoFields = [
            'details', 'column_break0', 'serial_no', 'item_code', 'batch_no', 'warehouse', 
            'purchase_rate', 'column_break1', 'status', 'item_name', 'description', 
            'item_group', 'brand', 'asset_details', 'asset', 'asset_status', 
            'column_break_24', 'location', 'employee', 'warranty_amc_details', 
            'column_break6', 'warranty_expiry_date', 'amc_expiry_date', 
            'column_break7', 'maintenance_status', 'warranty_period', 'more_info', 
            'company', 'column_break_2cmm', 'work_order', 'purchase_document_no'
        ];

        applyFieldStyles(frm, serialNoFields);
    }
});

// Customizations for Batch Doctype
frappe.ui.form.on('Batch', {
    refresh: function(frm) {
        const batchFields = [
            'sb_disabled', 'disabled', 'column_break_24', 'use_batchwise_valuation', 
            'sb_batch', 'batch_id', 'item', 'item_name', 'image', 'parent_batch', 
            'manufacturing_date', 'column_break_3', 'batch_qty', 'stock_uom', 'expiry_date', 
            'source', 'supplier', 'column_break_9', 'reference_doctype', 'reference_name', 
            'section_break_7', 'description', 'manufacturing_section', 'qty_to_produce', 
            'column_break_23', 'produced_qty'
        ];

        applyFieldStyles(frm, batchFields);
    }
});

// Customizations for Installation Note Doctype
frappe.ui.form.on('Installation Note', {
    refresh: function(frm) {
        const installationNoteFields = [
            'installation_note', 'column_break0', 'naming_series', 'customer', 
            'customer_address', 'contact_person', 'customer_name', 'address_display', 
            'contact_display', 'contact_mobile', 'contact_email', 'territory', 
            'customer_group', 'column_break1', 'inst_date', 'inst_time', 'status', 
            'company', 'amended_from', 'remarks', 'item_details', 'items'
        ];

        applyFieldStyles(frm, installationNoteFields);
    }
});

// Customizations for Stock Reconciliation Doctype
frappe.ui.form.on('Stock Reconciliation', {
    refresh: function(frm) {
        const stockReconciliationFields = [
            'naming_series', 'company', 'purpose', 'col1', 'posting_date', 'posting_time', 
            'set_posting_time', 'section_break_8', 'set_warehouse', 'section_break_22', 
            'scan_barcode', 'column_break_12', 'scan_mode', 'sb9', 'items', 'section_break_9', 
            'expense_account', 'column_break_13', 'difference_amount', 'amended_from', 
            'accounting_dimensions_section', 'cost_center', 'dimension_col_break'
        ];

        applyFieldStyles(frm, stockReconciliationFields);
    }
});

// Customizations for Landed Cost Voucher Doctype
frappe.ui.form.on('Landed Cost Voucher', {
    refresh: function(frm) {
        const landedCostVoucherFields = [
            'naming_series', 'company', 'column_break_2', 'posting_date', 'section_break_5', 
            'purchase_receipts', 'purchase_receipt_items', 'get_items_from_purchase_receipts', 
            'items', 'sec_break1', 'taxes', 'section_break_9', 'total_taxes_and_charges', 
            'col_break1', 'distribute_charges_based_on', 'amended_from', 'sec_break2', 
            'landed_cost_help'
        ];

        applyFieldStyles(frm, landedCostVoucherFields);
    }
});

// Customizations for Packing Slip Doctype
frappe.ui.form.on('Packing Slip', {
    refresh: function(frm) {
        const packingSlipFields = [
            'packing_slip_details', 'column_break0', 'delivery_note', 'column_break1', 
            'naming_series', 'section_break0', 'column_break2', 'from_case_no', 
            'column_break3', 'to_case_no', 'package_item_details', 'items', 
            'package_weight_details', 'net_weight_pkg', 'net_weight_uom', 'column_break4', 
            'gross_weight_pkg', 'gross_weight_uom', 'letter_head_details', 'letter_head', 
            'misc_details', 'amended_from'
        ];

        applyFieldStyles(frm, packingSlipFields);
    }
});

// Customizations for Quality Inspection Doctype
frappe.ui.form.on('Quality Inspection', {
    refresh: function(frm) {
        const qualityInspectionFields = [
            'naming_series', 'report_date', 'status', 'manual_inspection', 'column_break_4', 
            'inspection_type', 'reference_type', 'reference_name', 'section_break_7', 
            'item_code', 'item_serial_no', 'batch_no', 'sample_size', 'column_break1', 
            'item_name', 'description', 'bom_no', 'specification_details', 
            'quality_inspection_template', 'readings', 'section_break_14', 
            'inspected_by', 'verified_by', 'column_break_17', 'remarks', 'amended_from'
        ];

        applyFieldStyles(frm, qualityInspectionFields);
    }
});

// Customizations for Quality Inspection Template Doctype
frappe.ui.form.on('Quality Inspection Template', {
    refresh: function(frm) {
        const qualityInspectionTemplateFields = [
            'quality_inspection_template_name', 'item_quality_inspection_parameter'
        ];

        applyFieldStyles(frm, qualityInspectionTemplateFields);
    }
});

// Customizations for Quick Stock Balance Doctype
frappe.ui.form.on('Quick Stock Balance', {
    refresh: function(frm) {
        const quickStockBalanceFields = [
            'No.', 'Label', 'Type', 'Name', 'Mandatory', 'Options',
            'warehouse', 'date', 'item_barcode', 'item', 'col_break', 
            'item_name', 'item_description', 'image', 'sec_break', 
            'qty', 'col_break2', 'value'
        ];

        applyFieldStyles(frm, quickStockBalanceFields);
    }
});


// Helper function to apply styles to specified fields
function applyFieldStyles(frm, fields) {
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
                $(this).css({
                    'border': '1px solid #80bdff',
                    'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                    'background-color': '#ffffff'
                });
            });

            fieldElement.on('blur', function() {
                $(this).css({
                    'border': '1px solid #ccc',
                    'box-shadow': 'none',
                    'background-color': '#ffffff'
                });
            });
        }
    });

}
