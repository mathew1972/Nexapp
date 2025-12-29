frappe.ui.form.on('Change Management Request', {
    validate: function(frm) {
        return new Promise((resolve) => {
            if (!frm.doc.circuit_id) {
                resolve();
                return;
            }

            // ✅ Prevent duplicate creation on repeated Save
            if (frm._feasibility_checked) {
                resolve();
                return;
            }

            frappe.call({
                method: 'nexapp.api.check_feasibility_or_site',
                args: { circuit_id: frm.doc.circuit_id },
                callback: function(r) {
                    let status = r.message.status;

                    if (status === "feasibility_exists") {
                        frm._feasibility_checked = true; // ✅ Mark checked
                        resolve();
                    } else if (status === "site_exists") {
                        frappe.confirm(
                            'Circuit not found in Feasibility. Do you want to create Feasibility?',
                            function() {
                                frappe.call({
                                    method: 'nexapp.api.create_feasibility_from_site',
                                    args: { circuit_id: frm.doc.circuit_id },
                                    callback: function(res) {
                                        frappe.show_alert({ message: res.message, indicator: 'green' });
                                        frm._feasibility_checked = true; // ✅ Mark after creation
                                        resolve();
                                    }
                                });
                            },
                            function() {
                                frappe.throw(__('Feasibility creation cancelled. Please create manually before saving.'));
                            }
                        );
                    } else {
                        frappe.throw(__('Circuit ID not found in Feasibility and Site.'));
                    }
                }
            });
        });
    }
});
