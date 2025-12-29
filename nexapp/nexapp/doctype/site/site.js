frappe.ui.form.on('Site', {
    refresh: function(frm) {
        // List of fields to be styled
        const fields = [
            'shipment_request', 'product_assigment', 'lms_request', 'feasibility_information', 'site_name', 'customer',
            'site_type', 'region', 'existing_circuit_id', 'delivery_date', 'circuit_id', 'site_status', 'stage',
            'customer_type', 'order_type', 'site_id__legal_code', 'site_remark', 'product_in_service',
            'product_assigment_created', 'contact_address', 'street', 'city', 'country', 'longitude', 'pincode',
            'district', 'state', 'latitude', 'primary_contact', 'contact_html', 'column_break_fvvn', 'alternate_contact',
            'contact_html2', 'project', 'project_name', 'expected_start_date', 'expected_end_date', 'sales_order',
            'sales_order_date', 'sales_order_amount', 'customer_po_no', 'customer_po_date', 'customer_po_amount',
            'invoice_no', 'invoice_date', 'managed_service', 'config_type', 'solution', 'primary_plan', 'secondary_plan',
            'mbb_bandwidth', 'delivery_challan_section', 'dc', 'installation', 'address', 'exiting_circuit_id',
            'territory', 'description', 'address_street', 'contact_person', 'primary_contact_mobile', 'email',
            'alternate_contact_person', 'alternate_contact_mobile', 'secondary_email', 'solution_code', 'solution_name',
            'static_ip', 'nos_of_static_ip_required', 'primary_data_plan', 'secondary_plan', 'managed_services',
            'config_type', 'shipment', 'shiping_date', 'installation_note', 'date', 'project_manager', 'child_project',
            'subscription', 'shipment_pincode', 'shipment_address', 'shipment_district', 'shipment_state',
            'shipment_country', 'shipment_city', 'shipment_contact_person', 'contact_mobile_no', 'lms_stage',
            'delivery_requested_date','stock_management_id','im_id' ,'project_review','lms_review',
            'task_ownership','solution_name','customer_email_id','customer_email_idii','customer_email_id_3','shifted_circuit_id',
            'site_shifted_date'
        ];

        // Iterate over each field to apply styles
        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                // Target the input, textarea, or select element inside the field wrapper
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                // Base styling for all fields
                const baseStyle = {
                    'border': '1px solid #ccc',
                    'border-radius': '7px',
                    'padding': '5px',
                    'outline': 'none',
                    'background-color': '#ffffff',
                    'transition': '0.3s ease-in-out'
                };

                // Add required field-specific styling (red left border)
                if (frm.fields_dict[field].df.reqd) {
                    baseStyle['border-left'] = '4px solid red';
                }

                // Apply base style
                fieldElement.css(baseStyle);

                // On focus, apply enhanced style with box-shadow
                fieldElement.on('focus', function() {
                    const focusStyle = {
                        'border': '1px solid #80bdff',
                        'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                        'background-color': '#ffffff'
                    };

                    if (frm.fields_dict[field].df.reqd) {
                        focusStyle['border-left'] = '5px solid red';
                    }

                    $(this).css(focusStyle);
                });

                // On blur, revert to base style
                fieldElement.on('blur', function() {
                    const blurStyle = {
                        'border': '1px solid #ccc',
                        'box-shadow': 'none',
                        'background-color': '#ffffff'
                    };

                    if (frm.fields_dict[field].df.reqd) {
                        blurStyle['border-left'] = '5px solid red';
                    }

                    $(this).css(blurStyle);
                });
            }
        });
    }
});

///////////////////////////////////////////////////////////////////////////

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

