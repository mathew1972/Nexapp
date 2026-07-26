frappe.ui.form.on('Job Requisition', {
    refresh: function(frm) {
        // --- START UI STYLING ---
        render_odoo_ui(frm);
        // --- END UI STYLING ---

        let style = `
            .input-icon-right-wrapper {
                position: relative;
                display: inline-block;
                width: 100%;
            }
            .input-icon-right-wrapper input {
                padding-right: 40px;
                width: 100%;
                box-sizing: border-box;
            }
            .input-icon-right {
                position: absolute;
                right: 4px;
                top: 50%;
                transform: translateY(-50%);
                color: #888;
                pointer-events: none;
            }
            .input-icon-right i {
                font-size: 18px;
            }
        `;
        let styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = style;
        document.head.appendChild(styleSheet);

        // Set query for opportunity_owner to dynamically load user list
        frm.set_query('opportunity_owner', function() {
            return {
                query: 'frappe.core.doctype.user.user.user_query',
                filters: { 'enabled': 1 }
            };
        });
    },
    onload: function(frm) {
        // Auto-collapse the sidebar on initial load immediately to prevent flicker
        let sidebar_toggle = $(".page-head").find(".sidebar-toggle-btn");
        let sidebar_wrapper = frm.page.wrapper.find(".layout-side-section");
        if (sidebar_wrapper.is(":visible") && sidebar_toggle.length > 0) {
            sidebar_wrapper.hide();
            frm.page.update_sidebar_icon();
        }
        
        // Apply styling immediately on load to prevent visual flicker
        render_odoo_ui(frm);
    },
    
    status: function(frm) {
        apply_status_colors(frm);
    }
});

function apply_status_colors(frm) {
    if (!frm.fields_dict.status) return;
    
    let status = frm.doc.status;
    let $wrapper = $(frm.fields_dict.status.wrapper);
    
    // Remove previous status classes
    $wrapper.removeClass('status-badge-pending status-badge-approved status-badge-rejected status-badge-filled status-badge-onhold status-badge-cancelled');
    
    if (status === 'Pending') {
        $wrapper.addClass('status-badge-pending');
    } else if (status === 'Open & Approved') {
        $wrapper.addClass('status-badge-approved');
    } else if (status === 'Rejected') {
        $wrapper.addClass('status-badge-rejected');
    } else if (status === 'Filled') {
        $wrapper.addClass('status-badge-filled');
    } else if (status === 'On Hold') {
        $wrapper.addClass('status-badge-onhold');
    } else if (status === 'Cancelled') {
        $wrapper.addClass('status-badge-cancelled');
    }
}

