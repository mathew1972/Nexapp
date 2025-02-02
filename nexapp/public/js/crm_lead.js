frappe.ui.form.on('CRM Lead', {
    refresh: function(frm) {
        const fields = [
            'details', 'lead_owner', 'organization', 'website', 'source', 'custom_qualified_on',
            'status', 'job_title', 'territory', 'industry', 'custom_linkedin_possible_profile',
            'first_name', 'last_name', 'mobile_no', 'salutation', 'email',
            'lead_name', 'naming_series', 'gender', 'phone', 'middle_name',
            'no_of_employees', 'annual_revenue', 'image', 'converted',
            'sla', 'sla_creation', 'sla_status', 'communication_status',
            'response_by', 'first_response_time', 'first_responded_on'
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
    }
});

frappe.ui.form.on('CRM Deal', {
    custom_stage: function(frm) {
        update_probability_and_revenue(frm);
    },
    custom_deal_amount: function(frm) {
        update_probability_and_revenue(frm);
    }
});

function update_probability_and_revenue(frm) {
    let probability_map = {
        "Qualification": 10,
        "Needs Analysis": 20,
        "Value Proposition": 40,
        "Identifying Decision Makers": 60,
        "Proposal/Price Quote": 75,
        "Negotiation/Review": 90,
        "Close Won": 100,
        "Close Drop": 0,
        "Close Loss to Competition": 0
    };
}
