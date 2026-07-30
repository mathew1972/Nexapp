frappe.require('assets/frappe/css/frappe.css', function () {
    $('<style>').prop('type', 'text/css').html(`
        .frappe-control[data-fieldname="contact"] button.btn {
            background: #71639e !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 8px !important;
            padding: 8px 20px !important;
            font-weight: 700 !important;
            font-size: 13px !important;
            box-shadow: 0 2px 4px rgba(113, 99, 158, 0.2) !important;
            width: auto !important;
            display: inline-block !important;
            margin-left: 0 !important;
            transition: opacity 0.2s;
        }
        .frappe-control[data-fieldname="contact"] button.btn:hover {
            opacity: 0.9 !important;
            background: #71639e !important;
            color: #ffffff !important;
        }
        .poc-customer-highlight input,
        .poc-customer-highlight select,
        .poc-customer-highlight .like-disabled-input,
        .poc-customer-highlight .control-value,
        .poc-customer-highlight .form-control {
            background-color: #fee2e2 !important;
            color: #991b1b !important;
            font-weight: 700 !important;
            border: 1px solid #fca5a5 !important;
            border-left: 3px solid #ef4444 !important;
            border-radius: 6px !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1) !important;
        }
    `).appendTo('head');
});

frappe.ui.form.on('Feasibility', {
    open_map_picker_btn: function (frm) {
        if (typeof show_interactive_map_picker === 'function') {
            show_interactive_map_picker(frm);
        }
    },
    onload: function (frm) {
        // Apply styling immediately on load to prevent visual flicker
        if (typeof render_feasibility_status_bar === 'function') {
            render_feasibility_status_bar(frm);
        }
    },
    refresh: function (frm) {
        if (!frm.__sidebar_collapsed) {
            function collapse_sidebar_by_default() {
                if ($('.layout-side-section').is(':visible')) {
                    let $toggle_btn = $('.sidebar-toggle-btn, .layout-side-section-toggle, [data-toggle="sidebar"]').first();
                    if ($toggle_btn.length > 0) {
                        $toggle_btn.trigger('click');
                    } else {
                        $('.layout-side-section').hide();
                        $('.layout-main-section').removeClass('col-lg-10 col-md-10').addClass('col-lg-12 col-md-12');
                    }
                    frm.__sidebar_collapsed = true;
                }
            }
            collapse_sidebar_by_default();
            setTimeout(collapse_sidebar_by_default, 100);
            setTimeout(collapse_sidebar_by_default, 300);
        }


        // CSS handles mandatory styling directly using Frappe's native [data-reqd="1"] attributes

        // Trigger Odoo UI rendering
        render_feasibility_status_bar(frm);
        frm.events.calculate_lms_type(frm);

        // Highlight POC Customer field after all UI rendering
        highlight_poc_customer(frm);

        if (typeof window.setup_feasibility_pincode === 'function') {
            window.setup_feasibility_pincode(frm);
        }
        if (typeof window.setup_feasibility_map_picker === 'function') {
            window.setup_feasibility_map_picker(frm);
        }

        // Restrict feasibility_status editing to Projects Manager, Projects User, and System Manager
        let can_edit_status = frappe.user.has_role('Projects Manager') || frappe.user.has_role('Projects User') || frappe.user.has_role('System Manager');
        frm.set_df_property('feasibility_status', 'read_only', !can_edit_status);
        if (!frm._prev_feasibility_status) {
            frm._prev_feasibility_status = frm.doc.feasibility_status;
        }

        // Move lms_provider_note directly above lms_provider child table in the DOM and ensure #E3DBE1 background
        let note_df = frappe.meta.get_docfield('Feasibility', 'lms_provider_note');
        let note_html = `<div style="font-size: 12px; color: #475569; margin-top: 12px; padding: 10px 14px; background-color: #E3DBE1; border-left: 3px solid #71639e; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 16px; margin-right: 10px; display: inline-block;">💡</span><span>Submit accurate LMS Feasibility details based on real partner input or field survey. Do not enter dummy data.</span></div>`;
        if (note_df) {
            note_df.options = note_html;
        }
        let note_field = frm.get_field('lms_provider_note');
        let table_field = frm.get_field('lms_provider');

        if (note_field && table_field) {
            let $note = note_field.$wrapper;
            let $table = table_field.$wrapper;
            if ($note.length && $table.length) {
                $note.html(note_html);
                $note.insertBefore($table);
            }
        }

        // Dynamically update child table field descriptions in metadata cache to ensure immediate rendering
        let primary_df = frappe.meta.get_docfield('LMS Feasibility', 'primary');
        if (primary_df) {
            primary_df.description = `<div style="font-size: 11px; color: #475569; margin-top: 6px; padding: 6px 10px; background-color: #E3DBE1; border-left: 3px solid #71639e; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 14px; margin-right: 8px; display: inline-block;">💡</span><span>While doing the Feasibility, please select the Primary Supplier who is most capable of performing this activity.</span></div>`;
        }

        let quote_df = frappe.meta.get_docfield('LMS Feasibility', 'quote_valid_until');
        if (quote_df) {
            quote_df.description = `<div style="font-size: 11px; color: #475569; margin-top: 6px; padding: 6px 10px; background-color: #E3DBE1; border-left: 3px solid #eab308; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 14px; margin-right: 8px; display: inline-block;">⚠️</span><span>Do not enter the quote validity date without supplier confirmation.</span></div>`;
        }

        if (frappe.meta.docfield_map && frappe.meta.docfield_map['LMS Feasibility']) {
            let has_po_meta = frappe.meta.docfield_map['LMS Feasibility'].some(df => df.fieldname === 'last_3_po_html');
            if (!has_po_meta) {
                let m_idx = frappe.meta.docfield_map['LMS Feasibility'].findIndex(df => df.fieldname === 'lms_commercial_section');
                if (m_idx !== -1) {
                    frappe.meta.docfield_map['LMS Feasibility'].splice(m_idx + 1, 0, {
                        fieldname: 'last_3_po_html',
                        fieldtype: 'HTML',
                        label: 'Tips - Latest PO Reference'
                    });
                }
            }
        }

        if (frm.fields_dict.lms_provider && frm.fields_dict.lms_provider.grid && frm.fields_dict.lms_provider.grid.docfields) {
            let has_po_html = frm.fields_dict.lms_provider.grid.docfields.some(df => df.fieldname === 'last_3_po_html');
            if (!has_po_html) {
                let comm_idx = frm.fields_dict.lms_provider.grid.docfields.findIndex(df => df.fieldname === 'lms_commercial_section');
                if (comm_idx !== -1) {
                    frm.fields_dict.lms_provider.grid.docfields.splice(comm_idx + 1, 0, {
                        fieldname: 'last_3_po_html',
                        fieldtype: 'HTML',
                        label: 'Tips - Latest PO Reference'
                    });
                }
            }

            frm.fields_dict.lms_provider.grid.docfields.forEach(df => {
                if (df.fieldname === 'primary') {
                    df.description = `<div style="font-size: 11px; color: #475569; margin-top: 6px; padding: 6px 10px; background-color: #E3DBE1; border-left: 3px solid #71639e; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 14px; margin-right: 8px; display: inline-block;">💡</span><span>While doing the Feasibility, please select the Primary Supplier who is most capable of performing this activity.</span></div>`;
                }
                if (df.fieldname === 'quote_valid_until') {
                    df.description = `<div style="font-size: 11px; color: #475569; margin-top: 6px; padding: 6px 10px; background-color: #E3DBE1; border-left: 3px solid #eab308; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 14px; margin-right: 8px; display: inline-block;">⚠️</span><span>Do not enter the quote validity date without supplier confirmation.</span></div>`;
                }
            });
        }
    },
    calculate_lms_type: function (frm) {
        let p_plan = frm.doc.primary_data_plan;
        let s_plan = frm.doc.secondary_data_plan;
        let lms_type = 'No LMS';
        let sol_name = (frm.doc.solution_name || "").toUpperCase();

        if (sol_name.includes("MBB") && sol_name.includes("LTE")) {
            lms_type = 'Single';
        } else if (sol_name.includes("ILL") && sol_name.includes("LTE")) {
            lms_type = 'Single';
        } else if (frm.doc.solution_type === "SIM") {
            lms_type = 'No LMS';
        } else if (p_plan && s_plan) {
            lms_type = 'Dual';
        } else if (p_plan && !s_plan) {
            lms_type = 'Single';
        } else if (!p_plan && s_plan) {
            lms_type = 'Single';
        } else {
            lms_type = 'No LMS';
        }

        if (frm.doc.lms_type !== lms_type) {
            frm.set_value('lms_type', lms_type);
        }
    },
    primary_data_plan: function (frm) {
        frm.events.calculate_lms_type(frm);
    },
    secondary_data_plan: function (frm) {
        frm.events.calculate_lms_type(frm);
    },
    feasibility_status: function (frm) {
        if (!validate_feasibility_requirements(frm, false)) {
            frm.set_value('feasibility_status', frm._prev_feasibility_status || 'Pending');
            return;
        }
        if (frm.doc.feasibility_status === 'Pending') {
            frm.set_value('hold_days', 0);
            frm.set_value('on_hold_since', null);
            frm.set_value('feasibility_completed_date', null);
            frm.set_value('feasibility_tat', 0.0);
        }
        frm._prev_feasibility_status = frm.doc.feasibility_status;
        render_feasibility_status_bar(frm);
    },
    pincode: function (frm) {
        render_feasibility_status_bar(frm);
    }
});

function show_custom_validation_modal(title, msg, is_validate_event, is_success = false) {
    if (is_validate_event) {
        frappe.validated = false;
    }

    let btn_bg = is_success ? '#16a34a' : '#e03a27';
    let btn_hover = is_success ? '#15803d' : '#c93020';
    let subtitle = is_validate_event ? '<p style="margin: 0 0 24px 0; font-size: 13px; color: #6b7280;">Please update the necessary fields to proceed with saving.</p>' : '<div style="height: 14px;"></div>';

    $('#custom_validation_modal').remove();
    let modal_html = `
        <div id="custom_validation_modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; z-index: 999999; backdrop-filter: blur(2px);">
            <div style="background: #fff; width: 420px; border-radius: 12px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: 'Inter', sans-serif;">
                <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 500; color: #111827;">${title}</h3>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #111827; font-weight: 600;">${msg}</p>
                ${subtitle}
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="custom-modal-btn-ok" style="padding: 8px 20px; border: none; background: ${btn_bg}; color: #fff; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;">Okay</button>
                </div>
            </div>
        </div>
    `;
    $('body').append(modal_html);

    $('#custom_validation_modal .custom-modal-btn-ok').hover(
        function () { $(this).css('background', btn_hover); },
        function () { $(this).css('background', btn_bg); }
    ).on('click', function () {
        $('#custom_validation_modal').remove();
    });
}

function validate_feasibility_requirements(frm, is_validate_event) {
    const status = frm.doc.feasibility_status;
    if (status !== "Feasible" && status !== "High Commercials") {
        return true;
    }

    let lms_type = frm.doc.lms_type;
    if (!lms_type) {
        let p_plan = frm.doc.primary_data_plan;
        let s_plan = frm.doc.secondary_data_plan;
        let sol_name = (frm.doc.solution_name || "").toUpperCase();

        if (sol_name.includes("MBB") && sol_name.includes("LTE")) {
            lms_type = 'Single';
        } else if (sol_name.includes("ILL") && sol_name.includes("LTE")) {
            lms_type = 'Single';
        } else if (frm.doc.solution_type === "SIM") {
            lms_type = 'No LMS';
        } else if (p_plan && s_plan) {
            lms_type = 'Dual';
        } else if (p_plan || s_plan) {
            lms_type = 'Single';
        } else {
            lms_type = 'No LMS';
        }
    }

    if (lms_type === "Single" || lms_type === "Dual") {
        const lms_provider = frm.doc.lms_provider || [];
        const min_records = lms_type === "Dual" ? 2 : 1;

        if (lms_provider.length < min_records) {
            let msg = `For ${lms_type} LMS Type, LMS Feasibility table must have at least ${min_records} record${min_records > 1 ? 's' : ''}.`;
            show_custom_validation_modal("Missing Records", msg, is_validate_event);
            return false;
        }

        const feasible_rows = lms_provider.filter(row => ["Feasible", "High Commercials"].includes(row.lms_status) || ["Feasible", "High Commercials"].includes(row.feasibility_type));
        if (feasible_rows.length < min_records) {
            let msg = min_records === 2
                ? "For Dual LMS Type, LMS Feasibility table must contain at least two suppliers with status 'Feasible' or 'High Commercials'."
                : "LMS Feasibility table must contain at least one supplier with status 'Feasible' or 'High Commercials'.";
            show_custom_validation_modal("Invalid Status", msg, is_validate_event);
            return false;
        }

        const primary_rows = lms_provider.filter(row => row.primary == 1);

        if (primary_rows.length === 0) {
            let msg = "Please select exactly one Primary supplier in the LMS Feasibility table.";
            show_custom_validation_modal("Selection Missing", msg, is_validate_event);
            return false;
        }

        if (primary_rows.length > 1) {
            let msg = "Only one record can be marked as Primary in the LMS Feasibility table.";
            show_custom_validation_modal("Invalid Selection", msg, is_validate_event);
            return false;
        }

        const p_row = primary_rows[0];
        const is_status_valid = ["Feasible", "High Commercials"].includes(p_row.lms_status) || ["Feasible", "High Commercials"].includes(p_row.feasibility_type);

        if (!is_status_valid) {
            let msg = "The Primary supplier in LMS Feasibility table must have status as 'Feasible' or 'High Commercials'.";
            show_custom_validation_modal("Invalid Status", msg, is_validate_event);
            return false;
        }
    } else if (lms_type === "No LMS") {
        const wireless_table = frm.doc.wireless_feasiblity || [];

        if (wireless_table.length === 0) {
            let msg = "For No LMS Type, Wireless Feasibility table must contain at least 1 record.";
            show_custom_validation_modal("Missing Records", msg, is_validate_event);
            return false;
        }

        const has_tech_selected = wireless_table.some(row => row['3g'] == 1 || row['4g'] == 1 || row['5g'] == 1);
        if (!has_tech_selected) {
            let msg = "Wireless Feasibility table must contain at least one operator with 3G, 4G, or 5G selected.";
            show_custom_validation_modal("Selection Missing", msg, is_validate_event);
            return false;
        }
    }

    return true;
}

function load_tat_settings(frm) {
    if (!frm.doc.solution_name && !frm.doc.solution_code) {
        frm.tat_period_days = undefined;
        frm.tat_status_map = undefined;
        render_feasibility_status_bar(frm);
        return;
    }
    frappe.call({
        method: 'nexapp.nexapp.doctype.feasibility.feasibility.get_tat_settings',
        args: {
            solution_name: frm.doc.solution_name || '',
            solution_code: frm.doc.solution_code || ''
        },
        callback: function (r) {
            if (r.message) {
                frm.tat_period_days = r.message.period_days;
                frm.tat_status_map = r.message.status_map;
                render_feasibility_status_bar(frm);
            }
        }
    });
}

