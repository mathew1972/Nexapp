frappe.ui.form.on("Installation Note", {
    refresh: function (frm) {
        if (!frm.is_new()) {
            add_provisioning_attachment_button(frm);
        }
        
        // --- START VIRTUAL INSTALLED ITEMS LOGIC ---
        if (frm.fields_dict['custom_virtual_installed_item']) {
            render_installed_items_table(frm);
        }
        // --- END VIRTUAL INSTALLED ITEMS LOGIC ---
        
        // --- START VIRTUAL LMS LOGIC ---
        // --- START VIRTUAL LMS LOGIC ---
        refresh_lms_information(frm);
        // --- END VIRTUAL LMS LOGIC ---
        
        if (!frm.__sidebar_collapsed) {
            function collapse_sidebar_by_default() {
                if ($(frm.wrapper).find('.layout-side-section').is(':visible')) {
                    let $toggle_btn = $(frm.wrapper).find('.sidebar-toggle-btn, .layout-side-section-toggle, [data-toggle="sidebar"]').first();
                    if ($toggle_btn.length > 0) {
                        $toggle_btn.trigger('click');
                    } else {
                        $(frm.wrapper).find('.layout-side-section').hide();
                        $(frm.wrapper).find('.layout-main-section').removeClass('col-lg-10 col-md-10').addClass('col-lg-12 col-md-12');
                    }
                    frm.__sidebar_collapsed = true;
                }
            }
            collapse_sidebar_by_default();
            setTimeout(collapse_sidebar_by_default, 100);
            setTimeout(collapse_sidebar_by_default, 300);
        }
        
        // --- START STYLE DESCRIPTIONS ---
        setTimeout(() => {
            // Style the Project Review Note
            // Style the Project Review Note
            $(frm.wrapper).find('p, div, span, .text-muted, .help-box, .help-block').each(function () {
                let $el = $(this);
                if (!$el.hasClass('nexapp-styled-note') && !$el.closest('.nexapp-styled-note').length && $el.children().length === 0 && $el.text().includes("This LMS Review will also automatically update")) {
                    $el.addClass('nexapp-styled-note');
                    $el.html(`
                        <div class="lms-review-note" style="font-size: 13px; color: #475569; padding: 10px 14px; background-color: #FFF1C2; border-left: 3px solid #71639e; border-radius: 6px; font-weight: 500; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-top: 5px; margin-bottom: 15px;">
                            <span style="font-size: 16px; margin-right: 10px; display: inline-block;">💡</span>
                            <span style="line-height: 1.4;">Note: This LMS Review will also automatically update from the Lastmile Services Master.</span>
                        </div>
                    `);
                    $el.removeClass('text-muted small');
                    $el.css({ 'color': 'inherit', 'font-size': 'inherit' });
                }
            });

            // Style the Installation Note Attachment Note
            $(frm.wrapper).find('.help-box, .help-block, .text-muted, p, span, div, .instructions').each(function () {
                let $el = $(this);
                if (!$el.hasClass('nexapp-styled-note') && !$el.closest('.nexapp-styled-note').length && $el.children().length === 0 && $el.text().includes("Please upload high-quality installation images")) {
                    $el.addClass('nexapp-styled-note');
                    $el.html(`
                        <div class="lms-review-note" style="font-size: 13px; color: #475569; padding: 10px 14px; background-color: #FFF1C2; border-left: 3px solid #71639e; border-radius: 6px; font-weight: 500; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-top: 5px; margin-bottom: 15px;">
                            <span style="font-size: 16px; margin-right: 10px; display: inline-block;">💡</span>
                            <span style="line-height: 1.4;">${$el.text()}</span>
                        </div>
                    `);
                    $el.removeClass('text-muted small');
                    $el.css({ 'color': 'inherit', 'font-size': 'inherit' });
                }
            });
        }, 300);
        // --- END STYLE DESCRIPTIONS ---
        
        // --- START UI STYLING ---
        render_odoo_ui(frm);
        // --- END UI STYLING ---

        // Inject Guidelines Button with a slight delay to ensure DOM is ready
        setTimeout(() => inject_guidelines_button(frm), 500);
    },
    
    delivery_note: function(frm) {
        if (frm.fields_dict['custom_virtual_installed_item']) {
            render_installed_items_table(frm);
        }
    },
    
    custom_delivery_note: function(frm) {
        if (frm.fields_dict['custom_virtual_installed_item']) {
            render_installed_items_table(frm);
        }
    },
    
    circuit_id: function(frm) {
        refresh_lms_information(frm);
    },
    
    custom_circuit_id: function(frm) {
        refresh_lms_information(frm);
    }
});

