frappe.pages['sales-invoice-manage'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Invoice Management'),
        single_column: true
    });

    // State variables
    let per_page = 20;
    let selected_records = [];

    // Add Create Invoice button to header
    page.set_primary_action(__('Create Invoice'), function() {
        show_invoice_creation_dialog();
    }, 'octicon octicon-file-text');

    // Main container
    page.main.html(`
        <div class="site-management-container">
            <div class="site-table-container">
                <div class="table-loading text-center">
                    <div class="spinner"></div>
                    <p>${__('Loading site data...')}</p>
                </div>
                <div class="table-responsive" style="display:none;">
                    <table class="table">
                        <thead class="table-head">
                            <tr>
                                <th width="5%">
                                    <input type="checkbox" class="select-all" />
                                </th>
                                <th width="15%">${__('Circuit ID')}</th>
                                <th width="20%">${__('Sales Order')}</th>
                                <th width="20%">${__('Customer')}</th>
                                <th width="20%">${__('Site Name')}</th>
                                <th width="15%">${__('Site Status')}</th>
                            </tr>
                        </thead>
                        <tbody class="table-body"></tbody>
                    </table>
                </div>
                <div class="table-footer">
                    <div class="records-per-page">
                        <span>${__('Show:')}</span>
                        <div class="per-page-options">
                            <button class="per-page-option ${per_page === 20 ? 'active' : ''}" data-value="20">20</button>
                            <button class="per-page-option ${per_page === 100 ? 'active' : ''}" data-value="100">100</button>
                            <button class="per-page-option ${per_page === 500 ? 'active' : ''}" data-value="500">500</button>
                            <button class="per-page-option ${per_page === 2500 ? 'active' : ''}" data-value="2500">2500</button>
                            <button class="per-page-option ${per_page === 'ALL' ? 'active' : ''}" data-value="ALL">ALL</button>
                        </div>
                    </div>
                    <div class="records-count"></div>
                </div>
            </div>
        </div>
    `);

    // Inline CSS Styling with #F75900 theme
    page.main.append(`
        <style>
            .site-management-container {
                max-width: 1250px;
                margin: 0 auto;
                padding: 20px;
                font-family: "Segoe UI", Arial, sans-serif;
            }
            .table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                background: #fff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 6px 16px rgba(0,0,0,0.1);
            }
            .table th {
                background: linear-gradient(90deg, #F75900, #ff7b33);
                color: #fff;
                font-weight: 600;
                padding: 12px 15px;
                text-align: left;
                border-bottom: 2px solid #f0f0f0;
                font-size: 14px;
                letter-spacing: 0.3px;
            }
            .table td {
                padding: 12px 15px;
                border-bottom: 1px solid #f1f1f1;
                vertical-align: middle;
                color: #444;
                font-size: 13px;
            }
            .table tr:last-child td {
                border-bottom: none;
            }
            .table tr:hover td {
                background-color: #fff7f2;
                transition: background 0.2s ease;
            }
            .status-badge {
                display: inline-block;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: capitalize;
                letter-spacing: 0.2px;
            }
            .status-delivered {
                background: #eafaf1;
                color: #2d9d5a;
                border: 1px solid #b7e5c5;
            }
            .status-pending {
                background: #fff0e6;
                color: #F75900;
                border: 1px solid #ffc7a6;
            }
            .status-partially {
                background: #fff8e1;
                color: #d48806;
                border: 1px solid #ffe58f;
            }
            .table-loading {
                padding: 40px 20px;
                color: #6c757d;
            }
            .table-loading .spinner {
                display: inline-block;
                width: 28px;
                height: 28px;
                border: 3px solid rgba(0,0,0,0.1);
                border-radius: 50%;
                border-top-color: #F75900;
                animation: spin 1s linear infinite;
                margin-bottom: 12px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .table-footer {
                margin-top: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
            }
            .records-per-page {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .records-per-page span {
                color: #555;
                font-size: 13px;
            }
            .per-page-options {
                display: flex;
                gap: 6px;
            }
            .per-page-option {
                padding: 5px 12px;
                border: 1px solid #ddd;
                background: #fff;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s ease;
            }
            .per-page-option:hover {
                background: #fff0e6;
                border-color: #F75900;
                color: #F75900;
            }
            .per-page-option.active {
                background: #F75900;
                color: #fff;
                border-color: #F75900;
                font-weight: 600;
                box-shadow: 0 2px 6px rgba(247,89,0,0.3);
            }
            .records-count {
                font-size: 13px;
                color: #444;
                font-weight: 500;
            }
            
            /* Invoice Dialog Styles */
            .invoice-dialog-container {
                padding: 20px;
                max-width: 900px;
                margin: 0 auto;
            }
            .invoice-dialog-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                background: #fff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .invoice-dialog-table th {
                background: linear-gradient(90deg, #F75900, #ff7b33);
                color: #fff;
                padding: 12px 15px;
                text-align: left;
                font-weight: 600;
            }
            .invoice-dialog-table td {
                padding: 12px 15px;
                border-bottom: 1px solid #f1f1f1;
                color: #444;
            }
            .invoice-dialog-table tr:last-child td {
                border-bottom: none;
            }
            .invoice-dialog-table tr:hover td {
                background-color: #fff7f2;
            }
            .invoice-dialog-footer {
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            .invoice-dialog-btn {
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            .invoice-dialog-btn-cancel {
                background: #fff;
                border: 1px solid #ddd;
                color: #555;
            }
            .invoice-dialog-btn-cancel:hover {
                background: #f5f5f5;
            }
            .invoice-dialog-btn-create {
                background: #F75900;
                border: 1px solid #F75900;
                color: #fff;
            }
            .invoice-dialog-btn-create:hover {
                background: #e65100;
                border-color: #e65100;
                box-shadow: 0 2px 8px rgba(247,89,0,0.3);
            }
            .no-records-selected {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
                font-size: 15px;
            }
            .rate-input {
                width: 100px;
                text-align: right;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                outline: none;
            }
            .rate-input:focus {
                border-color: #F75900;
                box-shadow: 0 0 0 3px rgba(247,89,0,0.15);
            }
            .text-right { text-align: right; }
        </style>
    `);

    // Function to show invoice creation dialog
    function show_invoice_creation_dialog() {
        selected_records = [];
        $('.record-checkbox:checked').each(function() {
            selected_records.push($(this).data('id'));
        });
        
        if (selected_records.length === 0) {
            frappe.msgprint(__('Please select at least one record to create invoice.'));
            return;
        }
        
        // Create dialog
        const dialog = new frappe.ui.Dialog({
            title: __('Create Invoice'),
            size: 'large',
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'invoice_dialog_content'
                }
            ]
        });
        
        // Show loading state
        dialog.fields_dict.invoice_dialog_content.$wrapper.html(`
            <div class="text-center" style="padding: 40px 20px;">
                <div class="spinner" style="display: inline-block; width: 28px; height: 28px; border: 3px solid rgba(0,0,0,0.1); border-radius: 50%; border-top-color: #F75900; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
                <p>${__('Loading invoice data...')}</p>
            </div>
        `);
        
        dialog.show();
        
        // Fetch data for selected records
        frappe.call({
            method: "nexapp.api.get_sales_order_items_for_sites",
            args: {
                site_names: selected_records
            },
            callback: function(response) {
                if (response.message) {
                    render_invoice_dialog_content(dialog, response.message);
                } else {
                    dialog.fields_dict.invoice_dialog_content.$wrapper.html(`
                        <div class="no-records-selected">
                            <p>${__('No sales order items found for the selected sites.')}</p>
                        </div>
                    `);
                }
            },
            error: function() {
                dialog.fields_dict.invoice_dialog_content.$wrapper.html(`
                    <div class="no-records-selected">
                        <p>${__('Error loading sales order items. Please try again.')}</p>
                    </div>
                `);
            }
        });
    }
    
    // Function to render invoice dialog content
    function render_invoice_dialog_content(dialog, data) {
        // Ensure numeric
        data.forEach(d => {
            d.rate = to_number(d.rate);
            d.qty = to_number(d.qty);
            d.amount = to_number(d.amount || (to_number(d.rate) * to_number(d.qty)));
        });

        let html = `
            <div class="invoice-dialog-container">
                <p>${__('Review the items below before creating the invoice.')}</p>
                
                <table class="invoice-dialog-table">
                    <thead>
                        <tr>
                            <th>${__('Circuit ID')}</th>
                            <th>${__('Site Name')}</th>
                            <th>${__('Item')}</th>
                            <th class="text-right">${__('Rate')}</th>
                            <th class="text-right">${__('Qty')}</th>
                            <th class="text-right">${__('Amount')}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (data.length > 0) {
            data.forEach((item, idx) => {
                html += `
                    <tr data-index="${idx}">
                        <td>${item.custom_feasibility || '-'}</td>
                        <td>${item.custom_site_info || '-'}</td>
                        <td>${item.item_name || '-'}</td>
                        <td class="text-right">
                            <input type="number" step="0.01" min="0" class="rate-input" data-index="${idx}" value="${format_number(item.rate)}" />
                        </td>
                        <td class="text-right">${format_number(item.qty)}</td>
                        <td class="text-right amount-cell">${format_currency(item.amount)}</td>
                    </tr>
                `;
            });
        } else {
            html += `
                <tr>
                    <td colspan="6" class="text-center">${__('No items found for the selected sites.')}</td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
                
                <div class="invoice-dialog-footer">
                    <button class="invoice-dialog-btn invoice-dialog-btn-cancel">${__('Cancel')}</button>
                    <button class="invoice-dialog-btn invoice-dialog-btn-create">${__('Create Invoice')}</button>
                </div>
            </div>
        `;
        
        dialog.fields_dict.invoice_dialog_content.$wrapper.html(html);
        
        // ✅ Make Rate editable & recalc Amount = Rate × Qty
        const $wrap = dialog.fields_dict.invoice_dialog_content.$wrapper;
        $wrap.find('.rate-input').on('input change', function() {
            const idx = parseInt($(this).attr('data-index'), 10);
            let newRate = to_number($(this).val());
            if (newRate < 0 || isNaN(newRate)) newRate = 0;

            // Update in-memory data
            data[idx].rate = newRate;
            const qty = to_number(data[idx].qty);
            const newAmount = newRate * qty;
            data[idx].amount = newAmount;

            // Update UI
            $(this).closest('tr').find('.amount-cell').text(format_currency(newAmount));
        });

        // Add event handlers
        $wrap.find('.invoice-dialog-btn-cancel').on('click', function() {
            dialog.hide();
        });
        
        $wrap.find('.invoice-dialog-btn-create').on('click', function() {
            // send updated rates/amounts
            create_invoice(data, dialog);
        });
    }
    
    // Function to create invoice
    function create_invoice(items, dialog) {
        frappe.call({
            method: "nexapp.api.create_sales_invoice_from_items",
            args: {
                items: items
            },
            freeze: true,
            freeze_message: __('Creating Invoice...'),
            callback: function(response) {
                if (response.message) {
                    frappe.show_alert({
                        message: __('Invoice created successfully'),
                        indicator: 'green'
                    }, 5);
                    
                    if (response.message.invoice_url) {
                        setTimeout(() => {
                            window.open(response.message.invoice_url, '_blank');
                        }, 1000);
                    }
                    
                    dialog.hide();
                    load_data(); // Refresh the data
                }
            },
            error: function() {
                frappe.msgprint(__('Error creating invoice. Please try again.'));
            }
        });
    }
    
    // Helper function to format currency
    function format_currency(value) {
        return (to_number(value)).toFixed(2);
    }
    function format_number(value) {
        let n = to_number(value);
        // show up to 2 decimals without trailing zeros if integer
        return Number.isInteger(n) ? n.toString() : n.toFixed(2);
    }
    function to_number(value) {
        const n = parseFloat(value);
        return isNaN(n) ? 0 : n;
    }

    // Load data
    function load_data() {
        $('.table-loading').show();
        $('.table-responsive').hide();
        $('.table-body').empty();

        frappe.call({
            method: "nexapp.api.get_site_data",
            args: { limit: per_page },
            callback: function(response) {
                $('.table-loading').hide();
                const $tableBody = $('.table-body');
                
                if (response.message && response.message.sites.length) {
                    response.message.sites.forEach(site => {
                        const statusClass = site.site_status === "Delivered and Live" ? "status-delivered" : "";
                        
                        $tableBody.append(`
                            <tr>
                                <td><input type="checkbox" class="record-checkbox" data-id="${site.name}" /></td>
                                <td>${site.circuit_id || '-'}</td>
                                <td>${site.sales_order ? site.sales_order + ' - SO No' : '-'}</td>
                                <td>${site.customer || '-'}</td>
                                <td>${site.site_name || '-'}</td>
                                <td>
                                    <span class="status-badge ${statusClass}">
                                        ${site.site_status || '-'}
                                    </span>
                                </td>
                            </tr>
                        `);
                    });
                    $('.table-responsive').show();
                }

                // Show count
                if (response.message) {
                    $('.records-count').text(
                        `${response.message.sites.length} of ${response.message.total} records`
                    );
                }
            },
            error: function() {
                $('.table-loading').hide();
            }
        });
    }

    // Event handlers
    $(wrapper).on('click', '.per-page-option', function() {
        let value = $(this).data('value');
        per_page = value === "ALL" ? 0 : parseInt(value);
        $('.per-page-option').removeClass('active');
        $(this).addClass('active');
        load_data();
    });

    // Select All handler
    $(wrapper).on('change', '.select-all', function() {
        const checked = $(this).prop('checked');
        $('.record-checkbox').prop('checked', checked);
    });

    // Initial load
    load_data();
};