function render_feasibility_status_bar(frm) {
    if (window.nexapp && window.nexapp.ui && window.nexapp.ui.render_odoo_ui) {
        window.nexapp.ui.render_odoo_ui(frm);
    }

    if (!frm._saved_feasibility_status || !frm.is_dirty()) {
        frm._saved_feasibility_status = frm.doc.feasibility_status || 'Pending';
    }

    const NON_PROGRESSIVE = ["On Hold", "Not Feasible", "High Commercials"];

    if (NON_PROGRESSIVE.includes(frm.doc.feasibility_status)) {
        if (!frm._last_valid_status) {
            if (frm._saved_feasibility_status && !NON_PROGRESSIVE.includes(frm._saved_feasibility_status)) {
                frm._last_valid_status = frm._saved_feasibility_status;
            } else if (frm.doc.name && !frm._fetching_last_status) {
                frm._fetching_last_status = true;
                frappe.call({
                    method: 'nexapp.api.get_last_status_before_hold_or_cancel',
                    args: {
                        doctype: frm.doctype,
                        docname: frm.doc.name
                    },
                    callback: function (r) {
                        frm._fetching_last_status = false;
                        if (r.message) {
                            frm._last_valid_status = r.message;
                            render_feasibility_status_bar(frm);
                        }
                    }
                });
            }
        }
    } else {
        frm._last_valid_status = frm.doc.feasibility_status;
        frm._saved_feasibility_status = frm.doc.feasibility_status;
    }
    $(frm.wrapper).find('.form-layout').addClass('odoo-form-sheet');

    // Hide old standalone HTML field wrappers to keep form clean
    if (frm.fields_dict.info) frm.fields_dict.info.$wrapper.hide();
    if (frm.fields_dict.info2) frm.fields_dict.info2.$wrapper.hide();
    // if (frm.fields_dict.supplier_pool) frm.fields_dict.supplier_pool.$wrapper.hide();

    // 1.5. Dynamic Colorful Styling for Feasibility Status
    let statusField = frm.get_field('feasibility_status');
    if (statusField && statusField.$wrapper) {
        let statusVal = frm.doc.feasibility_status || 'Pending';
        let colors = {
            'Pending': { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
            'Feasible': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
            'Not Feasible': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
            'High Commercials': { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },
            'On Hold': { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' }
        };
        let c = colors[statusVal] || colors['Pending'];

        // Target both active inputs (select/input/textarea) and read-only views
        let fieldsToStyle = [statusField];
        let reasonNF = frm.get_field('reason_for_not_feasible');
        let reasonHC = frm.get_field('reason_for_high_commercials');
        let reasonOH = frm.get_field('reason_for_on_hold');
        if (reasonNF && statusVal === 'Not Feasible') fieldsToStyle.push(reasonNF);
        if (reasonHC && statusVal === 'High Commercials') fieldsToStyle.push(reasonHC);
        if (reasonOH && statusVal === 'On Hold') fieldsToStyle.push(reasonOH);

        let wrapperElements = [];
        let textElements = [];
        fieldsToStyle.forEach(f => {
            if (f && f.$wrapper) {
                wrapperElements = wrapperElements.concat(f.$wrapper.find('.control-input-wrapper').toArray());
                textElements = textElements.concat(f.$wrapper.find('select, input, textarea, .control-value, .disp-area, .like-disabled-input').toArray());
            }
        });

        // Apply background and borders to the outer wrapper
        wrapperElements.forEach(el => {
            el.style.setProperty('background-color', c.bg, 'important');
            el.style.setProperty('border', '1px solid ' + c.border, 'important');
            el.style.setProperty('border-left', '4px solid ' + c.text, 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        });

        // Apply text colors and font weights to the inner elements
        textElements.forEach(el => {
            el.style.setProperty('color', c.text, 'important');
            el.style.setProperty('font-weight', '800', 'important');
            el.style.setProperty('font-size', '14px', 'important');
            // Ensure no borders override the wrapper
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('border', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        });

        // Option styles for dropdown menu visibility
        if (statusField.$input) {
            statusField.$input.find('option').css({
                'background-color': '#ffffff',
                'color': '#1e293b',
                'font-weight': '600'
            });
        }
    }

    // 2. Build or Update Odoo Header (Status Bar + Smart Buttons)
    let $formLayout = $(frm.wrapper).find('.form-layout');
    if ($formLayout.length === 0) return;

    // Remove existing headers if any to ensure clean re-render on refresh
    $(frm.wrapper).find('#odoo_top_header').remove();
    $(frm.wrapper).find('#odoo_smart_button_box').remove();
    $(frm.wrapper).find('#smart_btn_guidelines').remove();
    let smartButtonHtml = `<div id="odoo_top_header" style="
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f0eef5;
    ">`;

    // Container is transparent so the chevron shadows look realistic
    smartButtonHtml += `<div class="odoo-statusbar" style="display: flex; flex: 1; align-items: center;">`;

    // --- Status Bar (Left Side) ---
    let visibleSteps = ['Pending', 'Feasible', 'High Commercials', 'Not Feasible', 'On Hold', 'Provisioning Completed'];
    let currentStatus = frm.doc.feasibility_status || 'Pending';
    if (!visibleSteps.includes(currentStatus)) {
        visibleSteps.push(currentStatus);
    }
    let currentIndex = visibleSteps.indexOf(currentStatus);
    if (currentIndex === -1) currentIndex = 0;

    const activeColorMap = {
        'Pending': '#f59e0b',
        'Feasible': '#10b981',
        'High Commercials': '#8b5cf6',
        'Not Feasible': '#ef4444',
        'On Hold': '#64748b',
        'Provisioning Completed': '#0d9488'
    };

    // Inject styles
    $('#odoo_chevron_styles').remove();
    $('head').append(`
        <style id="odoo_chevron_styles">
            .stepper-step {
                flex: 1;
                min-width: 0;
            }
            .stepper-icon-wrapper {
                transition: all 0.3s ease;
            }
        </style>
    `);

    // Container is transparent
    smartButtonHtml += `<div class="odoo-statusbar" style="display: flex; flex: 1; align-items: center; overflow: visible; padding: 10px 0;">`;

    let lastValidIndex = currentIndex;
    if (NON_PROGRESSIVE.includes(currentStatus)) {
        let lvs = frm._last_valid_status;
        if (!lvs) lvs = 'Pending';
        lastValidIndex = visibleSteps.indexOf(lvs);
        if (lastValidIndex === -1) lastValidIndex = 0;
    }

    let N = visibleSteps.length;
    let stepPercent = 100 / N;
    let halfStep = stepPercent / 2;
    let bgLeft = halfStep;
    let bgWidth = 100 - stepPercent;
    let activeWidth = lastValidIndex > 0 ? (lastValidIndex / (N - 1)) * bgWidth : 0;

    let stepperHtml = `
        <div class="odoo-stepper-container" style="
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            width: 100%;
            position: relative;
            padding: 8px 0;
            overflow: visible;
        ">
            <!-- Background Line -->
            <div class="stepper-line-bg" style="
                position: absolute;
                top: 24px;
                transform: translateY(-50%);
                left: ${bgLeft}%;
                width: ${bgWidth}%;
                height: 3px;
                background-color: #cbd5e1;
                border-radius: 2.5px;
                z-index: 1;
            "></div>
            <!-- Progress Line -->
            <div class="stepper-line-progress" style="
                position: absolute;
                top: 24px;
                transform: translateY(-50%);
                left: ${bgLeft}%;
                width: ${activeWidth}%;
                height: 3px;
                background-color: ${activeColorMap[currentStatus] || '#10b981'};
                border-radius: 2.5px;
                z-index: 1;
                transition: width 0.4s ease;
            "></div>
    `;

    visibleSteps.forEach((s, idx) => {
        let isPast = false;
        let isActive = false;

        if (NON_PROGRESSIVE.includes(currentStatus)) {
            let lvs = frm._last_valid_status;
            if (!lvs) lvs = 'Pending';
            let lastValidIdx = visibleSteps.indexOf(lvs);
            if (lastValidIdx === -1) lastValidIdx = 0;

            isPast = idx <= lastValidIdx;
            isActive = idx === currentIndex;
        } else {
            isPast = idx < currentIndex;
            isActive = idx === currentIndex;
        }

        let stepColor = activeColorMap[s] || '#10b981';

        let iconBg = '';
        let iconBorder = '';
        let iconGlow = '';
        let iconColor = '';
        let iconContent = '';
        let titleColor = '';
        let subtitleColor = '';
        let subtext = '';

        if (isPast) {
            iconBg = `linear-gradient(135deg, ${stepColor} 0%, ${stepColor}cc 100%)`;
            iconBorder = 'none';
            iconGlow = `0 3px 6px ${stepColor}40`;
            iconColor = '#ffffff';
            iconContent = '<i class="fa fa-check" style="font-size: 11px; color: #ffffff;"></i>';
            titleColor = '#475569';
            subtitleColor = stepColor;
            subtext = 'Completed';
        } else if (isActive) {
            iconBg = `linear-gradient(135deg, ${stepColor} 0%, ${stepColor}dd 100%)`;
            iconBorder = 'none';
            iconGlow = `0 4px 10px ${stepColor}40`;
            iconColor = '#ffffff';
            iconContent = '<i class="fa fa-check" style="font-size: 11px; color: #ffffff;"></i>';
            titleColor = '#0f172a';
            subtitleColor = stepColor;
            subtext = 'Active';
        } else {
            iconBg = '#ffffff';
            iconBorder = '2px solid #cbd5e1';
            iconGlow = 'none';
            iconColor = '#cbd5e1';
            iconContent = '';
            titleColor = '#94a3b8';
            subtitleColor = '#94a3b8';
            subtext = 'Pending';
        }


        stepperHtml += `
            <div class="stepper-step" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                z-index: 2;
                width: ${stepPercent}%;
                text-align: center;
            ">
                <!-- Icon Wrapper -->
                <div class="stepper-icon-wrapper" style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${iconBg};
                    border: ${iconBorder};
                    box-shadow: ${iconGlow};
                    color: ${iconColor};
                ">
                    ${iconContent}
                </div>
                <!-- Step Title -->
                <div class="stepper-step-title" style="
                    font-family: 'Inter', sans-serif;
                    font-size: 10px;
                    font-weight: 700;
                    color: ${titleColor};
                    margin-top: 8px;
                    line-height: 1.25;
                    padding: 0 2px;
                    word-break: break-word;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    height: 25px;
                ">
                    ${s}
                </div>

            </div>
        `;
    });

    stepperHtml += `</div>`;
    smartButtonHtml += stepperHtml;
    smartButtonHtml += `</div>`;


    // TAT Calculation
    let period_days = 0;
    if (frm.tat_period_days !== undefined) period_days = frm.tat_period_days;
    let created = frm.doc.creation || new Date();
    let end = frm.doc.feasibility_completed_date || moment();
    let rawHours = moment(end).diff(moment(created), 'hours', true);
    let hold_hours = (frm.doc.hold_days || 0) * 24.0;
    if (frm.doc.feasibility_status === 'On Hold' && frm.doc.on_hold_since) {
        hold_hours += moment().diff(moment(frm.doc.on_hold_since), 'hours', true);
    }
    let diffHours = Math.max(0, rawHours - hold_hours);
    let target_hours = (period_days || 3) * 24.0;
    let percent = target_hours > 0 ? (diffHours / target_hours) * 100 : 0;
    let isOverdue = diffHours > target_hours;
    let capPercent = Math.min(100, Math.max(0, percent));

    // TAT Performance — 3D Concentric Raised Icon
    let ringRadius = 24;
    let ringCircumference = 2 * Math.PI * ringRadius;
    let ringProgress = ringCircumference * (1 - capPercent / 100);
    let ringTrackColor = '#e2e8f0';

    // Bright, eye-catching gradients matching the 3D reference design
    let ringGradStart = '#00c6ff';
    let ringGradEnd = '#0072ff';
    if (isOverdue) {
        ringGradStart = '#ff416c';
        ringGradEnd = '#ff4b2b';
    } else if (['Feasible', 'High Commercials', 'Not Feasible'].includes(frm.doc.feasibility_status)) {
        ringGradStart = '#10b981';
        ringGradEnd = '#059669';
    } else if (percent >= 75) {
        ringGradStart = '#f8b500';
        ringGradEnd = '#fceabb';
    } else if (frm.doc.feasibility_status === 'On Hold') {
        ringGradStart = '#8e2de2';
        ringGradEnd = '#4a00e0';
    } else {
        ringGradStart = '#00c6ff';
        ringGradEnd = '#0072ff';
    }

    let ringGradId = `tat_ring_grad_${Math.random().toString(36).substr(2, 6)}`;
    let shadowId = `tat_shadow_${Math.random().toString(36).substr(2, 6)}`;

    // Append the 3D icon directly into the status bar container
    smartButtonHtml += `
        <div id="smart_btn_tat" class="odoo-tat-icon" title="Turnaround Time (${period_days} Days Target)" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            margin-left: 14px;
            position: relative;
            flex-shrink: 0;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        " onmouseover="this.style.transform='scale(1.08)';" onmouseout="this.style.transform='scale(1)';">
            <div style="width: 56px; height: 56px; position: relative; display: flex; align-items: center; justify-content: center;">
                <svg width="56" height="56" viewBox="0 0 56 56" style="position: absolute; top: 0; left: 0; transform: rotate(-90deg); filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.1));">
                    <defs>
                        <linearGradient id="${ringGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="${ringGradStart}" />
                            <stop offset="100%" stop-color="${ringGradEnd}" />
                        </linearGradient>
                        <filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.15"/>
                        </filter>
                    </defs>
                    <!-- Outer Track -->
                    <circle cx="28" cy="28" r="${ringRadius}" fill="#ffffff" stroke="${ringTrackColor}" stroke-width="5" />
                    <!-- Progress Ring -->
                    <circle cx="28" cy="28" r="${ringRadius}" fill="none" stroke="url(${window.location.href.split('#')[0]}#${ringGradId})" stroke-width="5"
                        stroke-linecap="round"
                        stroke-dasharray="${ringCircumference}"
                        stroke-dashoffset="${ringProgress}"
                        style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);" />
                    <!-- Inner Raised Button -->
                    <circle cx="28" cy="28" r="19.5" fill="#ffffff" filter="url(${window.location.href.split('#')[0]}#${shadowId})" />
                </svg>
                <div style="
                    position: relative;
                    z-index: 2;
                    font-size: 11px;
                    font-weight: 850;
                    color: #0f172a;
                    font-family: 'Inter', sans-serif;
                    letter-spacing: -0.2px;
                ">
                    ${Math.round(capPercent)}%
                </div>
            </div>
            <div style="
                margin-top: 4px;
                font-size: 13px;
                font-weight: 900;
                color: #1e293b;
                font-family: 'Inter', sans-serif;
                letter-spacing: 0.5px;
            ">TAT</div>
        </div>
    `;



    smartButtonHtml += `</div></div>`;

    // Prepend to form layout
    $formLayout.prepend(smartButtonHtml);

    // Ensure Sidebar is closed by default to save space for the main form
    setTimeout(() => {
        let $sidebar = $('.layout-side-section');
        if ($sidebar.is(':visible') && $sidebar.width() > 0) {
            let toggleBtn = $('.page-actions .sidebar-toggle-btn, .sidebar-toggle-placeholder');
            if (toggleBtn.length) {
                toggleBtn.click();
            } else {
                $sidebar.hide();
                $('.layout-main-section-wrapper').removeClass('col-md-10').addClass('col-md-12');
            }
        }
    }, 100);

    // Setup SPA cleanup to remove injected styles when navigating away from the Feasibility form
    if (!window._feasibility_ui_cleanup_bound) {
        frappe.router.on('change', function () {
            let route = frappe.get_route();
            if (!(route && route[0] === 'Form' && route[1] === 'Feasibility')) {
                $('#odoo_ui_styles').remove();
                $('#odoo_chevron_styles').remove();
            }
        });
        window._feasibility_ui_cleanup_bound = true;
    }

    // Dynamically inject Guidelines Button to Feasibility Information section
    inject_guidelines_button(frm);

    // 3. Attach Click Handlers
    // Click handler disabled to make status stepper display-only
    $('.status-step').off('click');

    $('#smart_btn_supplier_pool').on('click', function (e) {
        e.stopPropagation();
        show_isp_supplier_pool_dialog(frm);
    });

    $('#smart_btn_tat').on('click', function (e) {
        e.stopPropagation();
        show_tat_analysis_dialog(frm);
    });

    // Dynamically inject Supplier Pool Button when LMS section becomes visible
    const can_view_supplier_pool = frappe.user.has_role('Projects Manager') || frappe.user.has_role('Projects User') || frappe.user.has_role('LMS Manager') || frappe.user.has_role('LMS User') || frappe.user.has_role('System Manager') || frappe.user.has_role('Administrator');
    if (can_view_supplier_pool && $('#smart_btn_supplier_pool').length === 0) {
        let lmsSection = frm.get_field('lms_provider_information_section');
        if (lmsSection && lmsSection.wrapper) {
            let $wrapper = $(lmsSection.wrapper);
            // Try standard Frappe heading selectors
            let $head = $wrapper.find('.form-section-heading, .section-head').first();

            // If standard heading isn't found, find the element with the title text
            if ($head.length === 0) {
                $head = $wrapper.find('h4, div').filter(function () {
                    return $(this).text().indexOf('LMS Fea') !== -1;
                }).first();
            }

            // Fallback to wrapper if still not found
            if ($head.length === 0) $head = $wrapper;

            let poolColor = frm.doc.pincode ? '#10b981' : '#ef4444';
            let poolText = frm.doc.pincode ? frm.doc.pincode : 'No Pincode';
            let supplierBtnHtml = `
                    <div style="position: absolute; right: 40px; top: 50%; transform: translateY(-50%); z-index: 10; display: flex; gap: 12px; align-items: center;">
                        <button id="smart_btn_ai_eval" title="AI Evaluation" style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border: 1px solid #5eead4; border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; outline: none; transition: all 0.2s ease;">
                            <i class="fa fa-magic" style="color: #0d9488; font-size: 16px; margin-right: 8px;"></i>
                            <span style="font-weight: 800; font-size: 13px; color: #0f172a;">AI Evaluation</span>
                        </button>
                        <button class="odoo-smart-btn" id="smart_btn_supplier_pool" title="View Supplier Pool" style="display: flex; align-items: center;">
                            <i class="fa fa-users" style="color: ${poolColor}; font-size: 21px; margin-right: 9px;"></i>
                            <div style="text-align: left; line-height: 1.2;">
                                <span style="font-size: 11.5px; color: #64748b; text-transform: uppercase; display: block;">Supplier Pool</span>
                                <span style="font-weight: 700; color: #0f172a;">${poolText}</span>
                            </div>
                        </button>
                    </div>
                `;

            $head.css({ 'position': 'relative', 'display': 'flex', 'align-items': 'center' });
            $head.append(supplierBtnHtml);

            $('#smart_btn_supplier_pool').off('click').on('click', function (e) {
                e.stopPropagation();
                show_isp_supplier_pool_dialog(frm);
            });

            // Bind AI Evaluation Button
            let btnAI = $('#smart_btn_ai_eval');
            btnAI.hover(
                function () { $(this).css({ 'box-shadow': '0 4px 6px rgba(13, 148, 136, 0.15)', 'border-color': '#2dd4bf', 'transform': 'scale(1.02)' }); },
                function () { $(this).css({ 'box-shadow': '0 1px 3px rgba(0,0,0,0.05)', 'border-color': '#5eead4', 'transform': 'none' }); }
            );
            btnAI.off('click').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.open_ai_drawer(frm);
            });
        }
    }

    // Dynamically inject Guidelines Button when Site Information section becomes visible
    inject_guidelines_button(frm);

    // Add "Start typing..." popup to inputs (Odoo style)
    let applyOdooPopup = function () {
        $(frm.wrapper).find('.form-control').each(function () {
            let $el = $(this);
            let fieldtype = $el.closest('.frappe-control').attr('data-fieldtype');
            let allowedTypes = ['Data', 'Int', 'Float', 'Currency', 'Small Text', 'Text', 'Long Text', 'Password', 'Phone', 'Email'];

            if (allowedTypes.includes(fieldtype) && $el.is('input, textarea')) {
                if ($el.attr('placeholder') === 'Start typing...') {
                    $el.removeAttr('placeholder');
                }

                let $wrapper = $el.closest('.control-input');
                if ($wrapper.length && !$wrapper.find('.odoo-start-typing-popup').length) {
                    $wrapper.css('position', 'relative');
                    let $popup = $(`
                        <div class="odoo-start-typing-popup" style="
                            display: none;
                            position: absolute;
                            top: 100%;
                            left: 0;
                            margin-top: 4px;
                            background: #ffffff;
                            border: 1px solid #e2e8f0;
                            border-radius: 4px;
                            padding: 6px 14px;
                            font-size: 13px;
                            font-style: italic;
                            color: #1e293b;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                            z-index: 999;
                            pointer-events: none;
                            white-space: nowrap;
                        ">Start typing...</div>
                    `);
                    $wrapper.append($popup);

                    let checkPopup = function () {
                        if (!$el.val() && $el.is(':focus')) {
                            $popup.fadeIn(150);
                        } else {
                            $popup.fadeOut(100);
                        }
                    };

                    $el.on('focus input blur', function (e) {
                        if (e.type === 'blur') {
                            $popup.fadeOut(100);
                        } else {
                            setTimeout(checkPopup, 100);
                        }
                    });
                }
            }
        });
    };
    applyOdooPopup();
    setTimeout(applyOdooPopup, 500);

    setup_tab_overflow(frm);

    // Highlight ISP Change Feasibility tab red when isp_pending is checked
    setTimeout(() => {
        let $tabs = $(frm.wrapper).find('.form-tabs');
        if (!$tabs.length) $tabs = $('.form-tabs').first();

        let tab_link = $tabs.find('.nav-link').filter(function () {
            return $(this).text().trim() === 'ISP Change Feasibility';
        });

        if (frm.doc.isp_pending === 1) {
            tab_link.addClass('isp-pending-tab');
        } else {
            tab_link.removeClass('isp-pending-tab');
        }
    }, 600);
}

function setup_tab_overflow(frm) {
    let adjustTabs = function () {
        let $tabsContainer = $(frm.wrapper).find('ul#form-tabs');
        if (!$tabsContainer.length) $tabsContainer = $(frm.wrapper).find('.form-tabs').first();
        if (!$tabsContainer.length) $tabsContainer = $('.form-tabs').first();
        if (!$tabsContainer.length) return;

        $tabsContainer.css({ 'flex-wrap': 'wrap' });
        $tabsContainer.find('.nav-link, .nav-item').css({ 'flex-shrink': '0', 'white-space': 'nowrap' });

        $tabsContainer.find('.custom-tab-dropdown').remove();
        $('.body-custom-dropdown-menu').remove();

        let $links = $tabsContainer.find('.nav-link').not('.overflow-btn').filter(function () {
            let $wrap = $(this).closest('.nav-item').length ? $(this).closest('.nav-item') : $(this);
            return $wrap.attr('data-hidden-by-us') !== 'true' && $wrap.css('display') !== 'none' || $wrap.attr('data-hidden-by-us') === 'true';
        });

        let $items = $();
        $links.each(function () {
            let $wrap = $(this).closest('.nav-item').length ? $(this).closest('.nav-item') : $(this);
            $items = $items.add($wrap);
        });

        $items.show().attr('data-hidden-by-us', 'false');
        if ($items.length === 0) return;

        let firstTop = $items.first().position().top;
        let hasOverflow = false;

        $items.each(function () {
            if ($(this).position().top > firstTop + 15) {
                hasOverflow = true;
            }
        });

        if (hasOverflow) {
            let $dropdown = $(`
                <li class="custom-tab-dropdown nav-item" style="list-style: none; position: relative; display: flex; align-items: center; margin-left: auto; flex-shrink: 0;">
                    <button class="nav-link overflow-btn" style="padding: 6px 12px !important; font-weight: bold; background: transparent !important; color: #5b5580 !important; border-radius: 6px !important; border: none; margin-bottom: 0; cursor: pointer;">
                        <i class="fa fa-ellipsis-h"></i>
                    </button>
                </li>
            `);

            $tabsContainer.append($dropdown);

            let maxIterations = $items.length;
            while (maxIterations > 0) {
                let currentFirstTop = $items.filter(':visible').first().position().top;
                let needsHide = false;

                if ($dropdown.position().top > currentFirstTop + 15) {
                    needsHide = true;
                }

                if (!needsHide) {
                    $items.filter(':visible').each(function () {
                        if ($(this).position().top > currentFirstTop + 15) {
                            needsHide = true;
                            return false;
                        }
                    });
                }

                if (!needsHide) {
                    break;
                }

                let $visible = $items.filter(':visible');
                if ($visible.length <= 1) {
                    break;
                }
                $visible.last().hide().attr('data-hidden-by-us', 'true');
                maxIterations--;
            }

            let $menu = $(`
                <div class="body-custom-dropdown-menu" style="display: none; position: absolute; z-index: 999999; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 4px; padding: 4px; min-width: 180px; background: #ffffff;">
                </div>
            `);

            $('body').append($menu);

            let $btn = $dropdown.find('.overflow-btn');

            $btn.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                let offset = $btn.offset();
                $menu.css({
                    top: offset.top + $btn.outerHeight() + 4,
                    left: offset.left - 180 + $btn.outerWidth()
                });
                $('.body-custom-dropdown-menu').not($menu).hide();
                $menu.toggle();
            });

            $(document).off('click.customTabs').on('click.customTabs', function () {
                $('.body-custom-dropdown-menu').hide();
            });

            $menu.on('click', function (e) {
                e.stopPropagation();
            });

            let overflowing = [];
            $items.each(function () {
                if ($(this).attr('data-hidden-by-us') === 'true') {
                    overflowing.push($(this));
                }
            });

            overflowing.forEach($item => {
                let label = $item.text().trim();
                let isActive = $item.hasClass('active') || $item.find('.nav-link').hasClass('active');
                let fw = isActive ? '700' : '600';
                let color = isActive ? '#5b5580' : '#1e293b';
                let bg = isActive ? '#f8fafc' : 'transparent';

                let $dropdownItem = $(`<a class="dropdown-item" href="#" style="display: block; padding: 8px 16px; font-size: 13px; font-weight: ${fw}; border-radius: 4px; cursor: pointer; color: ${color}; background-color: ${bg}; text-decoration: none; margin-bottom: 2px;">${label}</a>`);

                $dropdownItem.hover(
                    function () { $(this).css('background-color', '#f1f5f9'); },
                    function () { $(this).css('background-color', isActive ? '#f8fafc' : 'transparent'); }
                );

                $dropdownItem.on('click', function (e) {
                    e.preventDefault();
                    $menu.hide();

                    let $link = $item.is('.nav-link') ? $item : $item.find('.nav-link');
                    if ($link[0]) $link[0].click();

                    $items.css('order', '0');
                    $item.css('order', '-1');

                    setTimeout(adjustTabs, 50);
                });

                $menu.append($dropdownItem);
            });
        }
    };

    window._feas_cur_adjust_tabs = adjustTabs;

    adjustTabs();
    setTimeout(adjustTabs, 100);
    setTimeout(adjustTabs, 300);
    setTimeout(adjustTabs, 600);
    setTimeout(adjustTabs, 1000);

    if (!window._feas_tab_resize_bound) {
        $(window).on('resize', function () {
            clearTimeout(window._feas_tab_resize_timer);
            window._feas_tab_resize_timer = setTimeout(() => {
                if (typeof window._feas_cur_adjust_tabs === 'function') {
                    window._feas_cur_adjust_tabs();
                }
            }, 200);
        });
        window._feas_tab_resize_bound = true;
    }

    if (window.ResizeObserver && frm.wrapper && !frm._feas_resize_observer_bound) {
        let $el = $(frm.wrapper);
        if ($el.length) {
            let resizeObserver = new ResizeObserver(() => {
                if (typeof window._feas_cur_adjust_tabs === 'function') {
                    window._feas_cur_adjust_tabs();
                }
            });
            resizeObserver.observe($el[0]);
            frm._feas_resize_observer_bound = resizeObserver;
        }
    }

    if (!window._feas_sidebar_tabs_bound) {
        $(document).on('click.feas_sidebar_tabs', '.sidebar-toggle-btn, .layout-side-section-toggle, [data-toggle="sidebar"]', function () {
            setTimeout(() => {
                if (typeof window._feas_cur_adjust_tabs === 'function') {
                    window._feas_cur_adjust_tabs();
                }
            }, 50);
            setTimeout(() => {
                if (typeof window._feas_cur_adjust_tabs === 'function') {
                    window._feas_cur_adjust_tabs();
                }
            }, 150);
            setTimeout(() => {
                if (typeof window._feas_cur_adjust_tabs === 'function') {
                    window._feas_cur_adjust_tabs();
                }
            }, 300);
            setTimeout(() => {
                if (typeof window._feas_cur_adjust_tabs === 'function') {
                    window._feas_cur_adjust_tabs();
                }
            }, 600);
        });
        window._feas_sidebar_tabs_bound = true;
    }
}

