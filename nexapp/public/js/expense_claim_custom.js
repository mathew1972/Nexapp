frappe.ui.form.on('Expense Claim', {
    refresh: function(frm) {
        const fields = [
            'expenses_and_advances_tab', 'naming_series', 'employee', 'employee_name', 
            'department', 'company', 'column_break_5', 'expense_approver', 
            'approval_status', 'expense_details', 'expenses', 'taxes_and_charges_sb', 
            'taxes', 'advance_payments_sb', 'advances', 'transactions_section', 
            'total_sanctioned_amount', 'total_taxes_and_charges', 'total_advance_amount', 
            'column_break_17', 'grand_total', 'total_claimed_amount', 'total_amount_reimbursed', 
            'accounting_details_tab', 'accounting_details', 'posting_date', 'is_paid', 
            'mode_of_payment', 'payable_account', 'column_break_24', 'clearance_date', 
            'remark', 'accounting_dimensions_section', 'project', 'dimension_col_break', 
            'cost_center', 'more_info_tab', 'more_details', 'status', 'task', 
            'amended_from', 'column_break_xdzn', 'delivery_trip', 'vehicle_log', 
            'dashboard_tab','custom_expense_type','custom_purpose','custom_customer',
            'custom_trip','custom_reason_for_rejection'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                // Apply styles based on whether the field is required
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

                // Apply focus and blur effects
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
////////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Expense Claim', {
    custom_expense_type(frm) {
        update_child_expense_type_and_grade(frm);
    },
    custom__employee_grade(frm) {
        update_child_expense_type_and_grade(frm);
    },
    onload_post_render(frm) {
        update_child_expense_type_and_grade(frm);
    }
});

frappe.ui.form.on('Expense Claim Detail', {
    expenses_add: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.custom_expense_type_c = frm.doc.custom_expense_type;
        row.custom_employee_sub_grade = frm.doc.custom__employee_grade;
        frm.refresh_field('expenses');
    }
});

function update_child_expense_type_and_grade(frm) {
    const expense_type = frm.doc.custom_expense_type;
    const employee_grade = frm.doc.custom__employee_grade;

    (frm.doc.expenses || []).forEach(row => {
        row.custom_expense_type_c = expense_type;
        row.custom_employee_sub_grade = employee_grade;
    });

    frm.refresh_field('expenses');
}

/////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Expense Claim Detail', {
    mode(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    },
    km(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    }
});

function calculate_amount(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.mode === "Two Wheeler") {
        frappe.model.set_value(cdt, cdn, "amount", row.km * 4);
    } else if (row.mode === "Car-Local") {
        frappe.model.set_value(cdt, cdn, "amount", row.km * 8);
    } else {
        frappe.model.set_value(cdt, cdn, "amount", 0);  // fallback if mode not matched
    }
}
////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Expense Claim Detail', {
    custom_classification_of_cities: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (!row.expense_type) {
            frappe.msgprint(__('Please select Expense Claim Type Tour first.'));
            return;
        }

        if (!row.custom_employee_sub_grade) {
            frappe.msgprint(__('Please select Employee Sub Grade first.'));
            return;
        }

        if (!row.custom_city_category) {
            frappe.msgprint(__('Please select City Category (A or B) first.'));
            return;
        }

        frappe.db.get_value('Lodging And Boarding', { cadre: row.custom_employee_sub_grade }, ['class_a_cities', 'class_b_cities'])
            .then(r => {
                let data = r.message;

                if (data) {
                    if (row.custom_city_category === "A") {
                        row.custom_lb_amount_limit = data.class_a_cities;
                    } else if (row.custom_city_category === "B") {
                        row.custom_lb_amount_limit = data.class_b_cities;
                    } else {
                        frappe.msgprint(__('Invalid City Category. Setting limit to 0.'));
                        row.custom_lb_amount_limit = 0;
                    }

                    frm.fields_dict['expenses'].grid.refresh();
                } else {
                    frappe.msgprint(__('No Lodging And Boarding record found for sub grade: {0}', [row.custom_employee_sub_grade]));
                }
            })
            .catch(err => {
                frappe.msgprint(__('Error fetching Lodging And Boarding record.'));
                console.error(err);
            });
    }
});

///////////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Expense Claim Detail', {
    amount: calculate_limits,
    custom_no_of_days: calculate_limits,
    custom_no_of_person: calculate_limits,
    custom_lb_amount_limit: calculate_limits
});

