frappe.ui.form.on('Disconnection Request', {
    refresh: function(frm) {
        const fields = [
            'customer_name_2',
            'reason_for_disconnection',
            'reason_for_rejection',
            'notice_period_start_date',
            'notice_period',
            'disconnection_notice_date',
            'customer_disconnection_confirmation',
            'disconnection_circuit_details',
            'total_circuit_id',
            'service_team_remarks',
            'disconnection_request',
            'note',
            'lms_details_tab',
            'lms_details',
            'customer_type',
            'status',            
            'lms_note'
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
//////////////////////////////////////////////////////////////
frappe.ui.form.on('Disconnection Request', {
    notice_period_start_date: function(frm) {
        calculate_disconnection_notice_date(frm);
    },

    notice_period: function(frm) {
        calculate_disconnection_notice_date(frm);
    }
});

function calculate_disconnection_notice_date(frm) {
    if (frm.doc.notice_period_start_date && frm.doc.notice_period) {
        let start_date = frappe.datetime.str_to_obj(frm.doc.notice_period_start_date);
        let disconnection_date = frappe.datetime.add_days(start_date, frm.doc.notice_period);
        frm.set_value('disconnection_notice_date', frappe.datetime.obj_to_str(disconnection_date));
    }
}
/////////////////////////////////////////////////////////////////

