frappe.ui.form.on('Maintenance Visit', {
    on_submit: function(frm) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'HD Ticket',
                filters: [
                    ['Ticket Maintenance', 'maintenance_id', '=', frm.doc.name]
                ],
                fields: ['name']
            },
            callback: function(response) {
                if (response.message?.length > 0) {
                    const hd_ticket_name = response.message[0].name;

                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'HD Ticket',
                            name: hd_ticket_name
                        },
                        callback: function(ticket_response) {
                            if (!ticket_response.message) return;

                            let hd_ticket = ticket_response.message;
                            let updated = false;

                            if (hd_ticket.custom_maintenance_visit) {
                                hd_ticket.custom_maintenance_visit.forEach(row => {
                                    if (row.maintenance_id === frm.doc.name) {
                                        // **Update status and additional fields**
                                        row.status = 'Approved';
                                        row.service_person = frm.doc.custom_engineer;
                                        row.engineer_mobile = frm.doc.custom_engineer_mobile;
                                        row.field_engineer_mobile = frm.doc.custom_field_engineer_mobile;
                                        
                                        updated = true;
                                    }
                                });

                                if (updated) {
                                    frappe.call({
                                        method: 'frappe.client.save',
                                        args: {
                                            doc: hd_ticket
                                        },
                                        callback: function() {
                                            frappe.show_alert({
                                                message: 'HD Ticket updated successfully!',
                                                indicator: 'green'
                                            });

                                            // **Refresh HD Ticket Form**
                                            frappe.model.clear_doc('HD Ticket', hd_ticket_name);
                                            frappe.model.with_doc('HD Ticket', hd_ticket_name, function() {
                                                frappe.ui.form.get_open_form('HD Ticket', hd_ticket_name, function(ticket_form) {
                                                    if (ticket_form) {
                                                        ticket_form.refresh();
                                                    }
                                                });
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            }
        });
    }
});
