frappe.ui.form.on('Opportunity', {
    refresh: function(frm) {
        const fields = [
            'naming_series', 'opportunity_from', 'party_name', 'customer_name', 'status',
            'opportunity_type', 'source', 'opportunity_owner', 'sales_stage', 'expected_closing',
            'probability', 'no_of_employees', 'annual_revenue', 'customer_group', 'industry',
            'market_segment', 'website', 'city', 'state', 'country', 'territory', 'currency',
            'conversion_rate', 'opportunity_amount', 'base_opportunity_amount', 'more_info',
            'company', 'campaign', 'transaction_date', 'language', 'amended_from', 'title',
            'first_response_time', 'lost_reasons', 'order_lost_reason', 'competitors', 'contact_info',
            'contact_person', 'job_title', 'contact_email', 'contact_mobile', 'whatsapp', 'phone',
            'phone_ext', 'address_html', 'customer_address', 'address_display', 'contact_html',
            'contact_display', 'items', 'base_total', 'total', 'activities_tab',
            'open_activities_html', 'all_activities_html', 'notes_tab', 'notes_html', 'notes',
            'dashboard_tab'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                // Check if the field is mandatory
                if (frm.fields_dict[field].df.reqd) {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-left': '4px solid red', // Red left border for mandatory fields
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

                // Add focus event
                fieldElement.on('focus', function() {
                    fieldElement.css({
                        'border': '1px solid #80bdff',
                        'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                        'background-color': '#ffffff'
                    });
                });

                // Add blur event
                fieldElement.on('blur', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        fieldElement.css({
                            'border': '1px solid #ccc',
                            'border-left': '4px solid red',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    } else {
                        fieldElement.css({
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
