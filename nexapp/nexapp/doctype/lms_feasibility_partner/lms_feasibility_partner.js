frappe.ui.form.on('LMS Feasibility Partner', {
    pincode: function(frm) {
        if (frm.doc.pincode && frm.doc.pincode.length === 6) {
            frappe.show_alert({message: "Fetching location details...", indicator: "blue"});
            frappe.call({
                method: 'nexapp.api.get_pincode_details',
                args: { pincode: frm.doc.pincode },
                callback: function(r) {
                    if (r.message) {
                        const details = r.message;
                        frm.set_value("city", details.city || "");
                        frm.set_value("state", details.state || "");
                        if (frm.fields_dict.district) frm.set_value("district", details.district || "");
                        frappe.show_alert({message: "Location updated successfully!", indicator: "green"});
                    } else {
                        frappe.msgprint("Pincode not found or invalid.");
                    }
                },
                error: function() {
                    frappe.msgprint("Error fetching data from API.");
                }
            });
        } else if (!frm.doc.pincode) {
            frm.set_value("city", "");
            frm.set_value("state", "");
            if (frm.fields_dict.district) frm.set_value("district", "");
        }
    },
    setup: function(frm) {
        // Attach debounced real-time input handler for pincode like in Feasibility
        if (frm.fields_dict.pincode && frm.fields_dict.pincode.wrapper) {
            let timer;
            $(frm.fields_dict.pincode.wrapper).off('input', 'input').on('input', 'input', function(e) {
                let raw_val = e.target.value || "";
                const pincode = raw_val.replace(/\D/g, ''); // Remove non-digit characters

                clearTimeout(timer);
                timer = setTimeout(() => {
                    if (pincode.length === 6) {
                        if (frm.doc.pincode !== pincode) {
                            frm.set_value("pincode", pincode);
                        }
                    } else if (pincode.length === 0 && frm.doc.pincode !== "") {
                        frm.set_value("pincode", "");
                    }
                }, 500);
            });
        }
    },
    refresh: function(frm) {
        // Inject Font Awesome info icon into custom_info field
        frm.fields_dict.custom_info.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_policy_icon" title="Supplier Onboarding SOP" style="cursor: pointer; font-size: 29px; color: #FF0000;">
                    <i class="fa fa-info-circle"></i>
                </a>
            </div>
        `);

        // Add click event
        frm.fields_dict.custom_info.$wrapper.find('#show_policy_icon').on('click', function() {
            show_policy_dialog();
        });
    }
});

// Function to show updated SOP dialog
function show_policy_dialog() {
    let policy_html = `
        <div style="padding: 10px; line-height: 1.6; max-height: 500px; overflow-y: auto;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">🎯 Objective</h4>
            <p>To standardize the process of onboarding new suppliers and securely managing their bank details for smooth procurement and payment processing.</p>

            <h4 style="font-weight: bold; margin-top: 20px;">📋 Process & Responsibilities</h4>
            <ol>
                <li>📝 <b>Supplier Onboarding Request:</b><br>
                    Initiated by the Procurement or Project team upon supplier selection.<br>
                    Ensure a valid business requirement exists for onboarding.
                </li>
                <li>📑 <b>Document Collection:</b><br>
                    Collect the following from the supplier:
                    <ul>
                        <li>PAN, GST, and business registration certificates</li>
                        <li>Bank details on official letterhead</li>
                        <li>Cancelled cheque or bank verification letter</li>
                        <li>Primary contact person & email/phone number</li>
                    </ul>
                </li>
                <li>🔍 <b>Verification:</b><br>
                    Cross-check business credentials and bank documents.<br>
                    Optional: conduct ₹1 test payment to validate bank account.
                </li>
                <li>🧾 <b>ERP Entry – Supplier Master:</b><br>
                    Create a new entry in the “Supplier” Doctype.<br>
                    Ensure proper classification (Individual / Company / Subcontractor).<br>
                    Upload and tag all supporting documents securely.
                </li>
                <li>💳 <b>Bank Details Entry:</b><br>
                    Enter bank name, account number, IFSC code, and branch.<br>
                    Use proper validation (e.g., format checks, duplication check).<br>
                    Restrict edit access to Finance roles only.
                </li>
                <li>✅ <b>Approval Workflow:</b><br>
                    Route for approval to Procurement Manager and Finance Manager.<br>
                    Status moves to “Approved” once fully verified.
                </li>
                <li>🔒 <b>Security & Compliance:</b><br>
                    Ensure all data is stored securely with access control.<br>
                    Never share supplier bank details via unsecured channels.
                </li>
            </ol>

            <h4 style="font-weight: bold; margin-top: 20px;">⚠️ Non-Compliance Risks</h4>
            <ul>
                <li>❌ Wrong payments or bank fraud</li>
                <li>❌ Delayed vendor onboarding</li>
                <li>❌ Audit non-compliance</li>
            </ul>

            <h4 style="font-weight: bold; margin-top: 20px;">🆘 Support</h4>
            <ul>
                <li>Contact: Procurement Team or Finance Team Lead</li>
            </ul>
        </div>
    `;

    let d = new frappe.ui.Dialog({
        title: 'Supplier Onboarding - SOP',
        size: 'large',
        fields: [
            {
                fieldname: 'policy_html',
                fieldtype: 'HTML',
                options: policy_html
            }
        ],
        primary_action_label: 'Close',
        primary_action() {
            d.hide();
        }
    });
    d.show();
}
