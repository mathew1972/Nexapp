frappe.ui.form.on('Sales Order', {
    on_submit: function (frm) {
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
});
