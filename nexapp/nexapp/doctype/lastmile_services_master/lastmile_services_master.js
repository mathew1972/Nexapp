frappe.ui.form.on('Lastmile Services Master', {
    refresh: function (frm) {
        // List of fields to apply custom styles to
        const fields = [
            'lms_supplier', 'bandwith_type', 'media', 'otc', 'static_ip_cost',
            'billing_terms', 'support_mode', 'column_break_ctob', 'supplier_contact',
            'lms_bandwith', 'static_ip', 'mrc', 'security_deposit', 'billing_mode', 
            'circuit_id', 'lms_supplier_status', 'description','expected_delivery_date',
            'territory', 'lms_delivery_date', 'old_lms_id', 'lms_stage','lms_feasibility_partner',
            'customer','site', 'solution', 'site_type','primary_plan','secondary_plan',"lms_review"
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

////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Lastmile Services Master', {
    refresh: function(frm) {
        // Inject Font Awesome info icon into custom_info field
        frm.fields_dict.custom_info.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_policy_icon" title="LMS SOP Info" style="cursor: pointer; font-size: 29px; color: #FF0000;">
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

// Function to show policy dialog
function show_policy_dialog() {
    let policy_html = `
        <div style="padding: 10px; line-height: 1.6; max-height: 500px; overflow-y: auto;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">🎯 Objective</h4>
            <p>To ensure efficient tracking, coordination, and fulfillment of last-mile services across departments by standardizing the process of LMS ID creation, updates, and usage. This SOP is designed to maintain data integrity, streamline workflows, and improve cross-functional collaboration.</p>

            <h4 style="font-weight: bold; margin-top: 20px;">📋 Key Responsibilities & Process Flow</h4>
            <ul>
                <li>🔍 <b>Verify Information Before Entry:</b> Ensure all mandatory fields are accurately filled. Validate supplier and delivery details.</li>
                <li>🆔 <b>LMS ID Generation:</b> Each entry is assigned a unique LMS ID used across Procurement, Logistics, Finance, and Customer Support.</li>
                <li>📦 <b>Purchase Order (PO) Coordination:</b> LMS record must be created before PO release and referenced in all related documents.</li>
                <li>👤 <b>Assigning Delivery Agent:</b> Assign/update delivery partner via the LMS form, including their contact details.</li>
                <li>🔄 <b>Status Updates:</b> Update LMS record at each stage: 📤 PO Released, 🤝 Partner Assigned, 📥 Handover Done, ✅ Service Completed.</li>
                <li>🚫 <b>Handling Errors:</b> Report incorrect data or operational issues to the system administrator immediately.</li>
                <li>📁 <b>Departmental Reference:</b> LMS serves as the source for multiple teams: 🛒 Procurement, 🚚 Logistics, 💰 Finance, 🎧 Customer Support.</li>
            </ul>

            <h4 style="font-weight: bold; margin-top: 20px;">🧾 Mandatory Compliance</h4>
            <ul>
                <li>✅ Fill all mandatory fields before submission.</li>
                <li>🕵️‍♂️ Cross-verify all key fields like supplier, project, and location.</li>
                <li>🧑‍💼 Only authorized users may update or trigger workflows related to LMS.</li>
            </ul>

            <h4 style="font-weight: bold; margin-top: 20px;">🧠 Best Practices</h4>
            <ul>
                <li>📅 Periodically review and update LMS entries.</li>
                <li>📎 Attach supporting documents like feasibility reports or confirmation emails.</li>
                <li>🔐 Maintain data privacy; avoid sharing LMS IDs outside approved channels.</li>
            </ul>

            <h4 style="font-weight: bold; margin-top: 20px;">⚠️ Non-Compliance Risks</h4>
            <ul>
                <li>❌ Service delays due to incorrect entries.</li>
                <li>❌ Departmental misalignment and confusion.</li>
                <li>❌ Disruptions in procurement and finance workflows.</li>
            </ul>

            <h4 style="font-weight: bold; margin-top: 20px;">🆘 Support & Escalation</h4>
            <ul>
                <li>📈 Process Queries: Contact your <b>Team Lead</b> or <b>Project Manager</b></li>
            </ul>
        </div>
    `;

    let d = new frappe.ui.Dialog({
        title: 'Lastmile Services Master - SOP',
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

////////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Lastmile Services Master', {
    static_ip_1: function(frm) {
        validate_ip_field(frm, 'static_ip_1');
    },
    subnet: function(frm) {
        validate_ip_field(frm, 'subnet');
    },
    gateway: function(frm) {
        validate_ip_field(frm, 'gateway');
    }
});

function validate_ip_field(frm, fieldname) {
    const value = frm.doc[fieldname];
    const ipRegex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

    if (value && !ipRegex.test(value)) {
        const label = frappe.meta.get_docfield(frm.doctype, fieldname, frm.doc.name).label;
        frappe.msgprint(`Please enter a valid IP address in the "${label}" field.`);
        frm.set_value(fieldname, '');
    }
}
/////////////////////////////////////////////////////////////////////
// Update the Cancellation

frappe.ui.form.on('Lastmile Services Master', {
    refresh: function (frm) {
        frappe.after_ajax(() => {
            if (!frm.is_new()) {
                add_lms_buttons(frm);
            }
        });
    },

    after_save: function (frm) {
        frappe.after_ajax(() => {
            add_lms_buttons(frm);
        });
    }
});

async function add_lms_buttons(frm) {
    // Clear existing custom buttons in LMS Management Group
    frm.clear_custom_buttons('LMS Management Group');

    // Group Main Button
    let lms_btn = frm.add_custom_button(__('LMS Management'), null, __('LMS Management Group'));
    lms_btn.css({
        "background-color": "#000",
        "color": "#fff",
        "border": "1px solid #000"
    });

    // =========================================================================
    // ❌ LMS CANCEL BUTTON
    // =========================================================================
    frm.add_custom_button(__('❌ LMS Cancel'), function () {
        frappe.confirm(
            "Are you sure you want to cancel this Lastmile Service?",
            function () {

                frappe.call({
                    method: "nexapp.api.cancel_lms_service",
                    args: {
                        lms_id: frm.doc.name,
                        circuit_id: frm.doc.circuit_id
                    },
                    freeze: true,
                    freeze_message: "Processing cancellation...",
                    callback: function (r) {
                        if (!r.exc) {
                            frappe.msgprint(r.message);
                            frm.reload_doc();
                        }
                    }
                });

            },
            function () {
                frappe.msgprint("Cancellation aborted.");
            }
        );
    }, __("LMS Management Group"));



    // =========================================================================
    // 📄 PO REQUEST BUTTON
    // =========================================================================
    frm.add_custom_button(__('📄 PO Request'), async function () {

    // Mandatory fields grouping
    const mandatorySections = [
        {
            title: 'LMS Supplier Information',
            icon: '👥',
            fields: [
                { field: 'supplier_contact', label: 'Supplier Contact', icon: '📞' },
                { field: 'expected_delivery_date', label: 'Expected Delivery Date', icon: '📅' }
            ]
        },
        {
            title: 'Billing Information',
            icon: '💰',
            fields: [
                { field: 'supplier_contact', label: 'Supplier Contact', icon: '📞' },
                { field: 'payment_mode', label: 'Payment Mode', icon: '💳' },
                { field: 'validity', label: 'Validity', icon: '⏳' },
                { field: 'payment_cycle', label: 'Payment Cycle', icon: '🔄' },
                { field: 'billing_terms', label: 'Billing Terms', icon: '📝' },
                { field: 'billing_mode', label: 'Billing Mode', icon: '🏷️' }
            ]
        }
    ];

    // Missing fields detection
    const missingSections = mandatorySections.map(section => {
        const missingFields = section.fields.filter(item => !frm.doc[item.field]);
        return { ...section, missingFields };
    }).filter(section => section.missingFields.length > 0);

    if (missingSections.length > 0) {
        let message = __('<div style="font-size: 14px;">Please fill the following mandatory fields before creating PO Request:</div>');
        missingSections.forEach(section => {
            message += `
                <div style="margin-top: 15px;">
                    <div style="font-weight: bold; font-size: 13px; color: #5e64ff; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px;">
                        ${section.icon} ${__(section.title)}
                    </div>
                    <ul style="margin-top: 8px; margin-bottom: 0; padding-left: 20px;">
                        ${section.missingFields.map(item => `
                            <li style="margin-bottom: 5px;">
                                <span style="margin-right: 5px;">${item.icon}</span>
                                ${__(item.label)}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        });

        frappe.msgprint({
            title: __('Missing Required Fields'),
            indicator: 'red',
            message: message
        });
        return;
    }

    // Check existing PO request
    if (frm.doc.po_requeste_id && await frappe.db.exists('Material Request', frm.doc.po_requeste_id)) {
        frappe.msgprint(__('PO Requested.'));
        return;
    }

    try {
        if (!frm.doc.supplier) {
            frappe.throw(__('Supplier is required to create PO Request.'));
        }

        const supplier_exists = await frappe.db.exists('Supplier', frm.doc.supplier);
        if (!supplier_exists) {
            frappe.throw(__('PO request can\'t be created. First, create the Supplier.'));
        }

        const items = frm.doc.table_djyj.map(item => ({
            item_code: item.item_code,
            rate: item.item_rate,
            qty: item.qty
        }));

        // -----------------------------------------
        //  ✅ CREATE MATERIAL REQUEST WITH USER EMAIL
        // -----------------------------------------
        const res_main = await frappe.call({
            method: "frappe.client.insert",
            args: {
                doc: {
                    doctype: "Material Request",
                    material_request_type: "Purchase",
                    custom_supplier: frm.doc.supplier,
                    schedule_date: frappe.datetime.get_today(),
                    custom_circuit: frm.doc.circuit_id,
                    custom_lms_id: frm.doc.name,
                    custom_po_requested_by: frappe.session.user_email,       // ✅ ADDED
                    items
                }
            }
        });

        const main_request_name = res_main.message.name;

        await frappe.call({
            method: "frappe.client.submit",
            args: { doc: res_main.message }
        });

        await frappe.call({
            method: "frappe.client.set_value",
            args: {
                doctype: "Lastmile Services Master",
                name: frm.doc.name,
                fieldname: {
                    lms_stage: "PO Requested",
                    po_requeste_id: main_request_name,
                    po_requested_date: frappe.datetime.get_today()
                }
            }
        });

        if (frm.doc.circuit_id) {
            const site_doc = await frappe.db.get_doc('Site', frm.doc.circuit_id);
            if (site_doc && site_doc.lms_vendor && site_doc.lms_vendor.length > 0) {

                const matching_row = site_doc.lms_vendor.find(row =>
                    row.lms_requested_id === frm.doc.lms_request_id &&
                    row.lms_supplier === frm.doc.supplier
                );

                if (matching_row) {
                    await frappe.call({
                        method: 'frappe.client.set_value',
                        args: {
                            doctype: 'LMS Site',
                            name: matching_row.name,
                            fieldname: {
                                lms_id: frm.doc.name,
                                stage: "LMS PO Requested"
                            }
                        }
                    });

                    await frappe.call({
                        method: "frappe.client.save",
                        args: {
                            doc: site_doc
                        }
                    });
                }
            }
        }

        frappe.msgprint(__('✅ Material Request Created and Submitted: {0}', [main_request_name]));


        // ------------------------------------------------
        //  Distribution PO Request (also update USER EMAIL)
        // ------------------------------------------------
        if (frm.doc.vendor_distribution == 1 && frm.doc.lms_distribution_po.length > 0) {
            const dist_supplier = frm.doc.lms_distribution_po[0].lms_supplier;

            if (!dist_supplier) {
                frappe.msgprint(__('LMS Supplier not set in Distribution PO table.'));
                return;
            }

            if (!await frappe.db.exists('Supplier', dist_supplier)) {
                frappe.msgprint(__('Supplier {0} does not exist. Please create it first.', [dist_supplier]));
                return;
            }

            const dist_items = frm.doc.lms_distribution_po.map(row => ({
                item_code: row.item_code,
                rate: row.item_rate,
                qty: row.qty
            }));

            const res_dist = await frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "Material Request",
                        material_request_type: "Purchase",
                        custom_supplier: dist_supplier,
                        schedule_date: frappe.datetime.get_today(),
                        custom_circuit: frm.doc.circuit_id,
                        custom_lms_id: frm.doc.name,
                        custom_po_requested_by: frappe.session.user_email,   // ✅ ADDED HERE
                        items: dist_items
                    }
                }
            });

            await frappe.call({
                method: "frappe.client.submit",
                args: { doc: res_dist.message }
            });

            frappe.msgprint(__('✅ Distribution Material Request Created and Submitted: {0}', [res_dist.message.name]));
        }

        frm.reload_doc();

    } catch (error) {
        console.error("PO Request Error:", error);
        frappe.msgprint(__('⚠️ An error occurred: ') + error.message);
    }

}, __('LMS Management Group'));



    // =========================================================================
    // 💰 LMS PAYMENT BUTTON
    // =========================================================================
    frm.add_custom_button(__('💰 LMS Payment'), async function () {
        const lms_id = frm.doc.name;

        if (!lms_id) {
            frappe.msgprint(__('LMS ID not found.'));
            return;
        }

        if (frm.doc.lms_stage !== "PO Released") {
            frappe.msgprint(__('Cannot create LMS Payment Request. LMS Stage must be "PO Released".'));
            return;
        }

        if (frm.doc.payment_request_id && await frappe.db.exists('LMS Payment Request', frm.doc.payment_request_id)) {
            frappe.msgprint(__('Payment Request already exists: {0}', [frm.doc.payment_request_id]));
            return;
        }

        const dialog = new frappe.ui.Dialog({
            title: 'Enter Payment Details',
            fields: [
                {
                    label: 'Payment Mode',
                    fieldname: 'payment_mode',
                    fieldtype: 'Select',
                    options: ['Portal', 'NEFT'],
                    reqd: 1,
                    onchange: function () {
                        const show = dialog.get_value('payment_mode') === 'Portal';
                        dialog.set_df_property('account_no__payment_link', 'hidden', !show);
                        dialog.set_df_property('user_name', 'hidden', !show);
                        dialog.set_df_property('password', 'hidden', !show);
                    }
                },
                {
                    label: 'Account No / Payment Link',
                    fieldname: 'account_no__payment_link',
                    fieldtype: 'Data',
                    hidden: 1
                },
                {
                    label: 'User Name',
                    fieldname: 'user_name',
                    fieldtype: 'Data',
                    hidden: 1
                },
                {
                    label: 'Password',
                    fieldname: 'password',
                    fieldtype: 'Data',
                    hidden: 1
                }
            ],
            primary_action_label: 'Submit',
            primary_action: async function (data) {
                dialog.hide();
                try {

                    const po_data = await frappe.db.get_list('Purchase Order', {
                        filters: { 'custom_lms_id': lms_id },
                        fields: ['name', 'net_total', 'total_taxes_and_charges', 'grand_total', 'rounded_total'],
                        limit: 1
                    });

                    if (po_data.length === 0) {
                        frappe.throw(__('No Purchase Order found for this LMS ID'));
                    }

                    const po = po_data[0];

                    const po_items = await frappe.db.get_list('Purchase Order Item', {
                        filters: { 'parent': po.name },
                        fields: ['item_code', 'item_name', 'rate', 'qty', 'amount']
                    });

                    const lms_po_details = po_items.map(item => ({
                        item_code: item.item_code,
                        item_name: item.item_name,
                        rate: item.rate,
                        qty: item.qty,
                        amount: item.amount
                    }));

                    const new_payment = await frappe.call({
                        method: "frappe.client.insert",
                        args: {
                            doc: {
                                doctype: "LMS Payment Request",
                                lms_id: lms_id,
                                po_number: po.name,
                                payment_mode: data.payment_mode,
                                account_no__payment_link: data.account_no__payment_link || "",
                                user_name: data.user_name || "",
                                password: data.password || "",
                                payment_request_date: frappe.datetime.now_datetime(),
                                net_total: po.net_total,
                                total_taxes_and_charges: po.total_taxes_and_charges,
                                grand_total: po.grand_total,
                                rounded_total: po.rounded_total,
                                payment_amount: po.rounded_total,
                                lms_po_details
                            }
                        }
                    });

                    const new_payment_id = new_payment.message.name;

                    await frappe.db.set_value("Lastmile Services Master", lms_id, {
                        payment_request_id: new_payment_id,
                        lms_payment_request: "LMS Payment Requested",
                        payment_request_date: frappe.datetime.now_datetime()
                    });

                    frappe.msgprint(__('✅ LMS Payment Request created: {0}', [new_payment_id]));
                    frm.reload_doc();

                } catch (error) {
                    console.error("LMS Payment Error:", error);
                    frappe.msgprint(__('⚠️ Error while creating LMS Payment Request: ') + error.message);
                }
            }
        });

        dialog.show();
    }, __('LMS Management Group'));

} // END add_lms_buttons()
