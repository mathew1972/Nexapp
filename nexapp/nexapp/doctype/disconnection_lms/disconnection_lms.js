frappe.ui.form.on('Disconnection LMS', {
    refresh(frm) {

        // -----------------------------
        // LIST OF FIELDS TO STYLE
        // -----------------------------
        const fields = [
            'disconnection_request_id', 'circuit_id', 'customer', 'site', 'lms_id',
            'supplier_name', 'disconnection_status', 'lms_stage', 'lms_delivery_date',
            'po_number', 'po_date', 'media', 'bandwith_type', 'solution',
            'portal_login_id', 'supplier_email_id', 'effective_date',
            'disconnection_reason', 'note', 'mobile', 'bill_no', 'brandwidth_name',
            'outstanding', 'bill_date', 'purchase_invoice_id', 'duration_to',
            'amount', 'duration_from', 'pyment', 'disconnected_date', 
            'reason_for_cancellation'
        ];

        // -----------------------------
        // FIELD STYLING LOOP
        // -----------------------------
        fields.forEach(field => {
            const df = frm.fields_dict[field];
            if (!df) return;

            let wrapper = $(df.wrapper);

            // Select visible editable or read-only fields only
            let editable = wrapper.find('.control-input input:visible, .control-input select:visible, .control-input textarea:visible');
            let readonly = wrapper.find('.control-value:visible');

            // Reset styles
            editable.attr("style", "");
            readonly.attr("style", "");

            // 👇 Uniform height for editable fields
            if (editable.length > 0) {
                editable.css({
                    border: "1px solid #ccc",
                    "border-radius": "7px",
                    padding: "5px 10px",
                    height: "38px",
                    "background-color": "#ffffff",
                    "box-sizing": "border-box",
                });
            }

            // 👇 Uniform height for read-only fields
            if (readonly.length > 0) {
                readonly.css({
                    border: "1px solid #ccc",
                    "border-radius": "7px",
                    padding: "7px 10px",
                    height: "30px",
                    "background-color": "#ffffff",
                    display: "flex",
                    "align-items": "center",
                    "box-sizing": "border-box"
                });
            }
        });

        // ---------------------------------------------------
        // SPECIAL HIGHLIGHT COLOR FOR disconnection_status
        // ---------------------------------------------------
        let ds = frm.fields_dict["disconnection_status"];

        if (ds && ds.wrapper) {
            let el = $(ds.wrapper).find('.control-input select:visible');

            // If read-only mode
            if (el.length === 0) {
                el = $(ds.wrapper).find('.control-value:visible');
            }

            // Apply highlight if found
            if (el.length > 0) {
                el.css({
                    "background-color": "#FFF7C2",  // light yellow
                    "border": "1px solid #e0c97c",
                    "border-radius": "7px",
                    "font-weight": "600",
                    "padding": "5px 10px",
                    height: "30px",
                    "box-sizing": "border-box"
                });
            }
        }

    }
});