function show_tat_analysis_dialog(frm) {
    let created = moment(frm.doc.feasibility_created_date || frm.doc.creation);
    let due = moment(frm.doc.due_date);
    let today = moment();

    let targetPeriod = frm.tat_period_days;
    if (targetPeriod === undefined) {
        if (frm.doc.due_date && frm.doc.feasibility_created_date) {
            let diff = due.diff(created, 'days');
            let hold = frm.doc.hold_days || 0;
            targetPeriod = Math.max(0, diff - hold);
        } else {
            targetPeriod = 3; // Fallback
        }
    }

    let sla_status = frm.doc.sla_status || 'Within TAT';
    let remaining_days = frm.doc.remaining_days || 'N/A';
    let overdue_days = frm.doc.overdue_days || 0;
    let hold_days = frm.doc.hold_days || 0;

    let completedDateFormatted = frm.doc.feasibility_completed_date ? moment(frm.doc.feasibility_completed_date).format('DD-MM-YYYY') : null;
    let createdDateFormatted = created.isValid() ? created.format('DD-MM-YYYY') : 'N/A';
    let dueDateFormatted = due.isValid() ? due.format('DD-MM-YYYY') : 'N/A';

    // Synchronized precise calculation with outer widget
    let baseCreated = frm.doc.creation || new Date();
    let baseEnd = frm.doc.feasibility_completed_date || moment();
    let rawHours = moment(baseEnd).diff(moment(baseCreated), 'hours', true);
    let hold_hours_calc = (frm.doc.hold_days || 0) * 24.0;

    if (frm.doc.feasibility_status === 'On Hold' && frm.doc.on_hold_since) {
        let running_hold = moment().diff(moment(frm.doc.on_hold_since), 'hours', true);
        hold_hours_calc += running_hold;
    }

    let netElapsedHours = Math.max(0, rawHours - hold_hours_calc);
    let targetHours = targetPeriod * 24;
    let percentUsed = targetHours > 0 ? Math.round((netElapsedHours / targetHours) * 100) : 0;

    let badgeBg = '#dcfce7'; // green
    let badgeText = '#15803d';
    let badgeBorder = '#bbf7d0';
    let progressBarColor = '#10b981';
    let statusIcon = 'fa fa-clock-o';

    if (sla_status === 'Within TAT') {
        badgeBg = '#dcfce7';
        badgeText = '#15803d';
        badgeBorder = '#bbf7d0';
        progressBarColor = '#10b981';
        statusIcon = 'fa fa-check-circle-o';
    } else if (sla_status === 'Near Due') {
        badgeBg = '#ffedd5';
        badgeText = '#c2410c';
        badgeBorder = '#fed7aa';
        progressBarColor = '#f97316';
        statusIcon = 'fa fa-hourglass-half';
    } else if (sla_status === 'Overdue') {
        badgeBg = '#fee2e2';
        badgeText = '#b91c1c';
        badgeBorder = '#fecaca';
        progressBarColor = '#ef4444';
        statusIcon = 'fa fa-exclamation-triangle';
    } else if (sla_status === 'Paused') {
        badgeBg = '#dbeafe';
        badgeText = '#1d4ed8';
        badgeBorder = '#bfdbfe';
        progressBarColor = '#3b82f6';
        statusIcon = 'fa fa-pause-circle-o';
    } else if (sla_status === 'Completed') {
        badgeBg = '#f1f5f9';
        badgeText = '#475569';
        badgeBorder = '#e2e8f0';
        progressBarColor = '#64748b';
        statusIcon = 'fa fa-flag-checkered';
    }

    let htmlContent = `
        <div id="custom_tat_dashboard_modal" style="
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        ">
            <div class="custom-tat-modal-content" style="
                background: #f8fafc;
                border-radius: 16px;
                width: 650px;
                max-width: 90vw;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                transform: scale(0.95) translateY(10px);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
                position: relative;
                font-family: 'Outfit', 'Inter', sans-serif;
            ">
                <!-- Close Button -->
                <button id="close_tat_modal" style="
                    position: absolute;
                    top: 14px; right: 14px;
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: #e2e8f0;
                    color: #475569;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.2s, color 0.2s;
                    z-index: 10;
                " onmouseover="this.style.background='#cbd5e1'; this.style.color='#0f172a';" onmouseout="this.style.background='#e2e8f0'; this.style.color='#475569';">
                    <i class="fa fa-times"></i>
                </button>

                <div class="tat-analysis-container" style="padding: 24px; color: #1e293b; display: flex; flex-direction: column; gap: 16px;">
                    <!-- Top Hero Banner Card -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 22px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 14px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="width: 50px; height: 50px; border-radius: 50%; background: ${badgeBg}; display: flex; align-items: center; justify-content: center; border: 1px solid ${badgeBorder};">
                                    <i class="${statusIcon}" style="font-size: 22px; color: ${badgeText};"></i>
                                </div>
                                <div>
                                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">TAT Status</div>
                                    <div style="font-size: 20px; font-weight: 800; color: ${progressBarColor}; margin-top: 2px;">
                                        ${remaining_days}
                                    </div>
                                </div>
                            </div>
                            
                            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                                <span style="
                                    font-size: 12px;
                                    font-weight: 800;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                    background: ${badgeBg};
                                    color: ${badgeText};
                                    border: 1px solid ${badgeBorder};
                                    padding: 4px 12px;
                                    border-radius: 20px;
                                    display: inline-block;
                                ">${sla_status}</span>
                                <div style="font-size: 11px; color: #64748b; font-weight: 500;">
                                    Target TAT: <strong style="color: #0f172a;">${targetPeriod} Days</strong>
                                    <span style="margin: 0 4px; color: #cbd5e1;">|</span>
                                    Days Taken: <strong style="color: #0f172a;">${Math.round(netElapsedHours / 24)} Days</strong>
                                </div>
                            </div>
                        </div>

                        <!-- Graphic Progress Bar Presentation -->
                        <div style="margin-top: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                                <span>Time Used Progress</span>
                                <span>${percentUsed}% of target</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${Math.min(100, percentUsed)}%; height: 100%; background: ${progressBarColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 2x3 Grid of Key Tracking Points -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; flex: 1;">
                        <!-- Card 1: TAT Start Date -->
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <i class="fa fa-calendar-plus-o" style="color: #3b82f6; font-size: 14px;"></i>
                                    <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">TAT Start Date</span>
                                </div>
                                <span style="font-size: 10px; color: #64748b; display: block; margin-top: -4px; margin-bottom: 8px;">When work starts</span>
                            </div>
                            <div style="font-size: 15px; font-weight: 800; color: #0f172a;">${createdDateFormatted}</div>
                        </div>

                        <!-- Card 2: Due Date -->
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <i class="fa fa-calendar-check-o" style="color: #f59e0b; font-size: 14px;"></i>
                                    <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</span>
                                </div>
                                <span style="font-size: 10px; color: #64748b; display: block; margin-top: -4px; margin-bottom: 8px;">Auto calculated Target</span>
                            </div>
                            <div style="font-size: 15px; font-weight: 800; color: #0f172a;">${dueDateFormatted}</div>
                        </div>

                        <!-- Card 3: Completed On -->
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <i class="fa fa-check-square-o" style="color: #10b981; font-size: 14px;"></i>
                                    <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Completed On</span>
                                </div>
                                <span style="font-size: 10px; color: #64748b; display: block; margin-top: -4px; margin-bottom: 8px;">Final completion date</span>
                            </div>
                            <div style="font-size: 15px; font-weight: 800; color: ${completedDateFormatted ? '#10b981' : '#64748b'};">
                                ${completedDateFormatted || '<span style="font-size: 13px; font-weight: 600; color: #94a3b8;">Pending...</span>'}
                            </div>
                        </div>

                        <!-- Card 4: Remaining Days -->
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <i class="fa fa-hourglass-half" style="color: ${progressBarColor}; font-size: 14px;"></i>
                                    <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Remaining Days</span>
                                </div>
                                <span style="font-size: 10px; color: #64748b; display: block; margin-top: -4px; margin-bottom: 8px;">Show time left</span>
                            </div>
                            <div style="font-size: 16px; font-weight: 850; color: ${progressBarColor};">${remaining_days}</div>
                        </div>

                        <!-- Card 5: Solution Type -->
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <i class="fa fa-tag" style="color: #7c3aed; font-size: 14px;"></i>
                                    <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Solution Type</span>
                                </div>
                                <span style="font-size: 10px; color: #64748b; display: block; margin-top: -4px; margin-bottom: 8px;">TAT Category Classification</span>
                            </div>
                            <div style="font-size: 18px; font-weight: 850; color: #7c3aed;">
                                ${frm.doc.solution_type || 'N/A'}
                            </div>
                        </div>

                        <!-- Card 6: Hold Days -->
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <i class="fa fa-pause-circle" style="color: #3b82f6; font-size: 14px;"></i>
                                    <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Hold Days</span>
                                </div>
                                <span style="font-size: 10px; color: #64748b; display: block; margin-top: -4px; margin-bottom: 8px;">Exclude On Hold time</span>
                            </div>
                            <div style="font-size: 18px; font-weight: 850; color: #3b82f6;">
                                ${hold_days} ${hold_days === 1 ? 'Day' : 'Days'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal to prevent duplicates
    $('#custom_tat_dashboard_modal').remove();
    $('body').append(htmlContent);

    let $modal = $('#custom_tat_dashboard_modal');

    // Trigger entrance animation
    setTimeout(() => {
        $modal.css('opacity', '1');
        $modal.find('.custom-tat-modal-content').css('transform', 'scale(1) translateY(0)');
    }, 10);

    // Close logic
    let closeModal = function () {
        $modal.css('opacity', '0');
        $modal.find('.custom-tat-modal-content').css('transform', 'scale(0.95) translateY(10px)');
        setTimeout(() => $modal.remove(), 300);
    };

    $('#close_tat_modal').on('click', closeModal);
    $modal.on('click', function (e) {
        if (e.target.id === 'custom_tat_dashboard_modal') closeModal();
    });
}

function show_isp_supplier_pool_dialog(frm) {
    if (!frm.doc.pincode) {
        show_custom_validation_modal("Missing Info", "Please enter Pincode before fetching Supplier Pool.", false);
        return;
    }

    frappe.call({
        method: "nexapp.nexapp.doctype.feasibility.feasibility.get_supplier_pool_by_pincode",
        args: {
            pincode: frm.doc.pincode,
            circuit_id: frm.doc.circuit_id
        },
        callback: function (response) {
            let isp_data = response.message.isp_pool || [];
            let feas_data = response.message.feas_pool || [];

            // Add unsaved/current providers from the active form
            if (frm.doc.lms_provider && frm.doc.lms_provider.length > 0) {
                frm.doc.lms_provider.forEach(p => {
                    let supp_name = p.lms_supplier || 'N/A';
                    if (supp_name === 'N/A') return;

                    // Skip if already in ISP Pool
                    if (isp_data.some(x => x.supplier_name.toLowerCase() === supp_name.toLowerCase())) return;

                    // Skip if already in Feas Pool (from backend)
                    if (feas_data.some(x => x.supplier_name.toLowerCase() === supp_name.toLowerCase())) return;

                    let c_person = p.supplier_contact ? p.supplier_contact.split('-')[0].trim() : '';

                    feas_data.push({
                        supplier_name: supp_name,
                        contact_person: c_person,
                        phone: p.mobile || 'N/A',
                        email_id: p.email_id || 'N/A',
                        mrc: p.mrc || 0.0,
                        otc: p.otc || 0.0,
                        otc_details: p.otc_details || 'N/A',
                        security_deposit: p.security_deposit || 0.0,
                        origin_site: frm.doc.circuit_id || frm.doc.name || 'N/A',
                        bandwidth_name: p.bandwidth_name || 'MRC',
                        bandwidth: p.bandwidth || '',
                        bandwith_type: p.bandwith_type || 'N/A',
                        updated_date: p.feasibility_updated_date || frm.doc.feasibility_completed_date || '',
                        lms_status: p.lms_status || 'N/A',
                        from_form: true
                    });
                });
            }

            // Sort feas_data by updated_date descending (latest first)
            feas_data.sort((a, b) => {
                let dateA = a.updated_date ? new Date(a.updated_date) : new Date(0);
                let dateB = b.updated_date ? new Date(b.updated_date) : new Date(0);
                return dateB - dateA;
            });

            if (isp_data.length === 0 && feas_data.length === 0) {
                show_custom_validation_modal("Supplier Pool", "No matching Supplier Pool found for Pincode: " + frm.doc.pincode, false);
                return;
            }

            let header_city = (isp_data[0] && isp_data[0].city && isp_data[0].city !== 'N/A') ? isp_data[0].city : (frm.doc.city || 'Unknown City');
            let header_pin_code = (isp_data[0] && isp_data[0].pincode !== 'N/A') ? isp_data[0].pincode : frm.doc.pincode;

            let tableRowsHtml = '';
            isp_data.forEach((row, i) => {
                let bgColor = i % 2 === 0 ? '#ffffff' : '#fcfbfe';
                let badgeBg = row.source === 'ISP Supplier' ? '#e0e7ff' : '#f1f5f9';
                let badgeColor = row.source === 'ISP Supplier' ? '#4f46e5' : '#64748b';
                let poContent = `<span style="font-size: 12px; color: #94a3b8; font-style: italic;">No PO Found</span>`;
                if (row.latest_po) {
                    let items_html = '';
                    if (row.latest_po.items && row.latest_po.items.length > 0) {
                        items_html = row.latest_po.items.map(item => `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                                <span style="font-weight: 700;">${item.item_name}</span>
                                <span style="font-weight: 700; margin-left: 10px;">: ${item.rate_str}</span>
                            </div>
                        `).join('');
                    }

                    let raw_date = row.latest_po.po_date;
                    let display_date = raw_date ? frappe.datetime.str_to_user(raw_date) : "N/A";
                    let date_display = `<span style="font-size: 10px; color: #0f172a; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center;"><i class="fa fa-calendar" style="margin-right: 4px; color: #0284c7;"></i>${display_date}</span>`;

                    poContent = `
                        <div style="font-size: 11px; color: #334155;">
                            <div style="margin-bottom: 6px;">
                                <span style="font-weight: 800; color: #0f172a;">${row.latest_po.po_name}</span>
                            </div>
                            ${(row.bandwith_type && row.bandwith_type !== 'N/A') || date_display ? `
                            <div style="display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
                                ${row.bandwith_type && row.bandwith_type !== 'N/A' ? `<span style="font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-flex; align-items: center;">${row.bandwith_type}</span>` : ''}
                                ${date_display}
                            </div>` : ''}
                            ${items_html}
                        </div>
                    `;
                }
                let originCircuitHtml = row.origin_site && row.origin_site !== 'N/A'
                    ? `<span style="font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 12px; color: #475569; font-weight: 600; display: inline-block;" title="Origin Circuit ID"><i class="fa fa-link" style="margin-right: 4px; color: #94a3b8;"></i>Circuit: ${row.origin_site}</span>`
                    : '';

                let contactHtml = row.contact_person
                    ? `<span style="font-size: 11px; color: #64748b; font-weight: 500;"><i class="fa fa-user" style="margin-right:4px;"></i>${row.contact_person}</span>`
                    : '';

                let subTitleHtml = (contactHtml || originCircuitHtml)
                    ? `<div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">${contactHtml}${originCircuitHtml}</div>`
                    : '';

                let exists = (frm.doc.lms_provider || []).some(x => (x.lms_supplier || '').toLowerCase() === row.supplier_name.toLowerCase());
                let btnHtml = exists
                    ? `<span style="color: #16a34a; font-weight: 700; font-size: 12px;"><i class="fa fa-check"></i> Added</span>`
                    : `<button class="btn btn-xs select-supplier-btn" data-type="isp" data-idx="${i}" style="background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;"><i class="fa fa-plus"></i> Select</button>`;

                tableRowsHtml += `
                    <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0; transition: all 0.2s ease;">
                        <td style="padding: 16px 18px; font-weight: 600; color: #0f172a; vertical-align: top;">
                            ${row.supplier_name}
                            ${subTitleHtml}
                        </td>
                        <td style="padding: 16px 18px; color: #475569; font-weight: 500; vertical-align: top;">${row.phone}</td>
                        <td style="padding: 16px 18px; color: #475569; vertical-align: top;">${row.email_id}</td>
                        <td style="padding: 16px 18px; vertical-align: top;">${poContent}</td>
                        <td style="padding: 16px 18px; vertical-align: middle; text-align: center;">${btnHtml}</td>
                    </tr>
                `;
            });

            let feasTableRowsHtml = '';
            feas_data.forEach((row, i) => {
                let bgColor = i % 2 === 0 ? '#ffffff' : '#fcfbfe';
                let contactHtml = row.contact_person
                    ? `<span style="font-size: 11px; color: #64748b; font-weight: 500;"><i class="fa fa-user" style="margin-right:4px;"></i>${row.contact_person}</span>`
                    : '';
                let originCircuitHtml = row.origin_site && row.origin_site !== 'N/A'
                    ? `<span style="font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 12px; color: #475569; font-weight: 600; display: inline-block;" title="Origin Circuit ID"><i class="fa fa-link" style="margin-right: 4px; color: #94a3b8;"></i>Circuit: ${row.origin_site}</span>`
                    : '';
                let subTitleHtml = (contactHtml || originCircuitHtml)
                    ? `<div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">${contactHtml}${originCircuitHtml}</div>`
                    : '';

                let formatCurr = (val) => val ? `₹ ${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ 0.00';

                let dateBadgeHtml = '';
                if (row.updated_date && (row.lms_status === 'Feasible' || row.lms_status === 'High Commercials')) {
                    let disp_date = frappe.datetime.str_to_user(row.updated_date.split(' ')[0]);
                    dateBadgeHtml = `<span style="font-size: 10px; color: #0f172a; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center;"><i class="fa fa-calendar" style="margin-right: 4px; color: #0284c7;"></i>${disp_date}</span>`;
                }

                let costingHtml = `
                    <div style="font-size: 11px; color: #334155;">
                        ${(row.bandwith_type && row.bandwith_type !== 'N/A') || dateBadgeHtml ? `
                        <div style="display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
                            ${row.bandwith_type && row.bandwith_type !== 'N/A' ? `<span style="font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-flex; align-items: center;">${row.bandwith_type}</span>` : ''}
                            ${dateBadgeHtml}
                        </div>` : ''}
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-weight: 700;">${row.bandwidth_name || 'MRC'}</span>
                            <span style="font-weight: 700; margin-left: 10px;">: ${formatCurr(row.mrc)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-weight: 700;">${row.otc_details && row.otc_details !== 'N/A' ? row.otc_details : 'OTC'}</span>
                            <span style="font-weight: 700; margin-left: 10px;">: ${formatCurr(row.otc)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-weight: 700;">Static IP</span>
                            <span style="font-weight: 700; margin-left: 10px;">: ${formatCurr(row.static_ip_cost)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-weight: 700;">Security Deposit</span>
                            <span style="font-weight: 700; margin-left: 10px;">: ${formatCurr(row.security_deposit)}</span>
                        </div>
                    </div>
                `;

                let exists = (frm.doc.lms_provider || []).some(x => (x.lms_supplier || '').toLowerCase() === row.supplier_name.toLowerCase());
                let btnHtml = exists || row.from_form
                    ? `<span style="color: #16a34a; font-weight: 700; font-size: 12px;"><i class="fa fa-check"></i> Added</span>`
                    : `<button class="btn btn-xs select-supplier-btn" data-type="feas" data-idx="${i}" style="background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;"><i class="fa fa-plus"></i> Select</button>`;

                feasTableRowsHtml += `
                    <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0; transition: all 0.2s ease;">
                        <td style="padding: 16px 18px; font-weight: 600; color: #0f172a; vertical-align: top;">
                            ${row.supplier_name}
                            ${subTitleHtml}
                        </td>
                        <td style="padding: 16px 18px; color: #475569; font-weight: 500; vertical-align: top;">${row.phone}</td>
                        <td style="padding: 16px 18px; color: #475569; vertical-align: top;">${row.email_id}</td>
                        <td style="padding: 16px 18px; vertical-align: top;">${costingHtml}</td>
                        <td style="padding: 16px 18px; vertical-align: middle; text-align: center;">${btnHtml}</td>
                    </tr>
                `;
            });

            let htmlContent = `
        <div id="custom_isp_supplier_pool_modal" style="
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            z-index: 99999;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 10vh;
            opacity: 0;
            transition: opacity 0.3s ease;
        ">
            <div class="custom-supplier-modal-content" style="
                background: #ffffff;
                border-radius: 16px;
                width: 1140px;
                max-width: 90vw;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                transform: scale(0.95) translateY(10px);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                position: relative;
                font-family: 'Outfit', 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
            ">
                <!-- Header -->
                <div style="
                    padding: 24px 64px 24px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-top-left-radius: 16px;
                    border-top-right-radius: 16px;
                ">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="
                            width: 44px;
                            height: 44px;
                            border-radius: 10px;
                            background: rgba(34, 197, 94, 0.1);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fa fa-users" style="color: #22c55e; font-size: 22px;"></i>
                        </div>
                        <div>
                            <h3 style="font-weight: 800; margin: 0; color: #0f172a; font-size: 17px;">ISP Supplier Pool Details</h3>
                            <span style="font-size: 13px; color: #64748b; font-weight: 500; display: block; margin-top: 2px;">
                                Showing linked ISP Suppliers for <span style="color: #22c55e; font-weight: 800;">${header_city}</span> (PIN Code: <strong>${header_pin_code}</strong>)
                            </span>
                        </div>
                    </div>
                    <span style="background-color: #22c55e; color: #ffffff; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);">
                        ${isp_data.length + feas_data.length} Supplier(s) Found
                    </span>
                </div>

                <!-- Close Button -->
                <button id="close_supplier_modal_top" style="
                    position: absolute;
                    top: 20px; right: 20px;
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: #e2e8f0;
                    color: #475569;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.2s, color 0.2s;
                    z-index: 10;
                " onmouseover="this.style.background='#cbd5e1'; this.style.color='#0f172a';" onmouseout="this.style.background='#e2e8f0'; this.style.color='#475569';">
                    <i class="fa fa-times"></i>
                </button>

                <!-- Body (Scrollable) -->
                <div style="
                    padding: 24px;
                    overflow-y: auto;
                    max-height: 55vh;
                    background: #ffffff;
                ">
                    ${isp_data.length > 0 ? `
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 12px;
                        padding-left: 4px;
                    ">
                        <i class="fa fa-check-circle" style="color: #64748b; font-size: 16px;"></i>
                        <h3 style="font-weight: 800; margin: 0; color: #334155; font-size: 15px;">PO Issued Supplier</h3>
                        <span style="background-color: #64748b; color: #ffffff; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; margin-left: auto;">
                            ${isp_data.length} Supplier(s)
                        </span>
                    </div>
                    <div style="overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                            <thead>
                                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 35%;">Supplier Name</th>
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 20%;">Phone</th>
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 20%;">Email Address</th>
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 25%;">Costing</th>
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 10%;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                    ` : `<div style="text-align: center; color: #64748b; padding: 20px; font-weight: 500; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 24px;">No ISP Suppliers found.</div>`}

                    ${feas_data.length > 0 ? `
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 12px;
                        padding-left: 4px;
                    ">
                        <i class="fa fa-history" style="color: #64748b; font-size: 16px;"></i>
                        <h3 style="font-weight: 800; margin: 0; color: #334155; font-size: 15px;">Feasibility Supplier</h3>
                        <span style="background-color: #64748b; color: #ffffff; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; margin-left: auto;">
                            ${feas_data.length} Supplier(s)
                        </span>
                    </div>
                    <div style="overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 8px; border: 1px solid #e2e8f0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                            <thead>
                                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 35%;">Supplier Name</th>
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 20%;">Phone</th>
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 20%;">Email Address</th>
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 25%;">Costing</th>
                                    <th style="padding: 14px 18px; font-weight: 700; color: #334155; width: 10%;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${feasTableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div style="
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                    border-bottom-left-radius: 16px;
                    border-bottom-right-radius: 16px;
                ">
                    <button id="close_supplier_modal_btn" style="
                        background: #71639e;
                        color: #ffffff;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 8px;
                        font-weight: 700;
                        font-size: 13px;
                        cursor: pointer;
                        box-shadow: 0 2px 4px rgba(113, 99, 158, 0.2);
                        transition: opacity 0.2s;
                    " onmouseover="this.style.opacity='0.9';" onmouseout="this.style.opacity='1';">Close</button>
                </div>
            </div>
        </div>
            `;

            // Remove any existing modal
            $('#custom_isp_supplier_pool_modal').remove();
            $('body').append(htmlContent);

            let $modal = $('#custom_isp_supplier_pool_modal');

            // Trigger entrance animation
            setTimeout(() => {
                $modal.css('opacity', '1');
                $modal.find('.custom-supplier-modal-content').css('transform', 'scale(1) translateY(0)');
            }, 10);

            // Close logic
            let closeModal = function () {
                $modal.css('opacity', '0');
                $modal.find('.custom-supplier-modal-content').css('transform', 'scale(0.95) translateY(10px)');
                setTimeout(() => $modal.remove(), 300);
            };

            $('#close_supplier_modal_top, #close_supplier_modal_btn').on('click', closeModal);
            $modal.on('click', function (e) {
                if (e.target.id === 'custom_isp_supplier_pool_modal') closeModal();
            });

            // Handle Select Supplier Button
            $modal.on('click', '.select-supplier-btn', function () {
                let btn = $(this);
                let type = btn.attr('data-type');
                let idx = parseInt(btn.attr('data-idx'));
                let source_row = type === 'isp' ? isp_data[idx] : feas_data[idx];

                let exists = (frm.doc.lms_provider || []).some(x => (x.lms_supplier || '').toLowerCase() === source_row.supplier_name.toLowerCase());

                if (exists) {
                    show_custom_validation_modal("Supplier Pool", "Supplier already added to the form!", false);
                    return;
                }

                let new_row = frappe.model.add_child(frm.doc, "LMS Feasibility", "lms_provider");
                new_row.lms_supplier = source_row.supplier_name;
                // Assuming supplier_contact is a data field or can be left blank. We map what we can.
                new_row.supplier_contact = source_row.contact_person !== 'N/A' ? source_row.contact_person : '';
                new_row.mobile = source_row.phone !== 'N/A' ? source_row.phone : '';
                new_row.email_id = source_row.email_id !== 'N/A' ? source_row.email_id : '';
                new_row.bandwith_type = source_row.bandwith_type !== 'N/A' ? source_row.bandwith_type : '';

                if (type === 'feas') {
                    new_row.mrc = source_row.mrc || 0;
                    new_row.otc = source_row.otc || 0;
                    new_row.otc_details = source_row.otc_details !== 'N/A' ? source_row.otc_details : '';
                    new_row.static_ip_cost = source_row.static_ip_cost || 0;
                    new_row.security_deposit = source_row.security_deposit || 0;
                    new_row.bandwidth_name = source_row.bandwidth_name !== 'MRC' ? source_row.bandwidth_name : '';
                    if (source_row.bandwidth) {
                        new_row.bandwidth = source_row.bandwidth;
                    }
                } else if (type === 'isp' && source_row.latest_po && source_row.latest_po.items) {
                    let mrc = 0, otc = 0, static_ip = 0, bname = '', bcode = '';
                    source_row.latest_po.items.forEach(item => {
                        let iname = (item.item_name || '').toLowerCase();
                        if (iname.includes('installation') || iname.includes('otc') || iname.includes('one time')) {
                            otc += (item.rate || 0);
                            new_row.otc_details = item.item_name;
                        } else if (iname.includes('static ip') || iname.includes('public ip')) {
                            static_ip += (item.rate || 0);
                        } else {
                            mrc += (item.rate || 0);
                            if (!bname) bname = item.item_name;
                            if (!bcode) bcode = item.item_code;
                        }
                    });
                    new_row.mrc = mrc;
                    new_row.otc = otc;
                    new_row.static_ip_cost = static_ip;
                    new_row.bandwidth_name = bname;
                    if (bcode) new_row.bandwidth = bcode;
                }

                if (source_row.billing_mode) new_row.billing_mode = source_row.billing_mode;
                if (source_row.media) new_row.media = source_row.media;
                if (source_row.billing_terms) new_row.billing_terms = source_row.billing_terms;

                if (new_row.static_ip_cost !== 0) {
                    new_row.static_ip = 'Available';
                }

                // Trigger existing ARC and Validity calculations based on new values
                if (typeof calculate_arc_and_validity === 'function') {
                    calculate_arc_and_validity(frm, new_row.doctype, new_row.name);
                }

                frm.refresh_field("lms_provider");

                btn.html('<i class="fa fa-check"></i> Added');
                btn.css({ 'background': 'transparent', 'color': '#16a34a', 'padding': '0', 'cursor': 'default' });
                btn.prop('disabled', true);

                show_custom_validation_modal("Supplier Pool", "Added <b>" + source_row.supplier_name + "</b> to LMS Provider list.", false, true);
            });
        }
    });
}


//before_save: function (frm) {
//  const statuses = ['Feasible', 'Partial Feasible', 'Not Feasible', 'High Commercials'];
// if (statuses.includes(frm.doc.feasibility_status)) {
// Update the feasibility_completed_date to the current date and time
//    frm.set_value('feasibility_completed_date', frappe.datetime.now_datetime());
//} else if (frm.doc.feasibility_status === 'Pending') {
//  frappe.throw(__('The document cannot be submitted as the status is "Pending".'));
//}
//},

//customer_request: function (frm) {
//  if (frm.doc.customer_request) {
//      const today = frappe.datetime.now_date(); // Get today's date
//      if (frm.doc.customer_request > today) {
//          frappe.msgprint(__('The Customer Request date cannot be greater than today.'));
//          frm.set_value('customer_request', null); // Clear the field
//     }
//  }
//}

///////POC Customer ////////////////////////////////////////////////////////////////

function check_and_show_poc_modal(frm) {
    if (frm.doc.customer_type === "POC Customer" && frm.doc.feasibility_status === "Feasible" && frm.doc.docstatus !== 2) {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Site",
                filters: { circuit_id: frm.doc.name },
                limit_page_length: 1
            },
            callback: function (r) {
                const site_exists = r.message && r.message.length > 0;

                // Remove any old buttons if they exist
                let $actions = $(frm.page.wrapper).find('.page-actions');
                if ($actions.length > 0) {
                    $actions.find('.custom-poc-btn').remove();
                }

                if (!site_exists) {
                    let modalId = 'custom-poc-confirm-modal';
                    if ($('#' + modalId).length > 0) return;

                    let modalHtml = `
                        <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);">
                            <div style="background: white; border-radius: 16px; width: 380px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: inherit;">
                                <div style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">Create Site?</div>
                                <div style="font-size: 14px; color: #4b5563; margin-bottom: 24px; line-height: 1.5;">
                                    This will create a Site from this Feasibility. Are you sure you want to proceed?
                                </div>
                                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                                    <button id="cancel_poc_btn" style="padding: 8px 18px; border: 1px solid #e5e7eb; background: white; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151; transition: all 0.2s;">Cancel</button>
                                    <button id="confirm_poc_btn" style="padding: 8px 18px; border: none; background: #e11d48; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 500; color: white; transition: all 0.2s;">Create</button>
                                </div>
                            </div>
                        </div>
                    `;

                    $('body').append(modalHtml);

                    $('#cancel_poc_btn').hover(function () { $(this).css('background', '#f9fafb'); }, function () { $(this).css('background', 'white'); });
                    $('#confirm_poc_btn').hover(function () { $(this).css('background', '#be123c'); }, function () { $(this).css('background', '#e11d48'); });

                    $('#cancel_poc_btn').click(function () {
                        $('#' + modalId).remove();
                    });

                    $('#confirm_poc_btn').click(function () {
                        $('#' + modalId).remove();
                        // Save the form first to ensure backend has latest feasibility_status
                        frm.save().then(() => {
                            frappe.call({
                                method: "nexapp.api.create_site_from_feasibility",
                                args: { doc: frm.doc.name },
                                callback: function (res) {
                                    if (!res.exc) {
                                        show_custom_validation_modal("Success", `Site created successfully: ${res.message}`, false, true);
                                    }
                                }
                            });
                        });
                    });
                }
            }
        });
    }
}

