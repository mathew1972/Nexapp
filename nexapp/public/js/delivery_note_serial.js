frappe.ui.form.on('Delivery Note', {
    after_save: function(frm) {
        console.log("after_save triggered for Delivery Note:", frm.doc.name);

        // Delay the execution by 10 seconds to allow ERPNext core processes to complete
        setTimeout(function() {
            console.log("Starting the 10-second delayed execution.");

            // Loop through items in the Delivery Note
            frm.doc.items.forEach(item => {
                console.log("Processing item:", item);

                // Check if serial_and_batch_bundle exists
                if (!item.serial_and_batch_bundle) {
                    console.warn(`Item ${item.item_code} has no serial_and_batch_bundle. Skipping.`);
                    return;
                }

                console.log(`Calling server method for item with serial_and_batch_bundle: ${item.serial_and_batch_bundle}`);

                // Call the server-side method
                frappe.call({
                    method: "nexapp.api.update_serial_and_batch_entry_and_provisioning_item",
                    args: {
                        serial_and_batch_bundle: item.serial_and_batch_bundle,
                        custom_circuit_id: item.custom_circuit_id
                    },
                    callback: function(response) {
                        console.log("Server response for item:", response);

                        if (response.message === "success") {
                            console.log(`Update successful for item with serial_and_batch_bundle: ${item.serial_and_batch_bundle}`);
                        } else {
                            console.error(`Error updating item with serial_and_batch_bundle: ${item.serial_and_batch_bundle}. Response:`, response.message);
                        }
                    },
                    error: function(err) {
                        console.error("Frappe call failed for item:", item, "Error:", err);
                    }
                });
            });

            console.log("Finished processing all items.");
        }, 10000); // 10-second delay
    }
});
