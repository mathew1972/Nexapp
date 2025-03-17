frappe.ui.form.on('HD Ticket', {
    before_save: function(frm) {
        if (frm.is_processing_visits) return;

        const child_table_field = 'custom_maintenance_visit';
        let visit_promises = [];

        (frm.doc[child_table_field] || []).forEach(row => {
            if (!row.maintenance_date || row.maintenance_id) return; // ✅ Skip if maintenance_id exists

            let mv_doc = {
                doctype: 'Maintenance Visit',
                custom_circuit_id: frm.doc.custom_circuit_id,
                mntc_date: row.maintenance_date,
                purposes: [{
                    doctype: 'Maintenance Visit Purpose',
                    work_done: row.work,
                    item_code: row.item
                }]
            };

            visit_promises.push(
                frappe.db.insert(mv_doc)
                    .then(mv => {
                        return frappe.model.set_value(row.doctype, row.name, {
                            status: 'Approval Pending',
                            maintenance_id: mv.name  // ✅ Store ID to prevent duplication
                        });
                    })
                    .catch(error => console.error("Error creating Maintenance Visit:", error))
            );
        });

        if (visit_promises.length > 0) {
            frm.is_processing_visits = true;

            Promise.all(visit_promises)
                .finally(() => {
                    frm.is_processing_visits = false;
                    frm.refresh_field(child_table_field);
                });

            return false; // Prevent auto-save while processing
        }
    }
});
