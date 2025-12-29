frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        const fields = [
            'site_name', 'customer', 'customer_request', 'feasibility_completed_date', 
            'region', 'circuit_id', 'feasibility_type', 
            'exiting_circuit_id', 'feasibility_status', 'feasibility_remark', 
            'reason_for_partial_feasible', 'reason_for_high_commercials', 'reason_for_not_feasible', 
            'solution', 'static_ip', 'no_of_static_ip_required', 
            'primary_data_plan', 'secondary_data_plan', 
            'site_type', 'street', 'city', 'country', 
            'longitude', 'site_id__legal_code', 'pincode', 
            'district', 'state', 'latitude', 'primary_contact', 
            'contact_html', 'alternate_contact', 'contact_html2', 
            'description', 'lms_provider','sales_order', 'sales_order_date', 
            'amended_from', 'solution_code', 'managed_services', 'config_type',
            'solution_name', 'address', 'organization', 'territory', 'customer_type',
            'address_street','order_type', "feaseibility_from", "party_name", "contact_person", "primary_contact_mobile",
	        "email", "alternate_contact_person", "alternate_contact_mobile", "secondary_email",
            'central_spoke','mobile','central_email','sales_person'	
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                if (frm.fields_dict[field].df.reqd) {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-left': '4px solid red',
                        'border-radius': '7px',
                        'padding': '5px',
                        'outline': 'none',
                        'background-color': '#ffffff',
                        'transition': '0.3s ease-in-out'
                    });
                } else {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-radius': '7px',
                        'padding': '5px',
                        'outline': 'none',
                        'background-color': '#ffffff',
                        'transition': '0.3s ease-in-out'
                    });
                }

                fieldElement.on('focus', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #80bdff',
                            'border-left': '5px solid red',
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                            'background-color': '#ffffff'
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #80bdff',
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                            'background-color': '#ffffff'
                        });
                    }
                });

                fieldElement.on('blur', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #ccc',
                            'border-left': '5px solid red',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #ccc',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    }
                });
            }
        });
    }
});

//before_save: function (frm) {
  //  const statuses = ['Feasible', 'Partial Feasible', 'Not Feasible', 'High Commercials'];
   // if (statuses.includes(frm.doc.feasibility_status)) {
        // Update the feasibility_completed_date to the current date and time
    //    frm.set_value('feasibility_completed_date', frappe.datetime.now_datetime());
    //} else if (frm.doc.feasibility_status === 'Pending') {
      //  frappe.throw(__('The document cannot be submitted as the status is "Pending".'));
    //}
//},

//customer_request: function (frm) {
  //  if (frm.doc.customer_request) {
  //      const today = frappe.datetime.now_date(); // Get today's date
  //      if (frm.doc.customer_request > today) {
  //          frappe.msgprint(__('The Customer Request date cannot be greater than today.'));
  //          frm.set_value('customer_request', null); // Clear the field
   //     }
  //  }
//}

///////POC Customer ////////////////////////////////////////////////////////////////

frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        if (frm.doc.customer_type === "POC Customer" && frm.doc.docstatus !== 2) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Site",
                    filters: {
                        circuit_id: frm.doc.name
                    },
                    limit_page_length: 1
                },
                callback: function(r) {
                    const site_exists = r.message && r.message.length > 0;

                    if (site_exists) {
                        // If site already exists, show "POC Assigned" button
                        let btn = frm.add_custom_button("POC Assigned", () => {
                            frappe.msgprint("POC already assigned.");
                        });
                        btn.removeClass("btn-default")
                            .addClass("btn-success")
                            .css({
                                "color": "white",
                                "font-weight": "bold"
                            });
                    } else {
                        // If site does not exist, show "POC Assign" button
                        let btn = frm.add_custom_button("POC Assign", () => {
                            frappe.confirm(
                                "Are you sure you want to assign this POC Customer to Project?",
                                function () {
                                    frappe.call({
                                        method: "nexapp.api.create_site_from_feasibility",
                                        args: {
                                            doc: frm.doc.name
                                        },
                                        callback: function (res) {
                                            if (!res.exc) {
                                                frappe.msgprint(`Site created successfully: ${res.message}`);
                                                
                                                // Change button color to green after site creation
                                                btn.removeClass("btn-danger")
                                                   .addClass("btn-success")
                                                   .text("POC Assigned")
                                                   .css({
                                                       "color": "white",
                                                       "font-weight": "bold"
                                                   });
                                            }
                                        }
                                    });
                                }
                            );
                        });
                        btn.removeClass("btn-default")
                            .addClass("btn-danger")
                            .css({
                                "color": "white",
                                "font-weight": "bold"
                            });
                    }
                }
            });
        }
    }
});
/////////////////////////////////////////////////////////////////////////////
// Feasibility calculation