//////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on("Disconnection LMS", {
    disconnection_status(frm) {

        // Prevent re-trigger during save
        if (frm.__skip_disconnection_popup) return;

        if (frm.doc.disconnection_status !== "Service Cancellation") return;

        if (!frm.doc.supplier_name) {
            frappe.msgprint("Please select Supplier Name first.");
            return;
        }

        let supplier_email = "";
        let portal_login_id_value = frm.doc.portal_login_id || "";

        // Fetch Supplier Email
        frappe.db.get_doc("Supplier", frm.doc.supplier_name).then(supplier => {
            supplier_email = supplier.email_id || "";

            // Fetch Lastmile override
            frappe.db.get_list("Lastmile Services Master", {
                filters: { circuit_id: frm.doc.circuit_id },
                fields: ["email_address", "portal_login_id"],
                limit: 1
            }).then(lsm => {

                if (lsm && lsm.length > 0) {
                    supplier_email = lsm[0].email_address || supplier_email;
                    portal_login_id_value = lsm[0].portal_login_id || portal_login_id_value;
                }

                // --------------------------------------------------------
                // STAGE 1 POPUP (ORIGINAL — UNCHANGED)
                // --------------------------------------------------------

                let dialog1 = new frappe.ui.Dialog({
                    title: "",
                    fields: [

                        {
                            fieldtype: "HTML",
                            fieldname: "header_html",
                            options: `
                                <div style="
                                    background: linear-gradient(135deg, #17ACE4 0%, #0E7BA8 100%);
                                    padding: 15px 20px;
                                    margin: -20px -20px 15px -20px;
                                    color: white;
                                    text-align: center;
                                ">
                                    <div style="font-size: 18px; font-weight: 700;">
                                        🚀 Service Cancellation
                                    </div>
                                </div>
                            `
                        },

                        {
                            fieldname: "supplier_email",
                            label: "📧 Supplier Email",
                            fieldtype: "Data",
                            default: frm.doc.supplier_email_id || supplier_email || "",
                            reqd: 1
                        },

                        {
                            fieldname: "portal_login_id",
                            label: "🔑 Portal Login ID",
                            fieldtype: "Data",
                            default: portal_login_id_value || "",
                        },

                        {
                            fieldname: "effective_date",
                            label: "📅 Effective Date",
                            fieldtype: "Date",
                            reqd: 1
                        },

                        {
                            fieldname: "disconnection_reason",
                            label: "🎯 Disconnection Reason",
                            fieldtype: "Select",
                            options: [
                                "Site Shifted",
                                "Site permanently closed",
                                "Customer Requirement Changed",
                                "Poor Services",
                                "Contract Ended",
                                "Cost Issues",
                                "Technical Problems"
                            ],
                            reqd: 1
                        },

                        {
                            fieldname: "notes",
                            label: "📝 Notes",
                            fieldtype: "Small Text"
                        }
                    ],

                    primary_action_label: "📤 Continue",

                    primary_action(values1) {

                        if (!values1.supplier_email ||
                            !values1.effective_date ||
                            !values1.disconnection_reason) {

                            frappe.msgprint("Please fill all required fields.");
                            return;
                        }

                        // CLOSE FIRST POPUP
                        dialog1.hide();

                        // --------------------------------------------------------
                        // BUILD EMAIL HTML (YOUR FULL TEMPLATE)
                        // --------------------------------------------------------

                        let email_html = `
<!-- OUTER WRAPPER -->
<div style="max-width: 750px; margin: auto; border: 1px solid #e6e6e6; background: #ffffff;">

    <!-- HEADER IMAGE -->
    <div style="width: 100%; text-align: center;">
        <img src="https://erp.nexapp.co.in/files/Nexapp%20Image.jpeg"
             alt="Nexapp Header"
             style="width: 100%; max-width: 750px; display: block;">
    </div>

    <!-- CONTENT BODY -->
    <div style="padding: 25px 35px; font-family: Arial, sans-serif; color: #333; font-size: 14px;">

        <p>Dear Team,</p>

        <p>
            Please consider this letter as a formal request to disconnect the broadband
            services for the account mentioned below. Kindly initiate the disconnection
            process at the earliest and provide confirmation once the service has been
            successfully terminated.
        </p>

        <p><strong>Effective Date of Disconnection:</strong> 
            ${frappe.format(values1.effective_date, "dd-MM-yyyy")}
        </p>

        <p><strong>Reason for Disconnection:</strong> 
            ${values1.disconnection_reason}
        </p>

        <h3 style="margin-top: 35px; margin-bottom: 12px;">Service Details</h3>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="background-color: #0077b6; color: #fff;">
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">Circuit ID</th>
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">Supplier Name</th>
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">Site Name</th>
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">User ID</th>
                </tr>
            </thead>

            <tbody>
                <tr>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">${frm.doc.circuit_id}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">${frm.doc.supplier_name}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">${frm.doc.site}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">${values1.portal_login_id || "N/A"}</td>
                </tr>
            </tbody>
        </table>

        <br><br>

        ${values1.notes ? `<p><strong>Note:</strong><br>${values1.notes}</p>` : ""}

        <p><strong>Please ensure all billing is stopped from the effective date mentioned above.</strong></p>

        <p>Thank you for your prompt attention to this matter.</p>

        <br>

        <p>
             <strong>Thanks & Regards,</strong><br>
            <strong>Nexapp Technologies Private Limited</strong><br>
            Accounts & Finance Team
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">

        <div style="font-size: 12px; color: #555;">
            <p>
                Email: techsupport@nexapp.co.in |
                Phone: 020-67623999<br>
                Address: 402 4th Floor, Icon Tower, Baner, Pune 411027
            </p>
        </div>

    </div>
</div>`;


                        // --------------------------------------------------------
                        // STAGE 2 POPUP (YOUR OLD CODE — UNCHANGED)
                        // --------------------------------------------------------

                        let dialog2 = new frappe.ui.Dialog({
                            title: "Email Preview",
                            fields: [
                                {
                                    fieldname: "email_to",
                                    label: "Email To",
                                    fieldtype: "Data",
                                    read_only: 1,
                                    default: values1.supplier_email
                                },
                                {
                                    fieldname: "subject",
                                    label: "Subject",
                                    fieldtype: "Data",
                                    read_only: 1,
                                    default: `Request for Broadband Service Disconnection - ${frm.doc.name}`
                                },
                                {
                                    fieldname: "email_body",
                                    label: "Email Body",
                                    fieldtype: "HTML",
                                    options:
                                        `<div style="max-height:400px; overflow-y:auto;">${email_html}</div>`
                                }
                            ],
                            primary_action_label: "Confirm & Notify",
                            primary_action() {

                                frm.__skip_disconnection_popup = true;

                                // UPDATE DOC FIELDS → TRIGGER NOTIFICATION
                                frm.set_value("supplier_email_id", values1.supplier_email);
                                frm.set_value("effective_date", values1.effective_date);
                                frm.set_value("disconnection_reason", values1.disconnection_reason);
                                frm.set_value("note", values1.notes);
                                frm.set_value("portal_login_id", values1.portal_login_id);

                                // IMPORTANT → this triggers Notification
                                frm.set_value("disconnection_status", "Supplier Notified");

                                frm.save().then(() => {
                                    frappe.show_alert("Supplier has been notified.", 5);
                                });

                                dialog2.hide();
                            }
                        });

                        dialog2.show();
                    }
                });

                dialog1.show();

                // -------------------------------------------------
                // APPLY ORIGINAL POPUP UI STYLING (UNCHANGED)
                // -------------------------------------------------

                dialog1.$wrapper.find('.modal-header').css("display", "none");

                dialog1.$wrapper.find('.modal-dialog').css({
                    'max-width': '520px',
                    'margin-top': '60px',
                    'border-radius': '10px',
                    'overflow': 'hidden',
                    'box-shadow': '0 6px 20px rgba(0,0,0,0.15)'
                });

                dialog1.$wrapper.find('.modal-content').css({
                    'padding': '10px 20px'
                });

                dialog1.$wrapper.find('.frappe-control').css({
                    'margin-bottom': '8px'
                });

                dialog1.$wrapper.find('.form-control').css({
                    'border-radius': '8px',
                    'padding': '6px 10px',
                    'font-size': '13px',
                    'height': '32px',
                    'margin-bottom': '4px'
                });

                dialog1.$wrapper.find('select.form-control').css({
                    'height': '32px'
                });

                dialog1.$wrapper.find('textarea.form-control').css({
                    'height': '70px',
                    'min-height': '70px'
                });

                dialog1.$wrapper.find('.control-label').css({
                    'font-size': '12px',
                    'font-weight': '600',
                    'margin-bottom': '2px',
                    'color': '#333'
                });

                dialog1.$wrapper.find('.btn-primary').css({
                    'background': 'linear-gradient(135deg, #17ACE4 0%, #0E7BA8 100%)',
                    'border-radius': '8px',
                    'padding': '8px 20px',
                    'color': 'white',
                    'width': '100%',
                    'margin-top': '12px',
                    'height': '36px',
                    'font-weight': '600'
                });

            });
        });
    }
});

/////////////////////////////////////////////////////////////////////////
// Disconnection To Site and Lastmile Services Master
frappe.ui.form.on("Disconnection LMS", {
    disconnection_status(frm) {

        if (frm.doc.disconnection_status !== "Disconnected") return;

        frappe.confirm(
            `Are you sure you want to disconnect LMS ID <b>${frm.doc.lms_id}</b> and Site <b>${frm.doc.circuit_id}</b>?`,
            function () {

                // 🔹 Set today's date when user confirms
                frm.set_value("disconnected_date", frappe.datetime.get_today());

                frappe.call({
                    method: "nexapp.nexapp.doctype.disconnection_lms.disconnection_lms.process_disconnection",
                    args: {
                        lms_id: frm.doc.lms_id,
                        circuit_id: frm.doc.circuit_id
                    },
                    callback: function(r) {
                        if (!r.exc) {
                            frappe.msgprint({
                                title: "Disconnection Completed",
                                message: r.message,
                                indicator: "green"
                            });
                        }
                    }
                });

            },
            function () {
                frm.set_value("disconnection_status", "");
            }
        );
    }
});
