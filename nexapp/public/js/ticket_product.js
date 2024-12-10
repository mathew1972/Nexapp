frappe.ui.form.on('Issue', {
    custom_circuit_id: function (frm) {
        if (frm.doc.custom_circuit_id) {
            frappe.call({
                method: "nexapp.api.fetch_site_items", // Server-side method
                args: {
                    custom_circuit_id: frm.doc.custom_circuit_id
                },
                callback: function (r) {
                    if (r.message && Array.isArray(r.message)) {
                        // Clear existing rows in the correct child table (custom_product_)
                        frm.clear_table("custom_product_");

                        // Iterate over the items and add them to the child table
                        r.message.forEach((item) => {
                            if (item && typeof item === "object") {
                                // Safely add a new row to the correct child table
                                let child = frm.add_child("custom_product_");
                                child.product_code = item.product_code || "";
                                child.qty = item.qty || 0;
                                child.warehouse = item.warehouse || "";
                                child.serial_number = item.serial_number || "";
                                child.product_name = item.item_name || "";  
                            }
                        });

                        // Refresh the child table to reflect the added rows
                        frm.refresh_field("custom_product_");

                        // Explicitly refresh the button visibility
                        frm.fields_dict["custom_product_"].grid.get_field('info').$input.trigger('change');
                    }
                },
                error: function (err) {
                    console.error("Error during API call:", err);
                }
            });
        }
    }
});

frappe.ui.form.on('Issue', {
    refresh: function (frm) {
        // List of fields to apply custom styles to
        const fields = [
            'subject_section', 'custom_ticket_information', 'status', 'priority',
            'custom_column_break_dqnlg', 'issue_type', 'custom_impact', 'custom_impact_details',
            'custom_requester_details', 'raised_by', 'customer', 'custom_technician', 'cb00',
            'custom_circuit_id', 'custom_site_name', 'issue_split_from', 'naming_series',
            'custom_product_information', 'custom_product_', 'custom_lms_vendor_information',
            'custom_lms_vendor', 'sb_details', 'subject', 'description', 'custom__attachments',
            'service_level_section', 'service_level_agreement', 'response_by', 'reset_service_level_agreement',
            'cb', 'agreement_status', 'resolution_by', 'service_level_agreement_creation',
            'on_hold_since', 'total_hold_time', 'response', 'first_response_time', 'first_responded_on',
            'column_break_26', 'avg_response_time', 'section_break_19', 'resolution_details',
            'column_break1', 'opening_date', 'opening_time', 'resolution_date', 'resolution_time',
            'user_resolution_time', 'additional_info', 'lead', 'contact', 'email_account', 'column_break_16',
            'customer_name', 'project', 'company', 'via_customer_portal', 'attachment', 'content_type',
            'custom_learning', 'custom_learning_html'
        ];

        // Apply custom styles and interactions to each field
        fields.forEach(function (field) {
            const fieldWrapper = frm.fields_dict[field]?.wrapper;
            if (!fieldWrapper) return; // Skip if the field does not exist

            const fieldElement = $(fieldWrapper).find('input, textarea, select');
            const isDropdown = frm.fields_dict[field].df.fieldtype === 'Select';
            const isRequired = frm.fields_dict[field].df.reqd;

            // Base styles
            fieldElement.css({
                'border': '1px solid #ccc',
                'border-radius': '7px',
                'padding': isDropdown ? '5px 10px' : '5px',
                'outline': 'none',
                'background-color': '#ffffff',
                'transition': '0.3s ease-in-out',
                'height': isDropdown ? 'auto' : 'initial'
            });

            // Required field style
            if (isRequired) {
                fieldElement.css({ 'border-left': '4px solid red' });
            }

            // Focus event
            fieldElement.on('focus', function () {
                $(this).css({
                    'border': '1px solid #80bdff',
                    'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                    'background-color': '#ffffff'
                });

                if (isRequired) {
                    $(this).css({ 'border-left': '5px solid red' });
                }
            });

            // Blur event
            fieldElement.on('blur', function () {
                $(this).css({
                    'border': '1px solid #ccc',
                    'box-shadow': 'none',
                    'background-color': '#ffffff'
                });

                if (isRequired) {
                    $(this).css({ 'border-left': '5px solid red' });
                }
            });
        });
    }
});

frappe.ui.form.on('Ticket Product', {
    info: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn]; // Access the current row object
        let product_code = row.product_code; // Get the product_code from the row

        if (!product_code) {
            frappe.msgprint("Product Code not found in the current row.");
            return;
        }

        // Fetch image from the Item doctype based on product_code
        frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'Item',
                filters: { 'item_code': product_code },
                fieldname: 'custom_production_information_image'
            },
            callback: function(response) {
                if (response.message && response.message.custom_production_information_image) {
                    let imagePath = response.message.custom_production_information_image;
                    let fullImageUrl = window.location.origin + imagePath; // Construct full image URL

                    console.log("Full Image URL:", fullImageUrl); // Log the URL for debugging

                    // Verify if the image is accessible
                    let img = new Image();
                    img.src = fullImageUrl;
                    img.onload = function() {
                        // Display the image with a vertical scrollbar
                        frappe.msgprint({
                            title: 'Service Guide',
                            message: `
                                <div style="max-width: 100%; overflow-x: hidden; overflow-y: auto; border: 1px solid #ccc; padding: 10px; height: 600px;">
                                    <img src="${fullImageUrl}" style="width: 100%; height: auto;" />
                                </div>`
                        });
                    };
                    img.onerror = function() {
                        // If image is not found, display a message
                        frappe.msgprint({
                            title: 'Message',
                            message: 'No image available for this product.'
                        });
                    };
                } else {
                    // If image is not available, display a message
                    frappe.msgprint({
                        title: 'Message',
                        message: 'No image available for this product.'
                    });
                }
            }
        });
    }
});
