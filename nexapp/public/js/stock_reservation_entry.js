frappe.ui.form.on('Stock Reservation Entry', {
    after_save: function(frm) {
        console.log("Stock Reservation Entry after_save triggered");
        frappe.call({
            method: 'nexapp.api.update_product_request_status',
            args: {
                item_code: frm.doc.item_code,
                voucher_no: frm.doc.voucher_no,
                custom_circuits: frm.doc.sb_entries.map(entry => entry.custom_circuit)
            },
            callback: function(response) {
                console.log("API response:", response);
                if (response.message) {
                    frappe.msgprint(__('Product Request status updated successfully'));
                } else {
                    frappe.msgprint(__('No matching Product Request found'));
                }
            }
        });
    }
});
