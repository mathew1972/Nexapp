frappe.ui.form.on('LMS Request', {
    refresh: function(frm) {
        if (!frm.doc.lms_id) return;

        frappe.call({
            method: 'nexapp.api.get_latest_invoice_for_lms',
            args: {
                lms_id: frm.doc.lms_id
            },
            callback: function(r) {
                if (r.message) {
                    const invoice = r.message;
                    frm.set_value('supplier_invoice_id', invoice.name);
                    frm.refresh_field('supplier_invoice_id');
                    // frappe.msgprint(__('Updated Supplier Invoice ID: ') + invoice.name); // Removed popup
                }
            }
        });
    }
});
///////////////////////////////////////////////////////////////////////////
//PO CAncel Task Create

frappe.ui.form.on('LMS Request', {
    refresh: function (frm) {
        // Clear any existing buttons
        frm.page.clear_inner_toolbar();

        // Add the standalone red button
        frm.page.add_inner_button('PO Cancel (Task)', function () {
            frappe.confirm(
                'Are you sure you want to create a PO Cancel Task?',
                function () {
                    frappe.call({
                        method: "nexapp.api.create_po_cancel_task",
                        args: { lms_request: frm.doc.name },
                        callback: function (r) {
                            if (!r.exc) {
                                frappe.msgprint("PO Cancel Task created and PO Stage updated.");
                                frm.reload_doc();
                            }
                        }
                    });
                },
                function () {
                    frappe.msgprint("Action cancelled.");
                }
            );
        });

        // Style the button to be red with white bold text
        setTimeout(() => {
            frm.page.wrapper.find('.btn-inner-group .btn').each(function () {
                const $btn = $(this);
                if ($btn.text().trim() === 'PO Cancel (Task)') {
                    $btn.addClass('btn-danger');
                    $btn.css({
                        'color': 'white',
                        'font-weight': 'bold',
                        'border-color': '#d43f3a',
                        'background-color': '#d9534f'
                    });
                }
            });
        }, 100);
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////
///LMS Request Calculation
frappe.ui.form.on('LMS Request Item', {
    mrc: function(frm, cdt, cdn) {
        calculate_arc(frm, cdt, cdn);
    },
    billing_mode: function(frm, cdt, cdn) {
        calculate_arc(frm, cdt, cdn);
    },
    otc: function(frm, cdt, cdn) {
        calculate_arc(frm, cdt, cdn);
    },
    static_ip_cost: function(frm, cdt, cdn) {
        calculate_arc(frm, cdt, cdn);
    },
    security_deposit: function(frm, cdt, cdn) {
        calculate_arc(frm, cdt, cdn);
    }
});

function calculate_arc(frm, cdt, cdn) {
    var child = locals[cdt][cdn];

    var mrc = flt(child.mrc || 0);
    var otc = flt(child.otc || 0);
    var static_ip_cost = flt(child.static_ip_cost || 0);
    var security_deposit = flt(child.security_deposit || 0);

    var arc = (mrc * 12) + otc + static_ip_cost + security_deposit;

    frappe.model.set_value(cdt, cdn, 'arc', arc);
}
