function format_to_dd_mm_yyyy_hh_mm(date_input) {
    if (!date_input) return "";
    let date = date_input;
    if (typeof date === "string") {
        if (window.frappe && frappe.datetime && frappe.datetime.convert_to_user_tz) {
            date = frappe.datetime.convert_to_user_tz(date);
        }
        date = new Date(
            (date || "")
                .replace(/-/g, "/")
                .replace(/[TZ]/g, " ")
                .replace(/\.[0-9]*/, "")
        );
    }
    if (isNaN(date.getTime())) return "";

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

function override_timeline_date_format() {
    if (window.BaseTimeline && !BaseTimeline.prototype._original_get_timeline_item) {
        BaseTimeline.prototype._original_get_timeline_item = BaseTimeline.prototype.get_timeline_item;
        BaseTimeline.prototype.get_timeline_item = function (item) {
            if (item && typeof item.content === 'string') {
                item.content = item.content.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3-$2-$1');
            }
            return this._original_get_timeline_item.apply(this, arguments);
        };
    }
}

override_timeline_date_format();

if (window.comment_when) {
    window.comment_when = function (datetime, mini) {
        const formatted = format_to_dd_mm_yyyy_hh_mm(datetime);
        return `<span class="frappe-timestamp ${mini ? 'mini' : ''}" data-timestamp="${datetime}" title="${datetime}">${formatted}</span>`;
    };
    if (window.frappe && frappe.datetime) {
        frappe.datetime.comment_when = window.comment_when;
    }
}

if (window.frappe && frappe.datetime) {
    frappe.datetime.refresh_when = function () {
        if (window.jQuery) {
            $(".frappe-timestamp").each(function () {
                const ts = $(this).attr("data-timestamp");
                if (ts) {
                    $(this).html(format_to_dd_mm_yyyy_hh_mm(ts));
                }
            });
        }
    };
}

frappe.ui.form.on('Site', {
    onload: function (frm) {
        override_timeline_date_format();
        frm._original_eta = frm.doc.estimated_time_of_arrival;
        if (typeof render_site_status_bar === "function") {
            render_site_status_bar(frm);
        }
    },
    refresh: function (frm) {
        override_timeline_date_format();

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

        // List of fields to be styled

        // Fetch TAT target dynamically from Master TAT strictly using lms_type
        if (!frm.doc.__islocal) {
            frappe.call({
                method: "nexapp.api.get_tat_target",
                args: {
                    process: "Site",
                    lms_type: frm.doc.lms_type || ""
                },
                callback: function (r) {
                    if (r.message !== undefined && r.message > 0) {
                        frm.tat_period_days = r.message;
                    } else {
                        frm.tat_period_days = 30; // standard fallback
                    }
                    if (typeof render_site_status_bar === "function") {
                        render_site_status_bar(frm);
                    }
                }
            });
        } else if (typeof render_site_status_bar === "function") {
            frm.tat_period_days = 30; // standard fallback for new docs
            setTimeout(() => {
                render_site_status_bar(frm);
            }, 100);
        }

        if (!frm.is_new()) {
            const setup_action_buttons = function () {
                frm.remove_custom_button(__('Site Cancel'), __('Actions'));
                frm.remove_custom_button(__('On Hold'), __('Actions'));
                frm.remove_custom_button(__('Resume'), __('Actions'));

                const hidden_statuses = [
                    'Delivered and Live',
                    'Site Shifted to new location',
                    'Site Upgraded to new Circuit',
                    'Site degraded to new Circuit',
                    'Disconnection In Process',
                    'Disconnected',
                    'Cancelled'
                ];

                if (hidden_statuses.includes(frm.doc.site_status)) {
                    return;
                }

                if (frm.doc.site_status !== 'On Hold' && frm.doc.site_status !== 'Cancelled') {
                    frm.add_custom_button(__('On Hold'), function () {
                        let modalId = 'custom-on-hold-modal';
                        $(`#${modalId}`).remove();

                        let modalHtml = `
                        <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
                            <div style="background: white; padding: 24px; border-radius: 16px; width: 665px; max-width: 90vw; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: inherit;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">Reason for placing On Hold</h3>
                                    <button id="close_on_hold_icon_btn" style="background: transparent; border: none; font-size: 24px; color: #9ca3af; cursor: pointer; padding: 0; line-height: 1; transition: color 0.2s;">&times;</button>
                                </div>
                                
                                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 24px; border-radius: 4px; display: flex; align-items: flex-start; gap: 10px;">
                                    <svg style="width: 20px; height: 20px; color: #f59e0b; flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    <div style="font-size: 13px; color: #92400e; line-height: 1.5;">
                                        <strong style="font-weight: 600; color: #b45309;">Warning:</strong> On Hold status is allowed only for customer-side delays. All records are monitored, audited, and require supporting evidence.
                                    </div>
                                </div>
                                <style>
                                    #custom-on-hold-modal .custom-field-row {
                                        display: flex;
                                        align-items: center;
                                        margin-bottom: 16px;
                                        overflow: visible !important;
                                    }
                                    #custom-on-hold-modal .custom-field-label {
                                        width: 35%;
                                        font-weight: 700;
                                        font-size: 13px;
                                        color: #1e293b;
                                    }
                                    #custom-on-hold-modal .custom-field-input {
                                        width: 65%;
                                        overflow: visible !important;
                                    }
                                    .awesomplete > ul {
                                        z-index: 99999 !important;
                                    }
                                    #custom-on-hold-modal textarea.form-control {
                                        height: 130px !important;
                                        min-height: 130px !important;
                                        resize: vertical !important;
                                    }
                                    #custom-on-hold-modal input.form-control, 
                                    #custom-on-hold-modal textarea.form-control {
                                        border: none !important;
                                        border-bottom: 1px solid #94a3b8 !important;
                                        border-radius: 0 !important;
                                        box-shadow: none !important;
                                        background-color: transparent !important;
                                        padding: 4px 0 !important;
                                        font-size: 14px !important;
                                        background-image: linear-gradient(#4338ca, #4338ca);
                                        background-size: 0% 2px;
                                        background-repeat: no-repeat;
                                        background-position: center bottom;
                                        transition: background-size 0.3s ease;
                                    }
                                    #custom-on-hold-modal input.form-control:focus,
                                    #custom-on-hold-modal textarea.form-control:focus {
                                        border-bottom: 1px solid #94a3b8 !important;
                                        background-size: 100% 2px;
                                    }
                                </style>

                                <div class="custom-field-row">
                                    <div class="custom-field-label">Reason <span style="color: #ef4444;">*</span></div>
                                    <div class="custom-field-input" id="on_hold_reason_container"></div>
                                </div>
                                

                                <div class="custom-field-row">
                                    <div class="custom-field-label">Attach Supporting Evidence <span style="color: #ef4444;">*</span></div>
                                    <div class="custom-field-input" id="on_hold_attachment_container">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <button type="button" id="on_hold_attach_btn" style="padding: 5px 12px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 13px; color: #374151; background: #f9fafb; transition: all 0.2s;">
                                                Attach
                                            </button>
                                            <span id="on_hold_file_name" style="font-size: 13px; color: #6b7280;"></span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                    <div style="font-size: 12px; color: #64748b;">
                                        <strong style="color: #475569;">Note:</strong> Use the description field for additional details if required.
                                    </div>
                                    <div style="display: flex; gap: 12px;">
                                        <button id="submit_on_hold_btn" style="padding: 8px 16px; border: none; background: #6366f1; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 500; color: white; transition: all 0.2s;">Submit</button>
                                    </div>
                                </div>
                            </div>
                        </div>`;

                        $('body').append(modalHtml);

                        $('#cancel_on_hold_btn').hover(function() { $(this).css('background', '#f3f4f6'); }, function() { $(this).css('background', 'white'); });
                        $('#submit_on_hold_btn').hover(function() { $(this).css('background', '#4f46e5'); }, function() { $(this).css('background', '#6366f1'); });

                        let control = frappe.ui.form.make_control({
                            frm: frm,
                            doc: frm.doc,
                            df: {
                                fieldtype: 'Link',
                                options: 'Project On Hold Reason',
                                fieldname: 'reason',
                                label: 'Reason',
                                reqd: 1
                            },
                            parent: $('#on_hold_reason_container'),
                            only_input: false
                        });
                        control.make_input();
                        $('#on_hold_reason_container .frappe-control').css('margin-bottom', '0');

                        // Store uploaded file URL
                        let uploaded_file_url = '';

                        $('#on_hold_attach_btn').click(function() {
                            new frappe.ui.FileUploader({
                                doctype: frm.doctype,
                                docname: frm.doc.name,
                                folder: 'Home/Attachments',
                                on_success: function(file_doc) {
                                    uploaded_file_url = file_doc.file_url;
                                    $('#on_hold_file_name').text(file_doc.file_name).css('color', '#16a34a');
                                    $('#on_hold_attachment_container').css('border', '');
                                }
                            });
                        });

                        $('#close_on_hold_icon_btn').click(function() {
                            $('#custom-on-hold-modal').remove();
                        });
                        $('#close_on_hold_icon_btn').hover(function() { $(this).css('color', '#374151'); }, function() { $(this).css('color', '#9ca3af'); });

                        $('#submit_on_hold_btn').click(function() {
                            let reason = control.get_value();
                            
                            control.$input.css('border-color', reason ? '' : 'red');
                            $('#on_hold_attachment_container').css('border', uploaded_file_url ? '' : '1px solid red').css('border-radius', '4px');

                            if (!reason || !uploaded_file_url) {
                                frappe.show_alert({message: 'Please fill all mandatory fields', indicator: 'red'});
                                return;
                            }
                            
                            $('#custom-on-hold-modal').remove();
                            
                            frm.set_value('site_status', 'On Hold');
                            frm.set_value('on_hold_reason', reason);
                            frm.set_value('on_hold_attachment', uploaded_file_url);
                            
                            let comment_row = frm.add_child('comments');
                            comment_row.comments = 'Site is on Hold. Reason: ' + reason;
                            comment_row.datetme = frappe.datetime.now_datetime();
                            comment_row.user = frappe.session.user;
                            frm.refresh_field('comments');
                            
                            frm.save();
                            frappe.show_alert({ message: __('Site has been placed On Hold.'), indicator: 'orange' });
                        });
                    }, __('Actions'));
                }

                if (frm.doc.site_status === 'On Hold') {
                    frm.add_custom_button(__('Resume'), function () {
                        frappe.call({
                            method: 'nexapp.api.get_last_status_before_hold_or_cancel',
                            args: {
                                doctype: frm.doctype,
                                docname: frm.doc.name
                            },
                            callback: function (r) {
                                let target_status = r.message || 'In-process';
                                let modalId = 'custom-resume-modal';
                                $('#' + modalId).remove();
                                
                                let modalHtml = `
                                    <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                                        <div style="background: white; border-radius: 16px; width: 380px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: inherit;">
                                            <div style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">Resume Site?</div>
                                            <div style="font-size: 14px; color: #4b5563; margin-bottom: 24px; line-height: 1.5;">
                                                This will resume the site. Status will be restored to <b>${target_status}</b>.
                                            </div>
                                            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                                                <button id="cancel_resume_btn" style="padding: 8px 18px; border: 1px solid #e5e7eb; background: white; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151; transition: all 0.2s;">Cancel</button>
                                                <button id="confirm_resume_btn" style="padding: 8px 18px; border: none; background: #16a34a; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 500; color: white; transition: all 0.2s;">Resume</button>
                                            </div>
                                        </div>
                                    </div>
                                `;

                                $('body').append(modalHtml);

                                $('#cancel_resume_btn').hover(function() { $(this).css('background', '#f9fafb'); }, function() { $(this).css('background', 'white'); });
                                $('#confirm_resume_btn').hover(function() { $(this).css('background', '#15803d'); }, function() { $(this).css('background', '#16a34a'); });

                                $('#cancel_resume_btn').click(function() {
                                    $('#' + modalId).remove();
                                });

                                $('#confirm_resume_btn').click(function() {
                                    $('#' + modalId).remove();
                                    frm.set_value('site_status', target_status);
                                    frm.set_value('on_hold_reason', '');
                                    frm.save();
                                    frappe.show_alert({ message: __('Site has been resumed.'), indicator: 'green' });
                                });
                            }
                        });
                    }, __('Actions'));
                }

                if (frm.doc.site_status !== 'Cancelled') {
                    frm.add_custom_button(__('Site Cancel'), function () {
                        frappe.call({
                            doc: frm.doc,
                            method: 'validate_site_cancellation',
                            callback: function (r) {
                                let can_cancel = r.message.can_cancel;
                                if (can_cancel) {
                                    let d = new frappe.ui.Dialog({
                                        title: __('Reason for Cancel'),
                                        fields: [
                                            {
                                                label: __('Reason'),
                                                fieldname: 'reason',
                                                fieldtype: 'Small Text',
                                                reqd: 1
                                            }
                                        ],
                                        primary_action_label: __('Submit'),
                                        primary_action(values) {
                                            frm.set_value('site_status', 'Cancelled');
                                            frm.set_value('cancel_reason', values.reason);
                                            frm.save();
                                            d.hide();
                                            frappe.show_alert({ message: __('Site has been cancelled.'), indicator: 'red' });
                                        }
                                    });
                                    d.show();
                                } else {
                                    let modalId = 'custom-cancel-error-modal';
                                    $('#' + modalId).remove();
                                    
                                    let dn_html = '';
                                    if (r.message.delivery_notes && r.message.delivery_notes.length > 0) {
                                        dn_html = `
                                            <div style="margin-top: 24px;">
                                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                                    <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #3b82f6;"></div>
                                                    <h4 style="font-size: 15px; font-weight: 600; color: #1e293b; margin: 0; letter-spacing: -0.01em;">Delivery Notes</h4>
                                                </div>
                                                <div style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                                                    <table class="premium-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                                        <thead>
                                                            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                                                <th style="padding: 12px 16px; text-align: left; color: #475569; font-weight: 600;">Delivery Note</th>
                                                                <th style="padding: 12px 16px; text-align: left; color: #475569; font-weight: 600;">Posting Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${r.message.delivery_notes.map((dn, i) => `
                                                                <tr style="border-bottom: ${i === r.message.delivery_notes.length - 1 ? 'none' : '1px solid #f1f5f9'}; background-color: white; transition: background-color 0.2s;">
                                                                    <td style="padding: 12px 16px; color: #0f172a; font-weight: 500;">${dn.name}</td>
                                                                    <td style="padding: 12px 16px; color: #64748b;">${dn.posting_date ? format_to_dd_mm_yyyy_hh_mm(dn.posting_date).split(' ')[0] : ''}</td>
                                                                </tr>
                                                            `).join('')}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        `;
                                    }
                                    
                                    let po_html = '';
                                    if (r.message.purchase_orders && r.message.purchase_orders.length > 0) {
                                        po_html = `
                                            <div style="margin-top: 24px;">
                                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                                    <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #8b5cf6;"></div>
                                                    <h4 style="font-size: 15px; font-weight: 600; color: #1e293b; margin: 0; letter-spacing: -0.01em;">Purchase Orders</h4>
                                                </div>
                                                <div style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                                                    <table class="premium-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                                        <thead>
                                                            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                                                <th style="padding: 12px 16px; text-align: left; color: #475569; font-weight: 600;">Purchase Order</th>
                                                                <th style="padding: 12px 16px; text-align: left; color: #475569; font-weight: 600;">Supplier Name</th>
                                                                <th style="padding: 12px 16px; text-align: left; color: #475569; font-weight: 600;">Purchase Order Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${r.message.purchase_orders.map((po, i) => `
                                                                <tr style="border-bottom: ${i === r.message.purchase_orders.length - 1 ? 'none' : '1px solid #f1f5f9'}; background-color: white; transition: background-color 0.2s;">
                                                                    <td style="padding: 12px 16px; color: #0f172a; font-weight: 500;">${po.name}</td>
                                                                    <td style="padding: 12px 16px; color: #334155;">${po.supplier_name || ''}</td>
                                                                    <td style="padding: 12px 16px; color: #64748b;">${po.transaction_date ? format_to_dd_mm_yyyy_hh_mm(po.transaction_date).split(' ')[0] : ''}</td>
                                                                </tr>
                                                            `).join('')}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        `;
                                    }

                                    let modalHtml = `
                                        <style>
                                            @keyframes premiumModalPop {
                                                0% { opacity: 0; transform: scale(0.96) translateY(10px); }
                                                100% { opacity: 1; transform: scale(1) translateY(0); }
                                            }
                                            @keyframes premiumFadeIn {
                                                0% { opacity: 0; }
                                                100% { opacity: 1; }
                                            }
                                            .premium-table tbody tr:hover { background-color: #f8fafc !important; }
                                        </style>
                                        <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.65); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: premiumFadeIn 0.3s ease;">
                                            <div style="background: white; padding: 32px; border-radius: 20px; width: 720px; max-width: 92vw; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05); font-family: inherit; max-height: 90vh; overflow-y: auto; animation: premiumModalPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                                                
                                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                                                    <div>
                                                        <h3 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">Action Blocked</h3>
                                                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Active dependencies prevent cancellation</p>
                                                    </div>
                                                    <button id="close_cancel_err_icon_btn" style="background: transparent; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #94a3b8; cursor: pointer; padding: 0; line-height: 1; transition: all 0.2s; margin: -4px -4px 0 0;">&times;</button>
                                                </div>
                                                
                                                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fca5a5; padding: 16px; margin-bottom: 8px; border-radius: 12px; display: flex; align-items: flex-start; gap: 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);">
                                                    <div style="background: #ef4444; border-radius: 50%; padding: 6px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);">
                                                        <svg style="width: 16px; height: 16px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                    </div>
                                                    <div style="font-size: 14px; font-weight: 500; color: #991b1b; line-height: 1.5; padding-top: 4px;">
                                                        This Site cannot be cancelled because the following active transactions exist. Please cancel these transactions before cancelling the Site.
                                                    </div>
                                                </div>
                                                
                                                ${dn_html}
                                                ${po_html}

                                            </div>
                                        </div>
                                    `;
                                    
                                    $('body').append(modalHtml);
                                    
                                    $('#close_cancel_err_icon_btn').hover(function() { $(this).css('background', '#f1f5f9'); $(this).css('color', '#334155'); }, function() { $(this).css('background', 'transparent'); $(this).css('color', '#94a3b8'); });
                                    
                                    $('#close_cancel_err_icon_btn').click(function() {
                                        $('#' + modalId).remove();
                                    });
                                }
                            }
                        });
                    }, __('Actions'));
                }
            };

            setup_action_buttons();
            setTimeout(setup_action_buttons, 100);
        }
    }
});

///////////////////////////////////////////////////////////////////////////

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

frappe.ui.form.on('Site', {
    open_map_picker_btn: function (frm) {
        if (typeof show_site_interactive_map_picker === 'function') {
            show_site_interactive_map_picker(frm);
        }
    },
    shipment_open_map_pick_location: function (frm) {
        if (typeof show_shipment_interactive_map_picker === 'function') {
            show_shipment_interactive_map_picker(frm);
        }
    },
    refresh: function (frm) {
        if (typeof window.setup_site_pincode === 'function') {
            window.setup_site_pincode(frm);
        }
        if (typeof window.setup_site_map_picker === 'function') {
            window.setup_site_map_picker(frm);
        }
        if (typeof window.setup_shipment_map_picker === 'function') {
            window.setup_shipment_map_picker(frm);
        }

        // Ensure the field exists before attaching event using event delegation
        if (frm.fields_dict.shipment_pincode && frm.fields_dict.shipment_pincode.wrapper) {
            $(frm.fields_dict.shipment_pincode.wrapper).off('input', 'input').on('input', 'input', debounce(function (e) {
                let raw_val = e.target.value || "";
                const pincode = raw_val.replace(/\D/g, '');

                // Reset alert flag when user starts typing
                frm._alert_shown = false;

                if (pincode.length === 6) {
                    if (frm.doc.shipment_pincode !== pincode) {
                        frm.set_value("shipment_pincode", pincode);
                    }

                    frappe.show_alert({ message: "Fetching location details...", indicator: "blue" });

                    frappe.call({
                        method: 'nexapp.api.get_pincode_details',
                        args: { pincode: pincode },
                        callback: function (r) {
                            if (r.message && r.message.district) {
                                const details = r.message;
                                frm.set_value("shipment_district", details.district || "");
                                frm.set_value("shipment_country", details.country || "India");
                                frm.set_value("shipment_city", details.city || "");
                                frm.set_value("shipment_state", details.state || "");
                            } else {
                                frappe.msgprint("Pincode not found or invalid.");
                            }
                        },
                        error: function (err) {
                            console.error("API Error:", err);
                            frappe.msgprint("Error fetching data from API.");
                        }
                    });
                } else if (pincode.length === 0) {
                    if (frm.doc.shipment_pincode !== "") {
                        frm.set_value("shipment_pincode", "");
                    }
                    frm.set_value("shipment_district", "");
                    frm.set_value("shipment_country", "");
                    frm.set_value("shipment_city", "");
                    frm.set_value("shipment_state", "");
                }
            }, 500));
        }
    }
});

////////////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Site', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            const setup_stock_management_button = function () {
                // Remove existing buttons inside the group if they were somehow left over
                frm.remove_custom_button(__('Stock Request'), __('Stock Management'));
                frm.remove_custom_button(__('Delivery Request'), __('Stock Management'));
                frm.remove_custom_button(__('Cancelled'), __('Stock Management'));
                frm.remove_custom_button(__('Stock Return Request'), __('Stock Management'));
                frm.remove_custom_button(__('On Hold'), __('Stock Management'));

                // Get current status from first site item
                const site_item = frm.doc.site_item && frm.doc.site_item[0];
                const status = site_item ? site_item.status : null;

                // Define all possible buttons with methods
                const button_config = {
                    'Stock Request': { method: 'create_stock_request' },
                    'Delivery Request': { method: 'delivery_request' },
                    'Cancelled': { method: 'cancel_stock_request' },
                    'Stock Return Request': { method: 'stock_return_request' },
                    'On Hold': { method: 'mark_on_hold' }
                };

                // Define which buttons are visible for which statuses
                const status_rules = {
                    'Open': ['Stock Request'],
                    'Stock Requested': ['Delivery Request', 'Cancelled', 'On Hold'],
                    'Stock Delivery Requested': ['Cancelled', 'On Hold'],
                    'Delivery In-Process': ['On Hold', 'Cancelled'],
                    'Stock Shipment In-Process': ['Stock Return Request'],
                    'Stock Reserved': ['Stock Request', 'Delivery Request', 'On Hold', 'Cancelled'],
                    'Stock Delivered': ['Stock Return Request'],
                    'Cancel Requested': ['Stock Request'],
                    'Cancelled': ['Stock Request', 'On Hold'],
                    'On Hold': ['Stock Request', 'Delivery Request', 'Cancelled'],
                    'Stock Returned': ['Stock Request', 'Delivery Request', 'On Hold', 'Cancelled'],
                    'Return Requested': ['Cancelled'],
                    'Stock Lost': ['Stock Request', 'Delivery Request', 'On Hold', 'Cancelled']
                };

                let allowed_buttons = status_rules[status] ? [...status_rules[status]] : [];

                let current_site_status = (frm.doc.site_status || '').toLowerCase();
                let current_stock_stage = (frm.doc.stock_stage || '').toLowerCase();

                if (current_site_status === 'in-process' && current_stock_stage === 'pending') {
                    if (!allowed_buttons.includes('Stock Request')) {
                        allowed_buttons.push('Stock Request');
                    }
                }

                if (!allowed_buttons.length) return;

                // Add each button using Frappe's native group system
                allowed_buttons.forEach(label => {
                    const method = button_config[label].method;
                    frm.add_custom_button(__(label), () => {
                        if (label === 'Delivery Request') {
                            open_delivery_dialog(frm, method);
                        } else {
                            frappe.confirm(__('Proceed with {0}?', [label]), () => {
                                frm.call(method)
                                    .then(() => {
                                        frm.refresh();
                                        if (['create_stock_request', 'cancel_stock_request', 'stock_return_request', 'mark_on_hold'].includes(method)) {
                                            frappe.publish_realtime('list_refresh', 'Stock Management');
                                        }
                                        frappe.show_alert(__('Action completed successfully'), 'green');
                                    })
                                    .catch(() => frappe.show_alert(__('Operation failed'), 'red'));
                            });
                        }
                    }, __('Stock Management'));
                });

                // Add the primary button class to the natively generated group button
                setTimeout(() => {
                    if (frm.custom_buttons && frm.custom_buttons['Stock Management']) {
                        $(frm.custom_buttons['Stock Management']).addClass('btn-primary');
                    }
                }, 50);
            };

            setup_stock_management_button();
            setTimeout(setup_stock_management_button, 100);
            setTimeout(setup_stock_management_button, 500);
        }
    }
});

