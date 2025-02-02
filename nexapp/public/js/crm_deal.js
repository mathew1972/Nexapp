frappe.ui.form.on('CRM Deal', {
    refresh: function(frm) {
        const fields = [
            'organization', 'custom_deal_name', 'custom_type', 'source', 'custom_nos_units', 'naming_series', 
            'next_step', 'custom_lob__', 'status', 'custom_deal_amount', 'close_date', 'custom_stage', 'industry', 
            'probability', 'custom_expected_revenue__', 'custom_description', 'contacts', 'contact', 'lead', 
            'lead_name', 'organization_name', 'website', 'no_of_employees', 'job_title', 'territory', 'currency', 
            'annual_revenue', 'salutation', 'first_name', 'last_name', 'email', 'mobile_no', 'phone', 'gender', 
            'sla', 'sla_creation', 'sla_status', 'communication_status', 'response_by', 'first_response_time', 
            'first_responded_on', 'status_change_log', 'deal_owner', 'custom_market_segment'
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

    // Ensure that custom_stage exists
    if (frm.doc.custom_stage && probability_map[frm.doc.custom_stage] !== undefined) {
        let probability_value = probability_map[frm.doc.custom_stage];

        // Set probability value
        frm.set_value('probability', probability_value);

        // Calculate custom expected revenue if custom_deal_amount exists
        if (frm.doc.custom_deal_amount) {
            let expected_revenue = frm.doc.custom_deal_amount * (probability_value / 100);
            frm.set_value('custom_expected_revenue__', expected_revenue);
        } else {
            frm.set_value('custom_expected_revenue__', 0);
        }

        // Refresh fields to reflect changes
        frm.refresh_field('probability');
        frm.refresh_field('custom_expected_revenue__');
    }
}