frappe.ui.form.on('Site', {
    refresh: function(frm) {
        // Ensure the field exists before attaching event
        if (frm.fields_dict.shipment_pincode && frm.fields_dict.shipment_pincode.input) {
            $(frm.fields_dict.shipment_pincode.input).on('input', debounce(function() {
                const pincode = frm.doc.shipment_pincode?.replace(/\D/g, '') || '';

                // Reset alert flag when user starts typing
                frm._alert_shown = false;

                if (pincode.length === 6) {
                    frappe.show_alert({ message: "Fetching location details...", indicator: "blue" });

                    fetch("https://api.postalpincode.in/pincode/" + pincode)
                        .then(response => response.json())
                        .then(data => {
                            if (data && data[0].Status === "Success" && data[0].PostOffice.length > 0) {
                                const postOffice = data[0].PostOffice[0];

                                frm.set_value("shipment_district", postOffice.District || "");
                                frm.set_value("shipment_country", postOffice.Country || "India");
                                frm.set_value("shipment_city", postOffice.Block || "");
                                frm.set_value("shipment_state", postOffice.State || "");
                            } else {
                                frappe.msgprint("Pincode not found or invalid.");
                            }
                        })
                        .catch(error => {
                            console.error("API Error:", error);
                            frappe.msgprint("Error fetching data from API.");
                        });
                } else if (pincode.length === 0) {
                    frm.set_value("shipment_district", "");
                    frm.set_value("shipment_country", "");
                    frm.set_value("shgipment_city", "");
                    frm.set_value("shipment_state", "");
                }
            }, 500));
        }
    }
});

