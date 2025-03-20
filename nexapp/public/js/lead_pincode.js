frappe.ui.form.on('Lead', {
    refresh: function(frm) {
        const fields = [
            'naming_series', 'salutation', 'first_name', 'middle_name', 'last_name',
            'lead_name', 'job_title', 'gender', 'source', 'lead_owner', 'status',
            'customer', 'type', 'request_type', 'email_id', 'website', 
            'mobile_no', 'whatsapp_no', 'phone', 'phone_ext', 'company_name',
            'no_of_employees', 'annual_revenue', 'industry', 'market_segment',
            'territory', 'country', 'city', 'fax', 'state', 'contact_html', 'custom_description_',
            'custom_secondary_email', 'custom_description', 'qualification_status', 'qualified_by',
            'qualified_on', 'campaign_name', 'company', 'language', 'custom_pin_code', 'custom_district',
            'custom_linkedin_possible_profile__', 'custom_interested_for__', 'custom_street__'
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
});
