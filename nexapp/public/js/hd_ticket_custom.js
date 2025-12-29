
frappe.ui.form.on('HD Ticket', {
    setup: function(frm) {
        frm.prev_status = frm.doc.status;
    },

    refresh: function(frm) {
        const fields = [
            'custom_serial_no', 'custom_model', 'custom_finance_inhouse_escalation', 
            'custom_finance_issue', 'custom_finance_expected_end_date', 'custom_finance_task_details', 
            'custom_finance_task_created', 'custom_department', 'additional_info', 'contact', 
            'via_customer_portal', 'email_account', 'attachment', 'content_type', 'sb_details', 
            'subject', 'description', 'template', 'sla', 'response_by', 'cb', 'agreement_status', 
            'resolution_by', 'service_level_agreement_creation', 'on_hold_since', 'total_hold_time', 
            'response', 'first_response_time', 'first_responded_on', 'avg_response_time', 
            'custom_agent_responded_on', 'resolution_details', 'opening_date', 'opening_time', 
            'resolution_date', 'resolution_time', 'user_resolution_time', 'custom_rca', 
            'feedback_rating', 'feedback_text', 'feedback', 'feedback_extra', 'custom_circuit_id', 
            'custom_site_type', 'custom_impact', 'custom_ticket_category', 'custom_ticket_sub_category', 
            'priority', 'customer', 'custom_inhouse_escalation', 'status', 'ticket_type', 
            'raised_by', 'ticket_split_from', 'custom_channel', 'agent_group', 
            'custom_impact_details', 'custom_on_hold_reason', 'custom_stage', 'custom_site_type',
            'custom_agent','custom_nms_notification','custom_nms_client_notification_cc_1',
            'custom_nms_client_notification_cc_2'
        ];

        fields.forEach(function(field) {
            if (!frm.fields_dict[field]) return;

            const wrapper = frm.fields_dict[field].wrapper;
            const fieldElement = $(wrapper).find('input, textarea, select');
            if (!fieldElement.length) return;

            const baseStyle = {
                'border': '1px solid #ccc',
                'border-radius': '7px',
                'padding': '5px',
                'outline': 'none',
                'background-color': '#ffffff',
                'transition': '0.3s ease-in-out'
            };

            if (frm.fields_dict[field].df.reqd) {
                fieldElement.css({ ...baseStyle, 'border-left': '4px solid red' });
            } else {
                fieldElement.css(baseStyle);
            }

            fieldElement.on('focus', function() {
                const focusStyle = {
                    'border': '1px solid #80bdff',
                    'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                    'background-color': '#ffffff'
                };
                if (frm.fields_dict[field].df.reqd) {
                    $(this).css({ ...focusStyle, 'border-left': '5px solid red' });
                } else {
                    $(this).css(focusStyle);
                }
            });

            fieldElement.on('blur', function() {
                const blurStyle = {
                    'border': '1px solid #ccc',
                    'box-shadow': 'none',
                    'background-color': '#ffffff'
                };
                if (frm.fields_dict[field].df.reqd) {
                    $(this).css({ ...blurStyle, 'border-left': '5px solid red' });
                } else {
                    $(this).css(blurStyle);
                }
            });

            if (fieldElement.is('select')) {
                fieldElement.css({
                    'height': '36px',
                    'line-height': '36px',
                    'padding-top': '4px',
                    'padding-bottom': '4px'
                });
            }
        });
    },

    status: function(frm) {
        if (frm.doc.status === 'Replied') {
            frm.set_value('custom_agent_responded_on', frappe.datetime.now_datetime());
        }

        const statusHandlers = {
            'Closed': this.handleClosedStatus,
            'Resolved': this.handleResolvedStatus
        };

        if (statusHandlers[frm.doc.status] && frm.prev_status !== frm.doc.status) {
            statusHandlers[frm.doc.status](frm);
            return;
        }

        frm.prev_status = frm.doc.status;
    },

    handleClosedStatus: function(frm) {
        const message = frm.doc.custom_channel === 'NMS' 
            ? __("Before closing, ensure NMS meets your satisfaction.")
            : __("Please verify client satisfaction and rating before closing.");

        frappe.confirm(
            message,
            () => {
                frm.prev_status = 'Closed';
                frm.save();
            },
            () => {
                frm.set_value('status', frm.prev_status);
            }
        );
    },

    handleResolvedStatus: function(frm) {
        if (!frm.doc.resolution_details) {
            frappe.msgprint({
                title: __('Resolution Required'),
                indicator: 'red',
                message: __('Please enter Resolution Details before resolving the ticket')
            });
            frm.set_value('status', frm.prev_status);
            return;
        }

        frappe.confirm(
            __('Mark this ticket as Resolved?'),
            () => {
                frm.prev_status = 'Resolved';
                frm.save();
            },
            () => {
                frm.set_value('status', frm.prev_status);
            }
        );
    },

    // ✅ Only validating customer feedback on "Closed"
    before_save: function(frm) {
        if (frm.doc.status === 'Closed' && !frm.doc.feedback_rating) {
            frappe.msgprint(__('Customer feedback is required to close the ticket'));
            frappe.validated = false;
        }
    }
});

