frappe.ui.form.on('Issue', {
    onload: function (frm) {
        // Extract and update custom_circuit_id when the form is loaded
        extractAndUpdateCustomCircuitID(frm);
    },

    subject: function (frm) {
        // Extract and update custom_circuit_id when the subject field is changed
        extractAndUpdateCustomCircuitID(frm);
    },

    description: function (frm) {
        // Extract and update custom_circuit_id when the description field is changed
        extractAndUpdateCustomCircuitID(frm);
    }
});

/**
 * Extracts and updates the custom_circuit_id field based on the subject or description fields.
 *
 * @param {Object} frm - The current form instance
 */
function extractAndUpdateCustomCircuitID(frm) {
    let customCircuitID = null;

    // Check the subject field for a custom circuit ID
    if (frm.doc.subject) {
        customCircuitID = extractCustomCircuitID(frm.doc.subject);
    }

    // Check the description field only if customCircuitID is not found in subject
    if (!customCircuitID && frm.doc.description) {
        const descriptionText = stripHtmlTags(frm.doc.description); // Remove any HTML tags from the description
        customCircuitID = extractCustomCircuitID(descriptionText);
    }

    // Update the custom_circuit_id field if a valid ID is found, otherwise clear it
    if (customCircuitID) {
        frm.set_value('custom_circuit_id', customCircuitID);
    } else {
        frm.set_value('custom_circuit_id', null); // Clear the field if no ID is found
    }
    frm.refresh_field('custom_circuit_id'); // Refresh the field to reflect the updated value
}

/**
 * Extracts a 5-digit custom circuit ID from a string.
 *
 * @param {string} text - The input text to search for the custom circuit ID.
 * @return {string|null} - The extracted custom circuit ID, or null if not found.
 */
function extractCustomCircuitID(text) {
    const regex = /\d{5}/; // Regular expression to match 5 consecutive digits
    const match = text.match(regex);
    return match ? match[0] : null;
}

/**
 * Strips HTML tags from a given string and returns the plain text content.
 *
 * @param {string} input - The input string potentially containing HTML tags.
 * @return {string} - The plain text content without HTML tags.
 */
function stripHtmlTags(input) {
    let doc = new DOMParser().parseFromString(input, 'text/html'); // Parse the input string as HTML
    return doc.body.textContent || ""; // Return the plain text content
}
