frappe.ui.form.on('Task', {
    before_save: function(frm) {
        if (frm.doc.status === 'Completed' && frm.doc._previous_values?.status !== 'Completed') {
            frm.set_value('completed_on', frappe.datetime.now_datetime());
        }
    },
    after_save: async function(frm) {
        if (frm.doc.status === 'Completed' && frm.doc._previous_values?.status !== 'Completed') {
            try {
                // Validate mandatory fields
                const mandatory_fields = ['subject', 'department', 'completed_on'];
                const missing_fields = mandatory_fields.filter(field => !frm.doc[field]);

                if (missing_fields.length > 0) {
                    frappe.throw(__('Missing required fields: ') + missing_fields.join(', '));
                }

                // Fetch linked In-house Escalation records
                const child_entries = await frappe.db.get_list('In-house Escalation', {
                    filters: { task_id: frm.doc.name },
                    fields: ['parent', 'name']
                });

                if (!child_entries.length) {
                    frappe.msgprint(__('No linked HD Tickets found'));
                    return;
                }

                // Update linked In-house Escalation records
                await Promise.all(child_entries.map(async (child) => {
                    await frappe.db.set_value('In-house Escalation', child.name, {
                        completed_by: frm.doc.completed_by,
                        task_status: 'Completed',
                        task_compleated_datetime: frm.doc.completed_on
                    });
                }));

                // Find unique parent HD Tickets
                const parent_tickets = [...new Set(child_entries.map(e => e.parent).filter(Boolean))];

                // Update each HD Ticket and refresh
                await Promise.all(parent_tickets.map(async (parent) => {
                    await frappe.db.set_value('HD Ticket', parent, {
                        status: 'Completed'
                    });
                }));

                // Show alert and refresh Task form
                frappe.show_alert(__('Successfully updated {0} HD Tickets', [parent_tickets.length]));
                frm.reload_doc();  // Ensures updated values reflect immediately
            } catch (error) {
                console.error('Update Error:', error);
                frappe.msgprint({
                    title: __('Update Failed'),
                    message: error.message,
                    indicator: 'red'
                });
            }
        }
    }
});