/////////////////////////////////////////////////////////////////
/*
frappe.ui.form.on('HD Ticket', {
    after_save(frm) {
        const assignments = frm.get_docinfo().assignments;
        if (assignments && assignments.length > 0 && !frm.doc.custom__assigned_to) {
            frm.set_value('custom__assigned_to', assignments[0].owner);
            frm.set_value('custom_assigned_datetime', frappe.datetime.now_datetime());
        }
    },

    onload_post_render(frm) {
        const assignments = frm.get_docinfo().assignments;
        if (assignments && assignments.length > 0 && !frm.doc.custom__assigned_to) {
            frm.set_value('custom__assigned_to', assignments[0].owner);
            frm.set_value('custom_assigned_datetime', frappe.datetime.now_datetime());
        }
    }
});
*/
///////////////////////////////////////////////////////////////////////////
// LMS Information 

frappe.ui.form.on('HD Ticket', {
    onload: function (frm) {
        frm.set_value('custom_show_lms_information', 0);
        frm.fields_dict.custom_lms_html_table.$wrapper.html('');
    },

    custom_show_lms_information: function (frm) {
        if (frm.doc.custom_show_lms_information == 1) {
            if (!frm.doc.custom_circuit_id) {
                frappe.msgprint(__('LMS records not found for this circuit ID.'));
                frm.set_value('custom_show_lms_information', 0);
                frm.fields_dict.custom_lms_html_table.$wrapper.html('');
                return;
            }
            render_lms_table(frm);
        } else {
            frm.fields_dict.custom_lms_html_table.$wrapper.html('');
        }
    }
});

