frappe.ui.form.on('HD Ticket', {
    refresh: function(frm) {
        const fields = [
            'custom_circuit_id', 'custom_ticket_category', 'custom_ticket_sub_category', 'custom_ticket_owner', 'custom_impact', 
            'customer', 'priority', 'agent_group', 'custom_lms_ticket_id', 'custom_ticket_for', 'status', 'ticket_type', 'raised_by', 
            'ticket_split_from', 'custom_impact_details', 'custom_channel', 'custom_lms', 'custom_inhouse_escalation', 'custom_provisioning', 
            'contact', 'email_account', 'attachment', 'content_type', 'subject', 'description', 'template', 'sla_tab', 'sla', 
            'response_by', 'cb', 'agreement_status', 'resolution_by', 'service_level_agreement_creation', 'on_hold_since', 
            'total_hold_time', 'response_tab', 'response', 'first_response_time', 'first_responded_on', 'column_break_26', 
            'avg_response_time', 'resolution_tab', 'section_break_19', 'resolution_details', 'opening_date', 'opening_time', 
            'resolution_date', 'resolution_time', 'user_resolution_time', 'reference_tab', 'feedback_tab', 'customer_feedback_section', 
            'feedback_rating', 'feedback_text', 'feedback', 'feedback_extra', 'custom_finance_issue', 'custom__finance_expected_end_date_', 
            'custom_department', 'custom_finance_task_details'
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
