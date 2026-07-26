// AI Invoice Scan removed as requested by user.
frappe.ui.form.on("Purchase Invoice", {
    onload: function(frm) {
        let sidebar_toggle = $(".page-head").find(".sidebar-toggle-btn");
        let sidebar_wrapper = frm.page.wrapper.find(".layout-side-section");
        if (sidebar_wrapper.is(":visible") && sidebar_toggle.length > 0) {
            sidebar_wrapper.hide();
            frm.page.update_sidebar_icon();
        }
        render_odoo_ui(frm);
    },
    refresh(frm) {
        render_odoo_ui(frm);
        setTimeout(() => {
            render_stage_stepper(frm);
            update_status_color(frm);
            setup_ai_invoice_block(frm);
        }, 100);
    },
    status: function(frm) {
        render_stage_stepper(frm);
        update_status_color(frm);
    }
});

function render_stage_stepper(frm) {
    if (frm.doc.__islocal) return;

    // Remove previous stepper to rebuild on refresh
    $(frm.wrapper).find('.ja-stepper-bar').remove();

    // --- Stage Pipeline Definition ---
    const HAPPY_PATH = [
        'Draft',
        'Submitted',
        'Partly Paid',
        'Paid'
    ];

    const NON_PROGRESSIVE = [
        'Return',
        'Debit Note Issued',
        'Unpaid',
        'Overdue',
        'Cancelled',
        'Internal Transfer'
    ];

    const STAGE_COLORS = {
        'Draft': '#f59e0b',
        'Submitted': '#3b82f6',
        'Partly Paid': '#06b6d4',
        'Paid': '#10b981',
        'Return': '#ef4444',
        'Debit Note Issued': '#f43f5e',
        'Unpaid': '#f43f5e',
        'Overdue': '#ea580c',
        'Cancelled': '#991b1b',
        'Internal Transfer': '#64748b'
    };

    let currentStage = frm.doc.status || 'Draft';
    let visibleSteps = [...HAPPY_PATH];

    // If current stage is non-progressive, append it as an extra step
    if (NON_PROGRESSIVE.includes(currentStage) && !visibleSteps.includes(currentStage)) {
        visibleSteps.push(currentStage);
    }
    // If current stage is somehow not in the list, append it
    if (!visibleSteps.includes(currentStage)) {
        visibleSteps.push(currentStage);
    }

    let currentIndex = visibleSteps.indexOf(currentStage);
    if (currentIndex === -1) currentIndex = 0;

    let lastValidIndex = currentIndex;
    if (NON_PROGRESSIVE.includes(currentStage)) {
        lastValidIndex = 0;
        for (let i = HAPPY_PATH.length - 1; i >= 0; i--) {
            if (HAPPY_PATH.indexOf(currentStage) === -1) {
                if (currentStage === 'Return' || currentStage === 'Cancelled') lastValidIndex = Math.max(0, HAPPY_PATH.indexOf('Draft'));
                else if (currentStage === 'Unpaid' || currentStage === 'Overdue' || currentStage === 'Debit Note Issued' || currentStage === 'Internal Transfer') lastValidIndex = Math.max(0, HAPPY_PATH.indexOf('Submitted'));
                break;
            }
        }
    }

    let N = visibleSteps.length;
    let stepPercent = 100 / N;
    let halfStep = stepPercent / 2;
    let bgLeft = halfStep;
    let bgWidth = 100 - stepPercent;
    let progressTarget = NON_PROGRESSIVE.includes(currentStage) ? lastValidIndex : currentIndex;
    let activeWidth = progressTarget > 0 ? (progressTarget / (N - 1)) * bgWidth : 0;
    let lineColor = STAGE_COLORS[currentStage] || '#10b981';

    // --- Build Stepper HTML ---
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
            <div style="
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
            <div style="
                position: absolute;
                top: 24px;
                transform: translateY(-50%);
                left: ${bgLeft}%;
                width: ${activeWidth}%;
                height: 3px;
                background-color: ${lineColor};
                border-radius: 2.5px;
                z-index: 1;
                transition: width 0.4s ease;
            "></div>
    `;

    visibleSteps.forEach((s, idx) => {
        let isPast = false;
        let isActive = false;

        if (NON_PROGRESSIVE.includes(currentStage)) {
            isPast = idx <= lastValidIndex;
            isActive = idx === currentIndex;
        } else {
            isPast = idx < currentIndex;
            isActive = idx === currentIndex;
        }

        let stepColor = STAGE_COLORS[s] || '#10b981';
        let iconBg, iconBorder, iconGlow, iconContent, titleColor;

        if (isPast) {
            iconBg = `linear-gradient(135deg, ${stepColor} 0%, ${stepColor}cc 100%)`;
            iconBorder = 'none';
            iconGlow = `0 3px 6px ${stepColor}40`;
            iconContent = '<i class="fa fa-check" style="font-size: 11px; color: #ffffff;"></i>';
            titleColor = '#475569';
        } else if (isActive) {
            iconBg = `linear-gradient(135deg, ${stepColor} 0%, ${stepColor}dd 100%)`;
            iconBorder = 'none';
            iconGlow = `0 4px 10px ${stepColor}40`;
            let icon = '<i class="fa fa-check" style="font-size: 11px; color: #ffffff;"></i>';
            if (NON_PROGRESSIVE.includes(s)) {
                icon = '<i class="fa fa-times" style="font-size: 12px; color: #ffffff;"></i>';
            }
            iconContent = icon;
            titleColor = '#0f172a';
        } else {
            iconBg = '#ffffff';
            iconBorder = '2px solid #cbd5e1';
            iconGlow = 'none';
            iconContent = '';
            titleColor = '#94a3b8';
        }

        stepperHtml += `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                z-index: 2;
                width: ${stepPercent}%;
                text-align: center;
            ">
                <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${iconBg};
                    border: ${iconBorder};
                    box-shadow: ${iconGlow};
                    transition: all 0.3s ease;
                ">
                    ${iconContent}
                </div>
                <div style="
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

    // --- Ageing Ring Placeholder ---
    let ageingRingPlaceholderId = 'ja_ageing_ring_' + frm.doc.name.replace(/[^a-zA-Z0-9]/g, '');
    let ageingRingHtml = `<div id="${ageingRingPlaceholderId}" style="display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; margin-left: 14px;"><i class="fa fa-spinner fa-spin text-muted" style="font-size: 20px;"></i></div>`;

    // --- Assemble & Inject ---
    let fullHtml = `
        <div class="ja-stepper-bar" style="
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 18px;
            padding: 14px 20px 10px 20px;
            background: #f9fafb;
            border: 1px solid #f0eef5;
            border-radius: 10px;
        ">
            <div style="display: flex; flex: 1; align-items: center; overflow: visible; padding: 10px 0;">
                ${stepperHtml}
            </div>
            ${ageingRingHtml}
        </div>
    `;

    // Insert before the first section (above "Details")
    let $formLayout = $(frm.wrapper).find('.form-layout');
    if ($formLayout.length) {
        let $firstPage = $formLayout.find('.form-page:first');
        if ($firstPage.length) {
            $firstPage.prepend(fullHtml);
        } else {
            $formLayout.prepend(fullHtml);
        }
    }

    // --- Fetch Working Days Ageing & History ---
    frappe.call({
        method: "nexapp.api.get_purchase_invoice_stage_history",
        args: {
            docname: frm.doc.name,
            creation: frm.doc.creation
        },
        callback: function(r) {
            if (r.message) {
                let ageDays = r.message.ageing_days;
                let history = r.message.history;
                let IDEAL_DAYS = r.message.tat_target || 30;
                let percent = (ageDays / IDEAL_DAYS) * 100;
                let isOverdue = ageDays > IDEAL_DAYS;
                let capPercent = Math.min(100, Math.max(0, percent));

                let ringRadius = 24;
                let ringCircumference = 2 * Math.PI * ringRadius;
                let ringProgress = ringCircumference * (1 - capPercent / 100);

                let ringGradStart = '#00c6ff';
                let ringGradEnd = '#0072ff';
                if (['Paid', 'Cancelled'].includes(currentStage)) {
                    ringGradStart = '#11998e';
                    ringGradEnd = '#38ef7d';
                } else if (isOverdue) {
                    ringGradStart = '#ff416c';
                    ringGradEnd = '#ff4b2b';
                } else if (percent >= 75) {
                    ringGradStart = '#f8b500';
                    ringGradEnd = '#fceabb';
                } else if (percent >= 50) {
                    ringGradStart = '#ff9f00';
                    ringGradEnd = '#ea580c';
                }

                let ringGradId = `ja_ageing_grad_${Math.random().toString(36).substr(2, 6)}`;
                let shadowId = `ja_ageing_shadow_${Math.random().toString(36).substr(2, 6)}`;

                let ageingLabel = 'TAT';
                if (['Paid', 'Cancelled'].includes(currentStage)) {
                    ageingLabel = 'TAT Closed';
                } else if (isOverdue) {
                    ageingLabel = 'TAT Overdue';
                }

                let finalAgeingHtml = `
                    <div title="Ageing: ${ageDays} Days (${IDEAL_DAYS}-day TAT target)" style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        flex-shrink: 0;
                        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                        cursor: pointer;
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
                                <circle cx="28" cy="28" r="${ringRadius}" fill="#ffffff" stroke="#e2e8f0" stroke-width="5" />
                                <circle cx="28" cy="28" r="${ringRadius}" fill="none" stroke="url(${window.location.href.split('#')[0]}#${ringGradId})" stroke-width="5"
                                    stroke-dasharray="${ringCircumference}"
                                    stroke-dashoffset="${ringProgress}"
                                    stroke-linecap="round"
                                    filter="url(${window.location.href.split('#')[0]}#${shadowId})"
                                />
                            </svg>
                            <div style="
                                position: relative;
                                z-index: 2;
                                font-family: 'Inter', sans-serif;
                                font-size: ${ageDays >= 100 ? '10px' : '12px'};
                                font-weight: 800;
                                color: ${isOverdue ? '#ef4444' : '#334155'};
                                line-height: 1;
                                text-align: center;
                            ">
                                ${ageDays}<span style="font-size: 7px; display: block; font-weight: 600; color: #94a3b8; margin-top: 1px;">Days</span>
                            </div>
                        </div>
                        <div style="
                            font-family: 'Inter', sans-serif;
                            font-size: 11px;
                            font-weight: 800;
                            color: ${isOverdue ? '#ef4444' : '#475569'};
                            margin-top: 6px;
                            text-align: center;
                            white-space: nowrap;
                        ">${ageingLabel}</div>
                    </div>
                `;

                let $container = $('#' + ageingRingPlaceholderId);
                $container.html(finalAgeingHtml);
                
                $container.off('click').on('click', function() {
                    let currentIdx = visibleSteps.indexOf(currentStage);
                    if (currentIdx === -1) {
                        currentIdx = visibleSteps.length - 1;
                    }

                    let rows = [];
                    visibleSteps.forEach((step, index) => {
                        // Only show stages up to the current stage in the pipeline
                        if (index > currentIdx) return;
                        
                        let stepDate = history[step];
                        if (!stepDate && step === 'Draft') {
                            stepDate = frm.doc.creation;
                        }
                        
                        // For current stage, if no explicit version exists, use last modified date
                        if (!stepDate && step === currentStage) {
                            stepDate = frm.doc.modified;
                        }

                        let dateStr = '<span style="color: #94a3b8; font-style: italic;">Skipped</span>';
                        if (stepDate) {
                            dateStr = frappe.datetime.str_to_user(stepDate).split(' ')[0];
                        }
                        
                        let dotColor = STAGE_COLORS[step] || '#cbd5e1';
                        
                        rows.push(`
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor};"></div>
                                    <span style="font-size: 13px; font-weight: 500; color: #334155;">${step}</span>
                                </div>
                                <span style="font-size: 13px; font-weight: 600; color: #64748b;">${dateStr}</span>
                            </div>
                        `);
                    });


                    // Graphic calculation
                    let pbPercent = Math.min(100, (ageDays / IDEAL_DAYS) * 100);
                    let pbColor = ageDays > IDEAL_DAYS ? '#ef4444' : '#3b82f6';
                    if (['Paid', 'Cancelled'].includes(currentStage)) {
                        pbColor = '#10b981';
                    }
                    let gradeName = r.message.grade_name || "Not Specified";
                    
                    let customModal = `
                        <div id="custom_tat_modal" style="
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
                            <div class="custom-modal-content" style="
                                background: #ffffff;
                                border-radius: 16px;
                                width: 450px;
                                max-width: 90vw;
                                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                                transform: scale(0.95) translateY(10px);
                                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                                padding: 24px;
                                font-family: 'Inter', sans-serif;
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">TAT Target vs Ageing</h3>
                                    <button id="close_tat_modal_btn" style="
                                        background: transparent;
                                        border: none;
                                        color: #94a3b8;
                                        cursor: pointer;
                                        padding: 6px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        border-radius: 50%;
                                        transition: background 0.2s, color 0.2s;
                                    " onmouseover="this.style.background='#f1f5f9'; this.style.color='#475569';" onmouseout="this.style.background='transparent'; this.style.color='#94a3b8';">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                                <!-- Graphic Presentation -->
                                <div style="margin-bottom: 24px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; font-weight: 600;">
                                        <span style="color: ${pbColor};">${ageDays} Days Aged</span>
                                        <span style="color: #64748b; text-align: right;">${IDEAL_DAYS} Days Target<br><b style="font-size: 11px; color: #475569;">(Grade: ${gradeName})</b></span>
                                    </div>
                                    <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; position: relative;">
                                        <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${pbPercent}%; background: ${pbColor}; border-radius: 4px; transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
                                    </div>
                                </div>

                                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 16px; background: white; max-height: 250px; overflow-y: auto;">
                                    ${rows.join('')}
                                </div>
                            </div>
                        </div>
                    `;

                    $('body').append(customModal);
                    
                    // Animate in
                    setTimeout(() => {
                        $('#custom_tat_modal').css('opacity', '1');
                        $('#custom_tat_modal .custom-modal-content').css('transform', 'scale(1) translateY(0)');
                    }, 10);
                    
                    // Close handler
                    const closeModal = () => {
                        $('#custom_tat_modal').css('opacity', '0');
                        $('#custom_tat_modal .custom-modal-content').css('transform', 'scale(0.95) translateY(10px)');
                        setTimeout(() => {
                            $('#custom_tat_modal').remove();
                        }, 300);
                    };

                    $('#close_tat_modal_btn').on('click', closeModal);
                    
                    $('#custom_tat_modal').on('click', function(e) {
                        if ($(e.target).is('#custom_tat_modal')) {
                            closeModal();
                        }
                    });
                });
            }
        }
    });
}
function render_odoo_ui(frm) {
    // 1. Add a unique class to this form's wrapper to safely scope all CSS
    $(frm.wrapper).addClass('custom-purchase-invoice-ui');
    
    // 1b. Render the stage stepper pipeline + ageing ring
    if (!frm.doc.__islocal) {
        render_stage_stepper(frm);
    }
    
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
    function fix_mandatory_fields() {
        $.each(frm.fields_dict, function(fieldname, field) {
            let meta_df = frappe.meta.get_docfield(frm.doctype, fieldname);
            let is_reqd = (meta_df && meta_df.reqd) || (field.df && field.df.reqd);
            
            if (is_reqd && field.$wrapper) {
                field.$wrapper.addClass('is-mandatory-wrapper');
            } else if (field.$wrapper) {
                field.$wrapper.removeClass('is-mandatory-wrapper');
            }
        });
    }
    fix_mandatory_fields();
    setTimeout(fix_mandatory_fields, 300);
    setTimeout(fix_mandatory_fields, 800);

    // 2. Inject Google Font (Inter) if not present
    if (!$('#odoo_google_font').length) {
        $('head').append('<link id="odoo_google_font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">');
    }

    // 3. Inject Scoped Styles for Job Applicant only (remove old to pick up changes)
    $('#purchase_invoice_ui_styles').remove();
    if (!$('#purchase_invoice_ui_styles').length) {
        $('head').append(`
            <style id="purchase_invoice_ui_styles">
                /* Premium Yellow Style for Interview Summary Dashboard */
                .custom-purchase-invoice-ui .form-dashboard-section.custom {
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
                    border: 1px solid #fde68a !important;
                    box-shadow: 0 1px 3px rgba(251, 191, 36, 0.1) !important;
                    border-radius: 10px !important;
                }
                .custom-purchase-invoice-ui .form-dashboard-section.custom .section-head {
                    color: #92400e !important;
                    font-weight: 600 !important;
                }
                .custom-purchase-invoice-ui .form-dashboard-section.custom .section-body {
                    color: #b45309 !important;
                    font-weight: 500 !important;
                }

                /* Odoo Form Sheet and Layout Styling */
                .custom-purchase-invoice-ui .form-layout, 
                .custom-purchase-invoice-ui .odoo-form-sheet {
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
                .custom-purchase-invoice-ui .form-tabs {
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
                .custom-purchase-invoice-ui .form-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-purchase-invoice-ui .form-tabs .nav-tabs {
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
                .custom-purchase-invoice-ui .form-tabs .nav-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-purchase-invoice-ui .form-tab-content, 
                .custom-purchase-invoice-ui .tab-content, 
                .custom-purchase-invoice-ui .form-tab-pane, 
                .custom-purchase-invoice-ui .tab-pane {
                    border: none !important;
                    margin-top: 0px !important;
                    padding-top: 0px !important;
                }

                .custom-purchase-invoice-ui .form-tabs .nav-link {
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

                .custom-purchase-invoice-ui .form-tabs .nav-link:hover {
                    color: #3d3566 !important;
                    background: rgba(113, 99, 158, 0.08) !important;
                    border: none !important;
                }

                .custom-purchase-invoice-ui .form-tabs .nav-link.active {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #7b6daa 0%, #635490 100%) !important;
                    border: none !important;
                    font-weight: 700 !important;
                    box-shadow: 0 2px 8px rgba(113, 99, 158, 0.3) !important;
                }

                /* Odoo Section Headings (Subheadings) */
                .custom-purchase-invoice-ui .form-section { 
                    border: none !important; 
                    border-top: none !important; 
                    border-bottom: none !important; 
                    margin-top: 0 !important; 
                    padding-top: 0 !important; 
                }
                .custom-purchase-invoice-ui .form-section .section-head {
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
                .custom-purchase-invoice-ui .form-section:first-child .section-head {
                    margin-top: 4px !important;
                }

                /* Ensure all form inputs, selects, and textareas have consistent font family and underline style */
                .custom-purchase-invoice-ui input[type="text"],
                .custom-purchase-invoice-ui input[type="number"],
                .custom-purchase-invoice-ui input[type="email"],
                .custom-purchase-invoice-ui input[type="password"],
                .custom-purchase-invoice-ui input[type="tel"],
                .custom-purchase-invoice-ui select,
                .custom-purchase-invoice-ui textarea,
                .custom-purchase-invoice-ui .frappe-control input[type="text"],
                .custom-purchase-invoice-ui .frappe-control input[type="number"],
                .custom-purchase-invoice-ui .frappe-control input[type="email"],
                .custom-purchase-invoice-ui .frappe-control input[type="password"],
                .custom-purchase-invoice-ui .frappe-control input[type="tel"],
                .custom-purchase-invoice-ui .frappe-control select,
                .custom-purchase-invoice-ui .frappe-control textarea,
                .custom-purchase-invoice-ui input[readonly]:not([type="checkbox"]):not([type="radio"]),
                .custom-purchase-invoice-ui input[disabled]:not([type="checkbox"]):not([type="radio"]),
                .custom-purchase-invoice-ui .control-value:not([type="checkbox"]):not([type="radio"]),
                .custom-purchase-invoice-ui .like-disabled-input:not([type="checkbox"]):not([type="radio"]) {
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
                .custom-purchase-invoice-ui .frappe-control[data-fieldtype="Small Text"] .control-input {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                .custom-purchase-invoice-ui .frappe-control[data-fieldtype="Small Text"] textarea {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 38px !important;
                    min-height: 38px !important;
                    resize: none !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                }

                .custom-purchase-invoice-ui input.error-highlight,
                .custom-purchase-invoice-ui select.error-highlight,
                .custom-purchase-invoice-ui textarea.error-highlight,
                .custom-purchase-invoice-ui .frappe-control input.error-highlight,
                .custom-purchase-invoice-ui .frappe-control select.error-highlight,
                .custom-purchase-invoice-ui .frappe-control textarea.error-highlight {
                    background-color: #fee2e2 !important;
                    border-bottom-color: #ef4444 !important;
                    border-bottom-width: 2px !important;
                }
                
                .custom-purchase-invoice-ui .frappe-control input::placeholder,
                .custom-purchase-invoice-ui input::placeholder {
                    font-size: 12px !important;
                    color: #9ca3af !important;
                    font-weight: 400 !important;
                    white-space: normal !important;
                    text-overflow: ellipsis !important;
                }
                
                /* Adjust Street textarea height to perfectly align Country and State */
                .custom-purchase-invoice-ui [data-fieldname="custom_street"] textarea {
                    height: 136px !important;
                    min-height: 136px !important;
                }
                
                /* Adjust Additional Info textarea height to perfectly align with Expected CTC */
                .custom-purchase-invoice-ui [data-fieldname="additional_info"] textarea,
                .custom-purchase-invoice-ui [data-fieldname="custom_additional_info"] textarea {
                    height: 92px !important;
                    min-height: 92px !important;
                }
                
                .custom-purchase-invoice-ui input[type="text"]:focus,
                .custom-purchase-invoice-ui input[type="number"]:focus,
                .custom-purchase-invoice-ui input[type="email"]:focus,
                .custom-purchase-invoice-ui input[type="password"]:focus,
                .custom-purchase-invoice-ui input[type="tel"]:focus,
                .custom-purchase-invoice-ui select:focus,
                .custom-purchase-invoice-ui textarea:focus,
                .custom-purchase-invoice-ui .frappe-control input[type="text"]:focus,
                .custom-purchase-invoice-ui .frappe-control input[type="number"]:focus,
                .custom-purchase-invoice-ui .frappe-control input[type="email"]:focus,
                .custom-purchase-invoice-ui .frappe-control input[type="password"]:focus,
                .custom-purchase-invoice-ui .frappe-control input[type="tel"]:focus,
                .custom-purchase-invoice-ui .frappe-control select:focus,
                .custom-purchase-invoice-ui .frappe-control textarea:focus {
                    border: 1px solid #ee8d21 !important;
                    background-color: #ffffff !important;
                    box-shadow: 0 0 0 3px rgba(238, 141, 33, 0.15) !important;
                    outline: none !important;
                }
                
                /* Auto-resize textareas require overflow hidden to prevent scrollbar flash */
                .custom-purchase-invoice-ui textarea {
                    overflow-y: hidden !important;
                    resize: none !important;
                }

                /* Odoo Horizontal Field Layout: Label on Left, Input on Right */
                .custom-purchase-invoice-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 22px !important;
                }
                
                /* Standard / 2-Column Layout Label Width */
                .custom-purchase-invoice-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 210px !important;
                    min-width: 210px !important;
                    margin-bottom: 0 !important;
                    padding-right: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                }

                /* 3-Column / Compact Layout Label Width */
                .custom-purchase-invoice-ui .form-column.col-sm-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-purchase-invoice-ui .form-column.col-md-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-purchase-invoice-ui .form-column.col-sm-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-purchase-invoice-ui .form-column.col-md-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 110px !important;
                    min-width: 110px !important;
                    padding-right: 8px !important;
                }

                .custom-purchase-invoice-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix .control-label {
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
                .custom-purchase-invoice-ui .frappe-control[data-fieldtype="Small Text"] .form-group .clearfix .control-label,
                .custom-purchase-invoice-ui .frappe-control[data-fieldtype="Text"] .form-group .clearfix .control-label,
                .custom-purchase-invoice-ui .frappe-control[data-fieldtype="Long Text"] .form-group .clearfix .control-label,
                .custom-purchase-invoice-ui .frappe-control[data-fieldtype="Text Editor"] .form-group .clearfix .control-label {
                    font-weight: 700 !important;
                    font-size: 12.5px !important;
                    color: #1e293b !important;
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: 0.01em !important;
                }

                .custom-purchase-invoice-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .control-input-wrapper {
                    flex: 1 !important;
                    width: 100% !important;
                }
                
                /* Style read-only / display fields similarly */
                .custom-purchase-invoice-ui .frappe-control:not([data-fieldtype="Check"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .disp-area:not(.checkbox .disp-area) {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    font-weight: 500 !important;
                    font-size: 13.5px !important;
                    color: #475569 !important;
                    padding: 8px 0 !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }
            .custom-purchase-invoice-ui .btn-secondary {
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                border: 1px solid #e2e8f0 !important;
                background-color: #ffffff !important;
                color: #475569 !important;
            }
            .custom-purchase-invoice-ui .btn-secondary:hover {
                background-color: #f8fafc !important;
                color: #0f172a !important;
                border-color: #cbd5e1 !important;
            }
            
            /* Mandatory Field Red Left Border - MUST BE AT THE VERY END */
            .custom-purchase-invoice-ui .is-mandatory-wrapper input:not([type="checkbox"]):not([type="radio"]),
            .custom-purchase-invoice-ui .is-mandatory-wrapper select,
            .custom-purchase-invoice-ui .is-mandatory-wrapper textarea,
            .custom-purchase-invoice-ui .is-mandatory-wrapper .disp-area:not(.checkbox .disp-area),
            .custom-purchase-invoice-ui .is-mandatory-wrapper .control-value:not([type="checkbox"]):not([type="radio"]),
            .custom-purchase-invoice-ui .is-mandatory-wrapper .like-disabled-input:not([type="checkbox"]):not([type="radio"]),
            .custom-purchase-invoice-ui .is-mandatory-wrapper input[readonly]:not([type="checkbox"]):not([type="radio"]),
            .custom-purchase-invoice-ui .is-mandatory-wrapper input[disabled]:not([type="checkbox"]):not([type="radio"]),
            .custom-purchase-invoice-ui .frappe-control input.is-mandatory-field,
            .custom-purchase-invoice-ui .frappe-control select.is-mandatory-field,
            .custom-purchase-invoice-ui .frappe-control textarea.is-mandatory-field {
                border-left: 4px solid #ef4444 !important;
            }
            
            .custom-purchase-invoice-ui .is-mandatory-wrapper .disp-area:not(.checkbox .disp-area),
            .custom-purchase-invoice-ui .is-mandatory-wrapper .control-value:not([type="checkbox"]):not([type="radio"]),
            .custom-purchase-invoice-ui .is-mandatory-wrapper .like-disabled-input:not([type="checkbox"]):not([type="radio"]) {
                padding-left: 8px !important;
            }
        </style>
    `);
    }
}


