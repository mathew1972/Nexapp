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
            'all_activities_html', 'notes_tab', 'notes_html', 'notes', 'custom_deal_name',
            'custom_expected_revenue__', 'custom_pin_code', 'custom_district', 'custom_description',
            'custom_customer_name_2', 'custom_lob__', 'custom_nos_units_', 'custom_type'
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

frappe.ui.form.on('Opportunity', {
    opportunity_amount: function(frm) {
        calculate_expected_revenue(frm);
    },
    probability: function(frm) {
        calculate_expected_revenue(frm);
    }
});

function calculate_expected_revenue(frm) {
    if (frm.doc.opportunity_amount && frm.doc.probability) {
        // Calculate custom expected revenue
        frm.set_value('custom_expected_revenue__', frm.doc.opportunity_amount * (frm.doc.probability / 100));
    } else {
        // Set to zero if fields are empty
        frm.set_value('custom_expected_revenue__', 0);
    }
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

frappe.ui.form.on('Opportunity', {
    refresh: function(frm) {
        // Attach a debounced event handler to the custom_pin_code field when the form loads
        $(frm.fields_dict.custom_pin_code.input).on('input', debounce(function() {
            const pincode = frm.doc.custom_pin_code.replace(/\D/g, ''); // Remove non-digit characters

            if (pincode.length === 6) { // Ensure the pincode is 6 digits for India
                frappe.show_alert({message: "Fetching location details...", indicator: "blue"});

                // Make the external API call
                fetch("https://api.postalpincode.in/pincode/" + pincode)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data[0].Status === "Success" && data[0].PostOffice.length > 0) {
                            const postOffice = data[0].PostOffice[0]; // Get the first Post Office entry

                            frm.set_value("custom_district", postOffice.District || "");
                            frm.set_value("country", postOffice.Country || "India");
                            frm.set_value("city", postOffice.Block || "");
                            frm.set_value("state", postOffice.State || "");
                        } else {
                            frappe.msgprint("Pincode not found or invalid.");
                        }
                    })
                    .catch(error => {
                        console.error("API Error:", error);
                        frappe.msgprint("Error fetching data from API.");
                    });
            } else if (pincode.length === 0) { // If pincode is cleared, reset the fields
                frm.set_value("custom_district", "");
                frm.set_value("country", "");
                frm.set_value("city", "");
                frm.set_value("state", "");
            } else if (pincode.length < 6) {
                frappe.show_alert({
                    message: "Please enter a valid 6-digit pincode.",
                    indicator: "red"
                }, 5); // Display alert for 5 seconds
            }
        }, 500)); // 500 ms debounce
    }
});

frappe.ui.form.on('Opportunity', {
    sales_stage: function(frm) {
        let probability_map = {
            "Qualification": 10,
            "Needs Analysis": 20,
            "Value Proposition": 40,
            "Identifying Decision Makers": 60,
            "Proposal/Price Quote": 75,
            "Negotiation/Review": 90,
            "Close Won": 100,
            "Close Drop": 0,
            "Close Loss to Competition": 0
        };

        let selected_stage = frm.doc.sales_stage;
        if (probability_map[selected_stage] !== undefined) {
            frm.set_value('probability', probability_map[selected_stage]);
        } else {
            frm.set_value('probability', 0);
        }
    }
});
