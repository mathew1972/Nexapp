frappe.ui.form.on('Sales Order', {
    refresh: function(frm) {
        const fields = [
            'subject_section', 'custom_circuit_id', 'custom_ticket_category', 
            'custom_ticket_sub_category', 'custom_ticket_owner', 'custom_impact', 
            'customer', 'priority', 'agent_group', 'custom_lms_ticket_id', 'cb00', 
            'custom_ticket_for', 'status', 'ticket_type', 'raised_by', 'ticket_split_from', 
            'custom_impact_details', 'custom_channel', 'custom_lms', 
            'custom_provisioning', 'additional_info', 'contact', 'email_account', 
            'column_break_16', 'via_customer_portal', 'attachment', 'content_type', 
            'sb_details', 'subject', 'description', 'template', 'sla_tab', 
            'service_level_section', 'sla', 'response_by', 'cb', 'agreement_status', 
            'resolution_by', 'service_level_agreement_creation', 'on_hold_since', 
            'total_hold_time', 'response_tab', 'response', 'first_response_time', 
            'first_responded_on', 'column_break_26', 'avg_response_time', 'resolution_tab', 
            'section_break_19', 'resolution_details', 'column_break1', 'opening_date', 
            'opening_time', 'resolution_date', 'resolution_time', 'user_resolution_time', 
            'reference_tab', 'feedback_tab', 'customer_feedback_section', 'feedback_rating', 
            'feedback_text', 'feedback', 'feedback_extra', 'custom_finance_issue', '',
            'custom__finance_expected_end_date_', 'custom_department', 'custom_finance_task_details',
            'meta_tab', 'po_no', 'po_date', 'custom_customer_purchase_amount', 'delivery_date',
            'order_type', 'transaction_date', 'cost_center', 'project', 'custom_project_name',
            'total_qty', 'tax_category', 'taxes_and_charges', 'apply_discount_on', 'base_discount_amount',
            'additional_discount_percentage', 'discount_amount', 'coupon_code', 'payment_terms_template'
        ];

        // Style individual fields
        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                // Apply styles to increase height
                fieldElement.css({
                    'border': '1px solid #ccc',
                    'border-radius': '7px',
                    'padding': '10px',         // Increased padding for more height
                    'outline': 'none',
                    'background-color': '#ffffff',
                    'transition': '0.3s ease-in-out',
                    'height': '40px',          // Increased height explicitly
                    'white-space': 'nowrap',   // Prevent text wrapping
                    'min-width': '200px',      // Ensure minimum width for readability
                    'max-width': '100%',       // Allow responsiveness
                    'overflow': 'hidden',      // Hide overflowing text
                    'text-overflow': 'ellipsis' // Display ellipsis for long text
                });

                // Apply focus and blur effects
                fieldElement.on('focus', function() {
                    $(this).css({
                        'border': '1px solid #80bdff',
                        'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                        'background-color': '#ffffff'
                    });
                });

                fieldElement.on('blur', function() {
                    $(this).css({
                        'border': '1px solid #ccc',
                        'box-shadow': 'none',
                        'background-color': '#ffffff'
                    });
                });
            }
        });

        // Function to style sections
        function styleSection(fieldname) {
            const section_wrapper = $(`[data-fieldname="${fieldname}"]`).closest('.form-section');
            if (section_wrapper.length) {
                section_wrapper.css({
                    'background-color': '#f9f9f9',
                    'border': '1px solid #007BFF',
                    'border-radius': '8px',
                    'padding': '15px',
                    'margin-bottom': '20px',
                });

                section_wrapper.find('.section-head').css({
                    'background-color': '#1EBEF9',
                    'color': '#fff',
                    'padding': '10px',
                    'font-weight': 'bold',
                    'border-radius': '5px',
                });
            }
        }

        // Sections to style
        const sections = [
            'customer_section',
            'accounting_dimensions_section',
            'currency_and_price_list',
            'sec_warehouse',
            'items_section',
            'section_break_31',
            'taxes_section',
            'section_break_40',
            'section_break_43',
            'totals',
            'section_break_48',
            'sec_tax_breakup',
            'section_gst_breakup',
            'packing_list',
            'pricing_rule_details',
            'billing_address_column',
            'shipping_address_column',
            'col_break46',
            'payment_terms_section',
            'terms_section_break',
            'section_break_78',
            'sales_team_section_break',
            'section_break1',
            'loyalty_points_redemption',
            'subscription_section',
            'printing_details',
            'additional_info_section',
            'gst_section'
        ];

        // Apply styling to sections
        sections.forEach(styleSection);
    },
});