function update_status_color(frm) {
    let status = frm.doc.status;
    if (!status) return;
    
    let field = frm.fields_dict['status'];
    if (!field || !field.$input) return;
    
    let el = field.$input[0];
    if (!el) return;
    
    let colors = { bg: '#f8fafc', border: '#cbd5e1', borderLeft: '#94a3b8', text: '#334155' };
    
    const status_lower = status.toLowerCase();
    
    if (status_lower === 'paid') {
        colors = { bg: '#f0fdf4', border: '#bbf7d0', borderLeft: '#15803d', text: '#166534' };
    } else if (status_lower === 'return' || status_lower === 'cancelled' || status_lower === 'unpaid') {
        colors = { bg: '#fef2f2', border: '#fecaca', borderLeft: '#b91c1c', text: '#991b1b' };
    } else if (status_lower === 'overdue' || status_lower === 'debit note issued') {
        colors = { bg: '#fffbeb', border: '#fde68a', borderLeft: '#d97706', text: '#b45309' };
    } else if (status_lower === 'submitted' || status_lower === 'partly paid' || status_lower === 'draft' || status_lower === 'internal transfer') {
        colors = { bg: '#f5f3ff', border: '#ede9fe', borderLeft: '#6d28d9', text: '#5b21b6' };
    }

    el.style.setProperty('background-color', colors.bg, 'important');
    el.style.setProperty('color', colors.text, 'important');
    el.style.setProperty('border', `1px solid ${colors.border}`, 'important');
    el.style.setProperty('border-left', `4px solid ${colors.borderLeft}`, 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('font-weight', '600', 'important');
    
    // Adjust arrow icon color if present
    $(el).siblings('.octicon-chevron-down').css('color', colors.text);
}

// --- START AI INVOICE PARSING BLOCKS ---

function setup_ai_invoice_block(frm) {
    if (frm.custom_invoice_upload_btn_injected) {
        if (frm.doc.custom_supplier_invoice_pdf) {
            $('#viewInvoicePreviewBtn').css('display', 'inline-flex');
            $('#openInvoiceUploadBtn').css('display', 'none');
        } else {
            $('#viewInvoicePreviewBtn').css('display', 'none');
            $('#openInvoiceUploadBtn').css('display', 'inline-flex');
        }
        return;
    }

    // Insert just before the first form section
    let wrapper = $(frm.wrapper).find('.form-section').first();
    if (!wrapper.length) {
        wrapper = $(frm.fields_dict.supplier.wrapper).closest('.form-section');
    }
    if (!wrapper.length) return; // Fallback in case of layout changes
    
    const btn_html = `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <h4 style="margin: 0 0 5px 0; color: #1e293b; font-weight: 600;">AI Invoice Parsing</h4>
                <p style="margin: 0; color: #64748b; font-size: 13px;">Upload the Supplier's Invoice to automatically extract and fill details.</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="viewInvoicePreviewBtn" type="button" style="
                    display: ${frm.doc.custom_supplier_invoice_pdf ? 'inline-flex' : 'none'};
                    background-color: #f1f5f9;
                    color: #475569;
                    font-weight: 500;
                    border: 1px solid #cbd5e1;
                    padding: 8px 16px;
                    border-radius: 6px;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    <i class="fa fa-eye" style="margin-right: 6px;"></i> View Invoice
                </button>
                <button id="supplierActivityBtn" type="button" style="
                    display: none;
                    background-color: #f59e0b;
                    color: #ffffff;
                    font-weight: 500;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    box-shadow: 0 2px 4px rgba(245, 158, 11, 0.25);
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-right: 12px;
                ">
                    <i class="fa fa-list-alt" style="margin-right: 6px;"></i> Supplier Activity
                </button>
                <button id="viewInvoicePreviewBtn" type="button" style="
                    display: ${frm.doc.custom_supplier_invoice_pdf ? 'inline-flex' : 'none'};
                    background-color: #f1f5f9;
                    color: #475569;
                    font-weight: 500;
                    border: 1px solid #cbd5e1;
                    padding: 8px 16px;
                    border-radius: 6px;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-right: 12px;
                ">
                    <i class="fa fa-eye" style="margin-right: 6px;"></i> View Invoice
                </button>
                <button id="openInvoiceUploadBtn" type="button" style="
                    display: ${frm.doc.custom_supplier_invoice_pdf ? 'none' : 'inline-flex'};
                    background-color: #71639e;
                    color: #ffffff;
                    font-weight: 500;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    box-shadow: 0 2px 4px rgba(113, 99, 158, 0.25);
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    <i class="fa fa-cloud-upload" style="margin-right: 6px;"></i> Upload Invoice
                </button>
            </div>
        </div>
    `;
    
    wrapper.before(btn_html);

    $('#openInvoiceUploadBtn').hover(
        function() { $(this).css({ 'background-color': '#5b4f80', 'box-shadow': '0 4px 8px rgba(113, 99, 158, 0.35)' }); },
        function() { $(this).css({ 'background-color': '#71639e', 'box-shadow': '0 2px 4px rgba(113, 99, 158, 0.25)' }); }
    );

    $('#viewInvoicePreviewBtn').hover(
        function() { $(this).css({ 'background-color': '#e2e8f0', 'color': '#0f172a' }); },
        function() { $(this).css({ 'background-color': '#f1f5f9', 'color': '#475569' }); }
    );

    $('#supplierActivityBtn').hover(
        function() { $(this).css({ 'background-color': '#d97706', 'box-shadow': '0 4px 8px rgba(245, 158, 11, 0.35)' }); },
        function() { $(this).css({ 'background-color': '#f59e0b', 'box-shadow': '0 2px 4px rgba(245, 158, 11, 0.25)' }); }
    );

    $('#supplierActivityBtn').on('click', function() {
        show_supplier_activity_modal(frm);
    });

    $('#openInvoiceUploadBtn').on('click', function() {
        show_invoice_upload_dialog(frm);
    });

    $('#viewInvoicePreviewBtn').on('click', function() {
        if(frm.doc.custom_supplier_invoice_pdf) {
            show_invoice_preview_panel(frm.doc.custom_supplier_invoice_pdf);
        }
    });
    
    frm.custom_invoice_upload_btn_injected = true;
}

function show_invoice_upload_dialog(frm) {
    let htmlContent = `
        <div id="custom_invoice_upload_modal" style="
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        ">
            <div class="custom-modal-content" style="
                background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
                border-radius: 24px;
                width: 540px;
                max-width: 90vw;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.5);
                transform: scale(0.9) translateY(20px);
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
                position: relative;
                font-family: 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
            ">
                <!-- Decorative Background Elements -->
                <div style="position: absolute; top: -50px; left: -50px; width: 150px; height: 150px; background: rgba(99, 102, 241, 0.1); filter: blur(40px); border-radius: 50%; pointer-events: none;"></div>
                <div style="position: absolute; bottom: -50px; right: -50px; width: 150px; height: 150px; background: rgba(236, 72, 153, 0.1); filter: blur(40px); border-radius: 50%; pointer-events: none;"></div>

                <!-- Close Button -->
                <button id="close_invoice_modal" style="
                    position: absolute;
                    top: 20px; right: 20px;
                    width: 36px; height: 36px;
                    border-radius: 12px;
                    border: none;
                    background: rgba(241, 245, 249, 0.8);
                    color: #64748b;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s ease;
                    z-index: 10;
                    backdrop-filter: blur(4px);
                " onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a'; this.style.transform='rotate(90deg)';" onmouseout="this.style.background='rgba(241, 245, 249, 0.8)'; this.style.color='#64748b'; this.style.transform='rotate(0deg)';">
                    <i class="fa fa-times"></i>
                </button>

                <!-- Body -->
                <div style="padding: 40px 32px; position: relative; z-index: 1;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="
                            width: 64px;
                            height: 64px;
                            border-radius: 20px;
                            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                            box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 20px auto;
                            color: white;
                        ">
                            <i class="fa fa-file-invoice" style="font-size: 28px;"></i>
                        </div>
                        <h3 style="margin: 0 0 10px 0; font-weight: 800; color: #0f172a; font-size: 24px; letter-spacing: -0.5px;">Upload Invoice & Auto-fill</h3>
                        <p style="margin: 0; color: #64748b; font-size: 15px; line-height: 1.5;">Upload the Supplier's Invoice to automatically extract and populate the form.</p>
                    </div>

                    <div id="invoiceUploadWrapper">
                        <input type="file" id="aiInvoiceInput" accept=".pdf,.doc,.docx" style="display: none;">
                        <div id="invoiceUploadZone" style="
                            border: 2px dashed #cbd5e1;
                            border-radius: 20px;
                            padding: 40px 24px;
                            text-align: center;
                            background: rgba(248, 250, 252, 0.7);
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            position: relative;
                            overflow: hidden;
                        " onmouseover="this.style.borderColor='#8b5cf6'; this.style.background='rgba(139, 92, 246, 0.04)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 20px -10px rgba(139,92,246,0.15)';" onmouseout="this.style.borderColor='#cbd5e1'; this.style.background='rgba(248, 250, 252, 0.7)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                            <i class="fa fa-cloud-upload" style="font-size: 40px; color: #8b5cf6; margin-bottom: 16px; transition: transform 0.3s;" id="uploadIconAnim"></i>
                            <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px; font-weight: 700;">Click to Upload or Drag & Drop</h4>
                            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">Supported formats: PDF, DOC, DOCX</p>
                            
                            <div style="
                                background: #ffffff; 
                                border: 1px solid #e2e8f0; 
                                padding: 10px 16px; 
                                border-radius: 10px; 
                                display: inline-block;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                            ">
                                <p style="margin: 0; color: #6366f1; font-size: 13px; font-weight: 600;">
                                    <i class="fa fa-lightbulb-o" style="margin-right: 6px; color: #f59e0b;"></i> 
                                    <b>Tip:</b> You can also <b>Copy</b> a file and press <b>Ctrl+V</b> here to paste!
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div id="aiProcessingWrapper" style="display: none; text-align: center; padding: 30px 0;">
                        <div style="
                            position: relative;
                            width: 70px;
                            height: 90px;
                            margin: 0 auto 24px auto;
                            border: 2px solid #e2e8f0;
                            border-radius: 10px;
                            background: #ffffff;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
                        ">
                            <i class="fa fa-file-text-o" style="font-size: 34px; color: #cbd5e1;"></i>
                            <div style="
                                position: absolute;
                                top: 0; left: 0; width: 100%; height: 4px;
                                background: linear-gradient(90deg, #6366f1, #8b5cf6);
                                box-shadow: 0 0 12px #8b5cf6;
                                animation: aiScan 1.5s ease-in-out infinite;
                            "></div>
                        </div>
                        <h4 style="color: #0f172a; margin: 0 0 8px 0; font-weight: 700; font-size: 18px;">AI is analyzing Invoice...</h4>
                        <p id="aiProcessingText" style="color: #64748b; font-size: 14px; margin: 0;">Extracting text from document...</p>
                        <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 10px; margin-top: 24px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                            <div id="aiProgressBarTop" style="height: 100%; width: 10%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 10px; transition: width 0.4s ease-out;"></div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes aiScan { 0% { top: 0; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
            </style>
        </div>
    `;

    $('#custom_invoice_upload_modal').remove();
    $('body').append(htmlContent);

    let $modal = $('#custom_invoice_upload_modal');

    setTimeout(() => {
        $modal.css('opacity', '1');
        $modal.find('.custom-modal-content').css('transform', 'scale(1) translateY(0)');
    }, 10);

    let closeModal = function () {
        document.removeEventListener('paste', handlePaste);
        $(window).off('paste.invoice_upload');
        $modal.css('opacity', '0');
        $modal.find('.custom-modal-content').css('transform', 'scale(0.95) translateY(10px)');
        setTimeout(() => $modal.remove(), 300);
    };

    $('#close_invoice_modal').on('click', closeModal);
    $modal.on('click', function (e) {
        if (e.target.id === 'custom_invoice_upload_modal') closeModal();
    });

    const fileInput = document.getElementById('aiInvoiceInput');
    const uploadZone = document.getElementById('invoiceUploadZone');

    if(uploadZone && fileInput) {
        uploadZone.onclick = () => fileInput.click();
        
        uploadZone.ondragover = (e) => {
            e.preventDefault();
            uploadZone.style.background = "rgba(139, 92, 246, 0.04)";
            uploadZone.style.borderColor = "#8b5cf6";
        };
        uploadZone.ondragleave = (e) => {
            e.preventDefault();
            uploadZone.style.background = "rgba(248, 250, 252, 0.7)";
            uploadZone.style.borderColor = "#cbd5e1";
        };
        uploadZone.ondrop = (e) => {
            e.preventDefault();
            uploadZone.style.background = "rgba(248, 250, 252, 0.7)";
            uploadZone.style.borderColor = "#cbd5e1";
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileUpload(e.dataTransfer.files[0]);
            }
        };
        
        fileInput.onchange = (e) => {
            if (e.target.files.length) {
                handleFileUpload(e.target.files[0]);
            }
        };
    }

    const handlePaste = (e) => {
        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length) {
            e.preventDefault();
            const file = e.clipboardData.files[0];
            if (fileInput) fileInput.files = e.clipboardData.files;
            handleFileUpload(file);
        }
    };
    
    document.addEventListener('paste', handlePaste);

    function handleFileUpload(file) {
        if (!file) return;

        document.getElementById('invoiceUploadWrapper').style.display = 'none';
        document.getElementById('aiProcessingWrapper').style.display = 'block';
        $('#close_invoice_modal').hide();

        let progress = 10;
        const pb = document.getElementById('aiProgressBarTop');
        const pt = document.getElementById('aiProcessingText');
        if(pb) pb.style.width = "10%";

        let pInt = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 5 + 2;
                if(pb) pb.style.width = progress + "%";
                if(progress > 30 && progress < 60) pt.innerText = "Identifying key Invoice fields...";
                else if(progress >= 60 && progress < 85) pt.innerText = "Structuring line items and dates...";
            }
        }, 600);

        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            let filedata = reader.result.split(',')[1];
            
            frappe.call({
                method: "uploadfile",
                args: {
                    from_form: 1,
                    doctype: "Purchase Invoice",
                    docname: frm.doc.name,
                    filename: file.name,
                    filedata: filedata,
                    is_private: 1
                },
                callback: function(r) {
                    if (r.message && r.message.file_url) {
                        frm.set_value('custom_supplier_invoice_pdf', r.message.file_url);
                        
                        frappe.call({
                            method: "nexapp.api.extract_purchase_invoice_data",
                            args: {
                                file_url: r.message.file_url
                            },
                            callback: function(ai_res) {
                                clearInterval(pInt);
                                if(pb) pb.style.width = "100%";
                                
                                let data = ai_res.message || {};
                                
                                if (data.status === "error") {
                                    pt.innerText = "Extraction Failed!";
                                    frappe.msgprint({
                                        title: __('Extraction Error'),
                                        indicator: 'red',
                                        message: data.message
                                    });
                                    closeModal();
                                    return;
                                }

                                pt.innerText = "Data Extracted Successfully!";
                                
                                setTimeout(() => {
                                    closeModal();
                                    
                                    // The Python API returns {"status": "success", "data": {...}}
                                    let extracted_data = data.data || data;
                                    
                                    populate_invoice_form_from_ai(frm, extracted_data);
                                    let msg = 'Form filled with AI extracted data. Click "View Invoice" to verify fields.';
                                    let warnings = [];
                                    if (extracted_data.supplier_warning) warnings.push(extracted_data.supplier_warning);
                                    if (extracted_data.invoice_no_warning) warnings.push(extracted_data.invoice_no_warning);
                                    if (extracted_data.items_warning) warnings.push(extracted_data.items_warning);
                                    
                                    if (warnings.length > 0) {
                                        msg += '<br><br><b>Note:</b><br>' + warnings.join('<br>');
                                    }
                                    frappe.show_alert({message: msg, indicator: warnings.length > 0 ? 'orange' : 'green'}, 10);
                                    
                                    // Make sure the View Invoice button shows immediately
                                    $('#viewInvoicePreviewBtn').css('display', 'inline-flex');
                                }, 800);
                            },
                            error: function(err) {
                                clearInterval(pInt);
                                frappe.msgprint("Error communicating with AI parser.");
                                closeModal();
                            }
                        });
                    } else {
                        clearInterval(pInt);
                        frappe.msgprint("Error uploading file.");
                        closeModal();
                    }
                },
                error: function(err) {
                    clearInterval(pInt);
                    frappe.msgprint("Error uploading file.");
                    closeModal();
                }
            });
        };
    }
}

