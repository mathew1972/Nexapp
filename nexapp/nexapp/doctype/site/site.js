// Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
// For license information, please see license.txt
frappe.ui.form.on('Site', {
    refresh: function (frm) {
        // List of fields to apply custom styles to
        const fields = [
            'section_break_qawd', 'parent_project', 'child_project', 'project_manager',
            'column_break_sbty', 'site_status', 'circuit_id', 'project_coordinator',
            'order_information_section', 'order_type', 'customer_type', 'existing_circuit_id',
            'site_name', 'customer_request', 'phases', 'column_break_nghj', 'sales_order',
            'customer_name', 'customer_po_no', 'customer_po_date', 'region',
            'site_information_section', 'site_item', 'address_information_section',
            'site_type', 'street', 'city', 'country', 'column_break_ypqk',
            'site_id__legal_code', 'pincode', 'district', 'state', 'site_phone',
            'service_requirement_section', 'managed_service', 'config_type',
            'column_break_syhb', 'solution', 'primary_plan', 'secondary_plan',
            'contact_information_section', 'contact_person1', 'contact_number1', 'email',
            'designation', 'department', 'column_break_lldf', 'contact_person2',
            'contact_number2', 'secondary_email', 'other_designation', 'other_department',
            'section_break_ovsj', 'billing_status', 'column_break_ctsh',
            'section_break_pixr', 'product_in_service', 'description_section',
            'site_remark', 'site_project_manager', 'feasibility_project_manager','longitude',
            'latitude', 'contact_person', 'contact_mobile', 'email_id', 'other_person', 
            'other_mobile', 'other_email_id', 'customer', 'phase', 'delivery_date', 'sales_order',
            'customer_po_no', 'customer_po_date', 'site_name', 'customer_po_date', 'project',
            'project_name', 'expected_start_date', 'expected_end_date', 'sales_order', 'sales_order_amount',
            'sales_order_date', 'customer_po_no', 'customer_po_date', 'customer_po_amount',
            'mbb_bandwidth', 'stage'
        ];

        // Apply custom styles and interactions to each field
        fields.forEach(function (field) {
            const fieldWrapper = frm.fields_dict[field]?.wrapper;
            if (!fieldWrapper) return; // Skip if the field does not exist

            const fieldElement = $(fieldWrapper).find('input, textarea, select');
            const isDropdown = frm.fields_dict[field].df.fieldtype === 'Select';
            const isRequired = frm.fields_dict[field].df.reqd;

            // Base styles
            fieldElement.css({
                'border': '1px solid #ccc',
                'border-radius': '7px',
                'padding': isDropdown ? '5px 10px' : '5px',
                'outline': 'none',
                'background-color': '#ffffff',
                'transition': '0.3s ease-in-out',
                'height': isDropdown ? 'auto' : 'initial'
            });

            // Required field style
            if (isRequired) {
                fieldElement.css({ 'border-left': '4px solid red' });
            }

            // Focus event
            fieldElement.on('focus', function () {
                $(this).css({
                    'border': '1px solid #80bdff',
                    'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                    'background-color': '#ffffff'
                });

                if (isRequired) {
                    $(this).css({ 'border-left': '5px solid red' });
                }
            });

            // Blur event
            fieldElement.on('blur', function () {
                $(this).css({
                    'border': '1px solid #ccc',
                    'box-shadow': 'none',
                    'background-color': '#ffffff'
                });

                if (isRequired) {
                    $(this).css({ 'border-left': '5px solid red' });
                }
            });
        });

        // Style the "feasibility_information" button
        const feasibilityButton = frm.fields_dict['feasibility_information']?.wrapper;
        if (feasibilityButton) {
            const buttonElement = $(feasibilityButton).find('button');

            buttonElement.css({
                'background-color': '#008CBA', // Stable blue background
                'border': 'none',
                'color': 'white',
                'padding': '10px 20px',
                'text-align': 'center',
                'text-decoration': 'none',
                'font-size': '14px',
                'margin': '4px 2px',
                'cursor': 'pointer',
                'border-radius': '12px', // Rounded corners
                'transition': 'background-color 0.3s ease, box-shadow 0.3s ease',
                'box-shadow': '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)', // Subtle shadow
                'float': 'right', // Align button to the right
                'margin-top': '-20px' // Moves the button slightly upwards
            });

            // Add hover effect
            buttonElement.hover(
                function () {
                    // On hover: Use a lighter color
                    $(this).css({
                        'background-color': '#5ABBE8', // Light blue color
                        'box-shadow': '0 6px 8px rgba(0,0,0,0.15), 0 4px 6px rgba(0,0,0,0.1)' // Slightly stronger shadow
                    });
                },
                function () {
                    // On hover out: Reset to the original color
                    $(this).css({
                        'background-color': '#008CBA',
                        'box-shadow': '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)'
                    });
                }
            );
        }

        // New Feature: Adding icons to specified fields
        const fieldsWithIcons = [
            { field: 'site_project_manager', icon: 'fa-user-o', topPosition: '70%' },
            { field: 'delivery_date', icon: 'fa-calendar', topPosition: '70%' },
            { field: 'department', icon: 'fa-building-o', topPosition: '70%' },
            { field: 'other_department', icon: 'fa-building-o', topPosition: '70%' },
            { field: 'email_id', icon: 'fa-envelope-o', topPosition: '70%' },
            { field: 'other_email_id', icon: 'fa-envelope-o', topPosition: '70%' },
            { field: 'contact_mobile', icon: 'fa-mobile', topPosition: '70%' },
            { field: 'other_mobile', icon: 'fa-mobile', topPosition: '70%' },
            { field: 'contact_person', icon: 'fa-user-o', topPosition: '70%' },
            { field: 'other_person', icon: 'fa-user-o', topPosition: '70%' }
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
    }
});
