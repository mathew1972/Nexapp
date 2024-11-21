frappe.ui.form.on('Site', {
    refresh: function(frm) {
        const fields = [
            'project_information_section', 'order_type', 'customer_type', 
            'existing_circuit_id', 'accounts', 'choose_product_type', 
            'site_owner', 'bdm', 'project_status', 'project_stages', 
            'poc_to_paid_date', 'managed_service', 'config_type', 
            'solution', 'site_name', 'supply_product', 'customer_request', 
            'user_quantity', 'site_phone', 'phases', 'site_type', 
            'client_site_id', 'commited_tat', 'region', 'contact_person1', 
            'contact_number1', 'email', 'designation', 'department', 
            'contact_person2', 'contact_number2', 'email2', 'designation2', 
            'department246', 'Billing Status', 'warrantya', 'street', 
            'district', 'country', 'pincode', 'city', 'state', 
            'sowIf Others Specify', 'Data', 'if_others_specify', 'product', 
            'description', 'response_status', 'department2', 'billing_status', 
            'warranty', 'sow', 'quantity', 'feasibility_status', 'ispmbb',
            'available_network', 'feasibility_owner', 'fsolution', 'feasibility_remark',
            'feasibility_initial_completed_date', 'reason_for_not_feasible','feasibility_expected_date',
            'feasibility_final_completed_date'
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
    }
});
