frappe.ui.form.on('HD Ticket', {
    before_save: function(frm) {
        if (frm.is_processing_visits) return;

        const child_table_field = 'custom_maintenance_visit';
        let visit_promises = [];
        let validation_errors = [];

        (frm.doc[child_table_field] || []).forEach(row => {
            const status = (row.status || '').toLowerCase().trim();
            
            if (status === 'visit') {
                // Validate maintenance_date
                if (!row.maintenance_date) {
                    validation_errors.push(__("Row {0}: Maintenance Date is required.", [row.idx]));
                } else {
                    const date_diff = frappe.datetime.get_diff(row.maintenance_date, frappe.datetime.get_today());
                    if (date_diff < 0) {
                        validation_errors.push(__("Row {0}: Maintenance Date cannot be a past date.", [row.idx]));
                    }
                }

                // Validate mobile numbers
                const validateMobile = (number, field) => {
                    if (number && number.length !== 10) {
                        validation_errors.push(__("Row {0}: {1} must be 10 digits.", [row.idx, field]));
                    }
                };

                validateMobile(row.mobile, "Mobile");
                validateMobile(row.field_mobile, "Field Mobile");

                // Proceed to create visit if no errors
                if (validation_errors.length === 0) {
                    visit_promises.push(
                        new Promise((resolve, reject) => {
                            const mv_doc = {
                                doctype: 'Maintenance Visit',
                                custom_circuit_id: frm.doc.custom_circuit_id,
                                company: frm.doc.company,
                                mntc_date: row.maintenance_date,
                                mntc_time: row.maintenance_time,
                                custom_engineer_visit_cost: row.engineer_visit_cost,
                                contact_email: row.email, // Added contact_email mapping
                                purposes: [{
                                    doctype: 'Maintenance Visit Purpose',
                                    service_person: row.service_person,
                                    custom_mobile: row.mobile,
                                    custom_email: row.email,
                                    custom_field_mobile: row.field_mobile,
                                    work_done: row.description,
                                    description: row.description
                                }]
                            };

                            frappe.db.insert(mv_doc)
                                .then(mv => {
                                    // Update both status and maintenance_id
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
            }
        });

        if (validation_errors.length > 0) {
            frappe.throw(validation_errors.join('<br>'));
            return false;
        }

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

// Add client-side validation for child table fields
frappe.ui.form.on('Ticket Maintenance', {
    maintenance_date: function(frm, cdt, cdn) {
        const row = frappe.get_doc(cdt, cdn);
        if (row.maintenance_date && frappe.datetime.get_diff(row.maintenance_date, frappe.datetime.get_today()) < 0) {
            frappe.msgprint(__("Maintenance Date cannot be a past date."));
            frappe.validated = false;
        }
    },
    mobile: function(frm, cdt, cdn) {
        const row = frappe.get_doc(cdt, cdn);
        if (row.mobile && row.mobile.length !== 10) {
            frappe.msgprint(__("Mobile must be 10 digits."));
            frappe.validated = false;
        }
    },
    field_mobile: function(frm, cdt, cdn) {
        const row = frappe.get_doc(cdt, cdn);
        if (row.field_mobile && row.field_mobile.length !== 10) {
            frappe.msgprint(__("Field Mobile must be 10 digits."));
            frappe.validated = false;
        }
    }
});
