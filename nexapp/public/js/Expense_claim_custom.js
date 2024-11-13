frappe.ui.form.on('Expense Claim', {
    refresh: function(frm) {
        const fields = [
            'expenses_and_advances_tab', 'naming_series', 'employee', 'employee_name', 
            'department', 'company', 'column_break_5', 'expense_approver', 
            'approval_status', 'expense_details', 'expenses', 'taxes_and_charges_sb', 
            'taxes', 'advance_payments_sb', 'advances', 'transactions_section', 
            'total_sanctioned_amount', 'total_taxes_and_charges', 'total_advance_amount', 
            'column_break_17', 'grand_total', 'total_claimed_amount', 'total_amount_reimbursed', 
            'accounting_details_tab', 'accounting_details', 'posting_date', 'is_paid', 
            'mode_of_payment', 'payable_account', 'column_break_24', 'clearance_date', 
            'remark', 'accounting_dimensions_section', 'project', 'dimension_col_break', 
            'cost_center', 'more_info_tab', 'more_details', 'status', 'task', 
            'amended_from', 'column_break_xdzn', 'delivery_trip', 'vehicle_log', 
            'dashboard_tab'
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
