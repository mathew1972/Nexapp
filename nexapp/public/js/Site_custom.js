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
            'warranty', 'sow', 'quantity'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                // Apply styles based on whether the field is required
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

                // Apply focus and blur effects
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
    }
});