function render_odoo_ui(frm) {
    // 1. Add a unique class to this form's wrapper to safely scope all CSS
    $(frm.wrapper).addClass('custom-job-requisition-ui');
    
    // Inject Guidelines Button
    inject_guidelines_button(frm);
    
    // Force Small Text fields to look identical to Data fields
    function fix_ui_fields() {
        // Apply status colors periodically to ensure they persist through Frappe's field refreshes
        apply_status_colors(frm);
        
        $.each(frm.fields_dict, function(fieldname, field) {
            // Fix small text fields
            if (field.df && field.df.fieldtype === 'Small Text' && field.$input && field.$input.length) {
                let ta = field.$input[0];
                ta.removeAttribute('cols');
                let $label = field.$input.closest('.form-group').find('.control-label, label').first();
                let labelW = $label.length ? $label.outerWidth(true) : 0;
                let $col = field.$input.closest('[class*="col-"]');
                let colW = $col.length ? $col.innerWidth() : field.$input.closest('.form-group').innerWidth();
                let targetW = colW - labelW - 20; 
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
            
            // Add mandatory field styling class reliably on every refresh
            // Add mandatory field styling class reliably on every refresh
            if (field.df && field.df.reqd && field.$wrapper) {
                field.$wrapper.addClass('is-mandatory-field');
                if (field.$input) field.$input.addClass('is-mandatory-field');
            } else if (field.$wrapper) {
                field.$wrapper.removeClass('is-mandatory-field');
                if (field.$input) field.$input.removeClass('is-mandatory-field');
            }
        });
    }
    setTimeout(fix_ui_fields, 50);
    setTimeout(fix_ui_fields, 300);
    setTimeout(fix_ui_fields, 1000);

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

    if (!$('#odoo_google_font').length) {
        $('head').append('<link id="odoo_google_font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">');
    }

    $('#job_requisition_ui_styles').remove();
    if (!$('#job_requisition_ui_styles').length) {
        $('head').append(`
            <style id="job_requisition_ui_styles">
                /* Premium Yellow Style for Dashboard */
                .custom-job-requisition-ui .form-dashboard-section.custom {
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
                    border: 1px solid #fde68a !important;
                    box-shadow: 0 1px 3px rgba(251, 191, 36, 0.1) !important;
                    border-radius: 10px !important;
                }
                .custom-job-requisition-ui .form-dashboard-section.custom .section-head {
                    color: #92400e !important;
                    font-weight: 600 !important;
                }
                .custom-job-requisition-ui .form-dashboard-section.custom .section-body {
                    color: #b45309 !important;
                    font-weight: 500 !important;
                }

                .custom-job-requisition-ui .form-layout, 
                .custom-job-requisition-ui .odoo-form-sheet {
                    background: #f9fafb !important;
                    box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03) !important;
                    border-radius: 10px !important;
                    border: 1px solid #e5e7eb !important;
                    padding: 28px 32px !important;
                    margin-top: 16px !important;
                    margin-bottom: 32px !important;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                }
                
                .custom-job-requisition-ui .form-tabs {
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
                .custom-job-requisition-ui .form-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-job-requisition-ui .form-tabs .nav-tabs {
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
                .custom-job-requisition-ui .form-tabs .nav-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-job-requisition-ui .form-tab-content, 
                .custom-job-requisition-ui .tab-content, 
                .custom-job-requisition-ui .form-tab-pane, 
                .custom-job-requisition-ui .tab-pane {
                    border: none !important;
                    margin-top: 0px !important;
                    padding-top: 0px !important;
                }

                .custom-job-requisition-ui .form-tabs .nav-link {
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

                .custom-job-requisition-ui .form-tabs .nav-link:hover {
                    color: #3d3566 !important;
                    background: rgba(113, 99, 158, 0.08) !important;
                    border: none !important;
                }

                .custom-job-requisition-ui .form-tabs .nav-link.active {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #7b6daa 0%, #635490 100%) !important;
                    border: none !important;
                    font-weight: 700 !important;
                    box-shadow: 0 2px 8px rgba(113, 99, 158, 0.3) !important;
                }

                .custom-job-requisition-ui .form-section { 
                    border: none !important; 
                    border-top: none !important; 
                    border-bottom: none !important; 
                    margin-top: 0 !important; 
                    padding-top: 0 !important; 
                }
                .custom-job-requisition-ui .form-section .section-head {
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
                .custom-job-requisition-ui .form-section:first-child .section-head {
                    margin-top: 4px !important;
                }

                .custom-job-requisition-ui input[type="text"],
                .custom-job-requisition-ui input[type="number"],
                .custom-job-requisition-ui input[type="email"],
                .custom-job-requisition-ui input[type="password"],
                .custom-job-requisition-ui input[type="tel"],
                .custom-job-requisition-ui select,
                .custom-job-requisition-ui textarea,
                .custom-job-requisition-ui .frappe-control input[type="text"],
                .custom-job-requisition-ui .frappe-control input[type="number"],
                .custom-job-requisition-ui .frappe-control input[type="email"],
                .custom-job-requisition-ui .frappe-control input[type="password"],
                .custom-job-requisition-ui .frappe-control input[type="tel"],
                .custom-job-requisition-ui .frappe-control select,
                .custom-job-requisition-ui .frappe-control textarea,
                .custom-job-requisition-ui input[readonly]:not([type="checkbox"]):not([type="radio"]),
                .custom-job-requisition-ui input[disabled]:not([type="checkbox"]):not([type="radio"]),
                .custom-job-requisition-ui .control-value:not([type="checkbox"]):not([type="radio"]),
                .custom-job-requisition-ui .like-disabled-input:not([type="checkbox"]):not([type="radio"]) {
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

                .custom-job-requisition-ui .frappe-control[data-fieldtype="Small Text"] .control-input {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                .custom-job-requisition-ui .frappe-control[data-fieldtype="Small Text"] textarea {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 38px !important;
                    min-height: 38px !important;
                    resize: none !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                }

                .custom-job-requisition-ui input.error-highlight,
                .custom-job-requisition-ui select.error-highlight,
                .custom-job-requisition-ui textarea.error-highlight,
                .custom-job-requisition-ui .frappe-control input.error-highlight,
                .custom-job-requisition-ui .frappe-control select.error-highlight,
                .custom-job-requisition-ui .frappe-control textarea.error-highlight {
                    background-color: #fee2e2 !important;
                    border-bottom-color: #ef4444 !important;
                    border-bottom-width: 2px !important;
                }
                
                .custom-job-requisition-ui .frappe-control input::placeholder,
                .custom-job-requisition-ui input::placeholder {
                    font-size: 12px !important;
                    color: #9ca3af !important;
                    font-weight: 400 !important;
                    white-space: normal !important;
                    text-overflow: ellipsis !important;
                }
                
                .custom-job-requisition-ui input[type="text"]:focus,
                .custom-job-requisition-ui input[type="number"]:focus,
                .custom-job-requisition-ui input[type="email"]:focus,
                .custom-job-requisition-ui input[type="password"]:focus,
                .custom-job-requisition-ui input[type="tel"]:focus,
                .custom-job-requisition-ui select:focus,
                .custom-job-requisition-ui textarea:focus,
                .custom-job-requisition-ui .frappe-control input[type="text"]:focus,
                .custom-job-requisition-ui .frappe-control input[type="number"]:focus,
                .custom-job-requisition-ui .frappe-control input[type="email"]:focus,
                .custom-job-requisition-ui .frappe-control input[type="password"]:focus,
                .custom-job-requisition-ui .frappe-control input[type="tel"]:focus,
                .custom-job-requisition-ui .frappe-control select:focus,
                .custom-job-requisition-ui .frappe-control textarea:focus {
                    border: 1px solid #ee8d21 !important;
                    background-color: #ffffff !important;
                    box-shadow: 0 0 0 3px rgba(238, 141, 33, 0.15) !important;
                    outline: none !important;
                }
                
                .custom-job-requisition-ui textarea {
                    overflow-y: hidden !important;
                    resize: none !important;
                }

                .custom-job-requisition-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 22px !important;
                }
                
                .custom-job-requisition-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 210px !important;
                    min-width: 210px !important;
                    margin-bottom: 0 !important;
                    padding-right: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                }

                .custom-job-requisition-ui .form-column.col-sm-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-job-requisition-ui .form-column.col-md-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-job-requisition-ui .form-column.col-sm-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-job-requisition-ui .form-column.col-md-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 110px !important;
                    min-width: 110px !important;
                    padding-right: 8px !important;
                }

                .custom-job-requisition-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix .control-label {
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
                
                .custom-job-requisition-ui .frappe-control[data-fieldtype="Small Text"] .form-group .clearfix .control-label,
                .custom-job-requisition-ui .frappe-control[data-fieldtype="Text"] .form-group .clearfix .control-label,
                .custom-job-requisition-ui .frappe-control[data-fieldtype="Long Text"] .form-group .clearfix .control-label,
                .custom-job-requisition-ui .frappe-control[data-fieldtype="Text Editor"] .form-group .clearfix .control-label {
                    font-weight: 700 !important;
                    font-size: 12.5px !important;
                    color: #1e293b !important;
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: 0.01em !important;
                }

                .custom-job-requisition-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .control-input-wrapper {
                    flex: 1 !important;
                    width: 100% !important;
                }
                
                .custom-job-requisition-ui .frappe-control:not([data-fieldtype="Check"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .disp-area:not(.checkbox .disp-area) {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    font-weight: 500 !important;
                    font-size: 13.5px !important;
                    color: #475569 !important;
                    padding: 8px 0 !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }
            .custom-job-requisition-ui .btn-secondary {
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                border: 1px solid #e2e8f0 !important;
                background-color: #ffffff !important;
                color: #475569 !important;
            }
            .custom-job-requisition-ui .btn-secondary:hover {
                background-color: #f8fafc !important;
                color: #0f172a !important;
                border-color: #cbd5e1 !important;
            }
            
            /* Custom button coloring for Get Job Requisitions */
            .custom-job-requisition-ui [data-fieldname="get_job_requisitions"] .btn {
                background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
                color: #ffffff !important;
                font-weight: 600 !important;
                border: none !important;
                box-shadow: 0 2px 4px rgba(99, 102, 241, 0.25) !important;
                transition: all 0.2s ease !important;
            }
            .custom-job-requisition-ui [data-fieldname="get_job_requisitions"] .btn:hover {
                opacity: 0.9 !important;
                box-shadow: 0 4px 10px rgba(99, 102, 241, 0.35) !important;
                transform: translateY(-1px) !important;
            }
            
            .custom-job-requisition-ui .frappe-control.is-mandatory-field input,
            .custom-job-requisition-ui .frappe-control.is-mandatory-field select,
            .custom-job-requisition-ui .frappe-control.is-mandatory-field textarea,
            .custom-job-requisition-ui .frappe-control.is-mandatory-field .control-value,
            .custom-job-requisition-ui .frappe-control.is-mandatory-field .like-disabled-input,
            .custom-job-requisition-ui .frappe-control[data-reqd="1"] input,
            .custom-job-requisition-ui .frappe-control[data-reqd="1"] select,
            .custom-job-requisition-ui .frappe-control[data-reqd="1"] textarea,
            .custom-job-requisition-ui .frappe-control[data-reqd="1"] .control-value,
            .custom-job-requisition-ui .frappe-control[data-reqd="1"] .like-disabled-input {
                border-left: 4px solid #ef4444 !important;
            }

            /* Status Colors via Wrapper Classes (High Specificity) */
            .custom-job-requisition-ui .frappe-control.status-badge-pending input,
            .custom-job-requisition-ui .frappe-control.status-badge-pending select,
            .custom-job-requisition-ui .frappe-control.status-badge-pending .control-value {
                background-color: #fef3c7 !important;
                color: #d97706 !important;
                border-color: #d97706 !important;
                font-weight: 800 !important;
                box-shadow: none !important;
            }
            .custom-job-requisition-ui .frappe-control.status-badge-approved input,
            .custom-job-requisition-ui .frappe-control.status-badge-approved select,
            .custom-job-requisition-ui .frappe-control.status-badge-approved .control-value {
                background-color: #d1fae5 !important;
                color: #059669 !important;
                border-color: #059669 !important;
                font-weight: 800 !important;
                box-shadow: none !important;
            }
            .custom-job-requisition-ui .frappe-control.status-badge-rejected input,
            .custom-job-requisition-ui .frappe-control.status-badge-rejected select,
            .custom-job-requisition-ui .frappe-control.status-badge-rejected .control-value {
                background-color: #fee2e2 !important;
                color: #dc2626 !important;
                border-color: #dc2626 !important;
                font-weight: 800 !important;
                box-shadow: none !important;
            }
            .custom-job-requisition-ui .frappe-control.status-badge-filled input,
            .custom-job-requisition-ui .frappe-control.status-badge-filled select,
            .custom-job-requisition-ui .frappe-control.status-badge-filled .control-value {
                background-color: #e0e7ff !important;
                color: #4f46e5 !important;
                border-color: #4f46e5 !important;
                font-weight: 800 !important;
                box-shadow: none !important;
            }
            .custom-job-requisition-ui .frappe-control.status-badge-onhold input,
            .custom-job-requisition-ui .frappe-control.status-badge-onhold select,
            .custom-job-requisition-ui .frappe-control.status-badge-onhold .control-value {
                background-color: #f3f4f6 !important;
                color: #4b5563 !important;
                border-color: #4b5563 !important;
                font-weight: 800 !important;
                box-shadow: none !important;
            }
            .custom-job-requisition-ui .frappe-control.status-badge-cancelled input,
            .custom-job-requisition-ui .frappe-control.status-badge-cancelled select,
            .custom-job-requisition-ui .frappe-control.status-badge-cancelled .control-value {
                background-color: #fef2f2 !important;
                color: #991b1b !important;
                border-color: #991b1b !important;
                font-weight: 800 !important;
                box-shadow: none !important;
            }
        </style>
    `);
    }
}

function inject_guidelines_button(frm) {
    if ($(frm.wrapper).find('#smart_btn_guidelines').length === 0) {
        let $companyField = frm.get_field('designation');
        let $firstSection = $companyField ? $($companyField.wrapper).closest('.form-section') : $(frm.wrapper).find('.form-section').first();
        
        if ($firstSection.length) {
            let $head = $firstSection.find('.form-section-heading, .section-head').first();
            if ($head.length === 0) {
                $head = $('<div class="section-head" style="margin-top: 0; margin-bottom: 20px; padding: 10px 16px; background-color: #f6f5fa; border-left: 3px solid #71639e; color: #1e293b; font-weight: 700; border-radius: 0 6px 6px 0; font-size: 13.5px; font-family: Inter, sans-serif;">Job Requisition</div>');
                $firstSection.prepend($head);
            }

            $head.css({ 'position': 'relative', 'display': 'flex', 'align-items': 'center' });
            let guidelinesBtnHtml = `
                    <button class="odoo-smart-btn" id="smart_btn_guidelines" title="Job Requisition Guidelines" style="position: absolute; right: 24px; top: 50%; transform: translateY(-50%); z-index: 10; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s ease;">
                        <i class="fa fa-book" style="color: #7768A5; font-size: 18px; margin-right: 8px;"></i>
                        <div style="text-align: left; line-height: 1.1;">
                            <span style="font-size: 10.5px; color: #64748b; text-transform: uppercase; display: block; font-weight: 600; font-family: Inter, sans-serif;">Guidelines</span>
                            <span style="font-weight: 700; color: #0f172a; font-size: 13px; font-family: Inter, sans-serif;">Job Requisition</span>
                        </div>
                    </button>
                `;
            
            let $btn = $(guidelinesBtnHtml);
            $btn.hover(
                function() { $(this).css({ 'background': '#f8fafc', 'box-shadow': '0 2px 5px rgba(0,0,0,0.1)' }); },
                function() { $(this).css({ 'background': '#ffffff', 'box-shadow': '0 1px 2px rgba(0,0,0,0.05)' }); }
            );

            $head.append($btn);

            $btn.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof show_job_requisition_guidelines === 'function') {
                    show_job_requisition_guidelines();
                }
            });
        }
    }
}