function highlight_poc_customer(frm) {
    setTimeout(function () {
        let $wrapper = $(frm.fields_dict.customer_type && frm.fields_dict.customer_type.wrapper);
        if (!$wrapper || !$wrapper.length) return;

        if (frm.doc.customer_type === 'POC Customer') {
            // Target only the select element (not the hidden read-only div)
            let $el = $wrapper.find('select');
            if (!$el.length) {
                // Fallback for read-only mode
                $el = $wrapper.find('.like-disabled-input, .control-value').first();
            }
            if ($el.length) {
                $el[0].style.cssText += ';background-color: #fee2e2 !important; color: #991b1b !important; font-weight: 700 !important; border: 1px solid #fca5a5 !important; border-left: 3px solid #ef4444 !important; border-radius: 6px !important; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1) !important;';
            }
        }
    }, 600);
}

frappe.ui.form.on('Feasibility', {
    refresh: function (frm) {
        check_and_show_poc_modal(frm);
        highlight_poc_customer(frm);
    },
    feasibility_status: function (frm) {
        check_and_show_poc_modal(frm);
    },
    customer_type: function (frm) {
        check_and_show_poc_modal(frm);
        highlight_poc_customer(frm);
    }
});
/////////////////////////////////////////////////////////////////////////////
// Feasibility calculation

