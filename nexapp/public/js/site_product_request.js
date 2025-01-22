frappe.ui.form.on('Site', {
    onload: function(frm) {
        // Check if a Product Assignment already exists for the given circuit_id
        frappe.db.get_list('Product Assigment', {
            fields: ['name'],
            filters: {'circuit_id': frm.doc.circuit_id},
            limit_page_length: 1
        }).then(records => {
            if (records.length > 0) {
                // If a record exists, change the button color to red (for both button and input field)
                if (frm.fields_dict['product_assigment'].$input) {
                    // For input fields
                    frm.fields_dict['product_assigment'].$input.css('background-color', '#ffcccc');
                } else if (frm.fields_dict['product_assigment'].$button) {
                    // For buttons
                    frm.fields_dict['product_assigment'].$button.css('background-color', '#ffcccc');
                }
            } else {
                // If no record exists, reset the color or leave it unchanged
                if (frm.fields_dict['product_assigment'].$input) {
                    // Reset color for input field
                    frm.fields_dict['product_assigment'].$input.css('background-color', '');
                } else if (frm.fields_dict['product_assigment'].$button) {
                    // Reset color for button
                    frm.fields_dict['product_assigment'].$button.css('background-color', '');
                }
            }
        }).catch(err => {
            frappe.msgprint(__('An error occurred while checking for existing Product Assignment.'));
        });
    }
});



frappe.ui.form.on('Site', {
    onload: function(frm) {
        // Check if a Product Assignment already exists for the given circuit_id
        if (frm.doc.circuit_id) {
            frappe.db.get_list('Product Assigment', {
                fields: ['name'],
                filters: { 'circuit_id': frm.doc.circuit_id },
                limit_page_length: 1
            }).then(records => {
                if (records.length > 0) {
                    // Change the color of the button to red
                    frm.page.set_primary_action(__('Product Assignment Exists'), null, 'btn-danger');
                    
                } else {
                    // Reset the button to its default state
                    frm.page.set_primary_action(__('Check Product Assignment'), () => {
                        frm.trigger('product_assigment');
                    });
                }
            }).catch(err => {
                frappe.msgprint(__('An error occurred while checking for existing Product Assignment.'));
            });
        }
    },

    product_assigment: function(frm) {
        // Check if a Product Assignment already exists for the given circuit_id
        frappe.db.get_list('Product Assigment', {
            fields: ['name'],
            filters: { 'circuit_id': frm.doc.circuit_id },
            limit_page_length: 1
        }).then(records => {
            if (records.length > 0) {
                // If a record exists, show a message
                frappe.msgprint(__('Product Assignment already exists for Circuit ID: ') + frm.doc.circuit_id);
            } else {
                // If no record exists, create a new Product Assignment
                createProductAssignment(frm);
            }
        }).catch(err => {
            frappe.msgprint(__('An error occurred while checking for existing Product Assignment.'));
        });
    }
});

function createProductAssignment(frm) {
    // Validate that site_name is present
    if (!frm.doc.site_name) {
        frappe.msgprint(__('Site Name is required.'));
        return;
    }

    // Insert Product Assignment record
    frappe.call({
        method: 'frappe.client.insert',
        args: {
            doc: {
                doctype: 'Product Assigment',
                circuit_id: frm.doc.circuit_id,
                site_name: frm.doc.site_name,
                customer: frm.doc.customer,
                solution: frm.doc.solution
            }
        },
        callback: function(response) {
            if (response.message) {
                const productAssignmentId = response.message.name;

                // Show success message with the product assignment ID
                frappe.msgprint(__('Product Assignment created successfully with ID: ') + productAssignmentId);
            } else {
                // Show error message if something went wrong
                frappe.msgprint(__('An unexpected error occurred while creating Product Assignment.'));
            }
        },
        error: function(error) {
            // Handle errors during the product assignment creation
            frappe.msgprint(__('An error occurred while creating Product Assignment.'));
        }
    });
} 