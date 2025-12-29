frappe.ui.form.on('Work Order', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1) {
            let btn = frm.add_custom_button(__('Create MAC Address'), function() {
                frappe.call({
                    method: 'nexapp.api.generate_and_update_mac_addresses',
                    args: {
                        work_order_name: frm.doc.name
                    },
                    callback: function(response) {
                        if (typeof response.message === 'string' && response.message.includes("Generated")) {
                            frappe.msgprint(__('MAC Addresses Created successfully.'));
                            frm.reload_doc();
                        } else {
                            frappe.msgprint(response.message || __('No changes made.'));
                        }
                    }
                });
            });

            // Set button color to #21B4E8
            $(btn).css({
                'background-color': '#21B4E8',
                'border-color': '#21B4E8',
                'color': 'white',
                'font-weight': 'bold'
            });
        }
    }
});
