frappe.ui.form.on('Project', {
    refresh: function(frm) {
        const fields = [
            'naming_series', 'project_name', 'status', 'project_type', 'is_active', 
            'percent_complete_method', 'percent_complete', 'column_break_5', 
            'project_template', 'expected_start_date', 'expected_end_date', 
            'priority', 'department', 'customer_details', 'customer', 
            'column_break_14', 'sales_order', 'users_section', 'users', 
            'copied_from', 'section_break0', 'notes', 'section_break_18', 
            'actual_start_date', 'actual_time', 'column_break_20', 'actual_end_date', 
            'project_details', 'estimated_costing', 'total_costing_amount', 
            'total_expense_claim', 'total_purchase_cost', 'company', 
            'column_break_28', 'total_sales_amount', 'total_billable_amount', 
            'total_billed_amount', 'total_consumed_material_cost', 'cost_center', 
            'margin', 'gross_margin', 'column_break_37', 'per_gross_margin', 
            'monitor_progress', 'collect_progress', 'holiday_list', 'frequency', 
            'from_time', 'to_time', 'first_email', 'second_email', 'daily_time_to_send', 
            'day_to_send', 'weekly_time_to_send', 'column_break_45', 'message'
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