frappe.ui.form.on('LMS Feasibility', {
    mrc: function (frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    },
    billing_mode: function (frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    },
    otc: function (frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    },
    security_deposit: function (frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    },
    static_ip_cost: function (frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    }
});

function calculate_arc_and_validity(frm, cdt, cdn) {
    var child = locals[cdt][cdn];

    // Safely convert all financial fields to float
    var mrc = flt(child.mrc || 0);
    var otc = flt(child.otc || 0);
    var security_deposit = flt(child.security_deposit || 0);
    var static_ip_cost = flt(child.static_ip_cost || 0);

    // Calculate ARC
    var arc = (mrc * 12) + otc + security_deposit + static_ip_cost;
    frappe.model.set_value(cdt, cdn, 'arc', arc);

    // Set validity based on billing_mode
    let validity_map = {
        "MRC": 30,
        "QRC": 90,
        "HRC": 180,
        "ARC": 365
    };

    if (child.billing_mode && validity_map[child.billing_mode]) {
        frappe.model.set_value(cdt, cdn, 'validity', validity_map[child.billing_mode]);
    }
}

//////////////////////////////////////////////////////////////////////////////
/*frappe.ui.form.on('Feasibility', {
    primary_contact_mobile: function(frm) {
        if (!frm.doc.primary_contact_mobile) return;

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Feasibility",
                filters: {
                    primary_contact_mobile: frm.doc.primary_contact_mobile,
                    name: ["!=", frm.doc.name] // exclude current doc
                },
                limit_page_length: 1
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    show_custom_validation_modal("Duplicate Mobile Number", "This mobile number is already in use; each Site requires a unique number.", false);
                    frm.set_value("primary_contact_mobile", "");
                }
            }
        });
    }
});*/

