frappe.ui.form.on('Sales Order', {
    after_save: function(frm) {
        // Check if a Project is already linked to the Sales Order
        if (!frm.doc.project) {
            frappe.call({
                method: 'frappe.client.insert',
                args: {
                    doc: {
                        doctype: 'Project',
                        project_name: `Project for ${frm.doc.customer} - ${frappe.datetime.now_datetime()}`,
                        sales_order: frm.doc.name, // Link Sales Order to the Project
                    }
                },
                callback: function(response) {
                    if (!response.exc) {
                        // Update the Sales Order with the created Project
                        frappe.call({
                            method: 'frappe.client.set_value',
                            args: {
                                doctype: 'Sales Order',
                                name: frm.doc.name,
                                fieldname: 'project',
                                value: response.message.name // Set the project link
                            },
                            callback: function() {
                                frappe.msgprint(`Project "${response.message.project_name}" has been created and linked to this Sales Order.`);
                                frm.reload_doc(); // Reload the form to reflect changes
                            }
                        });
                    }
                }
            });
        } else {
            frappe.msgprint(`A project is already linked to this Sales Order: ${frm.doc.project}`);
        }
    }
});
