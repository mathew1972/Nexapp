frappe.ui.form.on('Site', {
    refresh: function(frm) {
        const fields = [
            'shipment_request', 'product_assigment', 'lms_request', 'feasibility_information', 'site_name', 'customer',
            'site_type', 'region', 'existing_circuit_id', 'delivery_date', 'circuit_id', 'site_status', 'stage', 
            'customer_type', 'order_type', 'site_id__legal_code', 'site_remark', 'product_in_service', 'product_assigment_created', 
            'contact_address', 'street', 'city', 'country', 'longitude', 'pincode', 'district', 'state', 'latitude', 
            'primary_contact', 'contact_html', 'column_break_fvvn', 'alternate_contact', 'contact_html2', 'project', 
            'project_name', 'expected_start_date', 'expected_end_date', 'sales_order', 'sales_order_date', 'sales_order_amount', 
            'customer_po_no', 'customer_po_date', 'customer_po_amount', 'invoice_no', 'invoice_date', 'managed_service', 
            'config_type', 'solution', 'primary_plan', 'secondary_plan', 'mbb_bandwidth', 'delivery_challan_section', 'dc', 
            'installation', 'address'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

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

        
        const fieldsWithIcons = [
            { field: 'site_name', icon: 'fa-user-o', topPosition: '70%' },
            { field: 'delivery_date', icon: 'fa-calendar', topPosition: '70%' },
            { field: 'region', icon: 'fa-map-marker', topPosition: '70%' },
            { field: 'customer', icon: 'fa-building-o', topPosition: '70%' },
            { field: 'email', icon: 'fa-envelope-o', topPosition: '70%' },
            { field: 'longitude', icon: 'fa-globe', topPosition: '70%' },
            { field: 'latitude', icon: 'fa-globe', topPosition: '70%' },
            { field: 'primary_contact', icon: 'fa-phone', topPosition: '70%' },
            { field: 'alternate_contact', icon: 'fa-phone', topPosition: '70%' },
        ];

        fieldsWithIcons.forEach(function (config) {
            const fieldWrapper = frm.fields_dict[config.field]?.wrapper;
            if (!fieldWrapper) return;

            $(fieldWrapper).css('position', 'relative');

            // Prevent duplicate icons
            if ($(fieldWrapper).find('.custom-field-icon').length === 0) {
                $(fieldWrapper).append(`
                    <span class="custom-field-icon" style="position: absolute; right: 10px; top: ${config.topPosition}; transform: translateY(-50%);">
                        <i class="fa ${config.icon}" aria-hidden="true"></i>
                    </span>
                `);
            }
        });

        
        const buttons = ['provisioning_request', 'shipment_request', 'product_assigment', 'lms_request', 'feasibility_information'];
        buttons.forEach(function (button) {
            const buttonInput = frm.fields_dict[button]?.input;
            if (!buttonInput) return;

            $(buttonInput).css({
                'background-color': '#FBA910',
                'border-color': '#FBA910',
                'color': 'white',
                'border-radius': '5px',
                'padding': '5px 15px',
                'cursor': 'pointer',
                'transition': '0.3s ease-in-out'
            });

            // Hover effect for buttons
            $(buttonInput).hover(
                function () {
                    $(this).css({
                        'background-color': '#e09b0c',
                        'border-color': '#e09b0c'
                    });
                },
                function () {
                    $(this).css({
                        'background-color': '#FBA910',
                        'border-color': '#FBA910'
                    });
                }
            );
        });
    }
});


frappe.ui.form.on('Site', {
    refresh: function(frm) {
        if (!frm.is_new()) {
            // Remove existing button if any
            if (frm.custom_buttons && frm.custom_buttons['Stock Management']) {
                frm.custom_buttons['Stock Management'].remove();
                delete frm.custom_buttons['Stock Management'];
            }

            // Get current status from first site item
            const site_item = frm.doc.site_item && frm.doc.site_item[0];
            const status = site_item ? site_item.status : null;

            // Define all possible buttons in order
            const button_config = {
                'Stock Request': {method: 'create_stock_request', icon: 'fa fa-list'},
                'Stock Reserve': {method: 'stock_reserve', icon: 'fa fa-lock'},
                'Stock Unreserve': {method: 'stock_unreserve', icon: 'fa fa-unlock'},
                'Delivery Request': {method: 'delivery_request', icon: 'fa fa-truck'},
                'Cancel Request': {method: 'cancel_stock_request', icon: 'fa fa-times-circle'},
                'Stock Return Request': {method: 'stock_return_request', icon: 'fa fa-undo'}
            };

            // Status-based button visibility rules
            const status_rules = {
                'Open': ['Stock Request', 'Stock Reserve'],
                'Stock Reserve Requested': ['Cancel Request'],
                'Stock Requested': ['Stock Reserve', 'Cancel Request'],                    
                'Stock Reserved': ['Stock Unreserve', 'Delivery Request'],                        
                'Stock Unreserv Requested': ['Cancel Request'],
                'Stock Unreserved': ['Stock Reserve', 'Stock Request'],                        
                'Delivery Requested': ['Cancel Request', 'Stock Return Request'],
                'Stock Delivered': ['Stock Return Request'],                        
                'Cancel Requested': ['Stock Request', 'Stock Reserve'],
                'Cancelled': ['Stock Request', 'Stock Reserve'],
                'Return Requested': ['Cancel Request']
            };

            // Get allowed buttons for current status
            const allowed_buttons = status_rules[status] || [];
            const buttons = allowed_buttons.map(label => ({
                label,
                ...button_config[label]
            }));

            if (!buttons.length) return;

            // Create main button
            const main_btn = frm.add_custom_button(__('Stock Management'), () => {});
            frm.custom_buttons = frm.custom_buttons || {};
            frm.custom_buttons['Stock Management'] = main_btn;

            // Button styling
            $(main_btn)
                .addClass('dropdown-toggle btn-primary')
                .attr('data-toggle', 'dropdown')
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
                                if (['create_stock_request', 'cancel_stock_request', 'stock_return_request'].includes(method)) {
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