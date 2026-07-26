frappe.ui.form.on('Blanket Order', {
    refresh: function(frm) {
        
        // Show button only after document is saved
        if (!frm.is_new()) {
            
            frm.add_custom_button('Create Task', function() {
                
                frappe.new_doc('Task', {
                    subject: 'Task for Blanket Order ' + frm.doc.name,
                    description: 'Created from Blanket Order ' + frm.doc.name,
                    exp_start_date: frappe.datetime.get_today(),
                    status: 'Open',
                    priority: 'Medium',
                    type: 'Blanket Order -Sales Order Request'
                });
                
            }, 'Create');
            
            // Added Information button for fetching Sales Orders and Balance
            frm.add_custom_button(__('Information'), function() {
                frappe.call({
                    method: 'nexapp.api.get_blanket_order_details',
                    args: {
                        blanket_order: frm.doc.name
                    },
                    callback: function(r) {
                        if (r.message) {
                            show_blanket_order_info(r.message);
                        }
                    }
                });
            });
        }
    }
});

function show_blanket_order_info(data) {
    // calculate state wise summary
    let state_summary = {};
    if (data.sales_orders) {
        data.sales_orders.forEach(so => {
            let state = so.place_of_supply || 'Unspecified';
            if (!state_summary[state]) state_summary[state] = 0;
            state_summary[state] += flt(so.qty);
        });
    }

    // create modal container
    let modal_id = 'custom-bo-modal-' + frappe.utils.get_random(5);
    let html = `
        <div id="${modal_id}" class="custom-bo-overlay" onclick="if(event.target === this) this.remove()">
            <div class="custom-bo-modal">
                <div class="custom-bo-header">
                    <h3 class="custom-bo-title">Blanket Order Information</h3>
                    <button class="custom-bo-close" onclick="document.getElementById('${modal_id}').remove()">&times;</button>
                </div>
                <div class="custom-bo-body">
                    <!-- Sales Orders Table -->
                    <div class="custom-bo-section">
                        <h4 class="custom-bo-subtitle">Sales Orders</h4>
                        <div class="custom-bo-table-wrap">
                            <table class="custom-bo-table">
                                <thead>
                                    <tr>
                                        <th>Sales Order No</th>
                                        <th>State Of Supply</th>
                                        <th>Item Code</th>
                                        <th>Item Name</th>
                                        <th>Qty</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;

    if (data.sales_orders && data.sales_orders.length > 0) {
        data.sales_orders.forEach(so => {
            html += `
                <tr>
                    <td><a href="/app/sales-order/${so.parent}">${so.parent}</a></td>
                    <td>${so.place_of_supply || '-'}</td>
                    <td>${so.item_code}</td>
                    <td>${so.item_name}</td>
                    <td>${so.qty}</td>
                    <td>${format_currency(so.amount)}</td>
                </tr>
            `;
        });
    } else {
        html += `<tr><td colspan="6" class="text-center">No Sales Orders found.</td></tr>`;
    }

    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Layout for Balance and State-wise -->
                    <div class="custom-bo-row">
                        <div class="custom-bo-col">
                            <div class="custom-bo-section">
                                <h4 class="custom-bo-subtitle">Blanket Order Item Balance</h4>
                                <div class="custom-bo-table-wrap">
                                    <table class="custom-bo-table">
                                        <thead>
                                            <tr>
                                                <th>Item Code</th>
                                                <th>Item Name</th>
                                                <th>Ordered</th>
                                                <th>Total</th>
                                                <th>Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
    `;

    if (data.bo_items && data.bo_items.length > 0) {
        data.bo_items.forEach(item => {
            let balance = flt(item.qty) - flt(item.ordered_qty);
            html += `
                <tr>
                    <td>${item.item_code}</td>
                    <td>${item.item_name}</td>
                    <td>${item.ordered_qty}</td>
                    <td>${item.qty}</td>
                    <td><span class="custom-bo-badge ${balance > 0 ? 'badge-success' : 'badge-danger'}">${balance}</span></td>
                </tr>
            `;
        });
    } else {
        html += `<tr><td colspan="5" class="text-center">No Items found.</td></tr>`;
    }

    html += `
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div class="custom-bo-col">
                            <div class="custom-bo-section">
                                <h4 class="custom-bo-subtitle">State-wise Summary</h4>
                                <div class="custom-bo-table-wrap">
                                    <table class="custom-bo-table">
                                        <thead>
                                            <tr>
                                                <th>State Of Supply</th>
                                                <th>Total Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
    `;

    let states = Object.keys(state_summary);
    if (states.length > 0) {
        states.forEach(state => {
            html += `
                <tr>
                    <td>${state}</td>
                    <td>${state_summary[state]}</td>
                </tr>
            `;
        });
    } else {
        html += `<tr><td colspan="2" class="text-center">No Data</td></tr>`;
    }

    html += `
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .custom-bo-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.6);
                backdrop-filter: blur(4px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: bo-fade-in 0.3s ease;
                font-family: 'Inter', sans-serif;
            }
            .custom-bo-modal {
                background: #ffffff;
                width: 85%;
                max-width: 1100px;
                max-height: 90vh;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: bo-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .custom-bo-header {
                padding: 16px 24px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
            }
            .custom-bo-title {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #0f172a;
            }
            .custom-bo-close {
                background: transparent;
                border: none;
                font-size: 24px;
                line-height: 1;
                color: #64748b;
                cursor: pointer;
                transition: color 0.2s;
            }
            .custom-bo-close:hover {
                color: #ef4444;
            }
            .custom-bo-body {
                padding: 24px;
                overflow-y: auto;
                background: #ffffff;
            }
            .custom-bo-section {
                margin-bottom: 24px;
            }
            .custom-bo-subtitle {
                font-size: 13px;
                font-weight: 600;
                color: #475569;
                margin: 0 0 12px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .custom-bo-table-wrap {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
            }
            .custom-bo-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                color: #334155;
            }
            .custom-bo-table th {
                background: #f1f5f9;
                font-weight: 600;
                text-align: left;
                padding: 10px 16px;
                color: #475569;
                border-bottom: 1px solid #e2e8f0;
            }
            .custom-bo-table td {
                padding: 10px 16px;
                border-bottom: 1px solid #e2e8f0;
            }
            .custom-bo-table tbody tr:last-child td {
                border-bottom: none;
            }
            .custom-bo-table tbody tr:hover {
                background: #f8fafc;
            }
            .custom-bo-table a {
                color: #2563eb;
                text-decoration: none;
                font-weight: 500;
            }
            .custom-bo-table a:hover {
                text-decoration: underline;
            }
            .custom-bo-row {
                display: flex;
                gap: 24px;
            }
            .custom-bo-col {
                flex: 1;
            }
            .custom-bo-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: 600;
                font-size: 11px;
            }
            .badge-success { background: #dcfce7; color: #166534; }
            .badge-danger { background: #fee2e2; color: #991b1b; }
            .text-center { text-align: center; }

            @keyframes bo-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes bo-slide-up {
                from { opacity: 0; transform: translateY(20px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        </style>
    `;

    $(html).appendTo('body');
}
