function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        // Attach a debounced event handler to the pincode field when the form loads
        $(frm.fields_dict.pincode.input).on('input', debounce(function() {
            const pincode = frm.doc.pincode.replace(/\D/g, ''); // Remove non-digit characters

            // Reset alert flag when user starts typing
            frm._alert_shown = false;

            // If pincode length is exactly 6 digits, fetch location details
            if (pincode.length === 6) {
                // Fetch location details
                frappe.show_alert({message: "Fetching location details...", indicator: "blue"});

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
            } 
            // If pincode length is less than 6 and greater than 0, do nothing
            else if (pincode.length === 0) {
                frm.set_value("district", "");
                frm.set_value("country", "");
                frm.set_value("city", "");
                frm.set_value("state", "");
            }
        }, 500)); // 500 ms debounce for input
    }
});