function populate_invoice_form_from_ai(frm, data) {
    let fields_to_set = {};
    
    // Ensure dates are strictly YYYY-MM-DD for Frappe set_value. Failsafe: return null if invalid.
    function format_date_strict(d) {
        if (!d) return null;
        if (typeof d !== 'string') d = String(d);
        d = d.trim();
        
        // If already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        
        // Manual DD-MM-YYYY / DD/MM/YYYY catch
        let m = d.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (m) {
            return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        }
        
        // Try multiple standard formats with moment
        let parsed = moment(d, ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'MM-DD-YYYY', 'MM/DD/YYYY', 'D-MMM-YY', 'D-MMM-YYYY', 'YYYY-MM-DD HH:mm:ss']);
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
        }
        
        // If it cannot be confidently parsed to YYYY-MM-DD, return null to prevent Frappe validation crash
        return null;
    }

    if (data.invoice_no) fields_to_set['bill_no'] = data.invoice_no;
    
    if (data.invoice_date) {
        let parsed_date = format_date_strict(data.invoice_date);
        if (parsed_date) {
            fields_to_set['bill_date'] = parsed_date;
        }
    }
    
    if (data.duration_from) {
        let d = format_date_strict(data.duration_from);
        if (d) fields_to_set['custom_duration_from'] = d;
    }
    if (data.duration_to) {
        let d = format_date_strict(data.duration_to);
        if (d) fields_to_set['custom_duration_to'] = d;
    }
    if (data.supplier_name) fields_to_set['supplier'] = data.supplier_name;
    
    if (Object.keys(fields_to_set).length > 0) {
        frm.set_value(fields_to_set);
    }
    
    if (data.items && data.items.length > 0) {
        frm.clear_table('items');
        data.items.forEach(item => {
            let row = frm.add_child('items');
            frappe.model.set_value(row.doctype, row.name, 'description', item.description || '');
            if (item.qty) frappe.model.set_value(row.doctype, row.name, 'qty', item.qty);
            if (item.rate) frappe.model.set_value(row.doctype, row.name, 'rate', item.rate);
            if (item.amount) frappe.model.set_value(row.doctype, row.name, 'amount', item.amount);
        });
        frm.refresh_field('items');
    }

    // Highlight empty mandatory fields
    setTimeout(() => {
        frm.meta.fields.forEach(df => {
            if (df.reqd && !frm.doc[df.fieldname]) {
                let field = frm.fields_dict[df.fieldname];
                if (field && field.$input) {
                    field.$input.addClass('error-highlight');
                    
                    // Remove highlight when user types
                    field.$input.on('change input', function() {
                        if ($(this).val()) {
                            $(this).removeClass('error-highlight');
                        }
                    });
                }
            }
        });
    }, 500);

    // Save extracted references for Supplier Activity modal
    frm.__ai_lms_id = data.lms_id;
    frm.__ai_po_number = data.po_number;
    frm.__ai_raw_text = data.raw_text;
    $('#supplierActivityBtn').css('display', 'inline-flex');
}

