frappe.ui.form.on('Sales Order', {
    customer: function(frm) {
        if (frm.doc.customer) {
            frappe.call({
                method: "nexapp.api.get_filtered_feasibility",
                args: {
                    customer: frm.doc.customer
                },
                callback: function(r) {
                    if (r.message) {
                        console.log(r.message); // Log the returned circuit_id list
                        let circuit_ids = r.message.length > 0 ? r.message : []; // Handle empty list
                        
                        // Set the filter for custom_feasibility in the child table
                        frm.fields_dict.items.grid.get_field('custom_feasibility').get_query = function(doc, cdt, cdn) {
                            return {
                                filters: {
                                    'circuit_id': ['in', circuit_ids]  // Filter by circuit_id
                                }
                            };
                        };
                        
                        frm.refresh_field('items'); // Refresh the child table to apply the filter
                    }
                }
            });
        }
    }
});
