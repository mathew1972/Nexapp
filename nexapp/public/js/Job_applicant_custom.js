frappe.ui.form.on('Job Applicant', {
    refresh: function(frm) {
        // --- START UI STYLING ---
        render_odoo_ui(frm);
        // --- END UI STYLING ---

        // Set query for opportunity_owner to dynamically load user list
        frm.set_query('opportunity_owner', function() {
            return {
                query: 'frappe.core.doctype.user.user.user_query',
                filters: { 'enabled': 1 }
            };
        });

        // Always show the AI resume block
        setup_ai_resume_block(frm);
        setup_ai_evaluation_block(frm);
        
        setTimeout(() => {
            update_stage_color(frm);
            update_status_color(frm);
        }, 100);
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
        
        // Apply styling immediately on load to prevent visual flicker
        render_odoo_ui(frm);
    },
    custom_stage: function(frm) {
        update_stage_color(frm);
    },
    status: function(frm) {
        update_status_color(frm);
    }
});

function update_stage_color(frm) {
    let stage = frm.doc.custom_stage;
    if (!stage) return;
    
    let field = frm.fields_dict['custom_stage'];
    if (!field || !field.$input) return;
    
    let el = field.$input[0];
    if (!el) return;
    
    let colors = { bg: '#f8fafc', border: '#cbd5e1', borderLeft: '#94a3b8', text: '#334155' };
    
    const status_lower = stage.toLowerCase();
    
    if (['offer accepted', 'joined'].includes(status_lower)) {
        // Green
        colors = { bg: '#f0fdf4', border: '#bbf7d0', borderLeft: '#15803d', text: '#166534' };
    } else if (status_lower.includes('reject') || status_lower.includes('drop') || status_lower.includes('decline') || status_lower.includes('no show') || status_lower.includes('back-out')) {
        // Red
        colors = { bg: '#fef2f2', border: '#fecaca', borderLeft: '#b91c1c', text: '#991b1b' };
    } else if (['screen select', 'shortlisted', 'offered'].includes(status_lower)) {
        // Blue/Purple
        colors = { bg: '#f5f3ff', border: '#ede9fe', borderLeft: '#6d28d9', text: '#5b21b6' };
    } else if (status_lower.includes('pending') || status_lower.includes('schedule') || status_lower.includes('to be')) {
        // Yellow/Orange
        colors = { bg: '#fffbeb', border: '#fde68a', borderLeft: '#d97706', text: '#b45309' };
    }
    
    el.style.setProperty('background-color', colors.bg, 'important');
    el.style.setProperty('border', `1px solid ${colors.border}`, 'important');
    el.style.setProperty('border-left', `4px solid ${colors.borderLeft}`, 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('font-weight', '600', 'important');
    
    // Adjust arrow icon color if present
    $(el).siblings('.octicon-chevron-down').css('color', colors.text);
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
    
    if (status_lower === 'accepted') {
        // Green
        colors = { bg: '#f0fdf4', border: '#bbf7d0', borderLeft: '#15803d', text: '#166534' };
    } else if (status_lower === 'rejected') {
        // Red
        colors = { bg: '#fef2f2', border: '#fecaca', borderLeft: '#b91c1c', text: '#991b1b' };
    } else if (status_lower === 'hold') {
        // Yellow/Orange
        colors = { bg: '#fffbeb', border: '#fde68a', borderLeft: '#d97706', text: '#b45309' };
    } else if (status_lower === 'open' || status_lower === 'replied') {
        // Blue/Purple
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

function render_stage_stepper(frm) {
    // Remove previous stepper to rebuild on refresh
    $(frm.wrapper).find('.ja-stepper-bar').remove();

    // --- Stage Pipeline Definition ---
    const HAPPY_PATH = [
        'Screening Pending',
        'Screen Select',
        'Interview to be scheduled',
        'Interview Round 1 Scheduled',
        'Shortlisted',
        'Offered',
        'Offer Accepted',
        'Joined'
    ];

    const NON_PROGRESSIVE = [
        'Screen Reject',
        'Interview Round 1 Reject',
        'Interview Round 2 Reject',
        'Candidate Back-out/ Drop',
        'Interview No Show',
        'Interview Rescheduled',
        'Offer Declined',
        'Offer Back-out',
        'HR Drop'
    ];

    const STAGE_COLORS = {
        'Screening Pending': '#f59e0b',
        'Screen Select': '#3b82f6',
        'Interview to be scheduled': '#8b5cf6',
        'Interview Round 1 Scheduled': '#06b6d4',
        'Interview Round 2 Scheduled': '#0d9488',
        'Interview Rescheduled': '#6366f1',
        'Shortlisted': '#a855f7',
        'Offered': '#0ea5e9',
        'Offer Accepted': '#10b981',
        'Joined': '#22c55e',
        'Screen Reject': '#ef4444',
        'Interview Round 1 Reject': '#f43f5e',
        'Interview Round 2 Reject': '#f43f5e',
        'Candidate Back-out/ Drop': '#64748b',
        'Interview No Show': '#ea580c',
        'Offer Declined': '#dc2626',
        'Offer Back-out': '#b91c1c',
        'HR Drop': '#991b1b'
    };

    let currentStage = frm.doc.custom_stage || 'Screening Pending';
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

    // For non-progressive stages, determine the last valid progressive step reached
    let lastValidIndex = currentIndex;
    if (NON_PROGRESSIVE.includes(currentStage)) {
        // Find the last happy-path step before the current non-progressive one
        // by checking position in the original happy path
        lastValidIndex = 0;
        for (let i = HAPPY_PATH.length - 1; i >= 0; i--) {
            if (HAPPY_PATH.indexOf(currentStage) === -1) {
                // The stage diverges; figure out which happy-path stage was the parent
                if (currentStage.includes('Screen')) lastValidIndex = Math.max(0, HAPPY_PATH.indexOf('Screening Pending'));
                else if (currentStage.includes('Interview')) lastValidIndex = Math.max(0, HAPPY_PATH.indexOf('Interview Round 1 Scheduled'));
                else if (currentStage.includes('Offer') || currentStage === 'HR Drop') lastValidIndex = Math.max(0, HAPPY_PATH.indexOf('Offered'));
                else if (currentStage.includes('Back-out') || currentStage.includes('Drop')) lastValidIndex = Math.max(0, HAPPY_PATH.indexOf('Interview Round 1 Scheduled'));
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
        method: "nexapp.api.get_job_applicant_stage_history",
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
                if (['Joined', 'Offer Accepted'].includes(currentStage)) {
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
                if (['Joined', 'Offer Accepted'].includes(currentStage)) {
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
                        if (!stepDate && step === 'Screening Pending') {
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
                    if (['Joined', 'Offer Accepted'].includes(currentStage)) {
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

function setup_ai_resume_block(frm) {
    if (frm.custom_cv_upload_btn_injected) {
        if (frm.doc.resume_attachment) {
            $('#viewCvPreviewBtn').css('display', 'inline-flex');
            $('#openCvUploadBtn').css('display', 'none');
        } else {
            $('#viewCvPreviewBtn').css('display', 'none');
            $('#openCvUploadBtn').css('display', 'inline-flex');
        }
        return;
    }

    const wrapper = $(frm.fields_dict.details_section.wrapper);
    
    const btn_html = `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <h4 style="margin: 0 0 5px 0; color: #1e293b; font-weight: 600;">AI Resume Parsing</h4>
                <p style="margin: 0; color: #64748b; font-size: 13px;">Upload candidate's CV to automatically extract and fill their details.</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="openAIEvaluationBtn" type="button" style="
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: #ffffff;
                    font-weight: 600;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    ✨ AI Evaluation
                </button>
                <button id="viewCvPreviewBtn" type="button" style="
                    display: ${frm.doc.resume_attachment ? 'inline-flex' : 'none'};
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
                    <i class="fa fa-eye" style="margin-right: 6px;"></i> View CV
                </button>
                <button id="openCvUploadBtn" type="button" style="
                    display: ${frm.doc.resume_attachment ? 'none' : 'inline-flex'};
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
                    <i class="fa fa-cloud-upload" style="margin-right: 6px;"></i> Upload CV
                </button>
            </div>
        </div>
    `;
    
    wrapper.before(btn_html);
    
    $('#openAIEvaluationBtn').hover(
        function() { $(this).css({ 'opacity': '0.9', 'box-shadow': '0 4px 10px rgba(99, 102, 241, 0.3)' }); },
        function() { $(this).css({ 'opacity': '1', 'box-shadow': 'none' }); }
    );

    $('#openCvUploadBtn').hover(
        function() { $(this).css({ 'background-color': '#5b4f80', 'box-shadow': '0 4px 8px rgba(113, 99, 158, 0.35)' }); },
        function() { $(this).css({ 'background-color': '#71639e', 'box-shadow': '0 2px 4px rgba(113, 99, 158, 0.25)' }); }
    );

    $('#viewCvPreviewBtn').hover(
        function() { $(this).css({ 'background-color': '#e2e8f0', 'color': '#0f172a' }); },
        function() { $(this).css({ 'background-color': '#f1f5f9', 'color': '#475569' }); }
    );
    
    $('#openAIEvaluationBtn').on('click', function() {
        open_ai_drawer(frm);
    });

    $('#openCvUploadBtn').on('click', function() {
        show_cv_upload_dialog(frm);
    });

    $('#viewCvPreviewBtn').on('click', function() {
        if(frm.doc.resume_attachment) {
            show_cv_preview_panel(frm.doc.resume_attachment);
        }
    });
    
    frm.custom_cv_upload_btn_injected = true;
}

function show_cv_upload_dialog(frm) {
    let htmlContent = `
        <div id="custom_cv_upload_modal" style="
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
                <button id="close_cv_modal" style="
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
                            <i class="fa fa-robot" style="font-size: 28px;"></i>
                        </div>
                        <h3 style="margin: 0 0 10px 0; font-weight: 800; color: #0f172a; font-size: 24px; letter-spacing: -0.5px;">Upload CV & Auto-fill</h3>
                        <p style="margin: 0; color: #64748b; font-size: 15px; line-height: 1.5;">Upload the candidate's CV to automatically extract and populate the application form.</p>
                    </div>

                    <div id="cvUploadWrapper">
                        <input type="file" id="aiCVInput" accept=".pdf,.doc,.docx" style="display: none;">
                        <div id="cvUploadZone" style="
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
                        <h4 style="color: #0f172a; margin: 0 0 8px 0; font-weight: 700; font-size: 18px;">AI is analyzing CV...</h4>
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

    $('#custom_cv_upload_modal').remove();
    $('body').append(htmlContent);

    let $modal = $('#custom_cv_upload_modal');

    setTimeout(() => {
        $modal.css('opacity', '1');
        $modal.find('.custom-modal-content').css('transform', 'scale(1) translateY(0)');
    }, 10);

    let closeModal = function () {
        document.removeEventListener('paste', handlePaste);
        $(window).off('paste.cv_upload');
        $modal.css('opacity', '0');
        $modal.find('.custom-modal-content').css('transform', 'scale(0.95) translateY(10px)');
        setTimeout(() => $modal.remove(), 300);
    };

    $('#close_cv_modal').on('click', closeModal);
    $modal.on('click', function (e) {
        if (e.target.id === 'custom_cv_upload_modal') closeModal();
    });

    const fileInput = document.getElementById('aiCVInput');
    const uploadZone = document.getElementById('cvUploadZone');

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

        document.getElementById('cvUploadWrapper').style.display = 'none';
        document.getElementById('aiProcessingWrapper').style.display = 'block';
        $('#close_cv_modal').hide();

        let progress = 10;
        const pb = document.getElementById('aiProgressBarTop');
        const pt = document.getElementById('aiProcessingText');
        if(pb) pb.style.width = "10%";

        let pInt = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 5 + 2;
                if(pb) pb.style.width = progress + "%";
                if(progress > 30 && progress < 60) pt.innerText = "Identifying key skills & experience...";
                else if(progress >= 60 && progress < 85) pt.innerText = "Structuring profile data...";
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
                    doctype: "Job Applicant",
                    docname: frm.doc.name,
                    filename: file.name,
                    filedata: filedata,
                    is_private: 1
                },
                callback: function(r) {
                    if (r.message && r.message.file_url) {
                        frm.set_value('resume_attachment', r.message.file_url);
                        
                        frappe.call({
                            method: "nexapp.www.careers_ai.process_resume_autofill",
                            args: {
                                file_url: r.message.file_url
                            },
                            callback: function(ai_res) {
                                clearInterval(pInt);
                                if(pb) pb.style.width = "100%";
                                pt.innerText = "Data Extracted Successfully!";
                                
                                setTimeout(() => {
                                    closeModal();
                                    populate_form_from_ai(frm, ai_res.message || {});
                                    frappe.show_alert({message: 'Form filled with AI extracted data. Click "View CV" to verify fields.', indicator: 'green'}, 7);
                                    
                                    // Make sure the View CV button shows immediately
                                    $('#viewCvPreviewBtn').css('display', 'inline-flex');
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

function populate_form_from_ai(frm, data) {
    let applicant_name = "";
    if (data.first_name || data.last_name) {
        applicant_name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    }
    
    if (applicant_name) frm.set_value('applicant_name', applicant_name);
    if (data.email) frm.set_value('email_id', data.email);
    if (data.mobile_no) {
        frm.set_value('custom_mobile', data.mobile_no);
    }
    
    if (data.current_company) frm.set_value('custom_current_employer', data.current_company);
    if (data.total_experience) frm.set_value('custom_experience_in_years', data.total_experience);
    if (data.current_ctc) frm.set_value('custom_current_ctc', data.current_ctc);
    if (data.expected_ctc) frm.set_value('custom_expected_ctc', data.expected_ctc);
    
    if (data.notice_period) frm.set_value('custom_notice_period', data.notice_period);
    if (data.custom_highest_qualification_held) frm.set_value('custom_highest_qualification_held', data.custom_highest_qualification_held);
    
    if (data.custom_city) frm.set_value('custom_city', data.custom_city);
    if (data.custom_state) frm.set_value('custom_state', data.custom_state);
    if (data.custom_street) frm.set_value('custom_street', data.custom_street);
    if (data.custom_pincode) frm.set_value('custom_pincode', data.custom_pincode);
    if (data.linkedin_profile) frm.set_value('custom_linkedin_profile', data.linkedin_profile);
    
    frm.set_value('source', 'Direct HR Upload');
    
    if (data.email) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Job Applicant',
                filters: { 'email_id': data.email },
                fields: ['name', 'job_title', 'creation']
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    let existing = r.message[0];
                    frappe.show_alert({
                        message: `<b>Warning:</b> An applicant with this email already exists: <a href="/app/job-applicant/${existing.name}">${existing.name}</a>`,
                        indicator: 'orange'
                    }, 10);
                }
            }
        });
    }
    
    // Highlight empty mandatory fields
    setTimeout(() => {
        let empty_mandatory_found = false;
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
                    empty_mandatory_found = true;
                }
            }
        });
        

    }, 500);
}

function show_cv_preview_panel(file_url) {
    // Remove any existing panel
    $('#cv-preview-panel-overlay').remove();
    $('#cv-preview-panel').remove();

    // Determine if the file is a PDF for iframe preview
    let is_pdf = file_url.toLowerCase().endsWith('.pdf');
    let is_docx = file_url.toLowerCase().endsWith('.docx');
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
    } else if (is_docx) {
        preview_content = `
            <div style="width: 100%; height: 100%; position: relative; background: #ffffff; overflow-y: auto;">
                <div id="cv-loading-spinner" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; color: #64748b; font-family: 'Inter', sans-serif;">
                    <i class="fa fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 8px; color: #71639e;"></i>
                    <span style="font-size: 12px; font-weight: 500;">Loading Document...</span>
                </div>
                <div id="docx-container" style="padding: 20px; width: 100%; min-height: 100%; background: #f8fafc;"></div>
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
                        <h4 style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">CV Preview</h4>
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

            <!-- Panel Body (CV iframe / preview) -->
            <div style="flex: 1; overflow: hidden; background: #ffffff;">
                ${preview_content}
            </div>
        </div>
    `;

    $('body').append(panel_html);

    if (is_docx) {
        frappe.require([
            'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
            'https://unpkg.com/docx-preview/dist/docx-preview.min.js'
        ], function() {
            // Encode the file URL to handle special characters like brackets, preserving slashes
            let encoded_url = file_url.split('/').map(encodeURIComponent).join('/');
            
            fetch(encoded_url, { credentials: 'same-origin' })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    
                    let contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('text/html')) {
                        throw new Error('File not found (Server returned HTML instead of document)');
                    }
                    
                    return res.blob();
                })
                .then(blob => {
                    // Inject CSS to force docx to fit exactly 100% of the container (no horizontal scrolling)
                    if (!$('#docx-preview-fix-css').length) {
                        $(`<style id="docx-preview-fix-css">
                            #docx-container .docx-wrapper {
                                justify-content: center !important;
                                padding: 15px !important;
                                background: transparent !important;
                            }
                            #docx-container .docx-wrapper > section.docx {
                                margin: 0 auto !important;
                                width: 100% !important; /* Force fit to panel width */
                                max-width: 800px !important; /* Max width for readability */
                                min-height: auto !important;
                                padding: 30px !important; /* Inner padding like a document */
                                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
                                box-sizing: border-box !important;
                            }
                            /* Make images inside docx responsive */
                            #docx-container .docx-wrapper > section.docx img {
                                max-width: 100% !important;
                                height: auto !important;
                            }
                            /* Make tables inside docx responsive */
                            #docx-container .docx-wrapper > section.docx table {
                                width: 100% !important;
                                table-layout: auto !important;
                            }
                        </style>`).appendTo('head');
                    }

                    // Render with options to ignore predefined widths
                    docx.renderAsync(blob, document.getElementById("docx-container"), null, {
                        ignoreWidth: true // Ignore the hardcoded width from the document itself
                    })
                        .then(() => {
                            document.getElementById('cv-loading-spinner').style.display = 'none';
                        })
                        .catch(err => {
                            console.error(err);
                            let errMsg = err.message ? err.message : 'Unknown error';
                            document.getElementById('cv-loading-spinner').innerHTML = `<span style="color: red; font-size: 13px; text-align: center;">Error rendering document<br><small style="color: #64748b;">${errMsg}</small></span>`;
                        });
                })
                .catch(err => {
                    console.error(err);
                    let errMsg = err.message ? err.message : 'Unknown error';
                    document.getElementById('cv-loading-spinner').innerHTML = `<span style="color: red; font-size: 13px; text-align: center;">Error downloading document<br><small style="color: #64748b;">${errMsg}</small></span>`;
                });
        });
    }

    // Apply layout split styling by adding the class to body. 
    // The CSS will handle resizing the entire page container to 60% so nothing gets covered.
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
            
            /* Shrink form sheet padding */
            body.cv-panel-open .custom-job-applicant-ui .odoo-form-sheet {
                padding: 10px 14px !important;
            }
            
            /* CRITICAL FIX: Switch from horizontal (label-left/input-right) to vertical (label-top/input-below) layout.
               This uses the EXACT same ultra-specific selector from the base CSS so it wins the specificity battle. */
            body.cv-panel-open .custom-job-applicant-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                flex-direction: column !important;
                align-items: stretch !important;
                margin-bottom: 10px !important;
            }
            
            /* Label takes full width on top, no fixed width constraint */
            body.cv-panel-open .custom-job-applicant-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                width: 100% !important;
                min-width: unset !important;
                padding-right: 0 !important;
                margin-bottom: 2px !important;
            }
            
            /* Shrink label font */
            body.cv-panel-open .custom-job-applicant-ui .frappe-control .control-label {
                font-size: 10.5px !important;
            }
            
            /* Shrink input font and height */
            body.cv-panel-open .custom-job-applicant-ui .frappe-control input,
            body.cv-panel-open .custom-job-applicant-ui .frappe-control select,
            body.cv-panel-open .custom-job-applicant-ui .frappe-control textarea {
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
        $('#cv-preview-panel').css('right', '-50%');
        $('body').removeClass('cv-panel-open');
        
        setTimeout(() => {
            $('#cv-preview-panel').remove();
            $('#cv-panel-responsive-css').remove();
        }, 400);
    }

    $('#close-cv-preview-panel').on('click', close_cv_panel);
}

function render_odoo_ui(frm) {
    // 1. Add a unique class to this form's wrapper to safely scope all CSS
    $(frm.wrapper).addClass('custom-job-applicant-ui');
    
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

    // 3. Inject Scoped Styles for Job Applicant only (remove old to pick up changes)
    $('#job_applicant_ui_styles').remove();
    if (!$('#job_applicant_ui_styles').length) {
        $('head').append(`
            <style id="job_applicant_ui_styles">
                /* Premium Yellow Style for Interview Summary Dashboard */
                .custom-job-applicant-ui .form-dashboard-section.custom {
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
                    border: 1px solid #fde68a !important;
                    box-shadow: 0 1px 3px rgba(251, 191, 36, 0.1) !important;
                    border-radius: 10px !important;
                }
                .custom-job-applicant-ui .form-dashboard-section.custom .section-head {
                    color: #92400e !important;
                    font-weight: 600 !important;
                }
                .custom-job-applicant-ui .form-dashboard-section.custom .section-body {
                    color: #b45309 !important;
                    font-weight: 500 !important;
                }

                /* Odoo Form Sheet and Layout Styling */
                .custom-job-applicant-ui .form-layout, 
                .custom-job-applicant-ui .odoo-form-sheet {
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
                .custom-job-applicant-ui .form-tabs {
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
                .custom-job-applicant-ui .form-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-job-applicant-ui .form-tabs .nav-tabs {
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
                .custom-job-applicant-ui .form-tabs .nav-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-job-applicant-ui .form-tab-content, 
                .custom-job-applicant-ui .tab-content, 
                .custom-job-applicant-ui .form-tab-pane, 
                .custom-job-applicant-ui .tab-pane {
                    border: none !important;
                    margin-top: 0px !important;
                    padding-top: 0px !important;
                }

                .custom-job-applicant-ui .form-tabs .nav-link {
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

                .custom-job-applicant-ui .form-tabs .nav-link:hover {
                    color: #3d3566 !important;
                    background: rgba(113, 99, 158, 0.08) !important;
                    border: none !important;
                }

                .custom-job-applicant-ui .form-tabs .nav-link.active {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #7b6daa 0%, #635490 100%) !important;
                    border: none !important;
                    font-weight: 700 !important;
                    box-shadow: 0 2px 8px rgba(113, 99, 158, 0.3) !important;
                }

                /* Odoo Section Headings (Subheadings) */
                .custom-job-applicant-ui .form-section { 
                    border: none !important; 
                    border-top: none !important; 
                    border-bottom: none !important; 
                    margin-top: 0 !important; 
                    padding-top: 0 !important; 
                }
                .custom-job-applicant-ui .form-section .section-head {
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
                .custom-job-applicant-ui .form-section:first-child .section-head {
                    margin-top: 4px !important;
                }

                /* Ensure all form inputs, selects, and textareas have consistent font family and underline style */
                .custom-job-applicant-ui input[type="text"],
                .custom-job-applicant-ui input[type="number"],
                .custom-job-applicant-ui input[type="email"],
                .custom-job-applicant-ui input[type="password"],
                .custom-job-applicant-ui input[type="tel"],
                .custom-job-applicant-ui select,
                .custom-job-applicant-ui textarea,
                .custom-job-applicant-ui .frappe-control input[type="text"],
                .custom-job-applicant-ui .frappe-control input[type="number"],
                .custom-job-applicant-ui .frappe-control input[type="email"],
                .custom-job-applicant-ui .frappe-control input[type="password"],
                .custom-job-applicant-ui .frappe-control input[type="tel"],
                .custom-job-applicant-ui .frappe-control select,
                .custom-job-applicant-ui .frappe-control textarea,
                .custom-job-applicant-ui input[readonly]:not([type="checkbox"]):not([type="radio"]),
                .custom-job-applicant-ui input[disabled]:not([type="checkbox"]):not([type="radio"]),
                .custom-job-applicant-ui .control-value:not([type="checkbox"]):not([type="radio"]),
                .custom-job-applicant-ui .like-disabled-input:not([type="checkbox"]):not([type="radio"]) {
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
                .custom-job-applicant-ui .frappe-control[data-fieldtype="Small Text"] .control-input {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                .custom-job-applicant-ui .frappe-control[data-fieldtype="Small Text"] textarea {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 38px !important;
                    min-height: 38px !important;
                    resize: none !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                }

                .custom-job-applicant-ui input.error-highlight,
                .custom-job-applicant-ui select.error-highlight,
                .custom-job-applicant-ui textarea.error-highlight,
                .custom-job-applicant-ui .frappe-control input.error-highlight,
                .custom-job-applicant-ui .frappe-control select.error-highlight,
                .custom-job-applicant-ui .frappe-control textarea.error-highlight {
                    background-color: #fee2e2 !important;
                    border-bottom-color: #ef4444 !important;
                    border-bottom-width: 2px !important;
                }
                
                .custom-job-applicant-ui .frappe-control input::placeholder,
                .custom-job-applicant-ui input::placeholder {
                    font-size: 12px !important;
                    color: #9ca3af !important;
                    font-weight: 400 !important;
                    white-space: normal !important;
                    text-overflow: ellipsis !important;
                }
                
                /* Adjust Street textarea height to perfectly align Country and State */
                .custom-job-applicant-ui [data-fieldname="custom_street"] textarea {
                    height: 136px !important;
                    min-height: 136px !important;
                }
                
                /* Adjust Additional Info textarea height to perfectly align with Expected CTC */
                .custom-job-applicant-ui [data-fieldname="additional_info"] textarea,
                .custom-job-applicant-ui [data-fieldname="custom_additional_info"] textarea {
                    height: 92px !important;
                    min-height: 92px !important;
                }
                
                .custom-job-applicant-ui input[type="text"]:focus,
                .custom-job-applicant-ui input[type="number"]:focus,
                .custom-job-applicant-ui input[type="email"]:focus,
                .custom-job-applicant-ui input[type="password"]:focus,
                .custom-job-applicant-ui input[type="tel"]:focus,
                .custom-job-applicant-ui select:focus,
                .custom-job-applicant-ui textarea:focus,
                .custom-job-applicant-ui .frappe-control input[type="text"]:focus,
                .custom-job-applicant-ui .frappe-control input[type="number"]:focus,
                .custom-job-applicant-ui .frappe-control input[type="email"]:focus,
                .custom-job-applicant-ui .frappe-control input[type="password"]:focus,
                .custom-job-applicant-ui .frappe-control input[type="tel"]:focus,
                .custom-job-applicant-ui .frappe-control select:focus,
                .custom-job-applicant-ui .frappe-control textarea:focus {
                    border: 1px solid #ee8d21 !important;
                    background-color: #ffffff !important;
                    box-shadow: 0 0 0 3px rgba(238, 141, 33, 0.15) !important;
                    outline: none !important;
                }
                
                /* Auto-resize textareas require overflow hidden to prevent scrollbar flash */
                .custom-job-applicant-ui textarea {
                    overflow-y: hidden !important;
                    resize: none !important;
                }

                /* Odoo Horizontal Field Layout: Label on Left, Input on Right */
                .custom-job-applicant-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 22px !important;
                }
                
                /* Standard / 2-Column Layout Label Width */
                .custom-job-applicant-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 210px !important;
                    min-width: 210px !important;
                    margin-bottom: 0 !important;
                    padding-right: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                }

                /* 3-Column / Compact Layout Label Width */
                .custom-job-applicant-ui .form-column.col-sm-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-job-applicant-ui .form-column.col-md-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-job-applicant-ui .form-column.col-sm-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-job-applicant-ui .form-column.col-md-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 110px !important;
                    min-width: 110px !important;
                    padding-right: 8px !important;
                }

                .custom-job-applicant-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix .control-label {
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
                .custom-job-applicant-ui .frappe-control[data-fieldtype="Small Text"] .form-group .clearfix .control-label,
                .custom-job-applicant-ui .frappe-control[data-fieldtype="Text"] .form-group .clearfix .control-label,
                .custom-job-applicant-ui .frappe-control[data-fieldtype="Long Text"] .form-group .clearfix .control-label,
                .custom-job-applicant-ui .frappe-control[data-fieldtype="Text Editor"] .form-group .clearfix .control-label {
                    font-weight: 700 !important;
                    font-size: 12.5px !important;
                    color: #1e293b !important;
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: 0.01em !important;
                }

                .custom-job-applicant-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .control-input-wrapper {
                    flex: 1 !important;
                    width: 100% !important;
                }
                
                /* Style read-only / display fields similarly */
                .custom-job-applicant-ui .frappe-control:not([data-fieldtype="Check"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .disp-area:not(.checkbox .disp-area) {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    font-weight: 500 !important;
                    font-size: 13.5px !important;
                    color: #475569 !important;
                    padding: 8px 0 !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }
            .custom-job-applicant-ui .btn-secondary {
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                border: 1px solid #e2e8f0 !important;
                background-color: #ffffff !important;
                color: #475569 !important;
            }
            .custom-job-applicant-ui .btn-secondary:hover {
                background-color: #f8fafc !important;
                color: #0f172a !important;
                border-color: #cbd5e1 !important;
            }
            
            /* Mandatory Field Red Left Border - MUST BE AT THE VERY END */
            .custom-job-applicant-ui .frappe-control input.is-mandatory-field,
            .custom-job-applicant-ui .frappe-control select.is-mandatory-field,
            .custom-job-applicant-ui .frappe-control textarea.is-mandatory-field {
                border-left: 4px solid #ef4444 !important;
            }
        </style>
    `);
    }
}

function setup_ai_evaluation_block(frm) {
    if (!frm.fields_dict.custom_ai_evaluation) return;
    
    // Always hide the raw JSON text area
    frm.fields_dict.custom_ai_evaluation.$wrapper.hide();
}

window.run_ai_evaluation = function(frm) {
    if (!frm) frm = cur_frm;
    
    // Show Loading
    let loadingHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center; font-family: 'Inter', sans-serif;">
            
            <!-- Brain / AI Icon Animation -->
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
    
    // Animate progress
    let progress = 0;
    let step = 1;
    let simInterval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 95) progress = 95; // cap at 95% until real data returns
        
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
        args: { job_applicant_name: frm.doc.name },
        callback: function(r) {
            clearInterval(simInterval);
            if(r.message) {
                $('#ai-progress-bar').css('width', '100%');
                $('#ai-progress-text').text('100% Complete');
                $('#ai-step-4').removeClass('active').addClass('done').find('i').removeClass('fa-check-square-o').addClass('fa-check');
                
                setTimeout(() => {
                    frm.reload_doc().then(() => {
                        render_ai_drawer_content(frm);
                    });
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

function open_ai_drawer(frm) {
    if ($('#ai-drawer-overlay').length === 0) {
        // inject html
        let drawerHtml = `
            <div id="ai-drawer-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 17, 21, 0.6); backdrop-filter: blur(4px); z-index: 99998; display: none;"></div>
            <div id="ai-drawer-panel" style="position: fixed; top: 0; right: 0; width: 900px; max-width: 90vw; height: 100vh; background: #f8fafc; z-index: 99999; box-shadow: -4px 0 24px rgba(0,0,0,0.15); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; overflow: hidden;">
                
                <!-- Header -->
                <div style="background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                        <i class="fa fa-magic" style="color: #6366f1;"></i> AI Hiring Assistant
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
        
        // events
        $('#btn-ai-close, #ai-drawer-overlay').on('click', function() {
            $('#ai-drawer-panel').css('transform', 'translateX(100%)');
            $('#ai-drawer-overlay').fadeOut(200);
        });
        
        $('#btn-ai-reevaluate').on('click', function() {
            run_ai_evaluation(cur_frm);
        });
    }
    
    $('#ai-drawer-overlay').fadeIn(200);
    setTimeout(() => {
        $('#ai-drawer-panel').css('transform', 'translateX(0)');
    }, 10);
    
    render_ai_drawer_content(frm);
}

function render_ai_drawer_content(frm) {
    let rawData = frm.doc.custom_ai_evaluation;
    if (!rawData) {
        let emptyHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center;">
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; max-width: 400px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <i class="fa fa-bolt" style="font-size: 40px; color: #cbd5e1; margin-bottom: 20px;"></i>
                    <h4 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 12px 0;">No Evaluation Found</h4>
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">Click below to run a deep AI analysis on this candidate's resume against the job description.</p>
                    <button class="btn btn-primary" onclick="run_ai_evaluation(cur_frm)" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; font-weight: 600; padding: 8px 24px;">Run Evaluation</button>
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
        
        // Update buttons
        $('#ai-drawer-content').find('.ai-tab-btn').removeClass('active').css({
            'color': '#64748b',
            'border-bottom': 'none'
        });
        $(this).addClass('active').css({
            'color': '#0f172a',
            'border-bottom': '2px solid #6366f1'
        });
        
        // Update content
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
    
    // grid
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
    
    // axes & labels
    for(let j=0; j<5; j++) {
        let angle = (Math.PI * 2 * j / 5) - Math.PI/2;
        let x = center + radius * Math.cos(angle);
        let y = center + radius * Math.sin(angle);
        svg += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
        
        let lx = center + (radius + 20) * Math.cos(angle);
        let ly = center + (radius + 20) * Math.sin(angle);
        svg += `<text x="${lx}" y="${ly}" font-size="11" font-weight="700" fill="#475569" text-anchor="middle" dominant-baseline="middle">${labels[j]}</text>`;
    }
    
    // data
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
