frappe.ui.form.on('Change Management Request', {
    validate: function(frm) {
        return new Promise((resolve) => {
            if (!frm.doc.circuit_id) {
                resolve();
                return;
            }

            // ✅ Prevent duplicate creation on repeated Save
            if (frm._feasibility_checked) {
                resolve();
                return;
            }

            frappe.call({
                method: 'nexapp.api.check_feasibility_or_site',
                args: { circuit_id: frm.doc.circuit_id },
                callback: function(r) {
                    let status = r.message.status;

                    if (status === "feasibility_exists") {
                        frm._feasibility_checked = true; // ✅ Mark checked
                        resolve();
                    } else if (status === "site_exists") {
                        frappe.confirm(
                            'Circuit not found in Feasibility. Do you want to create Feasibility?',
                            function() {
                                frappe.call({
                                    method: 'nexapp.api.create_feasibility_from_site',
                                    args: { circuit_id: frm.doc.circuit_id },
                                    callback: function(res) {
                                        frappe.show_alert({ message: res.message, indicator: 'green' });
                                        frm._feasibility_checked = true; // ✅ Mark after creation
                                        resolve();
                                    }
                                });
                            },
                            function() {
                                frappe.throw(__('Feasibility creation cancelled. Please create manually before saving.'));
                            }
                        );
                    } else {
                        frappe.throw(__('Circuit ID not found in Feasibility and Site.'));
                    }
                }
            });
        });
    },

    after_save: function(frm) {
        // Completely custom UI overlay matching the LinkedIn popup design exactly.
        let overlay_id = "nexapp-custom-linkedin-overlay";
        if ($(`#${overlay_id}`).length > 0) $(`#${overlay_id}`).remove();

        let html = `
        <div id="${overlay_id}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.55); z-index: 999999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease;">
            <div style="background: white; border-radius: 12px; width: 100%; max-width: 500px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: scale(0.95); transition: transform 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; position: relative; display: flex; flex-direction: column;">
                
                <!-- Close X -->
                <button onclick="$('#${overlay_id}').remove()" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; font-size: 20px; color: #555; cursor: pointer; padding: 4px; line-height: 1;">&times;</button>
                
                <!-- Top Section -->
                <div style="padding: 40px 24px 48px; text-align: center; flex: 1;">
                    <!-- Exact Custom Green Tick Icon -->
                    <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <!-- Outer thick green ring -->
                            <circle cx="36" cy="36" r="30" fill="#9cb38d"/>
                            <!-- White separator ring -->
                            <circle cx="36" cy="36" r="23" fill="white"/>
                            <!-- Inner light green circle -->
                            <circle cx="36" cy="36" r="19" fill="#dcefd3"/>
                            <!-- Dark grey-blue checkmark -->
                            <path d="M 27 37 L 33 43 L 47 28" stroke="#36454e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    
                    <div style="font-size: 20px; font-weight: 600; color: #191919; margin-bottom: 32px;">Update Successful</div>
                    
                    <div style="font-size: 16px; font-weight: 600; color: #191919; margin-bottom: 8px;">
                        Feasibility record synchronized
                    </div>
                    <div style="font-size: 14px; color: #666666; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/>
                        </svg>
                        The linked Feasibility record has also been securely updated.
                    </div>
                </div>
            </div>
        </div>`;
        
        $("body").append(html);
        
        // Trigger animations
        setTimeout(() => {
            $(`#${overlay_id}`).css("opacity", "1");
            $(`#${overlay_id} > div`).css("transform", "scale(1)");
        }, 10);

        // Auto close after 6 seconds
        setTimeout(() => {
            let el = $(`#${overlay_id}`);
            if (el.length > 0) {
                el.css("opacity", "0");
                el.children("div").css("transform", "scale(0.95)");
                setTimeout(() => el.remove(), 200);
            }
        }, 6000);
    }
});

///////////////////////////////////////////////////////////////////////////////

frappe.ui.form.on('Change Management Request', {

    change_request_type: function(frm) {
        check_site_status(frm);
    },

    site_status: function(frm) {
        check_site_status(frm);
    },

    validate: function(frm) {

        // Disconnection To Delivery And Live
        if (
            frm.doc.change_request_type === "Disconnection To Delivery And Live" &&
            frm.doc.site_status !== "Disconnection In Process" &&
            frm.doc.site_status !== "Disconnected"
        ) {

            frappe.throw(
                __("Site Is not Disconnected so cant process this Change Request")
            );
        }

        // Cancelled To Delivery And Live
        if (
            frm.doc.change_request_type === "Cancelled To Delivery And Live" &&
            frm.doc.site_status !== "Cancelled"
        ) {

            frappe.throw(
                __("Site Is not Cancelled so cant process this Change Request")
            );
        }
    }

});

function check_site_status(frm) {

    // Disconnection To Delivery And Live
    if (
        frm.doc.change_request_type === "Disconnection To Delivery And Live" &&
        frm.doc.site_status &&
        frm.doc.site_status !== "Disconnection In Process" &&
        frm.doc.site_status !== "Disconnected"
    ) {

        frappe.msgprint({
            title: __('Validation'),
            indicator: 'red',
            message: __('Site Is not Disconnected so cant process this Change Request')
        });
    }

    // Cancelled To Delivery And Live
    if (
        frm.doc.change_request_type === "Cancelled To Delivery And Live" &&
        frm.doc.site_status &&
        frm.doc.site_status !== "Cancelled"
    ) {

        frappe.msgprint({
            title: __('Validation'),
            indicator: 'red',
            message: __('Site Is not Cancelled so cant process this Change Request')
        });
    }
}

