frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        const fields = [
            'basic_info', 'naming_series', 'salutation', 'customer_name', 
            'customer_type', 'customer_group', 'territory', 'gender', 
            'lead_name', 'opportunity_name', 'prospect_name', 'account_manager', 
            'image', 'defaults_tab', 'default_currency', 'default_bank_account', 
            'default_price_list', 'is_internal_customer', 'represents_company', 
            'companies', 'more_info', 'market_segment', 'industry', 
            'customer_pos_id', 'website', 'language', 'customer_details', 
            'address_contacts', 'address_html', 'contact_html', 
            'primary_address_and_contact_detail', 'customer_primary_address', 
            'primary_address', 'customer_primary_contact', 'mobile_no', 
            'email_id', 'tax_tab', 'tax_id', 'column_break_21', 
            'tax_category', 'tax_withholding_category', 'gstin', 'pan', 
            'gst_category', 'payment_terms', 'credit_limits', 
            'default_receivable_accounts', 'accounts', 'loyalty_program', 
            'loyalty_program_tier', 'sales_team', 'default_sales_partner', 
            'default_commission_rate', 'settings_tab', 'so_required', 
            'dn_required', 'is_frozen', 'disabled', 'portal_users'
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
});

