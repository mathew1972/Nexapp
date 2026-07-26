frappe.ui.form.on("Delivery Note", {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1 && frm.doc.packed_items && frm.doc.packed_items.length > 0 && !frm.doc.is_return) {
            frm.add_custom_button(__('Return Packed Item'), function() {
                open_return_drawer(frm);
            });
        }
        
        if (!frm.is_new() && frm.doc.docstatus === 1) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Customer Asset Return",
                    filters: { delivery_note: frm.doc.name, docstatus: 1 },
                    fields: ["name", "return_date", "return_reason"],
                    limit: 100
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        let html = `<table class="table table-bordered" style="margin-bottom:0;">
                            <thead>
                                <tr>
                                    <th>Return ID</th>
                                    <th>Return Date</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>
                            <tbody>`;
                        r.message.forEach(row => {
                            html += `<tr>
                                <td><a href="/app/customer-asset-return/${row.name}">${row.name}</a></td>
                                <td>${row.return_date}</td>
                                <td>${row.return_reason}</td>
                            </tr>`;
                        });
                        html += `</tbody></table>`;
                        frm.dashboard.add_section(
                            frappe.render_template(`
                                <div class="form-dashboard-section" style="margin-top:15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                                    <h6 class="form-dashboard-section-title">Returned Components</h6>
                                    <div class="section-body">
                                        ${html}
                                    </div>
                                </div>
                            `)
                        );
                    }
                }
            });
        }
    }
});

