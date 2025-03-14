frappe.ui.form.on('HD Ticket', {
    refresh: function(frm) {
        const fields = [
            'custom_serial_no', 'custom_model', 'custom_finance_inhouse_escalation', 
            'custom_finance_issue', 'custom_finance_expected_end_date', 'custom_finance_task_details', 'custom_finance_task_created', 
            'custom_department', 'additional_info', 'contact', 'via_customer_portal', 'email_account', 'attachment', 'content_type', 
            'sb_details', 'subject', 'description', 'template', 'sla', 'response_by', 'cb', 'agreement_status', 'resolution_by', 
            'service_level_agreement_creation', 'on_hold_since', 'total_hold_time', 'response', 'first_response_time', 'first_responded_on', 
            'avg_response_time', 'custom_agent_responded_on', 'resolution_details', 'opening_date', 'opening_time', 'resolution_date', 
            'resolution_time', 'user_resolution_time', 'custom_rca', 'feedback_rating', 'feedback_text', 'feedback', 'feedback_extra', 
            'custom_circuit_id', 'custom_site_type', 'custom_impact', 'custom_ticket_category', 'custom_ticket_sub_category', 'priority', 
            'customer', 'custom_inhouse_escalation', 'status', 'ticket_type', 'raised_by', 'ticket_split_from', 'custom_channel', 
            'agent_group', 'custom_impact_details', 'custom_warranty_end__date', 'custom_warranty_expiry_date'
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

                // Fix height issue for select dropdowns
                if (fieldElement.is('select')) {
                    fieldElement.css({
                        'height': '36px', // Adjust height
                        'line-height': '36px',
                        'padding-top': '4px',
                        'padding-bottom': '4px'
                    });
                }
            }
        });
    }
});

frappe.ui.form.on('HD Ticket', {
    refresh: function(frm) {
        // Initialize previous status when the form loads
        frm.prev_status = frm.doc.status;
    },
    status: function(frm) {
        // Check if status is being changed to "Closed"
        if (frm.doc.status === 'Closed' && frm.prev_status !== 'Closed') {
            let message;
            if (frm.doc.custom_channel === 'NMS') {
                message = __("Before closing the ticket, please ensure that the NMS meets your satisfaction.");
            } else {
                message = __("Before closing the ticket, please ensure the client's satisfaction and rating have been checked, as this is mandatory.");
            }
            
            // Show confirmation dialog
            frappe.confirm(
                message,
                () => {
                    // User confirmed, update previous status
                    frm.prev_status = 'Closed';
                },
                () => {
                    // User canceled, revert to previous status
                    frm.set_value('status', frm.prev_status);
                }
            );
        }
        // Update previous status after each change
        frm.prev_status = frm.doc.status;
    }
});
