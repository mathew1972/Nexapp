frappe.ui.form.on('Issue', {
    // Trigger extraction when 'subject' is modified
    subject: function(frm) {
        extractCustomCircuitID(frm, 'subject');
    },
    // Trigger extraction when 'description' is modified
    description: function(frm) {
        extractCustomCircuitID(frm, 'description');
    }
});

/**
 * Extracts a 5-digit custom circuit ID from the specified field (subject/description)
 * and updates the 'custom_circuit_id' field accordingly.
 *
 * @param {Object} frm - The current form instance
 * @param {string} fieldName - The field name to extract the custom circuit ID from (e.g., 'subject' or 'description')
 */
function extractCustomCircuitID(frm, fieldName) {
    try {
        // Get the value of the specified field
        let fieldValue = frm.doc[fieldName];

        if (fieldValue) {
            // Regular expression to find a sequence of exactly 5 digits
            let customCircuitIDRegex = /(\d{5})/;

            // Search for the custom circuit ID in the text
            let match = fieldValue.match(customCircuitIDRegex);

            if (match) {
                // Set the custom_circuit_id field with the extracted value
                frm.set_value('custom_circuit_id', match[0]).then(() => {
                    frm.refresh_field('custom_circuit_id');
                });
            } else {
                // Clear the custom_circuit_id field if no match is found
                frm.set_value('custom_circuit_id', null).then(() => {
                    frm.refresh_field('custom_circuit_id');
                });
            }
        }
    } catch (error) {
        // Handle potential errors gracefully
        console.error(`Error in extracting custom_circuit_id from ${fieldName}:`, error);
    }
}