/////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Feasibility', {
    refresh: function (frm) {
        // Inject red info icon into 'info' HTML field
        frm.fields_dict.info.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_feasibility_info_icon" title="Feasibility Guidelines" style="cursor: pointer; font-size: 29px; color: #FF0000;">
                    <i class="fa fa-info-circle"></i>
                </a>
            </div>
        `);

        // Attach click event to show dialog
        frm.fields_dict.info.$wrapper.find('#show_feasibility_info_icon').on('click', function () {
            show_feasibility_guidelines();
        });
    }
});

function inject_guidelines_button(frm) {
    // Target the main tab bar container
    let $tabContainer = $(frm.wrapper).find('.form-tabs, .nav-tabs').first();

    if ($tabContainer.length > 0) {
        // Prevent duplicates by cleaning up previous injections
        $tabContainer.find('#smart_btn_ai_eval').closest('li').remove();
        $tabContainer.find('#smart_btn_guidelines').closest('li').remove();

        let guidelinesBtnHtml = `
            <li style="margin-left: auto; list-style: none; display: flex; align-items: center; padding-right: 4px; gap: 8px;">
                <button id="smart_btn_guidelines" title="Feasibility Guidelines" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; outline: none; transition: all 0.2s ease;">
                    <i class="fa fa-book" style="color: #3b82f6; font-size: 16px; margin-right: 8px;"></i>
                    <div style="text-align: left; line-height: 1.1;">
                        <span style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; font-weight: 600;">Guidelines</span>
                        <span style="font-weight: 800; font-size: 12.5px; color: #0f172a; display: block; margin-top: 1px;">Feasibility</span>
                    </div>
                </button>
            </li>
        `;
        $tabContainer.append(guidelinesBtnHtml);

        // Bind Guidelines Button
        let btnGuide = $('#smart_btn_guidelines');
        btnGuide.hover(
            function () { $(this).css({ 'box-shadow': '0 4px 6px rgba(0,0,0,0.08)', 'border-color': '#94a3b8' }); },
            function () { $(this).css({ 'box-shadow': '0 1px 3px rgba(0,0,0,0.05)', 'border-color': '#cbd5e1' }); }
        );
        btnGuide.off('click').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof show_feasibility_guidelines === 'function') {
                show_feasibility_guidelines();
            }
        });
    }
}

function render_ai_drawer_content(frm, data) {
    if (!data) {
        let emptyHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center;">
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; max-width: 400px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <i class="fa fa-bolt" style="font-size: 40px; color: #cbd5e1; margin-bottom: 20px;"></i>
                    <h4 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 12px 0;">No Recommendation Found</h4>
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">Click below to run AI Supplier Matching for this feasibility request.</p>
                    <button class="btn btn-primary" onclick="run_ai_evaluation(cur_frm)" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; font-weight: 600; padding: 8px 24px;">Run Evaluation</button>
                </div>
            </div>
        `;
        $('#ai-drawer-content').html(emptyHtml);
        return;
    }

    let reasonsHtml = '';
    if (data.reason && data.reason.length > 0) {
        reasonsHtml = `<ul style="margin-top: 10px; padding-left: 20px; color: #334155; margin-bottom: 0;">${data.reason.map(r => `<li style="margin-bottom: 6px;">${r}</li>`).join('')}</ul>`;
    }

    let poDetailsHtml = '';
    if (data.po_details && data.po_details.length > 0) {
        poDetailsHtml = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
                <thead>
                    <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                        <th style="padding: 8px; text-align: left; color: #475569; font-weight: 600;">PO Number</th>
                        <th style="padding: 8px; text-align: left; color: #475569; font-weight: 600;">Supplier</th>
                        <th style="padding: 8px; text-align: left; color: #475569; font-weight: 600;">Date</th>
                        <th style="padding: 8px; text-align: right; color: #475569; font-weight: 600;">Item Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.po_details.map(po => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px; color: #0f172a; font-weight: 500;">${po.po_number || '-'}</td>
                            <td style="padding: 8px; color: #334155;">${po.supplier || '-'}</td>
                            <td style="padding: 8px; color: #64748b;">${po.date || '-'}</td>
                            <td style="padding: 8px; text-align: right; color: #0f172a; font-weight: 600;">${po.item_rate || po.amount || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        poDetailsHtml = `<p style="font-size: 13px; color: #94a3b8; font-style: italic; margin-top: 8px;">No relevant POs found.</p>`;
    }

    let comparisonHtml = '';
    if (data.supplier_comparison && data.supplier_comparison.length > 0) {
        comparisonHtml = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                        <th style="padding: 8px; text-align: left; color: #475569; font-weight: 600;">Supplier</th>
                        <th style="padding: 8px; text-align: left; color: #475569; font-weight: 600;">Item Name</th>
                        <th style="padding: 8px; text-align: right; color: #475569; font-weight: 600;">Rate</th>
                        <th style="padding: 8px; text-align: center; color: #475569; font-weight: 600;">Global Sites</th>
                        <th style="padding: 8px; text-align: center; color: #475569; font-weight: 600;">Grade</th>
                        <th style="padding: 8px; text-align: left; color: #475569; font-weight: 600;">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.supplier_comparison.map(s => {
            let gradeColor = (s.grade || '').startsWith('A') ? '#10b981' : ((s.grade || '').startsWith('B') ? '#f59e0b' : '#ef4444');
            return `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px; color: #0f172a; font-weight: 600;">${s.supplier || '-'}</td>
                            <td style="padding: 8px; color: #475569; min-width: 100px;">${s.item_name || '-'}</td>
                            <td style="padding: 8px; text-align: right; color: #0f172a; font-weight: 600; white-space: nowrap;">${s.rate || '-'}</td>
                            <td style="padding: 8px; text-align: center; color: #3b82f6; font-weight: 600;">${s.active_sites || '0'}</td>
                            <td style="padding: 8px; text-align: center; white-space: nowrap;">
                                <span style="background: ${gradeColor}20; color: ${gradeColor}; padding: 2px 8px; border-radius: 12px; font-weight: bold; display: inline-block;">${s.grade || '-'}</span>
                            </td>
                            <td style="padding: 8px; color: #64748b; font-size: 12px;">${s.notes || '-'}</td>
                        </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    } else {
        comparisonHtml = `<span style="font-size: 13px; color: #94a3b8; font-style: italic;">No other active suppliers found in this Pincode.</span>`;
    }

    let evaluationStepsHtml = '';
    if (data.evaluation_steps && data.evaluation_steps.length > 0) {
        evaluationStepsHtml = data.evaluation_steps.map((step, idx) => `
            <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">${idx + 1}</div>
                <div style="color: #334155; font-size: 13.5px; line-height: 1.5; padding-top: 2px;">${step}</div>
            </div>
        `).join('');
    }

    let conf = data.confidence_score || data.confidence || 0;
    let color = conf >= 80 ? '#10b981' : (conf >= 50 ? '#f59e0b' : '#ef4444');

    let html = `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 850px; margin: 0 auto; padding-bottom: 40px;">
            
            <!-- Location Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 12px 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fa fa-map-marker" style="font-size: 20px; color: #6366f1;"></i>
                    <div>
                        <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Location Base</div>
                        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${data.city || 'Unknown City'} <span style="color: #64748b; font-weight: 500;">(${data.pincode || 'No Pincode'})</span></div>
                    </div>
                </div>
            </div>

            <!-- Dashboard Main Header -->
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <h5 style="margin: 0 0 16px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Recommended Supplier</h5>
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div style="font-size: 38px; font-weight: 800; color: ${color}; line-height: 1;">${conf}%</div>
                    <div style="font-size: 22px; font-weight: 700; color: #475569;">${data.recommended_supplier || data.suggested_primary_supplier || 'None Found'}</div>
                </div>
                
                <div style="width: 100%; background: #f1f5f9; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
                    <div style="height: 100%; width: ${conf}%; background: ${color}; border-radius: 6px;"></div>
                </div>
            </div>

            <!-- Evaluation Steps -->
            ${evaluationStepsHtml ? `
            <div style="margin-bottom: 24px; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h5 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #1e293b;"><i class="fa fa-cogs" style="margin-right: 6px; color: #64748b;"></i> How AI Arrived at This Decision</h5>
                ${evaluationStepsHtml}
            </div>` : ''}

            <!-- Analysis Box -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; margin-bottom: 24px;">
                <h5 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #1e3a8a;"><i class="fa fa-info-circle" style="margin-right: 6px;"></i> Detailed Reason</h5>
                <div style="font-size: 14px; line-height: 1.6; color: #1e293b;">
                    ${reasonsHtml}
                </div>
            </div>
            
            <!-- PO Evidence Box -->
            <div style="margin-bottom: 24px; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h5 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #1e293b;"><i class="fa fa-file-text-o" style="margin-right: 6px; color: #10b981;"></i> Purchase Order Evidence</h5>
                ${poDetailsHtml}
            </div>
            
            <!-- Supplier Comparison Box -->
            <div style="margin-bottom: 24px; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h5 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #1e293b;"><i class="fa fa-users" style="margin-right: 6px; color: #f59e0b;"></i> Supplier Comparison & Grading</h5>
                <div>
                    ${comparisonHtml}
                </div>
            </div>

        </div>
    `;

    $('#ai-drawer-content').html(html);
}

window.run_ai_evaluation = function (frm) {
    if (!frm) frm = cur_frm;

    // Show Loading Animation
    let loadingHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center; font-family: 'Inter', sans-serif;">
            <div style="position: relative; width: 120px; height: 120px; margin-bottom: 32px;">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; border: 3px dashed #cbd5e1; animation: ai-spin-slow 8s linear infinite;"></div>
                <div style="position: absolute; top: 10px; left: 10px; width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #e0e7ff, #ede9fe); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.2); animation: ai-pulse 2s ease-in-out infinite;">
                    <i class="fa fa-magic" style="font-size: 40px; color: #6366f1; animation: ai-float 3s ease-in-out infinite;"></i>
                </div>
            </div>
            
            <style>
                @keyframes ai-spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes ai-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                @keyframes ai-float { 0% { transform: translateY(0px); } 50% { transform: translateY(-5px); } 100% { transform: translateY(0px); } }
                .ai-step { transition: all 0.3s; opacity: 0.4; display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 15px; font-weight: 600; color: #475569; }
                .ai-step.active { opacity: 1; color: #0f172a; transform: translateX(5px); }
                .ai-step.done { opacity: 0.7; color: #10b981; }
                .ai-step-icon { width: 24px; height: 24px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 11px; }
                .ai-step.active .ai-step-icon { background: #6366f1; color: white; box-shadow: 0 0 0 4px #e0e7ff; }
                .ai-step.done .ai-step-icon { background: #10b981; color: white; }
            </style>
            
            <h4 style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 32px 0; letter-spacing: -0.5px;">AI is finding the best supplier...</h4>
            
            <div style="text-align: left; width: 280px; margin: 0 auto;">
                <div class="ai-step active" id="ai-step-1">
                    <div class="ai-step-icon"><i class="fa fa-map-marker"></i></div>
                    Matching Location Details
                </div>
                <div class="ai-step" id="ai-step-2">
                    <div class="ai-step-icon"><i class="fa fa-money"></i></div>
                    Comparing Commercial Rates
                </div>
                <div class="ai-step" id="ai-step-3">
                    <div class="ai-step-icon"><i class="fa fa-history"></i></div>
                    Analyzing Historical POs
                </div>
                <div class="ai-step" id="ai-step-4">
                    <div class="ai-step-icon"><i class="fa fa-check-square-o"></i></div>
                    Scoring & Ranking
                </div>
            </div>
            
            <div style="width: 320px; height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 40px; overflow: hidden; position: relative;">
                <div id="ai-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 3px; transition: width 0.5s ease;"></div>
            </div>
            <div style="font-size: 12px; color: #94a3b8; font-weight: 600; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px;" id="ai-progress-text">0% Complete</div>
        </div>
    `;
    $('#ai-drawer-content').html(loadingHtml);

    // Animate progress
    let progress = 0;
    let step = 1;
    let simInterval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 95) progress = 95;

        $('#ai-progress-bar').css('width', progress + '%');
        $('#ai-progress-text').text(Math.floor(progress) + '% Complete');

        if (progress > 25 && step === 1) {
            $('#ai-step-1').removeClass('active').addClass('done').find('i').removeClass('fa-map-marker').addClass('fa-check');
            $('#ai-step-2').addClass('active');
            step = 2;
        } else if (progress > 55 && step === 2) {
            $('#ai-step-2').removeClass('active').addClass('done').find('i').removeClass('fa-money').addClass('fa-check');
            $('#ai-step-3').addClass('active');
            step = 3;
        } else if (progress > 85 && step === 3) {
            $('#ai-step-3').removeClass('active').addClass('done').find('i').removeClass('fa-history').addClass('fa-check');
            $('#ai-step-4').addClass('active');
            step = 4;
        }
    }, 400);

    frappe.call({
        method: 'nexapp.api.evaluate_feasibility_with_ai',
        args: {
            doc_data: JSON.stringify(frm.doc)
        },
        callback: function (r) {
            clearInterval(simInterval);
            if (r.message && !r.message.error) {
                $('#ai-progress-bar').css('width', '100%');
                $('#ai-progress-text').text('100% Complete');
                $('#ai-step-4').removeClass('active').addClass('done').find('i').removeClass('fa-check-square-o').addClass('fa-check');

                setTimeout(() => {
                    if (!frm.is_new()) frm.reload_doc();
                    render_ai_drawer_content(frm, r.message);
                }, 600);
            } else {
                $('#ai-drawer-content').html('<div style="padding: 40px; text-align: center; color: #ef4444;"><i class="fa fa-exclamation-triangle" style="font-size: 40px; margin-bottom: 16px;"></i><h4>Evaluation Failed</h4><p>' + (r.message ? r.message.error : 'Unknown Error') + '</p></div>');
            }
        },
        error: function (e) {
            clearInterval(simInterval);
            $('#ai-drawer-content').html('<div style="padding: 40px; text-align: center; color: #ef4444;"><i class="fa fa-exclamation-triangle" style="font-size: 40px; margin-bottom: 16px;"></i><h4>Evaluation Failed</h4><p>Could not connect to AI server.</p></div>');
        }
    });
}

window.open_ai_drawer = function (frm) {
    if ($('#ai-drawer-overlay').length === 0) {
        let drawerHtml = `
            <div id="ai-drawer-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 17, 21, 0.6); backdrop-filter: blur(4px); z-index: 99998; display: none;"></div>
            <div id="ai-drawer-panel" style="position: fixed; top: 0; right: 0; width: 700px; max-width: 90vw; height: 100vh; background: #f8fafc; z-index: 99999; box-shadow: -4px 0 24px rgba(0,0,0,0.15); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; overflow: hidden;">
                
                <!-- Header -->
                <div style="background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                        <i class="fa fa-magic" style="color: #6366f1;"></i> AI Supplier Recommendation
                    </h3>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button class="btn btn-sm" id="btn-ai-reevaluate" style="background: white; border: 1px solid #e2e8f0; color: #475569; font-weight: 600;"><i class="fa fa-refresh"></i> Re-evaluate</button>
                        <button class="btn btn-sm" id="btn-ai-close" style="background: transparent; border: none; font-size: 18px; color: #64748b; padding: 4px 8px; cursor: pointer;"><i class="fa fa-times"></i></button>
                    </div>
                </div>

                <!-- Body Scrollable -->
                <div id="ai-drawer-content" style="flex: 1; overflow-y: auto; padding: 24px;">
                </div>
            </div>
        `;
        $('body').append(drawerHtml);

        $('#btn-ai-close, #ai-drawer-overlay').on('click', function () {
            $('#ai-drawer-panel').css('transform', 'translateX(100%)');
            $('#ai-drawer-overlay').fadeOut(200);
        });

        $('#btn-ai-reevaluate').on('click', function () {
            run_ai_evaluation(cur_frm);
        });
    }

    $('#ai-drawer-overlay').fadeIn(200);
    setTimeout(() => {
        $('#ai-drawer-panel').css('transform', 'translateX(0)');
    }, 10);

    show_ai_evaluation_prompt(frm);
};

function show_ai_evaluation_prompt(frm) {
    if (frm.doc.custom_ai_evaluation) {
        try {
            let saved_data = JSON.parse(frm.doc.custom_ai_evaluation);
            if (saved_data && !saved_data.error) {
                render_ai_drawer_content(frm, saved_data);
                return;
            }
        } catch (e) {
            console.error("Failed to parse saved AI Evaluation", e);
        }
    }
    // If no data, show empty state with "Run Evaluation" button
    render_ai_drawer_content(frm, null);
}

function show_feasibility_guidelines() {
    let html = `
        <div style="padding: 10px; line-height: 1.6;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">📘 Feasibility Guidelines</h4>
            <ul style="padding-left: 20px;">
                <li>✅ No feasibility should be carried out without first contacting and confirming with the supplier.</li>
                <li>✅ Ensure the supplier has presence and capability in the specified site area.</li>
                <li>✅ Always try to get the most competitive market rate.</li>
                <li>✅ If any communication is done via email, please attach the email(s) as supporting evidence.</li>
            </ul>
        </div>
    `;

    let dialog = new frappe.ui.Dialog({
        title: 'Feasibility Assessment Guidelines',
        size: 'small',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'info_html',
                options: html
            }
        ],
        primary_action_label: 'Close',
        primary_action() {
            dialog.hide();
        }
    });

    dialog.show();
}
///////////////////////////////////////////////////////////////////////
//Supplier Pool
frappe.ui.form.on('Feasibility', {
    refresh: function (frm) {
        // Default to blue icon
        let iconColor = '#dc3545'; // red by default (no data)

        // Check if pincode is present
        if (frm.doc.pincode) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Lastmile Services Master",
                    filters: [
                        ["Lastmile Services Master", "pin_code", "=", frm.doc.pincode],
                        ["Lastmile Services Master", "lms_stage", "in", ["PO Released", "In process", "Delivered"]]
                    ],
                    fields: ["supplier"]
                },
                callback: function (response) {
                    let data = response.message || [];

                    // Deduplicate by supplier
                    let seen_suppliers = new Set();
                    for (let row of data) {
                        if (row.supplier) {
                            seen_suppliers.add(row.supplier);
                        }
                    }

                    if (seen_suppliers.size > 0) {
                        iconColor = '#28a745'; // green if supplier(s) found
                    }

                    render_supplier_icon(iconColor);
                }
            });
        } else {
            render_supplier_icon(iconColor); // no pincode, render red icon
        }

        function render_supplier_icon(iconColor) {
            frm.fields_dict.supplier_pool.$wrapper.html(`
                <div style="margin-top: 10px; text-align: center;">
                    <a id="show_supplier_pool_icon" title="Supplier Pool Info" style="cursor: pointer; font-size: 22px; color: ${iconColor};">
                        <i class="fa fa-users"></i>
                    </a>
                    <div style="margin-top: 6px; font-weight: 600; color: #007BFF;">
                        Supplier Pool
                    </div>
                </div>
            `);

            // Icon click handler
            frm.fields_dict.supplier_pool.$wrapper.find('#show_supplier_pool_icon').on('click', function () {
                show_isp_supplier_pool_dialog(frm);
            });
        }
    }
});
///////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Feasibility', {
    validate: function (frm) {
        validate_feasibility_requirements(frm, true);
        const status = frm.doc.feasibility_status;

        // If status is Pending, reset the dates and hold days to start
        if (status === "Pending") {
            frm.set_value('hold_days', 0);
            frm.set_value('on_hold_since', null);
            frm.set_value('feasibility_completed_date', null);
            frm.set_value('feasibility_tat', 0.0);
        }

        // Set solution_type based on solution_name
        if (frm.doc.solution_name) {
            let name = frm.doc.solution_name.toUpperCase();
            if (name.includes("MBB")) {
                frm.set_value("solution_type", "MBB");
            } else if (name.includes("ILL")) {
                frm.set_value("solution_type", "ILL");
            } else {
                frm.set_value("solution_type", "SIM");
            }
        } else {
            frm.set_value("solution_type", "SIM");
        }

        let period_days = 0;
        let status_map = {
            'Feasible': 'Fulfilled',
            'High Commercials': 'Fulfilled',
            'Not Feasible': 'Fulfilled',
            'On Hold': 'Pause'
        };

        if (frm.tat_period_days !== undefined && frm.tat_status_map) {
            period_days = frm.tat_period_days;
            status_map = frm.tat_status_map;
        } else if (frm.doc.due_date && frm.doc.feasibility_created_date) {
            let created = moment(frm.doc.feasibility_created_date, ["YYYY-MM-DD", "DD-MM-YYYY"]);
            let due = moment(frm.doc.due_date, ["YYYY-MM-DD", "DD-MM-YYYY"]);
            let diff = due.diff(created, 'days');
            let hold = frm.doc.hold_days || 0;
            period_days = Math.max(0, diff - hold);
        }

        let created = frm.doc.feasibility_created_date || frm.doc.creation || frappe.datetime.now_datetime();
        let base_due_date = moment(created).add(period_days, 'days');
        let hold_days = frm.doc.hold_days || 0;
        let actual_due_date = moment(base_due_date).add(hold_days, 'days');
        frm.set_value('due_date', actual_due_date.format('YYYY-MM-DD'));

        let action = status_map[status];

        if (action === "Fulfilled") {
            if (!frm.doc.feasibility_completed_date) {
                frm.set_value('feasibility_completed_date', frappe.datetime.now_datetime());
            }
            let diffDays = moment(frm.doc.feasibility_completed_date).diff(moment(created), 'days', true);
            let actual_tat = Math.max(0, diffDays - hold_days);
            frm.set_value('feasibility_tat', parseFloat(actual_tat.toFixed(2)));
            frm.set_value('sla_status', 'Completed');

            // Completed within due date?
            let completedDate = moment(frm.doc.feasibility_completed_date).startOf('day');
            let targetDue = moment(actual_due_date).startOf('day');
            if (completedDate.isSameOrBefore(targetDue)) {
                frm.set_value('tat_status', 'Fulfilled');
            } else {
                frm.set_value('tat_status', 'Failed');
            }
        } else {
            if (action === "Pause") {
                frm.set_value('sla_status', 'Paused');
                frm.set_value('tat_status', 'Paused');
            } else {
                frm.set_value('feasibility_completed_date', null);
                frm.set_value('feasibility_tat', 0.0);

                let today = moment().startOf('day');
                let target_due = moment(actual_due_date).startOf('day');
                if (today.isSameOrBefore(target_due)) {
                    frm.set_value('sla_status', 'Within TAT');
                    frm.set_value('tat_status', 'Resolution Due');
                } else {
                    frm.set_value('sla_status', 'Overdue');
                    frm.set_value('tat_status', 'Failed');
                }
            }
        }
    }
});
///////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Feasibility', {
    refresh: function (frm) {
        // Ensure feasibility_created_date is always aligned with the creation datetime
        if (frm.doc.creation) {
            let creation_date_str = moment(frm.doc.creation).format('YYYY-MM-DD');
            if (frm.doc.feasibility_created_date !== creation_date_str) {
                frm.set_value('feasibility_created_date', creation_date_str);
            }
        } else if (!frm.doc.feasibility_created_date) {
            frm.set_value('feasibility_created_date', frappe.datetime.get_today());
        }

        load_tat_settings(frm);

        if (!frm.is_new() && !frm.is_dirty()) {
            frappe.call({
                method: 'nexapp.nexapp.doctype.feasibility.feasibility.check_and_update_tat',
                args: {
                    docname: frm.doc.name
                },
                callback: function (r) {
                    if (r.message && r.message.updated) {
                        frm.reload_doc();
                    }
                }
            });
        }
    }
});
////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Feasibility', {
    refresh: function (frm) {
        // Inject info icon button into HTML field "info2"
        frm.fields_dict.info2.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_feasibility_info_icon" title="Feasibility Info" style="cursor: pointer; font-size: 29px; color: #FF0000;">
                    <i class="fa fa-info-circle"></i>
                </a>
            </div>
        `);

        // Add click event for showing dialog
        frm.fields_dict.info2.$wrapper.find('#show_feasibility_info_icon').on('click', function () {
            show_feasibility_info_dialog();
        });
    }
});

// Function to show feasibility info dialog
function show_feasibility_info_dialog() {
    const feasibility_html = `
        <div style="padding: 10px; line-height: 1.6; max-height: 500px; overflow-y: auto;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">📌 Importance of Feasibility in Project Implementation</h4>
            <p>Feasibility is the first and most critical step toward successful project implementation. It sets the foundation for all future activities, and therefore, the information collected during this phase must be accurate and complete.</p>
            <p>One of the most important aspects of the feasibility process is capturing the <b>Local Branch Information</b> for each site. This ensures smooth coordination and timely execution during the implementation phase.</p>

            <h5 style="margin-top: 20px;">🔑 Key Points:</h5>
            <ul style="margin-left: 20px;">
                <li>Feasibility should always begin with accurate data collection.</li>
                <li>Every site must have complete and verified Local Branch Information.</li>
                <li>Local Branch details are essential for:
                    <ul>
                        <li>Coordinating site visits</li>
                        <li>Planning installation timelines</li>
                        <li>Communicating with local stakeholders</li>
                        <li>Avoiding unnecessary delays</li>
                    </ul>
                </li>
                <li>Incorrect or missing information at this stage can lead to:
                    <ul>
                        <li>Project delays</li>
                        <li>Miscommunication with suppliers and local teams</li>
                        <li>Increased costs due to rework or travel</li>
                    </ul>
                </li>
                <li>Ensure all feasibility reports are reviewed and validated before proceeding to the next step.</li>
            </ul>

            <p style="margin-top: 20px;"><b>Accurate feasibility data, especially Local Branch Information, plays a major role in the success of project execution. Let’s make this step as strong and reliable as possible.</b></p>
        </div>
    `;

    const dialog = new frappe.ui.Dialog({
        title: 'Feasibility Information',
        size: 'large',
        fields: [
            {
                fieldname: 'feasibility_html',
                fieldtype: 'HTML',
                options: feasibility_html
            }
        ],
        primary_action_label: 'Close',
        primary_action() {
            dialog.hide();
        }
    });

    dialog.show();
}

/////////////////////////////////////////////////////////////////////////
function show_custom_confirmation_modal(title, msg, on_confirm, on_cancel) {
    $('#custom_confirmation_modal').remove();
    let modal_html = `
        <div id="custom_confirmation_modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; z-index: 999999; backdrop-filter: blur(2px);">
            <div style="background: #fff; width: 420px; border-radius: 12px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: 'Inter', sans-serif;">
                <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 500; color: #111827;">${title}</h3>
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #111827; font-weight: 600;">${msg}</p>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="custom-modal-btn-cancel" style="padding: 8px 20px; border: 1px solid #d1d5db; background: #fff; color: #374151; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;">No</button>
                    <button class="custom-modal-btn-confirm" style="padding: 8px 20px; border: none; background: #e03a27; color: #fff; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;">Yes</button>
                </div>
            </div>
        </div>
    `;
    $('body').append(modal_html);

    $('#custom_confirmation_modal .custom-modal-btn-cancel').hover(
        function () { $(this).css('background', '#f3f4f6'); },
        function () { $(this).css('background', '#fff'); }
    ).on('click', function () {
        $('#custom_confirmation_modal').remove();
        if (typeof on_cancel === 'function') on_cancel();
    });

    $('#custom_confirmation_modal .custom-modal-btn-confirm').hover(
        function () { $(this).css('background', '#c93020'); },
        function () { $(this).css('background', '#e03a27'); }
    ).on('click', function () {
        $('#custom_confirmation_modal').remove();
        if (typeof on_confirm === 'function') on_confirm();
    });
}

function trigger_new_supplier_modal(frm) {
    if (!frm.doc.lms_provider) return;

    let target_rows = [];
    for (let row of frm.doc.lms_provider) {
        if (row.feasibility_type === "New Supplier" && !row.lms_request_id && row.lms_supplier) {
            target_rows.push(row);
        }
    }

    if (target_rows.length === 0) return;

    let supplier_names = target_rows.map(r => r.supplier_contact || r.lms_supplier).join(', ');

    show_custom_confirmation_modal(
        "Add New Suppliers",
        `Do you want to add the following new Supplier(s) to LMS Request and Site?<br><br><b>${supplier_names}</b>`,
        function () {
            // YES Action
            frappe.call({
                method: 'nexapp.nexapp.doctype.feasibility.feasibility.add_lms_suppliers',
                args: {
                    feasibility_name: frm.doc.name,
                    row_names: JSON.stringify(target_rows.map(r => r.name))
                },
                callback: function (r) {
                    if (!r.exc && r.message) {
                        let msg = `LMS Request <b>${r.message.lms_request}</b> updated with ${target_rows.length} new supplier(s).`;
                        if (r.message.site_updated) {
                            msg += `<br>Site updated with LMS Vendor data.`;
                        }
                        show_custom_validation_modal("Success", msg, false, true);
                        frm.reload_doc();
                    }
                }
            });
        },
        function () {
            // NO Action - Remove the rows
            let grid = frm.get_field("lms_provider").grid;
            if (grid && grid.grid_rows) {
                target_rows.forEach(tr => {
                    let grid_row = grid.grid_rows.find(r => r.doc.name === tr.name);
                    if (grid_row) {
                        grid_row.remove();
                    }
                });
                frm.save().then(() => {
                    show_custom_validation_modal("Removed", "The unconfirmed supplier rows were removed.", false);
                });
            }
        }
    );
}

frappe.ui.form.on('Feasibility', {
    after_save(frm) {
        trigger_new_supplier_modal(frm);
    },

    lms_provider_add: function (frm, cdt, cdn) {
        if (["Feasible", "High Commercials"].includes(frm.doc.feasibility_status)) {
            frappe.model.set_value(cdt, cdn, 'feasibility_type', 'New Supplier');
            setTimeout(() => {
                frappe.model.set_value(cdt, cdn, 'feasibility_type', 'New Supplier');
            }, 50);
        }
    },

    lms_provider_on_form_rendered: function (frm, cdt, cdn) {
        if (typeof fetch_and_render_last_3_pos === 'function') {
            fetch_and_render_last_3_pos(frm, cdt, cdn);
            setTimeout(() => fetch_and_render_last_3_pos(frm, cdt, cdn), 300);
        }
        function update_modal_help() {
            $('.grid-row-open .frappe-control[data-fieldname="primary"], .modal:visible .frappe-control[data-fieldname="primary"]').each(function () {
                let $ctrl = $(this);
                $ctrl.find('.help-box').hide();
                if ($ctrl.find('.custom-modal-help').length === 0) {
                    $ctrl.append(`<div class="custom-modal-help" style="font-size: 11px; color: #475569; margin-top: 6px; padding: 6px 10px; background-color: #E3DBE1; border-left: 3px solid #71639e; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 14px; margin-right: 8px; display: inline-block;">💡</span><span>During feasibility, select the most capable Primary Supplier.</span></div>`);
                }
            });

            $('.grid-row-open .frappe-control[data-fieldname="quote_valid_until"], .modal:visible .frappe-control[data-fieldname="quote_valid_until"]').each(function () {
                let $ctrl = $(this);
                $ctrl.find('.help-box').hide();
                if ($ctrl.find('.custom-modal-help').length === 0) {
                    $ctrl.append(`<div class="custom-modal-help" style="font-size: 11px; color: #475569; margin-top: 6px; padding: 6px 10px; background-color: #E3DBE1; border-left: 3px solid #eab308; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 14px; margin-right: 8px; display: inline-block;">⚠️</span><span>Do not enter the quote validity date without supplier confirmation.</span></div>`);
                }
            });
        }
        update_modal_help();
        setTimeout(update_modal_help, 50);
        setTimeout(update_modal_help, 200);
        setTimeout(update_modal_help, 500);
    }
});
//////////////////////////////////////////////////////////////////////////////
//Feasibility LMS Contact

function fetch_and_render_last_3_pos(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let $modal = $('.grid-row-open').length > 0 ? $('.grid-row-open') : $('.modal:visible');
    if ($modal.length === 0) return;

    let $po_container = $modal.find('.frappe-control[data-fieldname="last_3_po_html"]');
    if ($po_container.length === 0) {
        let $comm_head = $modal.find('.section-head:contains("LMS Commercial")');
        if ($comm_head.length > 0) {
            let $section_body = $comm_head.next('.section-body');
            if ($section_body.length > 0) {
                $po_container = $('<div class="col-sm-12 frappe-control" data-fieldname="last_3_po_html" style="width: 100%; margin-bottom: 15px;"></div>').prependTo($section_body);
            } else {
                $po_container = $('<div class="col-sm-12 frappe-control" data-fieldname="last_3_po_html" style="width: 100%; margin-bottom: 15px;"></div>').insertAfter($comm_head);
            }
        } else {
            let $comm_section = $modal.find('.frappe-control[data-fieldname="lms_commercial_section"]');
            if ($comm_section.length > 0) {
                $po_container = $('<div class="col-sm-12 frappe-control" data-fieldname="last_3_po_html" style="width: 100%; margin-bottom: 15px;"></div>').insertAfter($comm_section);
            } else {
                let $email_field = $modal.find('.frappe-control[data-fieldname="email_id"]');
                if ($email_field.length > 0) {
                    $po_container = $('<div class="col-sm-12 frappe-control" data-fieldname="last_3_po_html" style="width: 100%; margin-bottom: 15px;"></div>').insertAfter($email_field);
                } else {
                    return;
                }
            }
        }
    }

    if (!row || !frm.doc.pincode) {
        $po_container.html('');
        $po_container.hide();
        return;
    }

    const is_allowed_user = frappe.session.user === 'bijimnurse@gmail.com' || frappe.session.user === 'mathewsamuel10@gmail.com' || frappe.session.user === 'Administrator' || frappe.session.user.includes('admin');
    if (!(is_allowed_user || frappe.user.has_role('Projects Manager') || frappe.user.has_role('Projects User') || frappe.user.has_role('System Manager') || frappe.user.has_role('LMS Manager'))) {
        $po_container.html('');
        $po_container.hide();
        return;
    }

    let suppliers = [];
    if (row.lms_supplier) suppliers.push(row.lms_supplier);
    if (row.supplier_contact) suppliers.push(row.supplier_contact);
    if (row.email_id) suppliers.push(row.email_id);
    if (row.supplier_name) suppliers.push(row.supplier_name);

    frappe.call({
        method: 'nexapp.nexapp.doctype.feasibility.feasibility.get_latest_po_reference',
        args: {
            suppliers: JSON.stringify(suppliers),
            pincode: frm.doc.pincode
        },
        callback: function (r) {
            if (!r.message) {
                $po_container.html('');
                $po_container.hide();
                return;
            }
            let po = r.message;
            frappe.db.get_doc('Purchase Order', po.po_name).then(po_doc => {
                let html = `<div style="background-color: #E3DBE1; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #eab308; margin-bottom: 16px; font-size: 11px; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.05); width: 100%;">`;
                html += `<div style="font-weight: bold; font-size: 13px; margin-bottom: 10px; color: #854d0e; display: flex; align-items: center;"><span style="font-size: 16px; margin-right: 6px;">💡</span> Tips - Latest PO Reference</div>`;
                html += `<div style="overflow-x: auto; width: 100%;">`;
                html += `<table style="width: 100%; border-collapse: collapse; min-width: 650px;">`;
                html += `<thead style="border-bottom: 2px solid #facc15; color: #713f12; font-weight: bold; text-align: left; font-size: 11px;"><tr><th style="padding: 6px 8px; width: 28%; white-space: nowrap; min-width: 190px;">PO No</th><th style="padding: 6px 8px; width: 15%; white-space: nowrap; min-width: 90px;">PO Date</th><th style="padding: 6px 8px; width: 42%; min-width: 200px;">Item Name</th><th style="padding: 6px 8px; text-align: right; width: 15%; white-space: nowrap; min-width: 100px;">Rate</th></tr></thead><tbody>`;

                let format_po_date = (d_str) => {
                    if (!d_str) return '';
                    let parts = d_str.split('-');
                    if (parts.length === 3) {
                        return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                    return d_str;
                };

                let po_date_formatted = format_po_date(po.transaction_date);
                let po_items = po_doc.items || [];
                if (po_items.length === 0) {
                    html += `<tr style="border-bottom: none; background-color: rgba(255,255,255,0.3);"><td style="padding: 6px 8px; font-weight: 600; color: #0f172a; white-space: nowrap;">${po.po_name}</td><td style="padding: 6px 8px; color: #475569; white-space: nowrap;">${po_date_formatted}</td><td style="padding: 6px 8px; font-style: italic; color: #64748b;">No items found</td><td style="padding: 6px 8px; text-align: right; color: #64748b; white-space: nowrap;">-</td></tr>`;
                } else {
                    po_items.forEach((item, idx) => {
                        let item_border = (idx === po_items.length - 1) ? 'border-bottom: none;' : 'border-bottom: 1px dotted #fef08a;';
                        let bg_color = idx % 2 === 0 ? 'background-color: rgba(255,255,255,0.4);' : 'background-color: rgba(255,255,255,0.2);';
                        html += `<tr style="${item_border} ${bg_color}"><td style="padding: 6px 8px; font-weight: 600; color: #0f172a; white-space: nowrap;">${idx === 0 ? po.po_name : ''}</td><td style="padding: 6px 8px; color: #475569; white-space: nowrap;">${idx === 0 ? po_date_formatted : ''}</td><td style="padding: 6px 8px; color: #1e293b; font-weight: 500;">${item.item_name || item.item_code || ''}</td><td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #0f172a; font-size: 12px; white-space: nowrap;">${format_currency(item.rate, frappe.boot.sysdefaults.currency)}</td></tr>`;
                    });
                }

                html += `</tbody></table></div></div>`;
                $po_container.html(html);
                $po_container.show();
            }).catch(() => {
                $po_container.html('');
                $po_container.hide();
            });
        }
    });
}

