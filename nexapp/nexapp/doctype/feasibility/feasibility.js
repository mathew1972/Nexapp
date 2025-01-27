frappe.ui.form.on('Feasibility', {
    refresh: function (frm) {
        const fields = [
            'site_information_tab', 'site_information_section', 'column_break_vfai', 
            'site_name', 'customer', 'customer_request', 'feasibility_completed_date', 
            'region', 'column_break_zthd', 'circuit_id', 'feasibility_type', 
            'exiting_circuit_id', 'feasibility_status', 'feasibility_remark', 
            'reason_for_partial_feasible', 'reason_for_high_commercials', 'reason_for_not_feasible', 
            'solution_section', 'solution', 'static_ip', 'no_of_static_ip_required', 
            'column_break_jyvg', 'primary_data_plan', 'secondary_data_plan', 
            'site_adress_section', 'site_type', 'street', 'city', 'country', 
            'longitude', 'column_break_owdc', 'site_id__legal_code', 'pincode', 
            'district', 'state', 'latitude', 'site_contact_section', 'primary_contact', 
            'contact_html', 'column_break_vmnv', 'alternate_contact', 'contact_html2', 
            'description_information_section', 'description', 'lms_provider_information_tab', 
            'lms_provider_information_section', 'lms_provider', 'billing_information_ta', 
            'sales_order_information_section', 'sales_order', 'column_break_jitn', 
            'sales_order_date', 'amended_from', 'old_circuit_id_tab'
        ];

        fields.forEach(function (field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                const isDropdown = frm.fields_dict[field].df.fieldtype === 'Select';

                fieldElement.css({                  
                    'border': '1px solid #ccc',
                    'border-radius': '7px',
                    'padding': '10px',
                    'outline': 'none',
                    'background-color': '#ffffff',
                    'transition': '0.3s ease-in-out',
                    'height': '40px',
                    'white-space': 'nowrap',
                    'min-width': '200px',
                    'max-width': '100%',
                    'overflow': 'hidden',
                    'text-overflow': 'ellipsis'
                });

                if (frm.fields_dict[field].df.reqd) {
                    fieldElement.css({
                        'border-left': '4px solid red'
                    });
                }

                // Apply focus and blur effects
                fieldElement.on('focus', function () {
                    $(this).css({
                        'border': '1px solid #80bdff',
                        'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                        'background-color': '#ffffff'
                    });
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border-left': '5px solid red'
                        });
                    }
                });

                fieldElement.on('blur', function () {
                    $(this).css({
                        'border': '1px solid #ccc',
                        'box-shadow': 'none',
                        'background-color': '#ffffff'
                    });
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border-left': '5px solid red'
                        });
                    }
                });
            }
        });

        // Add the calendar, user, and address-card icons to respective fields inside the input box
        setTimeout(function () {
            const iconFields = [
                { field: 'customer_request', icon: 'fa-calendar', topPosition: '70%' },
                { field: 'feasibility_completed_date', icon: 'fa-calendar', topPosition: '70%' },
                { field: 'feasibility_project_manager', icon: 'fa-user-o', topPosition: '50%' }
            ];

            iconFields.forEach(({ field, icon, topPosition }) => {
                const fieldWrapper = frm.fields_dict[field].wrapper;
                const inputField = $(fieldWrapper).find('input');

                // Wrap the input field and add the icon inside the input box
                inputField.wrap('<div class="input-icon-right-wrapper"></div>');
                inputField.after(
                    `<span class="input-icon-right" style="position: absolute; right: 10px; top: ${topPosition}; transform: translateY(-50%);">
                        <i class="fa ${icon}" aria-hidden="true"></i>
                    </span>`
                );
            });
        }, 500);
    },

    before_submit: function (frm) {
        const statuses = ['Feasible', 'Partial Feasible', 'Not Feasible', 'High Commercials'];
        if (statuses.includes(frm.doc.feasibility_status)) {
            // Update the feasibility_completed_date to the current date and time
            frm.set_value('feasibility_completed_date', frappe.datetime.now_datetime());
        } else if (frm.doc.feasibility_status === 'Pending') {
            frappe.throw(__('The document cannot be submitted as the status is "Pending".'));
        }
    },

    customer_request: function (frm) {
        if (frm.doc.customer_request) {
            const today = frappe.datetime.now_date(); // Get today's date
            if (frm.doc.customer_request > today) {
                frappe.msgprint(__('The Customer Request date cannot be greater than today.'));
                frm.set_value('customer_request', null); // Clear the field
            }
        }
    }
});
