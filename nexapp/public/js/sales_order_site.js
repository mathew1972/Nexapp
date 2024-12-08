frappe.ui.form.on('Sales Order', {
    on_submit: function (frm) {
        if (frm.doc.po_no && frm.doc.project) {
            frappe.call({
                method: "nexapp.api.sales_order_to_site",
                args: {
                    sales_order: frm.doc.name
                },
                callback: function (r) {
                    if (r.message) {
                        frappe.msgprint(__('Data has been successfully transferred to the Site.'));
                    }
                }
            });
        }
    },
    before_submit: function (frm) {
        let missing_fields = [];
        
        if (!frm.doc.po_no) {
            missing_fields.push('PO No');
        }
        if (!frm.doc.project) {
            missing_fields.push('Project');
        }
        
        if (missing_fields.length > 0) {
            frappe.throw(__('Kindly ensure all required fields are completed before submitting the Sales Order.: {0}', [missing_fields.join(', ')]));
        }
    }
});
