
        /* 
        =============================
        1. Styling Input Fields
        =============================
        */
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
        
                /* =============================
                   2. Adding Icons to Fields
                   ============================= */
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
        
                /* =============================
                   3. Styling Buttons
                   ============================= */
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
        
        