function render_odoo_ui(frm) {
    // 1. Add a unique class to this form's wrapper to safely scope all CSS
    $(frm.wrapper).addClass('custom-installation-note-ui');

    // 2. Inject Google Font (Inter) if not present
    if (!$('#odoo_google_font').length) {
        $('head').append('<link id="odoo_google_font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">');
    }

    // 3. Inject Scoped Styles for Installation Note only
    if (!$('#installation_note_ui_styles').length) {
        $('head').append(`
            <style id="installation_note_ui_styles">
                /* Odoo Form Sheet and Layout Styling */
                .custom-installation-note-ui .form-layout, 
                .custom-installation-note-ui .odoo-form-sheet {
                    background: #f9fafb !important;
                    box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03) !important;
                    border-radius: 10px !important;
                    border: 1px solid #e5e7eb !important;
                    padding: 28px 32px !important;
                    margin-top: 16px !important;
                    margin-bottom: 32px !important;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                }

                /* Odoo Form Tabs Styling — Premium Enterprise Tab Bar */
                .custom-installation-note-ui .form-tabs {
                    border: none !important;
                    border-bottom: none !important;
                    margin-bottom: 4px !important;
                    background: linear-gradient(135deg, #f3f1f9 0%, #ece9f4 100%) !important;
                    padding: 6px 8px !important;
                    border-radius: 10px !important;
                    box-shadow: inset 0 1px 3px rgba(113, 99, 158, 0.08) !important;
                    overflow: hidden !important;
                    max-height: 48px !important;
                    scrollbar-width: none !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 4px !important;
                }
                .custom-installation-note-ui .form-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-installation-note-ui .form-tabs .nav-tabs {
                    border: none !important;
                    border-bottom: none !important;
                    margin-bottom: 0px !important;
                    padding-left: 0 !important;
                    overflow: visible !important;
                    scrollbar-width: none !important;
                    gap: 4px !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .custom-installation-note-ui .form-tabs .nav-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-installation-note-ui .form-tab-content, 
                .custom-installation-note-ui .tab-content, 
                .custom-installation-note-ui .form-tab-pane, 
                .custom-installation-note-ui .tab-pane {
                    border: none !important;
                    margin-top: 0px !important;
                    padding-top: 0px !important;
                }

                .custom-installation-note-ui .form-tabs .nav-link {
                    color: #5b5580 !important;
                    font-weight: 700 !important;
                    font-size: 12.5px !important;
                    padding: 8px 12px !important;
                    border: none !important;
                    border-radius: 7px !important;
                    background: transparent !important;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    letter-spacing: 0.015em !important;
                    font-family: 'Inter', sans-serif !important;
                    margin-bottom: 0 !important;
                    white-space: nowrap !important;
                }

                .custom-installation-note-ui .form-tabs .nav-link:hover {
                    color: #3d3566 !important;
                    background: rgba(113, 99, 158, 0.08) !important;
                    border: none !important;
                }

                .custom-installation-note-ui .form-tabs .nav-link.active {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #7b6daa 0%, #635490 100%) !important;
                    border: none !important;
                    font-weight: 700 !important;
                    box-shadow: 0 2px 8px rgba(113, 99, 158, 0.3) !important;
                }

                /* Odoo Section Headings (Subheadings) */
                .custom-installation-note-ui .form-section { 
                    border: none !important; 
                    border-top: none !important; 
                    border-bottom: none !important; 
                    margin-top: 0 !important; 
                    padding-top: 0 !important; 
                }
                .custom-installation-note-ui .form-section .section-head {
                    font-size: 13.5px !important;
                    font-weight: 700 !important;
                    color: #1e293b !important;
                    background-color: #f6f5fa !important;
                    border-left: 3px solid #71639e !important;
                    border-bottom: none !important;
                    padding: 10px 16px !important;
                    margin-top: 24px !important;
                    margin-bottom: 20px !important;
                    border-radius: 0 6px 6px 0 !important;
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: 0.01em !important;
                }
                .custom-installation-note-ui .form-section:first-child .section-head {
                    margin-top: 4px !important;
                }

                /* Ensure all form inputs, selects, and textareas have consistent font family and underline style */
                .custom-installation-note-ui input[type="text"],
                .custom-installation-note-ui input[type="number"],
                .custom-installation-note-ui input[type="email"],
                .custom-installation-note-ui input[type="password"],
                .custom-installation-note-ui input[type="tel"],
                .custom-installation-note-ui select,
                .custom-installation-note-ui textarea,
                .custom-installation-note-ui .frappe-control input[type="text"],
                .custom-installation-note-ui .frappe-control input[type="number"],
                .custom-installation-note-ui .frappe-control input[type="email"],
                .custom-installation-note-ui .frappe-control input[type="password"],
                .custom-installation-note-ui .frappe-control input[type="tel"],
                .custom-installation-note-ui .frappe-control select,
                .custom-installation-note-ui .frappe-control textarea,
                .custom-installation-note-ui input[readonly]:not([type="checkbox"]):not([type="radio"]),
                .custom-installation-note-ui input[disabled]:not([type="checkbox"]):not([type="radio"]),
                .custom-installation-note-ui .control-value:not([type="checkbox"]):not([type="radio"]),
                .custom-installation-note-ui .like-disabled-input:not([type="checkbox"]):not([type="radio"]) {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    font-weight: 400 !important;
                    font-size: 13px !important;
                    color: #1e293b !important;
                    background-color: transparent !important;
                    border-top: none !important;
                    border-left: none !important;
                    border-right: none !important;
                    border-bottom: 1px solid #e5e7eb !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    padding: 7px 10px !important;
                    height: auto !important;
                    min-height: 36px !important;
                    line-height: 1.5 !important;
                    white-space: normal !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    overflow: visible !important;
                    text-overflow: clip !important;
                    transition: border-bottom-color 0.2s ease !important;
                }
                
                .custom-installation-note-ui .frappe-control input::placeholder,
                .custom-installation-note-ui input::placeholder {
                    font-size: 12px !important;
                    color: #9ca3af !important;
                    font-weight: 400 !important;
                    white-space: normal !important;
                    text-overflow: ellipsis !important;
                }
                
                .custom-installation-note-ui input[type="text"]:focus,
                .custom-installation-note-ui input[type="number"]:focus,
                .custom-installation-note-ui input[type="email"]:focus,
                .custom-installation-note-ui input[type="password"]:focus,
                .custom-installation-note-ui input[type="tel"]:focus,
                .custom-installation-note-ui select:focus,
                .custom-installation-note-ui textarea:focus,
                .custom-installation-note-ui .frappe-control input[type="text"]:focus,
                .custom-installation-note-ui .frappe-control input[type="number"]:focus,
                .custom-installation-note-ui .frappe-control input[type="email"]:focus,
                .custom-installation-note-ui .frappe-control input[type="password"]:focus,
                .custom-installation-note-ui .frappe-control input[type="tel"]:focus,
                .custom-installation-note-ui .frappe-control select:focus,
                .custom-installation-note-ui .frappe-control textarea:focus {
                    border-bottom: 1px solid #e5e7eb !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                    outline: none !important;
                }

                /* Hardware-Accelerated Center-Out Animation */
                .custom-installation-note-ui .control-input {
                    position: relative;
                }
                .custom-installation-note-ui .control-input::after {
                    content: "";
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background-color: #4f46e5; /* Indigo 600 */
                    transform: scaleX(0);
                    transform-origin: center;
                    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    pointer-events: none;
                    z-index: 3;
                }
                .custom-installation-note-ui .control-input:focus-within::after {
                    transform: scaleX(1) !important;
                }

                /* Odoo Horizontal Field Layout: Label on Left, Input on Right */
                .custom-installation-note-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 22px !important;
                }
                
                /* Standard / 2-Column Layout Label Width */
                .custom-installation-note-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 210px !important;
                    min-width: 210px !important;
                    margin-bottom: 0 !important;
                    padding-right: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                }

                /* 3-Column / Compact Layout Label Width */
                .custom-installation-note-ui .form-column.col-sm-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-installation-note-ui .form-column.col-md-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-installation-note-ui .form-column.col-sm-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-installation-note-ui .form-column.col-md-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 110px !important;
                    min-width: 110px !important;
                    padding-right: 8px !important;
                }

                .custom-installation-note-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix .control-label {
                    font-weight: 700 !important;
                    font-size: 12.5px !important;
                    color: #1e293b !important;
                    margin-bottom: 0 !important;
                    padding-bottom: 0 !important;
                    line-height: 1.3 !important;
                    text-align: left !important;
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: 0.01em !important;
                }
                
                /* Apply bold styling to text field labels without inline layout constraints */
                .custom-installation-note-ui .frappe-control[data-fieldtype="Small Text"] .form-group .clearfix .control-label,
                .custom-installation-note-ui .frappe-control[data-fieldtype="Text"] .form-group .clearfix .control-label,
                .custom-installation-note-ui .frappe-control[data-fieldtype="Long Text"] .form-group .clearfix .control-label,
                .custom-installation-note-ui .frappe-control[data-fieldtype="Text Editor"] .form-group .clearfix .control-label {
                    font-weight: 700 !important;
                    font-size: 12.5px !important;
                    color: #1e293b !important;
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: 0.01em !important;
                }

                .custom-installation-note-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .control-input-wrapper {
                    flex: 1 !important;
                    width: 100% !important;
                }
                
                /* Style read-only / display fields similarly */
                .custom-installation-note-ui .frappe-control:not([data-fieldtype="Check"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .disp-area:not(.checkbox .disp-area) {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    font-weight: 500 !important;
                    font-size: 13.5px !important;
                    color: #475569 !important;
                    padding: 8px 0 !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }
            .custom-installation-note-ui .btn-secondary {
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                border: 1px solid #e2e8f0 !important;
                background-color: #ffffff !important;
                color: #475569 !important;
            }
            .custom-installation-note-ui .btn-secondary:hover {
                background-color: #f8fafc !important;
                color: #0f172a !important;
                border-color: #cbd5e1 !important;
            }
        </style>
    `);
    }
}

