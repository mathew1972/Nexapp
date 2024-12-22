frappe.ui.form.on('Delivery Note', {
    after_save: function(frm) {
        // Delay the execution by 10 seconds to allow ERPNext core processes to complete
        setTimeout(function() {
            frm.doc.items.forEach(item => {
                if (!item.serial_and_batch_bundle) {
                    return;
                }

                // Call Python method to update Serial and Batch Entry and Provisioning Item
                frappe.call({
                    method: "nexapp.api.update_serial_and_batch_entry_and_provisioning_item",
                    args: {
                        serial_and_batch_bundle: item.serial_and_batch_bundle,
                        custom_circuit_id: item.custom_circuit_id
                    },
                    callback: function(response) {
                        if (response.message !== "success") {
                            // Handle error if needed
                        }
                    }
                });
            });
        }, 10000); // 10-second delay
    }
});