// ✅ Perfectly Formatted Delivery Dialog with Enhanced Address and Contact Display
function open_delivery_dialog(frm, method) {
    // Get current site details
    const site_details = {
        address_street: frm.doc.address_street || '',
        pincode: frm.doc.pincode || '',
        city: frm.doc.city || '',
        district: frm.doc.district || '',
        state: frm.doc.state || '',
        country: frm.doc.country || 'India',
        contact_person: frm.doc.contact_person || '',
        primary_contact_mobile: frm.doc.primary_contact_mobile || ''
    };

    let dlg = new frappe.ui.Dialog({
        title: __('🚚 Set Delivery Info'),
        fields: [
            // Info Note
            {
                fieldtype: 'HTML',
                fieldname: 'shipment_note',
                options: `
                    <div style="background: #e6f7ff; border-left: 5px solid #1890ff; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                        <i class="fa fa-info-circle" style="color:#1890ff; margin-right: 6px;"></i>
                        <strong>Note:</strong> Please confirm the contact number and address with the customer or site in-charge to avoid shipment delays.
                    </div>`
            },

            // Delivery Date
            {
                label: '📅 Shipment Delivery Date',
                fieldtype: 'Date',
                fieldname: 'delivery_date',
                reqd: 1
            },

            // Shipment Instruction
            {
                fieldtype: 'Section Break'
            },
            {
                label: '📦 Shipment Instruction if any',
                fieldtype: 'Check',
                fieldname: 'is_different_instruction',
                default: 0
            },
            {
                label: '✍️ Shipment Instruction',
                fieldtype: 'Small Text',
                fieldname: 'shipment_instruction',
                depends_on: 'eval:doc.is_different_instruction==1'
            },

            // Current Address Display
            {
                fieldtype: 'Section Break',
                //label: 'Current Site Address',
                collapsible: 0
            },
            {
                fieldtype: 'HTML',
                fieldname: 'current_address_display',
                options: `
                    <div class="current-address-display" style="
                        padding: 15px;
                        background: #fff0f0;
                        border-radius: 4px;
                        margin-bottom: 15px;
                        border: 1px solid #ffd6d6;
                    ">
                        <div style="
                            margin-bottom: 12px;
                            font-weight: 600;
                            color: #333;
                            font-size: 14px;
                        ">
                            <i class="fa fa-map-marker" style="color: #e74c3c; margin-right: 8px;"></i>
                            CURRENT SITE ADDRESS
                        </div>
                        
                        <div style="
                            margin-bottom: 12px;
                            padding: 8px;
                            background: white;
                            border-radius: 3px;
                            border-left: 3px solid #e74c3c;
                        ">
                            <div style="font-weight: 600; margin-bottom: 5px;">Address:</div>
                            <div style="white-space: pre-wrap; min-height: 60px;">${site_details.address_street || 'Not specified'}</div>
                        </div>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">Pin Code:</div>
                                <div>${site_details.pincode || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">City:</div>
                                <div>${site_details.city || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">District:</div>
                                <div>${site_details.district || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">State:</div>
                                <div>${site_details.state || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(33% - 12px); min-width: 120px;">
                                <div style="font-weight: 600;">Country:</div>
                                <div>${site_details.country || 'Not specified'}</div>
                            </div>
                        </div>
                    </div>`
            },

            // Shipping Address Toggle
            {
                label: '🏠 Is your Shipping Address different from the above Address?',
                fieldtype: 'Check',
                fieldname: 'is_different_address',
                default: 0
            },

            // Shipping Address Fields
            {
                fieldtype: 'Section Break',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '📍 Shipping Address',
                fieldtype: 'Small Text',
                fieldname: 'shipment_address',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🔢 Pin Code',
                fieldtype: 'Data',
                fieldname: 'shipment_pincode',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🏙️ City',
                fieldtype: 'Data',
                fieldname: 'shipment_city',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🌐 District',
                fieldtype: 'Data',
                fieldname: 'shipment_district',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🗺️ State',
                fieldtype: 'Data',
                fieldname: 'shipment_state',
                depends_on: 'eval:doc.is_different_address==1'
            },
            {
                label: '🌏 Country',
                fieldtype: 'Data',
                fieldname: 'shipment_country',
                default: 'India',
                depends_on: 'eval:doc.is_different_address==1'
            },

            // Current Contact Display
            {
                fieldtype: 'Section Break',
                //label: 'Current Contact Details',
                collapsible: 0
            },
            {
                fieldtype: 'HTML',
                fieldname: 'current_contact_display',
                options: `
                    <div class="current-contact-display" style="
                        padding: 15px;
                        background: #fff0f0;
                        border-radius: 4px;
                        margin-bottom: 15px;
                        border: 1px solid #ffd6d6;
                    ">
                        <div style="
                            margin-bottom: 12px;
                            font-weight: 600;
                            color: #333;
                            font-size: 14px;
                        ">
                            <i class="fa fa-user" style="color: #e74c3c; margin-right: 8px;"></i>
                            CURRENT CONTACT DETAILS
                        </div>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                            <div style="flex: 0 0 calc(50% - 12px); min-width: 200px;">
                                <div style="font-weight: 600;">Contact Person:</div>
                                <div style="padding: 5px 0;">${site_details.contact_person || 'Not specified'}</div>
                            </div>
                            <div style="flex: 0 0 calc(50% - 12px); min-width: 200px;">
                                <div style="font-weight: 600;">Contact Mobile No:</div>
                                <div style="padding: 5px 0;">${site_details.primary_contact_mobile || 'Not specified'}</div>
                            </div>
                        </div>
                    </div>`
            },

            // Contact Info Toggle
            {
                label: '📞 Is your contact information different from what shown above?',
                fieldtype: 'Check',
                fieldname: 'is_different_contact',
                default: 0
            },

            // Contact Info Fields
            {
                fieldtype: 'Section Break',
                depends_on: 'eval:doc.is_different_contact==1'
            },
            {
                label: '👤 Contact Person',
                fieldtype: 'Data',
                fieldname: 'shipment_contact_person',
                depends_on: 'eval:doc.is_different_contact==1'
            },
            {
                label: '📱 Contact Mobile No',
                fieldtype: 'Data',
                fieldname: 'contact_mobile_no',
                depends_on: 'eval:doc.is_different_contact==1'
            }
        ],
        primary_action_label: __('✅ Request Delivery'),
        primary_action(values) {
            if (!values.delivery_date) {
                frappe.msgprint(__('📅 Please set a shipment delivery date.'));
                return;
            }

            // Shipment Instruction
            if (values.is_different_instruction) {
                if (!values.shipment_instruction) {
                    frappe.msgprint(__('✍️ Please enter Shipment Instruction.'));
                    return;
                }
                frm.set_value('instructions', values.shipment_instruction);
            }

            // Update Site fields if different address/contact is selected
            if (values.is_different_address) {
                frm.set_value('shipment_address', values.shipment_address);
                frm.set_value('shipment_pincode', values.shipment_pincode);
                frm.set_value('shipment_city', values.shipment_city);
                frm.set_value('shipment_district', values.shipment_district);
                frm.set_value('shipment_state', values.shipment_state);
                frm.set_value('shipment_country', values.shipment_country);
            }

            if (values.is_different_contact) {
                frm.set_value('shipment_contact_person', values.shipment_contact_person);
                frm.set_value('contact_mobile_no', values.contact_mobile_no);
            }

            frm.call(method, {
                delivery_date: values.delivery_date,
                is_different_instruction: values.is_different_instruction ? 1 : 0,
                shipment_instruction: values.is_different_instruction ? values.shipment_instruction : null,
                is_different_address: values.is_different_address ? 1 : 0,
                shipment_address: values.is_different_address ? values.shipment_address : null,
                shipment_pincode: values.is_different_address ? values.shipment_pincode : null,
                shipment_city: values.is_different_address ? values.shipment_city : null,
                shipment_district: values.is_different_address ? values.shipment_district : null,
                shipment_state: values.is_different_address ? values.shipment_state : null,
                shipment_country: values.is_different_address ? values.shipment_country : null,
                is_different_contact: values.is_different_contact ? 1 : 0,
                shipment_contact_person: values.is_different_contact ? values.shipment_contact_person : null,
                contact_mobile_no: values.is_different_contact ? values.contact_mobile_no : null
            }).then(() => {
                frm.refresh();
                dlg.hide();
                frappe.show_alert({
                    message: __('🚚 Delivery Request Created'),
                    indicator: 'green'
                });
            });
        }
    });

    // Show/hide address fields based on checkbox
    dlg.fields_dict.is_different_address.$input.on('change', function () {
        const isDifferent = $(this).is(':checked');
        const $addressDisplay = dlg.fields_dict.current_address_display.$wrapper;
        $addressDisplay.toggle(!isDifferent);
    });

    // Show/hide contact fields based on checkbox
    dlg.fields_dict.is_different_contact.$input.on('change', function () {
        const isDifferent = $(this).is(':checked');
        const $contactDisplay = dlg.fields_dict.current_contact_display.$wrapper;
        $contactDisplay.toggle(!isDifferent);
    });

    dlg.show();
}
///////////////////////////////////////////////////////////////

//Site To LMS Request Upate

frappe.ui.form.on('Site', {
    refresh: function (frm) {
        const isPending = frm.doc.lms_stage === "Pending";
        const isValidType = frm.doc.lms_type === "Single" || frm.doc.lms_type === "Dual";

        if (frm.doc.docstatus === 0 && isPending && isValidType) {
            frm.add_custom_button(__('Create LMS Request'), function () {
                let lms_type_value = frm.doc.lms_type || 'Single';

                const d = new frappe.ui.Dialog({
                    title: 'LMS Request Details',
                    fields: [
                        {
                            label: 'Solution Name',
                            fieldname: 'solution_name',
                            fieldtype: 'Data',
                            default: frm.doc.solution_name,
                            read_only: 1
                        },
                        {
                            label: 'LMS Type',
                            fieldname: 'lms_type',
                            fieldtype: 'Select',
                            options: ['Single', 'Dual'],
                            default: lms_type_value,
                            reqd: 1
                        }
                    ],
                    primary_action_label: 'Create Request',
                    primary_action(values) {
                        if (frm.doc.lms_type !== values.lms_type) {
                            frm.set_value('lms_type', values.lms_type);
                        }

                        d.hide();

                        frappe.confirm(
                            `Are you sure you want to create LMS Request for this Site (${frm.doc.name})?`,
                            function () {
                                // Function to call API after save/skip
                                let after_save = () => {
                                    frappe.call({
                                        method: 'nexapp.api.create_lms_request',
                                        args: {
                                            site_name: frm.doc.name
                                        },
                                        callback: function (r) {
                                            if (r.message) {
                                                frappe.msgprint(__('LMS Request {0} created successfully', [r.message]));
                                                frm.reload_doc();
                                            }
                                        },
                                        error: function (r) {
                                            frappe.msgprint(__('Error: ' + r.message));
                                        }
                                    });
                                };

                                // Save only if there are unsaved changes
                                if (frm.is_dirty()) {
                                    frm.save().then(() => after_save());
                                } else {
                                    after_save();
                                }
                            }
                        );
                    }
                });

                d.show();
            }).addClass('btn-primary');
        }
    }
});



/////////////////////////////////////////////////////////////////////////
// Installation Note Creation
frappe.ui.form.on('Site', {
    refresh: function (frm) {
        // Hide button if Installation Note already exists
        frm.toggle_display('create_installation', !frm.doc.installation_note);

        // Style the button
        setTimeout(() => {
            const btn = frm.fields_dict.create_installation.$wrapper.find('button');
            btn.css({
                'background-color': '#7768A5',
                'color': '#ffffff',
                'font-weight': 'bold',
                'border-radius': '7px',
                'border': 'none',
                'padding': '6px 12px'
            });
            btn.each(function () {
                this.style.setProperty('background-color', '#7768A5', 'important');
            });
            frm.fields_dict.create_installation.$wrapper.css({
                'text-align': 'left'
            });
            frm.fields_dict.create_installation.$wrapper.find('.control-input-wrapper, .control-input').css({
                'text-align': 'left',
                'display': 'block'
            });
        }, 500);
    },

    create_installation: function (frm) {
        frappe.confirm(
            __('Are you sure you want to create the Installation Note?'),
            function () {
                // YES: User confirmed
                frappe.call({
                    method: "nexapp.api.create_installation_note",
                    args: {
                        site_name: frm.doc.name
                    },
                    callback: function (r) {
                        if (!r.exc) {
                            frappe.msgprint(__('Installation Note {0} created successfully', [r.message]));
                            frm.reload_doc();
                        }
                    }
                });
            },
            function () {
                // NO: User cancelled
                frappe.msgprint(__('Action cancelled by user.'));
            }
        );
    }
});



///////////////////////////////////////////////////////////////////////
// assignment
frappe.ui.form.on('Site', {
    refresh: function (frm) {
        check_assignment_and_update_manager(frm);
    },
    after_save: function (frm) {
        check_assignment_and_update_manager(frm);
    },
    estimated_time_of_arrival: function (frm) {
        if (frm._original_eta === undefined) {
            frm._original_eta = frm.doc.estimated_time_of_arrival;
        }

        const old_date = frm._original_eta;
        const new_date = frm.doc.estimated_time_of_arrival;

        if (!frm.doc.__islocal && old_date && new_date && old_date !== new_date) {
            let d = new frappe.ui.Dialog({
                title: __('Reason for changing ETA'),
                fields: [
                    {
                        label: 'Reason for rescheduling',
                        fieldname: 'reason',
                        fieldtype: 'Small Text',
                        reqd: 1
                    }
                ],
                primary_action_label: __('Update'),
                primary_action(values) {
                    const format_date_only = (d_str) => {
                        if (!d_str) return '';
                        const pts = d_str.split('-');
                        return pts.length === 3 ? `${pts[2]}-${pts[1]}-${pts[0]}` : d_str;
                    };
                    const old_date_formatted = format_date_only(old_date);
                    const new_date_formatted = format_date_only(new_date);

                    frappe.call({
                        method: "frappe.desk.form.utils.add_comment",
                        args: {
                            reference_doctype: frm.doctype,
                            reference_name: frm.docname,
                            content: `<b>ETA Rescheduled:</b><br>Changed from <b>${old_date_formatted}</b> to <b>${new_date_formatted}</b>.<br><b>Reason:</b> ${values.reason}`,
                            comment_email: frappe.session.user,
                            comment_by: frappe.session.user_fullname
                        },
                        callback: function () {
                            frm._original_eta = new_date;
                            d.hide();
                            frm.save();
                        }
                    });
                },
                secondary_action_label: __('Cancel'),
                secondary_action() {
                    frm.set_value('estimated_time_of_arrival', old_date);
                    d.hide();
                }
            });

            d.onhide = function () {
                if (frm.doc.estimated_time_of_arrival !== frm._original_eta) {
                    frm.set_value('estimated_time_of_arrival', frm._original_eta);
                }
            };

            d.show();
        } else if (!old_date && new_date) {
            frm._original_eta = new_date;
        }

        if (frm.doc.estimated_time_of_arrival && frm.doc.delivery_requested_date) {
            if (frappe.datetime.str_to_obj(frm.doc.estimated_time_of_arrival) > frappe.datetime.str_to_obj(frm.doc.delivery_requested_date)) {
                frappe.msgprint({
                    title: __('ETA Warning'),
                    indicator: 'orange',
                    message: __('Estimated Time of Arrival (ETA) is past the requested Delivery Date!')
                });
            }
        }
    }
});

