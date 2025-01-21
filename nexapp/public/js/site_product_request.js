frappe.ui.form.on('Site', {
    product_assigment: function(frm) {
        // Check if product_assigment_created is already set to 1
        if (frm.doc.product_assigment_created) {
            // If already created, show confirmation dialog
            frappe.confirm(
                __('Product Assignment already exists. Do you want to create a new one?'),
                () => {
                    createProductAssignment(frm);  // If user clicks Yes, create new record
                },
                () => {
                    // If user clicks No, show cancellation message
                    frappe.msgprint(__('Product Assignment creation cancelled.'));
                }
            );
        } else {
            // If product assignment is not created yet, create it
            createProductAssignment(frm);
        }
    }
});

function createProductAssignment(frm) {
    // Validate that site_name is present
    if (!frm.doc.site_name) {
        frappe.msgprint(__('Site Name is required.'));
        return;
    }

    // Check if Site Name exists in the database
    frappe.db.get_value('Site', {'site_name': frm.doc.site_name}, 'name')
        .then(r => {
            if (!r.message) {
                frappe.msgprint(__('Could not find Site Name: ') + frm.doc.site_name);
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

                        // Set product_assigment_created field to 1
                        frm.set_value('product_assigment_created', 1);

                        // Disable the button after record creation
                        frm.fields_dict['product_assigment'].$button.prop('disabled', true);

                        // Save the document after product assignment creation
                        frm.save();
                    } else {
                        // Show error message if something went wrong
                        frappe.msgprint(__('An unexpected error occurred while creating Product Assignment.'));
                    }
                },
                error: function(error) {
                    // Handle errors during the product assignment creation
                    if (error && error.message) {
                        frappe.msgprint(__('An error occurred while creating Product Assignment: ') + error.message);
                    } else if (error && error.exc) {
                        frappe.msgprint(__('An unexpected error occurred: ') + error.exc);
                    } else {
                        frappe.msgprint(__('An unexpected error occurred.'));
                    }
                }
            });
        })
        .catch(err => {
            frappe.msgprint(__('An unexpected error occurred while checking Site Name.'));
        });
}
