// Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
// For license information, please see license.txt
frappe.ui.form.on('Feasibility', {
    refresh: function (frm) {
        const fields = [
            'site_information_tab', 'site_information_section', 'column_break_vfai', 
            'site_name', 'customer', 'customer_request', 'please_rate_the_site', 
            'feasibility_completed_date', 'column_break_zthd', 'circuit_id', 
            'feasibility_project_manager', 'region', 'feasibility_status', 
            'feasibility_remark', 'reason_for_partial_feasible', 
            'reason_for_high_commercials', 'reason_for_not_feasible', 
            'site_address_tab', 'site_adress_section', 'street', 'city', 
            'country', 'longitude', 'column_break_owdc', 'pincode', 'district', 
            'state', 'latitude', 'site_contact_tab', 'site_contact_section', 
            'primary_contact', 'contact_person', 'contact_mobile', 'email_id', 
            'designation', 'department', 'column_break_sqwp', 'alternate_contact', 
            'other_person', 'other_mobile', 'other_email_id', 'other_designation', 
            'other_department', 'solution_requiremnt_tab', 'solution_section', 
            'order_type', 'solution', 'static_ip', 'lms_plan', 
            'column_break_jyvg', 'primary_data_plan', 'secondary_data_plan', 
            'phase', 'lms_plan_2', 'lms_provider_information_tab', 'lms_section', 
            'lms_provider', 'amended_from', 'billing_information_tab', 
            'sales_order', 'sales_order_date', 'column_break_jitn', 'bill_no', 
            'bill_date', 'description'
        ];

        fields.forEach(function (field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                const isDropdown = frm.fields_dict[field].df.fieldtype === 'Select';

                fieldElement.css({
                    'border': '1px solid #ccc',
                    'border-radius': '7px',
                    'padding': isDropdown ? '5px 10px' : '5px',
                    'outline': 'none',
                    'background-color': '#ffffff',
                    'transition': '0.3s ease-in-out',
                    'height': isDropdown ? 'auto' : 'initial'
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
                { field: 'feasibility_project_manager', icon: 'fa-user-o', topPosition: '50%' },
                { field: 'contact_person', icon: 'fa-user-o', topPosition: '50%' },
                { field: 'other_person', icon: 'fa-user-o', topPosition: '50%' },
                { field: 'contact_mobile', icon: 'fa-mobile', topPosition: '50%' }, // Added for 'contact_mobile' field
                { field: 'other_mobile', icon: 'fa-mobile', topPosition: '50%' }, // Added for 'other_mobile' field
                { field: 'email_id', icon: 'fa-envelope-o', topPosition: '50%' }, // Added for 'email_id' field
                { field: 'other_email_id', icon: 'fa-envelope-o', topPosition: '50%' }, // Added for 'other_email_id' field
                { field: 'department', icon: 'fa-building-o', topPosition: '50%' }, // Added for 'department' field
                { field: 'other_department', icon: 'fa-building-o', topPosition: '50%' } // Added for 'other_department' field
            ];

            iconFields.forEach(({ field, icon, topPosition }) => {
                const fieldWrapper = frm.fields_dict[field].wrapper;
                const inputField = $(fieldWrapper).find('input');

                // Wrap the input field and add the icon inside the input box
                inputField.wrap('<div class="input-icon-right-wrapper"></div>');
                inputField.after(`
                    <span class="input-icon-right" style="position: absolute; right: 10px; top: ${topPosition}; transform: translateY(-50%);">
                        <i class="fa ${icon}" aria-hidden="true"></i>
                    </span>
                `);
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

    after_save: function (frm) {
        if (frm.doc.name) {
            frm.set_value('circuit_id', frm.doc.name);
            frm.save();
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
