frappe.listview_settings['Site'] = {
    add_fields: ["customer"],  // Add fields to display in the ListView
    onload: function (listview) {
        console.log('ListView onload triggered for Site');  // Debugging message

        // Add "Create Sales Order" button
        listview.page.add_action_item(__('Create Sales Order'), function () {
            const selected_sites = listview.get_checked_items();  // Get selected sites
            if (selected_sites.length > 0) {
                // Call the create_sales_order method for the first selected site
                frappe.call({
                    method: "nexapp.api.create_sales_order",  // Python method
                    args: {
                        site_name: selected_sites[0].name  // Pass the selected site name
                    },
                    callback: function (response) {
                        if (response.message) {
                            frappe.msgprint(__('Sales Order created successfully.'));
                            frappe.set_route('Form', 'Sales Order', response.message); // Navigate to the created Sales Order
                        }
                    },
                    error: function () {
                        frappe.msgprint(__('An error occurred while creating the Sales Order.'));
                    }
                });
            } else {
                frappe.msgprint(__('Please select a Site.'));
            }
        });
    }
};
