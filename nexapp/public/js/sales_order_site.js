frappe.ui.form.on('Sales Order', {
    after_save: function (frm) {
        if (frm.doc.po_no) {
            frappe.call({
                method: "nexapp.api.sales_order_to_site",
                args: {
                    sales_order: frm.doc.name
                },
                callback: function (r) {
                    if (r.message) {
                        frappe.msgprint(__('Data transferred to Site Doctype successfully'));
                    }
                }
            });
        }
    }
});
