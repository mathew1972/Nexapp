frappe.ui.form.on('SIM Disconnection', {
    refresh(frm) {
        apply_global_layout(frm);
        apply_field_styles(frm);
        fix_readonly_display(frm);
        highlight_status(frm);
    },

    onload_post_render(frm) {
        apply_global_layout(frm);
        apply_field_styles(frm);
        fix_readonly_display(frm);
        highlight_status(frm);
    },

    status(frm) {
        highlight_status(frm);
    }
});


// --------------------------------------------------------
// PART 1 — GLOBAL LAYOUT (SCOPED)
// --------------------------------------------------------
function apply_global_layout(frm) {
    const $ = frm.$wrapper.find.bind(frm.$wrapper);

    $('form .form-group', frm.$wrapper).css({ 'margin-bottom': '6px' });

    $('.control-label', frm.$wrapper).css({
        'margin-bottom': '2px',
        'font-size': '13px',
        'font-weight': '600',
        'color': '#444'
    });

    $('input.form-control, select.form-control, textarea.form-control', frm.$wrapper).css({
        'height': '32px',
        'padding': '4px 8px',
        'font-size': '13px',
        'border-radius': '7px',
        'box-sizing': 'border-box'
    });

    $('.section-head', frm.$wrapper).css({
        'font-size': '15px',
        'font-weight': '700',
        'padding': '6px 0',
        'color': '#2d2d2d',
        'border-bottom': '1px solid #e5e5e5',
        'margin-bottom': '10px'
    });

    $('.grid-form .form-column', frm.$wrapper).css({
        'width': '50%',
        'padding-right': '15px',
        'box-sizing': 'border-box'
    });

    $('.layout-main-section', frm.$wrapper).css({
        'background': '#fff',
        'padding': '10px 20px',
        'border-radius': '10px'
    });
}



// --------------------------------------------------------
// PART 2 — FIELD INPUT STYLING
// --------------------------------------------------------
function apply_field_styles(frm) {
    const $ = frm.$wrapper.find.bind(frm.$wrapper);

    const fields = [
        'status','item_code','item_name','item_group','solution','sim_no','mobile_no',
        'activation_date','validity','data_plan','recharge_end_date','circuit_id',
        'customer','site_id__legal_code','territory','site_name','order_type','site_type',
        'customer_type','address_street','contact_person','primary_contact_mobile','remarks',
        'sim_suspended_date', 'sr_no', 'replacement_sim_number', 'replacement_sim_number_date',
        'disconnected_date','brand','sim_status','disconnection_request_id', 'reason_for_disconnection',
        'disconnection_type','disconnection_notice_end_date'
    ];

    fields.forEach(field => {
        if (!frm.fields_dict[field]) return;

        const input = $(frm.fields_dict[field].wrapper).find("input, textarea, select");

        // Base layout styling
        input.css({
            'border': '1px solid #ccc',
            'border-radius': '7px',
            'padding': '5px',
            'background': '#fff',
            'transition': '0.15s',
            'box-sizing': 'border-box'
        });

        // REMARKS FIELD
        if (field === "remarks") {
            input.css({
                'height': '100px',
                'min-height': '100px',
                'padding': '10px',
                'resize': 'vertical'
            });
        }

        // REQUIRED FIELD RED LEFT BORDER
        if (frm.fields_dict[field].df.reqd) {
            input.css('border-left', '4px solid red');
        }

        // Focus / Blur effects
        input.off("focus blur")
        .on("focus", function () {
            $(this).css({
                'border': '1px solid #80bdff',
                'box-shadow': '0 0 6px rgba(0,123,255,0.4)'
            });
        })
        .on("blur", function () {
            $(this).css({
                'border': '1px solid #ccc',
                'box-shadow': 'none'
            });
            if (frm.fields_dict[field].df.reqd) {
                $(this).css('border-left', '5px solid red');
            }
        });
    });
}



// --------------------------------------------------------
// PART 3 — DYNAMIC STATUS COLORS (with matched borders)
// --------------------------------------------------------
function highlight_status(frm) {
    if (!frm.fields_dict["status"]) return;

    const input = $(frm.fields_dict["status"].wrapper).find("select");

    let bg = "#ffffff";
    let border = "#ccc";

    if (frm.doc.status === "Open") {
        bg = "#b3ffec";     // mint
        border = "#7ad6c6"; // matched darker shade
    }
    else if (frm.doc.status === "SIMEX") {
        bg = "#ffdb4d";     // yellow
        border = "#d1b441"; // matched darker shade
    }
    else if (frm.doc.status === "Suspended") {
        bg = "#d2ff4d";     // lime
        border = "#a0d63c"; // matched darker shade
    }
    else if (frm.doc.status === "Disconnected") {
        bg = "#ff704d";     // red-orange
        border = "#d65a3d"; // matched darker shade
    }

    input.css({
        'background-color': bg,
        'border': `1px solid ${border}`,
        'border-radius': '8px',
        'font-weight': '600',
        'color': '#000',
        'height': '40px',
        'padding-left': '10px'
    });
}



