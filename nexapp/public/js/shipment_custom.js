// Doctype: Shipment
frappe.ui.form.on('Shipment', {
    after_save: function(frm) {
        if (frm.doc.custom_circuit_id) {
            frappe.call({
                method: "nexapp.api.update_related_documents",
                args: {
                    shipment_name: frm.doc.name,
                    custom_circuit_id: frm.doc.custom_circuit_id
                },
                callback: function(r) {
                    if (r.message === "Success") {
                        frappe.msgprint("Site and Stock Management fully updated.");
                    }
                }
            });
        }
    }
});