function calculate_limits(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.amount && row.custom_lb_amount_limit) {
        let no_of_days = row.custom_no_of_days && row.custom_no_of_days > 0 ? row.custom_no_of_days : 1;
        let no_of_person = row.custom_no_of_person && row.custom_no_of_person > 0 ? row.custom_no_of_person : 1;

        let total_limit = row.custom_lb_amount_limit * no_of_days * no_of_person;

        // Always set custom_amount_meets_policy_limit
        frappe.model.set_value(cdt, cdn, 'custom_amount_meets_policy_limit', total_limit);

        if (row.amount > total_limit) {
            let exceeds_amount = row.amount - total_limit;
            frappe.model.set_value(cdt, cdn, 'custom_exceeds_company_policy_limit', exceeds_amount);
            frappe.model.set_value(cdt, cdn, 'sanctioned_amount', total_limit);
        } else {
            frappe.model.set_value(cdt, cdn, 'custom_exceeds_company_policy_limit', 0);
            frappe.model.set_value(cdt, cdn, 'sanctioned_amount', row.amount);
        }
    } else if (row.amount) {
        // In case no limit, set sanctioned_amount = amount
        frappe.model.set_value(cdt, cdn, 'sanctioned_amount', row.amount);
        frappe.model.set_value(cdt, cdn, 'custom_exceeds_company_policy_limit', 0);
        frappe.model.set_value(cdt, cdn, 'custom_amount_meets_policy_limit', 0);
    }
}
////////////////////////////////////////////////////////////////////////////

frappe.ui.form.on('Expense Claim', {
    refresh: function(frm) {

        // --- Safety Check ---
        if (!frm.fields_dict.custom_info) {
            console.warn("Field 'custom_info' does not exist in this DocType.");
            return;
        }

        // Inject Font Awesome info icon into custom_info field
        frm.fields_dict.custom_info.$wrapper.html(`
            <div style="text-align: right; margin-right: 20%;">
                <a id="show_policy_icon" title="Expense Policy Info" style="cursor: pointer; font-size: 29px; color: #FF0000;">
                    <i class="fa fa-info-circle"></i>
                </a>
            </div>
        `);

        // Add click event safely
        frm.fields_dict.custom_info.$wrapper.find('#show_policy_icon').on('click', function() {
            show_policy_dialog();
        });
    }
});

