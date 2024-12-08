// Copyright (c) 2024, Nexapp Technologies Private Limited and contributors
// For license information, please see license.txt
frappe.ui.form.on('Site', {
    feasibility_information: function (frm) {
        if (frm.doc.circuit_id) {
            // Fetch feasibility data based on circuit_id
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Feasibility',
                    filters: { circuit_id: frm.doc.circuit_id },
                },
                callback: function (r) {
                    if (r.message) {
                        show_horizontal_feasibility_popup(r.message);
                    } else {
                        frappe.msgprint(
                            __('No feasibility data found for the given Circuit ID.')
                        );
                    }
                },
            });
        } else {
            frappe.msgprint(__('Circuit ID is required to fetch feasibility information.'));
        }
    },
});

// Function to display feasibility information in a popup with child table details
function show_horizontal_feasibility_popup(feasibility_data) {
    const dialog = new frappe.ui.Dialog({
        title: __('Feasibility Information'),
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'feasibility_content',
            },
        ],
    });

    // Helper function to format date in DD/MM/YYYY format
    function formatDate(dateString) {
        if (!dateString) return 'N/A'; // Handle null or undefined date values
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Generate the main content
    let content = `
        <div style="padding: 10px; overflow-y: auto; max-height: 70vh;">
            <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
                <div style="flex: 1 1 calc(50% - 15px);">
                    <strong>Static IP:</strong> ${feasibility_data.static_ip || 'N/A'}
                </div>
                <div style="flex: 1 1 calc(50% - 15px);">
                    <strong>LMS Plan:</strong> ${feasibility_data.lms_plan || 'N/A'}
                </div>
                <div style="flex: 1 1 calc(50% - 15px);">
                    <strong>Primary Data Plan:</strong> ${feasibility_data.primary_data_plan || 'N/A'}
                </div>
                <div style="flex: 1 1 calc(50% - 15px);">
                    <strong>Secondary Data Plan:</strong> ${feasibility_data.secondary_data_plan || 'N/A'}
                </div>
                <div style="flex: 1 1 calc(50% - 15px);">
                    <strong>LMS Plan 2:</strong> ${feasibility_data.lms_plan_2 || 'N/A'}
                </div>
                <div style="flex: 1 1 calc(50% - 15px);">
                    <strong>Feasibility Completed Date:</strong> ${formatDate(feasibility_data.feasibility_completed_date)}
                </div>
                <div style="flex: 1 1 calc(50% - 15px);">
                    <strong>Customer Request:</strong> ${formatDate(feasibility_data.customer_request || 'N/A')}
                </div>
                <div style="flex: 1 1 calc(50% - 15px);">
                    <strong>Region:</strong> ${feasibility_data.region || 'N/A'}
                </div>
            </div>
            <h4 style="margin-top: 20px;">LMS Feasibility Details</h4>
            <div style="overflow-x: auto; white-space: nowrap; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="background: #f1f1f1;">
                        <tr>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">LMS Supplier</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Supplier Contact</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Bandwidth Type</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Media</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">OTC</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Static IP Cost</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Billing Terms</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Support Mode</th>                            
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">LMS Bandwidth</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Static IP</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">MRC</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Security Deposit</th>
                            <th style="padding: 10px; border-bottom: 1px solid #ddd;">Billing Mode</th>
                        </tr>
                    </thead>
                    <tbody>`;

    // Append rows for each record in the LMS Feasibility child table
    if (feasibility_data.lms_provider && feasibility_data.lms_provider.length > 0) {
        feasibility_data.lms_provider.forEach(row => {
            content += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.lms_supplier || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.supplier_contact || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.bandwidth_type || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.media || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.otc || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.static_ip_cost || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.billing_terms || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.support_mode || 'N/A'}</td>                    
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.lms_bandwidth || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.static_ip || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.mrc || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.security_deposit || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${row.billing_mode || 'N/A'}</td>
                </tr>`;
        });
    } else {
        content += `
                <tr>
                    <td colspan="13" style="padding: 10px; text-align: center;">No LMS Feasibility data available.</td>
                </tr>`;
    }

    content += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Inject content into the dialog
    dialog.fields_dict.feasibility_content.$wrapper.html(content);

    // Show the dialog
    dialog.show();
};