frappe.ui.form.on('LMS Feasibility', {
    mrc: function(frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    },
    billing_mode: function(frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    },
    otc: function(frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    },
    security_deposit: function(frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    },
    static_ip_cost: function(frm, cdt, cdn) {
        calculate_arc_and_validity(frm, cdt, cdn);
    }
});

function calculate_arc_and_validity(frm, cdt, cdn) {
    var child = locals[cdt][cdn];

    // Safely convert all financial fields to float
    var mrc = flt(child.mrc || 0);
    var otc = flt(child.otc || 0);
    var security_deposit = flt(child.security_deposit || 0);
    var static_ip_cost = flt(child.static_ip_cost || 0);

    // Calculate ARC
    var arc = (mrc * 12) + otc + security_deposit + static_ip_cost;
    frappe.model.set_value(cdt, cdn, 'arc', arc);

    // Set validity based on billing_mode
    let validity_map = {
        "MRC": 30,
        "QRC": 90,
        "HRC": 180,
        "ARC": 365
    };

    if (child.billing_mode && validity_map[child.billing_mode]) {
        frappe.model.set_value(cdt, cdn, 'validity', validity_map[child.billing_mode]);
    }
}

//////////////////////////////////////////////////////////////////////////////
/*frappe.ui.form.on('Feasibility', {
    primary_contact_mobile: function(frm) {
        if (!frm.doc.primary_contact_mobile) return;

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Feasibility",
                filters: {
                    primary_contact_mobile: frm.doc.primary_contact_mobile,
                    name: ["!=", frm.doc.name] // exclude current doc
                },
                limit_page_length: 1
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    frappe.msgprint({
                        title: __('Duplicate Mobile Number'),
                        message: __('This mobile number is already in use; each Site requires a unique number.'),
                        indicator: 'red'
                    });
                    frm.set_value("primary_contact_mobile", "");
                }
            }
        });
    }
});*/
/////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('LMS Feasibility', {
    lms_status: function(frm, cdt, cdn) {
        const d = frappe.msgprint({
            title: __('Reminder'),
            message: __('⚠️ Select one Primary Supplier'),
            indicator: 'orange'
        });

        // Auto close the popup after 4 seconds
        setTimeout(() => {
            if (d && d.hide) {
                d.hide();
            }
        }, 4000);
    }
});
/////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        // Inject red info icon into 'info' HTML field
        frm.fields_dict.info.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_feasibility_info_icon" title="Feasibility Guidelines" style="cursor: pointer; font-size: 29px; color: #FF0000;">
                    <i class="fa fa-info-circle"></i>
                </a>
            </div>
        `);

        // Attach click event to show dialog
        frm.fields_dict.info.$wrapper.find('#show_feasibility_info_icon').on('click', function () {
            show_feasibility_guidelines();
        });
    }
});

function show_feasibility_guidelines() {
    let html = `
        <div style="padding: 10px; line-height: 1.6;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">📘 Feasibility Guidelines</h4>
            <ul style="padding-left: 20px;">
                <li>✅ No feasibility should be carried out without first contacting and confirming with the supplier.</li>
                <li>✅ Ensure the supplier has presence and capability in the specified site area.</li>
                <li>✅ Always try to get the most competitive market rate.</li>
                <li>✅ If any communication is done via email, please attach the email(s) as supporting evidence.</li>
            </ul>
        </div>
    `;

    let dialog = new frappe.ui.Dialog({
        title: 'Feasibility Assessment Guidelines',
        size: 'small',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'info_html',
                options: html
            }
        ],
        primary_action_label: 'Close',
        primary_action() {
            dialog.hide();
        }
    });

    dialog.show();
}
///////////////////////////////////////////////////////////////////////
//Supplier Pool
frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        // Default to blue icon
        let iconColor = '#dc3545'; // red by default (no data)

        // Check if pincode is present
        if (frm.doc.pincode) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Lastmile Services Master",
                    filters: [
                        ["Lastmile Services Master", "pin_code", "=", frm.doc.pincode],
                        ["Lastmile Services Master", "lms_stage", "in", ["PO Released", "In process", "Delivered"]]
                    ],
                    fields: ["supplier"]
                },
                callback: function(response) {
                    let data = response.message || [];

                    // Deduplicate by supplier
                    let seen_suppliers = new Set();
                    for (let row of data) {
                        if (row.supplier) {
                            seen_suppliers.add(row.supplier);
                        }
                    }

                    if (seen_suppliers.size > 0) {
                        iconColor = '#28a745'; // green if supplier(s) found
                    }

                    render_supplier_icon(iconColor);
                }
            });
        } else {
            render_supplier_icon(iconColor); // no pincode, render red icon
        }

        function render_supplier_icon(iconColor) {
            frm.fields_dict.supplier_pool.$wrapper.html(`
                <div style="margin-top: 10px; text-align: center;">
                    <a id="show_supplier_pool_icon" title="Supplier Pool Info" style="cursor: pointer; font-size: 22px; color: ${iconColor};">
                        <i class="fa fa-users"></i>
                    </a>
                    <div style="margin-top: 6px; font-weight: 600; color: #007BFF;">
                        Supplier Pool
                    </div>
                </div>
            `);

            // Icon click handler
            frm.fields_dict.supplier_pool.$wrapper.find('#show_supplier_pool_icon').on('click', function () {
                if (!frm.doc.pincode) {
                    frappe.msgprint({
                        title: "Missing Info",
                        message: "Please enter Pincode before fetching Supplier Pool.",
                        indicator: "red"
                    });
                    return;
                }

                frappe.call({
                    method: "frappe.client.get_list",
                    args: {
                        doctype: "Lastmile Services Master",
                        filters: [
                            ["Lastmile Services Master", "pin_code", "=", frm.doc.pincode],
                            ["Lastmile Services Master", "lms_stage", "in", ["PO Released", "In process", "Delivered"]]
                        ],
                        fields: ["supplier", "supplier_contact", "suppliernumber", "email_address", "bandwith_type", "pin_code", "city"]
                    },
                    callback: function(response) {
                        let data = response.message;

                        if (!data || data.length === 0) {
                            frappe.msgprint({
                                title: "Supplier Pool",
                                message: "No matching Supplier Pool found.",
                                indicator: "orange"
                            });
                            return;
                        }

                        // Deduplicate by supplier
                        let seen_suppliers = new Set();
                        let unique_data = [];

                        for (let row of data) {
                            if (row.supplier && !seen_suppliers.has(row.supplier)) {
                                seen_suppliers.add(row.supplier);
                                unique_data.push(row);
                            }
                        }

                        if (unique_data.length === 0) {
                            frappe.msgprint({
                                title: "Supplier Pool",
                                message: "No unique suppliers found.",
                                indicator: "orange"
                            });
                            return;
                        }

                        // Header values
                        let header_city = unique_data[0].city || 'Unknown City';
                        let header_pin_code = unique_data[0].pin_code || frm.doc.pincode || '';

                        let html = `
                            <div style="padding: 16px; line-height: 1.6; font-family: Arial, sans-serif;">
                                <div style="font-weight: bold; font-size: 16px; color: #333; margin-bottom: 12px;">
                                    📍 Suppliers in <span style="color: #007BFF;">${header_city}</span> (PIN Code: <strong>${header_pin_code}</strong>) as per our Supplier Pool:
                                </div>
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                    <thead>
                                        <tr style="background-color: #343A40; color: white;">
                                            <th style="padding: 10px; border: 1px solid #dee2e6;">Supplier Name</th>
                                            <th style="padding: 10px; border: 1px solid #dee2e6;">Contact Person</th>
                                            <th style="padding: 10px; border: 1px solid #dee2e6;">Mobile</th>
                                            <th style="padding: 10px; border: 1px solid #dee2e6;">Email</th>
                                            <th style="padding: 10px; border: 1px solid #dee2e6;">Bandwidth</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                        `;

                        unique_data.forEach((row, i) => {
                            let bgColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
                            html += `
                                <tr style="background-color: ${bgColor};">
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${row.supplier || ''}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${row.supplier_contact || ''}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${row.suppliernumber || ''}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${row.email_address || ''}</td>
                                    <td style="padding: 10px; border: 1px solid #dee2e6;">${row.bandwith_type || ''}</td>
                                </tr>
                            `;
                        });

                        html += `</tbody></table></div>`;

                        let dialog = new frappe.ui.Dialog({
                            title: '🌐 LMS Supplier Pool',
                            size: 'large',
                            fields: [
                                {
                                    fieldtype: 'HTML',
                                    fieldname: 'table_html',
                                    options: html
                                }
                            ],
                            primary_action_label: 'Close',
                            primary_action() {
                                dialog.hide();
                            }
                        });

                        dialog.show();
                    }
                });
            });
        }
    }
});
///////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Feasibility', {
    validate: function(frm) {
        const status = frm.doc.feasibility_status;
        if (status === "Feasible" || status === "High Commercials") {
            frm.set_value('feasibility_completed_date', frappe.datetime.now_datetime());
        }
    }
});
///////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        // If feasibility_created_date is not set, set it from the document's creation datetime
        if (!frm.doc.feasibility_created_date && frm.doc.creation) {
            frm.set_value('feasibility_created_date', frm.doc.creation);
        }
    }
});
////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        // Inject info icon button into HTML field "info2"
        frm.fields_dict.info2.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_feasibility_info_icon" title="Feasibility Info" style="cursor: pointer; font-size: 29px; color: #FF0000;">
                    <i class="fa fa-info-circle"></i>
                </a>
            </div>
        `);

        // Add click event for showing dialog
        frm.fields_dict.info2.$wrapper.find('#show_feasibility_info_icon').on('click', function() {
            show_feasibility_info_dialog();
        });
    }
});