////////////////////////////////////////////////////////////////////////////////////
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

            // Define all possible buttons with methods and icons
            const button_config = {
                'Stock Request': { method: 'create_stock_request', icon: 'fa fa-list' },
                'Delivery Request': { method: 'delivery_request', icon: 'fa fa-truck' },
                'Cancelled': { method: 'cancel_stock_request', icon: 'fa fa-times-circle' },
                'Stock Return Request': { method: 'stock_return_request', icon: 'fa fa-undo' },
                'On Hold': { method: 'mark_on_hold', icon: 'fa fa-pause-circle' }
            };

            // Define which buttons are visible for which statuses
            const status_rules = {
                'Open': ['Stock Request'],
                'Stock Requested': ['Delivery Request', 'Cancelled', 'On Hold'],
                'Stock Delivery Requested': ['Cancelled', 'On Hold'],
                'Delivery In-Process': ['On Hold','Cancelled'],
                'Stock Shipment In-Process': ['Stock Return Request'],
                'Stock Reserved': ['Stock Request','Delivery Request','On Hold','Cancelled'],
                'Stock Delivered': ['Stock Return Request'],
                'Cancel Requested': ['Stock Request'],
                'Cancelled': ['Stock Request','On Hold'],
                'On Hold': ['Stock Request','Delivery Request','Cancelled'],
                'Stock Returned': ['Stock Request','Delivery Request','On Hold','Cancelled'],
                'Return Requested': ['Cancelled'],
                'Stock Lost': ['Stock Request','Delivery Request','On Hold','Cancelled']
            };

            const allowed_buttons = status_rules[status] || [];
            const buttons = allowed_buttons.map(label => ({
                label,
                ...button_config[label]
            }));

            if (!buttons.length) return;

            // Add main button
            const main_btn = frm.add_custom_button(__('Stock Management'), () => {});
            frm.custom_buttons = frm.custom_buttons || {};
            frm.custom_buttons['Stock Management'] = main_btn;

            // Style main button as dropdown
            $(main_btn)
                .addClass('dropdown-toggle btn-primary')
                .attr('data-toggle', 'dropdown')
                .append('<span class="caret"></span>');

            // Create dropdown container
            const $dropdown = $(`
                <ul class="dropdown-menu" 
                    style="min-width:240px;max-height:280px;overflow:auto;padding:5px">
                </ul>
            `).insertAfter(main_btn);

            // Add each button as a menu item
            buttons.forEach(({label, method, icon}) => {
                $('<li>').append(
                    `<a href="#" class="dropdown-item" style="padding:10px 15px;">
                        <i class="${icon} mr-2" style="width:20px;"></i>
                        ${__(label)}
                    </a>`
                ).click(() => {
                    if (label === 'Delivery Request') {
                        open_delivery_dialog(frm, method);
                    } else {
                        frappe.confirm(__('Proceed with {0}?', [label]), () => {
                            frm.call(method)
                                .then(() => {
                                    frm.refresh();
                                    if (['create_stock_request', 'cancel_stock_request', 'stock_return_request', 'mark_on_hold'].includes(method)) {
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
    }
});

// ✅ Perfectly Formatted Delivery Dialog with Enhanced Address and Contact Display
function open_delivery_dialog(frm, method) {
    // Get current site details
    const site_details = {
        address_street: frm.doc.address_street || '',
        pincode: frm.doc.pincode || '',
        city: frm.doc.city || '',
        district: frm.doc.district || '',
        state: frm.doc.state || '',
        country: frm.doc.country || 'India',
        contact_person: frm.doc.contact_person || '',
        primary_contact_mobile: frm.doc.primary_contact_mobile || ''
    };

    let dlg = new frappe.ui.Dialog({
        title: __('🚚 Set Delivery Info'),
        fields: [
            // Info Note
            {
                fieldtype: 'HTML',
                fieldname: 'shipment_note',
                options: `
                    <div style="background: #e6f7ff; border-left: 5px solid #1890ff; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                        <i class="fa fa-info-circle" style="color:#1890ff; margin-right: 6px;"></i>
                        <strong>Note:</strong> Please confirm the contact number and address with the customer or site in-charge to avoid shipment delays.
                    </div>`
            },

            // Delivery Date
            {
                label: '📅 Shipment Delivery Date',
                fieldtype: 'Date',
                fieldname: 'delivery_date',
                reqd: 1
            },

            // Shipment Instruction
            {
                fieldtype: 'Section Break'
            },
            {
                label: '📦 Shipment Instruction if any',
                fieldtype: 'Check',
                fieldname: 'is_different_instruction',
                default: 0
            },
            {
                label: '✍️ Shipment Instruction',
                fieldtype: 'Small Text',
                fieldname: 'shipment_instruction',
                depends_on: 'eval:doc.is_different_instruction==1'
            },

            // Current Address Display
            {
                fieldtype: 'Section Break',
                //label: 'Current Site Address',
                collapsible: 0
            },
            {
                fieldtype: 'HTML',
                fieldname: 'current_address_display',
                options: `
                    <div class="current-address-display" style="
                        padding: 15px;
                        background: #fff0f0;
                        border-radius: 4px;
                        margin-bottom: 15px;
                        border: 1px solid #ffd6d6;
                    ">
                        <div style="
                            margin-bottom: 12px;
                            font-weight: 600;
                            color: #333;
                            font-size: 14px;
                        ">
                            <i class="fa fa-map-marker" style="color: #e74c3c; margin-right: 8px;"></i>
                            CURRENT SITE ADDRESS
                        </div>
                        
                        <div style="
                            margin-bottom: 12px;
                            padding: 8px;
                            background: white;
                            border-radius: 3px;
                            border-left: 3px solid #e74c3c;
                        ">
                            <div style="font-weight: 600; margin-bottom: 5px;">Address:</div>
                            <div style="white-space: pre-wrap; min-height: 60px;">${site_details.address_street || 'Not specified'}</div>
                        </div>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">Pin Code:</div>
                                <div>${site_details.pincode || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">City:</div>
                                <div>${site_details.city || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">District:</div>
                                <div>${site_details.district || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">State:</div>
                                <div>${site_details.state || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">Country:</div>
                                <div>${site_details.country || 'Not specified'}</div>
                            </div>
                        </div>
                    </div>`
            },
            
            // Shipping Address Toggle
            {
                label: '🏠 Is your Shipping Address different from the above Address?',
                fieldtype: 'Check',
                fieldname: 'is_different_address',
                default: 0
            },

            // Shipping Address Fields
            {
                fieldtype: 'Section Break',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '📍 Shipping Address',
                fieldtype: 'Small Text',
                fieldname: 'shipment_address',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🔢 Pin Code',
                fieldtype: 'Data',
                fieldname: 'shipment_pincode',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🏙️ City',
                fieldtype: 'Data',
                fieldname: 'shipment_city',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🌐 District',
                fieldtype: 'Data',
                fieldname: 'shipment_district',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🗺️ State',
                fieldtype: 'Data',
                fieldname: 'shipment_state',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🌏 Country',
                fieldtype: 'Data',
                fieldname: 'shipment_country',
                default: 'India',
                depends_on: 'eval:doc.is_different_address==1'
            },

            // Current Contact Display
            {
                fieldtype: 'Section Break',
                //label: 'Current Contact Details',
                collapsible: 0
            },
            {
                fieldtype: 'HTML',
                fieldname: 'current_contact_display',
                options: `
                    <div class="current-contact-display" style="
                        padding: 15px;
                        background: #fff0f0;
                        border-radius: 4px;
                        margin-bottom: 15px;
                        border: 1px solid #ffd6d6;
                    ">
                        <div style="
                            margin-bottom: 12px;
                            font-weight: 600;
                            color: #333;
                            font-size: 14px;
                        ">
                            <i class="fa fa-user" style="color: #e74c3c; margin-right: 8px;"></i>
                            CURRENT CONTACT DETAILS
                        </div>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                            <div style="flex: 0 0 calc(50% - 12px); min-width: 200px;">
                                <div style="font-weight: 600;">Contact Person:</div>
                                <div style="padding: 5px 0;">${site_details.contact_person || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(50% - 12px); min-width: 200px;">
                                <div style="font-weight: 600;">Contact Mobile No:</div>
                                <div style="padding: 5px 0;">${site_details.primary_contact_mobile || 'Not specified'}</div>
                            </div>
                        </div>
                    </div>`
            },
            
            // Contact Info Toggle
            {
                label: '📞 Is your contact information different from what shown above?',
                fieldtype: 'Check',
                fieldname: 'is_different_contact',
                default: 0
            },

            // Contact Info Fields
            {
                fieldtype: 'Section Break',
                depends_on: 'eval:doc.is_different_contact==1'
            },
            {
                label: '👤 Contact Person',
                fieldtype: 'Data',
                fieldname: 'shipment_contact_person',
                depends_on: 'eval:doc.is_different_contact==1'
            },
            {
                label: '📱 Contact Mobile No',
                fieldtype: 'Data',
                fieldname: 'contact_mobile_no',
                depends_on: 'eval:doc.is_different_contact==1'
            }
        ],
        primary_action_label: __('✅ Request Delivery'),
        primary_action(values) {
            if (!values.delivery_date) {
                frappe.msgprint(__('📅 Please set a shipment delivery date.'));
                return;
            }

            // Shipment Instruction
            if (values.is_different_instruction) {
                if (!values.shipment_instruction) {
                    frappe.msgprint(__('✍️ Please enter Shipment Instruction.'));
                    return;
                }
                frm.set_value('instructions', values.shipment_instruction);
            }

            // Update Site fields if different address/contact is selected
            if (values.is_different_address) {
                frm.set_value('shipment_address', values.shipment_address);
                frm.set_value('shipment_pincode', values.shipment_pincode);
                frm.set_value('shipment_city', values.shipment_city);
                frm.set_value('shipment_district', values.shipment_district);
                frm.set_value('shipment_state', values.shipment_state);
                frm.set_value('shipment_country', values.shipment_country);
            }

            if (values.is_different_contact) {
                frm.set_value('shipment_contact_person', values.shipment_contact_person);
                frm.set_value('contact_mobile_no', values.contact_mobile_no);
            }

            frm.call(method, { 
                delivery_date: values.delivery_date,
                is_different_instruction: values.is_different_instruction ? 1 : 0,
                shipment_instruction: values.is_different_instruction ? values.shipment_instruction : null,
                is_different_address: values.is_different_address ? 1 : 0,
                shipment_address: values.is_different_address ? values.shipment_address : null,
                shipment_pincode: values.is_different_address ? values.shipment_pincode : null,
                shipment_city: values.is_different_address ? values.shipment_city : null,
                shipment_district: values.is_different_address ? values.shipment_district : null,
                shipment_state: values.is_different_address ? values.shipment_state : null,
                shipment_country: values.is_different_address ? values.shipment_country : null,
                is_different_contact: values.is_different_contact ? 1 : 0,
                shipment_contact_person: values.is_different_contact ? values.shipment_contact_person : null,
                contact_mobile_no: values.is_different_contact ? values.contact_mobile_no : null
            }).then(() => {
                frm.refresh();
                dlg.hide();
                frappe.show_alert({
                    message: __('🚚 Delivery Request Created'),
                    indicator: 'green'
                });
            });
        }
    });

    // Show/hide address fields based on checkbox
    dlg.fields_dict.is_different_address.$input.on('change', function() {
        const isDifferent = $(this).is(':checked');
        const $addressDisplay = dlg.fields_dict.current_address_display.$wrapper;
        $addressDisplay.toggle(!isDifferent);
    });

    // Show/hide contact fields based on checkbox
    dlg.fields_dict.is_different_contact.$input.on('change', function() {
        const isDifferent = $(this).is(':checked');
        const $contactDisplay = dlg.fields_dict.current_contact_display.$wrapper;
        $contactDisplay.toggle(!isDifferent);
    });

    dlg.show();
}
///////////////////////////////////////////////////////////////

//Site To LMS Request Upate

frappe.ui.form.on('Site', {
    refresh: function(frm) {
        const isPending = frm.doc.lms_stage === "Pending";
        const isValidType = frm.doc.lms_type === "Single" || frm.doc.lms_type === "Dual";

        if (frm.doc.docstatus === 0 && isPending && isValidType) {
            frm.add_custom_button(__('Create LMS Request'), function () {
                let lms_type_value = frm.doc.lms_type || 'Single';

                const d = new frappe.ui.Dialog({
                    title: 'LMS Request Details',
                    fields: [
                        {
                            label: 'Solution Name',
                            fieldname: 'solution_name',
                            fieldtype: 'Data',
                            default: frm.doc.solution_name,
                            read_only: 1
                        },
                        {
                            label: 'LMS Type',
                            fieldname: 'lms_type',
                            fieldtype: 'Select',
                            options: ['Single', 'Dual'],
                            default: lms_type_value,
                            reqd: 1
                        }
                    ],
                    primary_action_label: 'Create Request',
                    primary_action(values) {
                        if (frm.doc.lms_type !== values.lms_type) {
                            frm.set_value('lms_type', values.lms_type);
                        }

                        d.hide();

                        frappe.confirm(
                            `Are you sure you want to create LMS Request for this Site (${frm.doc.name})?`,
                            function () {
                                // Function to call API after save/skip
                                let after_save = () => {
                                    frappe.call({
                                        method: 'nexapp.api.create_lms_request',
                                        args: {
                                            site_name: frm.doc.name
                                        },
                                        callback: function (r) {
                                            if (r.message) {
                                                frappe.msgprint(__('LMS Request {0} created successfully', [r.message]));
                                                frm.reload_doc();
                                            }
                                        },
                                        error: function (r) {
                                            frappe.msgprint(__('Error: ' + r.message));
                                        }
                                    });
                                };

                                // Save only if there are unsaved changes
                                if (frm.is_dirty()) {
                                    frm.save().then(() => after_save());
                                } else {
                                    after_save();
                                }
                            }
                        );
                    }
                });

                d.show();
            }).addClass('btn-primary');
        }
    }
});

////////////////////////////////////////////////////////////////////////////
///LMS VAladation
frappe.ui.form.on('Site', {
    refresh: function(frm) {
        // No action here anymore to allow manual control
    },
    solution_name: function(frm) {
        if (frm.doc.lms_type_auto_set) {
            return; // logic has already run once, don't run again
        }

        handle_lms_logic(frm);
        frm.set_value("lms_type_auto_set", 1); // mark logic as executed
    }
});

function handle_lms_logic(frm) {
    const raw = (frm.doc.solution_name || "").toUpperCase();

    const mbbMatches = raw.match(/MBB/g) || [];
    const illMatches = raw.match(/ILL/g) || [];

    const mbbCount = mbbMatches.length;
    const illCount = illMatches.length;

    const hasMBB = mbbCount > 0;
    const hasILL = illCount > 0;
    const hasLTE = raw.includes("LTE");
    const hasDule = raw.includes("DULE");  // check for typo word "Dule"

    let lms_type = "";

    if (hasDule || (illCount >= 2) || (hasILL && hasMBB) || mbbCount >= 2) {
        lms_type = "Dual";
    } else if (hasMBB) {
        lms_type = "Single";
    } else {
        lms_type = "No LMS";
    }

    frm.set_value("lms_type", lms_type);

    if (hasILL || hasMBB || hasDule) {
        if (frm.doc.lms_stage === "No LMS") {
            frm.set_value("lms_stage", "");
        }
        frm.toggle_display("lms_stage", true);
        toggle_tab(frm, "lms_tab", true);
    } else {
        frm.set_value("lms_stage", "No LMS");
        frm.toggle_display("lms_stage", false);
        toggle_tab(frm, "lms_tab", false);
    }
}

function toggle_tab(frm, fieldname, show = true) {
    const tab_field = frm.fields_dict[fieldname];
    if (tab_field && tab_field.wrapper) {
        const $tab_pane = $(tab_field.wrapper).closest('.tab-pane');
        const tab_label = tab_field.df.label;
        if (show) {
            $tab_pane.show();
            $(`.form-tabs .nav-link:contains("${tab_label}")`).closest('.nav-item').show();
        } else {
            $tab_pane.hide();
            $(`.form-tabs .nav-link:contains("${tab_label}")`).closest('.nav-item').hide();
        }
    }
}

/////////////////////////////////////////////////////////////////////////
// Installation Note Creation
frappe.ui.form.on('Site', {
    refresh: function(frm) {
        // Style the button
        setTimeout(() => {
            frm.fields_dict.create_installation.$wrapper.find('button').css({
                'background-color': '#000000',
                'color': '#ffffff',
                'font-weight': 'bold'
            });
        }, 500);
    },

    create_installation: function(frm) {
        frappe.confirm(
            __('Are you sure you want to create the Installation Note?'),
            function() {
                // YES: User confirmed
                frappe.call({
                    method: "nexapp.api.create_installation_note",
                    args: {
                        site_name: frm.doc.name
                    },
                    callback: function(r) {
                        if (!r.exc) {
                            frappe.msgprint(__('Installation Note {0} created successfully', [r.message]));
                            frm.reload_doc();
                        }
                    }
                });
            },
            function() {
                // NO: User cancelled
                frappe.msgprint(__('Action cancelled by user.'));
            }
        );
    }
});

////////////////////////////////////////////////////////////////
frappe.ui.form.on('Site', {
    onload_post_render(frm) {
        // Wait a bit to ensure layout is rendered
        setTimeout(() => {
            const labels = ["Project Review", "Project Comments"]; // 👈 add all section labels here

            labels.forEach(label => {
                $('div.section-head:contains("' + label + '")')
                    .closest('.form-section')
                    .css({
                        "background-color": "#f7e6ff",
                        "padding": "15px",
                        "border-radius": "8px",
                        "margin-bottom": "20px"
                    });
            });
        }, 300); // Delay to ensure full rendering
    }
});

///////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Site', {
    after_save(frm) {
        // Watch for changes in assignments
        frm.get_docinfo().assignments.forEach(assign => {
            if (!frm.doc.project_manager) {
                // Set the first assigned user as project_manager
                frm.set_value('project_manager', assign.owner);
            }
        });
    },

    // Optional: also update when the form is loaded
    onload_post_render(frm) {
        if (!frm.doc.project_manager && frm.get_docinfo) {
            const assignments = frm.get_docinfo().assignments;
            if (assignments && assignments.length > 0) {
                frm.set_value('project_manager', assignments[0].owner);
            }
        }
    }
});
///////////////////////////////////////////////////////

frappe.ui.form.on('Site', {
    refresh(frm) {
        if (!frm.doc.site_created_date && frm.doc.creation) {
            const mysqlCompatibleDatetime = frappe.datetime.get_datetime_as_string(frm.doc.creation);
            frm.set_value('site_created_date', mysqlCompatibleDatetime);
        }
    }
});
///////////////////////////////////////////////////////////////
frappe.ui.form.on('Site', {
    refresh(frm) {
        if (!frm.doc.site_created_date) return;

        // Convert site_created_date to Date object
        const siteCreatedDate = frappe.datetime.str_to_obj(frm.doc.site_created_date);

        let endDate;

        if (frm.doc.date) {
            // If 'date' is present, use it
            endDate = frappe.datetime.str_to_obj(frm.doc.date);
        } else {
            // Otherwise use today's date
            endDate = frappe.datetime.str_to_obj(frappe.datetime.get_today());
        }

        // Calculate difference in milliseconds
        const diffTime = endDate - siteCreatedDate;

        // Convert to full days
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Set the total_days field
        frm.set_value('total_days', diffDays);
    }
});
/////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Site', {
    refresh(frm) {
        if (frm.doc.total_days != null) {
            const color = frm.doc.total_days > 30 ? '#F40000' : '#28a745'; // Custom red if > 30

            const html = `
                <div style="margin-left: 60%;">
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        width: 1.5cm;
                        height: 1.5cm;
                        border-radius: 50%;
                        background-color: ${color};
                        color: white;
                        font-weight: bold;
                        font-size: 9px;
                        text-align: center;
                        box-shadow: 0 0 6px rgba(0,0,0,0.2);
                    ">
                        <div style="font-size: 9px; font-weight: bold;">Running Days</div>
                        <div style="font-size: 12px; font-weight: bold;">${frm.doc.total_days}</div>
                    </div>
                </div>
            `;

            frm.set_df_property('running_days', 'options', html);
            frm.refresh_field('running_days');
        }
    }
});
////////////////////////////////////////////////////////////////////////////////
//Site Information
frappe.ui.form.on('Site', {
    refresh: function(frm) {
        // Inject info icon into the HTML field "info2"
        frm.fields_dict.info2.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_feasibility_info_icon" title="Feasibility Info" style="cursor: pointer; font-size: 29px; color: #FF0000;">
                    <i class="fa fa-info-circle"></i>
                </a>
            </div>
        `);

        // Bind click event
        frm.fields_dict.info2.$wrapper.find('#show_feasibility_info_icon').on('click', function() {
            show_feasibility_info_dialog();
        });
    }
});

// Function to show feasibility info dialog
function show_feasibility_info_dialog() {
    const feasibility_html = `
        <div style="padding: 10px; line-height: 1.6; max-height: 500px; overflow-y: auto;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">📌 Project Management Starts with Feasibility</h4>
            <p>This initiative begins with a comprehensive <b>feasibility assessment</b>, which determines the suitability of a site for further development. All project activities, including hardware deployment and Learning Management System (LMS) setup, originate from this crucial stage.</p>
            
            <p>Once a site is validated and generated based on feasibility findings, the project proceeds with full coordination of tasks, ensuring each phase—from planning to installation—is aligned with technical and operational goals.</p>

            <h5 style="margin-top: 20px;">🔧 Scope of Work</h5>
            <ul style="margin-left: 20px;">
                <li>Procurement, delivery, and installation of hardware specific to site requirements</li>
                <li>Configuration and deployment of LMS for seamless integration with installed systems</li>
                <li>Site readiness verification, quality assurance checks, and technical validations</li>
                <li>Software installation, network configuration, and system testing</li>
            </ul>

            <h5 style="margin-top: 20px;">📋 Project Execution Highlights</h5>
            <ul style="margin-left: 20px;">
                <li>Complete ownership from feasibility to final installation</li>
                <li>Cross-functional coordination with vendors and stakeholders</li>
                <li>Proactive risk management and mitigation strategies</li>
                <li>Use of project management tools (Gantt charts, trackers, risk registers)</li>
            </ul>

            <p style="margin-top: 20px;"><b>Communication and documentation are key to maintaining progress and quality across all stages.</b> Regular status meetings, site visits, and performance reviews ensure transparency and alignment with objectives.</p>

            <p><b>In summary:</b> This is a full-cycle project, beginning with feasibility and ending with successful system installation. Accurate feasibility data forms the foundation for everything that follows—let’s ensure we get it right from the start.</p>
        </div>
    `;

    const dialog = new frappe.ui.Dialog({
        title: 'Feasibility Information',
        size: 'large',
        fields: [
            {
                fieldname: 'feasibility_html',
                fieldtype: 'HTML',
                options: feasibility_html
            }
        ],
        primary_action_label: 'Close',
        primary_action() {
            dialog.hide();
        }
    });

    dialog.show();
}