// --------------------------------------------------------
// PART 4 — FIX READONLY DISPLAY (Fixes duplicate fields)
// --------------------------------------------------------
function fix_readonly_display(frm) {
    const $ = frm.$wrapper.find.bind(frm.$wrapper);

    $(".frappe-control", frm.$wrapper).each(function () {

        let input = $(this).find("input, textarea, select");
        let display = $(this).find(".control-value");

        // FIX → IF INPUT EXISTS (even readonly), hide .control-value
        if (input.length > 0) {
            display.hide();
        }
        else {
            display.show().css({
                'padding': '6px 8px',
                'border': '1px solid #ccc',
                'border-radius': '7px',
                'background': '#fff',
                'min-height': '32px',
                'display': 'flex',
                'align-items': 'center',
                'color': '#333',
                'box-sizing': 'border-box'
            });
        }
    });

    $('input[readonly], textarea[readonly], select[readonly]', frm.$wrapper).css({
        'background': '#fff',
        'color': '#333',
        'border': '1px solid #ccc',
        'border-radius': '7px',
        'padding': '5px',
        'height': '32px',
        'box-sizing': 'border-box'
    });
}
////////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------
// ROBUST SIMEX LOGIC (Duplicate-first, Date-second, debug logs)
// -------------------------------------------------------

frappe.ui.form.on('SIM Disconnection', {

    // Ensure we remember previous status when form loads / refreshes
    onload(frm) {
        frm._prev_status = frm.doc.status || "";
    },

    refresh(frm) {
        // keep a snapshot of previous status so we can revert later
        frm._prev_status = frm.doc.status || "";
    },

    // Trigger when status changes (user selects a new value)
    status(frm) {
        try {
            console.group("%cSIMEX status handler", "color:#17ACE4;font-weight:600");
            console.log("Current status chosen:", frm.doc.status);
            console.log("Stored previous status:", frm._prev_status);

            if (frm.doc.status !== "SIMEX") {
                console.log("Status is not SIMEX — ignoring.");
                console.groupEnd();
                // still update prev for future selections
                frm._prev_status = frm.doc.status || "";
                return;
            }

            // ---------- Helper: normalize a date-ish value to ISO "YYYY-MM-DD" ----------
            function normalizeToISO(d) {
                if (!d && d !== 0) return null;
                if (d instanceof Date && !isNaN(d.getTime())) {
                    // build YYYY-MM-DD
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    return `${y}-${m}-${day}`;
                }
                if (typeof d === "string") {
                    d = d.trim();
                    // already ISO?
                    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
                    // common with slashes 2025/12/28 -> convert
                    if (/^\d{4}\/\d{2}\/\d{2}$/.test(d)) return d.replace(/\//g, "-");
                    // DD-MM-YYYY or DD/MM/YYYY
                    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)) {
                        const parts = d.split(/[-/]/); // [DD,MM,YYYY]
                        return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                    // fallback: try Date parse then convert
                    const parsed = new Date(d);
                    if (!isNaN(parsed.getTime())) {
                        const y = parsed.getFullYear();
                        const m = String(parsed.getMonth() + 1).padStart(2, "0");
                        const day = String(parsed.getDate()).padStart(2, "0");
                        return `${y}-${m}-${day}`;
                    }
                }
                return null;
            }

            // ---------- 1) DUPLICATE SIMEX CHECK (first) ----------
            const hasReplacementNumber = !!frm.doc.replacement_sim_number;
            const hasReplacementDate = !!frm.doc.replacement_sim_number_date;
            console.log("replacement_sim_number:", frm.doc.replacement_sim_number);
            console.log("replacement_sim_number_date:", frm.doc.replacement_sim_number_date);

            if (hasReplacementNumber || hasReplacementDate) {
                frappe.msgprint({
                    title: "Already Swapped",
                    indicator: "red",
                    message: "SIMEX has already been completed. You cannot do SIMEX again."
                });
                // revert to previous status
                console.warn("Blocking SIMEX: duplicate detected. Reverting status to:", frm._prev_status);
                frm.set_value("status", frm._prev_status || "");
                console.groupEnd();
                return;
            }

            // ---------- 2) DATE CHECK (second) ----------
            const raw_notice = frm.doc.disconnection_notice_end_date;
            const iso_notice = normalizeToISO(raw_notice);
            const today_iso = frappe.datetime.get_today(); // guaranteed YYYY-MM-DD
            console.log("raw disconnection_notice_end_date:", raw_notice);
            console.log("normalized notice_end (ISO):", iso_notice);
            console.log("today (ISO):", today_iso);

            if (!iso_notice) {
                // If there's no valid notice date, block and inform user
                frappe.msgprint({
                    title: "SIMEX Not Allowed",
                    indicator: "red",
                    message: "SIMEX cannot be done because Disconnection Notice End Date is missing or invalid."
                });
                frm.set_value("status", frm._prev_status || "");
                console.warn("Blocking SIMEX: missing/invalid notice date.");
                console.groupEnd();
                return;
            }

            // Allow popup only when notice_end > today
            if (!(iso_notice > today_iso)) {
                // iso_notice <= today => block
                frappe.msgprint({
                    title: "SIMEX Not Allowed",
                    indicator: "red",
                    message: `<div>SIMEX cannot be done.<br>
                              Disconnection Notice End Date <b>${iso_notice}</b> is today or has already passed.</div>`
                });
                console.warn(`Blocking SIMEX: notice_end (${iso_notice}) is NOT greater than today (${today_iso}).`);
                frm.set_value("status", frm._prev_status || "");
                console.groupEnd();
                return;
            }

            // ---------- 3) OPEN POPUP (all checks passed) ----------
            console.log("All checks passed — opening SIMEX popup.");
            console.groupEnd();
            show_simex_popup(frm);

        } catch (err) {
            // safety: in case of unexpected error, revert status and show error
            console.error("Error in SIMEX status handler", err);
            frappe.msgprint({
                title: "Error",
                indicator: "red",
                message: "An unexpected error occurred. Check console for details."
            });
            frm.set_value("status", frm._prev_status || "");
        } finally {
            // always keep previous status updated for next change
            frm._prev_status = frm.doc.status || "";
        }
    }
});


