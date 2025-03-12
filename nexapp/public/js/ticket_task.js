frappe.ui.form.on('HD Ticket', {
    before_save: function(frm) {
        if (frm.is_processing_tasks) return;
        
        let task_promises = [];
        
        (frm.doc.custom_inhouse_eaclation || []).forEach(function(row) {
            if (row.task_status === 'Open') {
                task_promises.push(
                    new Promise((resolve, reject) => {
                        const task = {
                            doctype: 'Task',
                            type: row.task_type,
                            subject: row.task_subject,
                            department: row.department,
                            custom_customer: frm.doc.customer,
                            priority: row.task_priority,
                            exp_start_date: row.expected_start_date,
                            exp_end_date: row.expected_end_date,
                            expected_time: row.expected_time_in_hours,
                            description: row.task_description,
                            status: 'Open',
                            // New fields added
                            custom_partner: row.partner,
                            custom_partner_ticket_number: row.partner_ticket_number,
                            custom_partner_ticket_log_date: row.partner_ticket_log_date
                        };
                        
                        frappe.db.insert(task)
                            .then(taskDoc => {
                                frappe.model.set_value(
                                    row.doctype,
                                    row.name,
                                    {
                                        task_status: 'Task Created',
                                        task_id: taskDoc.name,
                                        task_open_datetime: frappe.datetime.now_datetime(),
                                        // Updating In-house Escalation fields
                                        partner: row.partner,
                                        partner_ticket_number: row.partner_ticket_number,
                                        partner_ticket_log_date: row.partner_ticket_log_date
                                    }
                                ).then(() => resolve());
                            })
                            .catch(error => reject(error));
                    })
                );
            }
        });

        if (task_promises.length > 0) {
            frm.is_processing_tasks = true;
            
            Promise.all(task_promises)
                .then(() => {
                    frm.refresh_field('custom_inhouse_eaclation');
                    frm.is_processing_tasks = false;
                    frm.save();
                })
                .catch(error => {
                    frm.is_processing_tasks = false;
                    const errorMessage = error.message || JSON.stringify(error);
                    frappe.msgprint({
                        title: __('Error'),
                        indicator: 'red',
                        message: __('Error creating tasks: {0}', [errorMessage])
                    });
                });
            
            return false;
        }
    }
});
