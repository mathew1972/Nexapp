frappe.ui.form.on('Site', {
    refresh: function (frm) {
        /* 
        =============================
        1. Styling Input Fields
        =============================
        */
        const fields = [
            'site_information_tab', 'project_request_section', 'column_break_yehx', 'provisioning_request',
            'shipment_request', 'column_break_lbut', 'product_assigment', 'column_break_pfpp', 'lms_request',
            'column_break_gtzy', 'feasibility_information', 'feasibility_section', 'site_name', 'customer',
            'site_type', 'region', 'existing_circuit_id', 'delivery_date', 'column_break_dlsw', 'circuit_id',
            'site_status', 'stage', 'customer_type', 'order_type', 'site_id__legal_code', 'site_information_section',
            'site_remark', 'section_break_pixr', 'product_in_service', 'product_assigment_created', 'contact_address',
            'site_address_section', 'street', 'city', 'country', 'longitude', 'column_break_xbyr', 'pincode',
            'district', 'state', 'latitude', 'site_contact_section', 'primary_contact', 'contact_html',
            'column_break_fvvn', 'alternate_contact', 'contact_html2', 'services_tab', 'stock_live_update_section',
            'site_item', 'tab_3_tab', 'project_section', 'column_break_frik', 'project', 'project_name',
            'expected_start_date', 'expected_end_date', 'column_break_xqbv', 'sales_order', 'sales_order_date',
            'sales_order_amount', 'column_break_aujv', 'customer_po_no', 'customer_po_date', 'customer_po_amount',
            'column_break_uonu', 'invoice_no', 'invoice_date', 'solution_tab', 'solution_section', 'managed_service',
            'config_type', 'column_break_dtxu', 'solution', 'primary_plan', 'secondary_plan', 'mbb_bandwidth',
            'assigned_product_tab', 'assigned_product_section', 'provisioning_item', 'lms_tab', 'lms_section',
            'lms_vendor', 'tab_12_tab', 'delivery_challan_section', 'dc', 'installation_tab', 
            'installation_information_section', 'installation', 'product_tab', 'product_section', 'product', 'address'
        ];

        // Apply custom styles to input fields
        fields.forEach(function (field) {
            const fieldWrapper = frm.fields_dict[field]?.wrapper;
            if (!fieldWrapper) return;

            const fieldElement = $(fieldWrapper).find('input, textarea, select');
            const isDropdown = frm.fields_dict[field].df.fieldtype === 'Select';
            const isRequired = frm.fields_dict[field].df.reqd;

            // Base styles
            fieldElement.css({
                //'border': '1px solid #ccc',
                //'border-radius': '7px',
                //'padding': isDropdown ? '5px 10px' : '5px',
                //'outline': 'none',
                //'background-color': '#ffffff',
                //'transition': '0.3s ease-in-out',
                //'height': isDropdown ? 'auto' : 'initial'

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

            // Required field styling
            if (isRequired) {
                fieldElement.css({ 'border-left': '4px solid red' });
            }

            // Focus event
            fieldElement.on('focus', function () {
                $(this).css({
                    'border': '1px solid #80bdff',
                    'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                    'background-color': '#ffffff'
                });
                if (isRequired) {
                    $(this).css({ 'border-left': '5px solid red' });
                }
            });

            // Blur event
            fieldElement.on('blur', function () {
                $(this).css({
                    'border': '1px solid #ccc',
                    'box-shadow': 'none',
                    'background-color': '#ffffff'
                });
                if (isRequired) {
                    $(this).css({ 'border-left': '5px solid red' });
                }
            });
        });

        /* 
        =============================
        2. Adding Icons to Fields
        =============================
        */
        const fieldsWithIcons = [
            { field: 'site_name', icon: 'fa-user-o', topPosition: '70%' },
            { field: 'delivery_date', icon: 'fa-calendar', topPosition: '70%' },
            { field: 'region', icon: 'fa-map-marker', topPosition: '70%' },
            { field: 'customer', icon: 'fa-building-o', topPosition: '70%' },
            { field: 'email', icon: 'fa-envelope-o', topPosition: '70%' },
            { field: 'longitude', icon: 'fa-globe', topPosition: '70%' },
            { field: 'latitude', icon: 'fa-globe', topPosition: '70%' },
            { field: 'primary_contact', icon: 'fa-phone', topPosition: '70%' },
            { field: 'alternate_contact', icon: 'fa-phone', topPosition: '70%' },
        ];

        fieldsWithIcons.forEach(function (config) {
            const fieldWrapper = frm.fields_dict[config.field]?.wrapper;
            if (!fieldWrapper) return;

            $(fieldWrapper).css('position', 'relative');

            // Prevent duplicate icons
            if ($(fieldWrapper).find('.custom-field-icon').length === 0) {
                $(fieldWrapper).append(`
                    <span class="custom-field-icon" style="position: absolute; right: 10px; top: ${config.topPosition}; transform: translateY(-50%);">
                        <i class="fa ${config.icon}" aria-hidden="true"></i>
                    </span>
                `);
            }
        });

        /* 
        =============================
        3. Styling Buttons
        =============================
        */
        const buttons = ['provisioning_request', 'shipment_request', 'product_assigment', 'lms_request', 'feasibility_information'];
        buttons.forEach(function (button) {
            const buttonInput = frm.fields_dict[button]?.input;
            if (!buttonInput) return;

            $(buttonInput).css({
                'background-color': '#FBA910',
                'border-color': '#FBA910',
                'color': 'white',
                'border-radius': '5px',
                'padding': '5px 15px',
                'cursor': 'pointer',
                'transition': '0.3s ease-in-out'
            });

            // Hover effect for buttons
            $(buttonInput).hover(
                function () {
                    $(this).css({
                        'background-color': '#e09b0c',
                        'border-color': '#e09b0c'
                    });
                },
                function () {
                    $(this).css({
                        'background-color': '#FBA910',
                        'border-color': '#FBA910'
                    });
                }
            );
        });

        /* 
        =============================
        4. Styling Sections
        =============================
        */
        function styleSection(fieldname) {
            const sectionWrapper = $(`[data-fieldname="${fieldname}"]`).closest('.form-section');
            if (sectionWrapper.length) {
                sectionWrapper.css({
                    'background-color': '#f9f9f9',
                    'border': '1px solid #007BFF',
                    'border-radius': '8px',
                    'padding': '15px',
                    'margin-bottom': '20px',
                });

                sectionWrapper.find('.section-head').css({
                    'background-color': '#1EBEF9',
                    'color': '#fff',
                    'padding': '10px',
                    'font-weight': 'bold',
                    'border-radius': '5px',
                });
            }
        }

        const sections = [
            'project_request_section', 'site_address_section', 'site_contact_section', 'feasibility_section',
            'site_information_section', 'section_break_xvmk', 'stock_live_update_section', 'project_section',
            'solution_section', 'assigned_product_section', 'lms_section', 'delivery_challan_section',
            'installation_information_section', 'product_section'
        ];

        // Apply styling to all sections
        sections.forEach(styleSection);
    }
});
