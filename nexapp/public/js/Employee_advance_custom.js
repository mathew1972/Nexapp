frappe.ui.form.on('Employee Advance', {
    before_workflow_action: function (frm) {
        const action = frm.selected_workflow_action;
        if (['Reject', 'Decline'].includes(action)) {
            return new Promise((resolve, reject) => {
                const d = new frappe.ui.Dialog({
                    title: __('Rejection Reason'),
                    fields: [
                        {
                            label: __('Reason for Rejection'),
                            fieldname: 'reason_for_rejection',
                            fieldtype: 'Small Text',
                            reqd: 1,
                            description: __('Please provide a clear reason for rejecting this Employee Advance')
                        }
                    ],
                    primary_action_label: __(action),
                    primary_action: (values) => {
                        if (frm.fields_dict.custom_reason_for_rejection) {
                            frm.set_value('custom_reason_for_rejection', values.reason_for_rejection);
                        }

                        // Add reason as a comment in the timeline
                        frm.add_comment("Info", `<b>${__(action)} Reason:</b> ${values.reason_for_rejection}`);

                        d.hide();
                        resolve();
                    },
                    secondary_action_label: __('Cancel'),
                    secondary_action: () => {
                        d.hide();
                        reject();
                    }
                });
                d.show();
            });
        }
    },
    refresh: function (frm) {
        console.log("Current Workflow State:", frm.doc.workflow_state);
        console.log("Docstatus:", frm.doc.docstatus);

        if (frm.doc.workflow_state === 'Approval Pending By Manager') {
            frm.add_custom_button(__('Manual Reject'), function () {
                frm.trigger_workflow_action('Decline');
            }, __('Actions'));
        }

        const fields = [
            'naming_series', 'employee', 'employee_name', 'column_break_4', 'posting_date',
            'company', 'department', 'currency_section', 'currency', 'column_break_crso',
            'exchange_rate', 'section_break_8', 'purpose', 'column_break_11', 'advance_amount',
            'paid_amount', 'pending_amount', 'claimed_amount', 'return_amount', 'section_break_7',
            'column_break_18', 'advance_account', 'mode_of_payment', 'column_break_nhlv',
            'repay_unclaimed_amount_from_salary', 'more_info_section', 'status', 'column_break_kimx',
            'amended_from', 'custom_reason_for_rejection'
        ];

        fields.forEach(function (field) {
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
                fieldElement.on('focus', function () {
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

                fieldElement.on('blur', function () {
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
