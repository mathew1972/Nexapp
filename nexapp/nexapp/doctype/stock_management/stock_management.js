// Copyright (c) 2025, Nexapp Technologies Private Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on('Stock Management', {
    refresh: function(frm) {
        const fields = [
            'circuit_id', 'order_type', 'exiting_circuit_id', 'status', 'delivery_requested_date', 'solution',
            'stock_management_item', 'stock_activities', 'site_name', 'customer_name', 'site_address', 'city',
            'pincode', 'district', 'state', 'country', 'contact_person', 'primary_contact_mobile', 'email',
            'alternate_contact_person', 'alternate_contact_mobile', 'secondary_email', 'delivery_note_id'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                // Apply styles based on whether the field is required
                if (frm.fields_dict[field].df.reqd) {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-left': '4px solid red',
                        'border-radius': '7px',
                        'padding': '5px',
                        'outline': 'none',
                        'background-color': '#ffffff',
                        'transition': '0.3s ease-in-out'
                    });
                } else {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-radius': '7px',
                        'padding': '5px',
                        'outline': 'none',
                        'background-color': '#ffffff',
                        'transition': '0.3s ease-in-out'
                    });
                }

                // Apply focus and blur effects
                fieldElement.on('focus', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #80bdff',
                            'border-left': '5px solid red',
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                            'background-color': '#ffffff'
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #80bdff',
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                            'background-color': '#ffffff'
                        });
                    }
                });

                fieldElement.on('blur', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #ccc',
                            'border-left': '5px solid red',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #ccc',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    }
                });
            }
        });
    }
});

//////////////////////////////////////////////////////////////////
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
                'Update Serial/ SIM No': {method: 'update_serial_sim_no', icon: 'fa fa-barcode'} 
            };

            // Status-based button visibility rules
            const status_rules = {
                'Stock Requested': ['Stock Reserve'], 
                'Stock Reserved': ['Stock Unreserve'],                
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

            // Add menu items with special handling for Stock Unreserve
            buttons.forEach(({label, method, icon}) => {
                $('<li>').append(
                    `<a href="#" class="dropdown-item" style="padding:10px 15px;">
                        <i class="${icon} mr-2" style="width:20px;"></i>
                        ${__(label)}
                    </a>`
                ).click(() => {
                    if (method === 'stock_unreserve') {
                        // Special handling for Stock Unreserve
                        frm.call(method)
                            .then((r) => {
                                if (r.message.needs_confirmation) {
                                    frappe.confirm(
                                        r.message.message,
                                        () => {
                                            // User confirmed - proceed with unreserve
                                            frm.call('confirm_stock_unreserve')
                                                .then(() => {
                                                    frm.refresh();
                                                    frappe.show_alert(__('Stock unreserved successfully'), 'green');
                                                })
                                                .catch(() => frappe.show_alert(__('Operation failed'), 'red'));
                                        },
                                        () => {
                                            // User cancelled
                                            frappe.show_alert(__('Operation cancelled'), 'orange');
                                        },
                                        r.message.title
                                    );
                                } else {
                                    frm.refresh();
                                    frappe.show_alert(__('Action completed successfully'), 'green');
                                }
                            })
                            .catch(() => frappe.show_alert(__('Operation failed'), 'red'));
                    } else {
                        // Standard confirmation for other actions
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
                    }
                }).appendTo($dropdown);
            });
        }
    },
    onload: function (frm) {
        update_all_child_rows_stock(frm); // Ensure stock is updated on load
    }
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

//////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Delivery Note', {
    custom_dn_circuit_id(frm) {
        if (frm.doc.custom_dn_circuit_id) {
            frappe.call({
                method: 'nexapp.api.update_site_delivery_status',
                args: {
                    site_id: frm.doc.custom_dn_circuit_id
                },
                callback: function(r) {
                    if (r.message === 'updated') {
                        frappe.msgprint('Site and Site Items updated to "Stock Delivery In-Process"');
                    } else {
                        frappe.msgprint('No matching Site found or error occurred.');
                    }
                }
            });
        }
    }
});
//////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Stock Management', {
    refresh: function(frm) {
        // Ensure the field is rendered
        setTimeout(() => {
            const field = frm.fields_dict["instructions"];
            if (field && field.$wrapper) {
                field.$wrapper.find('textarea, input').css('background-color', '#ffebe6');  // Light red
            }
        }, 100);
    }
});

///////////////////////////////////////////////////////////////////////////////
// Additional Item to Site

frappe.ui.form.on('Stock Management', {
    refresh(frm) {
        frm.page.clear_primary_action();

        // Check if there are any rows where addition_item = "Yes" and added__to_site != 1
        const hasPendingItems = (frm.doc.stock_management_item || []).some(
            row => row.addition_item === "Yes" && row.added__to_site != 1
        );

        // Only show button if there are items pending to be added
        if (hasPendingItems) {
            frm.page.add_button('Add Additional Item To Site', () => {
                frappe.confirm(
                    'Are you sure you want to add all Additional Items to the corresponding Site?',
                    () => {
                        frappe.call({
                            method: 'nexapp.nexapp.doctype.stock_management.stock_management.add_additional_item_to_site',
                            args: {
                                stock_management_name: frm.doc.name
                            },
                            callback: function (r) {
                                if (!r.exc) {
                                    frappe.msgprint({
                                        message: __('All Additional Items added successfully to Site'),
                                        indicator: 'green'
                                    });
                                    frm.reload_doc();
                                }
                            }
                        });
                    }
                );
            }).css({
                'background-color': '#FF0000',
                'color': '#FFFFFF',
                'font-weight': 'bold',
                'border-radius': '6px'
            });
        }
    }
});