function check_assignment_and_update_manager(frm) {
    const docinfo = frm.get_docinfo();
    if (docinfo && docinfo.assignments && docinfo.assignments.length > 0) {
        // Requirement: project_manager should be updated if it is currently blank
        if (!frm.doc.project_manager) {
            const assigned_email = docinfo.assignments[0].owner;
            // Fetch the full name of the user
            frappe.db.get_value('User', assigned_email, 'full_name', (r) => {
                if (r && r.full_name) {
                    frm.set_value('project_manager', r.full_name);
                } else {
                    // Fallback to email if name not found
                    frm.set_value('project_manager', assigned_email);
                }
            });
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////

frappe.ui.form.on('Site', {
    refresh(frm) {
        if (!frm.doc.site_created_date && frm.doc.creation) {
            const mysqlCompatibleDatetime = frappe.datetime.get_datetime_as_string(frm.doc.creation);
            frm.set_value('site_created_date', mysqlCompatibleDatetime);
        }
    }
});
///////////////////////////////////////////////////////////////
frappe.ui.form.on('Site', {
    refresh(frm) {
        if (!frm.doc.site_created_date) return;

        // Convert site_created_date to Date object
        const siteCreatedDate = frappe.datetime.str_to_obj(frm.doc.site_created_date);

        let endDate;

        if (frm.doc.date) {
            // If 'date' is present, use it
            endDate = frappe.datetime.str_to_obj(frm.doc.date);
        } else {
            // Otherwise use today's date
            endDate = new Date();
        }

        // Calculate difference in milliseconds
        const diffTime = endDate - siteCreatedDate;

        // Convert to full days
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Subtract hold days
        let hold_days = frm.doc.hold_days || 0;
        if (frm.doc.site_status === 'On Hold' && frm.doc.on_hold_since) {
            const holdSince = frappe.datetime.str_to_obj(frm.doc.on_hold_since);
            const currentHoldTime = new Date() - holdSince;
            const currentHoldDays = Math.max(0, Math.floor(currentHoldTime / (1000 * 60 * 60 * 24)));
            hold_days += currentHoldDays;
        }

        const activeDays = Math.max(0, diffDays - hold_days);

        // Set the total_days field only if changed to avoid unnecessary dirty state
        if (frm.doc.total_days != activeDays) {
            frm.set_value('total_days', activeDays);
        }
    }
});
/////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Site', {
    refresh(frm) {
        if (frm.doc.total_days != null) {
            const color = frm.doc.total_days > 30 ? '#F40000' : '#28a745'; // Custom red if > 30

            const html = `
                <div style="margin-left: 60%;">
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        width: 1.5cm;
                        height: 1.5cm;
                        border-radius: 50%;
                        background-color: ${color};
                        color: white;
                        font-weight: bold;
                        font-size: 9px;
                        text-align: center;
                        box-shadow: 0 0 6px rgba(0,0,0,0.2);
                    ">
                        <div style="font-size: 9px; font-weight: bold;">Running Days</div>
                        <div style="font-size: 12px; font-weight: bold;">${frm.doc.total_days}</div>
                    </div>
                </div>
            `;

            frm.set_df_property('running_days', 'options', html);
            frm.refresh_field('running_days');
        }
    }
});
////////////////////////////////////////////////////////////////////////////////
//Site Information
frappe.ui.form.on('Site', {
    refresh: function (frm) {
        // Inject info icon into the HTML field "info2"
        frm.fields_dict.info2.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_feasibility_info_icon" title="Feasibility Info" style="cursor: pointer; font-size: 29px; color: #FF0000;">
                    <i class="fa fa-info-circle"></i>
                </a>
            </div>
        `);

        // Bind click event
        frm.fields_dict.info2.$wrapper.find('#show_feasibility_info_icon').on('click', function () {
            show_feasibility_info_dialog();
        });
    }
});

// Function to show feasibility info dialog
function show_feasibility_info_dialog() {
    const feasibility_html = `
        <div style="padding: 10px; line-height: 1.6; max-height: 500px; overflow-y: auto;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">📌 Project Management Starts with Feasibility</h4>
            <p>This initiative begins with a comprehensive <b>feasibility assessment</b>, which determines the suitability of a site for further development. All project activities, including hardware deployment and Learning Management System (LMS) setup, originate from this crucial stage.</p>
            
            <p>Once a site is validated and generated based on feasibility findings, the project proceeds with full coordination of tasks, ensuring each phase—from planning to installation—is aligned with technical and operational goals.</p>

            <h5 style="margin-top: 20px;">🔧 Scope of Work</h5>
            <ul style="margin-left: 20px;">
                <li>Procurement, delivery, and installation of hardware specific to site requirements</li>
                <li>Configuration and deployment of LMS for seamless integration with installed systems</li>
                <li>Site readiness verification, quality assurance checks, and technical validations</li>
                <li>Software installation, network configuration, and system testing</li>
            </ul>

            <h5 style="margin-top: 20px;">📋 Project Execution Highlights</h5>
            <ul style="margin-left: 20px;">
                <li>Complete ownership from feasibility to final installation</li>
                <li>Cross-functional coordination with vendors and stakeholders</li>
                <li>Proactive risk management and mitigation strategies</li>
                <li>Use of project management tools (Gantt charts, trackers, risk registers)</li>
            </ul>

            <p style="margin-top: 20px;"><b>Communication and documentation are key to maintaining progress and quality across all stages.</b> Regular status meetings, site visits, and performance reviews ensure transparency and alignment with objectives.</p>

            <p><b>In summary:</b> This is a full-cycle project, beginning with feasibility and ending with successful system installation. Accurate feasibility data forms the foundation for everything that follows—let’s ensure we get it right from the start.</p>
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
//////////////////////////////////////////////////////////////////////

frappe.listview_settings['Site'] = {
    onload(listview) {

        listview.page.wrapper.on('click', '.actions-btn-group', function () {

            setTimeout(() => {
                $(frm.wrapper).find('.actions-btn-group .dropdown-menu a').each(function () {
                    let label = $(this).text().trim().toLowerCase();

                    if (label.includes('export')) {
                        $(this).remove();
                    }
                });
            }, 100);
        });
    }
};

// --- Odoo UI Injected from Feasibility ---
function render_site_status_bar(frm) {
    if (window.nexapp && window.nexapp.ui && window.nexapp.ui.render_odoo_ui) {
        window.nexapp.ui.render_odoo_ui(frm);
    }

    if (!frm._saved_site_status || !frm.is_dirty()) {
        frm._saved_site_status = frm.doc.site_status || 'Pending';
    }

    const NON_PROGRESSIVE = ["On Hold", "Cancelled", "Rejected", "Disconnection In Process", "Disconnected", "Site Shifted to new location", "Site Upgraded to new Circuit", "Site degraded to new Circuit"];

    if (NON_PROGRESSIVE.includes(frm.doc.site_status)) {
        if (!frm._last_valid_status) {
            if (frm._saved_site_status && !NON_PROGRESSIVE.includes(frm._saved_site_status)) {
                frm._last_valid_status = frm._saved_site_status;
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
                            render_site_status_bar(frm);
                        }
                    }
                });
            }
        }
    } else {
        frm._last_valid_status = frm.doc.site_status;
        frm._saved_site_status = frm.doc.site_status;
    }

    // Hide old standalone HTML field wrappers to keep form clean
    if (frm.fields_dict.info) frm.fields_dict.info.$wrapper.hide();
    if (frm.fields_dict.info2) frm.fields_dict.info2.$wrapper.hide();
    if (frm.fields_dict.supplier_pool) frm.fields_dict.supplier_pool.$wrapper.hide();

    // 1.5. Dynamic Colorful Styling for Feasibility Status
    let statusField = frm.get_field('site_status');
    if (statusField && statusField.$wrapper) {
        let statusVal = frm.doc.site_status || 'Pending';
        let colors = {
            'Pending': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' }, // Amber
            'In-process': { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }, // Blue
            'Installation Initiated': { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' }, // Violet
            'Provisioning': { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' }, // Cyan
            'Partially Provisioning Completed': { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' }, // Teal
            'Provisioning Completed': { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, // Emerald
            'Awaiting Customer Approval': { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' }, // Pink
            'Delivered and Live': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }, // Green
            'On Hold': { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }, // Orange
            'Disconnection In Process': { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }, // Rose
            'Disconnected': { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' }, // Slate
            'Cancelled': { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' }, // Red
            'Rejected': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }, // Red
            'Site Shifted to new location': { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }, // Indigo
            'Site Upgraded to new Circuit': { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' }, // Sky
            'Site degraded to new Circuit': { bg: '#fdf4ff', text: '#a21caf', border: '#f5d0fe' } // Fuchsia
        };
        let c = colors[statusVal] || colors['Pending'];

        // Target both active inputs (select/input/textarea) and read-only views
        let fieldsToStyle = [statusField];
        let reasonOH = frm.get_field('on_hold_reason');
        let reasonCancel = frm.get_field('cancel_reason');
        if (reasonOH && statusVal === 'On Hold') fieldsToStyle.push(reasonOH);
        if (reasonCancel && statusVal === 'Cancelled') fieldsToStyle.push(reasonCancel);

        let targetElements = [];
        fieldsToStyle.forEach(f => {
            if (f && f.$wrapper) {
                targetElements = targetElements.concat(f.$wrapper.find('select, input, textarea, .control-value, .disp-area').toArray());
            }
        });

        targetElements.forEach(el => {
            el.style.setProperty('background-color', c.bg, 'important');
            el.style.setProperty('color', c.text, 'important');
            el.style.setProperty('border', '1px solid ' + c.border, 'important');
            el.style.setProperty('border-left', '4px solid ' + c.text, 'important');
            el.style.setProperty('font-weight', '800', 'important');
            el.style.setProperty('font-size', '14px', 'important');
            el.style.setProperty('border-radius', '6px', 'important');
            el.style.setProperty('box-shadow', '0 1px 2px rgba(0,0,0,0.05)', 'important');
            el.style.setProperty('padding-left', '10px', 'important'); // Keep left padding for border text spacing
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

    // --- Status Bar (Left Side) ---
    let defaultSteps = [
        'Pending',
        'In-process',
        'Installation Initiated',
        'Provisioning',
        'Partially Provisioning Completed',
        'Provisioning Completed',
        'Awaiting Customer Approval',
        'Delivered and Live'
    ];
    let currentStatus = frm.doc.site_status || 'Pending';
    let visibleSteps = [...defaultSteps];
    if (!defaultSteps.includes(currentStatus)) {
        visibleSteps.push(currentStatus);
    }
    let currentIndex = visibleSteps.indexOf(currentStatus);
    if (currentIndex === -1) currentIndex = 0;

    const activeColorMap = {
        'Pending': '#f59e0b', // Amber
        'In-process': '#3b82f6', // Blue
        'Installation Initiated': '#8b5cf6', // Violet
        'Provisioning': '#06b6d4', // Cyan
        'Partially Provisioning Completed': '#0d9488', // Teal
        'Provisioning Completed': '#10b981', // Emerald
        'Awaiting Customer Approval': '#ec4899', // Pink
        'Delivered and Live': '#22c55e', // Green
        'On Hold': '#ea580c', // Orange
        'Disconnection In Process': '#f43f5e', // Rose
        'Disconnected': '#475569', // Slate
        'Cancelled': '#b91c1c', // Red
        'Rejected': '#dc2626', // Red
        'Site Shifted to new location': '#6366f1', // Indigo
        'Site Upgraded to new Circuit': '#0ea5e9', // Sky
        'Site degraded to new Circuit': '#d946ef' // Fuchsia
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

        const POST_LIVE_STATUSES = ["Disconnection In Process", "Disconnected", "Site Shifted to new location", "Site Upgraded to new Circuit", "Site degraded to new Circuit"];
        if (POST_LIVE_STATUSES.includes(currentStatus)) {
            lvs = 'Delivered and Live';
        } else {
            if (lvs === 'Delivered and Live' && !frm.doc.site_completed_date) lvs = 'Awaiting Customer Approval';
            if (lvs === 'Awaiting Customer Approval' && !frm.doc.client_installation_approval_date) lvs = 'Provisioning Completed';
            if (lvs === 'Provisioning Completed' && !frm.doc.provisioning_date) lvs = 'Partially Provisioning Completed';
            if (lvs === 'Partially Provisioning Completed' && !frm.doc.partially_completed_date) lvs = 'Provisioning';
        }

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

            const POST_LIVE_STATUSES = ["Disconnection In Process", "Disconnected", "Site Shifted to new location", "Site Upgraded to new Circuit", "Site degraded to new Circuit"];
            if (POST_LIVE_STATUSES.includes(currentStatus)) {
                lvs = 'Delivered and Live';
            } else {
                // Robust downgrade check: Prevent false positives from poisoned version history
                if (lvs === 'Delivered and Live' && !frm.doc.site_completed_date) lvs = 'Awaiting Customer Approval';
                if (lvs === 'Awaiting Customer Approval' && !frm.doc.client_installation_approval_date) lvs = 'Provisioning Completed';
                if (lvs === 'Provisioning Completed' && !frm.doc.provisioning_date) lvs = 'Partially Provisioning Completed';
                if (lvs === 'Partially Provisioning Completed' && !frm.doc.partially_completed_date) lvs = 'Provisioning';
            }

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
            let finalIcon = '<i class="fa fa-check" style="font-size: 11px; color: #ffffff;"></i>';
            if (['Rejected', 'Cancelled'].includes(s)) {
                finalIcon = '<i class="fa fa-times" style="font-size: 12px; color: #ffffff;"></i>';
            } else if (['On Hold', 'Disconnection In Process'].includes(s)) {
                finalIcon = '<i class="fa fa-pause" style="font-size: 10px; color: #ffffff;"></i>';
            }
            iconContent = finalIcon;
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

    // Wait until DOM is ready to attach event listeners
    setTimeout(() => {
        // Click handler disabled to make status stepper display-only
        $(frm.wrapper).find('.odoo-clickable-status').off('click').on('click', function (e) {
            e.preventDefault();
        });

        // Manual dropdown toggle for dynamically injected HTML
        $(frm.wrapper).find('.status-step-dropdown').off('click').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            let $menu = $(this).siblings('.dropdown-menu');
            $(frm.wrapper).find('.dropdown-menu').not($menu).removeClass('show');
            $menu.toggleClass('show');
        });

        // Close dropdown when clicking outside
        $(document).off('click.odoodropdown').on('click.odoodropdown', function (e) {
            if (!$(e.target).closest('.dropdown').length) {
                $(frm.wrapper).find('.dropdown-menu').removeClass('show');
            }
        });
    }, 100);

    // TAT Calculation (Dynamic target period from Rules or Solution type)
    let period_days = 0;
    if (frm.tat_period_days !== undefined) {
        period_days = frm.tat_period_days;
    } else if (frm.doc.due_date && frm.doc.site_created_date) {
        let created = moment(frm.doc.site_created_date, ["YYYY-MM-DD", "DD-MM-YYYY"]);
        let due = moment(frm.doc.due_date, ["YYYY-MM-DD", "DD-MM-YYYY"]);
        let diff = due.diff(created, 'days');
        let hold = frm.doc.hold_days || 0;
        period_days = Math.max(0, diff - hold);
    }

    let target_hours = period_days * 24.0;
    let created = frm.doc.creation || new Date();
    let end = frm.doc.date || moment();
    let rawHours = moment(end).diff(moment(created), 'hours', true);
    let hold_hours = (frm.doc.hold_days || 0) * 24.0;

    if (frm.doc.site_status === 'On Hold' && frm.doc.on_hold_since) {
        let running_hold = moment().diff(moment(frm.doc.on_hold_since), 'hours', true);
        hold_hours += running_hold;
    }

    let diffHours = Math.max(0, rawHours - hold_hours);
    let percent = (diffHours / target_hours) * 100;
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
    } else if (percent >= 75) {
        ringGradStart = '#f8b500';
        ringGradEnd = '#fceabb';
    } else if (frm.doc.site_status === 'On Hold') {
        ringGradStart = '#ff9f00';
        ringGradEnd = '#ea580c';
    } else if (frm.doc.site_status === 'Cancelled') {
        ringGradStart = '#f87171';
        ringGradEnd = '#b91c1c';
    } else if (['Delivered and Live', 'Provisioning Completed'].includes(frm.doc.site_status)) {
        ringGradStart = '#11998e';
        ringGradEnd = '#38ef7d';
    } else {
        ringGradStart = '#00c6ff';
        ringGradEnd = '#0072ff';
    }

    let ringGradId = `tat_ring_grad_${Math.random().toString(36).substr(2, 6)}`;
    let shadowId = `tat_shadow_${Math.random().toString(36).substr(2, 6)}`;

    let tatLabel = 'TAT';
    if (frm.doc.site_status === 'On Hold') {
        tatLabel = 'TAT On Hold';
    } else if (frm.doc.site_status === 'Delivered and Live') {
        tatLabel = 'TAT Fulfilled';
    } else if (frm.doc.site_status === 'Cancelled') {
        tatLabel = 'TAT Canceled';
    }

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
            ">${tatLabel}</div>
        </div>
    `;



    smartButtonHtml += `</div></div>`;

    // Prepend to form layout
    $formLayout.prepend(smartButtonHtml);

    // Ensure Sidebar is closed by default to save space for the main form
    setTimeout(() => {
        let $sidebar = $(frm.wrapper).find('.layout-side-section');
        if ($sidebar.is(':visible') && $sidebar.width() > 0) {
            let toggleBtn = $(frm.wrapper).find('.page-actions .sidebar-toggle-btn, .sidebar-toggle-placeholder');
            if (toggleBtn.length) {
                toggleBtn.click();
            } else {
                $sidebar.hide();
                $(frm.wrapper).find('.layout-main-section-wrapper').removeClass('col-md-10').addClass('col-md-12');
            }
        }
    }, 100);

    // Setup SPA cleanup to remove injected styles when navigating away from the Feasibility form
    if (!window._site_ui_cleanup_bound) {
        frappe.router.on('change', function () {
            let route = frappe.get_route();
            if (!(route && route[0] === 'Form' && route[1] === 'Site')) {
                $('#odoo_ui_styles').remove();
                $('#odoo_chevron_styles').remove();
            }
        });
        window._site_ui_cleanup_bound = true;
    }

    // Dynamically inject Guidelines Button to Feasibility Information section
    inject_guidelines_button(frm);

    // 3. Attach Click Handlers
    // Click handler disabled to make status stepper display-only
    $(frm.wrapper).find('.status-step').off('click');

    $('#smart_btn_supplier_pool').on('click', function (e) {
        e.stopPropagation();
        // show_isp_supplier_pool_dialog(frm);
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
                    <button class="odoo-smart-btn" id="smart_btn_supplier_pool" title="View Supplier Pool" style="position: absolute; right: 40px; top: 50%; transform: translateY(-50%); z-index: 10;">
                        <i class="fa fa-users" style="color: ${poolColor}; font-size: 21px; margin-right: 9px;"></i>
                        <div style="text-align: left; line-height: 1.2;">
                            <span style="font-size: 11.5px; color: #64748b; text-transform: uppercase; display: block;">Supplier Pool</span>
                            <span style="font-weight: 700; color: #0f172a;">${poolText}</span>
                        </div>
                    </button>
                `;

            $head.css({ 'position': 'relative', 'display': 'flex', 'align-items': 'center' });
            $head.append(supplierBtnHtml);

            $('#smart_btn_supplier_pool').off('click').on('click', function (e) {
                e.stopPropagation();
                // show_isp_supplier_pool_dialog(frm);
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
    
    // Apply the new Job Applicant field styling
    if (typeof apply_job_applicant_styles === "function") {
        apply_job_applicant_styles(frm);
    }
}

function inject_guidelines_button(frm) {
    if ($('#smart_btn_guidelines').length === 0) {
        let siteSection = frm.get_field('feasibility_section');
        if (siteSection && siteSection.wrapper) {
            let $wrapper = $(siteSection.wrapper);
            let $head = $wrapper.find('.form-section-heading, .section-head').first();
            if ($head.length === 0) {
                $head = $wrapper.find('h4, div').filter(function () {
                    return $(this).text().indexOf('Branch Informa') !== -1;
                }).first();
            }
            if ($head.length === 0) $head = $wrapper;

            $head.css({ 'position': 'relative', 'display': 'flex', 'align-items': 'center' });
            let guidelinesBtnHtml = `
                    <button class="odoo-smart-btn" id="smart_btn_guidelines" title="Site Guidelines" style="position: absolute; right: 24px; top: 50%; transform: translateY(-50%); z-index: 10;">
                        <i class="fa fa-book" style="color: #7768A5; font-size: 21px; margin-right: 9px;"></i>
                        <div style="text-align: left; line-height: 1.2;">
                            <span style="font-size: 11.5px; color: #64748b; text-transform: uppercase; display: block;">Guidelines</span>
                            <span style="font-weight: 700; color: #0f172a;">Site</span>
                        </div>
                    </button>
                `;
            $head.append(guidelinesBtnHtml);

            $('#smart_btn_guidelines').off('click').on('click', function (e) {
                e.stopPropagation();
                if (typeof show_site_guidelines === 'function') {
                    show_site_guidelines();
                }
            });
        }
    }
}

function show_site_guidelines() {
    let htmlContent = `
        <div id="custom_site_guidelines_modal" style="
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
                        <h3 style="font-weight: 800; margin: 0; color: #0f172a; font-size: 17px; font-family: 'Outfit', 'Inter', sans-serif;">Site Implementation Guidelines</h3>
                        <span style="font-size: 12px; color: #64748b; font-weight: 500; display: block; margin-top: 2px;">Official operational standards for Site management</span>
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
                    <!-- Card 1: Site Initiation -->
                    <div style="background: #f8fafc; border-left: 4px solid #7768A5; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-info-circle" style="color: #7768A5; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">1. Site Initiation & Verification</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Verify that the <strong>Circuit ID</strong> and Customer details match the approved feasibility study exactly.</li>
                            <li>Verify and enter the correct physical <strong>Site Address</strong> and <strong>Pincode</strong> before proceeding.</li>
                        </ul>
                    </div>

                    <!-- Card 2: Contact Info -->
                    <div style="background: #f8fafc; border-left: 4px solid #eab308; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-phone" style="color: #eab308; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">2. Contact & Branch Information</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Ensure accurate <strong>Local Branch Contacts</strong> are captured in the system.</li>
                            <li>Successful project communication depends entirely on valid phone numbers and email addresses.</li>
                        </ul>
                    </div>

                    <!-- Card 3: LMS & Rescheduling -->
                    <div style="background: #f8fafc; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-calendar-times-o" style="color: #ef4444; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">3. LMS & ETA Rescheduling</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Keep track of circuit delivery timelines in collaboration with the <strong>LMS Vendor</strong>.</li>
                            <li><strong>ETA Rescheduling:</strong> Every time the Estimated Time of Arrival changes, entering a detailed reason is mandatory. Rescheduling changes are logged in <strong>DD-MM-YYYY</strong> format.</li>
                        </ul>
                    </div>

                    <!-- Card 4: Provisioning & Installation -->
                    <div style="background: #f8fafc; border-left: 4px solid #10b981; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-cogs" style="color: #10b981; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">4. Provisioning & Handover</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Populate <strong>IP Details, Gateway, Subnet, and Port</strong> before seeking Customer Approval.</li>
                            <li>Upon completing the setup, click <strong>Create Installation Note</strong> (in the Installation tab) to generate the handover document and close the project.</li>
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
                    " onmouseover="this.style.opacity='0.9';" onmouseout="this.style.opacity='1';">Close Guidelines</button>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal to prevent duplicates
    $('#custom_site_guidelines_modal').remove();
    $('body').append(htmlContent);

    let $modal = $('#custom_site_guidelines_modal');

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

    $('#close_guidelines_modal, #close_guidelines_modal_btn').on('click', closeModal);
    $modal.on('click', function (e) {
        if (e.target.id === 'custom_site_guidelines_modal') closeModal();
    });
}

function setup_tab_overflow(frm) {
    let adjustTabs = function () {
        let $tabsContainer = $(frm.wrapper).find('ul#form-tabs');
        if (!$tabsContainer.length) $tabsContainer = $(frm.wrapper).find('.form-tabs').first();
        if (!$tabsContainer.length) $tabsContainer = $(frm.wrapper).find('.form-tabs').first();
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

    window._site_cur_adjust_tabs = adjustTabs;

    adjustTabs();
    setTimeout(adjustTabs, 100);
    setTimeout(adjustTabs, 300);
    setTimeout(adjustTabs, 600);
    setTimeout(adjustTabs, 1000);

    if (!window._site_tab_resize_bound) {
        $(window).on('resize', function () {
            clearTimeout(window._site_tab_resize_timer);
            window._site_tab_resize_timer = setTimeout(() => {
                if (typeof window._site_cur_adjust_tabs === 'function') {
                    window._site_cur_adjust_tabs();
                }
            }, 200);
        });
        window._site_tab_resize_bound = true;
    }

    if (window.ResizeObserver && frm.wrapper && !frm._site_resize_observer_bound) {
        let $el = $(frm.wrapper);
        if ($el.length) {
            let resizeObserver = new ResizeObserver(() => {
                if (typeof window._site_cur_adjust_tabs === 'function') {
                    window._site_cur_adjust_tabs();
                }
            });
            resizeObserver.observe($el[0]);
            frm._site_resize_observer_bound = resizeObserver;
        }
    }

    if (!window._site_sidebar_tabs_bound) {
        $(document).on('click.site_sidebar_tabs', '.sidebar-toggle-btn, .layout-side-section-toggle, [data-toggle="sidebar"]', function () {
            setTimeout(() => {
                if (typeof window._site_cur_adjust_tabs === 'function') {
                    window._site_cur_adjust_tabs();
                }
            }, 50);
            setTimeout(() => {
                if (typeof window._site_cur_adjust_tabs === 'function') {
                    window._site_cur_adjust_tabs();
                }
            }, 150);
            setTimeout(() => {
                if (typeof window._site_cur_adjust_tabs === 'function') {
                    window._site_cur_adjust_tabs();
                }
            }, 300);
            setTimeout(() => {
                if (typeof window._site_cur_adjust_tabs === 'function') {
                    window._site_cur_adjust_tabs();
                }
            }, 600);
        });
        window._site_sidebar_tabs_bound = true;
    }
}

function show_tat_analysis_dialog(frm) {
    let created = moment(frm.doc.site_created_date || frm.doc.creation);
    let due = moment(frm.doc.due_date);

    let targetPeriod = frm.tat_period_days;
    if (targetPeriod === undefined || targetPeriod === 0) {
        if (frm.doc.due_date && frm.doc.site_created_date) {
            let diff = due.diff(created, 'days');
            let hold = frm.doc.hold_days || 0;
            targetPeriod = Math.max(0, diff - hold);
        } else {
            targetPeriod = 30; // Standard fallback
        }
    }

    let completed_dt_to_show = (frm.doc.site_status === 'Delivered and Live' && frm.doc.date) ? frm.doc.date : frm.doc.site_completed_date;
    let completedDateFormatted = completed_dt_to_show ? moment(completed_dt_to_show).format('DD-MM-YYYY') : null;
    let createdDateFormatted = created.isValid() ? created.format('DD-MM-YYYY') : 'N/A';
    let dueDateFormatted = due.isValid() ? due.format('DD-MM-YYYY') : 'N/A';

    let baseCreated = frm.doc.creation || new Date();
    let baseEnd = frm.doc.site_completed_date || moment();
    
    // Fetch Version History to accurately calculate hold days and timeline
    frappe.call({
        method: 'nexapp.api.get_site_version_history',
        args: {
            docname: frm.doc.name
        },
        callback: function (r) {
            let status_history = [];
            if (frm.doc.creation) {
                status_history.push({ status: 'Pending', date: frm.doc.creation });
            }
            let last_event_date = frm.doc.creation;
            if (r.message) {
                r.message.forEach(v => {
                    try {
                        let data = JSON.parse(v.data);
                        if (data.changed) {
                            let status_changed = false;
                            data.changed.forEach(row => {
                                if (['site_status', 'stage', 'lms_stage'].includes(row[0])) {
                                    let skip_row1 = row[1] === 'No LMS' || (frm.doc.lms_type === 'No LMS' && row[1] === 'LMS Delivered');
                                    let skip_row2 = row[2] === 'No LMS' || (frm.doc.lms_type === 'No LMS' && row[2] === 'LMS Delivered');

                                    if (row[1] && !skip_row1 && !status_history.find(x => x.status === row[1])) {
                                        status_history.push({ status: row[1], date: last_event_date });
                                    }
                                    if (row[2] && !skip_row2) {
                                        status_history.push({ status: row[2], date: v.creation });
                                    }
                                    status_changed = true;
                                }
                            });
                            if (status_changed) {
                                last_event_date = v.creation;
                            }
                        }
                    } catch (e) { }
                });
            }

            let unique_history = {};
            status_history.forEach(item => {
                // If this is Delivered and Live and we have a Circuit Delivery Date, force the date!
                if (item.status === 'Delivered and Live' && frm.doc.date) {
                    item.date = frm.doc.date + (frm.doc.date.includes(':') ? '' : ' 00:00:00');
                }
                if (!unique_history[item.status]) {
                    unique_history[item.status] = item.date;
                } else {
                    // Update to the latest occurrence
                    unique_history[item.status] = item.date;
                }
            });

            let sorted_history = Object.keys(unique_history).map(status => {
                return { status: status, date: unique_history[status] };
            });

            sorted_history.sort((a, b) => {
                return moment(a.date).valueOf() - moment(b.date).valueOf();
            });

            // Re-calculate hold hours accurately with fetched history
            let hold_hours_calc = (frm.doc.hold_days || 0) * 24.0;
            if (frm.doc.site_status === 'On Hold') {
                if (frm.doc.on_hold_since) {
                    hold_hours_calc += moment().diff(moment(frm.doc.on_hold_since), 'hours', true);
                } else {
                    let hold_entry = sorted_history.slice().reverse().find(h => h.status === 'On Hold');
                    if (hold_entry && hold_entry.date) {
                        hold_hours_calc += moment().diff(moment(hold_entry.date), 'hours', true);
                    }
                }
            }
            let hold_days_total = hold_hours_calc / 24.0;

            let base_start_moment = moment(frm.doc.site_created_date || frm.doc.creation);
            if (base_start_moment.hour() >= 13) {
                base_start_moment.add(1, 'days');
            }
            let start_date_str = base_start_moment.format('YYYY-MM-DD HH:mm:ss');
            let current_end_date_str;
            if (frm.doc.site_status === 'Delivered and Live' && frm.doc.date) {
                current_end_date_str = frm.doc.date + (frm.doc.date.includes(':') ? '' : ' 00:00:00');
            } else {
                current_end_date_str = frm.doc.site_completed_date || moment().format('YYYY-MM-DD HH:mm:ss');
            }
            
            let dates_array = sorted_history.map(item => item.date);
            dates_array.push(current_end_date_str);

            frappe.call({
                method: 'nexapp.api.get_working_days_for_dates',
                args: {
                    start_date: start_date_str,
                    dates: JSON.stringify(dates_array)
                },
                callback: function (res) {
                    let working_days_map = res.message || {};
                    
                    let total_working_days = working_days_map[current_end_date_str] || 1;
                    let calculated_taken = Math.max(0, total_working_days - hold_days_total);
                    let days_taken = frm.doc.site_tat !== undefined && frm.doc.site_tat !== 0 ? frm.doc.site_tat : Math.round(calculated_taken);

                    let percentUsed = targetPeriod > 0 ? Math.round((days_taken / targetPeriod) * 100) : 0;

                    let tat_status = frm.doc.tat_status || 'Resolution Due';
                    if (!frm.doc.tat_status) {
                        if (['Feasible', 'High Commercials', 'Not Feasible', 'Provisioning Completed', 'Delivered and Live'].includes(frm.doc.site_status)) {
                            if (days_taken <= targetPeriod) {
                                tat_status = 'Fulfilled';
                            } else {
                                tat_status = 'Failed';
                            }
                        } else if (frm.doc.site_status === 'On Hold') {
                            tat_status = 'Paused';
                        }
                    }

                    let badgeBg = '#e0f2fe';
                    let badgeText = '#0369a1';
                    let badgeBorder = '#7dd3fc';
                    let progressBarColor = '#3b82f6';
                    let statusIcon = 'fa fa-clock-o';
                    let sla_status_text = 'Pending';

                    if (tat_status === 'Failed') {
                        badgeBg = '#fee2e2';
                        badgeText = '#dc2626';
                        badgeBorder = '#fca5a5';
                        progressBarColor = '#ef4444';
                        statusIcon = 'fa fa-exclamation-triangle';
                        let overdue_days = days_taken - targetPeriod;
                        if (overdue_days > 0) {
                            sla_status_text = 'Overdue by ' + overdue_days + (overdue_days === 1 ? ' day' : ' days');
                        } else {
                            sla_status_text = 'Overdue';
                        }
                    } else if (tat_status === 'Fulfilled') {
                        badgeBg = '#dcfce7';
                        badgeText = '#15803d';
                        badgeBorder = '#86efac';
                        progressBarColor = '#10b981';
                        statusIcon = 'fa fa-check-circle-o';
                        sla_status_text = 'Within TAT';
                    } else if (tat_status === 'Paused') {
                        badgeBg = '#fef3c7';
                        badgeText = '#d97706';
                        badgeBorder = '#fcd34d';
                        progressBarColor = '#f59e0b';
                        statusIcon = 'fa fa-pause-circle-o';
                        sla_status_text = 'Paused';
                    } else {
                        if (percentUsed > 100) {
                            badgeBg = '#fee2e2';
                            badgeText = '#dc2626';
                            badgeBorder = '#fca5a5';
                            progressBarColor = '#ef4444';
                            statusIcon = 'fa fa-exclamation-triangle';
                            let overdue_days = days_taken - targetPeriod;
                            sla_status_text = 'Overdue by ' + overdue_days + (overdue_days === 1 ? ' day' : ' days');
                        } else if (percentUsed >= 75) {
                            badgeBg = '#ffedd5';
                            badgeText = '#c2410c';
                            badgeBorder = '#fed7aa';
                            progressBarColor = '#f97316';
                            statusIcon = 'fa fa-hourglass-half';
                            sla_status_text = 'Near Due';
                        } else {
                            sla_status_text = 'Within TAT';
                        }
                    }

                    let remaining_days = Math.max(0, Math.round(targetPeriod - days_taken));

                    // Status color mapping for timeline
                    let _getStatusColors = function(status) {
                        let colorMap = {
                            'Pending':                { dot: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: 'fa-clock-o' },
                            'In-process':             { dot: '#6366f1', bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', icon: 'fa-cogs' },
                            'Stock Requested':        { dot: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', icon: 'fa-cube' },
                            'Stock Delivery Requested': { dot: '#a855f7', bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', icon: 'fa-truck' },
                            'Stock Delivered':        { dot: '#0ea5e9', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', icon: 'fa-check-circle' },
                            'On Hold':                { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a', icon: 'fa-pause-circle' },
                            'Cancelled':              { dot: '#ef4444', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', icon: 'fa-times-circle' },
                            'Return Requested':       { dot: '#f97316', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', icon: 'fa-undo' },
                            'Provisioning Completed': { dot: '#10b981', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', icon: 'fa-check-square-o' },
                            'Delivered and Live':     { dot: '#059669', bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7', icon: 'fa-rocket' },
                            'LMS Ordered':            { dot: '#06b6d4', bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', icon: 'fa-shopping-cart' },
                            'LMS Delivered':          { dot: '#14b8a6', bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4', icon: 'fa-inbox' },
                            'LMS Activated':          { dot: '#10b981', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', icon: 'fa-bolt' },
                        };
                        let fallback = { dot: '#94a3b8', bg: '#f8fafc', text: '#475569', border: '#e2e8f0', icon: 'fa-circle-o' };
                        
                        let lookupStatus = status;
                        if (status && status.startsWith('Currently: ')) {
                            lookupStatus = status.replace('Currently: ', '');
                            let color = colorMap[lookupStatus] || fallback;
                            // Clone it to modify icon for the "Currently" indicator if desired
                            return { ...color, icon: 'fa-spinner fa-spin' };
                        }
                        return colorMap[lookupStatus] || fallback;
                    };

                    let table_html = `
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px;">
                                <i class="fa fa-list-alt" style="color: #6366f1; font-size: 14px;"></i>
                                <span style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Site Status Timeline</span>
                            </div>
                            <div style="padding: 4px 0;">
                    `;

                    if (sorted_history.length > 0) {
                        // Append a "Current Day" entry for ongoing sites to match the 'Taken' SLA metric
                        let is_completed = ['Delivered and Live', 'Cancelled', 'Not Feasible'].includes(frm.doc.site_status);
                        if (!is_completed && current_end_date_str) {
                            let last_item = sorted_history[sorted_history.length - 1];
                            // Only append if it's meaningfully later than the last event
                            if (!last_item || moment(current_end_date_str).diff(moment(last_item.date), 'days') > 0) {
                                sorted_history.push({
                                    status: 'Currently: ' + frm.doc.site_status,
                                    date: current_end_date_str
                                });
                            }
                        }

                        sorted_history.forEach((item, index) => {
                            let formatted_date = moment(item.date).format('DD-MM-YYYY HH:mm:ss');
                            let day_number = working_days_map[item.date] !== undefined ? working_days_map[item.date] : 1;
                            day_number = Math.max(1, day_number);

                            // Cap the timeline day to not exceed the official days_taken SLA calculation
                            // This ensures the timeline matches the "Taken" metric perfectly
                            if (day_number > days_taken) {
                                day_number = days_taken;
                            }

                            let sc = _getStatusColors(item.status);
                            let isLast = index === sorted_history.length - 1;

                            table_html += `
                                <div style="display: flex; align-items: stretch; padding: 0 16px;">
                                    <!-- Timeline connector column -->
                                    <div style="display: flex; flex-direction: column; align-items: center; width: 28px; flex-shrink: 0;">
                                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${sc.dot}; border: 2.5px solid ${sc.border}; flex-shrink: 0; margin-top: 14px; z-index: 1; box-shadow: 0 0 0 3px ${sc.bg};"></div>
                                        ${!isLast ? '<div style="width: 2px; flex: 1; background: linear-gradient(to bottom, ' + sc.dot + '40, #e2e8f0); min-height: 8px;"></div>' : ''}
                                    </div>
                                    <!-- Row content -->
                                    <div style="flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 8px 0 8px 10px; ${!isLast ? 'border-bottom: 1px solid #f1f5f9;' : ''}">
                                        <div style="display: flex; align-items: center; gap: 8px; min-width: 180px;">
                                            <span style="
                                                display: inline-flex; align-items: center; gap: 5px;
                                                background: ${sc.bg};
                                                color: ${sc.text};
                                                border: 1px solid ${sc.border};
                                                padding: 4px 10px;
                                                border-radius: 20px;
                                                font-size: 11.5px;
                                                font-weight: 700;
                                                white-space: nowrap;
                                            ">
                                                <i class="fa ${sc.icon}" style="font-size: 10px;"></i>
                                                ${item.status}
                                            </span>
                                        </div>
                                        <div style="font-size: 12.5px; color: #64748b; font-weight: 500; font-variant-numeric: tabular-nums; flex: 1; text-align: center;">
                                            ${formatted_date}
                                        </div>
                                        <div style="
                                            font-size: 12px;
                                            font-weight: 700;
                                            color: ${sc.text};
                                            background: ${sc.bg};
                                            border: 1px solid ${sc.border};
                                            padding: 3px 10px;
                                            border-radius: 6px;
                                            min-width: 62px;
                                            text-align: center;
                                            white-space: nowrap;
                                        ">Day ${day_number}</div>
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        table_html += `<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13px;">No status history found.</div>`;
                    }

                    table_html += `
                            </div>
                        </div>
                    `;

                    let htmlContent = `
                        <div id="custom_tat_dashboard_modal" style="
                            position: fixed;
                            top: 0; left: 0; width: 100vw; height: 100vh;
                            background: rgba(15, 23, 42, 0.4);
                            backdrop-filter: blur(4px);
                            -webkit-backdrop-filter: blur(4px);
                            z-index: 1030;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            opacity: 0;
                            transition: opacity 0.3s ease;
                        ">
                            <div class="custom-tat-modal-content" style="
                                background: #f8fafc;
                                border-radius: 16px;
                                width: 980px;
                                max-width: 95vw;
                                max-height: 90vh;
                                display: flex;
                                flex-direction: column;
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

                                <div class="tat-analysis-container" style="padding: 20px 24px; color: #1e293b; display: flex; flex-direction: column; gap: 14px; flex: 1; min-height: 0;">
                                    <!-- Header Row: Status + Key Metrics -->
                                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                                        <!-- Row 1: Status title with badge -->
                                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                                            <div style="display: flex; align-items: center; gap: 14px;">
                                                <div style="width: 48px; height: 48px; border-radius: 14px; background: ${badgeBg}; display: flex; align-items: center; justify-content: center; border: 1.5px solid ${badgeBorder};">
                                                    <i class="${statusIcon}" style="font-size: 22px; color: ${badgeText};"></i>
                                                </div>
                                                <div>
                                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                                                        <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px;">TAT Status</span>
                                                        <div class="tat-info-btn" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; background: #f8fafc; color: #64748b; padding: 2px 8px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 10px; font-weight: 600; transition: all 0.2s;" title="Click for TAT Calculation Details" onmouseover="this.style.background='#eff6ff'; this.style.color='#2563eb'; this.style.borderColor='#bfdbfe';" onmouseout="this.style.background='#f8fafc'; this.style.color='#64748b'; this.style.borderColor='#e2e8f0';">
                                                            <i class="fa fa-info-circle" style="font-size: 10px;"></i>
                                                            <span>How is this calculated?</span>
                                                        </div>
                                                    </div>
                                                    <div style="font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.2;">
                                                        ${tat_status === 'Paused' ? 'PAUSED' : remaining_days + ' Days Left'}
                                                    </div>
                                                </div>
                                            </div>
                                            <span style="
                                                font-size: 11px;
                                                font-weight: 800;
                                                text-transform: uppercase;
                                                letter-spacing: 0.5px;
                                                background: ${badgeBg};
                                                color: ${badgeText};
                                                border: 1.5px solid ${badgeBorder};
                                                padding: 5px 14px;
                                                border-radius: 20px;
                                            ">${sla_status_text}</span>
                                        </div>

                                        <!-- Row 2: Progress bar -->
                                        <div>
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                                <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Progress</span>
                                                <div style="display: flex; align-items: center; gap: 12px;">
                                                    <span style="font-size: 11px; font-weight: 600; color: #64748b;">Target: <strong style="color: #0f172a;">${targetPeriod}</strong></span>
                                                    <span style="color: #e2e8f0;">|</span>
                                                    <span style="font-size: 11px; font-weight: 600; color: #64748b;">Taken: <strong style="color: ${badgeText};">${days_taken}</strong></span>
                                                    <span style="color: #e2e8f0;">|</span>
                                                    <span style="font-size: 11px; font-weight: 700; color: ${badgeText};">${percentUsed}%</span>
                                                </div>
                                            </div>
                                            <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                                                <div style="width: ${Math.min(100, percentUsed)}%; height: 100%; background: linear-gradient(90deg, ${progressBarColor}, ${progressBarColor}cc); border-radius: 4px; transition: width 0.6s ease;"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Data Strip: Key Info in one clean row -->
                                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; display: flex; box-shadow: 0 1px 3px rgba(0,0,0,0.04); flex-shrink: 0;">
                                        <!-- Start Date -->
                                        <div style="flex: 1; padding: 16px 14px; border-right: 1px solid #f1f5f9; white-space: nowrap; overflow: visible;">
                                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                                                <span style="width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; display: inline-block;"></span>
                                                <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Start</span>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.3;">${createdDateFormatted}</div>
                                        </div>
                                        <!-- Due Date -->
                                        <div style="flex: 1; padding: 16px 14px; border-right: 1px solid #f1f5f9; white-space: nowrap; overflow: visible;">
                                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                                                <span style="width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; display: inline-block;"></span>
                                                <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</span>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.3;">${dueDateFormatted}</div>
                                        </div>
                                        <!-- Completed -->
                                        <div style="flex: 1; padding: 16px 14px; border-right: 1px solid #f1f5f9; white-space: nowrap; overflow: visible;">
                                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                                                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; flex-shrink: 0; display: inline-block;"></span>
                                                <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Completed</span>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 800; color: ${completedDateFormatted ? '#10b981' : '#94a3b8'}; line-height: 1.3;">${completedDateFormatted || 'Pending'}</div>
                                        </div>
                                        <!-- Days Left -->
                                        <div style="flex: 1; padding: 16px 14px; border-right: 1px solid #f1f5f9; white-space: nowrap; overflow: visible;">
                                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                                                <span style="width: 6px; height: 6px; border-radius: 50%; background: ${progressBarColor}; flex-shrink: 0; display: inline-block;"></span>
                                                <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Left</span>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 800; color: ${progressBarColor}; line-height: 1.3;">${remaining_days} Day(s)</div>
                                        </div>
                                        <!-- LMS Type -->
                                        <div style="flex: 1; padding: 16px 14px; border-right: 1px solid #f1f5f9; white-space: nowrap; overflow: visible;">
                                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                                                <span style="width: 6px; height: 6px; border-radius: 50%; background: #7c3aed; flex-shrink: 0; display: inline-block;"></span>
                                                <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">LMS Type</span>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 800; color: #7c3aed; line-height: 1.3;">${frm.doc.lms_type || 'N/A'}</div>
                                        </div>
                                        <!-- Hold Days -->
                                        <div style="flex: 1; padding: 16px 14px; white-space: nowrap; overflow: visible;">
                                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                                                <span style="width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; display: inline-block;"></span>
                                                <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Hold</span>
                                            </div>
                                            <div id="live_hold_days_display" style="font-size: 13px; font-weight: 800; color: #3b82f6; line-height: 1.3;">${hold_days_total > 0 ? hold_days_total.toFixed(1) + ' Day(s)' : '0 Day(s)'}</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Site Status Timeline Container -->
                                    <div id="tat_status_timeline_container" style="margin-top: 8px; overflow-y: auto; flex: 1; min-height: 0; padding-right: 4px;">
                                        ${table_html}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;

                    // Remove any existing modal to prevent duplicates
                    $('#custom_tat_dashboard_modal').remove();
                    $('body').append(htmlContent);

                    let $modal = $('#custom_tat_dashboard_modal');

                    // Bind TAT Info Button
                    $modal.find('.tat-info-btn').on('click', function (e) {
                        e.stopPropagation();
                        let d = new frappe.ui.Dialog({
                            title: __('TAT Calculation Guidelines'),
                            size: 'extra-large',
                            fields: [
                                {
                                    fieldname: 'html_content',
                                    fieldtype: 'HTML',
                                    options: `
                                        <div style="font-family: 'Outfit', 'Inter', sans-serif; display: flex; flex-direction: column; gap: 16px; padding: 0;">
                                            <!-- Beautiful Hero Banner -->
                                            <div style="background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); padding: 16px 20px; border-radius: 12px; border-left: 5px solid #3b82f6; display: flex; align-items: center; gap: 16px; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5);">
                                                <div style="background: #ffffff; width: 56px; height: 56px; border-radius: 50%; display: flex; justify-content: center; align-items: center; box-shadow: 0 4px 10px -2px rgba(59, 130, 246, 0.3);">
                                                    <i class="fa fa-calculator" style="color: #3b82f6; font-size: 24px;"></i>
                                                </div>
                                                <div>
                                                    <h3 style="margin: 0; color: #1e293b; font-size: 20px; font-weight: 800;">Turnaround Time Logic</h3>
                                                    <p style="margin: 6px 0 0 0; color: #64748b; font-size: 14px; font-weight: 500;">Understand exactly how Due Dates and Time Taken are computed by the system.</p>
                                                </div>
                                            </div>
                                            <!-- Grid of 3 Rule Cards -->
                                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                                                <!-- Card 1 -->
                                                <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)';">
                                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                                                        <div style="background: #fef2f2; color: #ef4444; width: 38px; height: 38px; border-radius: 10px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.2);">
                                                            <i class="fa fa-clock-o" style="font-size: 18px;"></i>
                                                        </div>
                                                        <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">1 PM Cutoff Rule</h4>
                                                    </div>
                                                    <p style="margin: 0; font-size: 13.5px; color: #475569; line-height: 1.6;">
                                                        If a site is created <strong>before 13:00 (1 PM)</strong>, the calculation starts on the exact same day.<br><br>
                                                        If created <strong>at or after 1 PM</strong>, the clock officially starts on the next working day.
                                                    </p>
                                                </div>
                                                <!-- Card 2 -->
                                                <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)';">
                                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                                                        <div style="background: #f0fdf4; color: #22c55e; width: 38px; height: 38px; border-radius: 10px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(34, 197, 94, 0.2);">
                                                            <i class="fa fa-calendar-times-o" style="font-size: 18px;"></i>
                                                        </div>
                                                        <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">Holiday Exclusions</h4>
                                                    </div>
                                                    <p style="margin: 0; font-size: 13.5px; color: #475569; line-height: 1.6;">
                                                        The system rigidly skips all dates defined in your respective yearly <strong>Holiday List</strong>.<br><br>
                                                        These designated days off are completely excluded from both the Due Date and the Time Taken.
                                                    </p>
                                                </div>
                                                <!-- Card 3 -->
                                                <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)';">
                                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                                                        <div style="background: #fffbeb; color: #f59e0b; width: 38px; height: 38px; border-radius: 10px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(245, 158, 11, 0.2);">
                                                            <i class="fa fa-pause-circle" style="font-size: 18px;"></i>
                                                        </div>
                                                        <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">On-Hold Adjustments</h4>
                                                    </div>
                                                    <p style="margin: 0; font-size: 13.5px; color: #475569; line-height: 1.6;">
                                                        When a site is placed <strong>On Hold</strong>, the SLA clock is instantly paused.<br><br>
                                                        The total days spent on hold are actively <strong>subtracted</strong> from the 'Days Taken', extending your Due Date fairly.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    `
                                }
                            ]
                        });
                        d.show();
                        d.$wrapper.find('.modal-dialog').css({
                            'max-width': '1050px',
                            'width': '95vw'
                        });
                        d.$wrapper.find('.modal-body').css('padding', '10px 20px 15px 20px');
                    });

                    setTimeout(() => {
                        $modal.css('opacity', '1');
                        $modal.find('.custom-tat-modal-content').css('transform', 'scale(1) translateY(0)');
                    }, 10);

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
            });
        }
    });
}

// Realtime listener for project manager assignment updates
frappe.realtime.on("site_project_manager_updated", function (data) {
    console.log("Realtime event received site_project_manager_updated:", data);
    if (
        cur_frm &&
        cur_frm.doctype === "Site" &&
        cur_frm.doc.name === data.name
    ) {
        cur_frm.doc.project_manager = data.project_manager;
        cur_frm.doc.project_manager_email_id = data.project_manager_email_id;
        if (data.modified) {
            cur_frm.doc.modified = data.modified;
        }
        cur_frm.refresh_field("project_manager");
        cur_frm.refresh_field("project_manager_email_id");
        frappe.show_alert({
            message: __("Project Manager updated: {0}", [data.project_manager || __("None")]),
            indicator: "green"
        });
    }
});

// Hook into AssignTo render to fetch the updated Project Manager immediately after local assignment changes
if (frappe.ui.form.AssignTo) {
    const original_render = frappe.ui.form.AssignTo.prototype.render;
    frappe.ui.form.AssignTo.prototype.render = function (assignments) {
        original_render.call(this, assignments);
        if (this.frm && this.frm.doctype === "Site" && this.frm.doc && this.frm.doc.name) {
            const frm = this.frm;
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Site",
                    filters: { name: frm.doc.name },
                    fieldname: ["project_manager", "project_manager_email_id", "modified"]
                },
                callback: function (r) {
                    if (r && r.message) {
                        frm.doc.project_manager = r.message.project_manager;
                        frm.doc.project_manager_email_id = r.message.project_manager_email_id;
                        frm.doc.modified = r.message.modified;
                        frm.refresh_field("project_manager");
                        frm.refresh_field("project_manager_email_id");
                    }
                }
            });
        }
    };
}

function is_text_overflowing(input_element) {
    const val = input_element.val();
    if (!val) return false;

    const span = $('<span></span>');
    span.css({
        'position': 'absolute',
        'visibility': 'hidden',
        'white-space': 'pre',
        'font-family': input_element.css('font-family') || 'inherit',
        'font-size': input_element.css('font-size') || '14px',
        'font-weight': input_element.css('font-weight') || 'normal',
        'letter-spacing': input_element.css('letter-spacing') || 'normal'
    });
    span.text(val);
    $('body').append(span);
    const text_width = span.width();
    span.remove();

    const input_width = input_element.width();
    return text_width > (input_width - 35); // safety margin
}

function adjust_textarea_height(textarea) {
    let base_h = 30;
    const sample = $(frm.wrapper).find('.form-control:not(.custom-textarea-mirror):visible').first();
    if (sample.length > 0) {
        base_h = sample.outerHeight() || 30;
    }
    textarea.css('height', '1px');
    const sh = textarea[0].scrollHeight;
    if (sh > base_h + 5) {
        textarea.css('height', sh + 'px');
    } else {
        textarea.css('height', base_h + 'px');
    }
}

function toggle_field_mode(input, textarea, to_multiline, isHighlightedField, highlightColor, isRequired) {
    const baseInputStyle = {
        'border': '1px solid #ccc',
        'border-radius': '7px',
        'padding': '5px',
        'outline': 'none',
        'background-color': isHighlightedField ? highlightColor : '#ffffff',
        'transition': '0.3s ease-in-out'
    };
    if (isRequired) {
        baseInputStyle['border-left'] = '4px solid red';
    }

    if (to_multiline) {
        input.css({
            'position': 'absolute',
            'opacity': '0',
            'z-index': '-1',
            'pointer-events': 'none',
            'height': '0',
            'width': '100%',
            'padding': '0',
            'margin': '0',
            'border': 'none'
        });

        textarea.css({
            'display': 'block',
            'width': '100%',
            'resize': 'none',
            'overflow-y': 'hidden',
            'white-space': 'pre-wrap',
            'word-break': 'break-word',
            'border': '1px solid #ccc',
            'border-radius': '7px',
            'padding': '5px',
            'outline': 'none',
            'background-color': isHighlightedField ? highlightColor : '#ffffff',
            'transition': '0.3s ease-in-out'
        });

        if (isRequired) {
            textarea.css('border-left', '4px solid red');
        }
        if (isHighlightedField) {
            textarea.each(function () {
                this.style.setProperty('background-color', highlightColor, 'important');
            });
        }
        adjust_textarea_height(textarea);
    } else {
        input.css({
            'position': 'relative',
            'opacity': '1',
            'z-index': 'auto',
            'pointer-events': 'auto',
            'height': '',
            'width': '100%',
            'padding': '',
            'margin': '',
            'border': ''
        });
        input.css(baseInputStyle);
        if (isHighlightedField) {
            input.each(function () {
                this.style.setProperty('background-color', highlightColor, 'important');
            });
        }
        textarea.css('display', 'none');
    }
}

function check_and_toggle(input, textarea, isHighlightedField, highlightColor, isRequired) {
    if (!textarea.is(':focus')) {
        textarea.val(input.val() || '');
    }
    const active_element = textarea.is(':visible') ? textarea : input;
    if (is_text_overflowing(active_element)) {
        toggle_field_mode(input, textarea, true, isHighlightedField, highlightColor, isRequired);
    } else {
        toggle_field_mode(input, textarea, false, isHighlightedField, highlightColor, isRequired);
    }
}

function make_field_multiline(frm, field) {
    if (!frm || !frm.fields_dict || !frm.fields_dict[field]) return;
    const wrapper = $(frm.fields_dict[field].wrapper);
    const input = wrapper.find('input[type="text"]');

    const df = frm.fields_dict[field].df;
    if (!df || !(df.fieldtype === 'Data' || df.fieldtype === 'Link' || df.fieldtype === 'Small Text' || df.fieldtype === 'Text')) {
        return;
    }

    const isSpecialField = (field === 'stage' || field === 'lms_stage');
    const isReviewField = (field === 'project_review' || field === 'lms_review' || field === 'task_ownership' || field === 'estimated_time_of_arrival');
    const isHighlightedField = isSpecialField || isReviewField;
    const highlightColor = '#FFF1C2';

    let textarea = wrapper.find('.custom-textarea-mirror');
    if (input.length > 0 && textarea.length === 0) {
        textarea = $('<textarea class="form-control custom-textarea-mirror" style="display: none;"></textarea>');

        textarea.attr('placeholder', input.attr('placeholder') || '');
        textarea.val(input.val());

        input.before(textarea);

        textarea.on('input change keyup', function () {
            input.val(textarea.val());
            input.trigger('input');
            input.trigger('change');

            adjust_textarea_height(textarea);
            if (!is_text_overflowing(textarea)) {
                toggle_field_mode(input, textarea, false, isHighlightedField, highlightColor, df.reqd);
            }
        });

        input.on('change input propertychange keyup', function () {
            textarea.val(input.val());
            check_and_toggle(input, textarea, isHighlightedField, highlightColor, df.reqd);
        });

        textarea.on('focus', function () {
            input.trigger('focus');
            const focusStyle = {
                'border': '1px solid #80bdff',
                'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)'
            };
            if (df.reqd) {
                focusStyle['border-left'] = '5px solid red';
            }
            textarea.css(focusStyle);
            if (isHighlightedField) {
                this.style.setProperty('background-color', highlightColor, 'important');
            }
        });

        textarea.on('blur', function () {
            input.trigger('blur');
            const blurStyle = {
                'border': '1px solid #ccc',
                'box-shadow': 'none'
            };
            if (df.reqd) {
                blurStyle['border-left'] = '4px solid red';
            }
            textarea.css(blurStyle);
            if (isHighlightedField) {
                this.style.setProperty('background-color', highlightColor, 'important');
            }
            check_and_toggle(input, textarea, isHighlightedField, highlightColor, df.reqd);
        });

        input.on('keyup change blur', function () {
            check_and_toggle(input, textarea, isHighlightedField, highlightColor, df.reqd);
        });
    }

    if (input.length > 0 && textarea.length > 0) {
        check_and_toggle(input, textarea, isHighlightedField, highlightColor, df.reqd);
    }
}

frappe.ui.form.on('Site', {
    refresh: function (frm) {
        // Style the Project Review Section Description
        setTimeout(() => {
            if (frm.fields_dict.review_section && frm.fields_dict.review_section.wrapper) {
                // Find any text element inside the section wrapper that contains the note
                $(frm.fields_dict.review_section.wrapper).find('p, div, span').each(function () {
                    let $el = $(this);
                    if (!$el.hasClass('nexapp-styled-note') && !$el.closest('.nexapp-styled-note').length && $el.children().length === 0 && $el.text().includes("This LMS Review will also automatically update from the Lastmile Services Master.")) {
                        $el.addClass('nexapp-styled-note');
                        $el.html(`
                            <div class="lms-review-note" style="font-size: 13px; color: #475569; padding: 10px 14px; background-color: #FFF1C2; border-left: 3px solid #71639e; border-radius: 6px; font-weight: 500; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-top: 5px; margin-bottom: 15px;">
                                <span style="font-size: 16px; margin-right: 10px; display: inline-block;">💡</span>
                                <span style="line-height: 1.4;">Note: This LMS Review will also automatically update from the Lastmile Services Master.</span>
                            </div>
                        `);
                        // Ensure parent containers don't restrict the new styling
                        $el.removeClass('text-muted small');
                        $el.css({ 'color': 'inherit', 'font-size': 'inherit' });
                    }
                });
            }

            // Style the Circuit Delivery Date ('date') Field Description
            if (frm.fields_dict.date && frm.fields_dict.date.wrapper) {
                $(frm.fields_dict.date.wrapper).find('.help-box, .help-block, .text-muted').each(function () {
                    let $el = $(this);
                    if (!$el.hasClass('nexapp-styled-note') && !$el.closest('.nexapp-styled-note').length && $el.text().includes("This date serves as the invoice start date.")) {
                        $el.addClass('nexapp-styled-note');
                        $el.html(`
                            <div class="circuit-date-note" style="font-size: 13px; color: #475569; padding: 10px 14px; background-color: #E8E4EE; border-left: 3px solid #71639e; border-radius: 6px; font-weight: 500; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-top: 5px;">
                                <span style="font-size: 16px; margin-right: 10px; display: inline-block;">💡</span>
                                <span style="line-height: 1.4;">This date serves as the invoice start date.</span>
                            </div>
                        `);
                        $el.removeClass('text-muted small help-box help-block');
                        $el.css({ 'color': 'inherit', 'font-size': 'inherit' });
                    }
                });
            }
        }, 500);

        load_shipment_details(frm);
        load_lms_feasibility_details(frm);
        load_isp_change_feasibility_details(frm);
        load_wireless_feasibility_details(frm);
        load_provisioning_details(frm);
        load_installation_images(frm);
    }
});

function load_shipment_details(frm) {
    if (frm.doc.name && !frm.doc.__islocal && frm.fields_dict.virtual_shipment_html) {

        $(frm.fields_dict.virtual_shipment_html.wrapper).html("<p class='text-muted'>Loading shipment details...</p>");

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Shipment",
                filters: {
                    "custom_circuit_id": frm.doc.name
                },
                fields: ["name", "tracking_status", "service_provider", "custom_delivery_date", "carrier", "pickup_date", "carrier_service", "awb_number"]
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    let format_date = (d) => {
                        if (!d) return '';
                        let parts = d.split('-');
                        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                        return d;
                    };

                    let html = `
                        <div class="table-responsive">
                            <table class="table table-bordered table-hover">
                                <thead>
                                    <tr style="background-color: #f8f9fa;">
                                        <th>Shipment ID</th>
                                        <th>Tracking Status</th>
                                        <th>Service Provider</th>
                                        <th>Delivery Date</th>
                                        <th>Carrier</th>
                                        <th>Pickup Date</th>
                                        <th>Carrier Service</th>
                                        <th>AWB Number</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;

                    r.message.forEach(row => {
                        html += `
                            <tr>
                                <td><a href="/app/shipment/${row.name}">${row.name}</a></td>
                                <td>${row.tracking_status || ''}</td>
                                <td>${row.service_provider || ''}</td>
                                <td>${format_date(row.custom_delivery_date)}</td>
                                <td>${row.carrier || ''}</td>
                                <td>${format_date(row.pickup_date)}</td>
                                <td>${row.carrier_service || ''}</td>
                                <td>${row.awb_number || ''}</td>
                            </tr>
                        `;
                    });

                    html += `
                                </tbody>
                            </table>
                        </div>
                    `;
                    $(frm.fields_dict.virtual_shipment_html.wrapper).html(html);
                } else {
                    $(frm.fields_dict.virtual_shipment_html.wrapper).html("<p class='text-muted' style='padding: 10px;'>No shipments found for this circuit.</p>");
                }
            }
        });
    }
}

