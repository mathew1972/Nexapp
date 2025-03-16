frappe.ui.form.on('HD Ticket', {
    before_save: function(frm) {
        if (frm.is_processing_visits) return;

        const child_table_field = 'custom_maintenance_visit';
        let visit_promises = [];

        (frm.doc[child_table_field] || []).forEach(row => {
            const status = (row.status || '').toLowerCase().trim();
            
            if (status === 'visit') {
                visit_promises.push(
                    new Promise((resolve, reject) => {
                        const mv_doc = {
                            doctype: 'Maintenance Visit',
                            custom_circuit_id: frm.doc.custom_circuit_id,
                            mntc_date: row.maintenance_date,
                            purposes: [{
                                doctype: 'Maintenance Visit Purpose',
                                item_code: row.item,
                                work_done: row.work
                            }]
                        };

                        frappe.db.insert(mv_doc)
                            .then(mv => {
                                return frappe.model.set_value(
                                    row.doctype,
                                    row.name,
                                    {
                                        status: 'Approval Pending',
                                        maintenance_id: mv.name
                                    }
                                );
                            })
                            .then(() => resolve())
                            .catch(error => reject(error));
                    })
                );
            }
        });

        if (visit_promises.length > 0) {
            frm.is_processing_visits = true;
            
            Promise.all(visit_promises)
                .finally(() => {
                    frm.is_processing_visits = false;
                    frm.refresh_field(child_table_field);
                });

            return false;
        }
    }
});