function inject_guidelines_button(frm) {
    if ($('#smart_btn_inst_guidelines').length === 0) {
        let section = frm.get_field('installation_note') || frm.get_field('installation_note_section') || frm.get_field('branch_information');
        let $wrapper;
        
        if (section && section.wrapper) {
            $wrapper = $(section.wrapper);
        } else {
            // Fallback to the first form section that has a heading
            $wrapper = $(frm.wrapper).find('.form-section').filter(function() {
                return $(this).find('.form-section-heading, .section-head').length > 0;
            }).first();
        }

        if ($wrapper.length === 0) {
            $wrapper = $(frm.wrapper).find('.form-section').first();
        }

        let $head = $wrapper.find('.form-section-heading, .section-head').first();
        if ($head.length === 0) {
            $head = $wrapper.find('h4, div.section-head, div').filter(function () {
                let text = $(this).text().toLowerCase();
                return text.includes('installation') || text.includes('information') || text.includes('branch');
            }).first();
        }
        if ($head.length === 0) $head = $wrapper;

        $head.css({ 'position': 'relative', 'display': 'flex', 'align-items': 'center' });
        let guidelinesBtnHtml = `
                <button class="odoo-smart-btn" id="smart_btn_inst_guidelines" title="Installation Note Guidelines" style="position: absolute; right: 24px; top: 50%; transform: translateY(-50%); z-index: 10; background: #ffffff; border: 1px solid #e2e0ea; border-radius: 10px; padding: 5px 14px; color: #334155; display: flex; align-items: center; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 1px 2px rgba(0,0,0,0.04);" onmouseover="this.style.transform='translateY(-50%) translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';" onmouseout="this.style.transform='translateY(-50%)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.04)';">
                    <i class="fa fa-book" style="color: #7768A5; font-size: 21px; margin-right: 9px;"></i>
                    <div style="text-align: left; line-height: 1.2;">
                        <span style="font-size: 11.5px; color: #64748b; text-transform: uppercase; display: block;">Guidelines</span>
                        <span style="font-weight: 700; color: #0f172a;">Installation Note</span>
                    </div>
                </button>
            `;
        $head.append(guidelinesBtnHtml);

        $('#smart_btn_inst_guidelines').off('click').on('click', function (e) {
            e.stopPropagation();
            if (typeof show_installation_note_guidelines === 'function') {
                show_installation_note_guidelines();
            }
        });
    }
}