// --- START LMS FEASIBILITY VIRTUAL TABLE ---
function load_lms_feasibility_details(frm) {
    if (frm.doc.name && !frm.doc.__islocal && frm.fields_dict.virtual_lms_feasibility_html) {

        $(frm.fields_dict.virtual_lms_feasibility_html.wrapper).html("<p class='text-muted'>Loading LMS Feasibility details...</p>");

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Feasibility",
                filters: {
                    "name": frm.doc.name
                },
                fields: ["name"]
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    let feasibility_name = r.message[0].name;

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Feasibility",
                            name: feasibility_name
                        },
                        callback: function (feasibility_doc) {
                            if (feasibility_doc.message && feasibility_doc.message.lms_provider && feasibility_doc.message.lms_provider.length > 0) {

                                let html = `
                                    <div class="table-responsive">
                                        <table class="table table-bordered table-hover">
                                            <thead>
                                                <tr style="background-color: #f8f9fa;">
                                                    <th>No.</th>
                                                    <th>LMS Feasibility Partner</th>
                                                    <th>Bandwith Type</th>
                                                    <th>Media</th>
                                                    <th>Feasibility Type</th>
                                                    <th>Static IP</th>
                                                    <th>Bandwidth Name</th>
                                                    <th>LMS Feasibility Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                `;

                                feasibility_doc.message.lms_provider.forEach((row, index) => {
                                    html += `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td><b>${row.lms_supplier || ''}</b></td>
                                            <td>${row.bandwith_type || ''}</td>
                                            <td>${row.media || ''}</td>
                                            <td>${row.feasibility_type || ''}</td>
                                            <td>${row.static_ip || ''}</td>
                                            <td>${row.bandwidth_name || ''}</td>
                                            <td>${row.lms_status || ''}</td>
                                        </tr>
                                    `;
                                });

                                html += `
                                            </tbody>
                                        </table>
                                    </div>
                                `;
                                $(frm.fields_dict.virtual_lms_feasibility_html.wrapper).html(html);
                                $(frm.fields_dict.virtual_lms_feasibility_html.wrapper).closest('.form-section').show();
                                check_feasibility_tab_visibility(frm);
                            } else {
                                $(frm.fields_dict.virtual_lms_feasibility_html.wrapper).html("<p class='text-muted' style='padding: 10px;'>No LMS Partners found in the Feasibility document.</p>");
                                $(frm.fields_dict.virtual_lms_feasibility_html.wrapper).closest('.form-section').hide();
                                check_feasibility_tab_visibility(frm);
                            }
                        }
                    });
                } else {
                    $(frm.fields_dict.virtual_lms_feasibility_html.wrapper).html("<p class='text-muted' style='padding: 10px;'>No Feasibility document linked to this circuit yet.</p>");
                    $(frm.fields_dict.virtual_lms_feasibility_html.wrapper).closest('.form-section').hide();
                    check_feasibility_tab_visibility(frm);
                }
            }
        });
    }
}
// --- END LMS FEASIBILITY VIRTUAL TABLE ---