// Function to show feasibility info dialog
function show_feasibility_info_dialog() {
    const feasibility_html = `
        <div style="padding: 10px; line-height: 1.6; max-height: 500px; overflow-y: auto;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">📌 Importance of Feasibility in Project Implementation</h4>
            <p>Feasibility is the first and most critical step toward successful project implementation. It sets the foundation for all future activities, and therefore, the information collected during this phase must be accurate and complete.</p>
            <p>One of the most important aspects of the feasibility process is capturing the <b>Local Branch Information</b> for each site. This ensures smooth coordination and timely execution during the implementation phase.</p>

            <h5 style="margin-top: 20px;">🔑 Key Points:</h5>
            <ul style="margin-left: 20px;">
                <li>Feasibility should always begin with accurate data collection.</li>
                <li>Every site must have complete and verified Local Branch Information.</li>
                <li>Local Branch details are essential for:
                    <ul>
                        <li>Coordinating site visits</li>
                        <li>Planning installation timelines</li>
                        <li>Communicating with local stakeholders</li>
                        <li>Avoiding unnecessary delays</li>
                    </ul>
                </li>
                <li>Incorrect or missing information at this stage can lead to:
                    <ul>
                        <li>Project delays</li>
                        <li>Miscommunication with suppliers and local teams</li>
                        <li>Increased costs due to rework or travel</li>
                    </ul>
                </li>
                <li>Ensure all feasibility reports are reviewed and validated before proceeding to the next step.</li>
            </ul>

            <p style="margin-top: 20px;"><b>Accurate feasibility data, especially Local Branch Information, plays a major role in the success of project execution. Let’s make this step as strong and reliable as possible.</b></p>
        </div>
    `;

    const dialog = new frappe.ui.Dialog({
        title: 'Feasibility Information',
        size: 'large',
        fields: [
            {
                fieldname: 'feasibility_html',
                fieldtype: 'HTML',
                options: feasibility_html
            }
        ],
        primary_action_label: 'Close',
        primary_action() {
            dialog.hide();
        }
    });

    dialog.show();
}

