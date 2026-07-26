frappe.ui.form.on('Interview', {
    refresh: function(frm) {
        render_odoo_ui(frm);
        if(frm.doc.job_applicant) { setup_interview_ai_evaluation(frm); }
    },
    onload: function(frm) {
        // Auto-collapse the sidebar on initial load immediately to prevent flicker
        let sidebar_toggle = $(".page-head").find(".sidebar-toggle-btn");
        let sidebar_wrapper = frm.page.wrapper.find(".layout-side-section");
        if (sidebar_wrapper.is(":visible") && sidebar_toggle.length > 0) {
            // Setting display none directly to avoid the CSS transition animation delay, then updating the state
            sidebar_wrapper.hide();
            frm.page.update_sidebar_icon();
        }
        
        render_odoo_ui(frm);
    }
});

function render_odoo_ui(frm) {
    // 1. Add a unique class to this form's wrapper to safely scope all CSS
    $(frm.wrapper).addClass('custom-interview-ui');
    setup_cv_preview(frm);
    
    // Force Small Text fields to look identical to Data fields
    function fix_small_text_fields() {
        $.each(frm.fields_dict, function(fieldname, field) {
            if (field.df && field.df.fieldtype === 'Small Text' && field.$input && field.$input.length) {
                let ta = field.$input[0];

                // Remove cols attribute which forces a wider width
                ta.removeAttribute('cols');

                // Get label width so we can calculate remaining space
                let $label = field.$input.closest('.form-group').find('.control-label, label').first();
                let labelW = $label.length ? $label.outerWidth(true) : 0;

                // Get the parent column width
                let $col = field.$input.closest('[class*="col-"]');
                let colW = $col.length ? $col.innerWidth() : field.$input.closest('.form-group').innerWidth();

                // Set textarea width to fill the column just like a Data input does
                let targetW = colW - labelW - 20; // 20px for padding
                if (targetW > 50) {
                    ta.style.setProperty('width', targetW + 'px', 'important');
                    ta.style.setProperty('max-width', targetW + 'px', 'important');
                }

                ta.setAttribute('rows', '1');
                ta.style.setProperty('overflow', 'hidden', 'important');
                ta.style.setProperty('resize', 'none', 'important');
                ta.style.setProperty('min-height', '38px', 'important');
                ta.style.setProperty('max-height', 'none', 'important');
                ta.style.setProperty('box-sizing', 'border-box', 'important');

                if (field.$input.val() && field.$input.val().trim()) {
                    ta.style.setProperty('height', '0px', 'important');
                    ta.style.setProperty('height', ta.scrollHeight + 'px', 'important');
                } else {
                    ta.style.setProperty('height', '38px', 'important');
                }
            }
        });
    }
    setTimeout(fix_small_text_fields, 300);
    setTimeout(fix_small_text_fields, 1000);

    // Bind input event once for auto-expand on typing
    if (!frm.textarea_auto_resize_injected) {
        $(frm.wrapper).on('input', 'textarea', function() {
            let $ctrl = $(this).closest('.frappe-control');
            let fieldtype = $ctrl.attr('data-fieldtype');
            if (fieldtype === 'Small Text') {
                this.style.setProperty('height', '0px', 'important');
                this.style.setProperty('height', this.scrollHeight + 'px', 'important');
            }
        });
        frm.textarea_auto_resize_injected = true;
    }
    
    // Add mandatory field styling class reliably on every refresh
    $.each(frm.fields_dict, function(fieldname, field) {
        if (field.df && field.df.reqd && field.$input) {
            field.$input.addClass('is-mandatory-field');
        } else if (field.$input) {
            field.$input.removeClass('is-mandatory-field');
        }
    });

    // 2. Inject Google Font (Inter) if not present
    if (!$('#odoo_google_font').length) {
        $('head').append('<link id="odoo_google_font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">');
    }

    // 3. Inject Scoped Styles for Interview only (remove old to pick up changes)
    $('#interview_ui_styles').remove();
    if (!$('#interview_ui_styles').length) {
        $('head').append(`
            <style id="interview_ui_styles">
                /* Premium Yellow Style for Interview Summary Dashboard */
                .custom-interview-ui .form-dashboard-section.custom {
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
                    border: 1px solid #fde68a !important;
                    box-shadow: 0 1px 3px rgba(251, 191, 36, 0.1) !important;
                    border-radius: 10px !important;
                }
                .custom-interview-ui .form-dashboard-section.custom .section-head {
                    color: #92400e !important;
                    font-weight: 600 !important;
                }
                .custom-interview-ui .form-dashboard-section.custom .section-body {
                    color: #b45309 !important;
                    font-weight: 500 !important;
                }

                /* Odoo Form Sheet and Layout Styling */
                .custom-interview-ui .form-layout, 
                .custom-interview-ui .odoo-form-sheet {
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
                .custom-interview-ui .form-tabs {
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
                .custom-interview-ui .form-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-interview-ui .form-tabs .nav-tabs {
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
                .custom-interview-ui .form-tabs .nav-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-interview-ui .form-tab-content, 
                .custom-interview-ui .tab-content, 
                .custom-interview-ui .form-tab-pane, 
                .custom-interview-ui .tab-pane {
                    border: none !important;
                    margin-top: 0px !important;
                    padding-top: 0px !important;
                }

                .custom-interview-ui .form-tabs .nav-link {
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

                .custom-interview-ui .form-tabs .nav-link:hover {
                    color: #3d3566 !important;
                    background: rgba(113, 99, 158, 0.08) !important;
                    border: none !important;
                }

                .custom-interview-ui .form-tabs .nav-link.active {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #7b6daa 0%, #635490 100%) !important;
                    border: none !important;
                    font-weight: 700 !important;
                    box-shadow: 0 2px 8px rgba(113, 99, 158, 0.3) !important;
                }

                /* Odoo Section Headings (Subheadings) */
                .custom-interview-ui .form-section { 
                    border: none !important; 
                    border-top: none !important; 
                    border-bottom: none !important; 
                    margin-top: 0 !important; 
                    padding-top: 0 !important; 
                }
                .custom-interview-ui .form-section .section-head {
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
                .custom-interview-ui .form-section:first-child .section-head {
                    margin-top: 4px !important;
                }

                /* Ensure all form inputs, selects, and textareas have consistent font family and underline style */
                .custom-interview-ui input[type="text"],
                .custom-interview-ui input[type="number"],
                .custom-interview-ui input[type="email"],
                .custom-interview-ui input[type="password"],
                .custom-interview-ui input[type="tel"],
                .custom-interview-ui select,
                .custom-interview-ui textarea,
                .custom-interview-ui .frappe-control input[type="text"],
                .custom-interview-ui .frappe-control input[type="number"],
                .custom-interview-ui .frappe-control input[type="email"],
                .custom-interview-ui .frappe-control input[type="password"],
                .custom-interview-ui .frappe-control input[type="tel"],
                .custom-interview-ui .frappe-control select,
                .custom-interview-ui .frappe-control textarea,
                .custom-interview-ui input[readonly]:not([type="checkbox"]):not([type="radio"]),
                .custom-interview-ui input[disabled]:not([type="checkbox"]):not([type="radio"]),
                .custom-interview-ui .control-value:not([type="checkbox"]):not([type="radio"]),
                .custom-interview-ui .like-disabled-input:not([type="checkbox"]):not([type="radio"]) {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    font-weight: 400 !important;
                    font-size: 13px !important;
                    color: #1e293b !important;
                    background-color: #f1f5f9 !important;
                    border: 1px solid #94a3b8 !important;
                    border-radius: 6px !important;
                    box-shadow: none !important;
                    padding: 8px 12px !important;
                    height: auto !important;
                    min-height: 38px !important;
                    line-height: 1.5 !important;
                    white-space: normal !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    overflow: visible !important;
                    text-overflow: clip !important;
                    transition: all 0.2s ease !important;
                }

                /* Make Small Text textarea same width as Data field inputs */
                .custom-interview-ui .frappe-control[data-fieldtype="Small Text"] .control-input {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                .custom-interview-ui .frappe-control[data-fieldtype="Small Text"] textarea {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 38px !important;
                    min-height: 38px !important;
                    resize: none !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                }

                .custom-interview-ui input.error-highlight,
                .custom-interview-ui select.error-highlight,
                .custom-interview-ui textarea.error-highlight,
                .custom-interview-ui .frappe-control input.error-highlight,
                .custom-interview-ui .frappe-control select.error-highlight,
                .custom-interview-ui .frappe-control textarea.error-highlight {
                    background-color: #fee2e2 !important;
                    border-bottom-color: #ef4444 !important;
                    border-bottom-width: 2px !important;
                }
                
                .custom-interview-ui .frappe-control input::placeholder,
                .custom-interview-ui input::placeholder {
                    font-size: 12px !important;
                    color: #9ca3af !important;
                    font-weight: 400 !important;
                    white-space: normal !important;
                    text-overflow: ellipsis !important;
                }
                
                .custom-interview-ui input[type="text"]:focus,
                .custom-interview-ui input[type="number"]:focus,
                .custom-interview-ui input[type="email"]:focus,
                .custom-interview-ui input[type="password"]:focus,
                .custom-interview-ui input[type="tel"]:focus,
                .custom-interview-ui select:focus,
                .custom-interview-ui textarea:focus,
                .custom-interview-ui .frappe-control input[type="text"]:focus,
                .custom-interview-ui .frappe-control input[type="number"]:focus,
                .custom-interview-ui .frappe-control input[type="email"]:focus,
                .custom-interview-ui .frappe-control input[type="password"]:focus,
                .custom-interview-ui .frappe-control input[type="tel"]:focus,
                .custom-interview-ui .frappe-control select:focus,
                .custom-interview-ui .frappe-control textarea:focus {
                    border: 1px solid #ee8d21 !important;
                    background-color: #ffffff !important;
                    box-shadow: 0 0 0 3px rgba(238, 141, 33, 0.15) !important;
                    outline: none !important;
                }
                
                /* Auto-resize textareas require overflow hidden to prevent scrollbar flash */
                .custom-interview-ui textarea {
                    overflow-y: hidden !important;
                    resize: none !important;
                }

                /* Odoo Horizontal Field Layout: Label on Left, Input on Right */
                .custom-interview-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 22px !important;
                }
                
                /* Standard / 2-Column Layout Label Width */
                .custom-interview-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 210px !important;
                    min-width: 210px !important;
                    margin-bottom: 0 !important;
                    padding-right: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                }

                /* 3-Column / Compact Layout Label Width */
                .custom-interview-ui .form-column.col-sm-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-interview-ui .form-column.col-md-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-interview-ui .form-column.col-sm-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-interview-ui .form-column.col-md-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 110px !important;
                    min-width: 110px !important;
                    padding-right: 8px !important;
                }

                .custom-interview-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix .control-label {
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
                .custom-interview-ui .frappe-control[data-fieldtype="Small Text"] .form-group .clearfix .control-label,
                .custom-interview-ui .frappe-control[data-fieldtype="Text"] .form-group .clearfix .control-label,
                .custom-interview-ui .frappe-control[data-fieldtype="Long Text"] .form-group .clearfix .control-label,
                .custom-interview-ui .frappe-control[data-fieldtype="Text Editor"] .form-group .clearfix .control-label {
                    font-weight: 700 !important;
                    font-size: 12.5px !important;
                    color: #1e293b !important;
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: 0.01em !important;
                }

                .custom-interview-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .control-input-wrapper {
                    flex: 1 !important;
                    width: 100% !important;
                }
                
                /* Style read-only / display fields similarly */
                .custom-interview-ui .frappe-control:not([data-fieldtype="Check"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .disp-area:not(.checkbox .disp-area) {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    font-weight: 500 !important;
                    font-size: 13.5px !important;
                    color: #475569 !important;
                    padding: 8px 0 !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }
            .custom-interview-ui .btn-secondary {
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                border: 1px solid #e2e8f0 !important;
                background-color: #ffffff !important;
                color: #475569 !important;
            }
            .custom-interview-ui .btn-secondary:hover {
                background-color: #f8fafc !important;
                color: #0f172a !important;
                border-color: #cbd5e1 !important;
            }
            
            /* Mandatory Field Red Left Border - MUST BE AT THE VERY END */
            .custom-interview-ui .frappe-control input.is-mandatory-field,
            .custom-interview-ui .frappe-control select.is-mandatory-field,
            .custom-interview-ui .frappe-control textarea.is-mandatory-field {
                border-left: 4px solid #ef4444 !important;
            }
        </style>
    `);
    }
}



