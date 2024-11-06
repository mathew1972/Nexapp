frappe.ui.form.on('Employee', {
    refresh: function(frm) {
        const fields = [
            'basic_information', 'employee', 'naming_series', 'first_name', 'middle_name', 'last_name', 
            'employee_name', 'gender', 'date_of_birth', 'salutation', 'date_of_joining', 'image', 
            'status', 'erpnext_user', 'user_id', 'create_user', 'create_user_permission', 'company', 
            'department', 'employment_type', 'employee_number', 'designation', 'reports_to', 'branch', 
            'grade', 'job_applicant', 'scheduled_confirmation_date', 'final_confirmation_date', 
            'contract_end_date', 'notice_number_of_days', 'date_of_retirement', 'cell_number', 
            'personal_email', 'company_email', 'prefered_contact_email', 'prefered_email', 'unsubscribed', 
            'current_address', 'current_accommodation_type', 'permanent_address', 
            'permanent_accommodation_type', 'person_to_be_contacted', 'emergency_phone_number', 
            'relation', 'attendance_device_id', 'holiday_list', 'default_shift', 'expense_approver', 
            'leave_approver', 'shift_request_approver', 'ctc', 'salary_currency', 'salary_mode', 
            'payroll_cost_center', 'bank_name', 'bank_ac_no', 'iban', 'marital_status', 'family_background', 
            'blood_group', 'health_insurance_provider', 'health_insurance_no', 'passport_number', 
            'valid_upto', 'date_of_issue', 'place_of_issue', 'bio', 'educational_qualification', 'education', 
            'previous_work_experience', 'external_work_history', 'internal_work_history', 'resignation_letter_date', 
            'relieving_date', 'held_on', 'new_workplace', 'leave_encashed', 'encashment_date', 
            'reason_for_leaving', 'feedback', 'lft', 'rgt', 'old_parent'
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