// Custom Workflow Logic
frappe.ui.form.on('Change Management Request', {
    user_email: function(frm) {
        fetch_manager_email(frm);
    },
    onload: function(frm) {
        if (typeof render_odoo_ui === 'function') render_odoo_ui(frm);
    },
    circuit_id: function(frm) {
        load_lms_feasibility_details(frm);
    },
    refresh: function(frm) {
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

        if (typeof render_odoo_ui === 'function') render_odoo_ui(frm);
        
        load_lms_feasibility_details(frm);

        set_approval_status_color(frm);
        set_stage_color(frm);
        if (frm.fields_dict.sla_status) {
            set_sla_status_color(frm);
        }
        
        if (!frm.doc.approval_manage && frm.doc.user_email) {
            fetch_manager_email(frm);
        }
        
        if (frm.doc.change_request_type === "Disconnection To Delivery And Live" && !frm.is_new()) {
            
            // Initial Submit button
            if (frm.doc.approval_status === "Draft" || frm.doc.approval_status === "Rejected") {
                frm.add_custom_button(__('Submit for Approval'), function() {
                    frm.set_value('approval_status', 'Submitted for Approval');
                    frm.save();
                }).addClass('btn-primary');
            }
            
            // Sales Manager Approval
            let is_sales_manager = frappe.user_roles.includes("Sales Manager") || frappe.user_roles.includes("System Manager") || frappe.user_roles.includes("Administrator");
            if (frm.doc.approval_status === "Submitted for Approval" && is_sales_manager) {
                frm.add_custom_button(__('Approve'), function() {
                    frm.set_value('approval_status', 'Approved By Manager');
                    frm.save();
                }, __('Sales Manager Actions')).addClass('btn-success');
                
                frm.add_custom_button(__('Reject'), function() {
                    reject_dialog(frm);
                }, __('Sales Manager Actions')).addClass('btn-danger');
            }
            
            // Accounts & Finance Manager Approval
            let is_finance_manager = frappe.user_roles.includes("Accounts & Finance Manager") || frappe.user_roles.includes("System Manager") || frappe.user_roles.includes("Administrator");
            if (frm.doc.approval_status === "Approved By Manager" && is_finance_manager) {
                frm.add_custom_button(__('Approve'), function() {
                    frm.set_value('approval_status', 'Approved');
                    frm.save();
                }, __('Accounts & Finance Manager Actions')).addClass('btn-success');
                
                frm.add_custom_button(__('Reject'), function() {
                    reject_dialog(frm);
                }, __('Accounts & Finance Manager Actions')).addClass('btn-danger');
            }
        }
    },
    approval_status: function(frm) {
        set_approval_status_color(frm);
    },
    stage: function(frm) {
        set_stage_color(frm);
        if (typeof render_odoo_ui === 'function') render_odoo_ui(frm);
    },
    sla_status: function(frm) {
        set_sla_status_color(frm);
    }
});

function fetch_manager_email(frm) {
    if (!frm.doc.user_email) return;
    
    frappe.call({
        method: 'nexapp.api.get_manager_email',
        args: { user_email: frm.doc.user_email },
        callback: function(r) {
            if (r.message) {
                frm.set_value('approval_manage', r.message);
            } else {
                frappe.msgprint({
                    title: __('Notice'),
                    indicator: 'orange',
                    message: __('Could not automatically fetch Approval Manager Email. Please ensure the user has an Employee record with "Reports To" assigned.')
                });
            }
        }
    });
}

function set_approval_status_color(frm) {
    if (!frm.fields_dict['approval_status']) return;
    
    let colors = {
        "Draft": { bg: "#f3f4f6", text: "#374151" },
        "Submitted for Approval": { bg: "#e0f2fe", text: "#0369a1" },
        "Approved By Manager": { bg: "#fef3c7", text: "#b45309" },
        "Approved": { bg: "#dcfce7", text: "#15803d" },
        "Rejected": { bg: "#fee2e2", text: "#b91c1c" }
    };
    
    let style = colors[frm.doc.approval_status] || colors["Draft"];
    
    let $el = frm.fields_dict['approval_status'].$input || frm.fields_dict['approval_status'].$wrapper.find('.control-value');
    if ($el) {
        $el.css({
            'background-color': style.bg,
            'color': style.text,
            'font-weight': 'bold'
        });
    }
}

function reject_dialog(frm) {
    let d = new frappe.ui.Dialog({
        title: 'Reason for Rejection',
        fields: [
            {
                label: 'Reason',
                fieldname: 'reason',
                fieldtype: 'Small Text',
                reqd: 1
            }
        ],
        primary_action_label: 'Reject',
        primary_action(values) {
            frm.set_value('reason_for_rejection', values.reason);
            frm.set_value('approval_status', 'Rejected');
            frm.save();
            d.hide();
            frappe.show_alert({message:__('Request Rejected'), indicator:'red'});
        }
    });
    d.show();
}

function set_stage_color(frm) {
    if (!frm.fields_dict['stage']) return;
    
    let colors = {
        "Pending": { bg: "#fef3c7", text: "#b45309" },       // Orange
        "Completed": { bg: "#dcfce7", text: "#15803d" },     // Green
        "Hold": { bg: "#fee2e2", text: "#b91c1c" },          // Red
        "Disconnected": { bg: "#f3f4f6", text: "#374151" }   // Gray
    };
    
    let style = colors[frm.doc.stage] || { bg: "#f3f4f6", text: "#374151" };
    
    let $el = frm.fields_dict['stage'].$input || frm.fields_dict['stage'].$wrapper.find('.control-value');
    if ($el) {
        $el.css({
            'background-color': style.bg,
            'color': style.text,
            'font-weight': 'bold',
            'padding': '3px 8px',
            'border-radius': '12px',
            'display': 'inline-block'
        });
        
        // Ensure standard input borders are removed if rendering as pill
        if (frm.fields_dict['stage'].$input) {
            frm.fields_dict['stage'].$input.css({
                'border-color': 'transparent',
                'box-shadow': 'none'
            });
        }
    }
}

function set_sla_status_color(frm) {
    if (!frm.fields_dict['sla_status']) return;
    
    let colors = {
        "Within TAT": { bg: "#dcfce7", text: "#15803d" },
        "Near Due": { bg: "#fef3c7", text: "#b45309" },
        "Overdue": { bg: "#fee2e2", text: "#b91c1c" },
        "Paused": { bg: "#e0f2fe", text: "#0369a1" },
        "Completed": { bg: "#f3f4f6", text: "#374151" }
    };
    
    let style = colors[frm.doc.sla_status] || { bg: "#f3f4f6", text: "#374151" };
    
    let $el = frm.fields_dict['sla_status'].$input || frm.fields_dict['sla_status'].$wrapper.find('.control-value');
    if ($el) {
        $el.css({
            'background-color': style.bg,
            'color': style.text,
            'font-weight': 'bold',
            'padding': '3px 8px',
            'border-radius': '12px',
            'display': 'inline-block'
        });
        
        if (frm.fields_dict['sla_status'].$input) {
            frm.fields_dict['sla_status'].$input.css({
                'border-color': 'transparent',
                'box-shadow': 'none'
            });
        }
    }
}


