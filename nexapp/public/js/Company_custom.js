frappe.ui.form.on('Company', {
    refresh: function(frm) {
        const fields = [
            'details', 'company_name', 'abbr', 'default_currency', 'country', 'default_gst_rate', 
            'is_group', 'default_holiday_list', 'cb0', 'default_letter_head', 'tax_id', 'domain', 
            'date_of_establishment', 'parent_company', 'tax_details_section', 'gstin', 'pan', 
            'tax_details_column_break', 'gst_category', 'company_info', 'company_logo', 
            'date_of_incorporation', 'phone_no', 'email', 'company_description', 'column_break1', 
            'date_of_commencement', 'fax', 'website', 'address_html', 'registration_info', 
            'registration_details', 'lft', 'rgt', 'old_parent', 'accounts_tab', 'section_break_28', 
            'create_chart_of_accounts_based_on', 'existing_company', 'column_break_26', 
            'chart_of_accounts', 'default_settings', 'default_bank_account', 'default_cash_account', 
            'default_receivable_account', 'round_off_account', 'round_off_cost_center', 
            'write_off_account', 'exchange_gain_loss_account', 'unrealized_exchange_gain_loss_account', 
            'unrealized_profit_loss_account', 'default_customs_expense_account', 
            'default_gst_expense_account', 'column_break0', 'allow_account_creation_against_child_company', 
            'default_payable_account', 'default_expense_account', 'default_income_account', 
            'default_deferred_revenue_account', 'default_deferred_expense_account', 
            'default_discount_account', 'payment_terms', 'cost_center', 'default_finance_book', 
            'default_customs_payable_account', 'advance_payments_section', 
            'book_advance_payments_in_separate_party_account', 'reconcile_on_advance_payment_date', 
            'column_break_fwcf', 'default_advance_received_account', 'default_advance_paid_account', 
            'exchange_rate_revaluation_settings_section', 'auto_exchange_rate_revaluation', 
            'auto_err_frequency', 'submit_err_jv', 'budget_detail', 'exception_budget_approver_role', 
            'fixed_asset_defaults', 'accumulated_depreciation_account', 'depreciation_expense_account', 
            'series_for_depreciation_entry', 'expenses_included_in_asset_valuation', 'column_break_40', 
            'disposal_account', 'depreciation_cost_center', 'capital_work_in_progress_account', 
            'asset_received_but_not_billed', 'buying_and_selling_tab', 'sales_settings', 
            'default_buying_terms', 'sales_monthly_history', 'monthly_sales_target', 'total_monthly_sales', 
            'column_break_goals', 'default_selling_terms', 'default_warehouse_for_sales_return', 
            'credit_limit', 'hr_and_payroll_tab', 'hr_settings_section', 
            'default_expense_claim_payable_account', 'default_employee_advance_account', 'column_break_10', 
            'default_payroll_payable_account', 'transactions_annual_history', 'stock_tab', 
            'auto_accounting_for_stock_settings', 'enable_perpetual_inventory', 
            'enable_provisional_accounting_for_non_stock_items', 'default_inventory_account', 
            'stock_adjustment_account', 'default_in_transit_warehouse', 'column_break_32', 
            'stock_received_but_not_billed', 'default_provisional_account', 
            'expenses_included_in_valuation', 'manufacturing_section', 'default_operating_cost_account', 
            'dashboard_tab', 'print_options', 'show_physical_signature', 'logo_for_printing', 
            'bank_details_for_printing', 'registration_details_for_printing'
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