// -------------------------------------------------------
// POPUP FUNCTION — SIMEX (unchanged, with delayed save & styling)
// -------------------------------------------------------
function show_simex_popup(frm) {

    let dialog = new frappe.ui.Dialog({
        title: "🔄 SIM Exchange (SIMEX)",
        size: "small",
        fields: [
            {
                label: "Mobile No",
                fieldname: "mobile_no",
                fieldtype: "Data",
                read_only: 1,
                default: frm.doc.mobile_no
            },
            {
                label: "Old SIM No",
                fieldname: "old_sim_no",
                fieldtype: "Data",
                read_only: 1,
                default: frm.doc.sim_no
            },
            {
                label: "Enter the replacement SIM number",
                fieldname: "new_sim_no",
                fieldtype: "Data",
                reqd: 1
            }
        ],

        primary_action_label: "Do SIMEX",

        primary_action(values) {

            if (!values.new_sim_no) {
                frappe.msgprint("Please enter the New SIM No.");
                return;
            }

            // Save to actual fields
            frm.set_value("replacement_sim_number", values.new_sim_no);
            frm.set_value("replacement_sim_number_date", frappe.datetime.get_today());

            // Show completion message (before save)
            frappe.msgprint({
                title: "SIMEX Completed",
                indicator: "green",
                message: `
                    Replacement SIM No: <b>${values.new_sim_no}</b><br>
                    Date: <b>${frappe.datetime.get_today()}</b>
                `
            });

            dialog.hide();

            // Delay save to avoid UI message overlap
            setTimeout(() => {
                frm.save();
            }, 1000);
        }
    });

    // Styling
    dialog.$wrapper.find('.modal-dialog').css({
        "max-width": "480px",
        "border-radius": "14px",
    });

    dialog.$wrapper.find('.modal-header').css({
        "background": "#17ACE4",
        "color": "white",
        "border-top-left-radius": "14px",
        "border-top-right-radius": "14px",
        "padding": "16px",
    });

    dialog.$wrapper.find('.modal-title').css({
        "font-size": "20px",
        "font-weight": "600",
    });

    dialog.$wrapper.find('.modal-body').css({
        "padding": "22px",
        "background": "#F6F9FC"
    });

    dialog.$wrapper.find('.modal-footer').css({
        "background": "#EFF3F6",
        "border-bottom-left-radius": "14px",
        "border-bottom-right-radius": "14px",
        "padding": "15px",
    });

    dialog.$wrapper.find('.btn-primary').css({
        "background": "#E8991F",
        "border-color": "#E8991F",
        "color": "white",
        "font-weight": "600",
        "padding": "8px 18px",
        "border-radius": "8px"
    });

    dialog.$wrapper.find('.control-label').css({
        "color": "#48525B",
        "font-weight": "600"
    });

    dialog.show();
}