function show_job_requisition_guidelines() {
    let htmlContent = `
        <div id="custom_job_requisition_guidelines_modal" style="
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
                width: 700px;
                max-width: 90vw;
                max-height: 85vh;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                transform: scale(0.95) translateY(10px);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
                position: relative;
                font-family: 'Inter', sans-serif;
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
                        <i class="fa fa-users" style="color: #7768A5; font-size: 22px;"></i>
                    </div>
                    <div>
                        <h3 style="font-weight: 800; margin: 0; color: #0f172a; font-size: 17px;">Job Requisition Guidelines</h3>
                        <span style="font-size: 12px; color: #64748b; font-weight: 500; display: block; margin-top: 2px;">Official guidelines for manpower planning</span>
                    </div>
                </div>

                <!-- Close Button -->
                <button id="close_guidelines_modal" style="
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
                    <div style="background: #f8fafc; border-left: 4px solid #7768A5; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-info-circle" style="color: #7768A5; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px;">1. What is a Job Requisition?</h4>
                        </div>
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569; line-height: 1.6;">It is a formal request raised by a department head or manager to hire new personnel. It asks: <em>"Who do we need, why do we need them, and what is the expected compensation?"</em></p>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>It initiates the recruitment approval process.</li>
                            <li>Once approved, it can be added to the Staffing Plan.</li>
                        </ul>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #eab308; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-list-alt" style="color: #eab308; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px;">2. Requisition Details (Crucial Section)</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li><strong>Designation:</strong> Specify the exact title (e.g., Senior Network Engineer).</li>
                            <li><strong>No of Positions:</strong> The exact headcount requested.</li>
                            <li><strong>Reason for Requesting:</strong> A clear business justification is mandatory for HR and Management approval.</li>
                        </ul>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #10b981; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-briefcase" style="color: #10b981; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px;">3. Relationship with Staffing Plan & Openings</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Approved Job Requisitions feed directly into the company's Staffing Plan.</li>
                            <li>Once the budget is confirmed in the Staffing Plan, HR will create a Job Opening.</li>
                            <li>This ensures all hiring is planned and financially approved.</li>
                        </ul>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-sitemap" style="color: #3b82f6; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px;">4. Workflow Overview</h4>
                        </div>
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; overflow-x: auto; scrollbar-width: thin; scrollbar-color: #cbd5e1 #f8fafc;">
                            <div style="display: flex; align-items: center; gap: 12px; min-width: max-content;">
                                <div style="display: flex; flex-direction: column; align-items: center; width: 85px; text-align: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #eff6ff; border: 1px solid #bfdbfe; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                                        <i class="fa fa-file-text-o" style="color: #3b82f6; font-size: 14px;"></i>
                                    </div>
                                    <span style="font-size: 11px; font-weight: 600; color: #1e293b; line-height: 1.2;">Create Plan</span>
                                </div>
                                <i class="fa fa-angle-right" style="color: #cbd5e1; font-size: 16px;"></i>
                                
                                <div style="display: flex; flex-direction: column; align-items: center; width: 85px; text-align: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #ecfdf5; border: 1px solid #a7f3d0; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                                        <i class="fa fa-check" style="color: #10b981; font-size: 14px;"></i>
                                    </div>
                                    <span style="font-size: 11px; font-weight: 600; color: #1e293b; line-height: 1.2;">Approval</span>
                                </div>
                                <i class="fa fa-angle-right" style="color: #cbd5e1; font-size: 16px;"></i>

                                <div style="display: flex; flex-direction: column; align-items: center; width: 85px; text-align: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #f5f3ff; border: 1px solid #ddd6fe; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                                        <i class="fa fa-briefcase" style="color: #8b5cf6; font-size: 14px;"></i>
                                    </div>
                                    <span style="font-size: 11px; font-weight: 600; color: #1e293b; line-height: 1.2;">Job Opening</span>
                                </div>
                                <i class="fa fa-angle-right" style="color: #cbd5e1; font-size: 16px;"></i>

                                <div style="display: flex; flex-direction: column; align-items: center; width: 85px; text-align: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #fffbeb; border: 1px solid #fde68a; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                                        <i class="fa fa-globe" style="color: #f59e0b; font-size: 14px;"></i>
                                    </div>
                                    <span style="font-size: 11px; font-weight: 600; color: #1e293b; line-height: 1.2;">Publish Site</span>
                                </div>
                                <i class="fa fa-angle-right" style="color: #cbd5e1; font-size: 16px;"></i>

                                <div style="display: flex; flex-direction: column; align-items: center; width: 85px; text-align: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #f0fdfa; border: 1px solid #99f6e4; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                                        <i class="fa fa-microchip" style="color: #14b8a6; font-size: 14px;"></i>
                                    </div>
                                    <span style="font-size: 11px; font-weight: 600; color: #1e293b; line-height: 1.2;">AI Screening</span>
                                </div>
                                <i class="fa fa-angle-right" style="color: #cbd5e1; font-size: 16px;"></i>

                                <div style="display: flex; flex-direction: column; align-items: center; width: 85px; text-align: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #fdf2f8; border: 1px solid #fbcfe8; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                                        <i class="fa fa-comments-o" style="color: #ec4899; font-size: 14px;"></i>
                                    </div>
                                    <span style="font-size: 11px; font-weight: 600; color: #1e293b; line-height: 1.2;">Interview</span>
                                </div>
                                <i class="fa fa-angle-right" style="color: #cbd5e1; font-size: 16px;"></i>

                                <div style="display: flex; flex-direction: column; align-items: center; width: 85px; text-align: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #fef2f2; border: 1px solid #fecaca; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                                        <i class="fa fa-handshake-o" style="color: #ef4444; font-size: 14px;"></i>
                                    </div>
                                    <span style="font-size: 11px; font-weight: 700; color: #1e293b; line-height: 1.2;">Job Offer</span>
                                </div>
                            </div>
                        </div>
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
                    <button id="close_guidelines_modal_btn" style="
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
                    " onmouseover="this.style.opacity='0.9';" onmouseout="this.style.opacity='1';">Understood</button>
                </div>
            </div>
        </div>
    `;

    $('#custom_job_requisition_guidelines_modal').remove();
    $('body').append(htmlContent);

    let $modal = $('#custom_job_requisition_guidelines_modal');

    setTimeout(() => {
        $modal.css('opacity', '1');
        $modal.find('.custom-guidelines-modal-content').css('transform', 'scale(1) translateY(0)');
    }, 10);

    let closeModal = function () {
        $modal.css('opacity', '0');
        $modal.find('.custom-guidelines-modal-content').css('transform', 'scale(0.95) translateY(10px)');
        setTimeout(() => $modal.remove(), 300);
    };

    $('#close_guidelines_modal, #close_guidelines_modal_btn').on('click', closeModal);
    $modal.on('click', function (e) {
        if (e.target.id === 'custom_job_requisition_guidelines_modal') closeModal();
    });
}