// Function to show policy dialog
function show_policy_dialog() {

    let policy_html = `
        <div style="padding: 10px; line-height: 1.6; max-height: 500px; overflow-y: auto;">
            <h4 style="font-weight: bold; margin-bottom: 10px;">🎯 Objective</h4>
            <p>This policy is to ensure that employees of Nexapp Technologies Pvt Ltd are fully reimbursed for any expenses incurred towards official travel or while participating in business deals. The objective is to provide common guidance for employees across levels as well as administrators, covering how an employee can claim and be reimbursed for reasonable and authorized expenses incurred while doing business for the company.</p>
            
            <h4 style="font-weight: bold; margin-top: 20px; margin-bottom: 10px;">🏙️ Local Expense (Base City)</h4>
            <p><br>🗂️ <b>CCR requirement</b><br>CCR (Client Call Report) is mandatory for all local expenses.</p>
            <p><br>🚕 <b>Preferred modes</b><br>Prefer public transport or prepaid taxi/auto with bills.</p>
            <p><br>🏍️ <b>Own vehicle reimbursement</b><br>₹4/km for two-wheeler, ₹8/km for car.</p>
            <p><br>💰 <b>Monthly limit</b><br>₹10,000 (metro cities), ₹8,000 (non-metro cities).</p>
            <p><br>☕ <b>Miscellaneous expenses</b><br>Up to ₹100 per day without bill.</p>
            <p><br>🗓️ <b>Submission timelines</b><br>Expenses must be claimed within 30 days; bills to be submitted within 15 days.</p>
            <p><br>📄 <b>Bill requirements</b><br>
                <span style="font-weight: bold;">
                Original printed bills are required. However, if a small vendor cannot provide one, a handwritten bill along with a payment screenshot may be attached. All invoices must include the vendor’s mobile number.
                </span>
            </p>

            <h4 style="font-weight: bold; margin-top: 20px; margin-bottom: 10px;">✈️ Tour Expense (Outside Base Location)</h4>
            <p><br>💼 <b>Travel Request mandatory</b><br>Employee must get travel budget approval from Reporting Manager at least one week before travel (or at least 2 days before urgent meetings).</p>
            <p><br>🗺️ <b>City classification</b><br>
                Class A: Delhi NCR, Kolkata, Chennai, Mumbai, Hyderabad, Bangalore, Pune, Ahmedabad, Chandigarh, capitals of all states/UTs.<br>
                Class B: Rest of India.
            </p>
            <p><br>👤 <b>Cadre designations</b><br>
                M: Up to AGM<br>
                S: Up to AVP<br>
                L: VP & above
            </p>
            <p><br>🚉 <b>Travel mode eligibility</b><br>
                M: III AC train or budget airline economy<br>
                S: II AC train or budget airline economy<br>
                L: Economy class in any airline<br>
                Prefer economical options (e.g., train or bus if under 12 hours).
            </p>
            <p><br>🏨 <b>Lodging (hotel stay) limits</b><br>
                M cadre: ₹2,500 (A), ₹2,000 (B)<br>
                S cadre: ₹3,500 (A), ₹3,000 (B)<br>
                L cadre: ₹5,000 (A), ₹4,000 (B)
                <span style="display:block; margin-top: 5px; color: #888; font-style: italic;">(Exclusive of all taxes)</span>
            </p>
            <p><br>💵 <b>Other daily expenses (includes meals)</b><br>
                M cadre: ₹1,500 (A), ₹1,000 (B)<br>
                S cadre: ₹2,000 (A), ₹1,500 (B)<br>
                L cadre: At actuals, subject to approval
                <span style="display:block; margin-top: 5px; color: #888; font-style: italic;">(Exclusive of all taxes)</span>
            </p>
            <p><br>🍽️ <b>Meals</b><br>Covered under "Other costs" daily limits.</p>
            <p><br>🍬 <b>Miscellaneous expenses</b><br>Up to ₹100 per day without bill (self-attested).</p>
            <p><br>🛎️ <b>Travel booking</b><br>After approval, employees must arrange their own logistics (tickets, hotels, etc.).</p>
            <p><br>🧾 <b>GST invoice</b><br>It is mandatory to mention and claim GST wherever applicable (e.g., tickets, lodging, etc.).
            Invoices must be issued in the name of Nexapp Technologies Private Limited with GST Number: 27AAECN7911J1Z8.
            </p>
            <p><br>🚚 <b>New Joinee Relocation/Transfer Policy</b><br>Applies if relocated for more than 1 year and distance over 300 km.<br>Entitled to 10 days of initial stay.<br>Reimbursement for shifting household goods (3 quotations required, HR to approve one).<br>Max limit ₹20,000.</p>
            <p><br>📝 <b>Reimbursement process</b><br>Attach all bills: travel tickets, boarding passes, hotel bills, meal bills, conveyance bills (mention from/to and distance), and self-attested vouchers if no bill.<br>Bills submission deadline: 22nd of every month.<br>Finance team to settle within 7 working days after approval.</p>
            <p><br>⛔ <b>Not reimbursable</b><br>Personal expenses: alcohol, cigarettes, fines, entertainment, personal shopping, etc.<br>Charges from failure to cancel tickets.<br>Extra luggage not related to official work.</p>
            <p><br>🗓️ <b>Important timelines</b><br>Expense date must be within 30 days of activity.<br>Submit bills within 15 days; if late, attach justification.</p>
        </div>
    `;

    let d = new frappe.ui.Dialog({
        title: 'Nexapp Expense Policy',
        size: 'large',
        fields: [
            {
                fieldname: 'policy_html',
                fieldtype: 'HTML',
                options: policy_html
            }
        ],
        primary_action_label: 'Close',
        primary_action() {
            d.hide();
        }
    });

    d.show();
}

////////////////////////////////////////////////////////////////////////
frappe.ui.form.on('Expense Claim', {
    refresh: function(frm) {
        if (frm.doc.expenses && frm.doc.expenses.length > 0) {
            let lineNos = [];
            frm.doc.expenses.forEach((row, idx) => {
                if (row.custom_need_additional_approve) {
                    lineNos.push(idx + 1); // Line number = index + 1
                }
            });

            if (lineNos.length > 0) {
                // Format: 1 and 2, 3 and 4 etc.
                let formattedLineNos = lineNos.length === 1
                    ? lineNos[0]
                    : lineNos.slice(0, -1).join(', ') + ' and ' + lineNos.slice(-1);

                let message = `The employee has requested additional approval for expense line no. ${formattedLineNos}.`;
                
                frappe.msgprint({
                    title: 'Additional Approval Required',
                    message: message,
                    indicator: 'orange'
                });
            }
        }
    }
});
//////////////////////////////////////////////////////////////////////////////
