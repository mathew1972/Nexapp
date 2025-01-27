frappe.ui.form.on('Feasibility', {
    onload: function (frm) {
        // Apply the filter to the 'customer_primary_contact' field
        frm.set_query('primary_contact', function () {
            return {
                filters: {
                    link_doctype: 'Customer',
                    link_name: frm.doc.customer
                }
            };
        });

        // Apply the filter to the 'alternate_contact' field
        frm.set_query('alternate_contact', function () {
            return {
                filters: {
                    link_doctype: 'Customer',
                    link_name: frm.doc.customer
                }
            };
        });
    },
    primary_contact: function (frm) {
        // Fetch and display contact details for 'primary_contact'
        if (frm.doc.primary_contact) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Contact',
                    name: frm.doc.primary_contact
                },
                callback: function (r) {
                    if (r.message) {
                        const contact = r.message;
                        const html_content = `
                            <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; background: #f9f9f9;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <p><strong>Name:</strong> ${contact.full_name || 'N/A'}</p>
                                        <p><strong>Designation:</strong> ${contact.designation || 'N/A'}</p>
                                        <p><strong>Email Address:</strong> ${contact.email_id || 'N/A'}</p>
                                        <p><strong>Mobile No:</strong> ${contact.mobile_no || 'N/A'}</p>
                                    </div>
                                    <button class="btn btn-link" id="edit_customer_contact_btn">
                                        ✏️ Edit
                                    </button>
                                </div>
                            </div>
                        `;
                        frm.fields_dict.contact_html.$wrapper.html(html_content);

                        // Attach click handler to the "Edit Contact" button
                        frm.fields_dict.contact_html.$wrapper
                            .find('#edit_customer_contact_btn')
                            .on('click', function () {
                                frappe.set_route('Form', 'Contact', contact.name);
                            });
                    }
                }
            });
        } else {
            // Clear the HTML field if no contact is selected
            frm.fields_dict.contact_html.$wrapper.html('');
        }
    },
    alternate_contact: function (frm) {
        // Fetch and display contact details for 'alternate_contact'
        if (frm.doc.alternate_contact) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Contact',
                    name: frm.doc.alternate_contact
                },
                callback: function (r) {
                    if (r.message) {
                        const contact = r.message;
                        const html_content = `
                            <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; background: #f9f9f9;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <p><strong>Name:</strong> ${contact.full_name || 'N/A'}</p>
                                        <p><strong>Designation:</strong> ${contact.designation || 'N/A'}</p>
                                        <p><strong>Email Address:</strong> ${contact.email_id || 'N/A'}</p>
                                        <p><strong>Mobile No:</strong> ${contact.mobile_no || 'N/A'}</p>
                                    </div>
                                    <button class="btn btn-link" id="edit_alternate_contact_btn">
                                        ✏️ Edit
                                    </button>
                                </div>
                            </div>
                        `;
                        frm.fields_dict.contact_html2.$wrapper.html(html_content);

                        // Attach click handler to the "Edit Contact" button
                        frm.fields_dict.contact_html2.$wrapper
                            .find('#edit_alternate_contact_btn')
                            .on('click', function () {
                                frappe.set_route('Form', 'Contact', contact.name);
                            });
                    }
                }
            });
        } else {
            // Clear the HTML field if no contact is selected
            frm.fields_dict.contact_html2.$wrapper.html('');
        }
    },
    refresh: function (frm) {
        // Keep the HTML dynamic and re-render on refresh
        frm.trigger('primary_contact');
        frm.trigger('alternate_contact');
    }
});
