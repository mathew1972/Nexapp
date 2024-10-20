frappe.ui.form.on('Lead', {
    refresh: function(frm) {
        // List of all fields to be styled
        const fields = [
            'naming_series', 'salutation', 'first_name', 'middle_name', 'last_name',
            'lead_name', 'job_title', 'gender', 'source', 'lead_owner', 'status',
            'customer', 'type', 'request_type', 'email_id', 'website', 
            'mobile_no', 'whatsapp_no', 'phone', 'phone_ext', 'company_name',
            'no_of_employees', 'annual_revenue', 'industry', 'market_segment',
            'territory', 'country', 'city',
            'fax', 'state', 'contact_html', 'custom_description_'
        ];

        // Apply styles and focus/blur effects for each field in the list
        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                // Check if the field is mandatory
                if (frm.fields_dict[field].df.reqd) {
                    // Apply red left border (red strip) for mandatory fields
                    fieldElement.css({
                        'border': '1px solid #ccc',              // Normal border on all sides
                        'border-left': '4px solid red',          // Red left border as the "red strip"
                        'border-radius': '7px',                 // Rounded corners
                        'padding': '5px',                       // Padding inside the input box
                        'outline': 'none',                      // Remove default outline
                        'background-color': '#ffffff',          // White background on load
                        'transition': '0.3s ease-in-out'        // Smooth transition for border and background change
                    });
                } else {
                    // Apply normal border for non-mandatory fields
                    fieldElement.css({
                        'border': '1px solid #ccc',              // Thin border
                        'border-radius': '7px',                 // Rounded corners
                        'padding': '5px',                       // Padding inside the input box
                        'outline': 'none',                      // Remove default outline
                        'background-color': '#ffffff',          // White background on load
                        'transition': '0.3s ease-in-out'        // Smooth transition for border and background change
                    });
                }

                // Add focus event
                fieldElement.on('focus', function() {
                    // Check if the field is mandatory
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #80bdff',         // Light blue border on all sides
                            'border-left': '5px solid red',        // Maintain red left border for mandatory fields
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',  // Glowing effect with blue shadow
                            'background-color': '#ffffff'          // Keep white background on focus
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #80bdff',         // Light blue border for non-mandatory fields
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',  // Glowing effect with blue shadow
                            'background-color': '#ffffff'          // Keep white background on focus
                        });
                    }
                });

                // Add blur event to revert to original border and background
                fieldElement.on('blur', function() {
                    // Re-apply appropriate border style based on whether the field is mandatory
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #ccc',            // Normal border on all sides
                            'border-left': '5px solid red',        // Red left border as the "red strip"
                            'box-shadow': 'none',                 // Remove glowing effect
                            'background-color': '#ffffff'         // Reset to white background
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #ccc',            // Thin border for non-mandatory fields
                            'box-shadow': 'none',                 // Remove glowing effect
                            'background-color': '#ffffff'         // Reset to white background
                        });
                    }
                });
            }
        });

        // Inject CSS styles for input icons directly into JavaScript
        let style = `
            .input-icon-right-wrapper {
                position: relative;
                display: inline-block;
                width: 100%;
            }
            .input-icon-right-wrapper input {
                padding-right: 40px;
                width: 100%;
                box-sizing: border-box;
            }
            .input-icon-right {
                position: absolute;
                right: 4px;
                top: 50%;
                transform: translateY(-50%);
                color: #888;
                pointer-events: none;
            }
            .input-icon-right i {
                font-size: 18px;
            }
        `;
        let styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = style;
        document.head.appendChild(styleSheet);

        // Dynamically populate the Lead Owner field options
        frm.fields_dict['lead_owner'].df.options = function() {
            return frappe.db.get_list('User', {
                fields: ['name'],
                order_by: 'name asc',
            }).then(function(users) {
                let options = users.map(user => ({
                    label: user.name,
                    value: user.name
                }));
                return options;
            });
        };
        frm.refresh_field('lead_owner');

        // Add icons after field renders
        setTimeout(function() {
            const iconFields = [
                { field: 'lead_owner', icon: 'fa-user-circle' },
                { field: 'company_name', icon: 'fa-building' },
                { field: 'phone', icon: 'fa-phone' },
                { field: 'industry', icon: 'fa-industry' },
                { field: 'email_id', icon: 'fa-envelope-o' },
                { field: 'mobile_no', icon: 'fa-mobile' },
                { field: 'country', icon: 'fa-globe' }
            ];

            iconFields.forEach(({ field, icon }) => {
                const fieldWrapper = frm.fields_dict[field].wrapper;
                const inputField = $(fieldWrapper).find('input');

                inputField.wrap('<div class="input-icon-right-wrapper"></div>');
                inputField.after(`
                    <span class="input-icon-right">
                        <i class="fa ${icon}" aria-hidden="true"></i>
                    </span>
                `);
            });
        }, 500);
    }
});

frappe.ui.form.on('Lead', {
    refresh: function(frm) {
        // Inject CSS to change navbar color to #313949
        let style = `
            .navbar {
                background-color: #313949 !important;
                border-bottom: 1px solid #ccc;
            }
            .navbar .navbar-brand, .navbar .navbar-nav > li > a {
                color: white !important;
            }
        `;
        
        // Create a style element and append it to the document head
        let styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = style;
        document.head.appendChild(styleSheet);
    }
});