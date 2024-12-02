frappe.ui.form.on("Site", {
    item_name: function(frm) {
        fetch_stock_details(frm);
    },

    warehouse: function(frm) {
        fetch_stock_details(frm);
    }
});

function fetch_stock_details(frm) {
    if (frm.doc.item_name && frm.doc.warehouse) {
        // Make the API call to get stock details
        frappe.call({
            method: "nexapp.api.get_stock_details",  // Adjust this path as needed
            args: {
                item_code: frm.doc.item_name,
                warehouse: frm.doc.warehouse
            },
            callback: function(response) {
                if (response.message) {
                    frm.set_value("item_balance", response.message.item_balance);
                    frm.set_value("item_reserved", response.message.item_reserved);
                    frm.refresh_field("item_balance");
                    frm.refresh_field("item_reserved");
                } else {
                    frappe.msgprint(__('No stock details found.'));
                }
            },
            error: function(err) {
                console.error("Error fetching stock details:", err);
                frappe.msgprint(__('An error occurred while fetching stock details.'));
            }
        });
    }
}
