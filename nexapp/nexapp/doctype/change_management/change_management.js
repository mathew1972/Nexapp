frappe.ui.form.on('Change Management', {

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