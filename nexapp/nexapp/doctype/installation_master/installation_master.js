frappe.ui.form.on('Installation Master', {
    onload: function (frm) {
        frm.set_value('show_lms_information', 0);
        frm.fields_dict.custom_lms_html_table.$wrapper.html('');
    },

    show_lms_information: function (frm) {
        if (frm.doc.show_lms_information == 1) {
            if (!frm.doc.circuit_id) {
                frappe.msgprint(__('LMS records not found for this circuit ID.'));
                frm.set_value('show_lms_information', 0);
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
        args: {
            circuit_id: frm.doc.circuit_id
        },
        callback: function (r) {
            if (!r.message || r.message.length === 0) {
                frappe.msgprint(__('LMS records not found for this circuit ID.'));
                frm.fields_dict.custom_lms_html_table.$wrapper.html('');
                frm.set_value('show_lms_information', 0);
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
                    table.lms-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    table.lms-table th {
                        background-color: #F6AB11;
                        color: white;
                        padding: 8px;
                        text-align: left;
                    }
                    table.lms-table td {
                        border: 1px solid #ddd;
                        padding: 6px;
                    }
                    table.lms-table tr:nth-child(even) {
                        background-color: #fff8e6;
                    }
                    table.lms-table tr:hover {
                        background-color: #ffe2b3;
                    }
                </style>
            `;

            let getVal = (val, fallback) => val ? val : fallback;

            r.message.forEach((record, index) => {
                let badgeColor = '#28a745';
                if (record.lms_stage === 'Pending') badgeColor = '#fd7e14';
                else if (record.lms_stage === 'Rejected') badgeColor = '#dc3545';
                else if (!record.lms_stage) badgeColor = '#6c757d';

                let badgeHtml = `<span style="background-color:${badgeColor}; color:#fff; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">
                    ${record.lms_stage || 'No Status'}
                </span>`;

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

                        <h5 class="lms-section">📞 Escalation Matrix</h5>`;

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

                html += `</div>`; // End card
            });

            frm.fields_dict.custom_lms_html_table.$wrapper.html(html);
        }
    });
}
