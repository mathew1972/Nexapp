frappe.ui.form.on("Purchase Order", {
    validate(frm) {

        if (frm.__skip_popup) return;

        if (!frm.doc.supplier_name) {
            frappe.msgprint("Please select Supplier Name first.");
            frappe.validated = false;
            return;
        }

        // STEP 1: Fetch Supplier master email
        frappe.db.get_doc("Supplier", frm.doc.supplier_name).then(supplier => {

            let supplier_email = supplier.email_id || "";
            let portal_login_id_value = frm.doc.portal_login_id || "";
            let po_requested_by_value = frm.doc.custom_po_requested_by || "";

            // STEP 2: Fetch PO Requested By from Material Request
            if (frm.doc.material_request) {
                frappe.db.get_doc("Material Request", frm.doc.material_request).then(mr => {
                    po_requested_by_value = mr.custom_po_requested_by || po_requested_by_value;
                });
            }

            // STEP 3: Fetch from Lastmile Services Master
            frappe.db.get_list("Lastmile Services Master", {
                filters: { circuit_id: frm.doc.circuit_id },
                fields: ["email_address", "portal_login_id"],
                limit: 1
            }).then(lsm => {

                if (lsm && lsm.length > 0) {
                    supplier_email = lsm[0].email_address || supplier_email;
                    portal_login_id_value = lsm[0].portal_login_id || portal_login_id_value;
                }

                // -----------------------------------------------------------
                // SHOW POPUP (Notes removed)
                // -----------------------------------------------------------
                let dialog = new frappe.ui.Dialog({
                    title: "",
                    fields: [

                        // HEADER BLOCK
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
                                        📧 Supplier Notification
                                    </div>
                                </div>
                            `
                        },

                        // 1️⃣ Supplier Email
                        {
                            fieldname: "supplier_email",
                            label: "📧 Supplier Email",
                            fieldtype: "Data",
                            reqd: 1,
                            default: frm.doc.custom_supplier_email_id || supplier_email
                        },

                        // 2️⃣ PO Requested By (NEW FIELD)
                        {
                            fieldname: "po_requested_by",
                            label: "👤 PO Requested By",
                            fieldtype: "Data",
                            reqd: 0,
                            default: po_requested_by_value
                        }
                    ],

                    primary_action_label: "📤 Save & Continue",

                    primary_action(values) {

                        if (!values.supplier_email) {
                            frappe.msgprint("Supplier Email is mandatory.");
                            return;
                        }

                        frm.__skip_popup = true;

                        // SAVE FIELDS TO PURCHASE ORDER
                        frm.set_value("custom_supplier_email_id", values.supplier_email);
                        frm.set_value("custom_po_requested_by", values.po_requested_by);

                        dialog.hide();
                        frm.save();
                    }
                });

                dialog.show();

                // -----------------------------------------------------------
                // SAME UI DESIGN / COLORS
                // -----------------------------------------------------------
                dialog.$wrapper.find('.modal-header').css("display", "none");

                dialog.$wrapper.find('.modal-dialog').css({
                    'max-width': '520px',
                    'margin-top': '60px',
                    'border-radius': '10px',
                    'overflow': 'hidden',
                    'box-shadow': '0 6px 20px rgba(0,0,0,0.15)'
                });

                dialog.$wrapper.find('.modal-content').css({
                    'padding': '10px 20px'
                });

                dialog.$wrapper.find('.frappe-control').css({
                    'margin-bottom': '8px'
                });

                dialog.$wrapper.find('.form-control').css({
                    'border-radius': '8px',
                    'padding': '6px 10px',
                    'font-size': '13px',
                    'height': '32px',
                    'margin-bottom': '4px'
                });

                dialog.$wrapper.find('textarea.form-control').css({
                    'height': '70px',
                    'min-height': '70px'
                });

                dialog.$wrapper.find('.control-label').css({
                    'font-size': '12px',
                    'font-weight': '600',
                    'margin-bottom': '2px',
                    'color': '#333'
                });

                dialog.$wrapper.find('.btn-primary').css({
                    'background': 'linear-gradient(135deg, #17ACE4 0%, #0E7BA8 100%)',
                    'border-radius': '8px',
                    'padding': '8px 20px',
                    'color': 'white',
                    'width': '100%',
                    'margin-top': '12px',
                    'height': '36px',
                    'font-weight': '600'
                });

                frappe.validated = false;
            });
        });
    }
});
