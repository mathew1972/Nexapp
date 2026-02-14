frappe.ui.form.on('Blanket Order', {
    refresh: function(frm) {

        // Show button only after document is saved
        if (!frm.is_new()) {

            frm.add_custom_button('Create Task', function() {

                frappe.new_doc('Task', {
                    subject: 'Task for Blanket Order ' + frm.doc.name,
                    description: 'Created from Blanket Order ' + frm.doc.name,
                    exp_start_date: frappe.datetime.get_today(),
                    status: 'Open',
                    priority: 'Medium',
                    type: 'Blanket Order -Sales Order Request'
                });

            }, 'Create');

        }
    }
});
