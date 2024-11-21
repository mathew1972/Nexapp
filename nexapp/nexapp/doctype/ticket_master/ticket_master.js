// Copyright (c) 2024, Nexapp Technologies Private Limited and contributors

frappe.ui.form.on('Ticket Master', {
    after_save: function (frm) {
        frappe.call({
            method: 'nexapp.api.handle_ticket_master',
            args: {
                ticket_master: {
                    subject: frm.doc.subject,
                    company: frm.doc.company,
                    circuit_id: frm.doc.circuit_id,
                    raised_by_email: frm.doc.raised_by_email,
                    description: frm.doc.description
                }
            },
            callback: function (r) {
                if (r.message) {
                    frm.reload_doc();
                }
            }
        });
    }
});