function render_odoo_ui(frm) {
    if (!$('#odoo_google_font').length) {
        $('head').append('<link id="odoo_google_font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">');
    }

    if (frm && frm.fields) {
        frm.fields.forEach(function (f) {
            if (!f.wrapper) return;
            const excluded_types = ['Table', 'HTML', 'Section Break', 'Column Break', 'Tab Break', 'Button'];
            if (excluded_types.includes(f.df.fieldtype)) return;
            const wrapper = $(f.wrapper).find('.control-input-wrapper');
            if (f.df.reqd || f.df.mandatory_depends_on) {
                wrapper.addClass('is-mandatory-field');
            } else {
                wrapper.removeClass('is-mandatory-field');
            }
        });
    }

    $('#odoo_ui_styles').remove();
    $(`<style id="odoo_ui_styles">
        div.odoo-premium-ui .form-layout, 
        div.odoo-premium-ui .odoo-form-sheet {
            background: #f9fafb !important;
            box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03) !important;
            border-radius: 10px !important;
            border: 1px solid #e5e7eb !important;
            padding: 28px 32px !important;
            margin-top: 16px !important;
            margin-bottom: 32px !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
        div.odoo-premium-ui .form-tabs {
            border: none !important;
            border-bottom: none !important;
            margin-bottom: 4px !important;
            background: linear-gradient(135deg, #f3f1f9 0%, #ece9f4 100%) !important;
            padding: 6px 8px !important;
            border-radius: 10px !important;
            box-shadow: inset 0 1px 3px rgba(113, 99, 158, 0.08) !important;
            overflow: hidden !important;
            max-height: 48px !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
        }
        div.odoo-premium-ui .form-tabs .nav-tabs {
            border: none !important;
            border-bottom: none !important;
            margin-bottom: 0px !important;
            padding-left: 0 !important;
            gap: 4px !important;
            display: flex !important;
            align-items: center !important;
        }
        div.odoo-premium-ui .form-tabs .nav-link {
            color: #5b5580 !important;
            font-weight: 700 !important;
            font-size: 12.5px !important;
            padding: 8px 12px !important;
            border: none !important;
            border-radius: 7px !important;
            background: transparent !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            font-family: 'Inter', sans-serif !important;
        }
        div.odoo-premium-ui .form-tabs .nav-link:hover {
            color: #3d3566 !important;
            background: rgba(113, 99, 158, 0.08) !important;
        }
        div.odoo-premium-ui .form-tabs .nav-link.active {
            color: #ffffff !important;
            background: linear-gradient(135deg, #7b6daa 0%, #635490 100%) !important;
            font-weight: 700 !important;
            box-shadow: 0 2px 8px rgba(113, 99, 158, 0.3) !important;
        }
        div.odoo-premium-ui .form-section .section-head {
            font-size: 13.5px !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            background-color: #f6f5fa !important;
            border-left: 3px solid #71639e !important;
            padding: 10px 16px !important;
            margin-top: 24px !important;
            margin-bottom: 20px !important;
            border-radius: 0 6px 6px 0 !important;
            font-family: 'Inter', sans-serif !important;
        }
        div.odoo-premium-ui .frappe-control:not([data-fieldtype="Check"]):not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Button"]) .control-input-wrapper {
            background-color: #f1f5f9 !important;
            border: 1px solid #94a3b8 !important;
            border-radius: 6px !important;
            padding: 0 12px !important;
            min-height: 38px !important;
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
        }
        div.odoo-premium-ui .frappe-control .control-input-wrapper .control-input,
        div.odoo-premium-ui .frappe-control .control-input-wrapper input,
        div.odoo-premium-ui .frappe-control .control-input-wrapper select,
        div.odoo-premium-ui .frappe-control .control-input-wrapper .control-value {
            font-family: 'Inter', sans-serif !important;
            font-size: 13px !important;
            color: #1e293b !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            outline: none !important;
        }
        div.odoo-premium-ui .frappe-control:not([data-fieldtype="Check"]):not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Button"]) .control-input-wrapper.is-mandatory-field {
            border-left: 4px solid #ef4444 !important;
        }
    </style>`).appendTo('head');

    $(frm.wrapper).addClass('odoo-premium-ui');
    $(frm.wrapper).find('.form-layout').addClass('odoo-form-sheet');

    // --- Dynamic Colorful Styling for Stage Status ---
    let statusField = frm.get_field('stage');
    if (statusField && statusField.$wrapper) {
        let statusVal = frm.doc.stage || 'Pending';
        let colors = {
            'Pending': { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
            'Completed': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
            'Hold': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
            'Disconnected': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
        };
        let c = colors[statusVal] || colors['Pending'];

        let wrapperElements = statusField.$wrapper.find('.control-input-wrapper').toArray();
        let textElements = statusField.$wrapper.find('select, input, .control-value').toArray();

        wrapperElements.forEach(el => {
            el.style.setProperty('background-color', c.bg, 'important');
            el.style.setProperty('border', '1px solid ' + c.border, 'important');
            el.style.setProperty('border-left', '4px solid ' + c.text, 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        });

        textElements.forEach(el => {
            el.style.setProperty('color', c.text, 'important');
            el.style.setProperty('font-weight', '800', 'important');
            el.style.setProperty('font-size', '14px', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('border', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        });
        
        if (statusField.$input) {
            statusField.$input.find('option').css({
                'background-color': '#ffffff',
                'color': '#1e293b',
                'font-weight': '600'
            });
        }
    }

    // Build Odoo Header with Chevron Status Bar for "Stage"
    $(frm.wrapper).find('#odoo_top_header').remove();
    
    let smartButtonHtml = `<div id="odoo_top_header" style="
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 16px;
        margin-bottom: 18px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f0eef5;
    ">`;

    let currentStatus = frm.doc.stage || 'Pending';
    let visibleSteps = ['Pending', 'Completed'];
    
    if (currentStatus === 'Hold' || currentStatus === 'Disconnected') {
        visibleSteps.push(currentStatus);
    }
    
    let currentIndex = visibleSteps.indexOf(currentStatus);
    if (currentIndex === -1) currentIndex = 0;

    let lastValidIndex = currentIndex;
    if (currentStatus === 'Hold' || currentStatus === 'Disconnected') {
        lastValidIndex = 0; // Assume we held/disconnected from Pending phase
    }

    const activeColorMap = {
        'Pending': '#f59e0b',
        'Completed': '#10b981',
        'Hold': '#ef4444',
        'Disconnected': '#64748b'
    };

    $('#odoo_chevron_styles').remove();
    $('head').append(`
        <style id="odoo_chevron_styles">
            .stepper-step { flex: 1; min-width: 0; }
            .stepper-icon-wrapper { transition: all 0.3s ease; }
        </style>
    `);

    // Restrict max-width so the flow chart is left-aligned instead of taking full width
    smartButtonHtml += `<div class="odoo-statusbar" style="display: flex; flex: 1; align-items: center; overflow: visible; padding: 10px 0; max-width: 450px;">`;

    let N = visibleSteps.length;
    let stepPercent = 100 / N;
    let halfStep = stepPercent / 2;
    let bgLeft = halfStep;
    let bgWidth = 100 - stepPercent;
    let activeWidth = lastValidIndex > 0 ? (lastValidIndex / (N - 1)) * bgWidth : 0;

    let stepperHtml = `
        <div class="odoo-stepper-container" style="
            display: flex; align-items: flex-start; justify-content: space-between;
            width: 100%; position: relative; padding: 8px 0; overflow: visible;
        ">
            <div class="stepper-line-bg" style="
                position: absolute; top: 24px; transform: translateY(-50%);
                left: ${bgLeft}%; width: ${bgWidth}%; height: 3px;
                background-color: #cbd5e1; border-radius: 2.5px; z-index: 1;
            "></div>
            <div class="stepper-line-progress" style="
                position: absolute; top: 24px; transform: translateY(-50%);
                left: ${bgLeft}%; width: ${activeWidth}%; height: 3px;
                background-color: ${activeColorMap[currentStatus] || '#10b981'};
                border-radius: 2.5px; z-index: 1;
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease;
            "></div>
    `;

    for (let i = 0; i < N; i++) {
        let step = visibleSteps[i];
        let state = 'upcoming';
        let stepColor = '#94a3b8';
        let bgStyle = 'background-color: #f8fafc; border: 2px solid #cbd5e1;';

        if (i < lastValidIndex || (i < currentIndex && currentStatus !== 'Hold' && currentStatus !== 'Disconnected')) {
            state = 'completed';
            stepColor = '#1e293b';
            bgStyle = `background-color: ${activeColorMap[currentStatus] || '#10b981'}; border: 2px solid ${activeColorMap[currentStatus] || '#10b981'}; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);`;
        } else if (i === currentIndex) {
            state = 'active';
            stepColor = activeColorMap[step] || '#10b981';
            bgStyle = `background-color: #ffffff; border: 3px solid ${stepColor}; box-shadow: 0 0 0 4px ${stepColor}20; transform: scale(1.15);`;
        } else if (i === lastValidIndex && currentIndex !== lastValidIndex) {
            // It means we are on a non-progressive state (e.g. Hold) 
            // So the last valid index (Pending) should be marked as completed
            state = 'completed';
            stepColor = '#1e293b';
            bgStyle = `background-color: ${activeColorMap['Pending']}; border: 2px solid ${activeColorMap['Pending']}; box-shadow: 0 0 0 3px ${activeColorMap['Pending']}20;`;
        }

        let iconHtml = '';
        if (state === 'completed') {
            iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (state === 'active') {
            iconHtml = `<div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${stepColor};"></div>`;
        } else {
            iconHtml = `<div style="width: 6px; height: 6px; border-radius: 50%; background-color: #cbd5e1;"></div>`;
        }

        stepperHtml += `
            <div class="stepper-step" style="
                display: flex; flex-direction: column; align-items: center;
                position: relative; z-index: 2; gap: 8px; cursor: pointer;
            " onclick="frappe.ui.form.get_current_frm().set_value('stage', '${step}');">
                <div class="stepper-icon-wrapper" style="
                    width: 28px; height: 28px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    ${bgStyle}
                ">
                    ${iconHtml}
                </div>
                <div class="stepper-label" style="
                    font-size: 12.5px; font-weight: ${state === 'active' ? '700' : '600'};
                    color: ${stepColor}; text-align: center; font-family: 'Inter', sans-serif;
                    white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis;
                ">${__(step)}</div>
            </div>
        `;
    }

    stepperHtml += `</div>`;
    smartButtonHtml += stepperHtml + `</div>`;
    
    let lmsPlButtonHtml = `
        <div class="odoo-smart-button" onclick="show_lms_pl_modal(cur_frm)" style="
            display: flex; align-items: center; justify-content: center;
            padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0;
            background: #ffffff; cursor: pointer; transition: all 0.2s ease;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-left: auto;
        " onmouseover="this.style.backgroundColor='#f8fafc'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.backgroundColor='#ffffff'; this.style.borderColor='#e2e8f0';">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px;">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <div style="display: flex; flex-direction: column; text-align: left;">
                <span style="font-size: 10px; color: #64748b; font-weight: 600; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.5px;">Evaluation</span>
                <span style="font-size: 13.5px; color: #0f172a; font-weight: 700; line-height: 1.2;">LMS P&L</span>
            </div>
        </div>
    `;

    smartButtonHtml += lmsPlButtonHtml + `</div>`;
    
    $(frm.wrapper).find('.odoo-form-sheet').prepend(smartButtonHtml);
}

window.show_lms_pl_modal = function(frm) {
    let circuit_id = frm.doc.circuit_id;
    let supplier = frm.doc.supplier;
    let lms_id = frm.doc.lms_id;
    
    if (!supplier && frm.doc.lms__information && frm.doc.lms__information.length > 0) {
        supplier = frm.doc.lms__information[0].supplier;
    }

    if (!circuit_id || !supplier) {
        frappe.msgprint(__('Please ensure both Circuit ID and Supplier are selected.'));
        return;
    }

    let format_date = (d) => {
        if (!d) return '-';
        let parts = d.split('-');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return d;
    };

    let invoice_data_ref = null;

    let render_modal = (data) => {
        data = data || {};
        let has_data = Object.keys(data).length > 0;
        invoice_data_ref = data;

        let details_content = has_data ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Supplier</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 600;">${data.supplier || '-'}</div>
                </div>
                <div style="background: #fff7ed; padding: 12px 14px; border-radius: 8px; border: 1px solid #ffedd5;">
                    <div style="font-size: 11px; color: #c2410c; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Notice Period</div>
                    <div style="font-size: 13px; color: #9a3412; font-weight: 700;">${data.custom_notice_period ? data.custom_notice_period + ' Days' : 'Not Specified'}</div>
                </div>
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Purchase Invoice No</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 600;">${data.name ? `<a href="/app/purchase-invoice/${data.name}" target="_blank" style="color: #2563eb; text-decoration: none;">${data.name}</a>` : '-'}</div>
                </div>
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Status</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 500;"><span style="background: #e2e8f0; color: #334155; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600;">${data.status || '-'}</span></div>
                </div>
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Invoice No</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 500;">${data.bill_no || '-'}</div>
                </div>
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Date</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 500;">${format_date(data.bill_date)}</div>
                </div>
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Type</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 500;">${data.custom_payment_type || '-'}</div>
                </div>
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Cycle</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 600;">${data.custom_payment_cycle || '-'}</div>
                </div>
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Duration From</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 500;">${format_date(data.custom_dutation_from)}</div>
                </div>
                <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Duration To</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 500;">${format_date(data.custom_duration_to)}</div>
                </div>
                <div style="background: #f0fdf4; padding: 14px 16px; border-radius: 8px; border: 1px solid #bbf7d0; grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 12px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Circuit Amount</div>
                    <div style="font-size: 18px; color: #166534; font-weight: 700;">${data.grand_total ? frappe.format(data.grand_total, {fieldtype: 'Currency'}) : '-'}</div>
                </div>
            </div>
            <div style="padding: 14px 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; font-size: 13px; color: #b45309; line-height: 1.4;">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <div><strong>Evaluation Warning:</strong> Review the <em>payment cycle</em> and <em>duration</em> carefully. Disconnecting before the billing cycle ends may result in a financial loss if advance payments were made.</div>
                </div>
            </div>
        ` : `
            <div style="padding: 14px 18px; margin-bottom: 24px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; font-size: 14px; color: #991b1b;">
                <strong>No records found!</strong> Could not find a matching Purchase Invoice for this Circuit ID and Supplier.
            </div>
        `;

        let modal_html = `
            <div id="lms-pl-modal" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15, 23, 42, 0.4); z-index: 1050;
                display: flex; justify-content: flex-end;
                backdrop-filter: blur(4px); animation: fadeIn 0.2s ease;
            ">
                <div style="
                    background: #ffffff; width: 650px; height: 100vh; max-width: 90vw;
                    box-shadow: -10px 0 25px rgba(0, 0, 0, 0.1);
                    font-family: 'Inter', sans-serif; display: flex; flex-direction: column;
                    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                ">
                    <!-- Header -->
                    <div style="padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                        <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            LMS P&L Evaluation
                        </h4>
                        <span style="cursor: pointer; font-size: 26px; color: #64748b; line-height: 1;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'" onclick="document.getElementById('lms-pl-modal').remove()">&times;</span>
                    </div>
                    <!-- Tab Bar -->
                    <div style="display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0;">
                        <button id="lms-tab-details" onclick="window.lms_switch_tab('details')" style="
                            flex: 1; padding: 12px 16px; border: none; cursor: pointer; font-size: 13px; font-weight: 700;
                            color: #2563eb; background: #ffffff; border-bottom: 2px solid #2563eb; transition: all 0.2s;
                        ">📋 Invoice Details</button>
                        <button id="lms-tab-ai" onclick="window.lms_switch_tab('ai')" style="
                            flex: 1; padding: 12px 16px; border: none; cursor: pointer; font-size: 13px; font-weight: 700;
                            color: #64748b; background: transparent; border-bottom: 2px solid transparent; transition: all 0.2s;
                        ">✨ AI Evaluation</button>
                    </div>
                    <!-- Tab Content -->
                    <div id="lms-tab-content-details" style="padding: 20px; flex: 1; overflow-y: auto;">
                        ${details_content}
                    </div>
                    <div id="lms-tab-content-ai" style="padding: 20px; flex: 1; overflow-y: auto; display: none;">
                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 12px; font-weight: 700; color: #374151; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Proposed Disconnect Date</label>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="date" id="lms-disconnect-date" style="
                                    flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px;
                                    font-size: 14px; color: #0f172a; outline: none; font-family: 'Inter', sans-serif;
                                " />
                                <button id="lms-run-ai-btn" onclick="window.lms_run_ai_evaluation()" style="
                                    padding: 10px 18px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
                                    color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
                                    cursor: pointer; white-space: nowrap;
                                ">✨ Evaluate</button>
                            </div>
                        </div>
                        <div id="lms-ai-result">
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; color: #94a3b8;">
                                <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
                                <div style="font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 8px;">AI Financial Evaluation Ready</div>
                                <div style="font-size: 13px; color: #94a3b8;">Select a proposed disconnect date and click Evaluate to get the AI-powered financial impact analysis.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (document.getElementById('lms-pl-modal')) document.getElementById('lms-pl-modal').remove();
        if (!document.getElementById('lms-pl-animations')) {
            $('head').append(`
                <style id="lms-pl-animations">
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                </style>
            `);
        }
        $('body').append(modal_html);

        // Set today as default disconnect date
        let today = new Date().toISOString().split('T')[0];
        document.getElementById('lms-disconnect-date').value = today;
    };
    window.lms_switch_tab = function(tab) {
        document.getElementById('lms-tab-content-details').style.display = tab === 'details' ? 'block' : 'none';
        document.getElementById('lms-tab-content-ai').style.display = tab === 'ai' ? 'block' : 'none';
        let btnDetails = document.getElementById('lms-tab-details');
        let btnAi = document.getElementById('lms-tab-ai');
        if (tab === 'details') {
            btnDetails.style.color = '#2563eb'; btnDetails.style.background = '#ffffff'; btnDetails.style.borderBottom = '2px solid #2563eb';
            btnAi.style.color = '#64748b'; btnAi.style.background = 'transparent'; btnAi.style.borderBottom = '2px solid transparent';
        } else {
            btnAi.style.color = '#6366f1'; btnAi.style.background = '#ffffff'; btnAi.style.borderBottom = '2px solid #6366f1';
            btnDetails.style.color = '#64748b'; btnDetails.style.background = 'transparent'; btnDetails.style.borderBottom = '2px solid transparent';
        }
    };

    window.lms_run_ai_evaluation = function() {
        let disconnect_date = document.getElementById('lms-disconnect-date').value;
        if (!disconnect_date) { frappe.msgprint('Please select a Proposed Disconnect Date.'); return; }
        let result_div = document.getElementById('lms-ai-result');
        result_div.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;padding:60px 20px;text-align:center;">
                <div style="font-size:44px;margin-bottom:16px;">🧠</div>
                <div style="font-size:14px;font-weight:800;color:#6366f1;margin-bottom:6px;letter-spacing:0.5px;">ANALYZING FINANCIAL IMPACT</div>
                <div style="font-size:12px;color:#94a3b8;margin-bottom:20px;">Senior Finance Controller AI is evaluating contract, billing & risk...</div>
                <div style="width:260px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:2px;animation:lms-progress 2s ease-in-out infinite;"></div>
                </div>
            </div>
            <style>@keyframes lms-progress{0%{width:0%}50%{width:80%}100%{width:100%}}</style>
        `;
        frappe.call({
            method: 'nexapp.nexapp.doctype.change_management_request.change_management_request.get_lms_pl_ai_evaluation',
            args: {
                circuit_id: circuit_id,
                supplier: supplier,
                lms_id: lms_id,
                disconnect_date: disconnect_date,
                invoice_data: JSON.stringify(invoice_data_ref || {})
            },
            callback: function(r) {
                if (!r.message) {
                    result_div.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;"><div style="font-size:40px;">❌</div><div style="margin-top:12px;font-weight:600;">AI Evaluation failed. Please try again.</div></div>`;
                    return;
                }
                let ai = r.message;
                let fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                let C = {LOW:'#10b981',MEDIUM:'#f59e0b',HIGH:'#ef4444',CRITICAL:'#7c3aed'};
                let CB = {LOW:'#f0fdf4',MEDIUM:'#fffbeb',HIGH:'#fef2f2',CRITICAL:'#f5f3ff'};
                let SC = {Low:'#10b981',Medium:'#f59e0b',High:'#ef4444',Critical:'#7c3aed',Unknown:'#94a3b8'};
                let isSafe = ai.decision === '🟢 FINANCIALLY SAFE TO DISCONNECT' || ai.decision === '100% SAFE TO DISCONNECT' || ai.decision === 'SAFE TO DISCONNECT';
                let isReview = ai.decision === '🟡 EARLY DISCONNECTION – NOTICE PERIOD PENDING' || ai.decision === 'PROCUREMENT / OPERATIONAL REVIEW REQUIRED' || ai.decision === 'REQUIRES PROCUREMENT / OPERATIONAL REVIEW' || ai.decision === 'OPERATIONAL REVIEW REQUIRED';
                let dColor = isSafe ? '#10b981' : (isReview ? '#f59e0b' : '#ef4444');
                let dBg = isSafe ? '#f0fdf4' : (isReview ? '#fffbeb' : '#fef2f2');
                let dEmoji = isSafe ? '🟢' : (isReview ? '🟡' : '🔴');
                let rColor = C[ai.business_risk] || '#64748b';
                let rBg = CB[ai.business_risk] || '#f8fafc';

                // Section builder helper
                let sec = (title, content, border='#e2e8f0', bg='#f8fafc') =>
                    `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:14px;margin-bottom:12px;">${title ? `<div style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">${title}</div>` : ''}${content}</div>`;

                let chip = (text, color) => `<span style="background:${color}20;color:${color};padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;">${text}</span>`;

                // 1 — Master Decision Banner
                let banner = `
                <div style="background:${dBg};border:2px solid ${dColor};border-radius:14px;padding:18px;margin-bottom:12px;">
                    <div style="font-size:11px;font-weight:700;color:${dColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">🤖 AI Business Decision</div>
                    <div style="font-size:20px;font-weight:900;color:${dColor};margin-bottom:12px;">${dEmoji} ${ai.decision}</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
                        <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:10px;text-align:center;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Est. Financial Impact</div>
                            <div style="font-size:15px;font-weight:900;color:${ai.estimated_loss>0?'#ef4444':'#10b981'};">${fmt(ai.estimated_loss)}</div>
                        </div>
                        <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:10px;text-align:center;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Business Risk</div>
                            <div style="font-size:15px;font-weight:900;color:${rColor};">${ai.business_risk || '-'}</div>
                        </div>
                        <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:10px;text-align:center;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Recommended Action</div>
                            <div style="font-size:11px;font-weight:800;color:#0f172a;">${ai.recommended_action || '-'}</div>
                        </div>
                    </div>
                    <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:10px;">
                        <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Reason</div>
                        ${(ai.decision_reasons || []).map(r => `<div style="font-size:12px;color:#0f172a;padding:2px 0;display:flex;align-items:center;gap:6px;"><span style="color:${dColor};font-weight:700;">✓</span>${r}</div>`).join('')}
                    </div>
                </div>`;

                // 1.5 — Supplier Contract
                let sc = ai.supplier_contract || {};
                let scStatusColor = sc.status === 'Active' ? '#f59e0b' : (sc.status === 'Closed' ? '#10b981' : '#94a3b8');
                let scSection = sc.po_number ? sec('📄 Supplier Contract Evaluation', `
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        ${[['Purchase Order',sc.po_number],['PO Status',sc.po_status],['Contract Status',`<span style="color:${scStatusColor};font-weight:700;">${sc.status}</span>`],['Contract Liability',sc.contract_liability?'Yes':'No'],['Commercial Obligation',sc.commercial_obligation?'Yes':'No']].map(([l,v])=>`
                        <div style="padding:6px 0;border-bottom:1px solid #f1f5f9;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;">${l}</div>
                            <div style="font-size:12px;font-weight:600;color:#334155;">${v}</div>
                        </div>`).join('')}
                    </div>`, '#e2e8f0', '#fffbeb') : '';

                // 1.6 — Notice Period Evaluation
                let ne = ai.notice_evaluation || {};
                let neStatusColor = ne.notice_status === 'Satisfied' ? '#10b981' : '#ef4444';
                let neSection = ne.notice_period ? sec('⏳ Notice Period Evaluation', `
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        ${[['Today Date',ne.today_date],['Disconnect Date',ne.proposed_disconnect_date],['Notice Period',ne.notice_period],['Available Days',ne.available_days],['Notice Status',`<span style="color:${neStatusColor};font-weight:700;">${ne.notice_status}</span>`],['Additional Liability',ne.additional_liability_days ? ne.additional_liability_days + ' Days' : 'None']].map(([l,v])=>`
                        <div style="padding:6px 0;border-bottom:1px solid #f1f5f9;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;">${l}</div>
                            <div style="font-size:12px;font-weight:600;color:#334155;">${v}</div>
                        </div>`).join('')}
                    </div>`, '#e2e8f0', '#f0fdf4') : '';

                // 2 — Confidence with factors
                let confColor = (ai.confidence||0) >= 85 ? '#10b981' : (ai.confidence||0) >= 65 ? '#f59e0b' : '#ef4444';
                let confSection = sec('📊 AI Confidence Score', `
                    <div style="display:flex;align-items:center;gap:16px;margin-bottom:10px;">
                        <div style="font-size:36px;font-weight:900;color:${confColor};line-height:1;">${ai.confidence}%</div>
                        <div style="flex:1;">
                            <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                                <div style="height:100%;width:${ai.confidence}%;background:${confColor};border-radius:4px;transition:width 1s ease;"></div>
                            </div>
                            <div style="font-size:11px;color:#64748b;margin-top:4px;">Based on verified ERP records</div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                        ${(ai.confidence_factors || []).map(f => `<div style="font-size:11px;color:#334155;display:flex;align-items:center;gap:5px;padding:3px 0;"><span style="color:#10b981;font-size:13px;font-weight:700;">✓</span>${f}</div>`).join('')}
                    </div>
                    ${(ai.confidence_deductions||[]).length ? `<div style="margin-top:8px;border-top:1px solid #e2e8f0;padding-top:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Missing Data (Reduced Confidence)</div>${(ai.confidence_deductions||[]).map(d=>`<div style="font-size:11px;color:#ef4444;display:flex;align-items:center;gap:5px;padding:2px 0;"><span style="font-weight:700;">✗</span>${d}</div>`).join('')}</div>` : ''}`);

                // 3 — Decision Factors
                let dfSection = sec('✅ Decision Factors', `
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                        ${(ai.decision_factors || []).map(f => `<div style="font-size:11px;color:#334155;display:flex;align-items:center;gap:5px;padding:4px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#6366f1;font-size:13px;font-weight:700;">✓</span>${f}</div>`).join('')}
                    </div>`);

                // 4 — Financial Timeline
                let tlColors = {green:'#10b981',gray:'#94a3b8',red:'#ef4444',blue:'#6366f1',orange:'#f59e0b'};
                let timeline_html = (ai.financial_timeline || []).map((t, i, arr) => `
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:${i<arr.length-1?'0':'0'};">
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <div style="width:14px;height:14px;border-radius:50%;background:${tlColors[t.color]||'#94a3b8'};border:2px solid #fff;box-shadow:0 0 0 2px ${tlColors[t.color]||'#94a3b8'};flex-shrink:0;"></div>
                            ${i<arr.length-1?`<div style="width:2px;height:22px;background:linear-gradient(${tlColors[t.color]||'#94a3b8'},${tlColors[arr[i+1].color]||'#94a3b8'});"></div>`:''}
                        </div>
                        <div style="padding-bottom:${i<arr.length-1?'18px':'0'};">
                            <div style="font-size:11px;font-weight:700;color:#0f172a;">${t.label}</div>
                            <div style="font-size:12px;font-weight:600;color:${tlColors[t.color]||'#94a3b8'};">${t.date}</div>
                        </div>
                    </div>`).join('');
                let tlSection = sec('📅 Financial Timeline', `<div style="padding:4px 0;">${timeline_html}</div>`);

                // 5 — Money Flow
                let mfColors = {total:'#334155',consumed:'#2563eb',remaining:'#f59e0b',loss:'#ef4444'};
                let mf_html = (ai.money_flow || []).map((m, i, arr) => `
                    <div style="text-align:center;">
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">${m.label}</div>
                            <div style="font-size:14px;font-weight:900;color:${mfColors[m.type]||'#334155'};">${fmt(m.amount)}</div>
                        </div>
                        ${i<arr.length-1?`<div style="font-size:18px;color:#94a3b8;line-height:1.2;margin:2px 0;">↓</div>`:''}
                    </div>`).join('');
                let mfSection = sec('💰 Money Flow', `<div style="display:grid;grid-template-columns:repeat(${(ai.money_flow||[]).length},1fr);gap:0;align-items:center;">${mf_html}</div>`);

                // 6 — AI Recommendation
                let opSection = `<div style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;padding:14px;margin-bottom:12px;">
                    <div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">🧠 AI Recommendation</div>
                    <div style="font-size:12.5px;color:#0f172a;line-height:1.7;white-space:pre-wrap;">${ai.ai_recommendation || '-'}</div>
                </div>`;

                // 6.5 — Action Plan
                let apHtml = (ai.action_plan || []).map(a => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #e2e8f0;"><div style="font-size:12px;color:#334155;font-weight:600;">${a.action}</div><div style="font-size:11px;font-weight:700;">${a.status==='Completed'?'✅ Completed':'⏳ Pending'}</div></div>`).join('');
                let apSection = (ai.action_plan && ai.action_plan.length) ? sec('🎯 Required Before 100% Safe Disconnection', `
                    <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:10px;">
                        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;"><span>Mandatory Action</span><span>Status</span></div>
                        ${apHtml}
                        <div style="margin-top:10px;text-align:center;font-size:11px;color:#0f172a;font-weight:700;background:#f0fdf4;padding:8px;border-radius:4px;border:1px dashed #10b981;">The circuit will be considered 100% Safe to Disconnect only after all pending mandatory actions are completed.</div>
                    </div>
                `, '#0ea5e9', '#f0f9ff') : '';

                // 7 — Executive Summary (structured)
                let es = ai.executive_summary || {};
                let esSection = `<div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #c4b5fd;border-radius:10px;padding:14px;margin-bottom:12px;">
                    <div style="font-size:11px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">📋 Executive Summary</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
                        ${[['Financial Impact',fmt(es.financial_impact||0),'#334155'],['Business Risk',es.business_risk||'-',C[es.business_risk]||'#64748b'],['Operational Risk',es.operational_risk||'-',C[es.operational_risk]||'#64748b'],['Recommendation',es.recommendation||'-','#6366f1']].map(([l,v,c])=>`
                        <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:10px;">
                            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">${l}</div>
                            <div style="font-size:12px;font-weight:800;color:${c};">${v}</div>
                        </div>`).join('')}
                    </div>
                    <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;padding:10px;font-size:12px;color:#334155;line-height:1.5;"><strong>Reason:</strong> ${es.reason||'-'}</div>
                </div>`;

                // 8 — Risk Analysis (expanded)
                let risks_html = (ai.risks || []).map(r => `
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                        <div>
                            <div style="font-size:12px;color:#334155;font-weight:700;">${r.risk}</div>
                            <div style="font-size:11px;color:#64748b;margin-top:2px;">${r.description||''}</div>
                        </div>
                        ${chip(r.severity, SC[r.severity]||'#94a3b8')}
                    </div>`).join('');
                let riskSection = risks_html ? sec('⚠️ Risk Analysis', risks_html) : '';

                // 9 — Management Approval
                let approvalStatusColor = {'READY FOR APPROVAL':'#10b981','REQUIRES REVIEW':'#f59e0b','DO NOT APPROVE':'#ef4444'}[ai.overall_approval_status]||'#64748b';
                let mgmt_html = (ai.management_approvals || []).map(a => {
                    let aColor = a.status === 'Recommended' ? '#10b981' : '#f59e0b';
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                        <div style="font-size:12px;color:#334155;font-weight:600;">${a.status==='Recommended'?'✔':'⏳'} ${a.role} Approval</div>
                        ${chip(a.status, aColor)}
                    </div>`;
                }).join('');
                let mgmtSection = sec('🏢 Management Decision', `
                    ${mgmt_html}
                    <div style="margin-top:10px;padding:10px;background:${approvalStatusColor}15;border-radius:8px;text-align:center;">
                        <div style="font-size:11px;color:${approvalStatusColor};font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Final Status: ${ai.overall_approval_status||'PENDING'}</div>
                    </div>`);

                // 10 — What-If Simulation (3-dimensional)
                let vC = {'Recommended':'#10b981','Review Required':'#f59e0b','Not Recommended':'#ef4444'};
                let sC = {'Clear':'#10b981','Unknown':'#94a3b8','Loss':'#ef4444','Blocked':'#ef4444'};
                let sim_html = (ai.simulation || []).map(s => `
                    <tr>
                        <td style="padding:6px 8px;font-size:11px;color:#334155;font-weight:700;">${s.scenario}</td>
                        <td style="padding:6px 8px;font-size:11px;color:#64748b;">${s.date||''}</td>
                        <td style="padding:6px 8px;font-size:11px;color:#ef4444;font-weight:700;">${fmt(s.loss)}</td>
                        <td style="padding:6px 8px;">${chip(s.financial_status||'Clear', sC[s.financial_status]||'#94a3b8')}</td>
                        <td style="padding:6px 8px;">${chip(s.operational_status||'Unknown', sC[s.operational_status]||'#94a3b8')}</td>
                        <td style="padding:6px 8px;">${chip(s.final_verdict||'Review Required', vC[s.final_verdict]||'#94a3b8')}</td>
                    </tr>`).join('');
                let simSection = sec('📊 What-If Simulation', `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#e2e8f0;">
                            <th style="padding:5px 8px;text-align:left;font-size:9px;color:#475569;text-transform:uppercase;">Scenario</th>
                            <th style="padding:5px 8px;text-align:left;font-size:9px;color:#475569;text-transform:uppercase;">Date</th>
                            <th style="padding:5px 8px;text-align:left;font-size:9px;color:#475569;text-transform:uppercase;">Loss</th>
                            <th style="padding:5px 8px;text-align:left;font-size:9px;color:#475569;text-transform:uppercase;">Financial</th>
                            <th style="padding:5px 8px;text-align:left;font-size:9px;color:#475569;text-transform:uppercase;">Operational</th>
                            <th style="padding:5px 8px;text-align:left;font-size:9px;color:#475569;text-transform:uppercase;">Final</th>
                        </tr></thead>
                        <tbody>${sim_html}</tbody>
                    </table>`);

                // 11 — AI Observations
                let obs_html = (ai.ai_observations || []).map(l => `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:12px;color:#334155;"><span style="color:#8b5cf6;font-size:14px;flex-shrink:0;">💡</span>${l}</div>`).join('');
                let obsSection = obs_html ? sec('🔬 AI Observations', obs_html, '#c4b5fd', '#faf5ff') : '';

                // 12 — Decision Evidence
                let evid_html = (ai.decision_evidence || []).map(e => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                        <div style="font-size:11px;color:#64748b;font-weight:600;">✓ ${e.label}</div>
                        <div style="font-size:11px;color:#0f172a;font-weight:700;">${e.value}</div>
                    </div>`).join('');
                let evidCount = (ai.decision_evidence||[]).length;
                let evidSection = evid_html ? sec('🔍 AI Decision Evidence', `
                    ${evid_html}
                    <div style="margin-top:8px;font-size:11px;color:#94a3b8;font-style:italic;">Decision generated from ${evidCount} verified ERP records.</div>`) : '';

                // Alerts
                let alerts_html = (ai.alerts||[]).map(a=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px;color:#b45309;">⚠️ ${a}</div>`).join('');
                let alertsSection = alerts_html ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:12px;"><div style="font-size:11px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">🔔 Smart Alerts</div>${alerts_html}</div>` : '';

                // 13 — AI Clearance Matrix
                let cm = ai.clearance_matrix || {};
                let cmSt = {'APPROVED':'#10b981','PENDING':'#f59e0b','BLOCKED':'#ef4444','UNKNOWN':'#94a3b8'};
                let cmEm = {'APPROVED':'✅','PENDING':'❌','BLOCKED':'❌','UNKNOWN':'⚠'};
                let cmRows = [['Financial',cm.financial],['Operations',cm.operations],['Customer',cm.customer],['Supplier',cm.supplier]].map(([label,d])=>{
                    let st=(d||{}).status||'UNKNOWN'; let re=(d||{}).reason||'-';
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;"><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:14px;">${cmEm[st]||'⚠'}</span><div><div style="font-size:12px;color:#0f172a;font-weight:700;">${label} Clearance</div><div style="font-size:11px;color:#64748b;">${re}</div></div></div>${chip(st,cmSt[st]||'#94a3b8')}</div>`;}).join('');
                let overallCm = cm.financial && cm.operations && cm.customer && cm.supplier;
                let allApproved = overallCm && [cm.financial,cm.operations,cm.customer,cm.supplier].every(x=>x&&x.status==='APPROVED');
                let anyBlocked = overallCm && [cm.financial,cm.operations,cm.customer,cm.supplier].some(x=>x&&x.status==='BLOCKED');
                let overallSt = allApproved?'APPROVED':anyBlocked?'BLOCKED':'REVIEW REQUIRED';
                let overallStC = cmSt[overallSt]||'#f59e0b';
                let cmSection = sec('🛡️ AI Clearance Matrix', `${cmRows}<div style="margin-top:10px;padding:10px;background:${overallStC}15;border-radius:8px;text-align:center;"><div style="font-size:13px;font-weight:900;color:${overallStC};">${cmEm[overallSt]||'🟡'} Overall: ${overallSt}</div></div>`, '#6366f1', '#f8fafc');

                result_div.innerHTML = `<div style="font-family:'Inter',sans-serif;">
                    ${scSection}${neSection}${banner}${confSection}${dfSection}${tlSection}${mfSection}${opSection}${apSection}${esSection}${riskSection}${mgmtSection}${simSection}${alertsSection}${obsSection}${evidSection}${cmSection}
                </div>`;
            },
            error: function() {
                result_div.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;"><div style="font-size:40px;">❌</div><div style="margin-top:12px;font-weight:600;">Connection error. Please check API Configuration.</div></div>`;
            }
        });
    };




    frappe.call({
        method: "nexapp.nexapp.doctype.change_management_request.change_management_request.get_lms_pl_data",
        args: {
            circuit_id: circuit_id,
            supplier: supplier
        },
        callback: function (r) {
            if (r.message) {
                render_modal(r.message);
            } else {
                render_modal({});
            }
        }
    });
}

function load_lms_feasibility_details(frm) {
    if (frm.doc.circuit_id && frm.fields_dict.lms__information) {
        $(frm.fields_dict.lms__information.wrapper).html("<p class='text-muted'>Loading LMS Information...</p>");

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Lastmile Services Master",
                filters: { "circuit_id": frm.doc.circuit_id },
                fields: ["name", "supplier", "lms_brandwith_name", "bandwith_type", "lms_stage", "lms_delivery_date", "po_number"]
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    let html = `
                        <div class="table-responsive">
                            <table class="table table-bordered table-hover">
                                <thead>
                                    <tr style="background-color: #f8f9fa;">
                                        <th>LMS ID</th>
                                        <th>Supplier</th>
                                        <th>LMS Brandwith Name</th>
                                        <th>Bandwith Type</th>
                                        <th>LMS Stage</th>
                                        <th>LMS Delivery Date</th>
                                        <th>PO Number</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    r.message.forEach((row) => {
                        let format_date = (d) => {
                            if (!d) return '';
                            let parts = d.split('-');
                            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                            return d;
                        };
                        html += `
                            <tr>
                                <td><a href="/app/lastmile-services-master/${row.name}" style="font-weight:bold;">${row.name}</a></td>
                                <td>${row.supplier || ''}</td>
                                <td>${row.lms_brandwith_name || ''}</td>
                                <td>${row.bandwith_type || ''}</td>
                                <td>${row.lms_stage || ''}</td>
                                <td>${format_date(row.lms_delivery_date)}</td>
                                <td>${row.po_number || ''}</td>
                            </tr>
                        `;
                    });
                    html += `</tbody></table></div>`;
                    $(frm.fields_dict.lms__information.wrapper).html(html);
                    $(frm.fields_dict.lms__information.wrapper).closest('.form-section').show();
                } else {
                    $(frm.fields_dict.lms__information.wrapper).html("<p class='text-muted' style='padding: 10px;'>No LMS Information found for this circuit.</p>");
                    $(frm.fields_dict.lms__information.wrapper).closest('.form-section').hide();
                }
            }
        });
    }
}
