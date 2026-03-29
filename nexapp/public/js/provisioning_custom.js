frappe.ui.form.on('Provisioning', {

    // -----------------------------------
    // VALIDATE: STATUS + DATE + IP CHECKS
    // -----------------------------------
    validate: function(frm) {

        const has = v => v && String(v).trim() !== '';

        let hasL1 = has(frm.doc.lms_id_1);
        let hasL2 = has(frm.doc.lms_id_2);
        let newStatus = "Pending";

        let lmsType = (frm.doc.lms_type || "").toLowerCase();

        // ✅ Required Field
        if (!has(frm.doc.branch_router_ip)) {
            frappe.throw(__('Branch Router IP is required before saving.'));
        }

        // -----------------------------------
        // STATUS LOGIC
        // -----------------------------------
        if (lmsType.includes("no lms")) {
            newStatus = "Completed";
        }
        else if (lmsType.includes("single")) {
            newStatus = (hasL1 || hasL2) ? "Completed" : "Pending";
        }
        else if (lmsType.includes("dual")) {
            if (hasL1 && hasL2) {
                newStatus = "Completed";
            } else if (!hasL1 && !hasL2) {
                newStatus = "Pending";
            } else {
                newStatus = "Partially Completed";
            }
        }

        frm.set_value("status", newStatus);

        // -----------------------------------
        // DATE VALIDATION
        // -----------------------------------
        if (newStatus === "Completed" && !frm.doc.provisioning_date) {
            frappe.throw(__('Please enter the Provisioning Date before saving.'));
        }

        if (newStatus === "Partially Completed" && !frm.doc.provisioning_partially_completed_date) {
            frappe.throw(__('Please enter the Provisioning Partially Completed Date before saving.'));
        }

        // -----------------------------------
        // IP VALIDATION
        // -----------------------------------
        const fields = [
            ['atm_ip', 'ATM IP', false],
            ['branch_natted_ip', 'Branch Natted IP', true],
            ['branch_router_ip', 'Branch Router IP', false],
            ['branch_lane_series', 'Branch Lane Series', true],
            ['dc_static_ip', 'DC Static IP', false],
            ['dc_router_ip', 'DC Router IP', false],
            ['dc_secondary_static_ip', 'DC Secondary Static IP', false],
            ['dc_server_gateway_ip', 'DC Server Gateway IP', false],
            ['dc_server_ip', 'DC Server IP', false],
            ['dc_server_ip_2', 'DC Server IP 2', false],
            ['dr_static_ip', 'DR Static IP', false],
            ['dr_router_ip', 'DR Router IP', false],
            ['dr_secondary_static_ip', 'DR Secondary Static IP', false],
            ['dr_server_gateway_ip', 'DR Server Gateway IP', false],
            ['dr_server_ip', 'DR Server IP', false],
            ['dr_server_ip_2', 'DR Server IP 2', false],
            ['wan_static_ip_1', 'WAN Static IP 1', false],
            ['wan_gateway_ip_1', 'WAN Gateway IP 1', false],
            ['subnet_mask_1', 'Subnet Mask 1', false],
            ['wan_static_ip_2', 'WAN Static IP 2', false],
            ['wan_gateway_ip_2', 'WAN Gateway IP 2', false],
            ['subnet_mask_2', 'Subnet Mask 2', false]
        ];

        const ipv4_re = /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/;
        const cidr_re = /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}\/([0-9]|[1-2]\d|3[0-2])$/;

        fields.forEach(([fieldname, label, allowCidr]) => {
            const value = frm.doc[fieldname];

            if (value && !(ipv4_re.test(value) || (allowCidr && cidr_re.test(value)))) {
                frappe.throw(`${label} has an invalid IP format.`);
            }

            if (value && /[a-zA-Z]/.test(value)) {
                frappe.throw(`${label} should only contain numbers, dots, or slash.`);
            }
        });
    },

    // -----------------------------------
    // REFRESH: LMS FILTERS
    // -----------------------------------
    refresh: function(frm) {

        frm.set_query("lms_id_2", () => ({
            filters: frm.doc.lms_id_1 ? [["name", "!=", frm.doc.lms_id_1]] : []
        }));

        frm.set_query("lms_id_1", () => ({
            filters: frm.doc.lms_id_2 ? [["name", "!=", frm.doc.lms_id_2]] : []
        }));
    },

    // -----------------------------------
    // LMS DUPLICATE PREVENTION
    // -----------------------------------
    lms_id_1: function(frm) {
        if (frm.doc.lms_id_1 && frm.doc.lms_id_1 === frm.doc.lms_id_2) {
            frm.set_value("lms_id_2", null);
            frappe.show_alert({
                message: "LMS ID 2 cannot be same as LMS ID 1",
                indicator: "orange"
            });
        }
    },

    lms_id_2: function(frm) {
        if (frm.doc.lms_id_1 && frm.doc.lms_id_1 === frm.doc.lms_id_2) {
            frm.set_value("lms_id_2", null);
            frappe.show_alert({
                message: "LMS ID 2 cannot be same as LMS ID 1",
                indicator: "orange"
            });
        }
    },

    // -----------------------------------
    // AFTER SAVE: CALL API (NO REDIRECT)
    // -----------------------------------
    after_save: function(frm) {

        if (!frm.doc.circuit_id) return;

        if (!["Completed", "Partially Completed"].includes(frm.doc.status)) return;

        let message = frm.doc.status === "Completed"
            ? "Do you want to update the Site as 'Provisioning Completed'?"
            : "Do you want to update the Site as 'Partially Provisioning Completed'?";

        frappe.confirm(__(message), function() {

            frappe.call({
                method: "nexapp.api.update_site_from_provisioning",
                args: {
                    provisioning_name: frm.doc.name
                },
                freeze: true,
                freeze_message: "Updating Site...",
                callback: function(r) {

                    if (!r.exc) {

                        frappe.msgprint({
                            title: "Success",
                            message: "✅ Site updated successfully.",
                            indicator: "green"
                        });

                        // ✅ Refresh only current form
                        frm.reload_doc();
                    }
                },
                error: function() {
                    frappe.msgprint({
                        title: "Error",
                        message: "❌ Failed to update Site. Please check logs.",
                        indicator: "red"
                    });
                }
            });

        });
    }
});