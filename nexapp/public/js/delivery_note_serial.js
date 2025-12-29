//frappe.ui.form.on('Delivery Note', {
//    after_save: function(frm) {
//        // Delay the execution by 5 seconds to allow ERPNext core processes to complete
//        setTimeout(function() {
//            frm.doc.items.forEach(item => {
//                if (!item.serial_and_batch_bundle) {
//                    return;
//                }
//
//                // Call Python method to update Serial and Batch Entry
//                frappe.call({
//                    method: "nexapp.api.update_serial_and_batch_entry",
//                    args: {
//                        serial_and_batch_bundle: item.serial_and_batch_bundle,
//                        custom_circuit_id: item.custom_circuit_id
//                    },
//                    callback: function(response) {
//                        if (response.message !== "success") {
//                            // Handle the error if needed (e.g., add custom validation)
//                        }
//                    }
//                });
//            });
//        }, 5000); // 5-second delay
//    }
//});