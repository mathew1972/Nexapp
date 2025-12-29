frappe.ui.form.on('Delivery Note', {
    refresh: function(frm) {
        updateSerialSIMButton(frm);
    },
    
    custom_order_type: function(frm) {
        updateSerialSIMButton(frm);
    },
    
    after_save: function(frm) {
        updateSerialSIMButton(frm);
    }
});
//////////////////////////////////////////////////////////////////////////////////////

function updateSerialSIMButton(frm) {
    if (frm.custom_buttons && frm.custom_buttons['Update Serial / SIM']) {
        frm.remove_custom_button(__('Update Serial / SIM'));
    }

    if (frm.doc.custom_order_type === "Service") {
        const allFilled = (frm.doc.packed_items || []).every(item => item.serial_no?.trim());
        if (!allFilled) {
            const btn = frm.add_custom_button(__('Update Serial / SIM'), function () {
                updateSerialAndSIM(frm);
            });

            btn.css({
                'color': 'white',
                'font-weight': 'bold',
                'background-color': '#d9534f'
            });

            btn.removeClass('btn-default btn-primary btn-success btn-danger');
        }
    }
}

function updateSerialAndSIM(frm) {
    if (!frm.doc.packed_items?.length) {
        frappe.msgprint(__('No packed items found in this Delivery Note'));
        return;
    }

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Stock Management',
            filters: { delivery_note_id: frm.doc.name },
            fields: ['name']
        },
        callback: function (r) {
            const stock_name = r.message?.[0]?.name;
            if (!stock_name) {
                frappe.msgprint(__('No Stock Management document found linked to this Delivery Note'));
                return;
            }

            frappe.call({
                method: 'frappe.client.get',
                args: { doctype: 'Stock Management', name: stock_name },
                callback: function (r) {
                    const stock_items = r.message?.stock_management_item || [];
                    const packed_items = frm.doc.packed_items || [];

                    const availableStock = {}; // key = item_code, value = list of serials
                    stock_items.forEach(si => {
                        const key = si.item_code;
                        if (!availableStock[key]) availableStock[key] = [];
                        if (si.serial_no) availableStock[key].push(si.serial_no);
                        else if (si.sim_no) availableStock[key].push(si.sim_no);
                    });

                    let localUpdatesMade = false;

                    packed_items.forEach(pi => {
                        const list = availableStock[pi.item_code];
                        if (list && list.length) {
                            const serial = list.shift(); // take one and remove from available
                            if (pi.serial_no !== serial) {
                                frappe.model.set_value(pi.doctype, pi.name, 'serial_no', serial);
                                localUpdatesMade = true;
                            }
                        }
                    });

                    frm.refresh_field('packed_items');
                    frm.save(null, function () {
                        frappe.show_alert({
                            message: localUpdatesMade
                                ? __('Serial/SIM updated successfully.')
                                : __('Nothing to update. All values already filled.'),
                            indicator: localUpdatesMade ? 'green' : 'orange'
                        }, 5);
                        updateSerialSIMButton(frm);
                    });
                }
            });
        }
    });
}
