
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

frappe.ui.form.on('Site', {
    refresh: function(frm) {
        // Attach a debounced event handler to the pincode field when the form loads
        $(frm.fields_dict.pincode.input).on('input', debounce(function() {
            const pincode = frm.doc.pincode.replace(/\D/g, ''); // Remove non-digit characters

            if (pincode.length === 6) { // Ensure the pincode is 6 digits for India
                frappe.show_alert({message: "Fetching location details...", indicator: "blue"});

                // Make the external API call
                fetch("https://api.postalpincode.in/pincode/" + pincode)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data[0].Status === "Success" && data[0].PostOffice.length > 0) {
                            const postOffice = data[0].PostOffice[0]; // Get the first Post Office entry

                            frm.set_value("district", postOffice.District || "");
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
                frm.set_value("district", "");
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