function check_feasibility_tab_visibility(frm) {
    setTimeout(() => {
        let lms_f = frm.fields_dict.virtual_lms_feasibility_html;
        let isp_f = frm.fields_dict.virtual_isp__change_feasibility_html;
        let wireless_f = frm.fields_dict.wireless_feasibility_html_v || frm.fields_dict.wireless_feasiblity_html_v || frm.fields_dict.virtual_wireless_feasibility_html;

        let lms_hidden = lms_f ? $(lms_f.wrapper).closest('.form-section').css('display') === 'none' : true;
        let isp_hidden = isp_f ? $(isp_f.wrapper).closest('.form-section').css('display') === 'none' : true;
        let wireless_hidden = wireless_f ? $(wireless_f.wrapper).closest('.form-section').css('display') === 'none' : true;

        if (lms_hidden && isp_hidden && wireless_hidden) {
            frm.set_df_property('lms_feasibility_tab', 'hidden', 1);
            // Fallback jquery hide for the tab
            $('a[data-fieldname="lms_feasibility_tab"]').closest('li').hide();
        } else {
            frm.set_df_property('lms_feasibility_tab', 'hidden', 0);
            $('a[data-fieldname="lms_feasibility_tab"]').closest('li').show();
        }
    }, 600);
}

// --- START ISP CHANGE FEASIBILITY VIRTUAL TABLE ---