function setup_interview_ai_evaluation(frm) {
    // The AI evaluation button is now injected into the tabs bar inside setup_cv_preview.
    // If a custom button was added by Frappe, remove it.
    if (frm.custom_buttons && frm.custom_buttons['✨ AI Evaluation']) {
        frm.remove_custom_button('✨ AI Evaluation');
    }
}

window.run_interview_ai_evaluation = function(frm) {
    if (!frm) frm = cur_frm;
    if (!frm.doc.job_applicant) {
        frappe.msgprint("Please select a Job Applicant first.");
        return;
    }
    
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
            
            <h4 style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 32px 0; letter-spacing: -0.5px;">AI is evaluating the candidate...</h4>
            
            <div style="text-align: left; width: 280px; margin: 0 auto;">
                <div class="ai-step active" id="ai-step-1">
                    <div class="ai-step-icon"><i class="fa fa-file-text-o"></i></div>
                    Parsing Resume Document
                </div>
                <div class="ai-step" id="ai-step-2">
                    <div class="ai-step-icon"><i class="fa fa-crosshairs"></i></div>
                    Mapping Job Requirements
                </div>
                <div class="ai-step" id="ai-step-3">
                    <div class="ai-step-icon"><i class="fa fa-bar-chart"></i></div>
                    Calculating Competency Match
                </div>
                <div class="ai-step" id="ai-step-4">
                    <div class="ai-step-icon"><i class="fa fa-check-square-o"></i></div>
                    Finalizing Hiring Verdict
                </div>
            </div>
            
            <div style="width: 320px; height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 40px; overflow: hidden; position: relative;">
                <div id="ai-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 3px; transition: width 0.5s ease;"></div>
            </div>
            <div style="font-size: 12px; color: #94a3b8; font-weight: 600; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px;" id="ai-progress-text">0% Complete</div>
        </div>
    `;
    $('#ai-drawer-content').html(loadingHtml);
    
    let progress = 0;
    let step = 1;
    let simInterval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 95) progress = 95;
        
        $('#ai-progress-bar').css('width', progress + '%');
        $('#ai-progress-text').text(Math.floor(progress) + '% Complete');
        
        if (progress > 25 && step === 1) {
            $('#ai-step-1').removeClass('active').addClass('done').find('i').removeClass('fa-file-text-o').addClass('fa-check');
            $('#ai-step-2').addClass('active');
            step = 2;
        } else if (progress > 55 && step === 2) {
            $('#ai-step-2').removeClass('active').addClass('done').find('i').removeClass('fa-crosshairs').addClass('fa-check');
            $('#ai-step-3').addClass('active');
            step = 3;
        } else if (progress > 85 && step === 3) {
            $('#ai-step-3').removeClass('active').addClass('done').find('i').removeClass('fa-bar-chart').addClass('fa-check');
            $('#ai-step-4').addClass('active');
            step = 4;
        }
    }, 400);
    
    frappe.call({
        method: "nexapp.api.evaluate_candidate_cv",
        args: { job_applicant_name: frm.doc.job_applicant },
        callback: function(r) {
            clearInterval(simInterval);
            if(r.message) {
                $('#ai-progress-bar').css('width', '100%');
                $('#ai-progress-text').text('100% Complete');
                $('#ai-step-4').removeClass('active').addClass('done').find('i').removeClass('fa-check-square-o').addClass('fa-check');
                
                setTimeout(() => {
                    let rawData = JSON.stringify(r.message);
                    render_interview_ai_drawer_content(frm, rawData);
                }, 600);
            } else {
                $('#ai-drawer-content').html('<div style="padding: 40px; text-align: center; color: #ef4444;"><i class="fa fa-exclamation-triangle" style="font-size: 40px; margin-bottom: 16px;"></i><h4>Evaluation Failed</h4></div>');
            }
        },
        error: function() {
            clearInterval(simInterval);
            $('#ai-drawer-content').html('<div style="padding: 40px; text-align: center; color: #ef4444;"><i class="fa fa-exclamation-triangle" style="font-size: 40px; margin-bottom: 16px;"></i><h4>Evaluation Failed</h4><p>An error occurred connecting to the AI server.</p></div>');
        }
    });
};

function open_interview_ai_drawer(frm) {
    if (!frm.doc.job_applicant) {
        frappe.msgprint("Please select a Job Applicant first.");
        return;
    }

    if ($('#ai-drawer-overlay').length === 0) {
        let drawerHtml = `
            <div id="ai-drawer-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 17, 21, 0.6); backdrop-filter: blur(4px); z-index: 99998; display: none;"></div>
            <div id="ai-drawer-panel" style="position: fixed; top: 0; right: 0; width: 900px; max-width: 90vw; height: 100vh; background: #f8fafc; z-index: 99999; box-shadow: -4px 0 24px rgba(0,0,0,0.15); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; overflow: hidden;">
                <div style="background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                        <i class="fa fa-magic" style="color: #6366f1;"></i> AI Hiring Assistant
                    </h3>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button class="btn btn-sm" id="btn-ai-reevaluate" style="background: white; border: 1px solid #e2e8f0; color: #475569; font-weight: 600;"><i class="fa fa-refresh"></i> Re-evaluate</button>
                        <button class="btn btn-sm" id="btn-ai-close" style="background: transparent; border: none; font-size: 18px; color: #64748b; padding: 4px 8px; cursor: pointer;"><i class="fa fa-times"></i></button>
                    </div>
                </div>
                <div id="ai-drawer-content" style="flex: 1; overflow-y: auto; padding: 24px;"></div>
            </div>
        `;
        $('body').append(drawerHtml);
        
        $('#btn-ai-close, #ai-drawer-overlay').on('click', function() {
            $('#ai-drawer-panel').css('transform', 'translateX(100%)');
            $('#ai-drawer-overlay').fadeOut(200);
        });
        
        $('#btn-ai-reevaluate').on('click', function() {
            run_interview_ai_evaluation(cur_frm);
        });
    }
    
    $('#ai-drawer-overlay').fadeIn(200);
    setTimeout(() => {
        $('#ai-drawer-panel').css('transform', 'translateX(0)');
    }, 10);
    
    $('#ai-drawer-content').html('<div style="padding: 40px; text-align: center;"><i class="fa fa-spinner fa-spin text-muted" style="font-size: 40px;"></i></div>');
    
    frappe.call({
        method: 'frappe.client.get_value',
        args: {
            doctype: 'Job Applicant',
            filters: { name: frm.doc.job_applicant },
            fieldname: 'custom_ai_evaluation'
        },
        callback: function(r) {
            let rawData = (r && r.message) ? r.message.custom_ai_evaluation : null;
            render_interview_ai_drawer_content(frm, rawData);
        }
    });
}
function render_interview_ai_drawer_content(frm, rawData) {
    if (!rawData) {
        let emptyHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center;">
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; max-width: 400px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <i class="fa fa-bolt" style="font-size: 40px; color: #cbd5e1; margin-bottom: 20px;"></i>
                    <h4 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 12px 0;">No Evaluation Found</h4>
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">Click below to run a deep AI analysis on this candidate's resume against the job description.</p>
                    <button class="btn btn-primary" onclick="run_interview_ai_evaluation(cur_frm)" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; font-weight: 600; padding: 8px 24px;">Run Evaluation</button>
                </div>
            </div>
        `;
        $('#ai-drawer-content').html(emptyHtml);
        return;
    }
    
    let evalData = null;
    try {
        evalData = JSON.parse(rawData);
    } catch(e) {
        $('#ai-drawer-content').html('<div class="alert alert-danger">Invalid AI Data JSON</div>');
        return;
    }
    
    let scoreColor = evalData.overall_score >= 8 ? '#10b981' : (evalData.overall_score >= 6 ? '#f59e0b' : '#ef4444');
    let overallPct = evalData.overall_score ? Math.round(evalData.overall_score * 10) : 0;
    
    let html = `
        <div class="custom-ai-eval-ui" style="font-family: 'Inter', sans-serif; max-width: 850px; margin: 0 auto;">
            
            <!-- Tabs -->
            <div style="display: flex; gap: 24px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;">
                <a href="#" class="ai-tab-btn active" data-target="dashboard" style="text-decoration: none; font-size: 14px; font-weight: 600; color: #0f172a; padding-bottom: 12px; border-bottom: 2px solid #6366f1;">Recruiter's Decision Dashboard</a>
                <a href="#" class="ai-tab-btn" data-target="analysis" style="text-decoration: none; font-size: 14px; font-weight: 600; color: #64748b; padding-bottom: 12px; border-bottom: none;">AI Analysis (Detailed View)</a>
            </div>
            
            <!-- Dashboard Tab -->
            <div id="ai-dashboard" class="ai-tab-content">
                
                <!-- Main Header Card -->
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <h5 style="margin: 0 0 16px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Executive Hiring Decision</h5>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                        <div style="font-size: 42px; font-weight: 800; color: ${scoreColor}; line-height: 1;">${overallPct}%</div>
                        <div style="font-size: 20px; font-weight: 700; color: #475569;">${evalData.overall_rating || '-'}</div>
                    </div>
                    
                    <div style="width: 100%; background: #f1f5f9; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
                        <div style="height: 100%; width: ${overallPct}%; background: ${scoreColor}; border-radius: 6px;"></div>
                    </div>
                    
                    <div style="display: flex; gap: 16px; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 24px;">
                        <div><span style="color: #ef4444; margin-right: 4px;">■</span>< 60% (Fair)</div>
                        <div><span style="color: #f59e0b; margin-right: 4px;">■</span>60-79% (Good)</div>
                        <div><span style="color: #10b981; margin-right: 4px;">■</span>80%+ (Excellent)</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <div>
                            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Recommendation</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${evalData.final_hiring_recommendation?.hiring_recommendation || evalData.overall_rating || '-'}</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Overall Confidence</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${evalData.ai_confidence || evalData.final_hiring_recommendation?.confidence || 0}%</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Business Risk</div>
                            <div style="font-size: 14px; font-weight: 700; color: ${evalData.business_risk?.overall === 'High' ? '#ef4444' : (evalData.business_risk?.overall === 'Medium' ? '#f59e0b' : '#10b981')};">${evalData.business_risk?.overall || '-'}</div>
                        </div>
                        <div style="margin-top: 8px;">
                            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Growth Potential</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${evalData.career_growth?.rating || 'Moderate'}</div>
                        </div>
                        <div style="margin-top: 8px;">
                            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Estimated Ramp-Up</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${evalData.final_hiring_recommendation?.ramp_up || '-'}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <!-- Radar Chart (Competency Matrix) -->
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; display: flex; flex-direction: column;">
                        <h5 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #1e293b;"><i class="fa fa-crosshairs" style="margin-right: 6px; color: #6366f1;"></i> Competency Matrix</h5>
                        <div id="ai-radar-chart" style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 250px;">
                            <!-- Chart injected here -->
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <!-- Role Fit -->
                        ${(evalData.role_fit && evalData.role_fit.length > 0) ? `
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                                <h5 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase;"><i class="fa fa-bullseye" style="margin-right: 6px;"></i> Primary Role Fit</h5>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="font-size: 15px; font-weight: 700; color: #1e293b;">${evalData.role_fit[0].role}</span>
                                    <span style="font-size: 14px; font-weight: 700; color: #6366f1;">${evalData.role_fit[0].percentage}%</span>
                                </div>
                                <div style="font-size: 12px; color: #64748b; line-height: 1.4;">${evalData.role_fit[0].reason}</div>
                            </div>
                        ` : ''}
                        
                        <!-- Career Stability -->
                        ${(evalData.career_stability) ? `
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                                <h5 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase;"><i class="fa fa-history" style="margin-right: 6px;"></i> Career Stability</h5>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <span style="font-size: 14px; font-weight: 700; color: ${evalData.career_stability.rating === 'Good' ? '#10b981' : '#f59e0b'};">${evalData.career_stability.rating}</span>
                                    <span style="font-size: 12px; color: #94a3b8; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">Avg Tenure: ${evalData.career_stability.average_tenure}</span>
                                </div>
                                <div style="font-size: 12px; color: #64748b; line-height: 1.4;">${evalData.career_stability.observation}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Hiring Manager Verdict -->
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 24px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; opacity: 0.1; font-size: 80px; color: #1e3a8a;"><i class="fa fa-quote-right"></i></div>
                    <h5 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #1e3a8a;"><i class="fa fa-user-secret" style="margin-right: 6px;"></i> Hiring Manager Verdict</h5>
                    <p style="margin: 0; font-size: 15px; color: #1e3a8a; line-height: 1.6; position: relative; z-index: 2;">
                        ${evalData.hiring_manager_verdict || 'No verdict generated.'}
                    </p>
                </div>
                
            </div>
            
            <!-- Detailed Analysis Tab -->
            <div id="ai-analysis" class="ai-tab-content" style="display: none;">
                
                ${(evalData.resume_completeness) ? `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 16px;">
                        <div style="font-size: 32px; color: #3b82f6;"><i class="fa fa-file-text-o"></i></div>
                        <div style="flex: 1;">
                            <h5 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;">Resume Quality: ${evalData.resume_completeness.score}</h5>
                            <div style="display: flex; gap: 16px; margin-top: 8px;">
                                <div style="flex: 1;">
                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Sections Found</div>
                                    <div style="font-size: 13px; color: #475569;">${evalData.resume_completeness.includes ? evalData.resume_completeness.includes.join(', ') : 'None'}</div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Improvement Advice</div>
                                    <div style="font-size: 13.5px; color: #475569;">${evalData.resume_completeness.improvement_advice || 'None'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Interview Questions -->
                ${(evalData.interview_questions) ? `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <h5 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #1e293b;"><i class="fa fa-question-circle" style="margin-right: 6px; color: #8b5cf6;"></i> AI Interview Assistant</h5>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            ${Object.keys(evalData.interview_questions).map(cat => {
                                let questions = evalData.interview_questions[cat];
                                if (!questions || questions.length === 0) return '';
                                let catName = cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                return `
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                                        <h6 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #334155;">${catName}</h6>
                                        <ul style="margin: 0; padding-left: 16px; color: #475569; font-size: 13.5px; line-height: 1.5;">
                                            ${questions.map(q => `<li style="margin-bottom: 6px;">${q}</li>`).join('')}
                                        </ul>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h5 style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">Detailed Requirement Breakdown</h5>
                    <div style="display: flex; gap: 12px;">
                        <a href="#" class="ai-expand-all" style="font-size: 12px; font-weight: 600; color: #6366f1; text-decoration: none;">Expand All</a>
                        <a href="#" class="ai-collapse-all" style="font-size: 12px; font-weight: 600; color: #64748b; text-decoration: none;">Collapse All</a>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
        `;
        
        if (evalData.evaluations && Array.isArray(evalData.evaluations)) {
            evalData.evaluations.forEach((ev, i) => {
                let pScore = ev.score || 0;
                let icon = pScore >= 7 ? '<i class="fa fa-check-circle" style="color: #10b981;"></i>' : (pScore >= 4 ? '<i class="fa fa-minus-circle" style="color: #f59e0b;"></i>' : '<i class="fa fa-times-circle" style="color: #ef4444;"></i>');
                
                let evidenceTags = (ev.evidence_found && ev.evidence_found.length > 0) 
                    ? ev.evidence_found.map(e => `<span style="display: inline-block; background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin: 0 4px 4px 0;"><i class="fa fa-tag" style="margin-right: 4px;"></i>${e}</span>`).join('') 
                    : '<span style="font-style: italic; color: #94a3b8; font-size: 12px;">No supporting evidence found.</span>';
                    
                let missingList = (ev.missing && ev.missing.length > 0)
                    ? ev.missing.map(m => `<li style="margin-bottom: 4px; color: #b91c1c;">${m}</li>`).join('')
                    : '<li style="color: #94a3b8; font-style: italic; list-style: none;">None</li>';
                
                html += `
                    <div class="ai-req-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <div class="ai-req-header" style="padding: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: #f8fafc; transition: background 0.2s;" onclick="$(this).next('.ai-req-body').slideToggle(200); $(this).find('.fa-chevron-down').toggleClass('fa-rotate-180');">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="font-size: 18px;">${icon}</div>
                                <h5 style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">${ev.point || ev.requirement}</h5>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 11px; font-weight: 600; background: white; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 12px; color: #475569;">${ev.match_level || 'Evaluated'}</span>
                                <span style="font-size: 12px; font-weight: 700; color: #0f172a;">${pScore}/10</span>
                                <i class="fa fa-chevron-down fa-rotate-180" style="color: #94a3b8; font-size: 12px; transition: transform 0.2s;"></i>
                            </div>
                        </div>
                        <div class="ai-req-body" style="display: block; padding: 16px; border-top: 1px solid #e2e8f0; background: white;">
                            <p style="margin: 0 0 12px 0; font-size: 13.5px; color: #475569; line-height: 1.5;"><b>Justification:</b> ${ev.justification}</p>
                            <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                                <div style="flex: 1;">
                                    <b style="color: #1e293b; display: block; font-size: 13px; margin-bottom: 6px;">Evidence:</b>
                                    <div>${evidenceTags}</div>
                                </div>
                                <div style="flex: 1;">
                                    <b style="color: #1e293b; display: block; font-size: 13px; margin-bottom: 6px;">Missing:</b>
                                    <ul style="margin: 0; padding-left: 16px; font-size: 13px;">${missingList}</ul>
                                </div>
                            </div>
                            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; font-size: 13px;">
                                <b style="color: #1e40af;">Recommendation:</b> <span style="color: #1e3a8a;">${ev.recommendation || '-'}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;

    $('#ai-drawer-content').html(html);
    
    // Tab Switching
    $('#ai-drawer-content').find('.ai-tab-btn').on('click', function(e) {
        e.preventDefault();
        let target = $(this).attr('data-target');
        
        $('#ai-drawer-content').find('.ai-tab-btn').removeClass('active').css({
            'color': '#64748b',
            'border-bottom': 'none'
        });
        $(this).addClass('active').css({
            'color': '#0f172a',
            'border-bottom': '2px solid #6366f1'
        });
        
        $('#ai-drawer-content').find('.ai-tab-content').hide();
        $('#ai-drawer-content').find('#ai-' + target).show();
    });
    
    // Expand/Collapse All
    $('#ai-drawer-content').find('.ai-expand-all').on('click', function(e) {
        e.preventDefault();
        $('#ai-drawer-content').find('.ai-req-body').slideDown(200);
        $('#ai-drawer-content').find('.fa-chevron-down').addClass('fa-rotate-180');
    });
    $('#ai-drawer-content').find('.ai-collapse-all').on('click', function(e) {
        e.preventDefault();
        $('#ai-drawer-content').find('.ai-req-body').slideUp(200);
        $('#ai-drawer-content').find('.fa-chevron-down').removeClass('fa-rotate-180');
    });
    
    // Draw Radar Chart
    let size = 280;
    let center = size/2;
    let radius = size/2 - 40;
    
    let labels = ['Skills', 'Experience', 'Industry', 'Growth', 'Education'];
    let values = [
        evalData.category_scores?.['Technical Skills'] || evalData.category_scores?.['Marketing Capability'] || evalData.category_scores?.technical_match || evalData.category_scores?.marketing_skills || 0,
        evalData.category_scores?.['Experience'] || evalData.category_scores?.experience || 0,
        evalData.category_scores?.['Industry Knowledge'] || evalData.category_scores?.industry || 0,
        evalData.category_scores?.['Campaign Ownership'] || evalData.category_scores?.['Transferable Skills'] || 8.5,
        evalData.category_scores?.['Education'] || evalData.category_scores?.education || 0
    ];
    
    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${size} ${size}" style="max-width: ${size}px; margin: 0 auto; display: block;">`;
    
    for(let i=1; i<=5; i++) {
        let r = radius * (i/5);
        let points = "";
        for(let j=0; j<5; j++) {
            let angle = (Math.PI * 2 * j / 5) - Math.PI/2;
            let x = center + r * Math.cos(angle);
            let y = center + r * Math.sin(angle);
            points += `${x},${y} `;
        }
        svg += `<polygon points="${points}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`;
    }
    
    for(let j=0; j<5; j++) {
        let angle = (Math.PI * 2 * j / 5) - Math.PI/2;
        let x = center + radius * Math.cos(angle);
        let y = center + radius * Math.sin(angle);
        svg += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
        
        let lx = center + (radius + 20) * Math.cos(angle);
        let ly = center + (radius + 20) * Math.sin(angle);
        svg += `<text x="${lx}" y="${ly}" font-size="11" font-weight="700" fill="#475569" text-anchor="middle" dominant-baseline="middle">${labels[j]}</text>`;
    }
    
    let dPoints = "";
    for(let j=0; j<5; j++) {
        let val = values[j] || 0;
        let r = radius * (val / 10);
        let angle = (Math.PI * 2 * j / 5) - Math.PI/2;
        let x = center + r * Math.cos(angle);
        let y = center + r * Math.sin(angle);
        dPoints += `${x},${y} `;
    }
    svg += `<polygon points="${dPoints}" fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" stroke-width="2" stroke-linejoin="round"/>`;
    
    for(let j=0; j<5; j++) {
        let val = values[j] || 0;
        let r = radius * (val / 10);
        let angle = (Math.PI * 2 * j / 5) - Math.PI/2;
        let x = center + r * Math.cos(angle);
        let y = center + r * Math.sin(angle);
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="#6366f1" stroke="white" stroke-width="1"/>`;
    }
    
    svg += `</svg>`;
    
    let chartContainer = $('#ai-drawer-content').find('#ai-radar-chart');
    if (chartContainer.length) {
        chartContainer.html(svg);
    }
}


function setup_cv_preview(frm) {
    if ($('#viewCvPreviewBtnContainer').length) {
        if (frm.doc.job_applicant) {
            $('#aiEvalTabsBtn').css('display', 'inline-flex');
        } else {
            $('#aiEvalTabsBtn').css('display', 'none');
        }
        
        if (frm.doc.resume_attachment || frm.doc.custom_resume_attachment || frm.doc.job_applicant) {
            $('#viewCvPreviewBtn').css('display', 'inline-flex');
        } else {
            $('#viewCvPreviewBtn').css('display', 'none');
        }
        return;
    }
    
    // Remove the old box or section-head button if it exists (cleanup)
    $('#interview-view-cv-btn-container').remove();
    $(frm.wrapper).find('.section-head #viewCvPreviewBtn').remove();
    
    let tabs_container = $(frm.wrapper).find('.form-tabs').first();
    if (tabs_container.length > 0) {
        tabs_container.css('width', '100%');
        
        // Also ensure the ul takes up the remaining space so it pushes the button to the right
        tabs_container.find('.nav-tabs').css('flex-grow', '1');
        
        const btn_html = `
            <div id="viewCvPreviewBtnContainer" style="margin-left: auto; display: flex; align-items: center; padding-right: 4px; gap: 8px;">
                <button id="aiEvalTabsBtn" type="button" style="
                    display: ${(frm.doc.job_applicant) ? 'inline-flex' : 'none'};
                    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                    color: white;
                    font-weight: 600;
                    border: none;
                    padding: 4.5px 12px;
                    border-radius: 6px;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 13px;
                    box-shadow: 0 1px 2px rgba(99, 102, 241, 0.3);
                ">
                    ✨ AI Evaluation
                </button>
                <button id="viewCvPreviewBtn" type="button" style="
                    display: ${(frm.doc.resume_attachment || frm.doc.custom_resume_attachment || frm.doc.job_applicant) ? 'inline-flex' : 'none'};
                    background-color: #ffffff;
                    color: #71639e;
                    font-weight: 600;
                    border: 1px solid #71639e;
                    padding: 4px 12px;
                    border-radius: 6px;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 13px;
                    box-shadow: 0 1px 2px rgba(113, 99, 158, 0.15);
                ">
                    <i class="fa fa-eye" style="margin-right: 6px;"></i> View CV
                </button>
            </div>
        `;
        
        tabs_container.append(btn_html);
        
        $('#aiEvalTabsBtn').hover(
            function() { $(this).css({ 'box-shadow': '0 4px 6px rgba(99, 102, 241, 0.4)' }); },
            function() { $(this).css({ 'box-shadow': '0 1px 2px rgba(99, 102, 241, 0.3)' }); }
        ).on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            open_interview_ai_drawer(frm);
        });
        
        $('#viewCvPreviewBtn').hover(
            function() { $(this).css({ 'background-color': '#71639e', 'color': '#ffffff' }); },
            function() { $(this).css({ 'background-color': '#ffffff', 'color': '#71639e' }); }
        ).on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            let local_resume = frm.doc.custom_resume_attachment || frm.doc.resume_attachment;
            if(local_resume) {
                show_cv_preview_panel(local_resume);
            } else if (frm.doc.job_applicant) {
                frappe.db.get_value('Job Applicant', frm.doc.job_applicant, 'resume_attachment', function(r) {
                    if (r && r.message && r.message.resume_attachment) {
                        show_cv_preview_panel(r.message.resume_attachment);
                    } else {
                        show_custom_alert("Missing Resume", "There is no CV or Resume attached to this Job Applicant profile.", "Cancel");
                    }
                });
            } else {
                show_custom_alert("Missing Resume", "There is no CV or Resume attached to this Interview.", "Cancel");
            }
        });
    }
}

function show_custom_alert(title, message, btn_text="Close") {
    let alert_html = `
        <div id="beautiful-alert-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: white; border-radius: 16px; padding: 24px; width: 400px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); font-family: 'Inter', sans-serif;">
                <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827;">${title}</h3>
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${message}</p>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="beautiful-alert-close" style="padding: 8px 20px; border-radius: 20px; border: 1px solid #d1d5db; background: white; color: #374151; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;">
                        ${btn_text}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(alert_html);
    
    $('#beautiful-alert-close').hover(
        function() { $(this).css('background', '#f3f4f6'); },
        function() { $(this).css('background', 'white'); }
    ).on('click', function() {
        $('#beautiful-alert-overlay').fadeOut(150, function() {
            $(this).remove();
        });
    });
}

function show_cv_preview_panel(file_url) {
    $('#cv-preview-panel-overlay').remove();
    $('#cv-preview-panel').remove();

    let is_pdf = file_url.toLowerCase().endsWith('.pdf');
    let preview_content = '';
    if (is_pdf) {
        preview_content = `
            <div style="width: 100%; height: 100%; position: relative; background: #ffffff;">
                <div id="cv-loading-spinner" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; color: #64748b; font-family: 'Inter', sans-serif;">
                    <i class="fa fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 8px; color: #71639e;"></i>
                    <span style="font-size: 12px; font-weight: 500;">Loading Document...</span>
                </div>
                <iframe src="${file_url}" onload="document.getElementById('cv-loading-spinner').style.display='none'; this.style.opacity=1;" style="width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.4s ease; position: relative; z-index: 1; background: transparent;"></iframe>
            </div>
        `;
    } else {
        preview_content = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64748b; text-align: center; padding: 40px;">
                <i class="fa fa-file-word-o" style="font-size: 64px; color: #94a3b8; margin-bottom: 20px;"></i>
                <h4 style="color: #334155; margin: 0 0 8px 0; font-weight: 600;">Document Preview</h4>
                <p style="margin: 0 0 20px 0; font-size: 13px;">This file format cannot be previewed in the browser.</p>
                <a href="${file_url}" target="_blank" style="
                    display: inline-flex; align-items: center; gap: 8px;
                    background: #71639e; color: #fff; padding: 10px 20px;
                    border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#5b4f80'" onmouseout="this.style.background='#71639e'">
                    <i class="fa fa-download"></i> Download & View
                </a>
            </div>
        `;
    }

    let panel_html = `
        <div id="cv-preview-panel" style="
            position: fixed;
            top: 0;
            right: -40%;
            width: 40%;
            height: 100vh;
            background: #ffffff;
            z-index: 10000;
            border-left: 1px solid #e2e8f0;
            box-shadow: -4px 0 15px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', sans-serif;
        ">
            <div style="
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                background: #f8fafc;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="
                        width: 36px; height: 36px; border-radius: 8px;
                        background: rgba(113, 99, 158, 0.1);
                        display: flex; align-items: center; justify-content: center;
                    ">
                        <i class="fa fa-file-pdf-o" style="color: #71639e; font-size: 18px;"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">CV Preview</h4>
                        <span style="font-size: 11px; color: #64748b;">Verify candidate details</span>
                    </div>
                </div>
                <button id="close-cv-preview-panel" style="
                    width: 32px; height: 32px;
                    border-radius: 50%; border: none;
                    background: #f1f5f9; color: #475569;
                    font-size: 16px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.2s, color 0.2s;
                " onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a';" onmouseout="this.style.background='#f1f5f9'; this.style.color='#475569';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div style="flex: 1; overflow: hidden; background: #ffffff;">
                ${preview_content}
            </div>
        </div>
    `;

    $('body').append(panel_html);
    $('body').addClass('cv-panel-open');
    
    if (!$('#cv-panel-responsive-css').length) {
        $(`<style id="cv-panel-responsive-css">
            body.cv-panel-open .page-container {
                width: 60% !important;
                min-width: 0 !important;
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            body.cv-panel-open .form-sidebar,
            body.cv-panel-open .overlay-sidebar,
            body.cv-panel-open .layout-side-section { 
                display: none !important; 
            }
            body.cv-panel-open .custom-interview-ui .odoo-form-sheet {
                padding: 10px 14px !important;
            }
            body.cv-panel-open .custom-interview-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 4px !important;
            }
            body.cv-panel-open .custom-interview-ui .frappe-control .control-label {
                width: 100% !important;
                text-align: left !important;
                padding-right: 0 !important;
                margin-bottom: 4px !important;
            }
            body.cv-panel-open .custom-interview-ui .frappe-control .control-input-wrapper {
                width: 100% !important;
            }
        </style>`).appendTo('head');
    }

    setTimeout(() => {
        $('#cv-preview-panel').css('right', '0');
    }, 10);

    $('#close-cv-preview-panel').on('click', function() {
        $('#cv-preview-panel').css('right', '-40%');
        $('body').removeClass('cv-panel-open');
        setTimeout(() => {
            $('#cv-preview-panel').remove();
        }, 400);
    });
}
