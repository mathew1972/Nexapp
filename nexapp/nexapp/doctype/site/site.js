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
            'description','site_project_manager', 'feasibility_project_manager'
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
    }
});