// --- START WIRELESS FEASIBILITY VIRTUAL TABLE ---
function load_wireless_feasibility_details(frm) {
    let target_field = frm.fields_dict.wireless_feasibility_html_v || frm.fields_dict.wireless_feasiblity_html_v || frm.fields_dict.virtual_wireless_feasibility_html;

    if (frm.doc.name && !frm.doc.__islocal && target_field) {

        $(target_field.wrapper).html("<p class='text-muted'>Loading Wireless Feasibility details...</p>");

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Feasibility",
                filters: {
                    "name": frm.doc.name
                },
                fields: ["name"]
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    let feasibility_name = r.message[0].name;

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Feasibility",
                            name: feasibility_name
                        },
                        callback: function (feasibility_doc) {
                            if (feasibility_doc.message && feasibility_doc.message.wireless_feasiblity && feasibility_doc.message.wireless_feasiblity.length > 0) {

                                let html = `
                                    <div class="table-responsive">
                                        <table class="table table-bordered table-hover">
                                            <thead>
                                                <tr style="background-color: #f8f9fa;">
                                                    <th>Operator</th>
                                                    <th>3G</th>
                                                    <th>4G</th>
                                                    <th>5G</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                `;

                                feasibility_doc.message.wireless_feasiblity.forEach((row) => {
                                    let operator_name = row.operator || '';
                                    let tick = '<span class="text-success" style="font-weight: bold; font-size: 16px;">✔</span>';
                                    let cross = '<span class="text-danger" style="font-weight: bold; font-size: 16px;">✖</span>';
                                    let is_3g = row['3g'] ? tick : cross;
                                    let is_4g = row['4g'] ? tick : cross;
                                    let is_5g = row['5g'] ? tick : cross;

                                    html += `
                                        <tr>
                                            <td><b>${operator_name}</b></td>
                                            <td>${is_3g}</td>
                                            <td>${is_4g}</td>
                                            <td>${is_5g}</td>
                                        </tr>
                                    `;
                                });

                                html += `
                                            </tbody>
                                        </table>
                                    </div>
                                `;
                                $(target_field.wrapper).html(html);
                                $(target_field.wrapper).closest('.form-section').show();
                                check_feasibility_tab_visibility(frm);
                            } else {
                                $(target_field.wrapper).html("<p class='text-muted' style='padding: 10px;'>No Wireless Feasibility records found.</p>");
                                $(target_field.wrapper).closest('.form-section').hide();
                                check_feasibility_tab_visibility(frm);
                            }
                        }
                    });
                } else {
                    $(target_field.wrapper).html("<p class='text-muted' style='padding: 10px;'>No Feasibility document linked to this circuit yet.</p>");
                    $(target_field.wrapper).closest('.form-section').hide();
                    check_feasibility_tab_visibility(frm);
                }
            }
        });
    }
}
// --- END WIRELESS FEASIBILITY VIRTUAL TABLE ---
function load_isp_change_feasibility_details(frm) {
    if (frm.doc.name && !frm.doc.__islocal && frm.fields_dict.virtual_isp__change_feasibility_html) {

        $(frm.fields_dict.virtual_isp__change_feasibility_html.wrapper).html("<p class='text-muted'>Loading ISP Change Feasibility details...</p>");

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Feasibility",
                filters: {
                    "name": frm.doc.name
                },
                fields: ["name"]
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    let feasibility_name = r.message[0].name;

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Feasibility",
                            name: feasibility_name
                        },
                        callback: function (feasibility_doc) {
                            if (feasibility_doc.message && feasibility_doc.message.isp_change_feasibility && feasibility_doc.message.isp_change_feasibility.length > 0) {

                                let html = `
                                    <div class="table-responsive">
                                        <table class="table table-bordered table-hover">
                                            <thead>
                                                <tr style="background-color: #f8f9fa;">
                                                    <th>LMS Feasibility Partner</th>
                                                    <th>Bandwith Type</th>
                                                    <th>Media</th>
                                                    <th>Static IP</th>
                                                    <th>Bandwidth Name</th>
                                                    <th>LMS Feasibility Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                `;

                                feasibility_doc.message.isp_change_feasibility.forEach((row, index) => {
                                    html += `
                                        <tr>
                                            <td><b>${row.lms_supplier || ''}</b></td>
                                            <td>${row.bandwith_type || ''}</td>
                                            <td>${row.media || ''}</td>
                                            <td>${row.static_ip || ''}</td>
                                            <td>${row.bandwidth_name || ''}</td>
                                            <td>${row.lms_status || ''}</td>
                                        </tr>
                                    `;
                                });

                                html += `
                                            </tbody>
                                        </table>
                                    </div>
                                `;
                                $(frm.fields_dict.virtual_isp__change_feasibility_html.wrapper).html(html);
                                $(frm.fields_dict.virtual_isp__change_feasibility_html.wrapper).closest('.form-section').show();
                                check_feasibility_tab_visibility(frm);
                            } else {
                                $(frm.fields_dict.virtual_isp__change_feasibility_html.wrapper).html("<p class='text-muted' style='padding: 10px;'>No ISP Change Feasibility records found.</p>");
                                $(frm.fields_dict.virtual_isp__change_feasibility_html.wrapper).closest('.form-section').hide();
                                check_feasibility_tab_visibility(frm);
                            }
                        }
                    });
                } else {
                    $(frm.fields_dict.virtual_isp__change_feasibility_html.wrapper).html("<p class='text-muted' style='padding: 10px;'>No Feasibility document linked to this circuit yet.</p>");
                    $(frm.fields_dict.virtual_isp__change_feasibility_html.wrapper).closest('.form-section').hide();
                    check_feasibility_tab_visibility(frm);
                }
            }
        });
    }
}
// --- END ISP CHANGE FEASIBILITY VIRTUAL TABLE ---

// --- START PROVISIONING VIRTUAL DISPLAY ---
function load_provisioning_details(frm) {
    if (frm.doc.name && !frm.doc.__islocal && frm.fields_dict.virtual_provisioning_html) {

        $(frm.fields_dict.virtual_provisioning_html.wrapper).html("<p class='text-muted'>Loading Provisioning details...</p>");

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Provisioning",
                filters: {
                    "circuit_id": frm.doc.name
                },
                fields: ["name"]
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    let provisioning_name = r.message[0].name;

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Provisioning",
                            name: provisioning_name
                        },
                        callback: function (prov_doc) {
                            if (prov_doc.message) {
                                let doc = prov_doc.message;

                                let format_date = (d) => {
                                    if (!d) return '';
                                    let parts = d.split('-');
                                    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                                    return d;
                                };

                                let html = `<div class="provisioning-virtual-container" style="padding: 15px; background: #fff; border: 1px solid #d1d8dd; border-radius: 4px; font-size: 13px;">`;

                                // Basic Info Section
                                html += `
                                    <div style="margin-bottom: 25px;">
                                        <div class="row">
                                `;

                                const basic_fields = [
                                    { label: "Provisioning ID", value: `<a href="/app/provisioning/${doc.name}" style="font-weight:bold;">${doc.name}</a>` },
                                    { label: "Status", value: doc.status },
                                    { label: "Provisioning Completed Date", value: format_date(doc.provisioning_date) },
                                    { label: "On hold Reason", value: doc.on_hold_reason },
                                    { label: "Provisioning Partially Completed Date", value: format_date(doc.provisioning_partially_completed_date) }
                                ];

                                basic_fields.forEach(f => {
                                    if (f.value) {
                                        html += `
                                            <div class="col-sm-6 col-md-4" style="margin-bottom: 15px;">
                                                <div style="color: #8d99a6; font-size: 12px; margin-bottom: 4px;">${f.label}</div>
                                                <div style="font-weight: 500; color: #36414c; word-break: break-word;">${f.value}</div>
                                            </div>
                                        `;
                                    }
                                });
                                html += `</div></div>`; // Close row and basic info section

                                // Helper function to generate sections conditionally
                                const render_section = (title, fields_config) => {
                                    let section_has_data = false;
                                    let section_html = `
                                        <div style="margin-bottom: 25px;">
                                            <h5 style="border-bottom: 1px solid #e2e2e2; padding-bottom: 8px; margin-bottom: 15px; color: #36414c;">${title}</h5>
                                            <div class="row">
                                    `;

                                    fields_config.forEach(f => {
                                        if (doc[f.fieldname]) {
                                            section_has_data = true;
                                            section_html += `
                                                <div class="col-sm-6 col-md-4" style="margin-bottom: 15px;">
                                                    <div style="color: #8d99a6; font-size: 12px; margin-bottom: 4px;">${f.label}</div>
                                                    <div style="font-weight: 500; color: #36414c; word-break: break-word;">${doc[f.fieldname]}</div>
                                                </div>
                                            `;
                                        }
                                    });

                                    section_html += `</div></div>`;

                                    if (section_has_data) {
                                        html += section_html;
                                    }
                                };

                                // Branch IP Information
                                render_section("Branch IP Information", [
                                    { fieldname: "atm_ip", label: "ATM IP" },
                                    { fieldname: "branch_natted_ip", label: "Branch Natted IP" },
                                    { fieldname: "branch_router_ip", label: "Branch Router IP" },
                                    { fieldname: "branch_lan_series", label: "Branch Lan Series" },
                                    { fieldname: "terminal_ip", label: "Terminal IP" }
                                ]);

                                // DC IP Information
                                render_section("DC IP Information", [
                                    { fieldname: "dc_static_ip", label: "DC Static IP" },
                                    { fieldname: "dc_router_ip", label: "DC Router IP" },
                                    { fieldname: "dc_secondary_static_ip", label: "DC Secondary Static IP" },
                                    { fieldname: "dc_server_gateway_ip", label: "DC Server Gateway IP" },
                                    { fieldname: "dc_server_ip", label: "DC Server IP" },
                                    { fieldname: "dc_server_ip_2", label: "DC Server IP 2" }
                                ]);

                                // DR IP Information
                                render_section("DR IP Information", [
                                    { fieldname: "dr_static_ip", label: "DR Static IP" },
                                    { fieldname: "dr_router_ip", label: "DR Router IP" },
                                    { fieldname: "dr_secondary_static_ip", label: "DR Secondary Static IP" },
                                    { fieldname: "dr_server_gateway_ip", label: "DR Server Gateway IP" },
                                    { fieldname: "dr_server_ip", label: "DR Server IP" },
                                    { fieldname: "dr_server_ip_2", label: "DR Server IP 2" }
                                ]);

                                // WAN IP Info Primary
                                render_section("WAN IP Info Primary", [
                                    { fieldname: "wan_static_ip_1", label: "WAN Static IP 1" },
                                    { fieldname: "wan_gateway_ip_1", label: "WAN Gateway IP 1" },
                                    { fieldname: "subnet_mask_1", label: "Subnet Mask 1" },
                                    { fieldname: "wan_user_name_1", label: "WAN User Name 1" },
                                    { fieldname: "wan_password_1", label: "WAN Password 1" },
                                    { fieldname: "wan_1_dns", label: "WAN 1 DNS" },
                                    { fieldname: "wan_dns_1", label: "WAN DNS 1" }
                                ]);

                                // WAN IP Info Secondary
                                render_section("WAN IP Info Secondary", [
                                    { fieldname: "wan_static_ip_2", label: "WAN Static IP 2" },
                                    { fieldname: "wan_gateway_ip_2", label: "WAN Gateway IP 2" },
                                    { fieldname: "subnet_mask_2", label: "Subnet Mask 2" },
                                    { fieldname: "wan_user_name_2", label: "WAN User Name 2" },
                                    { fieldname: "wan_password_2", label: "WAN Password 2" },
                                    { fieldname: "wan_2_dns", label: "WAN 2 DNS" },
                                    { fieldname: "wan_dns_2", label: "WAN DNS 2" }
                                ]);

                                html += `</div>`;
                                $(frm.fields_dict.virtual_provisioning_html.wrapper).html(html);
                            }
                        }
                    });
                } else {
                    $(frm.fields_dict.virtual_provisioning_html.wrapper).html("<p class='text-muted' style='padding: 10px;'>No Provisioning document linked to this circuit yet.</p>");
                }
            }
        });
    }
}
// --- END PROVISIONING VIRTUAL DISPLAY ---

// --- START INSTALLATION IMAGES DISPLAY ---
function load_installation_images(frm) {
    if (frm.doc.name && !frm.doc.__islocal && frm.fields_dict.virtual_installation_image_html) {

        let is_submitted = frm.doc.installation_document_status === 'Submitted';
        frm.toggle_display('virtual_installation_image_html', is_submitted);

        if (!is_submitted) {
            return;
        }

        $(frm.fields_dict.virtual_installation_image_html.wrapper).html("<p class='text-muted'>Checking for Submitted Installation Note...</p>");

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Installation Note",
                filters: {
                    "custom_circuit_id": frm.doc.name,
                    "docstatus": 1
                },
                fields: ["name"],
                limit: 1
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Installation Note",
                            name: r.message[0].name
                        },
                        callback: function (inst_doc) {
                            if (inst_doc.message && inst_doc.message.custom_installation_note_attachment) {
                                let attachments = inst_doc.message.custom_installation_note_attachment;

                                if (attachments.length > 0) {
                                    let html = `
                                        <style>
                                        .inst-img-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px; }
                                        .inst-img-card { border: 1px solid #d1d8dd; border-radius: 8px; padding: 10px; width: 150px; text-align: center; background: #fff; cursor: pointer; transition: 0.2s; }
                                        .inst-img-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: #2563eb; }
                                        .inst-img-card img { width: 100%; height: 110px; object-fit: cover; border-radius: 4px; margin-bottom: 8px; border: 1px solid #eee; }
                                        .inst-img-label { font-size: 11px; font-weight: 600; color: #36414c; word-wrap: break-word; line-height: 1.2; }
                                        </style>
                                        
                                        <div style="padding: 15px; background: #f8f9fa; border: 1px solid #e2e2e2; border-radius: 6px;">
                                            <h5 style="margin-bottom: 10px; color: #111827;">Installation Photographs</h5>
                                            
                                            <div class="inst-img-grid">
                                    `;

                                    window.site_inst_attachments = attachments;

                                    attachments.forEach((item, index) => {
                                        if (item.attachment) {
                                            let src = item.attachment;
                                            let label = item.select_mqjl || "Image";
                                            let isPdf = src.toLowerCase().endsWith('.pdf');

                                            let thumbnailContent = isPdf
                                                ? `<div style="position: relative; width: 100%; height: 110px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #eee; overflow: hidden; background: #fff;">
                                                       <iframe src="${src}#view=FitH&toolbar=0&navpanes=0&scrollbar=0" style="width: 100%; height: 100%; border: none; pointer-events: none;" scrolling="no" tabindex="-1"></iframe>
                                                       <div style="position: absolute; top:0; left:0; width:100%; height:100%; z-index:1;"></div>
                                                   </div>`
                                                : `<img src="${src}" alt="${label}">`;

                                            html += `
                                                <div class="inst-img-card" onclick="show_inst_image_modal(${index})">
                                                    ${thumbnailContent}
                                                    <div class="inst-img-label">${label}</div>
                                                </div>
                                            `;
                                        }
                                    });

                                    html += `
                                            </div>
                                        </div>
                                    `;

                                    // Global modal function with navigation
                                    if (!window.show_inst_image_modal) {
                                        window.inst_image_dialog = null;

                                        window.nav_inst_image = function (newIndex, event) {
                                            if (event) event.stopPropagation();
                                            if (newIndex >= 0 && newIndex < window.site_inst_attachments.length) {
                                                window.show_inst_image_modal(newIndex);
                                            }
                                        };

                                        window.show_inst_image_modal = function (index) {
                                            let atts = window.site_inst_attachments;
                                            let item = atts[index];
                                            let src = item.attachment;
                                            let label = item.select_mqjl || 'Installation Image';
                                            let isPdf = src.toLowerCase().endsWith('.pdf');

                                            if (!window.inst_image_dialog) {
                                                window.inst_image_dialog = new frappe.ui.Dialog({
                                                    title: label,
                                                    size: 'large',
                                                    fields: [{ fieldtype: 'HTML', fieldname: 'img_html' }]
                                                });
                                            }

                                            let d = window.inst_image_dialog;
                                            d.set_title(label);

                                            let prevBtn = index > 0
                                                ? `<button class="btn btn-default" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); border-radius: 50%; width: 45px; height: 45px; padding: 0; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2); background: white;" onclick="window.nav_inst_image(${index - 1}, event)"><i class="fa fa-chevron-left" style="font-size:18px;"></i></button>`
                                                : '';

                                            let nextBtn = index < atts.length - 1
                                                ? `<button class="btn btn-default" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); border-radius: 50%; width: 45px; height: 45px; padding: 0; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2); background: white;" onclick="window.nav_inst_image(${index + 1}, event)"><i class="fa fa-chevron-right" style="font-size:18px;"></i></button>`
                                                : '';

                                            let contentHtml = isPdf
                                                ? `<iframe src="${src}" style="width:100%; height: 60vh; border:none; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: white;"></iframe>`
                                                : `<img src="${src}" style="max-width:100%; max-height: 60vh; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">`;

                                            let modalHtml = `
                                                <div style="position: relative; text-align:center; background: #f3f4f6; padding: 20px; border-radius: 8px; display: flex; align-items: center; justify-content: center; width: 100%; box-sizing: border-box; min-height: 400px; max-height: 65vh; overflow: hidden;">
                                                    ${prevBtn}
                                                    ${contentHtml}
                                                    ${nextBtn}
                                                </div>
                                            `;

                                            d.fields_dict.img_html.$wrapper.html(modalHtml);
                                            d.show();
                                        };
                                    }

                                    $(frm.fields_dict.virtual_installation_image_html.wrapper).html(html);
                                } else {
                                    $(frm.fields_dict.virtual_installation_image_html.wrapper).html("<p style='padding: 10px; color: red;'>Installation Note is submitted, but no attachments were found.</p>");
                                }
                            }
                        }
                    });
                } else {
                    $(frm.fields_dict.virtual_installation_image_html.wrapper).html("<p style='padding: 10px; color: red;'>No Submitted Installation Note found for this circuit.</p>");
                }
            }
        });
    }
}
// --- END INSTALLATION IMAGES DISPLAY ---

// --- START: DATE FIELD LOCKING AND VALIDATION ---

function show_custom_date_alert(title, message, callback) {
    let modalId = 'custom-date-alert-modal-' + Date.now();
    let modalHtml = `
        <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 9999; display: flex; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 16px; width: 380px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: inherit;">
                <div style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">${title}</div>
                <div style="font-size: 14px; color: #4b5563; margin-bottom: 24px; line-height: 1.5;">
                    ${message}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="ok_alert_btn_${modalId}" style="padding: 8px 18px; border: none; background: #dc2626; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 500; color: white; transition: all 0.2s;">OK</button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    $(`#ok_alert_btn_${modalId}`).hover(function() { $(this).css('background', '#b91c1c'); }, function() { $(this).css('background', '#dc2626'); });

    $(`#ok_alert_btn_${modalId}`).click(function() {
        $('#' + modalId).remove();
        if (callback) callback();
    });
}

frappe.ui.form.on("Site", {

    onload(frm) {

        let is_admin =
            frappe.session.user === "Administrator" ||
            frappe.user.has_role("System Manager");

        // If date already locked, make it readonly
        if (frm.doc.date_locked && !is_admin) {
            frm.set_df_property("date", "read_only", 1);
        }

    },


    date(frm) {

        if (!frm.doc.date) return;

        let is_admin =
            frappe.session.user === "Administrator" ||
            frappe.user.has_role("System Manager");

        // Order types where backdate is allowed
        let special_orders = ["Upgrade", "Degrade", "Shifting"];

        // If already edited once, stop user
        if (frm.doc.date_locked && !is_admin) {
            show_custom_date_alert("Not Allowed", "Date can be edited only once. Please contact Admin.", () => {
                frm.reload_doc();
            });
            return;
        }

        // Skip backdate validation for special order types
        if (!special_orders.includes(frm.doc.order_type)) {

            let today = frappe.datetime.get_today();
            let diff = frappe.datetime.get_day_diff(today, frm.doc.date);

            if (diff > 7 && !is_admin) {
                show_custom_date_alert("Backdate Not Allowed", "Backdating the Circuit Delivery Date beyond 7 days is not permitted.", () => {
                    frm.set_value("date", "");
                });
            }
        }

    },


    after_save(frm) {

        let is_admin =
            frappe.session.user === "Administrator" ||
            frappe.user.has_role("System Manager");

        // Lock after first save (for all order types except admin)
        if (!is_admin && !frm.doc.date_locked && frm.doc.date) {

            frappe.db.set_value(
                "Site",
                frm.doc.name,
                "date_locked",
                1
            );

            frm.set_df_property("date", "read_only", 1);
        }

    }

});
// --- END: DATE FIELD LOCKING AND VALIDATION ---

// --- START: AUTO RESIZE DESCRIPTION FIELD ---
frappe.ui.form.on("Site", {
    refresh(frm) {
        setTimeout(() => auto_resize_description(frm), 600);
    },
    description(frm) {
        setTimeout(() => auto_resize_description(frm), 100);
    }
});

