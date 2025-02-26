frappe.ui.form.on('Site', {
    onload: function (frm) {
        // Set query filters for contacts and address
        frm.set_query('primary_contact', function () {
            return {
                filters: {
                    link_doctype: 'Customer',
                    link_name: frm.doc.customer
                }
            };
        });

        frm.set_query('alternate_contact', function () {
            return {
                filters: {
                    link_doctype: 'Customer',
                    link_name: frm.doc.customer
                }
            };
        });

        frm.set_query('address', function () {
            return {
                filters: [
                    ['Dynamic Link', 'link_doctype', '=', 'Customer'],
                    ['Dynamic Link', 'link_name', '=', frm.doc.customer]
                ]
            };
        });
    },

    primary_contact: function (frm) {
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
                        frm.fields_dict.contact_html.$wrapper
                            .find('#edit_customer_contact_btn')
                            .on('click', function () {
                                frappe.set_route('Form', 'Contact', contact.name);
                            });
                    }
                }
            });
        } else {
            frm.fields_dict.contact_html.$wrapper.html('');
        }
    },

    alternate_contact: function (frm) {
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
                        frm.fields_dict.contact_html2.$wrapper
                            .find('#edit_alternate_contact_btn')
                            .on('click', function () {
                                frappe.set_route('Form', 'Contact', contact.name);
                            });
                    }
                }
            });
        } else {
            frm.fields_dict.contact_html2.$wrapper.html('');
        }
    },

    address: function (frm) {
        if (frm.doc.address) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Address',
                    name: frm.doc.address
                },
                callback: function (r) {
                    if (r.message) {
                        const address = r.message;
                        const html_content = `
                            <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; background: #f9f9f9;">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div>
                                        <p><strong>Address Line 1:</strong> ${address.address_line1 || 'N/A'}</p>
                                        <p><strong>Address Line 2:</strong> ${address.address_line2 || 'N/A'}</p>
                                        <p><strong>City:</strong> ${address.city || 'N/A'}</p>
                                        <p><strong>State:</strong> ${address.state || 'N/A'}</p>
                                    </div>
                                    <div style="text-align: right;">
                                        <p><strong>Country:</strong> ${address.country || 'N/A'}</p>
                                        <p><strong>Pincode:</strong> ${address.pincode || 'N/A'}</p>
                                        <button class="btn btn-link" id="edit_custom_address_btn">✏️ Edit</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        frm.fields_dict.address_html.$wrapper.html(html_content);
                        frm.fields_dict.address_html.$wrapper
                            .find('#edit_custom_address_btn')
                            .on('click', function () {
                                frappe.set_route('Form', 'Address', address.name);
                            });
                    }
                }
            });
        } else {
            frm.fields_dict.address_html.$wrapper.html('');
        }
    },

    refresh: function (frm) {
        frm.trigger('primary_contact');
        frm.trigger('alternate_contact');
        frm.trigger('address');
    }
});