/////////////////////////////////////////////////////////////////////////
//Adding New Supplier To LMS Request
frappe.ui.form.on('Feasibility', {
    refresh(frm) {
        frm.page.clear_primary_action();

        if (!frm.doc.lms_provider) return;

        let button_shown = false;

        frm.doc.lms_provider.forEach(row => {
            const isFeasibilityMatch = ["Feasible", "High Commercials"].includes(frm.doc.feasibility_status);
            const isLmsStatusMatch = ["Feasible", "High Commercials"].includes(row.lms_status);
            const isNewSupplier = row.feasibility_type === "New Supplier";
            const isRequestIdBlank = !row.lms_request_id;

            if (isFeasibilityMatch && isLmsStatusMatch && isNewSupplier && isRequestIdBlank && !button_shown) {
                frm.page.add_button('Add New Supplier', () => {
                    frappe.confirm(
                        'Are you sure you want to add this LMS Supplier to LMS Request?',
                        () => {
                            frappe.call({
                                method: 'nexapp.nexapp.doctype.feasibility.feasibility.add_lms_supplier',
                                args: {
                                    feasibility_name: frm.doc.name,
                                    row_name: row.name
                                },
                                callback: function (r) {
                                    if (!r.exc) {
                                        frappe.msgprint({
                                            message: __('LMS Supplier added successfully to LMS Request'),
                                            indicator: 'green'
                                        });
                                        frm.reload_doc();
                                    }
                                }
                            });
                        }
                    );
                }).css({
                    'background-color': '#FF0000',
                    'color': '#FFFFFF',
                    'font-weight': 'bold',
                    'border-radius': '6px'
                });

                button_shown = true;
            }
        });
    }
});
//////////////////////////////////////////////////////////////////////////////
//Feasibility LMS Contact
frappe.ui.form.on('LMS Feasibility', {
    contact: function (frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        // 1. Ensure lms_supplier is set
        if (!row.lms_supplier) {
            frappe.msgprint("Please select an LMS Supplier before proceeding.");
            return;
        }

        // 2. Fetch LMS Feasibility Partner (client-side only)
        frappe.db.get_doc('LMS Feasibility Partner', row.lms_supplier)
            .then(partner => {
                if (!partner || !partner.table_onol || partner.table_onol.length === 0) {
                    frappe.msgprint("No LMS Contacts found under this supplier.");
                    return;
                }

                // 3. Create contact table HTML with scrollable container
                let html = `
                    <div style="overflow-x: auto; max-width: 100%;">
                        <table class="table table-bordered" style="min-width: 100%;">
                            <thead>
                                <tr>
                                    <th>Level</th>
                                    <th>Name</th>
                                    <th>Mobile</th>
                                    <th>Email</th>
                                    <th>Set</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                for (const contact of partner.table_onol) {
                    html += `
                        <tr>
                            <td>${contact.lavel || ''}</td>
                            <td>${contact.name1 || ''}</td>
                            <td>${contact.mobile || ''}</td>
                            <td>${contact.email || ''}</td>
                            <td>
                                <input type="radio" name="select_contact" value="${contact.name1}" data-contact='${JSON.stringify(contact)}'>
                            </td>
                        </tr>
                    `;
                }

                html += `</tbody></table></div>`;

                // 4. Show popup dialog
                const dialog = new frappe.ui.Dialog({
                    title: "Select Contact",
                    fields: [
                        {
                            fieldname: 'contact_html',
                            fieldtype: 'HTML',
                            options: html
                        }
                    ],
                    primary_action_label: "Select",
                    primary_action: function () {
                        const selected = dialog.$wrapper.find('input[name="select_contact"]:checked');
                        if (selected.length > 0) {
                            const selectedData = JSON.parse(selected.attr('data-contact'));

                            // 5. Set values in same row
                            frappe.model.set_value(cdt, cdn, 'supplier_contact', selectedData.name1);
                            frappe.model.set_value(cdt, cdn, 'email_id', selectedData.email);
                            frappe.model.set_value(cdt, cdn, 'mobile', selectedData.mobile);

                            dialog.hide();
                        } else {
                            frappe.msgprint("Please select a contact before submitting.");
                        }
                    }
                });

                dialog.show();
            })
            .catch(() => {
                frappe.msgprint("Invalid LMS Supplier or unable to fetch partner.");
            });
    }
});
/////////////////////////////////////////////////////////////////