function auto_resize_description(frm) {
    let $wrapper = frm.fields_dict.description && frm.fields_dict.description.$wrapper;
    if (!$wrapper || !$wrapper.length) return;

    // Inject CSS once to remove all height constraints
    if (!$('#site-desc-css').length) {
        $('head').append(`<style id="site-desc-css">
            .frappe-control[data-fieldname="description"] .control-value,
            .frappe-control[data-fieldname="description"] .like-disabled-input,
            .frappe-control[data-fieldname="description"] textarea,
            .frappe-control[data-fieldname="description"] .ql-editor,
            div[data-fieldname="description"] .control-value,
            div[data-fieldname="description"] .like-disabled-input,
            div[data-fieldname="description"] textarea {
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
            }
            .frappe-control[data-fieldname="description"] textarea {
                min-height: 100px !important;
                overflow: hidden !important;
            }
        </style>`);
    }

    // Handle textarea (edit mode)
    let $textarea = $wrapper.find('textarea');
    if ($textarea.length) {
        let textarea = $textarea[0];
        // Calculate how many rows the content needs
        let text = textarea.value || '';
        let lineCount = (text.match(/\n/g) || []).length + 1;
        // Also account for long lines that wrap
        let cols = textarea.cols || 60;
        let wrappedLines = 0;
        text.split('\n').forEach(line => {
            wrappedLines += Math.max(1, Math.ceil(line.length / cols));
        });
        let totalRows = Math.max(4, wrappedLines + 1);
        textarea.setAttribute('rows', totalRows);

        if (!textarea.dataset.autoResized) {
            $textarea.on('input', function() {
                auto_resize_description(frm);
            });
            textarea.dataset.autoResized = "true";
        }
    }

    // Handle read-only display (.like-disabled-input or .control-value)
    $wrapper.find('.like-disabled-input, .control-value').each(function() {
        this.style.setProperty('max-height', 'none', 'important');
        this.style.setProperty('height', 'auto', 'important');
        this.style.setProperty('overflow', 'visible', 'important');
        this.style.setProperty('white-space', 'pre-wrap', 'important');
    });
}
// --- END: AUTO RESIZE DESCRIPTION FIELD ---

// --- START: LMS TYPE LOGIC ---
frappe.ui.form.on("Site", {
    refresh: function(frm) {
        if (frm.doc.lms_type === "No LMS" && frm.doc.lms_stage !== "No LMS") {
            frm.set_value("lms_stage", "No LMS");
        }
    },
    validate: function(frm) {
        if (frm.doc.lms_type === "No LMS" && frm.doc.lms_stage !== "No LMS") {
            frm.doc.lms_stage = "No LMS";
        }
    },
    lms_type: function(frm) {
        if (frm.doc.lms_type === "No LMS") {
            frm.set_value("lms_stage", "No LMS");
        }
    }
});
// --- END: LMS TYPE LOGIC ---

///////POC Customer Highlight ////////////////////////////////////////////////////////////////

function highlight_poc_customer_site(frm) {
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

frappe.ui.form.on('Site', {
    refresh: function (frm) {
        highlight_poc_customer_site(frm);
        highlight_client_approval_status(frm);
    },
    customer_type: function (frm) {
        highlight_poc_customer_site(frm);
    },
    client_installation_approval_status: function (frm) {
        highlight_client_approval_status(frm);
    }
});

function highlight_client_approval_status(frm) {
    setTimeout(() => {
        if (!frm.fields_dict.client_installation_approval_status) return;
        
        let val = frm.doc.client_installation_approval_status;
        let field = frm.fields_dict.client_installation_approval_status;
        if (!field || !field.wrapper) return;
        let $wrapper = $(field.wrapper);
        
        let $el = $wrapper.find('.control-input').find('.like-disabled-input, .control-value, input, select').first();
        if (!$el.length) {
            $el = $wrapper.find('.like-disabled-input, .control-value, input, select').first();
        }
        if ($el.length) {
            // Remove previous custom css completely first to reset
            $el[0].style.cssText = $el[0].style.cssText.replace(/background-color:.*?;/g, '')
                                                        .replace(/color:.*?;/g, '')
                                                        .replace(/border.*?;/g, '')
                                                        .replace(/box-shadow:.*?;/g, '')
                                                        .replace(/font-weight:.*?;/g, '');

            let css = '';
            if (val === 'Approved') {
                css = '; background-color: #f0fdf4 !important; color: #047857 !important; font-weight: 700 !important; border: 1px solid #bbf7d0 !important; border-left: 4px solid #10b981 !important; border-radius: 6px !important; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1) !important;';
            } else if (val === 'Rejected') {
                css = '; background-color: #fee2e2 !important; color: #991b1b !important; font-weight: 700 !important; border: 1px solid #fca5a5 !important; border-left: 4px solid #ef4444 !important; border-radius: 6px !important; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1) !important;';
            } else if (val === 'Awaiting Customer Approval') {
                css = '; background-color: #fefce8 !important; color: #a16207 !important; font-weight: 700 !important; border: 1px solid #fef08a !important; border-left: 4px solid #eab308 !important; border-radius: 6px !important; box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.1) !important;';
            }
            
            if (css) {
                $el[0].style.cssText += css;
            }
        }
    }, 600);
}

// --- START: INSTALLATION ASSIGN & CONFIRM DELIVERY LOGIC ---
frappe.ui.form.on('Site', {
    refresh: function (frm) {
        if (
            frm.doc.stage === 'Stock Delivered' &&
            (frm.doc.customer_type === 'Paid Customer' || frm.doc.customer_type === 'POC Customer') &&
            (
                frm.doc.lms_stage === 'LMS Delivered' ||
                frm.doc.lms_stage === 'LMS Partially Delivered' ||
                frm.doc.lms_stage === 'No LMS' ||
                !frm.doc.lms_stage
            ) &&
            !frm.doc.__islocal
        ) {
            const parent_label = __('Installation');

            // ❌ Do not show any buttons if already delivered
            if (frm.doc.site_status === 'Delivered and Live') {
                return;
            }

            // ✅ Show only "Delivery And Live (Client Approved)" if awaiting approval
            if (frm.doc.site_status === 'Awaiting Customer Approval') {
                frm.add_custom_button(
                    __('<i class="fa fa-check-circle" style="margin-right: 6px;"></i> Delivery And Live (Client Approved)'),
                    function () {
                        let d = new frappe.ui.Dialog({
                            title: 'Confirm Final Delivery',
                            fields: [
                                {
                                    fieldname: 'client_installation_approval_date',
                                    label: 'Client Installation Approval Date',
                                    fieldtype: 'Date',
                                    default: frm.doc.date || frappe.datetime.get_today(),
                                    read_only: 1
                                },
                                {
                                    fieldname: 'user_name',
                                    label: 'User Name',
                                    fieldtype: 'Data',
                                    default: frappe.session.user_fullname,
                                    read_only: 1
                                },
                                {
                                    fieldname: 'reson_for_self_approval',
                                    label: 'Reason For Self Approval',
                                    fieldtype: 'Small Text',
                                    reqd: 1
                                },
                                {
                                    fieldname: 'customer_approved_attachment',
                                    label: 'Attach Customer Approval Proof',
                                    fieldtype: 'Attach',
                                    reqd: 1
                                }
                            ],
                            primary_action_label: 'Confirm',
                            primary_action: function(values) {
                                d.get_primary_btn().prop('disabled', true).text('Confirming...');
                                frappe.call({
                                    method: "frappe.client.set_value",
                                    args: {
                                        doctype: "Site",
                                        name: frm.doc.name,
                                        fieldname: {
                                            site_status: "Delivered and Live",
                                            client_installation_approval_status: "Accepted",
                                            client_installation_approval_date: values.client_installation_approval_date,
                                            reson_for_self_approval: values.reson_for_self_approval,
                                            customer_approved_attachment: values.customer_approved_attachment,
                                            approval_channel: "Nexapp Self"
                                        }
                                    },
                                    callback: function () {
                                        d.hide();
                                        frappe.show_alert({
                                            message: __('Delivery marked as Live with Client Approval.'),
                                            indicator: 'green'
                                        });
                                        frm.reload_doc();
                                    },
                                    error: function() {
                                        d.get_primary_btn().prop('disabled', false).text('Confirm');
                                    }
                                });
                            }
                        });

                        // Inject scoped CSS to match form input style
                        // Inject scoped CSS to fix textarea width and button
                        let dialogId = 'cfd-dialog-' + Date.now();
                        d.$wrapper.attr('id', dialogId);
                        $('head').append(`<style id="${dialogId}-style">
                            #${dialogId} .frappe-control textarea.form-control {
                                width: 100% !important;
                                min-height: 80px !important;
                                padding: 10px !important;
                                border-radius: 8px !important;
                                border: 1px solid #d1d5db !important;
                                resize: vertical !important;
                                margin-top: 5px !important;
                            }
                            #${dialogId} .frappe-control input.form-control {
                                border-radius: 8px !important;
                                border: 1px solid #d1d5db !important;
                                padding: 8px 12px !important;
                            }
                            #${dialogId} .modal-footer .btn-primary {
                                background-color: #16a34a !important;
                                border-color: #16a34a !important;
                                color: #fff !important;
                                border-radius: 6px !important;
                                padding: 8px 24px !important;
                                font-weight: 600 !important;
                            }
                            #${dialogId} .modal-footer .btn-primary:hover {
                                background-color: #15803d !important;
                                border-color: #15803d !important;
                            }
                        </style>`);

                        d.$wrapper.on('hide.bs.modal', function() {
                            $(`#${dialogId}-style`).remove();
                        });

                        d.show();
                    },
                    parent_label
                );

            } else if (!frm.doc.provisioning_id) {
                // Show Installation Assign
                frm.add_custom_button(__('<i class="fa fa-wrench" style="margin-right: 6px;"></i> Installation Assign'), function () {
                    if (frm.doc.im_id) {
                        frappe.msgprint(__('Installation already assigned: ') + frm.doc.im_id);
                        return;
                    }

                    frappe.confirm(
                        __('Are you sure you want to assign installation and create Installation Master record?'),
                        () => {
                            frappe.call({
                                method: "frappe.client.insert",
                                args: {
                                    doc: {
                                        doctype: "Installation Master",
                                        circuit_id: frm.doc.circuit_id
                                    }
                                },
                                callback: function (r) {
                                    if (!r.exc && r.message) {
                                        let installation = r.message;
                                        frm.set_value('im_id', installation.name);
                                        frm.set_value('site_status', 'Installation Initiated');
                                        frm.save().then(() => {
                                            frappe.msgprint(__('Installation Assigned Successfully.'));
                                            frm.refresh();
                                        });
                                    }
                                }
                            });
                        },
                        () => {
                            frappe.msgprint(__('Installation assignment cancelled.'));
                        }
                    );
                }, parent_label);
            } else {
                // ✅ Show "Confirm Deliver to Customer"
                frm.add_custom_button(__('<i class="fa fa-bolt" style="margin-right: 6px;"></i> Confirm Deliver to Customer'), function () {
                    if (frm.doc.installation_document_status !== "Submitted") {
                        show_installation_warning_dialog();
                        return;
                    }
                    show_confirm_delivery_dialog(frm);
                }, parent_label);
            }

            // 🎨 Style the Installation button group
            setTimeout(() => {
                $('button:contains("Installation")').each(function () {
                    if ($(this).text().trim() === "Installation") {
                        $(this).css({
                            'background-color': 'black',
                            'color': 'white',
                            'font-weight': 'bold',
                            'border-radius': '6px',
                            'min-width': '140px'
                        }).prepend('<i class="fa fa-screwdriver-wrench" style="margin-right:6px;"></i>');

                        $(this).find('svg').css({
                            'fill': 'white',
                            'font-weight': 'bold'
                        });
                    }
                });
            }, 100);
        }
    }
});

function show_confirm_delivery_dialog(frm) {
    let modalId = 'custom-confirm-delivery-modal';
    $('#' + modalId).remove();

    let modalHtml = `
    <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
        <div style="background: white; border-radius: 12px; width: 884px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); font-family: inherit;">
            
            <!-- Header (Sticky) -->
            <div style="padding: 24px 24px 0 24px; flex-shrink: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">Confirm Deliver to Customer</h3>
                    <button id="close_confirm_delivery_btn" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: #6b7280; line-height: 1; padding: 0; margin-top: -4px;">&times;</button>
                </div>
                <div style="background-color: #fffbeb; border-left: 4px solid #fde68a; padding: 12px 16px; border-radius: 4px; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px;">
                    <span style="font-size: 14px; margin-top: 1px;">💡</span>
                    <span style="font-size: 13px; color: #92400e; font-weight: 500; line-height: 1.5;">Note: This Approval Link can be forwarded via WhatsApp, and the customer can conveniently review and approve it directly from their mobile device.</span>
                </div>
            </div>
            
            <!-- Body (Scrollable) -->
            <div style="padding: 0 24px; flex-grow: 1; overflow-y: auto;">
                <style>
                    #${modalId} .frappe-control { margin-bottom: 0 !important; }
                    #${modalId} .control-input { display: block !important; }
                    #${modalId} input.form-control, #${modalId} textarea.form-control {
                        border: none !important; border-bottom: 1px solid #d1d5db !important;
                        border-radius: 0 !important; background-color: transparent !important;
                        box-shadow: none !important; padding: 8px 0 !important; font-size: 14px !important;
                    }
                    #${modalId} input.form-control:focus, #${modalId} textarea.form-control:focus {
                        border-bottom: 2px solid #4f46e5 !important; box-shadow: none !important;
                    }
                    .image-select-card { transition: all 0.2s; border: 2px solid transparent !important; }
                    .image-select-card.selected { border-color: #3b82f6 !important; }
                    .image-select-card .check-overlay {
                        position: absolute; top: 8px; right: 8px; width: 22px; height: 22px;
                        background: white; border: 2px solid #d1d5db; border-radius: 50%;
                        display: flex; align-items: center; justify-content: center; z-index: 10;
                        transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    }
                    .image-select-card.selected .check-overlay {
                        background: #3b82f6; border-color: #3b82f6;
                    }
                    .image-select-card.selected .check-overlay svg {
                        display: block !important;
                    }
                </style>
    
                <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Installation Completed Date <span style="color: #ef4444;">*</span></label>
                        <div id="confirm_delivery_date_container"></div>
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Customer Email ID <span style="color: #ef4444;">*</span></label>
                        <div id="confirm_delivery_email_container"></div>
                    </div>
                </div>
    
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 12px;">Select Images for Customer Approval</label>
                    <div id="confirm_delivery_images_container" style="display: flex; flex-wrap: wrap; gap: 12px; min-height: 100px; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px dashed #d1d5db; justify-content: center; align-items: center;">
                        <span style="color: #6b7280; font-size: 13px;">Loading images...</span>
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Additional Information for Customer</label>
                    <div id="confirm_delivery_additional_info_container"></div>
                </div>
            </div>
            
            <!-- Footer (Sticky) -->
            <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0; background: white;">
                <button id="submit_confirm_delivery_btn" style="padding: 8px 18px; border: none; background: #16a34a; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 500; color: white; transition: all 0.2s;">Confirm Delivery</button>
            </div>
        </div>
    </div>`;

    $('body').append(modalHtml);

    $('#close_confirm_delivery_btn').hover(function() { $(this).css('color', '#111827'); }, function() { $(this).css('color', '#6b7280'); });
    $('#submit_confirm_delivery_btn').hover(function() { $(this).css('background', '#15803d'); }, function() { $(this).css('background', '#16a34a'); });

    let date_control = frappe.ui.form.make_control({
        df: {
            fieldtype: 'Date',
            fieldname: 'temp_date',
        },
        parent: $('#confirm_delivery_date_container'),
        only_input: true
    });
    date_control.make_input();
    date_control.set_value(frm.doc.date || frappe.datetime.get_today());

    let email_control = frappe.ui.form.make_control({
        df: {
            fieldtype: 'Data',
            options: 'Email',
            fieldname: 'temp_email',
        },
        parent: $('#confirm_delivery_email_container'),
        only_input: true
    });
    email_control.make_input();
    email_control.set_value(frm.doc.customer_email_id || '');

    let additional_info_control = frappe.ui.form.make_control({
        df: {
            fieldtype: 'Small Text',
            fieldname: 'temp_additional_info',
        },
        parent: $('#confirm_delivery_additional_info_container'),
        only_input: true
    });
    additional_info_control.make_input();
    additional_info_control.set_value(frm.doc.additional_information_for_customer || '');

    // Fetch and display images
    frappe.call({
        method: 'nexapp.approval_api.get_site_images_for_selection',
        args: { site_name: frm.doc.name },
        callback: function(r) {
            let container = $('#confirm_delivery_images_container');
            container.empty();
            if (!r.message || r.message.length === 0) {
                container.html('<span style="color: #6b7280; font-size: 13px;">No installation images found.</span>');
                return;
            }
            container.css({ 'justify-content': 'flex-start', 'align-items': 'flex-start' });
            r.message.forEach(img => {
                let isChecked = img.visible ? 'checked' : '';
                let selClass = img.visible ? 'selected' : '';
                let imgCard = `
                    <div class="image-select-card ${selClass}" style="position: relative; width: calc(33.33% - 8px); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: #e5e7eb;">
                        <input type="checkbox" class="img-select-checkbox" data-name="${img.name}" ${isChecked} style="display: none;">
                        <div class="check-overlay" style="cursor: pointer;" title="Select Image">
                            <svg style="width: 14px; height: 14px; color: white; display: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <img src="${img.url}" class="preview-img" style="width: 100%; height: 120px; object-fit: cover; display: block; cursor: zoom-in;" title="Click to enlarge" onerror="this.src='/assets/frappe/images/default-image.png'">
                        <div class="label-area" style="padding: 6px 8px; background: white; font-size: 11px; color: #374151; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid #e5e7eb; cursor: pointer;" title="Select Image">
                            ${img.label}
                        </div>
                    </div>
                `;
                container.append(imgCard);
            });

            // Toggle checkbox when clicking the overlay or label
            $('.check-overlay, .label-area').click(function(e) {
                e.stopPropagation();
                let card = $(this).closest('.image-select-card');
                let cb = card.find('input[type="checkbox"]');
                let newState = !cb.prop('checked');
                cb.prop('checked', newState);
                if (newState) {
                    card.addClass('selected');
                } else {
                    card.removeClass('selected');
                }
            });

            // Enlarge image when clicking the image
            $('.preview-img').click(function(e) {
                e.stopPropagation();
                let imgUrl = $(this).attr('src');
                let d = new frappe.ui.Dialog({
                    title: __('Image Preview'),
                    fields: [
                        {
                            fieldtype: 'HTML',
                            fieldname: 'preview_html',
                            options: `<div style="text-align: center;"><img src="${imgUrl}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;"></div>`
                        }
                    ]
                });
                d.$wrapper.find('.modal-dialog').css('max-width', '80vw');
                d.show();
            });
        }
    });

    $('#close_confirm_delivery_btn').click(() => $('#' + modalId).remove());

    $('#submit_confirm_delivery_btn').click(() => {
        let date_val = date_control.get_value();
        let email_val = email_control.get_value();
        let additional_info_val = additional_info_control.get_value();

        if (!date_val || !email_val) {
            frappe.show_alert({message: 'Please fill all mandatory fields', indicator: 'red'});
            return;
        }

        // Collect selected images
        let selected_images = [];
        $('.img-select-checkbox:checked').each(function() {
            selected_images.push($(this).data('name'));
        });

        $('#' + modalId).remove();

        frappe.show_alert({ message: __('Generating approval link...'), indicator: 'blue' });

        // First generate the approval token and web form link
        frappe.call({
            method: 'nexapp.approval_api.send_approval_request',
            args: {
                site_name: frm.doc.name,
                customer_email: email_val,
                selected_images: JSON.stringify(selected_images)
            },
            callback: function(r) {
                if (r.message) {
                    frm.set_value({
                        'web_form_link': r.message,
                        'date': date_val,
                        'customer_email_id': email_val,
                        'additional_information_for_customer': additional_info_val,
                        'site_status': 'Awaiting Customer Approval',
                        'client_installation_approval_status': 'Awaiting Customer Approval'
                    }).then(() => {
                        return frm.save();
                    }).then(() => {
                        frappe.show_alert({
                            message: __('Approval link generated and email sent to customer.'),
                            indicator: 'green'
                        });
                    }).catch(() => {
                        frappe.show_alert({
                            message: __('Failed to save. Please try again.'),
                            indicator: 'red'
                        });
                    });
                }
            },
            error: function() {
                frappe.show_alert({
                    message: __('Failed to generate approval link. Please try again.'),
                    indicator: 'red'
                });
            }
        });
    });
}
// --- END: INSTALLATION ASSIGN & CONFIRM DELIVERY LOGIC ---

// --- START: COPY APPROVAL LINK ---
frappe.ui.form.on('Site', {
    refresh(frm) {
        if (frm.doc.web_form_link) {
            let siteDetailsText = `Site Name: ${frm.doc.site_name || ''}`;
            if (frm.doc.site_id__legal_code && frm.doc.site_id__legal_code !== 'N/A') {
                siteDetailsText += `\nCircuit ID | Legal Code: ${frm.doc.circuit_id || ''} | ${frm.doc.site_id__legal_code}`;
            } else {
                siteDetailsText += `\nCircuit ID: ${frm.doc.circuit_id || ''}`;
            }

            let copyText = `Dear Sir,

Please find the Installation Approval link below for your review. We kindly request you to click the link, verify the installation details, and provide your approval at your earliest convenience.

${siteDetailsText}

Your approval will help us proceed with the next steps and ensure the successful completion of the process.

${frm.doc.web_form_link}

Thank you for your time and support.`;
            
            // Also inject a small button directly below the web_form_link field for quick access
            setTimeout(() => {
                let $wrapper = frm.fields_dict.web_form_link && frm.fields_dict.web_form_link.$wrapper;
                if ($wrapper && $wrapper.find('.btn-copy-link').length === 0) {
                    let copyBtnHTML = `
                        <button class="btn btn-copy-link" title="Copy link" onmouseenter="this.style.color='#dc2626'" onmouseleave="this.style.color='#ef4444'" style="position: absolute; right: 5px; top: 0px; background: transparent; border: none; padding: 4px; cursor: pointer; color: #ef4444; z-index: 10; display: flex; align-items: center; justify-content: center; transition: color 0.2s ease;" type="button">
                            <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    `;
                    let $input = $wrapper.find('input');
                    let $readOnlyVal = $wrapper.find('.control-value');

                    if ($input.length > 0 && $input.is(':visible')) {
                        $input.css('padding-right', '32px');
                        if ($input.parent().css('position') !== 'relative') {
                            $input.wrap('<div style="position: relative; display: block;"></div>');
                        }
                        let centerHTML = copyBtnHTML.replace('top: 0px;', 'top: 50%; transform: translateY(-50%);');
                        $input.parent().append(centerHTML);
                    } else if ($readOnlyVal.length > 0) {
                        $readOnlyVal.css({'position': 'relative', 'padding-right': '32px', 'display': 'block', 'min-height': '24px'});
                        $readOnlyVal.append(copyBtnHTML);
                    }
                    $wrapper.find('.btn-copy-link').on('click', () => {
                        frappe.utils.copy_to_clipboard(copyText);
                    });
                }
            }, 500);
        }
    }
});
// --- END: COPY APPROVAL LINK ---

// --- START: LMS INFO ON CIRCUIT DELIVERY DATE ---
frappe.ui.form.on('Site', {
    lms_information: function(frm) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Lastmile Services Master',
                filters: {
                    circuit_id: frm.doc.name,
                    lms_stage: 'Delivered'
                },
                fields: ['supplier', 'bandwith_type', 'lms_delivery_date', 'billing_start_date']
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    let rows = r.message.map(d => {
                        return `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${d.supplier || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${d.bandwith_type || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${frappe.datetime.str_to_user(d.lms_delivery_date) || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${frappe.datetime.str_to_user(d.billing_start_date) || ''}</td>
                            </tr>
                        `;
                    }).join('');

                    let modalId = 'custom-lms-info-modal';
                    $('#' + modalId).remove();
                    
                    let modalHtml = `
                        <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
                            <div style="background: white; padding: 24px; border-radius: 16px; width: 700px; max-width: 95vw; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: inherit;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">LMS Delivery Information</h3>
                                    <button class="close-modal-btn" style="background: transparent; border: none; font-size: 24px; color: #9ca3af; cursor: pointer; padding: 0; line-height: 1; transition: color 0.2s;">&times;</button>
                                </div>
                                
                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                                        <thead>
                                            <tr style="background-color: #f9fafb;">
                                                <th style="padding: 10px 8px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Supplier</th>
                                                <th style="padding: 10px 8px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Bandwidth Type</th>
                                                <th style="padding: 10px 8px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">LMS Delivery Date</th>
                                                <th style="padding: 10px 8px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Billing Start Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rows}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="margin-top: 16px; font-size: 12px; color: #6b7280; font-style: italic;">
                                    Note: These are the details of the active LMS.
                                </div>
                            </div>
                        </div>
                    `;

                    $('body').append(modalHtml);

                    $('#' + modalId + ' .close-modal-btn').hover(function() { $(this).css('color', '#374151'); }, function() { $(this).css('color', '#9ca3af'); });
                    $('#' + modalId + ' .close-modal-btn').on('click', function() {
                        $('#' + modalId).remove();
                    });
                } else {
                    frappe.show_alert({message: __('No delivered LMS records found for this circuit.'), indicator: 'orange'});
                }
            }
        });
    },
    refresh: function(frm) {
        setTimeout(() => {
            if (frm.fields_dict.lms_information && frm.fields_dict.lms_information.$input) {
                frm.fields_dict.lms_information.$input.addClass('btn-primary').removeClass('btn-default');
            }
        }, 100);
    }
});
// --- END: LMS INFO ON CIRCUIT DELIVERY DATE ---

