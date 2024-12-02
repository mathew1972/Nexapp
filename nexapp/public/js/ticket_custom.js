frappe.ui.form.on('Issue', {
    refresh: function (frm) {
        // List of fields to apply custom styles to
        const fields = [
            'subject_section', 'custom_ticket_information', 'status', 'priority',
            'custom_column_break_dqnlg', 'issue_type', 'custom_impact', 
            'custom_impact_details', 'custom_requester_details', 'raised_by', 
            'customer', 'custom_technician', 'cb00', 'custom_circuit_id', 
            'custom_site_name', 'issue_split_from', 'naming_series', 
            'custom_product_information', 'custom_product_', 'sb_details', 
            'subject', 'description', 'custom__attachments', 
            'service_level_section', 'service_level_agreement', 
            'response_by', 'reset_service_level_agreement', 'cb', 
            'agreement_status', 'resolution_by', 
            'service_level_agreement_creation', 'on_hold_since', 
            'total_hold_time', 'response', 'first_response_time', 
            'first_responded_on', 'column_break_26', 'avg_response_time', 
            'section_break_19', 'resolution_details', 'column_break1', 
            'opening_date', 'opening_time', 'resolution_date', 
            'resolution_time', 'user_resolution_time', 'additional_info', 
            'lead', 'contact', 'email_account', 'column_break_16', 
            'customer_name', 'project', 'company', 'via_customer_portal', 
            'attachment', 'content_type'
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
                'box-shadow': '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)' // Subtle shadow
            });
        }
    }
});