function show_invoice_preview_panel(file_url) {
    // Remove any existing panel
    $('#cv-preview-panel-overlay').remove();
    $('#cv-preview-panel').remove();

    // Determine if the file is a PDF for iframe preview
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
            <!-- Panel Header -->
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
                        <h4 style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">Invoice Preview</h4>
                        <span style="font-size: 11px; color: #64748b;">Verify extracted fields against the original document</span>
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

            <!-- Panel Body (iframe / preview) -->
            <div style="flex: 1; overflow: hidden; background: #ffffff;">
                ${preview_content}
            </div>
        </div>
    `;

    $('body').append(panel_html);

    // Apply layout split styling
    $('body').addClass('cv-panel-open');
    
    // Inject responsive CSS to shrink the form when the panel is open
    if (!$('#cv-panel-responsive-css').length) {
        $(`<style id="cv-panel-responsive-css">
            /* Shrink the entire Frappe page container to 60% */
            body.cv-panel-open .page-container {
                width: 60% !important;
                min-width: 0 !important;
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Hide ALL Frappe sidebars */
            body.cv-panel-open .form-sidebar,
            body.cv-panel-open .overlay-sidebar,
            body.cv-panel-open .layout-side-section { 
                display: none !important; 
            }
            
            /* CRITICAL FIX: Switch to vertical layout */
            body.cv-panel-open .custom-purchase-invoice-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                flex-direction: column !important;
                align-items: stretch !important;
                margin-bottom: 10px !important;
            }
            
            body.cv-panel-open .custom-purchase-invoice-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                width: 100% !important;
                min-width: unset !important;
                padding-right: 0 !important;
                margin-bottom: 2px !important;
            }
            
            body.cv-panel-open .custom-purchase-invoice-ui .frappe-control .control-label {
                font-size: 10.5px !important;
            }
            
            body.cv-panel-open .custom-purchase-invoice-ui .frappe-control input,
            body.cv-panel-open .custom-purchase-invoice-ui .frappe-control select,
            body.cv-panel-open .custom-purchase-invoice-ui .frappe-control textarea {
                font-size: 11.5px !important;
                min-height: 28px !important;
                padding: 3px 8px !important;
            }
        </style>`).appendTo('head');
    }

    // Animate in
    setTimeout(() => {
        $('#cv-preview-panel').css('right', '0');
    }, 20);

    // Close logic
    function close_cv_panel() {
        $('#cv-preview-panel').css('right', '-40%');
        $('body').removeClass('cv-panel-open');
        
        setTimeout(() => {
            $('#cv-preview-panel').remove();
            $('#cv-panel-responsive-css').remove();
        }, 400);
    }

    $('#close-cv-preview-panel').on('click', close_cv_panel);
}

function show_supplier_activity_modal(frm) {
    if (!frm.doc.supplier) {
        frappe.msgprint({
            title: __('Supplier Required'),
            indicator: 'orange',
            message: __('Please select a Supplier first to view activity.')
        });
        return;
    }

    let po_number = frm.__ai_po_number || null;
    let lms_id = frm.__ai_lms_id || null;

    // Remove any existing custom modal
    $('#custom-supplier-activity-modal').remove();

    // Create the overlay and modal container
    let modal_html = `
        <div id="custom-supplier-activity-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.4);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(2px);
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
        ">
            <div style="
                background: #ffffff;
                width: 800px;
                max-width: 90vw;
                border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                display: flex;
                flex-direction: column;
                max-height: 85vh;
                transform: scale(0.95);
                transition: transform 0.2s ease-in-out;
                overflow: hidden;
            ">
                <!-- Modal Body (Scrollable) -->
                <div id="custom-supplier-activity-content" style="padding: 24px; overflow-y: auto; flex-grow: 1;">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fa fa-spinner fa-spin fa-2x" style="color: #71639e;"></i>
                        <p style="margin-top: 15px; color: #475569; font-weight: 500;">Searching Lastmile Services Master...</p>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div style="
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                ">
                    <button id="close-custom-supplier-modal" style="
                        background: #0f172a;
                        color: #ffffff;
                        border: none;
                        padding: 10px 24px;
                        border-radius: 20px;
                        font-weight: 600;
                        font-size: 14px;
                        cursor: pointer;
                        transition: background 0.2s;
                    ">Close</button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modal_html);

    // Animate in
    setTimeout(() => {
        $('#custom-supplier-activity-modal').css('opacity', '1');
        $('#custom-supplier-activity-modal > div').css('transform', 'scale(1)');
    }, 10);

    // Close logic
    $('#close-custom-supplier-modal, #custom-supplier-activity-modal').on('click', function(e) {
        if (e.target === this) {
            $('#custom-supplier-activity-modal').css('opacity', '0');
            $('#custom-supplier-activity-modal > div').css('transform', 'scale(0.95)');
            setTimeout(() => {
                $('#custom-supplier-activity-modal').remove();
            }, 200);
        }
    });

    frappe.call({
        method: 'nexapp.api.get_supplier_activity_details',
        args: {
            supplier: frm.doc.supplier,
            po_number: po_number,
            lms_id: lms_id,
            raw_text: frm.__ai_raw_text || null
        },
        callback: function(r) {
            let data = r.message || {};
            let content_container = $('#custom-supplier-activity-content');
            
            if (data.status === "error" || !data.data || data.data.length === 0) {
                content_container.html(`
                    <div style="padding: 30px; text-align: center; color: #475569;">
                        <i class="fa fa-info-circle fa-3x" style="color: #94a3b8; margin-bottom: 16px;"></i>
                        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-weight: 600;">No Activity Found</h3>
                        <p style="font-size: 14px;">No matching LMS records found for supplier: <b>${frm.doc.supplier}</b></p>
                    </div>
                `);
                return;
            }

            let html = `
                <div style="background-color: #f8fafc; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px;">
                    <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <i class="fa fa-building" style="color: #475569; font-size: 20px;"></i>
                    </div>
                    <div>
                        <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Supplier Activity Report</span><br>
                        <span style="font-size: 18px; color: #0f172a; font-weight: 700;">${frm.doc.supplier}</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 16px;">
            `;

            data.data.forEach((row, idx) => {
                let badge_color = row.match_percentage >= 50 ? '#10b981' : (row.match_percentage > 0 ? '#f59e0b' : '#94a3b8');
                let badge_bg = row.match_percentage >= 50 ? '#d1fae5' : (row.match_percentage > 0 ? '#fef3c7' : '#f1f5f9');
                
                let format_date = (d) => d ? moment(d).format('DD-MM-YYYY') : '-';
                
                // Fallback for Site Status if missing from backend
                let status_display = row.site_status ? `<span style="color: #f59e0b; font-weight: 600;">[${row.site_status}]</span>` : '';

                html += `
                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <div class="lms-header" data-idx="${idx}" style="padding: 16px 20px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background-color 0.2s ease;">
                            <div>
                                <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 10px;">
                                    ${row.name} <span style="font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 700; background-color: ${badge_bg}; color: ${badge_color};">${row.match_percentage}% Match</span>
                                </h4>
                                <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">
                                    <b>Customer:</b> ${row.customer || '-'} &nbsp;&bull;&nbsp; <b>Stage:</b> ${row.lms_stage || '-'}
                                </p>
                            </div>
                            <div>
                                <i class="fa fa-chevron-down toggle-icon-${idx}" style="color: #94a3b8; transition: transform 0.2s ease; font-size: 16px;"></i>
                            </div>
                        </div>
                        <div class="lms-body lms-body-${idx}" style="display: none; padding: 24px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                                <div><span style="font-size: 12px; color: #64748b;">LMS Delivery Date</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${format_date(row.lms_delivery_date)}</span></div>
                                <div><span style="font-size: 12px; color: #64748b;">Order Type</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${row.order_type || '-'}</span></div>
                                <div><span style="font-size: 12px; color: #64748b;">Circuit ID</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${row.circuit_id || '-'}</span></div>
                                
                                <div><span style="font-size: 12px; color: #64748b;">Billing Start Date</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${format_date(row.billing_start_date)}</span></div>
                                <div><span style="font-size: 12px; color: #64748b;">Bandwidth Type</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${row.bandwith_type || '-'}</span></div>
                                <div><span style="font-size: 12px; color: #64748b;">Bandwidth Name</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${row.lms_brandwith_name || '-'}</span></div>
                                
                                <div><span style="font-size: 12px; color: #64748b;">Solution</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${row.solution || '-'}</span></div>
                                <div><span style="font-size: 12px; color: #64748b;">Customer Type</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${row.customer_type || '-'}</span></div>
                                <div><span style="font-size: 12px; color: #64748b;">PO Number</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${row.po_number || '-'}</span></div>
                                
                                <div style="grid-column: span 3;"><span style="font-size: 12px; color: #64748b;">Site Name & Status</span><br><span style="font-size: 14px; font-weight: 500; color: #0f172a;">${row.site || '-'} ${status_display}</span></div>
                                
                                <div style="grid-column: span 3; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 4px; background-color: #fafafa;">
                                    <span style="font-size: 12px; color: #71639e; font-weight: 700; text-transform: uppercase;">Site Address</span><br>
                                    <span style="font-size: 14px; font-weight: 500; color: #0f172a; white-space: pre-wrap; display: block; margin-top: 4px;">${row.site_address || '<i>No Address Provided</i>'}</span>
                                </div>
                            `;

                if (row.payment_terms) {
                    html += `
                                <div style="grid-column: span 3; margin-top: 12px; padding-top: 16px; border-top: 1px dashed #cbd5e1;">
                                    <span style="font-size: 12px; color: #10b981; font-weight: 700; text-transform: uppercase;">Payment Terms (From PO)</span><br>
                                    <span style="font-size: 14px; font-weight: 600; color: #0f172a; display: block; margin-top: 4px;">${row.payment_terms}</span>
                                </div>
                    `;
                }

                html += `
                                <div style="grid-column: span 3; margin-top: 15px; text-align: right;">
                                    <button type="button" class="btn btn-primary select-lms-btn" style="background: #0f172a; border-color: #0f172a; border-radius: 8px; padding: 8px 20px; font-weight: 600;" data-idx="${idx}">
                                        Select and Update Form
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                </div>
            `;

            content_container.html(html);

            // Add toggle logic
            content_container.find('.lms-header').on('click', function() {
                let idx = $(this).attr('data-idx');
                let body = content_container.find('.lms-body-' + idx);
                let icon = content_container.find('.toggle-icon-' + idx);
                
                body.slideToggle(200);
                if (icon.css('transform') === 'none' || icon.css('transform') === 'matrix(1, 0, 0, 1, 0, 0)') {
                    icon.css('transform', 'rotate(180deg)');
                    $(this).css('background-color', '#f8fafc');
                } else {
                    icon.css('transform', 'rotate(0deg)');
                    $(this).css('background-color', '#ffffff');
                }
            });

            // Add select button logic
            content_container.find('.select-lms-btn').on('click', function(e) {
                e.stopPropagation(); // prevent toggling
                let idx = $(this).attr('data-idx');
                let selected_row = data.data[idx];
                
                // Collect AI extracted items from current form (supplier invoice data)
                let ai_items = (frm.doc.items || []).map(i => {
                    return {
                        item_code: i.item_code,
                        item_name: i.item_name,
                        description: i.description,
                        qty: i.qty,
                        rate: i.rate,
                        amount: i.amount
                    };
                });
                
                // Update parent form fields directly on doc to avoid trigger issues
                if (selected_row.name) frm.doc.custom_lms_id = selected_row.name;
                if (selected_row.circuit_id) frm.doc.custom_circuit_id = selected_row.circuit_id;
                
                frm.doc.bill_date = frappe.datetime.get_today();
                frm.doc.posting_date = frappe.datetime.get_today();
                
                // Site Name: direct assignment for Link field
                if (selected_row.site) {
                    frm.doc.custom_site_name = selected_row.site;
                }
                
                frm.refresh_fields();
                frm.dirty();
                
                frappe.call({
                    method: 'nexapp.api.get_po_or_lms_items',
                    args: {
                        po_number: selected_row.po_number,
                        lms_id: selected_row.name,
                        circuit_id: selected_row.circuit_id,
                        ai_items: JSON.stringify(ai_items)
                    },
                    callback: function(r) {
                        if (r.message && r.message.length > 0) {
                            // Properly clear items via Frappe API (not direct array assignment)
                            frm.clear_table('items');
                            
                            let items_data = r.message;
                            
                            // DIRECTLY assign values on the row object to bypass 
                            // Frappe's pricing engine (which overrides rate/qty with price list values)
                            items_data.forEach(item => {
                                let row = frm.add_child('items');
                                row.item_code = item.item_code || '';
                                row.item_name = item.item_name || '';
                                row.description = item.description || '';
                                row.qty = item.qty;
                                row.rate = item.rate;
                                row.amount = item.amount;
                                row.uom = item.uom || 'Nos';
                                row.purchase_order = item.purchase_order || '';
                                row.po_detail = item.po_detail || '';
                                row.cost_center = item.cost_center || '';
                                row.project = item.project || '';
                                row.expense_account = item.expense_account || '';
                                row.circuit_id = item.circuit_id || '';
                                row.custom_circuit_id = item.custom_circuit_id || '';
                                row.lms_id = item.lms_id || '';
                                row.custom_lms_id = item.custom_lms_id || '';
                            });
                            
                            // Properly clear taxes via Frappe API
                            frm.clear_table('taxes');
                            frm.doc.taxes_and_charges = '';
                            
                            // Recalculate totals properly
                            let total = 0;
                            (frm.doc.items || []).forEach(row => {
                                total += (row.rate || 0) * (row.qty || 0);
                            });
                            frm.doc.total = total;
                            frm.doc.net_total = total;
                            frm.doc.grand_total = total;
                            frm.doc.rounded_total = Math.round(total);
                            frm.doc.total_taxes_and_charges = 0;
                            frm.doc.base_total = total;
                            frm.doc.base_net_total = total;
                            frm.doc.base_grand_total = total;
                            frm.doc.base_rounded_total = Math.round(total);
                            frm.doc.outstanding_amount = total;
                            
                            frm.refresh_fields();
                            frm.dirty();
                            
                            frappe.show_alert({message: 'Form and Items updated successfully!', indicator: 'green'});
                        } else {
                            frappe.show_alert({message: 'Form updated. No items found in PO or LMS.', indicator: 'orange'});
                        }
                        
                        $('#custom-supplier-activity-modal').css('opacity', '0');
                        setTimeout(() => $('#custom-supplier-activity-modal').remove(), 200);
                    }
                });
            });
        }
    });
}