function open_return_drawer(frm) {
    const wrapper_id = 'custom-return-drawer-wrapper';
    $(`#${wrapper_id}`).remove();
    
    let html = `
    <div id="${wrapper_id}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: flex-end; align-items: stretch; animation: fadeIn 0.3s; font-family: 'Inter', sans-serif;">
        <div style="width: 650px; max-width: 100%; background: #f9fafb; height: 100%; box-shadow: -5px 0 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; animation: slideInRight 0.3s; overflow-y: auto;">
            
            <div style="padding: 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #ffffff; position: sticky; top: 0; z-index: 10;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #1e293b;">Return Packed Items</h3>
                <button id="close-return-drawer" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; padding: 0;">&times;</button>
            </div>
            
            <div style="padding: 24px; flex-grow: 1;">
                <div style="background: #ffffff; padding: 16px; border-radius: 10px; margin-bottom: 24px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                        <div><span style="color: #64748b;">Delivery Note:</span> <strong style="color: #0f172a;">${frm.doc.name}</strong></div>
                        <div><span style="color: #64748b;">Customer:</span> <strong style="color: #0f172a;">${frm.doc.customer || '-'}</strong></div>
                        <div style="grid-column: span 2;"><span style="color: #64748b;">Circuit ID:</span> <strong style="color: #0f172a;">${frm.doc.custom_dn_circuit_id || '-'}</strong></div>
                    </div>
                </div>
                
                <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1e293b; border-left: 3px solid #71639e; padding-left: 10px;">Return Details</h4>
                <div style="background: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #475569;">Return Date <span style="color: red;">*</span></label>
                            <input type="date" id="return-date" value="${frappe.datetime.get_today()}" class="odoo-input">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #475569;">Return Reason <span style="color: red;">*</span></label>
                            <select id="return-reason" class="odoo-input">
                                <option value="">Select Reason...</option>
                                <option value="Excess Material">Excess Material</option>
                                <option value="Wrong Dispatch">Wrong Dispatch</option>
                                <option value="Customer Cancellation">Customer Cancellation</option>
                                <option value="Faulty Item">Faulty Item</option>
                                <option value="Site Closure">Site Closure</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #475569;">Remarks</label>
                        <textarea id="return-remarks" rows="2" class="odoo-input" style="resize: vertical;"></textarea>
                    </div>
                </div>

                <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1e293b; border-left: 3px solid #71639e; padding-left: 10px;">Select Items to Return</h4>
                <div id="return-items-container" style="margin-bottom: 24px; min-height: 100px;">
                    <div style="text-align: center; padding: 20px; color: #94a3b8;">Loading items...</div>
                </div>
                
            </div>
            
            <div style="padding: 20px 24px; background: #ffffff; border-top: 1px solid #e5e7eb; position: sticky; bottom: 0; z-index: 10;">
                <button id="submit-return-btn" style="width: 100%; padding: 12px; background: #71639e; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(113, 99, 158, 0.25);">
                    Submit Selected Returns
                </button>
            </div>
        </div>
    </div>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .odoo-input {
            width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-left: 3px solid #71639e;
            border-radius: 6px; font-size: 13px; font-family: 'Inter', sans-serif; outline: none; background: #fcfbfe; transition: all 0.2s;
        }
        .odoo-input:focus { border-color: #71639e; box-shadow: 0 0 0 3px rgba(113, 99, 158, 0.15); background: #fff; }
        .item-row { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .item-row:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .item-row.selected { border-color: #71639e; box-shadow: 0 0 0 1px #71639e; background: #faf9fd; }
        .item-row.disabled { opacity: 0.6; background: #f8fafc; }
        #submit-return-btn:hover { background: #5b4f80; box-shadow: 0 4px 6px rgba(113, 99, 158, 0.35); transform: translateY(-1px); }
    </style>
    `;
    
    $(document.body).append(html);
    
    $('#close-return-drawer').on('click', function() {
        $(`#${wrapper_id}`).remove();
    });
    
    // Store serial numbers so we don't query multiple times
    let item_serials = {};
    
    frappe.call({
        method: 'nexapp.api.get_dn_packed_items',
        args: { delivery_note: frm.doc.name },
        callback: function(r) {
            let container = $('#return-items-container');
            container.empty();
            
            if (!r.message || r.message.length === 0) {
                container.html('<div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">No items available for return.</div>');
                return;
            }
            
            r.message.forEach((item, index) => {
                let is_available = item.qty_available > 0;
                let row_id = `item-row-${index}`;
                
                let card = $(`
                    <div id="${row_id}" class="item-row ${is_available ? '' : 'disabled'}" data-item="${item.item_code}" data-name="${item.item_name}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex-grow: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <input type="checkbox" class="item-checkbox" ${is_available ? '' : 'disabled'} style="width: 16px; height: 16px; accent-color: #71639e; cursor: pointer; margin:0;">
                                    <strong style="color: #1e293b; font-size: 14px;">${item.item_name}</strong>
                                </div>
                                <span style="background: ${is_available ? '#f3f1f9' : '#f1f5f9'}; color: ${is_available ? '#71639e' : '#64748b'}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 24px;">
                                    ${item.item_code}
                                </span>
                            </div>
                            <div style="text-align: right; font-size: 12px; color: #64748b;">
                                <div>Delivered: <strong style="color: #334155;">${item.qty_delivered}</strong></div>
                                <div>Returned: <strong style="color: #334155;">${item.qty_returned}</strong></div>
                                <div style="color: ${is_available ? '#16a34a' : '#dc2626'}; margin-top: 2px;">Available: <strong>${item.qty_available}</strong></div>
                            </div>
                        </div>
                        
                        ${is_available ? `
                        <div class="serial-selector-wrapper" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0; margin-left: 24px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #475569;">Select Serial Number <span style="color: red;">*</span></label>
                            <select class="item-serial-select odoo-input" style="border-left: 3px solid #71639e;">
                                <option value="">Loading serials...</option>
                            </select>
                        </div>
                        ` : ''}
                    </div>
                `);
                
                if (is_available) {
                    let checkbox = card.find('.item-checkbox');
                    let wrapper = card.find('.serial-selector-wrapper');
                    let select = card.find('.item-serial-select');
                    
                    checkbox.on('change', function() {
                        if ($(this).is(':checked')) {
                            card.addClass('selected');
                            wrapper.slideDown(200);
                            
                            if (!item_serials[item.item_code]) {
                                select.html('<option value="">Loading serials...</option>');
                                frappe.call({
                                    method: 'nexapp.api.get_dn_serial_numbers',
                                    args: { delivery_note: frm.doc.name, item_code: item.item_code },
                                    callback: function(r2) {
                                        select.empty();
                                        select.append('<option value="">Select a serial number...</option>');
                                        if (r2.message && r2.message.length > 0) {
                                            item_serials[item.item_code] = r2.message;
                                            r2.message.forEach(sn => select.append(`<option value="${sn}">${sn}</option>`));
                                        } else {
                                            select.append('<option value="" disabled>No available serials found</option>');
                                        }
                                    }
                                });
                            } else {
                                select.empty();
                                select.append('<option value="">Select a serial number...</option>');
                                item_serials[item.item_code].forEach(sn => select.append(`<option value="${sn}">${sn}</option>`));
                            }
                        } else {
                            card.removeClass('selected');
                            wrapper.slideUp(200);
                            select.val('');
                        }
                    });
                }
                
                container.append(card);
            });
        }
    });
    
    $('#submit-return-btn').on('click', function() {
        let return_date = $('#return-date').val();
        let return_reason = $('#return-reason').val();
        let remarks = $('#return-remarks').val();
        
        if (!return_date) { frappe.msgprint("Please select a Return Date."); return; }
        if (!return_reason) { frappe.msgprint("Please select a Return Reason."); return; }
        
        let items_to_return = [];
        let has_errors = false;
        
        $('.item-row.selected').each(function() {
            let item_code = $(this).data('item');
            let item_name = $(this).data('name');
            let serial_no = $(this).find('.item-serial-select').val();
            
            if (!serial_no) {
                frappe.msgprint(`Please select a serial number for <b>${item_name}</b>.`);
                has_errors = true;
                return false; 
            }
            
            items_to_return.push({
                item_code: item_code,
                item_name: item_name,
                serial_no: serial_no
            });
        });
        
        if (has_errors) return;
        
        if (items_to_return.length === 0) {
            frappe.msgprint("Please check at least one item to return.");
            return;
        }
        
        let confirm_modal_id = 'custom-confirm-modal';
        $(`#${confirm_modal_id}`).remove();
        
        let confirm_html = `
        <div id="${confirm_modal_id}" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 999999; backdrop-filter: blur(2px);">
            <div style="background: #fff; width: 400px; border-radius: 16px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: 'Inter', sans-serif;">
                <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827;">Confirm Return?</h3>
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
                    This will process <b>${items_to_return.length}</b> item(s) for return.<br>
                    They will be automatically moved back to <b>Stores - NTPL</b>.
                </p>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="cancel-return-btn" style="padding: 8px 18px; border: 1px solid #d1d5db; background: #fff; color: #374151; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancel</button>
                    <button id="confirm-return-btn" style="padding: 8px 18px; border: none; background: #ef4444; color: #fff; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Confirm</button>
                </div>
            </div>
        </div>
        `;
        
        $('body').append(confirm_html);
        
        $('#cancel-return-btn').hover(
            function() { $(this).css('background', '#f3f4f6'); },
            function() { $(this).css('background', '#fff'); }
        ).on('click', function() {
            $(`#${confirm_modal_id}`).remove();
        });
        
        $('#confirm-return-btn').hover(
            function() { $(this).css('background', '#dc2626'); },
            function() { $(this).css('background', '#ef4444'); }
        ).on('click', function() {
            $(`#${confirm_modal_id}`).remove();
            
            let btn = $('#submit-return-btn');
            btn.prop('disabled', true).text('Processing Returns...');
            
            frappe.call({
                method: 'nexapp.api.submit_asset_return',
                args: {
                    data: JSON.stringify({
                        delivery_note: frm.doc.name,
                        items: items_to_return,
                        return_date: return_date,
                        return_reason: return_reason,
                        remarks: remarks
                    })
                },
                callback: function(r) {
                    btn.prop('disabled', false).text('Submit Selected Returns');
                    if (r.message && r.message.status === 'success') {
                        frappe.show_alert({message: "Items returned successfully!", indicator: "green"});
                        $(`#${wrapper_id}`).remove();
                        frm.reload_doc();
                    }
                },
                error: function() {
                    btn.prop('disabled', false).text('Submit Selected Returns');
                }
            });
        });
    });
}
