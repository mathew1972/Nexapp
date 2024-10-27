frappe.ui.form.on('Opportunity', {
    refresh: function(frm) {
        const fields = [
            'custom_deal_information', 'opportunity_owner', 'opportunity_from', 'party_name', 
            'customer_name', 'status', 'sales_stage', 'probability', 'expected_closing', 
            'opportunity_type', 'source', 'naming_series', 'no_of_employees', 'annual_revenue', 
            'customer_group', 'market_segment', 'city', 'industry', 'territory', 'website', 
            'country', 'state', 'currency', 'conversion_rate', 'opportunity_amount', 
            'base_opportunity_amount', 'more_info', 'company', 'campaign', 'transaction_date', 
            'language', 'amended_from', 'title', 'first_response_time', 'lost_reasons', 
            'order_lost_reason', 'competitors', 'contact_info', 'contact_person', 'job_title', 
            'phone', 'contact_email', 'contact_mobile', 'phone_ext', 'whatsapp', 'address_html', 
            'customer_address', 'address_display', 'contact_html', 'contact_display', 'items', 
            'base_total', 'total', 'activities_tab', 'open_activities_html', 
            'all_activities_html', 'notes_tab', 'notes_html', 'notes'
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

        // Set query for opportunity_owner to dynamically load user list
        frm.set_query('opportunity_owner', function() {
            return {
                query: 'frappe.core.doctype.user.user.user_query',
                filters: { 'enabled': 1 }
            };
        });

        setTimeout(function() {
            const iconFields = [
                { field: 'opportunity_owner', icon: 'fa-user-circle' },
                { field: 'industry', icon: 'fa-industry' },
                { field: 'opportunity_amount', icon: 'fa-money' },
                { field: 'annual_revenue', icon: 'fa-money' },
                { field: 'expected_closing', icon: 'fa-calendar' },
                { field: 'sales_stage', icon: 'fa-hourglass-start' },
                { field: 'country', icon: 'fa-globe' },
                { field: 'phone', icon: 'fa-phone' },
                { field: 'contact_mobile', icon: 'fa-mobile' },
                { field: 'market_segment', icon: 'fa-thumb-tack' },
                { field: 'contact_email', icon: 'fa-envelope-o' } // Added contact_email field
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
