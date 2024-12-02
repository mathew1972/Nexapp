// Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        const fields = [
            'site_information_section', 'company1', 'site_name', 'column_break_zthd',
            'site_id__legal_code', 'project_manager', 'address_information_section', 
            'pincode', 'district', 'state', 'longitude', 'column_break_jmai', 'street', 
            'city', 'country', 'latitude', 'contact_information_section', 'contact_person', 
            'contact_mobile', 'email_id', 'column_break_jtep', 'other_person', 'other_mobile', 
            'other_email', 'solution_requiremnt_section', 'solution', 'static_ip', 'lms_plan', 
            'column_break_gxjo', 'primary_data_plan', 'secondary_data_plan', 'lms_plan_2', 
            'feasibility_information_section', 'feasibility_status', 'column_break_hfyn', 
            'feasibility_output', 'lms_provider_information_section', 'lms_provider', 'project_id',
            'description'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                const isDropdown = frm.fields_dict[field].df.fieldtype === 'Select';

                fieldElement.css({
                    'border': '1px solid #ccc',
                    'border-radius': '7px',
                    'padding': isDropdown ? '5px 10px' : '5px',  // Adjust padding for dropdowns
                    'outline': 'none',
                    'background-color': '#ffffff',
                    'transition': '0.3s ease-in-out',
                    'height': isDropdown ? 'auto' : 'initial'  // Ensure dropdown height adjusts
                });

                if (frm.fields_dict[field].df.reqd) {
                    fieldElement.css({
                        'border-left': '4px solid red'
                    });
                }

                // Apply focus and blur effects
                fieldElement.on('focus', function() {
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

                fieldElement.on('blur', function() {
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

        // Check if the feasibility status is "Completed"
        if (frm.doc.feasibility_status === 'Completed') {
            // Make only the feasibility_status field read-only
            frm.set_df_property('feasibility_status', 'read_only', 1);

            // Set feasibility_completed_date and save it
            frm.set_value('feasibility_completed_date', frappe.datetime.now_datetime());
            frm.save_or_update();
        }
    },

    after_save: function(frm) {
        // Ensure the ID is available after saving
        if (frm.doc.name) {
            // Set the field 'circuit_id' with the generated 'name' (ID)
            frm.set_value('circuit_id', frm.doc.name);

            // Save the changes to the document
            frm.save();
        }
    },

    customer_request: function(frm) {
        if (frm.doc.customer_request) {
            const today = frappe.datetime.now_date(); // Get today's date
            if (frm.doc.customer_request > today) {
                frappe.msgprint(__('The Customer Request date cannot be greater than today.'));
                frm.set_value('customer_request', null); // Clear the field
            }
        }
    }
});