////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------
// FINAL: Suspension Logic with Perfect Behavior
// -------------------------------------------------------

frappe.ui.form.on('SIM Disconnection', {

    // Trigger ONLY when user changes status
    status(frm) {

        // When user selects "Suspended"
        if (frm.doc.status === "Suspended") {

            // ❌ PREVENT duplicate suspension
            if (frm.doc.sim_suspended_date || frm.doc.sr_no) {

                frappe.msgprint({
                    title: "Already Suspended",
                    indicator: "red",
                    message: "This SIM is already suspended. You cannot suspend it again."
                });

                // Revert status to previous
                frm.set_value("status", frm.doc._prev_status || "");
                return;
            }

            // First-time suspension → show popup
            show_suspended_popup(frm);
        }

        // Store the last status for rollback
        frm.doc._prev_status = frm.doc.status;
    },
});


// -------------------------------------------------------
// POPUP FUNCTION — SUSPENSION
// -------------------------------------------------------
function show_suspended_popup(frm) {

    let dialog = new frappe.ui.Dialog({
        title: "⛔ SIM Suspension",
        size: "small",

        fields: [
            {
                label: "Mobile No",
                fieldname: "mobile_no",
                fieldtype: "Data",
                read_only: 1,
                default: frm.doc.mobile_no
            },
            {
                label: "SIM No",
                fieldname: "sim_no",
                fieldtype: "Data",
                read_only: 1,
                default: frm.doc.sim_no
            },
            {
                label: "SIM Suspended From Date",
                fieldname: "suspended_from_date",
                fieldtype: "Date",
                reqd: 1,
                default: frappe.datetime.get_today()   // ✔ Today's date
            },
            {
                label: "SR No",
                fieldname: "sr_no_input",
                fieldtype: "Data",
                reqd: 1
            }
        ],

        primary_action_label: "Do Suspended",

        primary_action(values) {

            if (!values.suspended_from_date || !values.sr_no_input) {
                frappe.msgprint("Please fill all required fields.");
                return;
            }

            // Set values on the form
            frm.set_value("sim_suspended_date", values.suspended_from_date);
            frm.set_value("sr_no", values.sr_no_input);

            // Show success FIRST — no disturbance
            frappe.msgprint({
                title: "Suspension Updated",
                indicator: "orange",
                message: `
                    SIM suspended from <b>${values.suspended_from_date}</b><br>
                    SR No: <b>${values.sr_no_input}</b>
                `
            });

            dialog.hide();

            // ✔ Delay save to avoid overlap with frappe save message
            setTimeout(() => {
                frm.save();
            }, 1500);
        }
    });

    // -------------------------------------------------------
    // BRANDING & UI STYLING
    // -------------------------------------------------------

    dialog.$wrapper.find('.modal-dialog').css({
        "max-width": "480px",
        "border-radius": "14px",
    });

    dialog.$wrapper.find('.modal-header').css({
        "background": "#17ACE4",          // Nexapp Blue
        "color": "white",
        "border-top-left-radius": "14px",
        "border-top-right-radius": "14px",
        "padding": "16px",
    });

    dialog.$wrapper.find('.modal-title').css({
        "font-size": "20px",
        "font-weight": "600",
    });

    dialog.$wrapper.find('.modal-body').css({
        "padding": "22px",
        "background": "#F6F9FC"
    });

    dialog.$wrapper.find('.modal-footer').css({
        "background": "#EFF3F6",
        "border-bottom-left-radius": "14px",
        "border-bottom-right-radius": "14px",
        "padding": "15px",
    });

    dialog.$wrapper.find('.btn-primary').css({
        "background": "#E8991F",          // Nexapp Orange
        "border-color": "#E8991F",
        "color": "white",
        "font-weight": "600",
        "padding": "8px 18px",
        "border-radius": "8px"
    }).hover(
        function () { $(this).css("background", "#cf7e11"); },
        function () { $(this).css("background", "#E8991F"); }
    );

    dialog.$wrapper.find('.control-label').css({
        "color": "#48525B",               // Nexapp Dark Grey
        "font-weight": "600"
    });

    dialog.show();
}