frappe.ui.form.on('LMS Feasibility', {
    form_rendered: function (frm, cdt, cdn) {
        if (typeof frm.events.form_render === 'function') {
            frm.events.form_render(frm, cdt, cdn);
        } else if (frm.script_manager && frm.script_manager.has_handlers('LMS Feasibility', 'form_render')) {
            frm.script_manager.trigger('form_render', cdt, cdn);
        } else {
            this.form_render(frm, cdt, cdn);
        }
    },
    form_render: function (frm, cdt, cdn) {
        let current_row = locals[cdt][cdn];
        if (current_row && current_row.__islocal && ["Feasible", "High Commercials"].includes(frm.doc.feasibility_status)) {
            if (current_row.feasibility_type !== 'New Supplier') {
                frappe.model.set_value(cdt, cdn, 'feasibility_type', 'New Supplier');
            }
            setTimeout(() => {
                if (cur_grid && cur_grid.open_grid_row && cur_grid.open_grid_row.fields_dict && cur_grid.open_grid_row.fields_dict.feasibility_type) {
                    let f_type_field = cur_grid.open_grid_row.fields_dict.feasibility_type;
                    if (f_type_field.$input && f_type_field.$input.val() !== 'New Supplier') {
                        f_type_field.set_input('New Supplier');
                    }
                }
            }, 50);
        }
        function update_user_display() {
            let row = locals[cdt][cdn];
            if (!row) return;
            let val = row.feasibility_user || '';

            let set_full_name = (fname) => {
                if (row.feasibility_user !== fname) {
                    frappe.model.set_value(cdt, cdn, 'feasibility_user', fname);
                }
                if (cur_grid && cur_grid.open_grid_row && cur_grid.open_grid_row.fields_dict && cur_grid.open_grid_row.fields_dict.feasibility_user) {
                    let fu_field = cur_grid.open_grid_row.fields_dict.feasibility_user;
                    if (fu_field.disp_area) fu_field.disp_area.innerHTML = fname;
                    if (fu_field.$input) fu_field.$input.val(fname);
                }
            };

            if (!val || val === '__user' || val === '__user_fullname' || val === frappe.session.user) {
                set_full_name(frappe.session.user_fullname);
            } else if (val.includes('@')) {
                frappe.db.get_value('User', val, 'full_name').then(r => {
                    if (r && r.message && r.message.full_name) {
                        set_full_name(r.message.full_name);
                    }
                });
            } else {
                set_full_name(val);
            }
        }
        update_user_display();
        setTimeout(update_user_display, 100);
        setTimeout(update_user_display, 300);

        function update_modal_help() {
            $('.grid-row-open .frappe-control[data-fieldname="primary"], .modal:visible .frappe-control[data-fieldname="primary"]').each(function () {
                let $ctrl = $(this);
                $ctrl.find('.help-box').hide();
                if ($ctrl.find('.custom-modal-help').length === 0) {
                    $ctrl.append(`<div class="custom-modal-help" style="font-size: 11px; color: #475569; margin-top: 6px; padding: 6px 10px; background-color: #E3DBE1; border-left: 3px solid #71639e; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 14px; margin-right: 8px; display: inline-block;">💡</span><span>While doing the Feasibility, please select the Primary Supplier who is most capable of performing this activity.</span></div>`);
                }
            });

            $('.grid-row-open .frappe-control[data-fieldname="quote_valid_until"], .modal:visible .frappe-control[data-fieldname="quote_valid_until"]').each(function () {
                let $ctrl = $(this);
                $ctrl.find('.help-box').hide();
                if ($ctrl.find('.custom-modal-help').length === 0) {
                    $ctrl.append(`<div class="custom-modal-help" style="font-size: 11px; color: #475569; margin-top: 6px; padding: 6px 10px; background-color: #E3DBE1; border-left: 3px solid #eab308; border-radius: 6px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size: 14px; margin-right: 8px; display: inline-block;">⚠️</span><span>Do not enter the quote validity date without supplier confirmation.</span></div>`);
                }
            });
        }
        update_modal_help();
        setTimeout(update_modal_help, 50);
        setTimeout(update_modal_help, 200);
        setTimeout(update_modal_help, 500);

        fetch_and_render_last_3_pos(frm, cdt, cdn);
        setTimeout(() => fetch_and_render_last_3_pos(frm, cdt, cdn), 300);
    },
    lms_supplier: function (frm, cdt, cdn) {
        fetch_and_render_last_3_pos(frm, cdt, cdn);
        let row = locals[cdt][cdn];

        // Auto-set feasibility_type if status is Feasible/High Commercials
        if (["Feasible", "High Commercials"].includes(frm.doc.feasibility_status) && row.feasibility_type === "Default") {
            frappe.model.set_value(cdt, cdn, 'feasibility_type', 'New Supplier');
        }
    },
    contact: function (frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (!row.lms_supplier) {
            show_custom_validation_modal("Missing Supplier", "Please select an LMS Supplier before proceeding.", false);
            return;
        }

        // 2. Fetch LMS Feasibility Partner (client-side only)
        frappe.db.get_doc('LMS Feasibility Partner', row.lms_supplier)
            .then(partner => {
                if (!partner || !partner.table_onol || partner.table_onol.length === 0) {
                    show_custom_validation_modal("No Contacts", "No LMS Contacts found under this supplier.", false);
                    return;
                }

                // 3. Create contact table HTML with scrollable container
                let html = `
                    <div style="overflow-x: auto; max-width: 100%;">
                        <table class="table table-bordered" style="min-width: 100%;">
                            <thead>
                                <tr>
                                    <th>Level</th>
                                    <th>Name</th>
                                    <th>Mobile</th>
                                    <th>Email</th>
                                    <th>Set</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                for (const contact of partner.table_onol) {
                    html += `
                        <tr>
                            <td>${contact.lavel || ''}</td>
                            <td>${contact.name1 || ''}</td>
                            <td>${contact.mobile || ''}</td>
                            <td>${contact.email || ''}</td>
                            <td>
                                <input type="radio" name="select_contact" value="${contact.name1}" data-contact='${JSON.stringify(contact)}'>
                            </td>
                        </tr>
                    `;
                }

                html += `</tbody></table></div>`;

                // 4. Show popup dialog
                const dialog = new frappe.ui.Dialog({
                    title: "Select Contact",
                    size: "large",
                    fields: [
                        {
                            fieldname: 'contact_html',
                            fieldtype: 'HTML',
                            options: html
                        }
                    ],
                    primary_action_label: "Select",
                    primary_action: function () {
                        const selected = dialog.$wrapper.find('input[name="select_contact"]:checked');
                        if (selected.length > 0) {
                            const selectedData = JSON.parse(selected.attr('data-contact'));

                            // 5. Set values in same row
                            frappe.model.set_value(cdt, cdn, 'supplier_contact', selectedData.name1);
                            frappe.model.set_value(cdt, cdn, 'email_id', selectedData.email);
                            frappe.model.set_value(cdt, cdn, 'mobile', selectedData.mobile);

                            dialog.hide();
                        } else {
                            show_custom_validation_modal("Selection Missing", "Please select a contact before submitting.", false);
                        }
                    }
                });

                dialog.show();
            })
            .catch(() => {
                show_custom_validation_modal("Error", "Invalid LMS Supplier or unable to fetch partner.", false);
            });
    },
    feasibility_type: function (frm, cdt, cdn) {
        // Validation moved to refresh event
    },
    lms_status: function (frm, cdt, cdn) {
        // No longer triggering button creation
    }
});

/////////////////////////////////////////////////////////////////

frappe.ui.form.on('Feasibility', {
    solution_code: function (frm) {
        if (frm.doc.solution_code) {
            frappe.db.get_value('Item', frm.doc.solution_code, 'item_name', (r) => {
                if (r && r.item_name) {
                    let name = r.item_name.toUpperCase();
                    if (name.includes("MBB")) {
                        frm.set_value("solution_type", "MBB");
                    } else if (name.includes("ILL")) {
                        frm.set_value("solution_type", "ILL");
                    } else {
                        frm.set_value("solution_type", "SIM");
                    }
                    load_tat_settings(frm);
                }
            });
        }
    },
    solution_name: function (frm) {
        if (frm.doc.solution_name) {
            let name = frm.doc.solution_name.toUpperCase();
            if (name.includes("MBB")) {
                frm.set_value("solution_type", "MBB");
            } else if (name.includes("ILL")) {
                frm.set_value("solution_type", "ILL");
            } else {
                frm.set_value("solution_type", "SIM");
            }
        } else {
            frm.set_value("solution_type", "SIM");
        }
        load_tat_settings(frm);
    },
    solution_type: function (frm) {
        frm.events.calculate_lms_type(frm);
        load_tat_settings(frm);
    }
});

// --- ISP Change Feasibility Logic ---
frappe.ui.form.on('Feasibility', {
    setup(frm) {
        // Formatter: color the "Existing Supplier" cell yellow if LMS Feasibility Status is "Pending"
        let df = frappe.meta.get_docfield("ISP Change Feasibility", "supplier", frm.docname);
        if (df) {
            df.formatter = function (value, df, options, doc) {
                if (doc && doc.lms_status === "Pending") {
                    return `<div style="background-color: #fff3cd; padding: 4px 8px; border-radius: 4px; min-height: 20px;">${value || ""}</div>`;
                }
                return value || "";
            };
        }
    },
    isp_pending(frm) {
        frm.trigger('highlight_isp_tab');
    },
    highlight_isp_tab(frm) {
        setTimeout(() => {
            // Use same fallback pattern as setup_tab_overflow (line 1634-1636)
            let $tabsContainer = $(frm.wrapper).find('.form-tabs');
            if (!$tabsContainer.length) $tabsContainer = $('.form-tabs').first();

            let tab_link = $tabsContainer.find('.nav-link').filter(function () {
                return $(this).text().trim() === 'ISP Change Feasibility';
            });

            if (frm.doc.isp_pending === 1) {
                tab_link.addClass('isp-pending-tab');
            } else {
                tab_link.removeClass('isp-pending-tab');
            }
        }, 500);
    },
    refresh(frm) {
        if (frm.doc.isp_change_feasibility_check === 1) {
            frm.trigger('setup_lms_button');
        }
        frm.trigger('highlight_isp_tab');
    },
    // Force grid re-render after a row is deleted so stale colors are cleared
    isp_change_feasibility_remove(frm) {
        setTimeout(() => {
            frm.fields_dict.isp_change_feasibility.grid.refresh();
        }, 300);
    },
    isp_change_feasibility_check(frm) {
        if (frm.doc.isp_change_feasibility_check === 1) {
            frm.trigger('setup_lms_button');
        } else {
            frm.remove_custom_button('Create LMS Request');
        }
    },
    setup_lms_button(frm) {
        frm.remove_custom_button('Create LMS Request');
        frm.add_custom_button('Create LMS Request', () => {
            const eligible_rows = frm.doc.isp_change_feasibility.filter(row =>
                (row.lms_status === "Feasible" || row.lms_status === "High Commercials") &&
                !row.lms_request_id
            );

            if (eligible_rows.length === 0) {
                frappe.msgprint("No eligible records found to create LMS Request.");
                return;
            }

            frappe.confirm(
                `Create LMS Request for ${eligible_rows.length} suppliers?`,
                () => {
                    frappe.call({
                        method: 'frappe.client.insert',
                        args: {
                            doc: {
                                doctype: "LMS Request",
                                circuit_id: frm.doc.name,
                                lms_request_status: "ISP Change",
                                lms_id: frm.doc.lms_id,
                                purchase_order_number: frm.doc.purchase_order_number,
                                supplier: frm.doc.supplier,
                                purchase_order_date: frm.doc.purchase_order_date,
                                isp_change_issue: frm.doc.isp_change_issue,
                                change_management_request_id: frm.doc.change_management_request_id,
                                expected_date: frm.doc.expected_date,
                                lms_fesible_suppliers: eligible_rows.map(row => ({
                                    lms_feasibility_partner: row.lms_supplier,
                                    supplier_contact: row.supplier_contact,
                                    bandwith_type: row.bandwith_type,
                                    media: row.media,
                                    support_mode: row.support_mode,
                                    mobile: row.mobile,
                                    email_id: row.email_id,
                                    static_ip: row.static_ip,
                                    bandwidth: row.bandwidth,
                                    lms_feasibility_status: row.lms_status,
                                    billing_mode: row.billing_mode,
                                    billing_terms: row.billing_terms,
                                    validity: row.validity,
                                    feasibility_mrc: row.mrc,
                                    feasibility_otc: row.otc,
                                    feasibility_arc: row.arc,
                                    feasibility_static_ip_cost: row.static_ip_cost,
                                    feasibility_security_deposit: row.security_deposit
                                }))
                            }
                        },
                        callback: function (response) {
                            if (!response.exc) {
                                const lms_request_name = response.message.name;

                                // Set LMS Request ID for each included row
                                eligible_rows.forEach(row => {
                                    frappe.model.set_value(row.doctype, row.name, 'lms_request_id', lms_request_name);
                                });

                                frm.set_value('isp_pending', 0);

                                frm.save().then(() => {
                                    frappe.msgprint({
                                        title: "LMS Request Created",
                                        message: `LMS Request <b>${lms_request_name}</b> created successfully.`,
                                        indicator: 'green'
                                    });
                                });
                            }
                        }
                    });
                },
                () => {
                    // Cancel callback
                    frappe.msgprint("LMS Request creation cancelled.");
                }
            );
        }).addClass('btn-danger').css({ 'color': 'white', 'font-weight': 'bold' });
    }
});