function show_installation_note_guidelines() {
    let htmlContent = `
        <div id="custom_inst_guidelines_modal" style="
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        ">
            <div class="custom-guidelines-modal-content" style="
                background: #ffffff;
                border-radius: 16px;
                width: 650px;
                max-width: 90vw;
                max-height: 85vh;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                transform: scale(0.95) translateY(10px);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
                position: relative;
                font-family: 'Outfit', 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
            ">
                <!-- Header -->
                <div style="
                    padding: 24px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                ">
                    <div style="
                        width: 44px;
                        height: 44px;
                        border-radius: 10px;
                        background: rgba(119, 104, 165, 0.1);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fa fa-book" style="color: #7768A5; font-size: 22px;"></i>
                    </div>
                    <div>
                        <h3 style="font-weight: 800; margin: 0; color: #0f172a; font-size: 17px; font-family: 'Outfit', 'Inter', sans-serif;">Installation Note Guidelines</h3>
                        <span style="font-size: 12px; color: #64748b; font-weight: 500; display: block; margin-top: 2px;">Official operational standards for Installation and Commissioning</span>
                    </div>
                </div>

                <!-- Close Button -->
                <button id="close_inst_guidelines_modal" style="
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
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                ">
                    <!-- Card 1: Review -->
                    <div style="background: #f8fafc; border-left: 4px solid #7768A5; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-info-circle" style="color: #7768A5; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">1. LMS & Project Review</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Verify that the <strong>LMS details</strong> perfectly match the customer's requirement.</li>
                            <li>Ensure the bandwidth and media type are correct and ready for deployment.</li>
                        </ul>
                    </div>

                    <!-- Card 2: Attached Items -->
                    <div style="background: #f8fafc; border-left: 4px solid #eab308; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-cube" style="color: #eab308; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">2. Installed Items</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Cross-check the <strong>Installed Items</strong> table to ensure all delivered equipment is properly accounted for.</li>
                            <li>Verify that serial numbers and models match the physical deployment.</li>
                        </ul>
                    </div>

                    <!-- Card 3: Attachments -->
                    <div style="background: #f8fafc; border-left: 4px solid #10b981; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-camera" style="color: #10b981; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">3. Attachments & Proof</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>High-quality images of the installation must be uploaded.</li>
                            <li>Toggle the <strong>Visible to Customer</strong> checkbox appropriately for sensitive configurations or diagrams.</li>
                        </ul>
                    </div>
                </div>

                <!-- Footer -->
                <div style="
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                ">
                    <button id="close_inst_guidelines_modal_btn" style="
                        background: #7768A5;
                        color: #ffffff;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 8px;
                        font-weight: 700;
                        font-size: 13px;
                        cursor: pointer;
                        box-shadow: 0 2px 4px rgba(119, 104, 165, 0.2);
                        transition: opacity 0.2s;
                    " onmouseover="this.style.opacity='0.9';" onmouseout="this.style.opacity='1';">Close Guidelines</button>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal to prevent duplicates
    $('#custom_inst_guidelines_modal').remove();
    $('body').append(htmlContent);

    let $modal = $('#custom_inst_guidelines_modal');

    // Trigger entrance animation
    setTimeout(() => {
        $modal.css('opacity', '1');
        $modal.find('.custom-guidelines-modal-content').css('transform', 'scale(1) translateY(0)');
    }, 10);

    // Close logic
    let closeModal = function () {
        $modal.css('opacity', '0');
        $modal.find('.custom-guidelines-modal-content').css('transform', 'scale(0.95) translateY(10px)');
        setTimeout(() => $modal.remove(), 300);
    };

    $('#close_inst_guidelines_modal, #close_inst_guidelines_modal_btn').on('click', closeModal);
    $modal.on('click', function (e) {
        if (e.target.id === 'custom_inst_guidelines_modal') closeModal();
    });
}

function add_provisioning_attachment_button(frm) {
    // Prevent duplicate button
    if (frm.page.wrapper.find('.btn-provisioning-attachments').length > 0) return;

    // Floating action button (FAB) fixed at the bottom right of the screen
    let $btn = $(`<button class="btn btn-provisioning-attachments" style="position: fixed; bottom: 40px; right: 40px; z-index: 1030; border-radius: 30px; border: none; color: white; background: #6A5B98; font-weight: bold; font-size: 13px; cursor: pointer; padding: 12px 24px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 8px;">
        <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        Provisioning Attachment
    </button>`);

    frm.page.wrapper.append($btn);

    // Dynamic hover animations
    $btn.on('mouseenter', function() { 
        $(this).css({'transform': 'translateY(-4px)', 'box-shadow': '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.15)'}); 
    });
    $btn.on('mouseleave', function() { 
        $(this).css({'transform': 'translateY(0)', 'box-shadow': '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.15)'}); 
    });

    $btn.on("click", function () {
        open_provisioning_gallery(frm);
    });
}

let gallery_overlay = null;
let lightbox = null;
let move_popup = null;
let crop_overlay = null;

function open_provisioning_gallery(frm) {
    if (!frm.doc.custom_circuit_id) {
        frappe.msgprint("Circuit ID is missing.");
        return;
    }

    frappe.call({
        method: "nexapp.api.get_provisioning_attachments_for_gallery",
        args: {
            circuit_id: frm.doc.custom_circuit_id
        },
        freeze: true,
        freeze_message: "Loading Images...",
        callback: function (r) {
            if (r.message && r.message.provisioning_id) {
                render_gallery_overlay(frm, r.message.attachments, r.message.provisioning_id);
            } else {
                frappe.msgprint("No Provisioning document found for this Circuit ID.");
            }
        }
    });
}

function render_gallery_overlay(frm, attachments, provisioning_id) {
    if (gallery_overlay) gallery_overlay.remove();
    if (lightbox) lightbox.remove();
    if (move_popup) move_popup.remove();
    if (crop_overlay) crop_overlay.remove();

    let html = `
        <div id="provisioning-gallery-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px);">
            <div style="width: 96vw; height: 95vh; background: #f9fafb; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                
                <div style="padding: 15px 30px; background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                    <div>
                        <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">Installation photographs | Customer Name : ${frm.doc.customer || 'Unknown'}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Circuit Id: ${frm.doc.circuit_id || frm.doc.custom_circuit_id} | ${provisioning_id}</p>
                    </div>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        ${attachments.length > 20 ? `<input type="text" id="gallery-search" class="form-control input-sm" placeholder="Search images..." style="width: 250px; border-radius: 20px;">` : ''}
                        <button class="btn btn-default btn-sm" id="btn-close-gallery" style="border-radius: 20px; padding: 4px 15px;">Close</button>
                    </div>
                </div>

                <div style="padding: 30px; flex: 1; overflow-y: auto; max-width: 1200px; margin: 0 auto; width: 100%;">
                    ${attachments.length === 0 ? `
                        <div style="text-align: center; padding: 60px; color: #6b7280; font-size: 16px;">
                            No attachments found in the related Provisioning document.
                        </div>
                    ` : `
                        <div id="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px;">
                            ${attachments.map(att => `
                                <div class="gallery-card" data-name="${att.name}" data-label="${(att.select_mqjl || '').toLowerCase()}" data-viewed="false" style="background: #000000; border: 1px solid #374151; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                                    
                                    <div style="padding: 6px 10px; background: #000000; display: flex; justify-content: flex-end; gap: 6px;">
                                        <button class="btn-trigger-crop icon-btn" data-name="${att.name}" data-url="${att.attachment}">
                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>
                                            <span class="btn-text">Crop</span>
                                        </button>
                                        <button class="btn-trigger-move icon-btn btn-blue" data-name="${att.name}" data-type="${att.select_mqjl || ''}" style="opacity: 0.5; filter: grayscale(100%); transition: all 0.3s;">
                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
                                            <span class="btn-text">Move</span>
                                        </button>
                                    </div>

                                    <div class="gallery-img-container" style="height: 150px; background: #1f2937; position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; border-top: 1px solid #374151; border-bottom: 1px solid #374151;">
                                        <div class="loader" style="width: 24px; height: 24px; border: 2px solid #374151; border-top-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                        <img src="${att.attachment}" style="width: 100%; height: 100%; object-fit: cover; display: none;" onload="this.style.display='block'; this.previousElementSibling.style.display='none';" onerror="this.previousElementSibling.style.display='none';">
                                    </div>

                                    <div style="padding: 10px; background: #000000; text-align: center;" title="${att.attachment ? att.attachment.split('/').pop() : ''}">
                                        <div style="font-size: 13px; font-weight: 600; color: #f9fafb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            ${att.select_mqjl || 'Attachment'}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <div style="padding: 12px 30px; background: white; border-top: 1px solid #e5e7eb; box-shadow: 0 -1px 4px rgba(0,0,0,0.05); z-index: 10;">
                    <p style="margin: 0; font-size: 14px; color: #4b5563; font-weight: 500; line-height: 1.5;">
                        Please review all images carefully. Crop and adjust them as needed, and ensure each image is updated to the correct attachment type. This is a very important part of the installation process and should be handled with special attention.
                    </p>
                </div>
            </div>
            <style>
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .gallery-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-color: #a855f7; }
                
                .icon-btn {
                    background: rgba(255, 255, 255, 0.95);
                    border: none;
                    border-radius: 20px;
                    height: 28px;
                    min-width: 28px;
                    padding: 0 7px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #4b5563;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .icon-btn.btn-blue {
                    background: #3b82f6;
                    color: white;
                    box-shadow: 0 2px 5px rgba(59,130,246,0.4);
                }
                .icon-btn:hover {
                    background: white;
                }
                .icon-btn.btn-blue:hover {
                    background: #2563eb;
                }
                .icon-btn .btn-text {
                    max-width: 0;
                    opacity: 0;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .icon-btn:hover {
                    padding: 0 12px;
                }
                .icon-btn:hover .btn-text {
                    max-width: 50px;
                    opacity: 1;
                    margin-left: 6px;
                }
                
                .cropper-container { z-index: 10005; }
            </style>
        </div>
    `;

    gallery_overlay = $(html).appendTo('body');

    // Lightbox for preview
    lightbox = $(`
        <div id="gallery-lightbox" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 10000; align-items: center; justify-content: center;">
            <img src="" style="max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <button id="close-lightbox" style="position: absolute; top: 30px; right: 40px; background: transparent; border: none; color: white; font-size: 40px; cursor: pointer; transition: transform 0.2s;">&times;</button>
        </div>
    `).appendTo('body');

    // Custom Move Popup
    move_popup = $(`
        <div id="move-popup-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10001; align-items: center; justify-content: center; backdrop-filter: blur(1px);">
            <div style="background: white; border-radius: 16px; padding: 24px; width: 380px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transform: scale(0.95); transition: transform 0.2s;">
                <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #1f2937; font-family: inherit;">Move Attachment?</h4>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #4b5563; line-height: 1.4;">Select the attachment type for this image before moving it to the Installation Note.</p>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 8px;">Attachment Type:</label>
                    <select id="move-attachment-type" class="form-control" style="width: 100%; border-radius: 8px; border: 1px solid #d1d5db; padding: 8px; height: auto;">
                        <option value="" disabled selected>Select an option</option>
                        <option value="IR Report">IR Report</option>
                        <option value="Server Rack Photo">Server Rack Photo</option>
                        <option value="Router Photo">Router Photo</option>
                        <option value="Testing Photo">Testing Photo</option>
                        <option value="Cable Labeling Photo">Cable Labeling Photo</option>
                        <option value="ISP Device Photo">ISP Device Photo</option>
                        <option value="Customer Acceptance Email">Customer Acceptance Email</option>
                    </select>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="btn-cancel-move" style="padding: 8px 16px; border-radius: 20px; border: 1px solid #d1d5db; background: white; color: #374151; cursor: pointer; font-weight: 500; font-size: 13px;">Cancel</button>
                    <button id="btn-confirm-move" style="padding: 8px 16px; border-radius: 20px; border: none; background: #3b82f6; color: white; cursor: pointer; font-weight: 500; font-size: 13px;">Move</button>
                </div>
            </div>
        </div>
    `).appendTo('body');

    // Crop Overlay
    crop_overlay = $(`
        <div id="crop-popup-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 10002; align-items: center; justify-content: center; flex-direction: column;">
            <div style="width: 80vw; height: 75vh; background: #000; position: relative; border-radius: 8px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
                <img id="crop-image-target" style="display: block; max-width: 100%;">
            </div>
            <div style="margin-top: 24px; display: flex; gap: 15px;">
                <button id="btn-cancel-crop" class="btn btn-default" style="border-radius: 20px; padding: 8px 24px; border: none; font-weight: 500;">Cancel</button>
                <button id="btn-save-crop" class="btn btn-primary" style="border-radius: 20px; padding: 8px 24px; font-weight: 500;">Save Cropped Image</button>
            </div>
        </div>
    `).appendTo('body');

    // Custom Alert Popup
    let alert_popup = $(`
        <div id="custom-alert-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10005; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: white; border-radius: 12px; width: 420px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); transform: scale(0.95); transition: transform 0.2s;">
                <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 18px; color: #111827; display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; background: #ea580c; border-radius: 50%;"></div>
                    Review Required
                    <button id="btn-close-custom-alert-x" style="margin-left: auto; background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280;">&times;</button>
                </h3>
                <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5; padding: 12px 0;">
                    Please preview the full image first before moving it.<br><br><b>Click the image</b> to preview it.
                </p>
                <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
                    <button id="btn-close-custom-alert" class="btn btn-primary btn-sm" style="border-radius: 8px; padding: 6px 16px; font-weight: 500; background: #3b82f6; color: white; border: none;">Okay</button>
                </div>
            </div>
        </div>
    `).appendTo('body');

    // Events
    $('#btn-close-gallery').on('click', () => {
        gallery_overlay.remove();
        lightbox.remove();
        move_popup.remove();
        crop_overlay.remove();
        alert_popup.remove();
    });

    $('#close-lightbox').on('click', () => {
        lightbox.css('display', 'none');
    });

    $('#btn-close-custom-alert, #btn-close-custom-alert-x').on('click', () => {
        alert_popup.find('div').first().css('transform', 'scale(0.95)');
        setTimeout(() => { alert_popup.css('display', 'none'); }, 150);
    });

    $('#close-lightbox').on('mouseenter', function () { $(this).css('transform', 'scale(1.1)'); });
    $('#close-lightbox').on('mouseleave', function () { $(this).css('transform', 'scale(1)'); });

    $('.gallery-img-container').on('click', function (e) {
        if ($(e.target).closest('button').length) return;
        let src = $(this).find('img').attr('src');
        if (src) {
            lightbox.find('img').attr('src', src);
            lightbox.css('display', 'flex');

            // Mark as viewed
            let card = $(this).closest('.gallery-card');
            if (card.attr('data-viewed') !== "true") {
                card.attr('data-viewed', "true");

                // Make move button active
                let move_btn = card.find('.btn-trigger-move');
                move_btn.css({ 'opacity': '1', 'filter': 'none' });

                // Add green tick indicator
                $(this).append(`
                    <div style="position: absolute; bottom: 8px; right: 8px; background: #10b981; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 5;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                `);
            }
        }
    });

    $('#gallery-search').on('input', function () {
        let val = $(this).val().toLowerCase();
        $('.gallery-card').each(function () {
            let label = $(this).data('label');
            if (label.includes(val)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    // --- MOVE LOGIC ---
    let current_moving_attachment = null;

    $('.btn-trigger-move').on('click', function () {
        let card = $(this).closest('.gallery-card');
        if (card.attr('data-viewed') !== "true") {
            alert_popup.css('display', 'flex');
            setTimeout(() => { alert_popup.find('div').first().css('transform', 'scale(1)'); }, 10);
            return;
        }

        current_moving_attachment = $(this).data('name');

        // Always default to blank, forcing the user to manually select
        $('#move-attachment-type').val('');

        move_popup.css('display', 'flex');
        setTimeout(() => { move_popup.find('div').first().css('transform', 'scale(1)'); }, 10);
    });

    $('#btn-cancel-move').on('click', function () {
        move_popup.find('div').first().css('transform', 'scale(0.95)');
        setTimeout(() => { move_popup.css('display', 'none'); }, 200);
        current_moving_attachment = null;
    });

    $('#btn-confirm-move').on('click', function () {
        if (!current_moving_attachment) return;
        let selected_type = $('#move-attachment-type').val();

        if (!selected_type) {
            frappe.msgprint({ title: 'Required', indicator: 'orange', message: 'Please select an Attachment Type before moving.' });
            return;
        }

        frappe.call({
            method: "nexapp.api.move_single_provisioning_attachment_to_installation",
            args: {
                installation_note_name: frm.doc.name,
                provisioning_attachment_name: current_moving_attachment,
                attachment_type: selected_type
            },
            freeze: true,
            freeze_message: "Moving Attachment...",
            callback: function (r) {
                if (r.message && r.message.status === 'success') {
                    frappe.show_alert({ message: r.message.message, indicator: 'green' });

                    // Remove the card from the UI
                    $(`.gallery-card[data-name="${current_moving_attachment}"]`).fadeOut(300, function () {
                        $(this).remove();
                    });

                    // Close popup
                    $('#btn-cancel-move').click();

                    frm.reload_doc();
                } else if (r.message && r.message.status === 'error') {
                    frappe.msgprint(r.message.message);
                    $('#btn-cancel-move').click();
                }
            }
        });
    });

    // --- CROP LOGIC ---
    let cropper_instance = null;
    let current_crop_attachment = null;

    $('.btn-trigger-crop').on('click', function (e) {
        e.stopPropagation();
        let url = $(this).data('url');
        current_crop_attachment = $(this).data('name');

        $('#crop-image-target').attr('src', url);
        crop_overlay.css('display', 'flex');

        frappe.require('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css');
        frappe.require('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js', function () {
            if (cropper_instance) {
                cropper_instance.destroy();
            }
            let img_el = document.getElementById('crop-image-target');
            cropper_instance = new Cropper(img_el, {
                viewMode: 1,
                autoCropArea: 0.9,
                responsive: true,
                background: false
            });
        });
    });

    $('#btn-cancel-crop').on('click', function () {
        if (cropper_instance) {
            cropper_instance.destroy();
            cropper_instance = null;
        }
        $('#crop-image-target').attr('src', '');
        crop_overlay.css('display', 'none');
        current_crop_attachment = null;
    });

    $('#btn-save-crop').on('click', function () {
        if (!cropper_instance || !current_crop_attachment) return;

        let canvas = cropper_instance.getCroppedCanvas({
            maxWidth: 1920,
            maxHeight: 1920
        });

        if (!canvas) {
            frappe.msgprint("Could not crop image. Ensure the image is fully loaded.");
            return;
        }

        let base64_data = canvas.toDataURL('image/jpeg', 0.9);
        let filedata = base64_data.split(',')[1];
        let timestamp = frappe.datetime.now_datetime().replace(/[-:\s]/g, '');
        let filename = 'cropped_' + timestamp + '.jpg';

        frappe.call({
            method: "nexapp.api.save_cropped_provisioning_attachment",
            args: {
                provisioning_attachment_name: current_crop_attachment,
                filedata: filedata,
                filename: filename
            },
            freeze: true,
            freeze_message: "Saving cropped image...",
            callback: function (r) {
                if (r.message && r.message.status === 'success') {
                    frappe.show_alert({ message: r.message.message, indicator: 'green' });

                    // Update DOM image src
                    let card = $(`.gallery-card[data-name="${current_crop_attachment}"]`);
                    let img = card.find('img');
                    img.attr('src', r.message.file_url);
                    card.find('.btn-trigger-crop').data('url', r.message.file_url);

                    if (r.message.new_name) {
                        card.attr('data-name', r.message.new_name);
                        card.find('.btn-trigger-crop').data('name', r.message.new_name);
                        card.find('.btn-trigger-move').data('name', r.message.new_name);
                    }

                    $('#btn-cancel-crop').click();
                } else {
                    frappe.msgprint(r.message ? r.message.message : "Failed to save cropped image.");
                }
            }
        });
    });
}

// --- START VIRTUAL INSTALLED ITEMS HELPER FUNCTIONS ---
async function render_installed_items_table(frm) {
    let wrapper = frm.fields_dict['custom_virtual_installed_item'].wrapper;
    
    let circuit_id = frm.doc.circuit_id || frm.doc.custom_circuit_id;
    if (!circuit_id) {
        $(wrapper).html('<div class="text-muted" style="padding: 10px; text-align: center;">No Circuit ID found to link a Delivery Note.</div>');
        return;
    }

    $(wrapper).html('<div class="text-muted" style="padding: 10px; text-align: center;">Loading serialized items...</div>');

    try {
        // Find submitted Delivery Note matching the Circuit ID
        let r = await frappe.db.get_value("Delivery Note", {
            "custom_dn_circuit_id": circuit_id,
            "docstatus": 1
        }, "name");

        let delivery_note_no = r && r.message ? r.message.name : null;

        if (!delivery_note_no) {
            $(wrapper).html('<div class="text-muted" style="padding: 10px; text-align: center;">No submitted Delivery Note found for this Circuit ID.</div>');
            return;
        }

        let items = await get_installed_items(delivery_note_no);
        
        if (!items || items.length === 0) {
            $(wrapper).html('<div class="text-muted" style="padding: 15px; text-align: center; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db;">No serialized installed items found.</div>');
            return;
        }

        let html = `
            <div class="frappe-control" style="margin-bottom: 15px;">
                <div class="table-responsive" style="border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <table class="table table-bordered table-hover" style="margin: 0; background: white; width: 100%;">
                        <thead style="background-color: #f3f4f6;">
                            <tr>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">Item Name</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">Serial No</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">Mobile No/ IOT</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: center;">Installed Qty</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        items.forEach(item => {
            html += `
                <tr>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${item.item_name}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #4b5563; font-family: monospace; text-align: left;">${item.serial_no}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${item.mobile_no || ''}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: center; font-weight: 500;">${item.qty}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        $(wrapper).html(html);

        // Update the native child table 'items' to pass ERPNext backend validation
        // We do this because if the field is hidden in customize form, it gets cleared on save.
        // We only do this if it's empty to prevent making the form "dirty" on every refresh.
        if (!frm.doc.items || frm.doc.items.length === 0) {
            frm.clear_table('items');
            items.forEach(item => {
                let row = frm.add_child('items');
                row.item_code = item.item_code;
                row.qty = item.qty;
                row.description = item.description || item.item_name;
                row.serial_no = item.serial_no;
                row.prevdoc_doctype = "Delivery Note";
                row.prevdoc_docname = item.prevdoc_docname;
                row.prevdoc_detail_docname = item.prevdoc_detail_docname;
            });
            frm.refresh_field('items');
        }

    } catch (e) {
        console.error(e);
        $(wrapper).html('<div class="text-danger" style="padding: 10px; text-align: center;">Error loading items.</div>');
    }
}

async function get_installed_items(delivery_note_no) {
    // Step 1: Fetch Delivery Note
    let dn = await frappe.db.get_doc("Delivery Note", delivery_note_no);
    if (!dn) return [];

    let final_items = [];

    // Step 2: Check Packed Items
    if (dn.packed_items && dn.packed_items.length > 0) {
        for (let item of dn.packed_items) {
            let serials = await get_serial_numbers(item);
            if (serials && serials.length > 0) {
                serials.forEach(sn => {
                    final_items.push({
                        item_code: item.item_code,
                        item_name: item.item_name || item.item_code,
                        description: item.description,
                        serial_no: sn,
                        qty: 1,
                        prevdoc_doctype: "Delivery Note",
                        prevdoc_docname: delivery_note_no,
                        prevdoc_detail_docname: item.name
                    });
                });
            }
        }
    } else if (dn.items && dn.items.length > 0) {
        // Step 3: Use Delivery Note Items if no Packed Items
        for (let item of dn.items) {
            let serials = await get_serial_numbers(item);
            if (serials && serials.length > 0) {
                serials.forEach(sn => {
                    final_items.push({
                        item_code: item.item_code,
                        item_name: item.item_name || item.item_code,
                        description: item.description,
                        serial_no: sn,
                        qty: 1,
                        prevdoc_doctype: "Delivery Note",
                        prevdoc_docname: delivery_note_no,
                        prevdoc_detail_docname: item.name
                    });
                });
            }
        }
    }
    
    // Deduplicate serials (Avoid duplicate serial numbers in the final display)
    let seen_serials = new Set();
    let unique_final_items = [];
    
    for (let item of final_items) {
        if (!seen_serials.has(item.serial_no)) {
            seen_serials.add(item.serial_no);
            unique_final_items.push(item);
        }
    }

    // Fetch Mobile No/ IOT for Simcard items
    for (let item of unique_final_items) {
        item.mobile_no = "";
        if (item.item_name && item.item_name.toLowerCase().includes('simcard')) {
            try {
                let r = await frappe.db.get_value("Serial No", item.serial_no, "custom_mobile_no");
                if (r && r.message && r.message.custom_mobile_no) {
                    item.mobile_no = r.message.custom_mobile_no;
                }
            } catch (err) {
                console.error("Failed to fetch mobile no for serial", item.serial_no, err);
            }
        }
    }

    return unique_final_items;
}

async function get_serial_numbers(item) {
    let serials = [];

    // Handle string based serial_no
    if (item.serial_no) {
        let parts = item.serial_no.split('\n').map(s => s.trim()).filter(s => s);
        serials = serials.concat(parts);
    }

    // Handle Serial and Batch Bundle
    if (item.serial_and_batch_bundle) {
        let sbb_doc = await frappe.db.get_doc("Serial and Batch Bundle", item.serial_and_batch_bundle);
        if (sbb_doc && sbb_doc.entries && sbb_doc.entries.length > 0) {
            sbb_doc.entries.forEach(entry => {
                if (entry.serial_no) {
                    serials.push(entry.serial_no);
                }
            });
        }
    }

    return serials;
}
// --- END VIRTUAL INSTALLED ITEMS HELPER FUNCTIONS ---

// --- START VIRTUAL LMS INFORMATION TABLE ---
function refresh_lms_information(frm) {
    if (frm.fields_dict['custom_virtual_lms_item']) {
        render_lms_table(frm);
    }
}

async function render_lms_table(frm) {
    let wrapper = frm.fields_dict['custom_virtual_lms_item'].wrapper;
    let circuit_id = frm.doc.circuit_id || frm.doc.custom_circuit_id;

    if (!circuit_id) {
        $(wrapper).html('<div class="text-muted" style="padding: 10px; text-align: center;">Please select a Circuit ID.</div>');
        return;
    }

    $(wrapper).html('<div class="text-muted" style="padding: 10px; text-align: center;">Loading LMS information...</div>');

    try {
        let lms_records = await get_lms_data(circuit_id);

        if (!lms_records || lms_records.length === 0) {
            $(wrapper).html('<div class="text-muted" style="padding: 15px; text-align: center; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db;">No Delivered LMS records found for this Circuit ID.</div>');
            return;
        }

        let html = `
            <div class="frappe-control" style="margin-bottom: 15px;">
                <div class="table-responsive" style="border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <table class="table table-bordered table-hover" style="margin: 0; background: white; width: 100%;">
                        <thead style="background-color: #f3f4f6;">
                            <tr>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">LMS ID</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">Supplier</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">LMS Delivery Date</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">Billing Start Date</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">Bandwidth Type</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">LMS Bandwidth Name</th>
                                <th style="font-size: 12px; font-weight: 600; color: #374151; padding: 10px 15px; text-align: left;">Media</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        lms_records.forEach((record, index) => {
            let row_bg = index % 2 === 0 ? "#ffffff" : "#f9fafb";
            html += `
                <tr style="background-color: ${row_bg};">
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${record.name || ''}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${record.supplier || ''}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${frappe.datetime.str_to_user(record.lms_delivery_date) || ''}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${frappe.datetime.str_to_user(record.billing_start_date) || ''}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${record.bandwith_type || ''}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${record.lms_brandwith_name || ''}</td>
                    <td style="padding: 10px 15px; vertical-align: middle; font-size: 13px; color: #111827; text-align: left;">${record.media || ''}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        $(wrapper).html(html);

    } catch (e) {
        console.error("LMS Information Fetch Error:", e);
        $(wrapper).html('<div class="text-danger" style="padding: 10px; text-align: center;">Unable to load LMS information.</div>');
    }
}

async function get_lms_data(circuit_id) {
    let records = await frappe.db.get_list("Lastmile Services Master", {
        filters: {
            "circuit_id": circuit_id,
            "lms_stage": "Delivered"
        },
        fields: [
            "name",
            "supplier",
            "lms_delivery_date",
            "billing_start_date",
            "bandwith_type",
            "lms_brandwith_name",
            "media"
        ],
        order_by: "lms_delivery_date desc"
    });
    return records;
}
// --- END VIRTUAL LMS INFORMATION TABLE ---
