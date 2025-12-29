frappe.ui.form.on('PO Management', {
    refresh: function (frm) {
        // Add Dropdown Group with Child Buttons
        frm.add_custom_button(__('📝 Create PO'), function () {

            // Prevent duplicate PO creation
            if (frm.doc.po_number) {
                frappe.msgprint({
                    title: __('PO Already Created'),
                    message: __('A Purchase Order has already been created: ') + frm.doc.po_number,
                    indicator: 'orange'
                });
                return;
            }

            // Confirmation dialog before creating PO
            frappe.confirm(
                __('Are you sure you want to create a Purchase Order?'),
                () => {
                    frappe.call({
                        method: 'frappe.client.insert',
                        args: {
                            doc: {
                                doctype: 'Purchase Order',
                                supplier: frm.doc.supplier,
                                custom_supplier_group: frm.doc.supplier_group,
                                circuit_id: frm.doc.circuit_id,
                                custom_lms_id: frm.doc.lms_id,
                                schedule_date: frappe.datetime.get_today(),
                                items: frm.doc.po_management_item.map(item => ({
                                    item_code: item.item_code,
                                    rate: item.item_rate,
                                    qty: item.qty,                                    
                                    schedule_date: frappe.datetime.get_today(),
                                    circuit_id: frm.doc.circuit_id
                                }))
                            }
                        },
                        callback: function (res) {
                            if (res.message && res.message.name) {
                                const po = res.message;
                                
                                // Update PO Management fields
                                frm.set_value('po_number', po.name);
                                frm.set_value('po_status', 'PO Created (Draft)');
                                frm.set_value('po_date', po.transaction_date);
                                frm.set_value('po_amount', po.rounded_total);

                                frm.save().then(() => {
                                    frappe.msgprint({
                                        title: __('Success'),
                                        message: __('Purchase Order {0} has been created successfully.', [po.name]),
                                        indicator: 'green'
                                    });
                                });
                            } else {
                                frappe.msgprint({
                                    title: __('Error'),
                                    message: __('An error occurred while creating the Purchase Order.'),
                                    indicator: 'red'
                                });
                            }
                        }
                    });
                },
                __('Confirm PO Creation'),
                __('Create')
            );
        }, __('PO Management'));

        frm.add_custom_button(__('💸 Advance Payment'), function () {
            frappe.msgprint('Advance Payment Clicked');
        }, __('PO Management'));

        frm.add_custom_button(__('❌ PO Cancel'), function () {
            frappe.msgprint('PO Cancel Clicked');
        }, __('PO Management'));

        frm.add_custom_button(__('✏️ PO Amend'), function () {
            frappe.msgprint('PO Amend Clicked');
        }, __('PO Management'));

        // Optional: Style the parent dropdown button
        setTimeout(() => {
            const dropdowns = [...document.querySelectorAll('.btn-group .btn-dropdown')];
            const poBtn = dropdowns.find(btn => btn.textContent.includes("PO Management"));
            if (poBtn) {
                poBtn.style.backgroundColor = "#000";
                poBtn.style.color = "#fff";
                poBtn.style.fontWeight = "bold";
            }
        }, 300);
    }
});