function render_lms_table(frm) {
    frappe.call({
        method: "nexapp.api.get_lms_records",
        args: { circuit_id: frm.doc.custom_circuit_id },
        callback: function (r) {
            // Show "Not found" message if no records
            if (!r.message || r.message.length === 0) {
                frappe.msgprint({
                    title: __('Not Found'),
                    indicator: 'red',
                    message: __('LMS records not found for this circuit ID.')
                });
                frm.fields_dict.custom_lms_html_table.$wrapper.html('');
                frm.set_value('custom_show_lms_information', 0);
                return;
            }

            let html = `
                <style>
                    .lms-card {
                        border: 2px solid #F6AB11;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        padding: 20px;
                        margin-bottom: 20px;
                        border-radius: 8px;
                        background-color: #fff;
                    }
                    .lms-card h4 {
                        background-color: #F6AB11;
                        color: #000;
                        padding: 8px 12px;
                        border-radius: 4px;
                        font-weight: 800;
                    }
                    .lms-section {
                        background-color: #fff8e6;
                        color: #6b3e00;
                        padding: 6px 10px;
                        border-radius: 4px;
                        margin-top: 15px;
                        font-weight: 600;
                    }
                    table.lms-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    table.lms-table th { background-color: #F6AB11; color: white; padding: 8px; text-align:left; }
                    table.lms-table td { border: 1px solid #ddd; padding: 6px; }
                    table.lms-table tr:nth-child(even) { background-color: #fff8e6; }
                    table.lms-table tr:hover { background-color: #ffe2b3; }
                    .add-contact-btn {
                        background-color: #28a745; color: white; border: none;
                        padding: 6px 10px; border-radius: 4px; font-size: 13px; cursor: pointer;
                        margin-bottom: 8px;
                    }
                    .add-contact-btn:hover { background-color: #218838; }
                    .bot-message { background:#e3f2fd; }
                    .user-message { background:#dcf8c6; float:right; text-align:right; }
                    .error-message { background:#f8d7da; color:#721c24; padding:8px 12px; border-radius:18px; display:inline-block; max-width:80%; margin-bottom:10px; }
                </style>
            `;

            let getVal = (val, fallback) => (val ? val : fallback);

            r.message.forEach((record, index) => {
                let badgeColor = '#28a745';
                if (record.lms_stage === 'Pending') badgeColor = '#fd7e14';
                else if (record.lms_stage === 'Rejected') badgeColor = '#dc3545';
                else if (!record.lms_stage) badgeColor = '#6c757d';

                let badgeHtml = `<span style="background-color:${badgeColor}; color:#fff; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">
                    ${record.lms_stage || 'No Status'}
                </span>`;

                let supplierName = record.lms_feasibility_partner || '';

                html += `
                    <div class="lms-card">
                        <h4>📦 LMS Information – Supplier ${index + 1}</h4>
                        <p>Status: ${badgeHtml}</p>
                        <div class="row" style="margin-top:10px;">
                            <div class="col-md-6"><p><strong>LMS ID:</strong> ${getVal(record.name, 'No LMS ID available')}</p></div>
                            <div class="col-md-6"><p><strong>Supplier:</strong> ${getVal(record.lms_feasibility_partner, 'No supplier available')}</p></div>
                            <div class="col-md-6"><p><strong>Solution:</strong> ${getVal(record.solution, 'No solution provided')}</p></div>
                            <div class="col-md-6"><p><strong>Supplier Contact:</strong> ${getVal(record.supplier_contact, 'No supplier contact available')}</p></div>
                            <div class="col-md-6"><p><strong>Bandwidth Name:</strong> ${getVal(record.lms_brandwith_name, 'No bandwidth info')}</p></div>
                            <div class="col-md-6"><p><strong>Supplier Mobile:</strong> ${getVal(record.suppliernumber, 'No mobile number')}</p></div>
                            <div class="col-md-6"><p><strong>Media:</strong> ${getVal(record.media, 'No media info')}</p></div>
                            <div class="col-md-6"><p><strong>Delivery Date:</strong> ${getVal(record.lms_delivery_date, 'No delivery date')}</p></div>
                        </div>

                        <h5 class="lms-section">💻 LMS Provisioning</h5>
                        <div class="row" style="margin-top:5px;">
                            <div class="col-md-6"><p><strong>Model:</strong> ${getVal(record.mode1, 'No model info')}</p></div>
                            <div class="col-md-6"><p><strong>Static IP:</strong> ${getVal(record.static_ip, 'No static IP available')}</p></div>
                            <div class="col-md-6"><p><strong>Static IP Details:</strong> ${getVal(record.static_ip_1, 'No static IP details')}</p></div>
                            <div class="col-md-6"><p><strong>User ID:</strong> ${getVal(record.user_id, 'No user ID available')}</p></div>                            
                            <div class="col-md-6"><p><strong>Password:</strong> ${getVal(record.password, 'No password available')}</p></div>
                        </div>

                        <h5 class="lms-section">💰 LMS PMT Portal</h5>
                        <div class="row" style="margin-top:5px;">
                            <div class="col-md-6"><p><strong>Payment Mode:</strong> ${getVal(record.payment_mode_1, 'No payment mode info')}</p></div>
                            <div class="col-md-6"><p><strong>Bank:</strong> ${getVal(record.bank, 'No bank info')}</p></div>
                            <div class="col-md-6"><p><strong>URL:</strong> ${getVal(record.url, 'No URL available')}</p></div>
                            <div class="col-md-6"><p><strong>Portal Login ID:</strong> ${getVal(record.portal_login_id, 'No portal login ID')}</p></div>
                            <div class="col-md-6"><p><strong>Portal Login Password:</strong> ${getVal(record.portal_login_password, 'No portal login password')}</p></div>
                        </div>

                        <h5 class="lms-section">📞 Escalation Matrix</h5>
                        <button class="add-contact-btn" data-lms-id="${record.name}" data-supplier="${frappe.utils.escape_html(supplierName)}">➕ Add New Contact</button>
                `;

                if (record.contacts && record.contacts.length > 0) {
                    html += `
                        <table class="lms-table">
                            <thead>
                                <tr>
                                    <th>Level</th>
                                    <th>Contact Name</th>
                                    <th>Contact Phone</th>
                                    <th>Contact Email</th>
                                    <th>Designation</th>
                                    <th>Department</th>
                                </tr>
                            </thead>
                            <tbody>`;
                    record.contacts.forEach(row => {
                        html += `
                            <tr>
                                <td>${getVal(row.level, 'N/A')}</td>
                                <td>${getVal(row.link_zitr, 'N/A')}</td>
                                <td>${getVal(row.contact_phone, 'N/A')}</td>
                                <td>${getVal(row.link_syot, 'N/A')}</td>
                                <td>${getVal(row.designation, 'N/A')}</td>
                                <td>${getVal(row.department, 'N/A')}</td>
                            </tr>`;
                    });
                    html += `</tbody></table>`;
                } else {
                    html += `<p>No contact escalation details available.</p>`;
                }

                html += `</div>`;
            });

            frm.fields_dict.custom_lms_html_table.$wrapper.html(html);

            // Handle add contact button click
            frm.fields_dict.custom_lms_html_table.$wrapper
                .find('.add-contact-btn')
                .off('click')
                .on('click', function() {
                    let lmsId = $(this).data('lms-id');
                    let supplierName = $(this).data('supplier');

                    let d = new frappe.ui.Dialog({
                        title: 'Add New Contact - Chat Assistant',
                        fields: [
                            {
                                fieldname: 'chat_area',
                                fieldtype: 'HTML',
                                options: `<div class="chat-container" style="height:300px;overflow-y:auto;border:1px solid #ddd;padding:15px;margin-bottom:15px;background:#f9f9f9;border-radius:8px;"></div>`
                            },
                            {
                                fieldname: 'chat_input',
                                fieldtype: 'HTML',
                                options: `<div style="display:flex;gap:10px;"><input type="text" class="form-control chat-input" placeholder="Type your answer here..." style="flex:1;"><button class="btn btn-primary btn-send">Send</button></div>`
                            }
                        ],
                        primary_action: false
                    });

                    const steps = [
                        { question: "What is the full name? (First and Last Name required)", field: 'full_name', type: 'text', reqd: 1 },
                        { question: "What is the designation?", field: 'designation', type: 'text', reqd: 1 },
                        { question: "Which department does this contact belong to?", field: 'department', type: 'text', reqd: 1 },
                        { question: "What is the email address?", field: 'email_id', type: 'email', reqd: 1 },
                        { question: "What is the phone number?", field: 'phone', type: 'tel', reqd: 1 },
                        { question: "What escalation level? (Level-1 to Level-5)", field: 'level', type: 'text', reqd: 1 }
                    ];

                    let currentStep = 0;
                    let formValues = {
                        lms_name: lmsId,
                        link_doctype: 'Supplier',
                        link_name: supplierName,
                        custom_type: 'LMS Supplier',
                        is_primary_email: 1,
                        is_primary_mobile_no: 1
                    };

                    addChatMessage("Hello! I'll help you add a new contact.", 'bot');
                    askQuestion();

                    function addChatMessage(message, sender, isError = false) {
                        const chatArea = d.fields_dict.chat_area.$wrapper.find('.chat-container');
                        let messageClass = isError ? 'error-message' : (sender === 'bot' ? 'bot-message' : 'user-message');
                        chatArea.append(`<div class="${messageClass}">${message}</div><div style="clear:both;"></div>`);
                        chatArea.scrollTop(chatArea[0].scrollHeight);
                    }

                    function askQuestion() {
                        if (currentStep >= steps.length) {
                            submitForm();
                            return;
                        }
                        const step = steps[currentStep];
                        addChatMessage(step.question, 'bot');
                        
                        const input = d.fields_dict.chat_input.$wrapper.find('.chat-input');
                        const sendBtn = d.fields_dict.chat_input.$wrapper.find('.btn-send');
                        
                        // Clear previous event handlers to prevent duplicates
                        sendBtn.off('click');
                        input.off('keypress');
                        
                        input.attr('type', step.type);
                        input.val('').focus();
                        
                        // Single handler for both click and enter key
                        function handleSubmission() {
                            // Clear any previous error messages
                            d.fields_dict.chat_area.$wrapper.find('.error-message').remove();
                            processAnswer();
                        }
                        
                        sendBtn.on('click', handleSubmission);
                        input.on('keypress', function(e) {
                            if (e.which === 13) handleSubmission();
                        });

                        function processAnswer() {
                            let value = input.val().trim();
                            let errorMessage = '';
                            let isValid = true;

                            // Validation logic
                            if (step.field === 'full_name') {
                                if (!value) {
                                    errorMessage = "Please enter at least first and last name.";
                                    isValid = false;
                                } else {
                                    let parts = value.split(/\s+/);
                                    if (parts.length < 2) {
                                        errorMessage = "Please enter at least first and last name.";
                                        isValid = false;
                                    } else {
                                        formValues.first_name = parts[0];
                                        formValues.last_name = parts.slice(1).join(' ');
                                    }
                                }
                            } 
                            else if (step.type === 'email') {
                                if (!value) {
                                    errorMessage = "Please enter an email address.";
                                    isValid = false;
                                } else if (!/^\S+@\S+\.\S+$/.test(value)) {
                                    errorMessage = "Please enter a valid email address.";
                                    isValid = false;
                                } else {
                                    formValues[step.field] = value;
                                }
                            }
                            else if (step.type === 'tel') {
                                if (!value) {
                                    errorMessage = "Please enter a phone number.";
                                    isValid = false;
                                } else if (!/^[0-9]{10,15}$/.test(value)) {
                                    errorMessage = "Please enter a valid phone number (10-15 digits).";
                                    isValid = false;
                                } else {
                                    formValues[step.field] = value;
                                }
                            }
                            else if (step.field === 'level') {
                                const allowed = ['Level-1','Level-2','Level-3','Level-4','Level-5'];
                                if (!value) {
                                    errorMessage = "Please select an escalation level (Level-1 to Level-5).";
                                    isValid = false;
                                } else if (!allowed.includes(value)) {
                                    errorMessage = "Please enter exactly as: Level-1 to Level-5 (e.g., Level-3).";
                                    isValid = false;
                                } else {
                                    formValues[step.field] = value;
                                }
                            }
                            else {
                                if (step.reqd && !value) {
                                    errorMessage = "Please provide a value for this field.";
                                    isValid = false;
                                } else {
                                    formValues[step.field] = value;
                                }
                            }

                            if (!isValid) {
                                addChatMessage(errorMessage, 'bot', true);
                                return;
                            }

                            addChatMessage(value, 'user');
                            currentStep++;
                            askQuestion();
                        }
                    }

                    let isSubmitting = false; 
                    function submitForm() {
                        if (isSubmitting) return;
                        isSubmitting = true;

                        addChatMessage("Saving the contact details...", 'bot');
                        frappe.call({
                            method: "nexapp.api.create_contact_and_add_escalation",
                            args: formValues,
                            callback: function(response) {
                                if (response.message && response.message.success) {
                                    addChatMessage("Contact has been successfully added!", 'bot');
                                    setTimeout(() => { d.hide(); render_lms_table(frm); }, 1500);
                                } else {
                                    let errorMsg = response.message && response.message.error ? response.message.error : 'Unknown error';
                                    addChatMessage("Error: " + errorMsg, 'bot', true);
                                }
                                isSubmitting = false;
                            },
                            error: function() {
                                addChatMessage("Error saving the contact.", 'bot', true);
                                isSubmitting = false;
                            }
                        });
                    }
                    d.show();
                });
        }
    });
}
//////////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('HD Ticket', {
    onload: function (frm) {
        const target = frm.timeline.wrapper.get(0);

        if (!target) return;

        const observer = new MutationObserver(function () {
            const timeElements = frm.timeline.wrapper.find('.timeline-head small');
            timeElements.each(function () {
                const $el = $(this);
                const fullTime = $el.attr('title');
                if (fullTime && !$el.hasClass('converted')) {
                    $el.text(fullTime);
                    $el.addClass('converted');
                }
            });
        });

        // Observe changes to child elements inside timeline
        observer.observe(target, {
            childList: true,
            subtree: true,
        });
    }
});
//////////////////////////////////////////////////////////////////////
//Notification
//frappe.realtime.on('hd_ticket_assignment', function(data) {
  //  frappe.show_alert({
  //      message: data.message,
  //      indicator: 'green'
 //   }, 10);

    // Use Frappe’s built-in sound
  //  let audio = new Audio('/assets/frappe/sounds/chime.mp3');
 //   audio.play().catch(e => {
