frappe.ui.form.on("Delivery Note", {
    onload_post_render: function (frm) {
        if (!frm.doc.items || frm.doc.items.length === 0) {
            return;
        }

        // Process each Delivery Note Item
        frm.doc.items.forEach(dn_item => {
            if (dn_item.against_sales_order) {
                fetch_and_map_custom_fields(frm, dn_item);
            }
        });
    }
});

function fetch_and_map_custom_fields(frm, dn_item) {
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Sales Order",
            name: dn_item.against_sales_order
        },
        callback: function (response) {
            if (response.message) {
                let salesOrder = response.message;

                // Find matching Sales Order Item
                let matching_so_item = salesOrder.items.find(so_item => so_item.item_code === dn_item.item_code);

                if (matching_so_item) {
                    // Update the custom_circuit_id field in Delivery Note Item
                    dn_item.custom_circuit_id = matching_so_item.custom_feasibility;

                    // Refresh the child table to reflect changes
                    frm.refresh_field("items");
                }
            }
        }
    });
}
