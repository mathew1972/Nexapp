frappe.ui.form.on('Lead', {
    refresh: function(frm) {
        const fields = [
            'lead_owner', 'first_name', 'job_title', 'type', 'request_type', 'campaign_name',
            'status', 'last_name', 'qualified_by', 'qualified_on', 'qualification_status', 'custom_linkedin_possible_profile__',
            'company_name', 'no_of_employees', 'annual_revenue', 'market_segment',
            'source', 'industry', 'territory', 'customer',
            'email_id', 'mobile_no', 'website',
            'whatsapp_no', 'phone', 'phone_ext',
            'custom_street__', 'city', 'state',
            'custom_pin_code', 'custom_district', 'country',
            'address_html', 'contact_html',
            'custom_description', 'company', 'language',
            'title', 'disabled', 'unsubscribed', 'blog_subscriber',
            'lead_name', 'salutation', 'gender', 'naming_series',
            'middle_name', 'fax', 'open_activities_html',
            'all_activities_html', 'notes_html', 'notes'
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

        // Fetch location details based on Pincode
        const pincodeField = frm.fields_dict.custom_pin_code
            ? $(frm.fields_dict.custom_pin_code.wrapper).find('input')
            : null;

        if (pincodeField) {
            pincodeField.on('input', frappe.utils.debounce(function() {
                const pincode = frm.doc.custom_pin_code.replace(/\D/g, '');

                if (pincode.length === 6) {
                    frappe.show_alert({ message: "Fetching location details...", indicator: "blue" });

                    fetch("https://api.postalpincode.in/pincode/" + pincode)
                        .then(response => response.json())
                        .then(data => {
                            if (data && data[0].Status === "Success" && data[0].PostOffice.length > 0) {
                                const postOffice = data[0].PostOffice[0];
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
                } else if (pincode.length === 0) {
                    frm.set_value("custom_district", "");
                    frm.set_value("country", "");
                    frm.set_value("city", "");
                    frm.set_value("state", "");
                } else if (pincode.length < 6) {
                    frappe.show_alert({
                        message: "Please enter a valid 6-digit pincode.",
                        indicator: "red"
                    }, 5);
                }
            }, 500));
        }
    }
});