//        console.warn("Sound autoplay failed:", e);
 //   });
//});
////////////////////////////////////////////////////////////////////////////////////

// HD Ticket Auto email to the manager
frappe.listview_settings['HD Ticket'] = {
    onload: function(listview) {
        listview.page.add_inner_button(__('📧 Send Engineer SLA Report Now'), function() {
            frappe.call({
                method: "nexapp.api.send_engineer_ticket_report",
                callback: function(r) {
                    if (!r.exc) {
                        frappe.msgprint("✅ SLA Ticket report sent successfully to mathewsamuel10@gmail.com!");
                    }
                }
            });
        });
    }
};
///////////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('HD Ticket', {
    onload(frm) {
        register_custom_agent_listener(frm);
    },

    refresh(frm) {
        register_custom_agent_listener(frm);
    }
});

// ---------------------------------------------
// Realtime listener: update only custom_agent
// ---------------------------------------------
function register_custom_agent_listener(frm) {
    if (frm.__custom_agent_listener_registered) return;
    frm.__custom_agent_listener_registered = true;

    frappe.realtime.on("custom_agent_updated", function (data) {
        if (
            data.doctype === frm.doctype &&
            data.name === frm.doc.name
        ) {
            // Update field value
            frm.set_value("custom_agent", data.custom_agent);

            // Refresh ONLY this field (no full refresh)
            frm.refresh_field("custom_agent");
        }
    });
}

//////////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('HD Ticket', {
    onload(frm) {
        // Disable auto-save to prevent concurrent save deadlocks
        frm.disable_save();
        frm.enable_save();
    }
});
