// Version: 1.0.3 - Enhanced UI and custom styling
console.log("employee_survey.js: Loaded v1.0.3");

frappe.ui.form.on('Employee Survey', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            frm.add_custom_button('Send Survey', function () {
                let d = new frappe.ui.Dialog({
                    title: 'Send Survey',
                    fields: [
                        {
                            label: 'Send To',
                            fieldname: 'send_to',
                            fieldtype: 'Select',
                            options: ['All Employees', 'By Department', 'Selected Employees'],
                            default: 'Selected Employees',
                            reqd: 1,
                            onchange: function () {
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
                            get_data: function (txt) {
                                return frappe.db.get_link_options('Employee', txt);
                            },
                            hidden: 0,
                            onchange: function () {
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
                        if (!values || Object.keys(values).length === 0) {
                            values = d.get_values();
                        }

                        if (!values.send_to) {
                            frappe.msgprint(__('Please select Send To option'));
                            return;
                        }
                        if (values.send_to === 'By Department' && !values.department) {
                            frappe.msgprint(__('Please select Department'));
                            return;
                        }
                        if (values.send_to === 'Selected Employees' && (!values.employees || values.employees.length === 0)) {
                            frappe.msgprint(__('Please select Employees'));
                            return;
                        }

                        frappe.confirm(
                            __('Are you sure you want to send this survey?'),
                            function () {
                                d.hide();

                                frappe.call({
                                    method: 'nexapp.api.send_survey_to_employees',
                                    args: {
                                        survey: frm.doc.name,
                                        send_to: values.send_to,
                                        department: values.department,
                                        employees: values.employees
                                    },
                                    callback: function (r) {
                                        if (r.message && r.message.status === 'success') {
                                            frappe.show_alert({
                                                message: __('Emails are being sent in the background.'),
                                                indicator: 'green'
                                            });
                                        } else {
                                            frappe.msgprint(__('Error: ') + (r.message ? r.message.message : 'Unknown error'));
                                        }
                                    }
                                });
                            }
                        );
                    }
                });

                // Custom Styling for Red Border Input and Enhanced Layout
                const custom_css = `
                    .frappe-control[data-fieldname="employees"] .multi-select-list .input-with-feedback,
                    .frappe-control[data-fieldname="employees"] .multi-select-list input {
                        border: 2px solid #ff4d4d !important;
                        border-radius: 6px !important;
                        box-shadow: 0 0 5px rgba(255, 77, 77, 0.2) !important;
                        transition: all 0.3s ease;
                        background: #fff !important;
                    }
                    .frappe-control[data-fieldname="employees"] .multi-select-list input:focus {
                        border-color: #e60000 !important;
                        box-shadow: 0 0 8px rgba(255, 77, 77, 0.4) !important;
                        outline: none !important;
                    }
                    .selected-emp-card {
                        margin-top: 15px;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        overflow: hidden;
                        background: #ffffff;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    }
                    .selected-emp-header {
                        background: #f8fafc;
                        padding: 10px 15px;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-weight: 600;
                        color: #1e293b;
                    }
                    .selected-emp-list {
                        max-height: 250px;
                        overflow-y: auto;
                        padding: 10px;
                    }
                    .emp-item {
                        background: #f1f5f9;
                        padding: 8px 12px;
                        margin-bottom: 8px;
                        border-radius: 6px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 13px;
                        transition: background 0.2s;
                    }
                    .emp-item:hover { background: #e2e8f0; }
                    .emp-name { color: #334155; }
                    .emp-id { color: #64748b; margin-left: 5px; }
                    .remove-btn { 
                        color: #ef4444; 
                        cursor: pointer; 
                        padding: 4px 8px;
                        font-weight: bold;
                    }
                    .remove-btn:hover { color: #b91c1c; }
                    .clear-all-btn {
                        background: #1e293b;
                        color: white;
                        padding: 4px 12px;
                        border-radius: 6px;
                        font-size: 11px;
                        cursor: pointer;
                        transition: opacity 0.2s;
                    }
                    .clear-all-btn:hover { opacity: 0.9; }
                    .modal-dialog { margin-top: 5vh; }
                `;
                frappe.dom.set_style(custom_css, 'employee-survey-dialog-styles');

                function toggle_fields(dialog) {
                    let val = dialog.get_value('send_to');
                    dialog.set_df_property('department', 'hidden', val !== 'By Department');
                    dialog.set_df_property('employees', 'hidden', val !== 'Selected Employees');
                    dialog.set_df_property('employee_preview', 'hidden', val !== 'Selected Employees');
                }

                function clear_input(dialog) {
                    setTimeout(() => {
                        let field = dialog.fields_dict.employees;
                        if (field && field.$wrapper) {
                            let input = field.$wrapper.find('input');
                            if (input.length) input.val('');
                        }
                    }, 50);
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
                        callback: function (r) {
                            if (!r.message) return;

                            let html = `
                                <div class="selected-emp-card">
                                    <div class="selected-emp-header">
                                        <span>Selected Employees (${r.message.length})</span>
                                        <div class="clear-all-btn" onclick="window.clear_all_emps()">Clear All</div>
                                    </div>
                                    <div class="selected-emp-list">
                            `;
                            r.message.forEach(emp => {
                                html += `
                                    <div class="emp-item">
                                        <div class="emp-info">
                                            <span class="emp-name">${emp.employee_name}</span>
                                            <span class="emp-id">(${emp.name})</span>
                                        </div>
                                        <div class="remove-btn" onclick="window.remove_emp('${emp.name}')">✕</div>
                                    </div>
                                `;
                            });
                            html += `</div></div>`;
                            dialog.fields_dict.employee_preview.$wrapper.html(html);
                        }
                    });
                }

                window.remove_emp = function (emp_id) {
                    let current = d.get_value('employees') || [];
                    let updated = current.filter(e => e !== emp_id);
                    d.set_value('employees', updated);
                    show_selected_preview(d);
                };

                window.clear_all_emps = function () {
                    d.set_value('employees', []);
                    show_selected_preview(d);
                };

                d.show();
                toggle_fields(d); // Initial toggle
            }).addClass('btn-primary');
        }
    }
});