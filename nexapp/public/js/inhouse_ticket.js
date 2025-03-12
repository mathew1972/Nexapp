frappe.ui.form.on('HD Ticket', {
    refresh: function(frm) {
        // Auto-calculate for existing records on refresh
        (frm.doc.in_house_escalation || []).forEach(row => {
            if (row.task_open_datetime && row.task_completed_datetime) {
                calculate_task_time(frm, row);
            }
        });
    }
});

frappe.ui.form.on('In-house Escalation', {
    task_completed_datetime: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (row.task_open_datetime && row.task_completed_datetime) {
            calculate_task_time(frm, row);
        }
    }
});

function calculate_task_time(frm, row) {
    let start = moment(row.task_open_datetime);
    let end = moment(row.task_completed_datetime);

    // Calculate duration in seconds (ERPNext Duration field stores time in seconds)
    let duration = moment.duration(end.diff(start)).asSeconds();

    // Update task_time_taken in the row
    frappe.model.set_value(row.doctype, row.name, 'task_time_taken', duration);
}
