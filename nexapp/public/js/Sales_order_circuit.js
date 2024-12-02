frappe.ui.form.on('Sales Order Item', {
    custom_feasibility: function (frm, cdt, cdn) {
        var child = locals[cdt][cdn]; // Current row in child table

        // Ensure Sales Order has a customer selected
        if (!frm.doc.customer) {
            frappe.msgprint(__('Please select a customer in the Sales Order.'));
            return;
        }

        // Get the customer from the Sales Order
        var customer = frm.doc.customer;

        // Call the Python method to fetch filtered circuit_ids based on the customer
        frappe.call({
            method: "nexapp.api.get_filtered_circuit_ids", // Correct API path
            args: {
                customer: customer
            },
            callback: function (response) {
                var filtered_circuit_ids = response.message;

                // If there are no circuit_ids, show a message
                if (!filtered_circuit_ids || filtered_circuit_ids.length === 0) {
                    frappe.msgprint(__('No available circuits for this customer.'));
                    return;
                }

                // Log the filtered circuit_ids for debugging
                console.log("Filtered circuit_ids:", filtered_circuit_ids);

                // Apply the filter to the custom_feasibility field in the Sales Order Item child table
                frm.fields_dict['items'].grid.get_field('custom_feasibility').get_query = function (doc, cdt, cdn) {
                    return {
                        filters: {
                            'circuit_id': ['in', filtered_circuit_ids] // Filter by circuit_ids
                        }
                    };
                };

                // Ensure that all rows in the Sales Order Item grid are refreshed
                frm.doc.items.forEach(function (item) {
                    var row = frm.fields_dict['items'].grid.grid_rows_by_docname[item.name];
                    if (row && row.fields_dict) {
                        if (row.fields_dict['custom_feasibility']) {
                            row.fields_dict['custom_feasibility'].refresh(); // Refresh the field
                        }
                    } else {
                        console.warn(`Row ${item.name} or custom_feasibility field not found.`);
                    }
                });

                // Trigger refresh of the whole grid (just in case some rows are missed)
                frm.fields_dict['items'].grid.refresh();
            }
        });
    }
});
