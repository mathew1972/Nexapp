frappe.ui.form.on('Lead', {
    refresh: function(frm) {
        const fields = [
            'naming_series', 'salutation', 'first_name', 'middle_name', 'last_name',
            'lead_name', 'job_title', 'gender', 'source', 'lead_owner', 'status',
            'customer', 'type', 'request_type', 'email_id', 'website', 
            'mobile_no', 'whatsapp_no', 'phone', 'phone_ext', 'company_name',
            'no_of_employees', 'annual_revenue', 'industry', 'market_segment',
            'territory', 'country', 'city', 'fax', 'state', 'contact_html', 'custom_description_'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

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
})
