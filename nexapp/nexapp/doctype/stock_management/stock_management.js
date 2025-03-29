// Copyright (c) 2025, Nexapp Technologies Private Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on('Stock Management', {
    refresh: function(frm) {
        if (!frm.is_new()) {
            // Remove existing button if any
            if (frm.custom_buttons && frm.custom_buttons['Stock Management']) {
                frm.custom_buttons['Stock Management'].remove();
                delete frm.custom_buttons['Stock Management'];
            }

            // Get current status
            const status = frm.doc.status || null;

            // Define all possible buttons
            const button_config = {
                'Stock Request': {method: 'create_stock_request', icon: 'fa fa-list'},
                'Stock Reserve': {method: 'stock_reserve', icon: 'fa fa-lock'},
                'Stock Unreserve': {method: 'stock_unreserve', icon: 'fa fa-unlock'},
                'Delivery': {method: 'delivery_request', icon: 'fa fa-truck'},
                'Cancel': {method: 'cancel_stock_management', icon: 'fa fa-times-circle'},
                'Update Serial/ SIM No': {method: 'update_serial_sim_no', icon: 'fa fa-barcode'} // New button added
            };

            // Status-based button visibility rules
            const status_rules = {
                'Stock Requested': ['Stock Reserve'],
                'Stock Reserve Requested': ['Stock Reserve'],
                'Stock Unreserve Requested': ['Stock Unreserve'],
                'Stock Delivery Requested': ['Delivery'],
                'Cancel Requested': ['Stock Unreserve', 'Cancel'],
                'Update Serial/ SIM No':['Update Serial/ SIM No']                
            };

            // Get allowed buttons for current status
            const allowed_buttons = status_rules[status] || [];
            const buttons = allowed_buttons.map(label => ({
                label,
                ...button_config[label]
            }));

            if (!buttons.length) return;

            // Create main button with hover effects
            const main_btn = frm.add_custom_button(__('Stock Management'), () => {});
            frm.custom_buttons = frm.custom_buttons || {};
            frm.custom_buttons['Stock Management'] = main_btn;

            // Button styling with hover effect
            $(main_btn)
                .addClass('dropdown-toggle')
                .attr('data-toggle', 'dropdown')
                .css({
                    'background-color': '#000000',
                    'border-color': '#000000',
                    'color': '#ffffff',
                    'transition': 'background-color 0.3s ease'
                })
                .hover(
                    function() { // Mouse enter
                        $(this).css('background-color', '#666666');
                    },
                    function() { // Mouse leave
                        $(this).css('background-color', '#000000');
                    }
                )
                .append('<span class="caret"></span>');

            // Create dropdown menu
            const $dropdown = $(`
                <ul class="dropdown-menu" 
                    style="min-width:240px;max-height:280px;overflow:hidden;padding:5px">
                </ul>
            `).insertAfter(main_btn);

            // Add menu items
            buttons.forEach(({label, method, icon}) => {
                $('<li>').append(
                    `<a href="#" class="dropdown-item" style="padding:10px 15px;">
                        <i class="${icon} mr-2" style="width:20px;"></i>
                        ${__(label)}
                    </a>`
                ).click(() => {
                    frappe.confirm(__('Proceed with {0}?', [label]), () => {
                        frm.call(method)
                            .then((r) => {
                                frm.refresh();
                                if (['create_stock_request', 'cancel_stock_management'].includes(method)) {
                                    frappe.publish_realtime('list_refresh', 'Stock Management');
                                }
                                frappe.show_alert(__('Action completed successfully'), 'green');
                            })
                            .catch(() => frappe.show_alert(__('Operation failed'), 'red'));
                    });
                }).appendTo($dropdown);
            });
        }
    }
});
//////////////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Stock Management', {
    onload: function (frm) {
        update_all_child_rows_stock(frm); // Ensure stock is updated on load
    },

    refresh: function (frm) {
        update_all_child_rows_stock(frm); // Also update on refresh
    },
});

frappe.ui.form.on('Stock Management Item', {
    item_code: function (frm, cdt, cdn) {
        fetch_stock_for_child_row(frm, cdt, cdn); // Update stock when item_code changes
    },

    warehouse: function (frm, cdt, cdn) {
        fetch_stock_for_child_row(frm, cdt, cdn); // Update stock when warehouse changes
    },
});

function fetch_stock_for_child_row(frm, cdt, cdn) {
    const row = frappe.get_doc(cdt, cdn);

    if (row.item_code && row.warehouse) {
        frappe.call({
            method: "nexapp.api.get_stock_details", // Adjust to your app's path
            args: {
                item_code: row.item_code,
                warehouse: row.warehouse,
            },
            callback: function (response) {
                if (response.message) {
                    const item_balance = response.message.item_balance || 0;

                    // Update the stock fields
                    frappe.model.set_value(cdt, cdn, "stock_balance", item_balance);
                    frappe.model.set_value(cdt, cdn, "stock_reserved", response.message.item_reserved || 0);
                }
            },
        });
    } else {
        frappe.model.set_value(cdt, cdn, "stock_balance", 0);
        frappe.model.set_value(cdt, cdn, "stock_reserved", 0);
    }
}

function update_all_child_rows_stock(frm) {
    const table_fieldname = "stock_management_item";
    const rows = frm.doc[table_fieldname] || [];

    rows.forEach((row) => {
        if (row.item_code && row.warehouse) {
            fetch_stock_for_child_row(frm, row.doctype, row.name);
        }
    });
}

////////////////////////////////////////////////////////////////////////////////

