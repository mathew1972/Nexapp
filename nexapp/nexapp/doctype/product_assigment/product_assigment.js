frappe.ui.form.on('Product Assigment', {
    refresh: function (frm) {
        // List of fields to apply custom styles to
        const fields = [
            'circuit_id', 'site_name', 'solution', 'column_break_xhdz', 'status',
            'customer', 'section_break_chlm', 'router_sno', 'anteena_1',
            'column_break_upfn', 'model_no', 'anteena_2', 'primary_sim_section',
            'sim_no_1', 'moble_no_1', 'tariff_plan_1', 'column_break_zwvt',
            'supplier_1', 'data_plan_1', 'actavation_date_1', 'section_break_rzfe',
            'sim_no_2', 'mobile_no_2', 'tariff_plan2', 'column_break_pptl',
            'supplier_2', 'data_plan_2', 'activation_date_1',
            'product_assigment_created'
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
