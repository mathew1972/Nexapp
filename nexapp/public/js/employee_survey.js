frappe.ui.form.on('Employee Survey', {
    refresh: function(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button('Send Survey', function() {
                let d = new frappe.ui.Dialog({
                    title: 'Send Survey',
                    fields: [
                        {
                            label: 'Send To',
                            fieldname: 'send_to',
                            fieldtype: 'Select',
                            options: ['All Employees', 'By Department', 'Selected Employees'],
                            reqd: 1,
                            onchange: function() {
                                toggle_fields(d);
                            }
                        },
                        {
                            label: 'Department',
                            fieldname: 'department',
                            fieldtype: 'Link',
                            options: 'Department',
                            hidden: 1
                        },
                        {
                            label: 'Employees',
                            fieldname: 'employees',
                            fieldtype: 'MultiSelectList',
                            get_data: function(txt) {
                                return frappe.db.get_link_options('Employee', txt);
                            },
                            hidden: 1,
                            onchange: function() {
                                clear_input(d);
                                show_selected_preview(d);
                            }
                        },
                        {
                            fieldname: 'employee_preview',
                            fieldtype: 'HTML'
                        }
                    ],
                    primary_action_label: 'Send',
                    primary_action(values) {
                        // Prevent double submission
                        if (d.get_primary_action_disabled()) return;
                        d.set_primary_action_disabled(true);

                        // Validations
                        if (!values.send_to) {
                            frappe.msgprint(__('Please select Send To option'));
                            d.set_primary_action_disabled(false);
                            return;
                        }
                        if (values.send_to === 'By Department' && !values.department) {
                            frappe.msgprint(__('Please select Department'));
                            d.set_primary_action_disabled(false);
                            return;
                        }
                        if (values.send_to === 'Selected Employees' && (!values.employees || values.employees.length === 0)) {
                            frappe.msgprint(__('Please select Employees'));
                            d.set_primary_action_disabled(false);
                            return;
                        }

                        // Confirm before sending
                        frappe.confirm(
                            __('Are you sure you want to send this survey?'),
                            function() {
                                // Close the dialog immediately to avoid UI hanging
                                d.hide();
                                d.$wrapper.remove();

                                // Call the backend API (non‑blocking)
                                frappe.call({
                                    method: 'nexapp.api.send_survey_to_employees',
                                    args: {
                                        survey: frm.doc.name,
                                        send_to: values.send_to,
                                        department: values.department,
                                        employees: values.employees
                                    },
                                    callback: function(r) {
                                        if (r.message && r.message.status === 'success') {
                                            frappe.msgprint(__('Emails are being sent in the background. You will be notified when done.'));
                                        } else {
                                            frappe.msgprint(__('Something went wrong: ') + (r.message.message || 'Unknown error'));
                                        }
                                    },
                                    error: function(err) {
                                        frappe.msgprint(__('Error sending emails. Please check the server logs.'));
                                        console.error(err);
                                    }
                                });
                            },
                            function() {
                                // User cancelled – re‑enable the dialog’s primary action
                                d.set_primary_action_disabled(false);
                            }
                        );
                    }
                });

                // Helper functions
                function toggle_fields(dialog) {
                    let val = dialog.get_value('send_to');
                    dialog.set_df_property('department', 'hidden', val !== 'By Department');
                    dialog.set_df_property('employees', 'hidden', val !== 'Selected Employees');
                    dialog.refresh();
                }

                function clear_input(dialog) {
                    setTimeout(() => {
                        let input = dialog.fields_dict.employees.$wrapper.find('input');
                        if (input) input.val('');
                    }, 200);
                }

                function show_selected_preview(dialog) {
                    let employees = dialog.get_value('employees') || [];
                    if (!employees.length) {
                        dialog.fields_dict.employee_preview.$wrapper.html('');
                        return;
                    }

                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: {
                            doctype: 'Employee',
                            filters: { name: ['in', employees] },
                            fields: ['name', 'employee_name']
                        },
                        callback: function(r) {
                            let html = `
                                <div style="margin-top:10px;">
                                    <b>Selected Employees (${r.message.length}):</b>
                                    <ul style="max-height:150px; overflow:auto;">
                            `;
                            r.message.forEach(emp => {
                                html += `
                                    <li style="margin-bottom:5px;">
                                        ${emp.employee_name} (${emp.name})
                                        <button 
                                            style="margin-left:10px; color:red; border:none; background:none; cursor:pointer;"
                                            onclick="window.remove_emp('${emp.name}')"
                                        >❌</button>
                                    </li>
                                `;
                            });
                            html += `</ul></div>`;

                            dialog.fields_dict.employee_preview.$wrapper.html(html);

                            // Global helper for removal (ensures dialog closure)
                            window.remove_emp = function(emp_id) {
                                let current = dialog.get_value('employees') || [];
                                let updated = current.filter(e => e !== emp_id);
                                dialog.set_value('employees', updated);
                                show_selected_preview(dialog);
                            };
                        }
                    });
                }

                d.show();
            }).addClass('btn-primary');
        }
    }
});