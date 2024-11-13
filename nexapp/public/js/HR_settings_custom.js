frappe.ui.form.on('HR Settings', {
    refresh: function(frm) {
        const fields = [
            'employee_settings', 'emp_created_by', 'standard_working_hours', 'column_break_9', 'retirement_age', 
            'reminders_section', 'column_break_11', 'send_work_anniversary_reminders', 'send_birthday_reminders', 
            'send_holiday_reminders', 'frequency', 'column_break_hyec', 'sender', 'sender_email', 
            'leave_and_expense_claim_settings', 'send_leave_notification', 'leave_approval_notification_template', 
            'leave_status_notification_template', 'leave_approver_mandatory_in_leave_application', 
            'restrict_backdated_leave_application', 'role_allowed_to_create_backdated_leave_application', 
            'column_break_29', 'expense_approver_mandatory_in_expense_claim', 'show_leaves_of_all_department_members_in_calendar', 
            'auto_leave_encashment', 'shift_settings_section', 'allow_multiple_shift_assignments', 
            'hiring_settings_section', 'check_vacancies', 'send_interview_reminder', 'interview_reminder_template', 
            'remind_before', 'send_interview_feedback_reminder', 'feedback_reminder_notification_template', 
            'column_break_4', 'hiring_sender', 'hiring_sender_email', 'employee_exit_section', 
            'exit_questionnaire_web_form', 'column_break_34', 'exit_questionnaire_notification_template', 
            'attendance_settings_section', 'allow_employee_checkin_from_mobile_app', 'allow_geolocation_tracking', 
            'unlink_payment_section', 'unlink_payment_on_cancellation_of_employee_advance'
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
