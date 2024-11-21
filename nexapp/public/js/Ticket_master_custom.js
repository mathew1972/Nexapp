frappe.ui.form.on('Ticket Master', {
    refresh: function(frm) {
        const fields = [
            'ticket_information_section', 'subject', 'company', 
            'column_break_euwu', 'circuit_id', 'raised_by_email', 
            'section_break_icsq', 'description'
        ];

        fields.forEach(function(field) {
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
