    frappe.ui.form.on('CCR', {
        refresh: function(frm) {
            const fields = [
                'meeting', 'customer_name', 'start_date_and_time', 'contact', 'transport_type', 
                'column_break_jjiq', 'ccr_owner', 'customer_type', 'end_date_and_time', 'other_travellers', 
                'opportunity', 'section_break_jxcn', 'remarks_and_description', 'circuit_id'
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