// --- START: RENDER VIRTUAL LMS INFORMATION TABLE IN SITE ---
frappe.ui.form.on('Site', {
    refresh: function(frm) {
        if (frm.fields_dict['lms_po_issued_html']) {
            render_site_lms_table(frm);
        }
    }
});

async function render_site_lms_table(frm) {
    let wrapper = frm.fields_dict['lms_po_issued_html'].wrapper;
    let circuit_id = frm.doc.circuit_id || frm.doc.name;

    if (!circuit_id) {
        $(wrapper).html('<div class="text-muted" style="padding: 10px; text-align: center;">Please select a Circuit ID.</div>');
        return;
    }

    $(wrapper).html('<div class="text-muted" style="padding: 10px; text-align: center;">Loading LMS information...</div>');

    try {
        let lms_records = await get_site_lms_data(circuit_id);

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

async function get_site_lms_data(circuit_id) {
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
// --- END: RENDER VIRTUAL LMS INFORMATION TABLE IN SITE ---

function show_installation_warning_dialog() {
    let modalId = 'custom-installation-warning-modal';
    $('#' + modalId).remove();

    let modalHtml = `
    <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; backdrop-filter: blur(2px);">
        <div style="background: white; border-radius: 16px; width: 400px; max-width: 90vw; padding: 24px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
            <h3 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #0d0d0d;">Action Required</h3>
            <p style="margin: 0 0 12px 0; font-size: 15px; color: #0d0d0d; line-height: 1.5;">
                This action requires a <b>Submitted Installation Note</b>.
            </p>
            <p style="margin: 0 0 24px 0; font-size: 13px; color: #6e6e80; line-height: 1.5;">
                Please ensure the Installation Note is created and submitted before confirming delivery to the customer.
            </p>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <button id="close_inst_warning_btn" style="padding: 10px 16px; background: #e5e5e5; border: none; border-radius: 20px; font-size: 15px; font-weight: 500; color: #0d0d0d; cursor: pointer; transition: all 0.2s;">
                    OK
                </button>
            </div>
        </div>
    </div>`;

    $('body').append(modalHtml);

    $('#close_inst_warning_btn').on('click', function() {
        $('#' + modalId).fadeOut(200, function() { $(this).remove(); });
    });
    
    $('#' + modalId).hide().fadeIn(200);
}

frappe.ui.form.on('Site', {
    onload_post_render: function(frm) {
        frm._old_circuit_delivery_date = frm.doc.date;
    },
    date: function(frm) {
        if (!frm.doc.date) {
            frm._old_circuit_delivery_date = frm.doc.date;
            return;
        }
        
        if (frm.doc.date === frm._old_circuit_delivery_date) {
            return;
        }
        
        let modalId = 'custom-date-confirm-modal';
        $('#' + modalId).remove();
        
        let formatted_date = frappe.datetime.str_to_user(frm.doc.date);
        
        let modalHtml = `
        <div id="${modalId}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; font-family: inherit; backdrop-filter: blur(2px);">
            <div style="background: white; border-radius: 12px; width: 450px; max-width: 90vw; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <div style="background: #fee2e2; border-radius: 50%; padding: 8px; display: flex; align-items: center; justify-content: center; color: #ef4444;">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">Confirm Circuit Delivery Date</h3>
                </div>
                
                <p style="margin: 0 0 12px 0; font-size: 15px; color: #374151; line-height: 1.5;">
                    You are setting the Circuit Delivery Date to <strong>${formatted_date}</strong>.
                </p>
                
                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                        <strong>Important:</strong> You will have only one opportunity to update this date. This date will be treated as the <strong>Invoice Start Date</strong> and must be approved by the customer.
                    </p>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="cancel_date_btn" style="padding: 10px 18px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s;">
                        Let me think
                    </button>
                    <button id="confirm_date_btn" style="padding: 10px 18px; border: none; background: #2563eb; color: white; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s;">
                        Confirm Date
                    </button>
                </div>
            </div>
        </div>`;
        
        $('body').append(modalHtml);
        
        $('#cancel_date_btn').hover(function() { $(this).css('background', '#f9fafb'); }, function() { $(this).css('background', 'white'); });
        $('#confirm_date_btn').hover(function() { $(this).css('background', '#1d4ed8'); }, function() { $(this).css('background', '#2563eb'); });
        
        $('#cancel_date_btn').click(function() {
            $('#' + modalId).fadeOut(150, function() { $(this).remove(); });
            frm.set_value('date', frm._old_circuit_delivery_date || '');
        });
        
        $('#confirm_date_btn').click(function() {
            $('#' + modalId).fadeOut(150, function() { $(this).remove(); });
            frm._old_circuit_delivery_date = frm.doc.date;
        });
    }
});

// -- START RENDER ODOO UI --
function apply_job_applicant_styles(frm) {
    // 1. Add a unique class to this form's wrapper to safely scope all CSS
    $(frm.wrapper).addClass('custom-site-ui');
    
    
    
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

    // Auto-expand textarea on typing and on page load
    function resize_textarea(el) {
        if (!el) return;
        el.style.setProperty('height', '0px', 'important');
        el.style.setProperty('height', (el.scrollHeight + 2) + 'px', 'important');
    }

    if (!frm.textarea_auto_resize_injected) {
        $(frm.wrapper).on('input', 'textarea', function() {
            let $ctrl = $(this).closest('.frappe-control');
            let fieldtype = $ctrl.attr('data-fieldtype');
            if (fieldtype === 'Small Text' || fieldtype === 'Text') {
                resize_textarea(this);
            }
        });
        frm.textarea_auto_resize_injected = true;
    }

    // Immediately resize all textareas with existing data
    setTimeout(() => {
        $(frm.wrapper).find('.frappe-control[data-fieldtype="Small Text"] textarea, .frappe-control[data-fieldtype="Text"] textarea').each(function() {
            resize_textarea(this);
        });
    }, 500);
    
    // Add mandatory field styling reliably using direct inline styles via interval
    // We use a continuous interval because Link fields (Awesomplete) dynamically redraw their inputs!
    function apply_mandatory_styling() {
        if (!frm || !frm.fields_dict) return;
        $.each(frm.fields_dict, function(fieldname, field) {
            if (field.df && field.df.reqd && field.$wrapper) {
                // Must use find() to get the live input, including read-only divs (.control-value)
                let $inputs = field.$wrapper.find('input, select, textarea, .control-value, .like-disabled-input');
                $inputs.each(function() {
                    this.style.setProperty('border-left', '4px solid #ef4444', 'important');
                });
            } else if (field.$wrapper) {
                let $inputs = field.$wrapper.find('input, select, textarea, .control-value, .like-disabled-input');
                $inputs.each(function() {
                    if (this.style.borderLeftColor === 'rgb(239, 68, 68)' || this.style.borderLeftColor === '#ef4444') {
                        this.style.removeProperty('border-left');
                    }
                });
            }
        });
    }
    apply_mandatory_styling();
    if (frm._mandatory_style_interval) clearInterval(frm._mandatory_style_interval);
    frm._mandatory_style_interval = setInterval(apply_mandatory_styling, 1000);

    // 2. Inject Google Font (Inter) if not present
    if (!$('#odoo_google_font').length) {
        $('head').append('<link id="odoo_google_font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">');
    }

    // 3. Inject Scoped Styles for Job Applicant only (remove old to pick up changes)
    $('#site_ui_styles').remove();
    if (!$('#site_ui_styles').length) {
        $('head').append(`
            <style id="site_ui_styles">
                /* Premium Yellow Style for Interview Summary Dashboard */
                .custom-site-ui .form-dashboard-section.custom {
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
                    border: 1px solid #fde68a !important;
                    box-shadow: 0 1px 3px rgba(251, 191, 36, 0.1) !important;
                    border-radius: 10px !important;
                }
                .custom-site-ui .form-dashboard-section.custom .section-head {
                    color: #92400e !important;
                    font-weight: 600 !important;
                }
                .custom-site-ui .form-dashboard-section.custom .section-body {
                    color: #b45309 !important;
                    font-weight: 500 !important;
                }

                /* Odoo Form Sheet and Layout Styling */
                .custom-site-ui .form-layout, 
                .custom-site-ui .odoo-form-sheet {
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
                .custom-site-ui .form-tabs {
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
                .custom-site-ui .form-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-site-ui .form-tabs .nav-tabs {
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
                .custom-site-ui .form-tabs .nav-tabs::-webkit-scrollbar { display: none !important; }
                
                .custom-site-ui .form-tab-content, 
                .custom-site-ui .tab-content, 
                .custom-site-ui .form-tab-pane, 
                .custom-site-ui .tab-pane {
                    border: none !important;
                    margin-top: 0px !important;
                    padding-top: 0px !important;
                }

                .custom-site-ui .form-tabs .nav-link {
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

                .custom-site-ui .form-tabs .nav-link:hover {
                    color: #3d3566 !important;
                    background: rgba(113, 99, 158, 0.08) !important;
                    border: none !important;
                }

                .custom-site-ui .form-tabs .nav-link.active {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #7b6daa 0%, #635490 100%) !important;
                    border: none !important;
                    font-weight: 700 !important;
                    box-shadow: 0 2px 8px rgba(113, 99, 158, 0.3) !important;
                }

                /* Odoo Section Headings (Subheadings) */
                .custom-site-ui .form-section { 
                    border: none !important; 
                    border-top: none !important; 
                    border-bottom: none !important; 
                    margin-top: 0 !important; 
                    padding-top: 0 !important; 
                }
                .custom-site-ui .form-section .section-head {
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
                .custom-site-ui .form-section:first-child .section-head {
                    margin-top: 4px !important;
                }

                /* Ensure all form inputs, selects, and textareas have consistent font family and underline style */
                .custom-site-ui input[type="text"],
                .custom-site-ui input[type="number"],
                .custom-site-ui input[type="email"],
                .custom-site-ui input[type="password"],
                .custom-site-ui input[type="tel"],
                .custom-site-ui select,
                .custom-site-ui textarea,
                .custom-site-ui .frappe-control input[type="text"],
                .custom-site-ui .frappe-control input[type="number"],
                .custom-site-ui .frappe-control input[type="email"],
                .custom-site-ui .frappe-control input[type="password"],
                .custom-site-ui .frappe-control input[type="tel"],
                .custom-site-ui .frappe-control select,
                .custom-site-ui .frappe-control textarea,
                .custom-site-ui input[readonly]:not([type="checkbox"]):not([type="radio"]),
                .custom-site-ui input[disabled]:not([type="checkbox"]):not([type="radio"]),
                .custom-site-ui .control-value:not([type="checkbox"]):not([type="radio"]),
                .custom-site-ui .like-disabled-input:not([type="checkbox"]):not([type="radio"]) {
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
                .custom-site-ui .frappe-control[data-fieldtype="Small Text"] .control-input {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                .custom-site-ui .frappe-control[data-fieldtype="Small Text"] textarea {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-height: 38px !important;
                    resize: none !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                }

                .custom-site-ui input.error-highlight,
                .custom-site-ui select.error-highlight,
                .custom-site-ui textarea.error-highlight,
                .custom-site-ui .frappe-control input.error-highlight,
                .custom-site-ui .frappe-control select.error-highlight,
                .custom-site-ui .frappe-control textarea.error-highlight {
                    background-color: #fee2e2 !important;
                    border-bottom-color: #ef4444 !important;
                    border-bottom-width: 2px !important;
                }
                
                .custom-site-ui .frappe-control input::placeholder,
                .custom-site-ui input::placeholder {
                    font-size: 12px !important;
                    color: #9ca3af !important;
                    font-weight: 400 !important;
                    white-space: normal !important;
                    text-overflow: ellipsis !important;
                }
                
                /* Adjust Street textarea height to perfectly align Country and State */
                .custom-site-ui [data-fieldname="custom_street"] textarea {
                    height: 136px !important;
                    min-height: 136px !important;
                }
                
                /* Adjust Additional Info textarea height to perfectly align with Expected CTC */
                .custom-site-ui [data-fieldname="additional_info"] textarea,
                .custom-site-ui [data-fieldname="custom_additional_info"] textarea {
                    height: 92px !important;
                    min-height: 92px !important;
                }
                
                .custom-site-ui input[type="text"]:focus,
                .custom-site-ui input[type="number"]:focus,
                .custom-site-ui input[type="email"]:focus,
                .custom-site-ui input[type="password"]:focus,
                .custom-site-ui input[type="tel"]:focus,
                .custom-site-ui select:focus,
                .custom-site-ui textarea:focus,
                .custom-site-ui .frappe-control input[type="text"]:focus,
                .custom-site-ui .frappe-control input[type="number"]:focus,
                .custom-site-ui .frappe-control input[type="email"]:focus,
                .custom-site-ui .frappe-control input[type="password"]:focus,
                .custom-site-ui .frappe-control input[type="tel"]:focus,
                .custom-site-ui .frappe-control select:focus,
                .custom-site-ui .frappe-control textarea:focus {
                    border: 1px solid #ee8d21 !important;
                    background-color: #ffffff !important;
                    box-shadow: 0 0 0 3px rgba(238, 141, 33, 0.15) !important;
                    outline: none !important;
                }
                
                /* Auto-resize textareas require overflow hidden to prevent scrollbar flash */
                .custom-site-ui textarea {
                    overflow-y: hidden !important;
                    resize: none !important;
                }

                /* Odoo Horizontal Field Layout: Label on Left, Input on Right */
                .custom-site-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group {
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 22px !important;
                }
                
                /* Standard / 2-Column Layout Label Width */
                .custom-site-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 210px !important;
                    min-width: 210px !important;
                    margin-bottom: 0 !important;
                    padding-right: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                }

                /* 3-Column / Compact Layout Label Width */
                .custom-site-ui .form-column.col-sm-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-site-ui .form-column.col-md-4 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-site-ui .form-column.col-sm-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix,
                .custom-site-ui .form-column.col-md-3 .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix {
                    width: 110px !important;
                    min-width: 110px !important;
                    padding-right: 8px !important;
                }

                .custom-site-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .clearfix .control-label {
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
                .custom-site-ui .frappe-control[data-fieldtype="Small Text"] .form-group .clearfix .control-label,
                .custom-site-ui .frappe-control[data-fieldtype="Text"] .form-group .clearfix .control-label,
                .custom-site-ui .frappe-control[data-fieldtype="Long Text"] .form-group .clearfix .control-label,
                .custom-site-ui .frappe-control[data-fieldtype="Text Editor"] .form-group .clearfix .control-label {
                    font-weight: 700 !important;
                    font-size: 12.5px !important;
                    color: #1e293b !important;
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: 0.01em !important;
                }

                .custom-site-ui .frappe-control:not([data-fieldtype="Table"]):not([data-fieldtype="HTML"]):not([data-fieldtype="Check"]):not([data-fieldtype="Section Break"]):not([data-fieldtype="Column Break"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .form-group .control-input-wrapper {
                    flex: 1 !important;
                    width: 100% !important;
                }
                
                /* Style read-only / display fields to look exactly like editable Job Applicant inputs */
                .custom-site-ui .frappe-control:not([data-fieldtype="Check"]):not([data-fieldtype="Small Text"]):not([data-fieldtype="Text"]):not([data-fieldtype="Long Text"]):not([data-fieldtype="Text Editor"]):not([data-fieldtype="Code"]) .disp-area:not(.checkbox .disp-area) {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    font-weight: 400 !important;
                    font-size: 13px !important;
                    color: #1e293b !important;
                    background-color: #f1f5f9 !important;
                    border: 1px solid #94a3b8 !important;
                    border-radius: 6px !important;
                    box-shadow: none !important;
                    padding: 8px 12px !important;
                    min-height: 38px !important;
                    line-height: 1.5 !important;
                    display: flex !important;
                    align-items: center !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
            .custom-site-ui .btn-secondary {
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                border: 1px solid #e2e8f0 !important;
                background-color: #ffffff !important;
                color: #475569 !important;
            }
            .custom-site-ui .btn-secondary:hover {
                background-color: #f8fafc !important;
                color: #0f172a !important;
                border-color: #cbd5e1 !important;
            }
            
            /* Mandatory Field Red Left Border - MUST BE AT THE VERY END */
            .custom-site-ui .frappe-control input.is-mandatory-field,
            .custom-site-ui .frappe-control select.is-mandatory-field,
            .custom-site-ui .frappe-control textarea.is-mandatory-field,
            .custom-site-ui .frappe-control.is-mandatory-field input[type="text"],
            .custom-site-ui .frappe-control.is-mandatory-field input,
            .custom-site-ui .frappe-control.is-mandatory-field select,
            .custom-site-ui .frappe-control.is-mandatory-field textarea {
                border-left: 4px solid #ef4444 !important;
            }

            /* BRUTE-FORCE READ-ONLY FIELD BOX STYLING */
            /* We do NOT use display: flex !important here because Frappe hides duplicate .disp-area elements using inline display: none */
            div.custom-site-ui .frappe-control .control-value,
            div.custom-site-ui .frappe-control .disp-area,
            div.custom-site-ui .frappe-control .like-disabled-input {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                font-weight: 400 !important;
                font-size: 13px !important;
                color: #1e293b !important;
                background-color: #f1f5f9 !important;
                border: 1px solid #94a3b8 !important;
                border-radius: 6px !important;
                box-shadow: none !important;
                padding: 8px 12px !important;
                min-height: 38px !important;
                line-height: 1.5 !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
        </style>
    `);
    }
}

// -- END RENDER ODOO UI --
