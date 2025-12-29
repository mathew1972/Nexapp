
// ===== FORCE Paid Amount = Allocated (post-create safety) =====
function __force_set_paid_amount__(pe_name) {
    const allocated = parseFloat($('#allocated-amount-input').val() || 0);
    if (!pe_name || !allocated) return;

    frappe.call({
        method: 'frappe.client.set_value',
        args: {
            doctype: 'Payment Entry',
            name: pe_name,
            fieldname: {
                paid_amount: allocated,
                received_amount: allocated
            }
        }
    });
}


// Complete Bank Reconciliation System with Filters and Reverse Entry Button
frappe.pages['bank-reconciliation'].on_page_load = function(wrapper) {
    // Create page without default title
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '',  // Empty title since we'll add our own
        single_column: true
    });

    // Add custom header with icon - COMPACT VERSION
    $(`<div class="page-head">
    <div class="page-title-wrapper" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        
        <!-- LEFT SIDE : ICON + TITLE -->
        <h2 class="page-title" style="display:flex; align-items:center; margin:0; padding:0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#2C3E50" style="margin-right:10px;">
                <path d="M12 2L1 7v2h22V7L12 2zm9 9H3v11h18V11zm-11 2h2v7h-2v-7zm6 0h2v7h-2v-7zm-12 0h2v7H4v-7z"/>
            </svg>
            Bank Reconciliation
        </h2>

        <!-- RIGHT SIDE : BUTTONS -->
        <div style="display:flex; gap:8px; align-items:center; margin-right:25px;">
            <button class="unreconciled-report-btn" id="unreconciled-report-btn" title="Unreconciled Report">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4-3h2v13h-2z"/>
                </svg>
            </button>
            
            <button class="reverse-entry-btn" id="reverse-entry-btn" title="Reverse Entry">
                <span class="reverse-icon">↺</span>
            </button>
        </div>

    </div>
</div>

    </div>`).appendTo(page.body);

    // Add custom CSS with Reverse Entry Button and Popup Styles
    $(`<style>
        /* FIX FOR BLANK SPACE */
        .page-head {
            margin-top: 0 !important;
            padding-top: 0 !important;
        }
        /* REMOVE DEFAULT FRAPPE PAGE HEADER SPACE */
        .page-head, 
        .page-head-content, 
        .page-title, 
        .page-title-wrapper {
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        }

        /* Remove top padding of the page container */
        .layout-main-section-wrapper,
        .layout-main-section {
        margin-top: 0 !important;
        padding-top: 0 !important;
        }
        .page-head .page-title {
        margin-bottom: 12px !important;
        }        
        .page-title-wrapper {
            margin: 0 !important;
            padding: 5px 0 !important;
        }
        
        .page-title {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 26px !important;
            line-height: 1.2 !important;
            color: #F75900;
        }
        
        .page-content {
            padding-top: 0 !important;
        }
        
        /* NEW: Table Filter Section Styles - UPDATED for better visual */
        .table-filter-section {
            margin: 0 0 20px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            border-left: 4px solid #F75900;
        }
        
        .table-filter-row {
            display: flex;
            gap: 12px;
            margin-bottom: 0;
        }
        
        .table-filter-group {
            flex: 1;
        }
        
        .table-filter-group label {
            display: block;
            margin-bottom: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .table-filter-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 13px;
            background: white;
            color: #374151;
            transition: all 0.2s ease;
        }
        
        .table-filter-input:focus {
            outline: none;
            border-color: #F75900;
            box-shadow: 0 0 0 3px rgba(247, 89, 0, 0.1);
        }
        
        .table-filter-input::placeholder {
            color: #9ca3af;
        }
        
        /* Unreconciled Report Button Styles - ROUND ICON */
        .unreconciled-report-btn {
            background-color: #F75900 !important;
            color: white !important;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.25);
            transition: all 0.2s ease-in-out;
            position: relative;
        }

        .unreconciled-report-btn:hover {
            background-color: #b93a00 !important;
            box-shadow: 0 6px 12px rgba(0,0,0,0.35);
            transform: translateY(-2px);
        }

        .unreconciled-report-btn:hover::after {
            content: 'Unreconciled Report';
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: white;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .unreconciled-report-btn:hover::before {
            content: '';
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid #333;
        }
        
        /* Reverse Entry Button Styles - UPDATED for top right position */
        .reverse-entry-btn {
            background-color: #F75900 !important;
            color: white !important;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.25);
            transition: all 0.2s ease-in-out;
            position: relative;
        }

        .reverse-entry-btn:hover {
            background-color: #b93a00 !important;
            box-shadow: 0 6px 12px rgba(0,0,0,0.35);
            transform: translateY(-2px);
        }

        .reverse-icon {
            font-size: 20px;
            font-weight: bold;
            line-height: 1;
        }
                
        .reverse-entry-btn:hover {
            background-color: #d84300;
        }
        
        .reverse-icon {
            font-size: 14px;
        }
        
        /* Reverse Entry Popup Styles - UPDATED WITH FIXED FOOTER */
        .reverse-entry-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        
        .reverse-entry-popup {
            background: white;
            border-radius: 4px;
            width: 90%;
            max-width: 1000px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .reverse-popup-header {
            background: #f5f5f5;
            color: #333;
            padding: 12px 16px;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .reverse-popup-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
        }
        
        .close-popup-btn {
            background: none;
            border: none;
            color: #666;
            font-size: 20px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 3px;
            transition: background-color 0.2s ease;
        }
        
        .close-popup-btn:hover {
            background-color: #e0e0e0;
        }
        
        /* FIXED BOTTOM ACTION BAR FOR POPUP */
        .reverse-popup-wrapper {
            display: flex;
            flex-direction: column;
            height: 80vh;
            max-height: 80vh;
        }

        .reverse-popup-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            max-height: calc(80vh - 120px);
        }

        .reverse-popup-footer {
            position: sticky;
            bottom: 0;
            background: white;
            padding: 12px 16px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
            z-index: 10;
        }

        .reverse-select-btn {
            background-color: #E65100;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }

        .reverse-select-btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }

        .reverse-select-btn:not(:disabled):hover {
            background-color: #d84300;
        }

        .reverse-cancel-btn {
            background-color: #f2f2f2;
            color: #333;
            border: none;
            padding: 8px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }

        .reverse-cancel-btn:hover {
            background-color: #e0e0e0;
        }
        
        /* Simple filter section */
        .reverse-filters-section {
            margin-bottom: 16px;
            padding: 12px;
            background-color: #f9f9f9;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
        }
        
        .reverse-filters-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .reverse-filter-group {
            margin-bottom: 8px;
        }
        
        .reverse-filter-group label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            color: #333;
            font-size: 12px;
        }
        
        .reverse-filter-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            font-size: 13px;
        }
        
        .reverse-filter-input:focus {
            outline: none;
            border-color: #666;
        }
        
        /* Simple table styles */
        .reverse-table-container {
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 16px;
        }
        
        .reverse-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        
        .reverse-table thead {
            background-color: #f5f5f5;
        }
        
        .reverse-table th {
            padding: 10px 12px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 1px solid #e0e0e0;
            font-size: 12px;
        }
        
        .reverse-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .reverse-table tbody tr:hover {
            background-color: #f9f9f9;
        }
        
        .reverse-table tbody tr.selected {
            background-color: #fff8e1;
        }
        
        .reverse-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
        
        /* Existing styles... */
        .recon-tabs {
            display: flex;
            border-bottom: 1px solid #ddd;
            margin-bottom: 15px;
        }
        .recon-tab {
            padding: 10px 20px;
            cursor: pointer;
            font-weight: bold;
            color: #666;
        }
        .recon-tab.active {
            color: #F75900;
            border-bottom: 2px solid #F75900;
        }
        .recon-form-group {
            margin-bottom: 15px;
        }
        .recon-form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        .recon-form-control {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .recon-amount-input {
            font-size: 18px;
            font-weight: bold;
            padding: 10px;
            color: #333;
            background-color: #f5f5f5;
        }
        .dark-highlight {
            background-color: #2c3e50 !important;
            color: white !important;
            font-weight: bold;
        }
        .bold-text {
            font-weight: bold !important;
        }
        .readonly-field {
            background-color: #f9f9f9;
            color: #555;
        }
        .recon-save-btn {
            background-color: #F75900;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }
        .recon-cancel-btn {
            background-color: #f0f0f0;
            color: #555;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 10px;
        }
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .invoice-table th {
            text-align: left;
            padding: 8px;
            background-color: #f5f5f5;
            border-bottom: 1px solid #ddd;
        }
        .invoice-table td {
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        .selected-row {
            background-color: #2c3e50 !important;
            color: white !important;
            border-left: 3px solid #F75900 !important;
        }
        .check-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            color: #ccc;
        }
        .check-btn.selected {
            color: #5cb85c;
        }
        .no-invoices {
            text-align: center;
            padding: 10px;
            color: #666;
            font-style: italic;
        }
        .cards-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
        }
        .recon-number-card {
            background-color: #F5FAFF;
            border-radius: 8px;   
            padding: 20px;
            flex: 1;
            text-align: center;
            position: relative;  
            transition: box-shadow 0.3s ease, transform 0.3s ease;
            border: none;          
            box-shadow: 
                0 6px 20px rgba(0, 0, 0, 0.15),
                0 2px 6px rgba(0, 0, 0, 0.08);
                                                     
        }
        .recon-number-card:hover {
            transform: translateY(-4px);
            box-shadow: 
            0 10px 16px rgba(0, 0, 0, 0.30),
            5px 7px 12px rgba(0, 0, 0, 0.2);            
        }
        .recon-number-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #F75900;
        }
        .recon-number-card .title {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-top: 4px;
        }        
        .right-panel-container {
            position: fixed;
            right: 0;
            top: 60px;
            width: 40%;
            height: calc(100% - 60px);
            background: white;
            box-shadow: -2px 0 10px rgba(0,0,0,0.1);
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            padding: 20px;
            overflow-y: auto;
        }
        .right-panel-container.open {
            transform: translateX(0);
        }
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        .panel-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .close-panel {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
            font-weight: bold;
        }
        .close-panel:hover {
            color: #fff;
            background-color: #F75900;
        }
        .scrollable-container {
            max-height: calc(100vh - 150px);
            overflow-y: auto;
            padding-right: 10px;
        }
        .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            padding: 10px 0;
            border-top: 1px solid #eee;
        }
        .page-info {
            color: #666;
            font-size: 14px;
        }
        .page-buttons {
            display: flex;
            gap: 5px;
        }
        .page-btn {
            padding: 5px 10px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 3px;
            cursor: pointer;
        }
        .page-btn.active {
            background: #F75900;
            color: white;
            border-color: #F75900;
        }
        .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .per-page-select {
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 3px;
            margin-left: 10px;
        }
        .bank-recon-layout {
            position: relative;
        }
        .left-panel {
            width: 100%;
            transition: width 0.3s ease;
        }
        .right-panel-open .left-panel {
            width: 60%;
        }
        .invoice-payment-container {
            margin-bottom: 15px;
            border: 1px solid #eee;
            padding: 15px;
            border-radius: 4px;
        }
        .invoice-payment-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .payment-input-container {
            margin-top: 10px;
        }
        .payment-amount-input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .tax-adjustments-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background-color: #f5f5f5;
            border-radius: 4px;
            overflow: hidden;
        }
        .tax-adjustments-table th {
            background-color: #e9e9e9;
            padding: 10px;
            text-align: left;
            font-weight: bold;
            color: #555;
        }
        .tax-adjustments-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        .tax-adjustments-table tr:last-child td {
            border-bottom: none;
        }
        .tax-adjustment-input {
            width: 100%;
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 3px;
        }
        .tax-adjustment-select {
            width: 100%;
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 3px;
        }
        .total-amount-row {
            font-weight: bold;
        }
        .table-container {
            position: relative;
            max-height: calc(100vh - 300px);
            overflow: auto;
            border: 1px solid #ddd;
        }
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-container thead th {
            position: sticky;
            top: 0;
            background-color: #f5f5f5;
            z-index: 100;
            border-bottom: 2px solid #ddd;
            box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);
        }
        .table-container tbody tr {
            position: relative;
            z-index: 1;
        }
        .table-container tbody tr:first-child td {
            padding-top: 12px;
        }
        .dropdown-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-top: 5px;
            padding: 5px 0;
        }
        .dropdown-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            font-size: 13px;
        }
        .dropdown-item:hover {
            background-color: #f5f5f5;
        }
        .dropdown-item:last-child {
            border-bottom: none;
        }
        .dropdown-search {
            width: 100%;
            padding: 8px 12px;
            border: none;
            border-bottom: 1px solid #ddd;
            margin-bottom: 5px;
            font-size: 13px;
        }
        .match-now-container {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        .allocated-amount-display {
            background-color: #e8f5e8;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-weight: bold;
            text-align: center;
            color: #2d5016;
        }
        .custom-dropdown {
            position: relative;
        }
        .dropdown-toggle {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            text-align: left;
            cursor: pointer;
        }
        .dropdown-toggle:after {
            content: '▼';
            float: right;
            font-size: 10px;
        }
        .customer-payment-table-container {
            margin-top: 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
        }
        .customer-payment-table {
            width: 100%;
            border-collapse: collapse;
        }
        .customer-payment-table th {
            background-color: #f5f5f5;
            padding: 12px 15px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 1px solid #ddd;
        }
        .customer-payment-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }
        .customer-payment-table tr:last-child td {
            border-bottom: none;
        }
        .amount-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            text-align: right;
        }
        .account-select {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
        }
        .allocated-row {
            background-color: #f9f9f9;
        }
        .total-row {
            background-color: #e8f4fd;
            font-weight: bold;
        }
        .total-highlight {
            background-color: #2c3e50;
            color: white;
            padding: 10px 15px;
            text-align: center;
            font-weight: bold;
            margin-top: 10px;
            border-radius: 4px;
        }
        .filter-section {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            align-items: flex-end;
        }
        .bank-account-field {
            flex: 1;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #F75900;
        }
        .date-filter-field {
            flex: 1;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #F75900;
        }
        .bank-account-field label,
        .date-filter-field label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #333;
            font-size: 14px;
        }
        .bank-account-dropdown {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            font-size: 14px;
            cursor: pointer;
        }
        .date-filter-control {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            font-size: 14px;
        }
        .date-filter-row {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }
        .date-filter-group {
            flex: 1;
        }
        .date-filter-actions {
            display: flex;
            gap: 10px;
        }
        .date-filter-btn {
            padding: 10px 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .date-filter-btn.apply {
            background-color: #F75900;
            color: white;
            border-color: #F75900;
        }
        .date-filter-btn.apply:hover {
            background-color: #e65100;
            border-color: #e65100;
        }
        .date-filter-btn.reset {
            background-color: #6c757d;
            color: white;
            border-color: #6c757d;
        }
        .date-filter-btn.reset:hover {
            background-color: #545b62;
            border-color: #545b62;
        }
        .bank-account-dropdown:focus,
        .date-filter-control:focus {
            border-color: #F75900;
            outline: none;
            box-shadow: 0 0 0 2px rgba(247, 89, 0, 0.1);
        }
        .payment-amount-display {
            background-color: #2c3e50;
            color: white;
            padding: 12px 15px;
            text-align: center;
            font-weight: bold;
            margin: 15px 0;
            border-radius: 6px;
            font-size: 16px;
        }
        .payment-amount-display .label {
            font-size: 16px;
            opacity: 1;
            margin-bottom: 0;
        }
        .payment-amount-display .amount {
            font-size: 18px;
            margin-left: 10px;
        }
        .payment-amount-content {
            display: inline-block;
            text-align: center;
        }
        


        /* Match Now Button Section */
        .match-now-section {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            text-align: center;
        }
        .match-now-btn {
            background-color: #F75900;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            width: 100%;
            transition: all 0.3s ease;
        }
        .match-now-btn:hover {
            background-color: #e65100;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(247, 89, 0, 0.3);
        }
        .match-now-btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        /* From Account and To Account sections */
        .from-account-section,
        .to-account-section {
            margin-top: 15px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #F75900;
        }
        .from-account-section label,
        .to-account-section label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #333;
        }
        .small-description {
            font-size: 12px;
            margin-top: 5px;
            color: #666;
        }
        .error-message {
            color: #d63031;
            font-size: 12px;
            margin-top: 5px;
            display: none;
        }
        .transfer-description-input {
            font-size: 13px;
            height: 80px;
            resize: vertical;
        }

        /* Itemized Journal Entry Styles */
        .itemized-section {
            margin-top: 15px;
            padding: 15px;
            background-color: #FFFFFF;
            border-radius: 6px;
            border-left: 4px solid #F75900;
        }
        .itemized-section label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #333;
        }
        .itemized-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        .itemized-row .account-select {
            flex: 2;
        }
        .itemized-row .amount-input {
            width: 120px;
            flex-shrink: 0;
        }
        .add-row-btn {
            background: none;
            border: none;
            color: #F75900;
            font-size: 18px;
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
            transition: all 0.2s ease;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .add-row-btn:hover {
            background-color: #F75900;
            color: white;
        }
        .totals-display {
            margin-top: 15px;
            padding: 10px;
            background-color: #e8f4fd;
            border-radius: 4px;
            border: 1px solid #b8d4f0;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .totals-label {
            font-weight: bold;
            color: #333;
        }
        .totals-value {
            font-weight: bold;
            color: #F75900;
        }
        .remove-row-btn {
            background: none;
            border: none;
            color: #ff3b30;
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
            transition: all 0.2s ease;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .remove-row-btn:hover {
            background-color: #ff3b30;
            color: white;
        }
        .itemized-account-dropdown {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
        }
        .itemized-balance-display {
            margin-top: 15px;
            padding: 12px;
            background-color: #F5FAFF;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        .itemized-balance-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
        }
        .itemized-balance-label {
            font-weight: 600;
            color: #495057;
        }
        .itemized-balance-value {
            font-weight: bold;
        }
        .itemized-balance-positive {
            color: #28a745;
        }
        .itemized-balance-negative {
            color: #dc3545;
        }
        .itemized-balance-zero {
            color: #6c757d;
        }
        .itemized-error {
            color: #dc3545;
            font-size: 12px;
            margin-top: 5px;
            display: none;
        }
        #outstanding-invoices {
    background-color: #F75900 !important;
    color: white !important;
    font-weight: bold !important;
    padding: 6px 10px;
    border-radius: 4px;
    display: inline-block;
}
    
    </style>`).appendTo('head');

    // Main container - Updated with Reverse Entry Button
    const $container = $(`
        <div class="bank-recon-layout">
            <div class="filter-section">
                <div class="bank-account-field">
                    <label for="bank-account-select">Bank Account</label>
                    <select id="bank-account-select" class="bank-account-dropdown">
                        <option value="">Loading bank accounts...</option>
                    </select>
                </div>

                <div class="date-filter-field">                    
                    <div class="date-filter-row">
                        <div class="date-filter-group">
                            <label for="date-from" style="font-size: 12px; margin-bottom: 3px;">Statement Date From</label>
                            <input type="date" id="date-from" class="date-filter-control">
                        </div>
                        <div class="date-filter-group">
                            <label for="date-to" style="font-size: 12px; margin-bottom: 3px;">Statement Date To</label>
                            <input type="date" id="date-to" class="date-filter-control">
                        </div>
                        <div class="date-filter-actions">
                            <button class="date-filter-btn apply" id="apply-date-filter">Apply</button>
                            <button class="date-filter-btn reset" id="reset-date-filter">Reset</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cards Row -->
            <div id="cards-container" class="cards-row"></div>

            <!-- Table Filter Section -->
            <div class="table-filter-section">
                <div class="table-filter-row">
                    <div class="table-filter-group">
                        <label for="filter-date">Date</label>
                        <input type="text" id="filter-date" class="table-filter-input" placeholder="Filter by date">
                    </div>
                    <div class="table-filter-group">
                        <label for="filter-statement-details">Statement Details</label>
                        <input type="text" id="filter-statement-details" class="table-filter-input" placeholder="Filter by statement details">
                    </div>
                    <div class="table-filter-group">
                        <label for="filter-withdrawal-amount">Withdrawal Amount</label>
                        <input type="text" id="filter-withdrawal-amount" class="table-filter-input" placeholder="Filter by withdrawal amount">
                    </div>
                    <div class="table-filter-group">
                        <label for="filter-deposit-amount">Deposit Amount</label>
                        <input type="text" id="filter-deposit-amount" class="table-filter-input" placeholder="Filter by deposit amount">
                    </div>
                </div>
            </div>

            <div class="left-panel">
                <div class="table-container">
                    <table class="table table-bordered table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Statement Details</th>
                                <th>Withdrawal Amount</th>
                                <th>Deposit Amount</th>
                            </tr>
                        </thead>
                        <tbody id="bank-statement-body">
                            <tr><td colspan="4">Select a bank account to view statements</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="pagination-container">
                    <div class="page-info">Showing <span id="start-item">0</span>-<span id="end-item">0</span> of <span id="total-items">0</span></div>
                    <div class="page-buttons">
                        <button class="page-btn" id="first-page" disabled>&laquo;</button>
                        <button class="page-btn" id="prev-page" disabled>&lsaquo;</button>
                        <div id="page-numbers"></div>
                        <button class="page-btn" id="next-page" disabled>&rsaquo;</button>
                        <button class="page-btn" id="last-page" disabled>&raquo;</button>
                    </div>
                    <div>
                        <span>Rows per page:</span>
                        <select class="per-page-select" id="per-page">
                            <option value="10">10</option>
                            <option value="20" selected>20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `);

    // Right Panel
    const $rightPanel = $(`
        <div class="right-panel-container">
            <div class="panel-header">
                <div class="panel-title">Transaction Details</div>
                <button class="close-panel" style="background: #f5f5f5; border: 1px solid #ddd; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; color: #666; transition: all 0.2s ease;">&times;</button>
            </div>
            
            <div class="recon-tabs">
                <div class="recon-tab active" data-tab="match">MATCH TRANSACTIONS</div>
                <div class="recon-tab" data-tab="categorize">CATEGORIZE MANUALLY</div>
            </div>
            
            <div class="scrollable-container">
                <div id="match-info-section">
                    <div id="match-info" style="color: #666; font-style: italic;">Click a statement line to match.</div>
                </div>
                
                <div id="manual-categorize-section" style="display: none;">
                    <div class="recon-form-group">
                        <label>Category</label>
                        <select id="category" class="recon-form-control">
                            <option value="">Select Category</option>
                        </select>
                    </div>
                    
                    <!-- FROM ACCOUNT SECTION -->
                    <div class="from-account-section" id="from-account-group" style="display: none;">
                        <label for="from-account">From Account</label>
                        <div class="custom-dropdown">
                            <div class="dropdown-toggle" id="from-account-toggle">Select From Account</div>
                            <div class="dropdown-list" id="from-account-list" style="display: none;">
                                <input type="text" class="dropdown-search" placeholder="Search From Account" id="from-account-search">
                                <div class="dropdown-items" id="from-account-items"></div>
                            </div>
                        </div>
                        <input type="hidden" id="from-account" value="">
                        <div class="error-message" id="from-account-error"></div>
                    </div>
                    
                    <div class="recon-form-group" id="employee-group" style="display: none;">
                        <label for="employee">Employee Name</label>
                        <div class="custom-dropdown">
                            <div class="dropdown-toggle" id="employee-toggle">Select Employee</div>
                            <div class="dropdown-list" id="employee-list" style="display: none;">
                                <input type="text" class="dropdown-search" placeholder="Search employees..." id="employee-search">
                                <div class="dropdown-items" id="employee-items"></div>
                            </div>
                        </div>
                        <input type="hidden" id="employee" value="">
                    </div>

                    <!-- Employee Advance List Container -->
                    <div id="employee-advance-list" style="margin-top: 15px; display: none;"></div>
                    
                    <div class="recon-form-group" id="customer-group" style="display: none;">
                        <label for="customer">Customer</label>
                        <div class="custom-dropdown">
                            <div class="dropdown-toggle" id="customer-toggle">Select Customer</div>
                            <div class="dropdown-list" id="customer-list" style="display: none;">
                                <input type="text" class="dropdown-search" placeholder="Search customers..." id="customer-search">
                                <div class="dropdown-items" id="customer-items"></div>
                            </div>
                        </div>
                        <input type="hidden" id="customer" value="">
                    
                    <!-- CUSTOMER ADVANCE : SALES ORDER -->
                    <div class="recon-form-group" id="sales-order-group" style="display: none;">
                        <label for="sales-order">Sales Order</label>
                        <div class="custom-dropdown">
                            <div class="dropdown-toggle" id="sales-order-toggle">Select Sales Order</div>
                            <div class="dropdown-list" id="sales-order-list" style="display: none;">
                                <input type="text" class="dropdown-search" placeholder="Search Sales Order" id="sales-order-search">
                                <div class="dropdown-items" id="sales-order-items"></div>
                            </div>
                        </div>
                        <input type="hidden" id="sales-order" value="">
                    </div>

                    <div class="recon-form-group" id="customer-advance-amount-group" style="display: none;">
                        <label>Advance Amount</label>
                        <input type="number" id="customer-advance-amount" class="recon-form-control" step="0.01" placeholder="Enter advance amount">
                    </div>
</div>
                    
                    <div class="recon-form-group" id="supplier-group" style="display: none;">
                        <label for="supplier">Supplier</label>
                        <div class="custom-dropdown">
                            <div class="dropdown-toggle" id="supplier-toggle">Select Supplier</div>
                            <div class="dropdown-list" id="supplier-list" style="display: none;">
                                <input type="text" class="dropdown-search" placeholder="Search suppliers..." id="supplier-search">
                                <div class="dropdown-items" id="supplier-items"></div>
                            </div>
                        </div>
                        <input type="hidden" id="supplier" value="">
                    </div>

                    <div class="recon-form-group" id="expense-account-group" style="display: none;">
                        <label for="expense">Expense Account</label>
                        <div class="custom-dropdown">
                            <div class="dropdown-toggle" id="expense-toggle">Select Expense Account</div>
                            <div class="dropdown-list" id="expense-list" style="display: none;">
                                <input type="text" class="dropdown-search" placeholder="Search Expense Account" id="expense-search">
                                <div class="dropdown-items" id="expense-items"></div>
                            </div>
                        </div>
                        <input type="hidden" id="expense" value="">
                    </div>

                    <!-- TO ACCOUNT SECTION -->
                    <div class="to-account-section" id="to-account-group" style="display: none;">
                        <label for="to-account">To Account</label>
                        <div class="custom-dropdown">
                            <div class="dropdown-toggle" id="to-account-toggle">Select To Account</div>
                            <div class="dropdown-list" id="to-account-list" style="display: none;">
                                <input type="text" class="dropdown-search" placeholder="Search To Account" id="to-account-search">
                                <div class="dropdown-items" id="to-account-items"></div>
                            </div>
                        </div>
                        <input type="hidden" id="to-account" value="">
                        <div class="error-message" id="to-account-error"></div>
                    </div>

                    <div class="recon-form-group" id="transfer-description-group" style="display: none;">
                        <label for="transfer-description">Description</label>
                        <textarea id="transfer-description" class="recon-form-control transfer-description-input" placeholder="Enter description for this transfer"></textarea>
                        <div class="small-description">Enter a brief description for this transfer</div>
                    </div>

                    <!-- ITEMIZED JOURNAL ENTRY SECTION -->
                    <div class="itemized-section" id="itemized-group" style="display: none;">
                        <label>Itemized Account</label>
                        <div id="itemized-accounts-container">
                            <div class="itemized-row">
                                <div class="custom-dropdown">
                                    <div class="dropdown-toggle itemized-account-toggle">Select Expense Account</div>
                                    <div class="dropdown-list itemized-account-list" style="display: none;">
                                        <input type="text" class="dropdown-search itemized-account-search" placeholder="Search Expense Account">
                                        <div class="dropdown-items itemized-account-items"></div>
                                    </div>
                                </div>
                                <input type="number" class="amount-input itemized-amount" placeholder="Enter payment amount" step="0.01">
                                <button class="add-row-btn">+</button>
                            </div>
                        </div>
                        
                        <!-- Itemized Balance Display -->
                        <div class="itemized-balance-display" id="itemized-balance-display">
                            <div class="itemized-balance-row">
                                <span class="itemized-balance-label">Total Entered Amount:</span>
                                <span class="itemized-balance-value" id="total-entered-display">₹ 0.00</span>
                            </div>
                            <div class="itemized-balance-row">
                                <span class="itemized-balance-label">Balance:</span>
                                <span class="itemized-balance-value" id="balance-display">₹ 0.00</span>
                            </div>
                        </div>
                        <div class="itemized-error" id="itemized-error">Total amount entered exceeds statement amount</div>
                    </div>
                    
                    <div class="recon-form-group">
                        <label>Amount</label>
                        <input type="text" id="manual-amount" class="recon-form-control recon-amount-input readonly-field dark-highlight" readonly />
                    </div>
                    
                    <div class="recon-form-group" id="invoice-info-section" style="display: none;">
                        <label id="outstanding-invoices">Outstanding</label>

                        <div id="outstanding-invoices-container"></div>
                        
                        <div id="customer-payment-table-section" class="customer-payment-table-container" style="display: none;">
                            <table class="customer-payment-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Account</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="allocated-row">
                                        <td><strong>Allocated</strong></td>
                                        <td>
                                            <input type="number" id="allocated-amount-input" class="amount-input" step="0.01" readonly />
                                        </td>
                                        <td><em>Here, the payment amount you entered is added automatically.</em></td>
                                    </tr>
                                    <tr>
                                        <td><strong>TDS</strong></td>
                                        <td><input type="number" id="tds-amount-input" class="amount-input" placeholder="0.00" step="0.01" /></td>
                                        <td>
                                            <select id="tds-account-select" class="account-select">
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Write Off</strong></td>
                                        <td><input type="number" id="writeoff-amount-input" class="amount-input" placeholder="0.00" step="0.01" /></td>
                                        <td>
                                            <select id="writeoff-account-select" class="account-select">
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Rounded Off</strong></td>
                                        <td><input type="number" id="roundedoff-amount-input" class="amount-input" placeholder="0.00" step="0.01" /></td>
                                        <td>
                                            <select id="roundedoff-account-select" class="account-select">
                                            </select>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="total-highlight">
                                Total Payment: ₹ <span id="customer-total-highlight">0.00</span>
                            </div>
                        </div>
                        
                        <div id="payment-amount-display-section" class="payment-amount-display" style="display: none;">
                            <div class="payment-amount-content">
                                <span class="label">Total Payment</span>
                                <span class="amount">₹ <span id="payment-amount-display">0.00</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Match Now Button Section -->
                    <div class="match-now-section" id="match-now-section" style="display: none;">
                        <button class="match-now-btn" id="match-now-btn">Match Now</button>
                    </div>
                </div>
            </div>
        </div>
    `);

    $container.appendTo(page.body);
    $rightPanel.appendTo('body');
    // ================= CUSTOMER ADVANCE UI (RUNTIME SAFE) =================
    function ensure_customer_advance_block() {
        const $container = $('#manual-categorize-section');
        if (!$container.length) return;

        if ($('#sales-order-group').length) return; // already added

        const html = `
            <div class="recon-form-group" id="sales-order-group" style="display:none;">
                <label>Sales Order</label>
                <div class="custom-dropdown">
                    <div class="dropdown-toggle" id="sales-order-toggle">Select Sales Order</div>
                    <div class="dropdown-list" id="sales-order-list" style="display:none;">
                        <input type="text" class="dropdown-search" id="sales-order-search" placeholder="Search Sales Order">
                        <div class="dropdown-items" id="sales-order-items"></div>
                    </div>
                </div>
                <input type="hidden" id="sales-order">
            </div>

            <div class="recon-form-group" id="customer-advance-amount-group" style="display:none;">
                <label>Enter advance amount</label>
                <input type="number" id="customer-advance-amount"
                       class="recon-form-control"
                       step="0.01">
            </div>
        `;

        $('#customer-group').after(html);

        initialize_single_dropdown('sales-order');
    }


    // Variables
    let currentPage = 1;
    let perPage = 20;
    let totalRecords = 0;
    let allBankEntries = [];
    let filteredBankEntries = [];
    let selectedStatement = null;
    let selectedStatementData = null;
    let taxAccounts = [];
    let expenseAccounts = [];
    let transferAccounts = [];
    let isCustomerPayment = false;
    let isSupplierPayment = false;
    let isEmployeeExpense = false;
    let isExpense = false;
    let isTransfer = false;
    let isItemized = false;
    let isEmployeeAdvance = false;
    let isCustomerAdvance = false;
    let salesOrders = [];

    let employees = [];
    let customers = [];
    let suppliers = [];
    let bankAccounts = [];
    let selectedBankAccount = '';
    let dateFrom = '';
    let dateTo = '';
    let statementAmount = 0;
    let isWithdrawal = false;
    let isDeposit = false;
    
    // Table filter variables
    let tableFilters = {
        date: '',
        statementDetails: '',
        withdrawalAmount: '',
        depositAmount: ''
    };
    
    // Filter timeout variable for debounce
    let filterTimeout;
    
    // Reverse Entry variables
    let reverseEntries = [];
    let selectedReverseEntries = [];

    // Initialize date filters
    function initialize_date_filters() {
        $('#date-from').val('');
        $('#date-to').val('');
        dateFrom = '';
        dateTo = '';
    }

    // Load bank accounts
    function load_bank_accounts() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Bank Statement Entry",
                fields: ["bank_account"],
                limit_page_length: 0
            },
            callback: function(r) {
                const uniqueBankAccounts = [...new Set(r.message.map(entry => entry.bank_account).filter(Boolean))];
                bankAccounts = uniqueBankAccounts;
                update_bank_account_dropdown();
            
            if (r && r.message && r.message.payment_entry) {
                __force_set_paid_amount__(r.message.payment_entry);
            }
        }
        });
    }

    // Update bank account dropdown
    function update_bank_account_dropdown() {
        const $dropdown = $('#bank-account-select');
        $dropdown.empty();
        
        if (bankAccounts.length === 0) {
            $dropdown.append('<option value="">No bank accounts found in statements</option>');
            return;
        }
        
        $dropdown.append('<option value="">All Bank Accounts</option>');
        
        bankAccounts.forEach(account => {
            $dropdown.append('<option value="' + account + '">' + account + '</option>');
        });
        
        if (bankAccounts.length > 0) {
            selectedBankAccount = bankAccounts[0];
            $dropdown.val(selectedBankAccount);
            $dropdown.trigger('change');
        }
    }

    // Initialize table filter inputs
    function initialize_table_filters() {
        $('#filter-date').val(tableFilters.date || '');
        $('#filter-statement-details').val(tableFilters.statementDetails || '');
        $('#filter-withdrawal-amount').val(tableFilters.withdrawalAmount || '');
        $('#filter-deposit-amount').val(tableFilters.depositAmount || '');
    }

    // Filter bank entries based on table filters
    function filter_bank_entries() {
        if (!allBankEntries || allBankEntries.length === 0) {
            filteredBankEntries = [];
            return;
        }

        filteredBankEntries = [...allBankEntries];

        if (tableFilters.date) {
            const searchDate = tableFilters.date.toLowerCase();
            filteredBankEntries = filteredBankEntries.filter(entry => {
                const entryDate = entry.date || entry.posting_date || entry.creation;
                if (!entryDate) return false;
                
                const formattedDate = frappe.datetime.str_to_user(entryDate).toLowerCase();
                return formattedDate.includes(searchDate);
            });
        }

        if (tableFilters.statementDetails) {
            const searchDetails = tableFilters.statementDetails.toLowerCase();
            filteredBankEntries = filteredBankEntries.filter(entry => {
                const description = entry.description || '';
                return description.toLowerCase().includes(searchDetails);
            });
        }

        if (tableFilters.withdrawalAmount) {
            const searchWithdrawal = tableFilters.withdrawalAmount.toLowerCase();
            filteredBankEntries = filteredBankEntries.filter(entry => {
                if (!entry.withdrawal) return false;
                
                const withdrawal = '₹ ' + format_currency(entry.withdrawal);
                return withdrawal.toLowerCase().includes(searchWithdrawal);
            });
        }

        if (tableFilters.depositAmount) {
            const searchDeposit = tableFilters.depositAmount.toLowerCase();
            filteredBankEntries = filteredBankEntries.filter(entry => {
                if (!entry.deposit) return false;
                
                const deposit = '₹ ' + format_currency(entry.deposit);
                return deposit.toLowerCase().includes(searchDeposit);
            });
        }

        totalRecords = filteredBankEntries.length;
        currentPage = 1;
        update_pagination();
        render_current_page();
    }

    // Render current page using filtered entries
    function render_current_page() {
        const startIdx = (currentPage - 1) * perPage;
        const endIdx = Math.min(startIdx + perPage, totalRecords);
        const pageEntries = filteredBankEntries.slice(startIdx, endIdx);
        
        const $tbody = $('#bank-statement-body');
        $tbody.empty();

        if (pageEntries.length === 0) {
            $tbody.append('<tr><td colspan="4">No records found</td></tr>');
            return;
        }

        pageEntries.forEach((entry, index) => {
            const withdrawal = entry.withdrawal ? '₹ ' + format_currency(entry.withdrawal) : '';
            const deposit = entry.deposit ? '₹ ' + format_currency(entry.deposit) : '';
            const entryDate = entry.date || entry.posting_date || entry.creation;
            
            const tr = $(
                '<tr class="statement-row" style="cursor: pointer;" data-statement="' + entry.name + '">' +
                    '<td>' + frappe.datetime.str_to_user(entryDate) + '</td>' +
                    '<td>' + (entry.description || '') + '</td>' +
                    '<td style="text-align: right;">' + withdrawal + '</td>' +
                    '<td style="text-align: right;">' + deposit + '</td>' +
                '</tr>'
            );

            tr.on('click', function(e) {
                e.stopPropagation();
                if ($(e.target).is('input, button, select, textarea') || $(e.target).hasClass('no-click') || $(e.target).closest('.no-click').length) return;
                select_statement_row(entry, tr);
            });

            tr.find('td:nth-child(3), td:nth-child(4)').on('click', function(e) {
                e.stopPropagation();
                select_statement_row(entry, tr);
            });

            $tbody.append(tr);
        });

        setTimeout(() => {
            enhance_first_row_clickability();
        }, 100);
    }

    // Table filter input event handler with debounce
    $(document).on('input', '.table-filter-input', (e) => {
        const $target = $(e.target);
        const id = $target.attr('id');
        const value = $target.val().trim();

        switch (id) {
            case 'filter-date': tableFilters.date = value; break;
            case 'filter-statement-details': tableFilters.statementDetails = value; break;
            case 'filter-withdrawal-amount': tableFilters.withdrawalAmount = value; break;
            case 'filter-deposit-amount': tableFilters.depositAmount = value; break;
        }

        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            filter_bank_entries();
        }, 500);
    });

    // Load bank statement entries
    function load_bank_statement_entries() {
        let filters = {};
        if (selectedBankAccount) {
            filters.bank_account = selectedBankAccount;
        }
        
        frappe.call({
            method: 'nexapp.api.get_bank_statement_entries',
            args: filters,
            callback: function (r) {
                let allEntries = r.message || [];
                
                if (dateFrom && dateTo) {
                    allEntries = allEntries.filter(entry => {
                        const entryDate = entry.date || entry.posting_date || entry.creation;
                        if (!entryDate) return true;
                        
                        const entryDateObj = new Date(entryDate);
                        const fromDateObj = new Date(dateFrom);
                        const toDateObj = new Date(dateTo);
                        
                        return entryDateObj >= fromDateObj && entryDateObj <= toDateObj;
                    });
                }
                
                allBankEntries = allEntries.sort((a, b) => {
                    const dateA = new Date(a.date || a.posting_date || a.creation);
                    const dateB = new Date(b.date || b.posting_date || b.creation);
                    return dateB - dateA;
                });
                
                filter_bank_entries();
            }
        });
    }

    // Bank account change handler
    $('#bank-account-select').change(function() {
        selectedBankAccount = $(this).val();
        currentPage = 1;
        load_cards_data();
        load_bank_statement_entries();
    });

    // Date filter handlers
    $('#apply-date-filter').click(function() {
        dateFrom = $('#date-from').val();
        dateTo = $('#date-to').val();
        
        if (dateFrom && dateTo) {
            if (new Date(dateFrom) > new Date(dateTo)) {
                frappe.msgprint('Date From cannot be greater than Date To');
                return;
            }
        }
        
        currentPage = 1;
        load_cards_data();
        load_bank_statement_entries();
    });

    $('#reset-date-filter').click(function() {
        initialize_date_filters();
        currentPage = 1;
        load_cards_data();
        load_bank_statement_entries();
    });

    // Format currency
    function format_indian_currency(amount) {
        if (!amount) return '₹ 0.00';
        
        const num = parseFloat(amount);
        if (isNaN(num)) return '₹ 0.00';
        
        if (num < 1000) {
            return '₹ ' + num.toFixed(2);
        }
        
        if (num >= 1000 && num < 100000) {
            const inThousands = num / 1000;
            return '₹ ' + inThousands.toFixed(3) + ' K';
        }
        
        if (num >= 100000 && num < 10000000) {
            const inLakhs = num / 100000;
            return '₹ ' + inLakhs.toFixed(3) + ' L';
        }
        
        const inCrores = num / 10000000;
        return '₹ ' + inCrores.toFixed(3) + ' Cr';
    }

    // Toggle right panel
    function toggleRightPanel(show) {
        if (show) {
            $rightPanel.addClass('open');
            $('.bank-recon-layout').addClass('right-panel-open');
        } else {
            $rightPanel.removeClass('open');
            $('.bank-recon-layout').removeClass('right-panel-open');
            $('.statement-row').removeClass('selected-row');
            selectedStatement = null;
            selectedStatementData = null;
        }
    }

    // Close panel when clicking X button
    $('.close-panel').click(function() {
        toggleRightPanel(false);
    });

    // Load cards data
    function load_cards_data() {
        let filters = {};

        if (selectedBankAccount) {
            filters.bank_account = selectedBankAccount;
        }

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Bank Statement Entry",
                filters: filters,
                fields: ["deposit", "withdrawal", "transaction_date", "reconciled"],
                limit_page_length: 0
            },
            callback: function (r) {
                let entries = r.message || [];

                if (dateFrom && dateTo) {
                    const from = new Date(dateFrom);
                    const to = new Date(dateTo);

                    entries = entries.filter(e => {
                        const dt = e.transaction_date ? new Date(e.transaction_date) : null;
                        if (!dt) return false;
                        return dt >= from && dt <= to;
                    });
                }

                const unreconciled = entries.filter(e =>
                    e.reconciled === 0 ||
                    e.reconciled === "0" ||
                    !e.reconciled
                );

                let totalUnreconciledWithdrawal = 0;
                let totalDeposit = 0;

                unreconciled.forEach(e => {
                    if (e.withdrawal) {
                        totalUnreconciledWithdrawal += parseFloat(e.withdrawal);
                    }
                });

                entries.forEach(e => {
                    if (e.deposit) {
                        totalDeposit += parseFloat(e.deposit);
                    }
                });

                $('#cards-container').html(
                    `
                    <div class="recon-number-card">
                        <div class="value">${unreconciled.length}</div>
                        <div class="title">Unreconciled Transactions Nos.</div>
                    </div>
                    <div class="recon-number-card">
                        <div class="value">${format_indian_currency(totalUnreconciledWithdrawal)}</div>
                        <div class="title">Withdrawal Amount</div>                       
                    </div>
                    <div class="recon-number-card">
                        <div class="value">${format_indian_currency(totalDeposit)}</div>
                        <div class="title">Deposit Amount</div>                        
                    </div>
                    `
                );
            }
        });
    }

    // Load employees
    function load_employees() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Employee",
                fields: ["name", "employee_name"],
                limit_page_length: 0
            },
            callback: function(r) {
                employees = r.message || [];
                update_employee_dropdown_items();
            }
        });
    }

    // Update employee dropdown items
    function update_employee_dropdown_items() {
        const $items = $('#employee-items');
        $items.empty();
        
        employees.forEach(employee => {
            const displayName = employee.employee_name ? `${employee.employee_name} (${employee.name})` : employee.name;
            $items.append('<div class="dropdown-item" data-value="' + employee.name + '">' + displayName + '</div>');
        });
    }

    
    // Load customers
    function load_customers() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Customer",
                fields: ["name"],
                limit_page_length: 0
            },
            callback: function(r) {
                customers = r.message || [];
                update_dropdown_items('customer', customers);
            }
        });
    }

    // Load suppliers
    function load_suppliers() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Supplier",
                fields: ["name"],
                limit_page_length: 0
            },
            callback: function(r) {
                suppliers = r.message || [];
                update_dropdown_items('supplier', suppliers);
            }
        });
    }

    // Load expense accounts
    function load_expense_accounts() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Account",
                filters: {
                    is_group: 0,
                    company: frappe.defaults.get_default("company")
                },
                fields: ["name", "account_name"],
                limit_page_length: 0
            },
            callback: function(r) {
                expenseAccounts = r.message || [];
                update_expense_account_dropdown();
                update_itemized_account_dropdowns();
            }
        });
    }

    // Update expense account dropdown
    function update_expense_account_dropdown() {
        const $items = $('#expense-items');
        $items.empty();

        expenseAccounts.forEach(acc => {
            const name = acc.account_name || acc.name;
            $items.append(`<div class="dropdown-item" data-value="${acc.name}">${name}</div>`);
        });
    }

    // Update itemized account dropdowns
    function update_itemized_account_dropdowns() {
        const $items = $('.itemized-account-items');
        $items.empty();

        expenseAccounts.forEach(acc => {
            const name = acc.account_name || acc.name;
            $items.append(`<div class="dropdown-item" data-value="${acc.name}">${name}</div>`);
        });
    }

    // Update dropdown items
    function update_dropdown_items(type, items) {
        const $items = $('#' + type + '-items');
        $items.empty();
        
        items.forEach(item => {
            $items.append('<div class="dropdown-item" data-value="' + item.name + '">' + item.name + '</div>');
        });
    }

    // Initialize custom dropdowns
    function initialize_dropdowns() {
        initialize_employee_dropdown();
        initialize_single_dropdown('customer');
        initialize_single_dropdown('supplier');
        initialize_single_dropdown('expense');
        initialize_single_dropdown('sales-order');
        initialize_transfer_dropdowns();
        initialize_itemized_dropdowns();
    }

    // Initialize transfer dropdowns with validation
    function initialize_transfer_dropdowns() {
        initialize_single_dropdown('from-account');
        initialize_single_dropdown('to-account');
        
        $('#from-account').on('change', function() {
            update_to_account_dropdown();
        });
        
        $('#to-account').on('change', function() {
            validate_transfer_accounts();
        });
    }

    // Initialize itemized dropdowns
    function initialize_itemized_dropdowns() {
        $('.itemized-account-toggle').click(function(e) {
            e.stopPropagation();
            const $list = $(this).siblings('.itemized-account-list');
            $('.itemized-account-list').not($list).hide();
            $list.toggle();
            if ($list.is(':visible')) {
                $list.find('.itemized-account-search').focus();
            }
        });

        $('.itemized-account-search').on('input', function() {
            const searchTerm = $(this).val().toLowerCase();
            const $items = $(this).siblings('.dropdown-items');
            $items.find('.dropdown-item').each(function() {
                const text = $(this).text().toLowerCase();
                $(this).toggle(text.includes(searchTerm));
            });
        });

        $('.itemized-account-items').on('click', '.dropdown-item', function() {
            const value = $(this).data('value');
            const text = $(this).text();
            const $toggle = $(this).closest('.itemized-account-list').siblings('.itemized-account-toggle');
            $toggle.text(text);
            $toggle.attr('data-value', value);
            $(this).closest('.itemized-account-list').hide();
        });

        $(document).click(function(e) {
            if (!$(e.target).closest('.itemized-account-list').length && !$(e.target).is('.itemized-account-toggle')) {
                $('.itemized-account-list').hide();
            }
        });
    }

    // Initialize employee dropdown
    function initialize_employee_dropdown() {
        const $toggle = $('#employee-toggle');
        const $list = $('#employee-list');
        const $search = $('#employee-search');
        const $hidden = $('#employee');
        const $items = $('#employee-items');

        $toggle.click(function(e) {
            e.stopPropagation();
            $list.toggle();
            if ($list.is(':visible')) {
                $search.focus();
            }
        });

        $search.on('input', function() {
            const searchTerm = $(this).val().toLowerCase();
            $items.find('.dropdown-item').each(function() {
                const text = $(this).text().toLowerCase();
                $(this).toggle(text.includes(searchTerm));
            });
        });

        $items.on('click', '.dropdown-item', function() {
            const value = $(this).data('value');
            const text = $(this).text();
            $toggle.text(text);
            $hidden.val(value);
            $list.hide();
            $('#employee').trigger('change');
        });

        $(document).click(function(e) {
            if (!$(e.target).closest('#employee-list').length && !$(e.target).is('#employee-toggle')) {
                $list.hide();
            }
        });
    }

    // Initialize single dropdown
    function initialize_single_dropdown(type) {
        const $toggle = $('#' + type + '-toggle');
        const $list = $('#' + type + '-list');
        const $search = $('#' + type + '-search');
        const $hidden = $('#' + type);
        const $items = $('#' + type + '-items');

        $toggle.click(function(e) {
            e.stopPropagation();
            $list.toggle();
            if ($list.is(':visible')) {
                $search.focus();
            }
        });

        $search.on('input', function() {
            const searchTerm = $(this).val().toLowerCase();
            $items.find('.dropdown-item').each(function() {
                const text = $(this).text().toLowerCase();
                $(this).toggle(text.includes(searchTerm));
            });
        });

        $items.on('click', '.dropdown-item', function() {
            const value = $(this).data('value');
            const text = $(this).text();
            $toggle.text(text);
            $hidden.val(value);
            $list.hide();
            
            if (type === 'customer') {
                $('#customer').trigger('change');

        if ($('#category').val() === 'Customer Advance') {
            load_sales_orders_for_customer(customer);
        }

            } else if (type === 'supplier') {
                $('#supplier').trigger('change');
            } else if (type === 'from-account' || type === 'to-account') {
                $hidden.trigger('change');
            }
        });

        $(document).click(function(e) {
            if (!$(e.target).closest('#' + type + '-list').length && !$(e.target).is('#' + type + '-toggle')) {
                $list.hide();
            }
        });
    }

    // Load tax accounts
    function load_tax_accounts() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Account",
                filters: {
                    company: frappe.defaults.get_default("company")
                },
                fields: ["name"],
                limit_page_length: 0
            },
            callback: function(r) {
                taxAccounts = r.message || [];
                populate_tax_dropdowns();
            }
        });
    }

    // Populate tax account dropdowns
    function populate_tax_dropdowns() {
        const tdsDefault = "TDS Receivable - NTPL";
        const writeOffDefault = "Write Off - NTPL";
        const roundedOffDefault = "Rounded Off - NTPL";
        
        $('#tds-account-select').empty();
        taxAccounts.forEach(account => {
            $('#tds-account-select').append('<option value="' + account.name + '" ' + (account.name === tdsDefault ? 'selected' : '') + '>' + account.name + '</option>');
        });
        
        $('#writeoff-account-select').empty();
        taxAccounts.forEach(account => {
            $('#writeoff-account-select').append('<option value="' + account.name + '" ' + (account.name === writeOffDefault ? 'selected' : '') + '>' + account.name + '</option>');
        });
        
        $('#roundedoff-account-select').empty();
        taxAccounts.forEach(account => {
            $('#roundedoff-account-select').append('<option value="' + account.name + '" ' + (account.name === roundedOffDefault ? 'selected' : '') + '>' + account.name + '</option>');
        });
    }

    // Tab switching
    $('.recon-tab').click(function() {
        $('.recon-tab').removeClass('active');
        $(this).addClass('active');
        
        const tab = $(this).data('tab');
        if (tab === 'match') {
            $('#match-info-section').show();
            $('#manual-categorize-section').hide();
            if (selectedStatementData) {
                const amount = selectedStatementData.withdrawal || selectedStatementData.deposit;
                fetch_matches(amount, selectedStatementData.name, selectedStatementData.description, null, selectedStatementData.deposit);
            }
        } else {
            $('#match-info-section').hide();
            $('#manual-categorize-section').show();
        }
    });

    // Update category dropdown based on transaction type
    function update_category_dropdown() {
        const $category = $('#category');
        $category.empty();
        
        $category.append('<option value="">Select Category</option>');
        
        if (isWithdrawal) {
            $category.append('<option value="Employee Expense Claim">Employee Expense Claim</option>');
            $category.append('<option value="Employee Advance">Employee Advance</option>');
            $category.append('<option value="Supplier Payment">Supplier Payment</option>');
            $category.append('<option value="Expense">Expense</option>');
            $category.append('<option value="Transfer To Another Account">Transfer To Another Account</option>');
            $category.append('<option value="Itemized Journal Entry">Itemized Journal Entry');
        } else if (isDeposit) {
            $category.append('<option value="Customer Payment">Customer Payment</option>');
            $category.append('<option value="Customer Advance">Customer Advance</option>');
            $category.append('<option value="Transfer To Another Account">Transfer To Another Account</option>');
        }
    }

    // Category change
    $('#category').change(function() {
        const category = $(this).val();
        
        // Reset all groups
        $('#from-account-group').hide();
        $('#employee-group').hide();
        $('#customer-group').hide();
        $('#supplier-group').hide();
        $('#expense-account-group').hide();
        $('#to-account-group').hide();
        $('#transfer-description-group').hide();
        $('#itemized-group').hide();
        $('#invoice-info-section').hide();
        $('#customer-payment-table-section').hide();
        $('#payment-amount-display-section').hide();
        $('#match-now-section').hide();
        $('#employee-advance-list').hide();
        
        // Reset dropdowns
        $('#employee-toggle').text('Select Employee');
        $('#employee').val('');
        $('#customer-toggle').text('Select Customer');
        $('#customer').val('');
        $('#supplier-toggle').text('Select Supplier');
        $('#supplier').val('');
        $('#expense-toggle').text('Select Expense Account');
        $('#expense').val('');
        $('#from-account-toggle').text('Select From Account');
        $('#from-account').val('');
        $('#to-account-toggle').text('Select To Account');
        $('#to-account').val('');
        $('#transfer-description').val('');
        $('#outstanding-invoices-container').empty();
        
        // Reset error messages
        $('#from-account-error').hide();
        $('#to-account-error').hide();
        
        // Reset payment amounts
        $('#allocated-amount-input').val('0.00');
        $('#tds-amount-input').val('');
        $('#writeoff-amount-input').val('');
        $('#roundedoff-amount-input').val('');
        $('#customer-total-highlight').text('');
        $('#payment-amount-display').text('');
        
        // Reset itemized journal entry
        reset_itemized_journal_entry();
        
        isCustomerPayment = false;
        isSupplierPayment = false;
        isEmployeeExpense = false;
        isExpense = false;
        isTransfer = false;
        isItemized = false;
        isEmployeeAdvance = false;
        
        // Show/hide fields based on category
        if (category === 'Employee Expense Claim') {
            $('#employee-group').show();
            $('#invoice-info-section').show();
            $('#payment-amount-display-section').show();
            $('#match-now-section').show();
            isEmployeeExpense = true;
        } else if (category === 'Employee Advance') {
            $('#employee-group').show();
            $('#match-now-section').show();
            isEmployeeAdvance = true;
        } else if (category === 'Customer Payment') {
            $('#customer-group').show();
            $('#invoice-info-section').show();
            $('#customer-payment-table-section').show();
            $('#match-now-section').show();
            isCustomerPayment = true;
        } else if (category === 'Supplier Payment') {
            $('#supplier-group').show();
            $('#invoice-info-section').show();
            $('#payment-amount-display-section').show();
            $('#match-now-section').show();
            isSupplierPayment = true;
        } else if (category === 'Expense') {
            $('#expense-account-group').show();
            $('#match-now-section').show();
            isExpense = true;
        } else if (category === 'Transfer To Another Account') {
            $('#from-account-group').show();
            $('#to-account-group').show();
            $('#transfer-description-group').show();
            $('#match-now-section').show();
            isTransfer = true;
            
            update_to_account_dropdown();
            
            if (selectedStatementData && selectedStatementData.description) {
                $('#transfer-description').val(selectedStatementData.description);
            }
        } else if (category === 'Itemized Journal Entry') {
            $('#itemized-group').show();
            $('#match-now-section').show();
            isItemized = true;
            
            initialize_itemized_journal_entry();
        }
    });

    // Initialize itemized journal entry
    function initialize_itemized_journal_entry() {
        $('#itemized-accounts-container').empty();
        
        $('#itemized-accounts-container').append(`
            <div class="itemized-row">
                <div class="custom-dropdown">
                    <div class="dropdown-toggle itemized-account-toggle">Select Expense Account</div>
                    <div class="dropdown-list itemized-account-list" style="display: none;">
                        <input type="text" class="dropdown-search itemized-account-search" placeholder="Search Expense Account">
                        <div class="dropdown-items itemized-account-items"></div>
                    </div>
                </div>
                <input type="number" class="amount-input itemized-amount" placeholder="Enter payment amount" step="0.01">
                <button class="add-row-btn">+</button>
            </div>
        `);
        
        update_itemized_account_dropdowns();
        update_itemized_balance_display();
        initialize_itemized_event_listeners();
    }

    // Reset itemized journal entry
    function reset_itemized_journal_entry() {
        $('#itemized-accounts-container').empty();
    }

    // Initialize itemized event listeners
    function initialize_itemized_event_listeners() {
        $(document).off('click', '.add-row-btn').on('click', '.add-row-btn', function() {
            add_itemized_row();
        });
        
        $(document).off('click', '.remove-row-btn').on('click', '.remove-row-btn', function() {
            $(this).closest('.itemized-row').remove();
            update_itemized_balance_display();
        });
        
        $(document).off('input', '.itemized-amount').on('input', '.itemized-amount', function() {
            update_itemized_balance_display();
        });
        
        initialize_itemized_dropdowns();
    }

    // Add itemized row
    function add_itemized_row() {
        const rowHtml = `
            <div class="itemized-row">
                <div class="custom-dropdown">
                    <div class="dropdown-toggle itemized-account-toggle">Select Expense Account</div>
                    <div class="dropdown-list itemized-account-list" style="display: none;">
                        <input type="text" class="dropdown-search itemized-account-search" placeholder="Search Expense Account">
                        <div class="dropdown-items itemized-account-items"></div>
                    </div>
                </div>
                <input type="number" class="amount-input itemized-amount" placeholder="Enter payment amount" step="0.01">
                <button class="remove-row-btn">×</button>
            </div>
        `;
        
        $('#itemized-accounts-container').append(rowHtml);
        update_itemized_account_dropdowns();
        initialize_itemized_dropdowns();
    }

    // Update itemized balance display
    function update_itemized_balance_display() {
        if (!isItemized) return;
        
        const amountText = $('#manual-amount').val().replace(/[₹,]/g, '').trim();
        statementAmount = parseFloat(amountText) || 0;
        
        let totalEntered = 0;
        $('.itemized-amount').each(function() {
            const amount = parseFloat($(this).val()) || 0;
            totalEntered += amount;
        });
        
        const balance = statementAmount - totalEntered;
        
        $('#total-entered-display').text('₹ ' + format_currency(totalEntered));
        
        const $balanceDisplay = $('#balance-display');
        $balanceDisplay.text('₹ ' + format_currency(Math.abs(balance)));
        
        if (Math.abs(balance) < 0.01) {
            $balanceDisplay.removeClass('itemized-balance-positive itemized-balance-negative').addClass('itemized-balance-zero');
        } else if (balance > 0) {
            $balanceDisplay.removeClass('itemized-balance-negative itemized-balance-zero').addClass('itemized-balance-positive');
        } else {
            $balanceDisplay.removeClass('itemized-balance-positive itemized-balance-zero').addClass('itemized-balance-negative');
        }
        
        const $error = $('#itemized-error');
        if (balance < -0.01) {
            $error.show();
        } else {
            $error.hide();
        }
    }

    // SINGLE MATCH NOW BUTTON HANDLER - UPDATED FOR EMPLOYEE ADVANCE PAYMENT ENTRY
    $(document).on('click', '#match-now-btn', function () {
        const category = $('#category').val();
        
        if (category === 'Expense') {
            const expenseAccount = $('#expense').val();
            if (!expenseAccount) {
                frappe.msgprint('Please select an Expense Account');
                return;
            }

            const amountText = $('#manual-amount').val().replace(/[₹,]/g, '').trim();
            const amount = parseFloat(amountText) || 0;

            if (!selectedStatement) {
                frappe.msgprint("No bank statement selected.");
                return;
            }

            frappe.confirm(
                `Create Journal Entry?<br><br>
                 <strong>Debit:</strong> ${expenseAccount}<br>         
                 <strong>Amount:</strong> ₹ ${amount.toFixed(2)}`,
                function() {
                    frappe.call({
                        method: "nexapp.api.match_now_create_journal",
                        args: {
                            statement_name: selectedStatement,
                            expense_account: expenseAccount
                        },
                        callback: function(r) {
                            if (r.message.status === 'ok') {
                                frappe.msgprint("Journal Entry Created: " + r.message.journal_entry);
                                load_bank_statement_entries();
                                load_cards_data();
                                toggleRightPanel(false);
                            } else {
                                frappe.msgprint("Error: " + r.message.error);
                            }
                        }
                    });
                }
            );
        } 
        else if (category === 'Transfer To Another Account') {
            const fromAccount = $('#from-account').val();
            const toAccount = $('#to-account').val();
            const transferDescription = $('#transfer-description').val();
            
            if (!fromAccount) {
                frappe.msgprint('Please select a from account');
                return;
            }
            
            if (!toAccount) {
                frappe.msgprint('Please select a to account');
                return;
            }
            
            if (!validate_transfer_accounts()) {
                frappe.msgprint('From Account and To Account cannot be the same');
                return;
            }
            
            if (!transferDescription) {
                frappe.msgprint('Please enter a transfer description');
                return;
            }
            
            const amountText = $('#manual-amount').val().replace(/[₹,]/g, '').trim();
            const amount = parseFloat(amountText) || 0;
            
            if (!selectedStatement) {
                frappe.msgprint("No bank statement selected.");
                return;
            }
            
            frappe.confirm(
                `Create Bank Transfer?<br><br>
                 <strong>From Account:</strong> ${fromAccount}<br>
                 <strong>To Account:</strong> ${toAccount}<br>
                 <strong>Amount:</strong> ₹ ${amount.toFixed(2)}<br>
                 <strong>Description:</strong> ${transferDescription}`,
                function() {
                    frappe.call({
                        method: "nexapp.api.create_bank_transfer",
                        args: {
                            statement_name: selectedStatement,
                            from_account: fromAccount,
                            to_account: toAccount,
                            amount: amount,
                            description: transferDescription
                        },
                        callback: function(r) {
                            if (r.message.status === 'ok') {
                                frappe.msgprint("Bank Transfer Created: " + r.message.journal_entry);
                                load_bank_statement_entries();
                                load_cards_data();
                                toggleRightPanel(false);
                            } else {
                                frappe.msgprint("Error: " + r.message.error);
                            }
                        }
                    });
                }
            );
        }
        else if (category === 'Itemized Journal Entry') {
            handle_itemized_journal_entry();
        }
        else if (category === 'Employee Advance') {
            handle_employee_advance_payment_entry();
        }
        else if (category === 'Employee Expense Claim' || category === 'Customer Payment' || category === 'Supplier Payment') {
            handleManualCategorization();
        }
    });

    // Handle employee advance payment entry (UPDATED FOR PAYMENT ENTRY)
    function handle_employee_advance_payment_entry() {
        const employee = $('#employee').val();
        if (!employee) {
            frappe.msgprint('Please select an employee');
            return;
        }

        // Get the selected advance and amount
        let selectedAdvanceName = '';
        let enteredAmount = 0;

        // Find the first advance with a valid amount
        $('#employee-advance-list').find('input[type="number"]').each(function() {
            const payment = parseFloat($(this).val()) || 0;
            if (payment > 0 && !selectedAdvanceName) {
                selectedAdvanceName = $(this).data('adv');
                enteredAmount = payment;
            }
        });

        if (!selectedAdvanceName || enteredAmount <= 0) {
            frappe.msgprint('Please enter payment amount for at least one Employee Advance');
            return;
        }

        const bankAmountText = $('#manual-amount').val().replace(/[₹,]/g, '').trim();
        const bankAmount = parseFloat(bankAmountText) || 0;

        if (enteredAmount > bankAmount) {
            frappe.msgprint(`Payment amount (₹ ${enteredAmount.toFixed(2)}) cannot exceed bank transaction amount (₹ ${bankAmount.toFixed(2)})`);
            return;
        }

        if (!selectedStatement) {
            frappe.msgprint("No bank statement selected.");
            return;
        }

        // Get company from defaults
        const company = frappe.defaults.get_default("company");
        
        // Get selected bank account
        const bankAccount = selectedBankAccount;

        let confirmationMessage = '<p>Create Payment Entry for Employee Advance?</p><div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">';
        
        confirmationMessage += '<strong>Employee Advance:</strong> ' + selectedAdvanceName + '<br>';
        confirmationMessage += '<strong>Payment Amount:</strong> ₹ ' + format_currency(enteredAmount) + '<br>';
        confirmationMessage += '<strong>Bank Account:</strong> ' + bankAccount + '<br>';
        confirmationMessage += '</div>';

        frappe.confirm(
            confirmationMessage,
            function() {
                frappe.call({
                    method: "nexapp.api.create_payment_entry_for_employee_advance",
                    args: {
                        statement_name: selectedStatement,
                        employee: employee,
                        advance_name: selectedAdvanceName,
                        amount: enteredAmount,
                        company: company,
                        bank_account: bankAccount
                    },
                    callback: function(r) {
                        if (r.message.status === 'success') {
                            frappe.msgprint({
                                title: __('Success'),
                                indicator: 'green',
                                message: __('Payment Entry Created: ' + r.message.payment_entry)
                            });
                            
                            // Also reconcile the bank statement entry
                            reconcileBankStatementAfterPayment(r.message.payment_entry);
                            
                            load_bank_statement_entries();
                            load_cards_data();
                            toggleRightPanel(false);
                        } else {
                            frappe.msgprint({
                                title: __('Error'),
                                indicator: 'red',
                                message: __('Error: ' + r.message.error)
                            });
                        }
                    }
                });
            }
        );
    }

    // Reconcile bank statement after successful payment entry creation
    function reconcileBankStatementAfterPayment(paymentEntryName) {
        if (!selectedStatement) return;
        
        frappe.call({
            method: "nexapp.api.reconcile_bank_statement_with_payment",
            args: {
                statement_name: selectedStatement,
                payment_entry: paymentEntryName
            },
            callback: function(r) {
                if (r.message.status !== 'success') {
                    console.warn('Could not reconcile bank statement:', r.message.error);
                }
            }
        });
    }

    // Handle itemized journal entry
    function handle_itemized_journal_entry() {
        const itemizedEntries = [];
        let totalAmount = 0;
        let hasErrors = false;
        
        $('.itemized-row').each(function(index) {
            const accountToggle = $(this).find('.itemized-account-toggle');
            const account = accountToggle.attr('data-value');
            const accountName = accountToggle.text();
            const amount = parseFloat($(this).find('.itemized-amount').val()) || 0;
            
            if (!account || account === 'Select Expense Account') {
                frappe.msgprint('Please select an expense account for all rows');
                hasErrors = true;
                return false;
            }
            
            if (amount <= 0) {
                frappe.msgprint('Please enter a valid payment amount for all rows');
                hasErrors = true;
                return false;
            }
            
            itemizedEntries.push({
                account: account,
                account_name: accountName,
                amount: amount
            });
            
            totalAmount += amount;
        });
        
        if (hasErrors) return;
        
        if (itemizedEntries.length === 0) {
            frappe.msgprint('Please add at least one itemized account entry');
            return;
        }
        
        const bankAmountText = $('#manual-amount').val().replace(/[₹,]/g, '').trim();
        const bankAmount = parseFloat(bankAmountText) || 0;
        
        if (Math.abs(totalAmount - bankAmount) > 0.01) {
            frappe.msgprint(`Total itemized amount (₹ ${totalAmount.toFixed(2)}) does not match bank transaction amount (₹ ${bankAmount.toFixed(2)})`);
            return;
        }
        
        if (!selectedStatement) {
            frappe.msgprint("No bank statement selected.");
            return;
        }
        
        let confirmationMessage = '<p>Create Itemized Journal Entry?</p><div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">';
        
        confirmationMessage += '<strong>Itemized Accounts:</strong><br>';
        itemizedEntries.forEach(entry => {
            confirmationMessage += `- ${entry.account_name}: ₹ ${format_currency(entry.amount)}<br>`;
        });
        
        confirmationMessage += `<br><strong>Total Amount: ₹ ${format_currency(totalAmount)}</strong>`;
        confirmationMessage += '</div>';
        
        frappe.confirm(
            confirmationMessage,
            function() {
                frappe.call({
                    method: "nexapp.api.create_itemized_journal_entry",
                    args: {
                        statement_name: selectedStatement,
                        itemized_entries: itemizedEntries,
                        company: frappe.defaults.get_default("company")
                    },
                    callback: function(r) {
                        if (r.message.status === 'ok') {
                            frappe.msgprint("Itemized Journal Entry Created: " + r.message.journal_entry);
                            load_bank_statement_entries();
                            load_cards_data();
                            toggleRightPanel(false);
                        } else {
                            frappe.msgprint("Error: " + r.message.error);
                        }
                    }
                });
            }
        );
    }

    // Function to handle manual categorization
    function handleManualCategorization() {
        const category = $('#category').val();
        const employee = $('#employee').val();
        const customer = $('#customer').val();
        const supplier = $('#supplier').val();
        const expenseAccount = $('#expense').val();
        const fromAccount = $('#from-account').val();
        const toAccount = $('#to-account').val();
        const transferDescription = $('#transfer-description').val();
        let amount = $('#manual-amount').val();

        const invoicePayments = [];
        let invoiceDetails = [];

        $('.payment-amount-input').each(function() {
            const payment = parseFloat($(this).val()) || 0;
            if (payment > 0) {
                let doctype = '';
                let party = '';
                const invoiceName = $(this).data('invoice');

                if (category === 'Employee Expense Claim') {
                    doctype = 'Expense Claim';
                    party = employee;
                } else if (category === 'Customer Payment') {
                    doctype = 'Sales Invoice';
                    party = customer;
                } else if (category === 'Supplier Payment') {
                    doctype = 'Purchase Invoice';
                    party = supplier;
                }

                invoicePayments.push({
                    invoice: invoiceName,
                    amount: payment,
                    doctype: doctype,
                    party: party
                });

                const $container = $(this).closest('.invoice-payment-container');
                let itemName = '';
                if (category === 'Employee Expense Claim') {
                    itemName = $container
                        .find('.invoice-payment-header div:first-child')
                        .html()
                        .split('<br>')[0]
                        .replace('<strong>Expense Claim:</strong>', '')
                        .trim();
                } else {
                    itemName = $container
                        .find('.invoice-payment-header div:first-child')
                        .html()
                        .split('<br>')[0]
                        .replace('<strong>Invoice No:</strong>', '')
                        .trim();
                }
                const dueAmount = $container
                    .find('.invoice-payment-header div:last-child strong')
                    .text()
                    .replace('Due:', '')
                    .trim();

                invoiceDetails.push({
                    invoice: invoiceName,
                    itemName: itemName,
                    amount: payment,
                    dueAmount: dueAmount
                });
            }
        });

        amount = amount.replace(/₹\s?/, '');
        const bankAmount = parseFloat(amount) || 0;

        function proceedManualCategorization(allowOverpayment) {
            if (!selectedStatement) {
                frappe.msgprint('Please select a bank statement entry');
                return;
            }

            if (
                (category === 'Employee Expense Claim' ||
                    category === 'Customer Payment' ||
                    category === 'Supplier Payment') &&
                invoicePayments.length === 0
            ) {
                frappe.msgprint('Please enter payment amounts for at least one item');
                return;
            }

            let taxAdjustments = [];
            if (category === 'Customer Payment') {
                const tdsAmount = parseFloat($('#tds-amount-input').val()) || 0;
                const tdsAccount = $('#tds-account-select').val();
                if (tdsAmount > 0) {
                    taxAdjustments.push({
                        charge_type: 'Actual',
                        account_head: tdsAccount,
                        tax_amount: tdsAmount
                    });
                }

                const writeOffAmount = parseFloat($('#writeoff-amount-input').val()) || 0;
                const writeOffAccount = $('#writeoff-account-select').val();
                if (writeOffAmount > 0) {
                    taxAdjustments.push({
                        charge_type: 'Actual',
                        account_head: writeOffAccount,
                        tax_amount: writeOffAmount
                    });
                }

                const roundedOffAmount = parseFloat($('#roundedoff-amount-input').val()) || 0;
                const roundedOffAccount = $('#roundedoff-account-select').val();
                if (roundedOffAmount > 0) {
                    taxAdjustments.push({
                        charge_type: 'Actual',
                        account_head: roundedOffAccount,
                        tax_amount: roundedOffAmount
                    });
                }
            }

            let confirmationMessage =
                '<p>Create Payment Entry for the following items?</p>';

            if (category === 'Expense') {
                confirmationMessage +=
                    '<div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">' +
                    '<strong>Expense Account:</strong> ' +
                    expenseAccount +
                    '<br>' +
                    '<strong>Amount:</strong> ₹ ' +
                    format_currency(amount) +
                    '</div>';
            } else if (category === 'Transfer To Another Account') {
                confirmationMessage +=
                    '<div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">' +
                    '<strong>From Account:</strong> ' +
                    fromAccount +
                    '<br>' +
                    '<strong>To Account:</strong> ' +
                    toAccount +
                    '<br>' +
                    '<strong>Amount:</strong> ₹ ' +
                    format_currency(amount) +
                    '<br>' +
                    '<strong>Description:</strong> ' +
                    transferDescription +
                    '</div>';
            } else {
                confirmationMessage +=
                    '<div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">' +
                    '<strong>Category:</strong> ' +
                    category +
                    '<br>';

                if (category === 'Employee Expense Claim') {
                    const employeeName = $('#employee-toggle').text();
                    confirmationMessage += '<strong>Employee:</strong> ' + employeeName + '<br>';
                }

                confirmationMessage += '<strong>Details:</strong><br>';

                invoiceDetails.forEach((detail) => {
                    confirmationMessage +=
                        '- ' +
                        detail.itemName +
                        ' (Invoice: ' +
                        detail.invoice +
                        '), Amount: ₹ ' +
                        format_currency(detail.amount) +
                        ', Due: ' +
                        detail.dueAmount +
                        '<br>';
                });

                confirmationMessage += '</div>';
            }

            if (category === 'Customer Payment') {
                const totalAllocated =
                    parseFloat($('#allocated-amount-input').val()) || 0;
                const tds =
                    parseFloat($('#tds-amount-input').val()) || 0;
                const writeoff =
                    parseFloat($('#writeoff-amount-input').val()) || 0;
                const roundedoff =
                    parseFloat($('#roundedoff-amount-input').val()) || 0;

                const totalPaymentAmount =
                    totalAllocated - tds - writeoff - roundedoff;
                const excess = bankAmount - totalPaymentAmount;

                confirmationMessage +=
                    '<div style="margin-top: 10px;">' +
                    '<strong>Bank Transaction Amount: ₹ ' +
                    format_currency(bankAmount) +
                    '</strong><br>' +
                    '<strong>Total Allocated (Net): ₹ ' +
                    format_currency(totalPaymentAmount) +
                    '</strong>';

                if (excess > 0.01) {
                    confirmationMessage +=
                        '<br><strong>Excess (Unallocated) Amount: ₹ ' +
                        format_currency(excess) +
                        '</strong>';
                }

                confirmationMessage += '</div>';
            } else if (
                category === 'Expense' ||
                category === 'Transfer To Another Account'
            ) {
                confirmationMessage +=
                    '<div style="margin-top: 10px;">' +
                    '<strong>Total Amount: ₹ ' +
                    format_currency(bankAmount) +
                    '</strong>' +
                    '</div>';
            } else {
                const totalPaymentAmount =
                    parseFloat($('#payment-amount-display').text()) || 0;
                confirmationMessage +=
                    '<div style="margin-top: 10px;">' +
                    '<strong>Total Payment Amount: ₹ ' +
                    format_currency(totalPaymentAmount) +
                    '</strong>' +
                    '</div>';
            }

            frappe.confirm(
                confirmationMessage,
                function () {
                    frappe.call({
                        method: 'nexapp.api.categorize_manually',
                        args: {
                            statement_name: selectedStatement,
                            invoices: invoicePayments,
                            category: category,
                            employee: employee,
                            customer: customer,
                            supplier: supplier,
                            expense_account: expenseAccount,
                            from_account: fromAccount,
                            to_account: toAccount,
                            transfer_description: transferDescription,
                            company: frappe.defaults.get_default('company'),
                            tax_adjustments: JSON.stringify(taxAdjustments),
                            allow_overpayment: allowOverpayment
                        },
                        callback: function (r) {
                            if (r.message.status === 'ok') {
                                frappe.msgprint({
                                    title: __('Success'),
                                    indicator: 'green',
                                    message: __(
                                        'Payment Entry created successfully!'
                                    )
                                });
                                load_bank_statement_entries();
                                load_cards_data();
                                $('#category').val('');
                                $('#employee-toggle').text('Select Employee');
                                $('#employee').val('');
                                $('#customer-toggle').text('Select Customer');
                                $('#customer').val('');
                                $('#supplier-toggle').text('Select Supplier');
                                $('#supplier').val('');
                                $('#expense-toggle').text('Select Expense Account');
                                $('#expense').val('');
                                $('#from-account-toggle').text('Select From Account');
                                $('#from-account').val('');
                                $('#to-account-toggle').text('Select To Account');
                                $('#to-account').val('');
                                $('#transfer-description').val('');
                                $('#outstanding-invoices-container').empty();
                                $('#from-account-group').hide();
                                $('#employee-group').hide();
                                $('#customer-group').hide();
                                $('#supplier-group').hide();
                                $('#expense-account-group').hide();
                                $('#to-account-group').hide();
                                $('#transfer-description-group').hide();
                                $('#itemized-group').hide();
                                $('#invoice-info-section').hide();
                                $('#customer-payment-table-section').hide();
                                $('#payment-amount-display-section').hide();
                                $('#match-now-section').hide();
                                toggleRightPanel(false);
                            } else {
                                frappe.msgprint({
                                    title: __('Error'),
                                    indicator: 'red',
                                    message: __('Error: ' + r.message.error)
                                });
                            }
                        }
                    });
                }
            );
        }

        if (!category) return;

        if (category === 'Employee Expense Claim' && !employee) return;

        if (category === 'Customer Payment' && !customer) return;

        if (category === 'Supplier Payment' && !supplier) return;

        if (category === 'Expense' && !expenseAccount) return;

        if (category === 'Transfer To Another Account' && !fromAccount) return;
        if (category === 'Transfer To Another Account' && !toAccount) return;
        if (category === 'Transfer To Another Account' && !transferDescription) return;

        if (
            category === 'Transfer To Another Account' &&
            !validate_transfer_accounts()
        ) {
            frappe.msgprint('From Account and To Account cannot be the same');
            return;
        }

        let totalPaymentAmount = 0;
        if (category === 'Customer Payment') {
            const allocated = parseFloat($('#allocated-amount-input').val()) || 0;
            const tds = parseFloat($('#tds-amount-input').val()) || 0;
            const writeoff =
                parseFloat($('#writeoff-amount-input').val()) || 0;
            const roundedoff =
                parseFloat($('#roundedoff-amount-input').val()) || 0;
            totalPaymentAmount = allocated - tds - writeoff - roundedoff;
        } else if (
            category === 'Employee Expense Claim' ||
            category === 'Supplier Payment'
        ) {
            totalPaymentAmount =
                parseFloat($('#payment-amount-display').text()) || 0;
        } else if (
            category === 'Expense' ||
            category === 'Transfer To Another Account'
        ) {
            totalPaymentAmount = bankAmount;
        }

        if (totalPaymentAmount > bankAmount) {
            frappe.msgprint(
                'Total payment amount cannot exceed bank transaction amount'
            );
            return;
        }

        if (category === 'Customer Payment') {
            const unallocated = bankAmount - totalPaymentAmount;

            if (unallocated > 0.01) {
                const message =
                    `Bank transaction amount is ₹ ${format_currency(
                        bankAmount
                    )}<br>` +
                    `Total allocated to invoices is ₹ ${format_currency(
                        totalPaymentAmount
                    )}<br><br>` +
                    `Excess amount ₹ ${format_currency(
                        unallocated
                    )} will stay as unallocated amount for this customer.<br><br>` +
                    `Do you want to keep this excess as overpayment?`;

                frappe.confirm(
                    message,
                    function () {
                        proceedManualCategorization(true);
                    },
                    function () {
                        proceedManualCategorization(false);
                    }
                );
                return;
            }
        }

        proceedManualCategorization(false);
    }

    // Employee change handler
    $('#employee').change(function() {
        const employee = $(this).val();
        if (!employee) {
            $('#outstanding-invoices-container').html('<div class="no-invoices">Select an employee to view outstanding expense claims</div>');
            $('#employee-advance-list').hide();
            return;
        }
        
        // Load based on selected category
        const category = $('#category').val();
        if (category === 'Employee Expense Claim') {
            load_outstanding_expense_claims(employee);
        } else if (category === 'Employee Advance') {
            load_employee_advances_for_selected_employee();
        }
    });

    // Customer change
    $('#customer').change(function() {
        const customer = $(this).val();
        if (!customer) {
            $('#outstanding-invoices-container').html('<div class="no-invoices">Select a customer to view outstanding invoices</div>');
            update_allocated_amount();
            return;
        }
        
        load_outstanding_invoices('Sales Invoice', 'customer', customer);
    });

    // Supplier change
    $('#supplier').change(function() {
        const supplier = $(this).val();
        if (!supplier) {
            $('#outstanding-invoices-container').html('<div class="no-invoices">Select a supplier to view outstanding invoices</div>');
            return;
        }
        
        load_outstanding_invoices('Purchase Invoice', 'supplier', supplier);
    });

    // Load outstanding expense claims for employee
    function load_outstanding_expense_claims(employee) {
        frappe.call({
            method: 'nexapp.api.get_outstanding_expense_claims',
            args: {
                employee: employee,
                company: frappe.defaults.get_default("company")
            },
            callback: function(r) {
                const expenseClaims = r.message || [];
                const $container = $('#outstanding-invoices-container');
                $container.empty();
                
                if (expenseClaims.length === 0) {
                    $container.append('<div class="no-invoices">No outstanding expense claims found</div>');
                    return;
                }
                
                expenseClaims.forEach(claim => {
                    let claimHtml = 
                        '<div class="invoice-payment-container" data-invoice="' + claim.name + '">' +
                            '<div class="invoice-payment-header">' +
                                '<div>' +
                                    '<strong>Expense Claim:</strong> ' + claim.name + '<br>' +
                                    '<strong>Claim Date:</strong> ' + frappe.datetime.str_to_user(claim.posting_date) + '<br>' +
                                    '<strong>Description:</strong> ' + (claim.description || 'No description') +
                                '</div>' +
                                '<div style="text-align: right;">' +
                                    '<strong>Due:</strong> ₹ ' + format_currency(claim.total_sanctioned_amount || claim.outstanding_amount) +
                                '</div>' +
                            '</div>' +
                            '<div class="payment-input-container">' +
                                '<input type="number" class="payment-amount-input" ' +
                                       'data-invoice="' + claim.name + '" ' +
                                       'data-max="' + (claim.total_sanctioned_amount || claim.outstanding_amount) + '" ' +
                                       'placeholder="Enter payment amount" ' +
                                       'step="0.01" />' +
                            '</div>' +
                        '</div>';
                    $container.append(claimHtml);
                });
                
                $('.payment-amount-input').on('input', function() {
                    if (isEmployeeExpense) {
                        validate_expense_payment_amounts();
                    }
                });
            }
        });
    }

    // Load Employee Advances for selected employee
    function load_employee_advances_for_selected_employee() {
    const employee = $("#employee").val();
    if (!employee) return;

    frappe.call({
        method: "nexapp.api.get_unpaid_employee_advances",
        args: {
            employee: employee
        },
        callback: function(r) {
            const advances = r.message || [];
            const $container = $("#employee-advance-list");
            $container.empty();

            if (advances.length === 0) {
                $container.hide();
                return;
            }

            $container.show();

            advances.forEach(adv => {
    const html = `
        <div style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 18px;">

            <!-- Orange Badge Heading -->
            <div style="
                display: inline-block;
                background-color: #ff6600;
                color: white;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 10px;
            ">
                Advance Unpaid Amount
            </div>

            <!-- Employee Advance Name -->
            <div style="font-weight: bold; font-size: 15px; margin-top: 5px;">
                Employee Advance :
                <a href="/app/employee-advance/${adv.name}" target="_blank">
                    ${adv.name}
                </a>
            </div>

            <!-- Due Amount moved to second line -->
            <div style="margin-top: 4px; font-size: 14px; color: #444;">
                <strong>Due:</strong> ₹ ${format_currency(adv.pending_amount)}
            </div>

            <!-- Posting Date -->
            <div style="margin-top: 5px; color: #666;">
                Posting Date: ${frappe.datetime.str_to_user(adv.posting_date)}
            </div>

            <!-- Amount Input -->
            <div style="margin-top: 10px;">
                <input type="number" class="recon-form-control" 
                    placeholder="Enter payment amount"
                    data-adv="${adv.name}"
                    style="max-width: 220px;">
            </div>

        </div>
    `;
    $container.append(html);
});


        }
    });
}


    // Load outstanding invoices
    function load_outstanding_invoices(doctype, party_field, party_name) {
        frappe.call({
            method: 'nexapp.api.get_outstanding_invoices',
            args: {
                doctype: doctype,
                party_field: party_field,
                party_name: party_name,
                company: frappe.defaults.get_default("company")
            },
            callback: function(r) {
                const invoices = r.message || [];
                const $container = $('#outstanding-invoices-container');
                $container.empty();
                
                if (invoices.length === 0) {
                    $container.append('<div class="no-invoices">No outstanding invoices found</div>');
                    update_allocated_amount();
                    return;
                }
                
                invoices.forEach(invoice => {
                    let invoiceHtml = 
                        '<div class="invoice-payment-container" data-invoice="' + invoice.name + '">' +
                            '<div class="invoice-payment-header">' +
                                '<div>' +
                                    '<strong>Invoice No:</strong> ' + (invoice.bill_no || invoice.name) + '<br>' +
                                    '<strong>Invoice Date:</strong> ' + frappe.datetime.str_to_user(invoice.posting_date) +
                                '</div>' +
                                '<div style="text-align: right;">' +
                                    '<strong>Due:</strong> ₹ ' + format_currency(invoice.outstanding_amount) +
                                '</div>' +
                            '</div>' +
                            '<div class="payment-input-container">' +
                                '<input type="number" class="payment-amount-input" ' +
                                       'data-invoice="' + invoice.name + '" ' +
                                       'data-max="' + invoice.outstanding_amount + '" ' +
                                       'placeholder="Enter payment amount" ' +
                                       'step="0.01" />' +
                            '</div>' +
                        '</div>';
                    $container.append(invoiceHtml);
                });
                
                $('.payment-amount-input').on('input', function() {
                    if (isCustomerPayment) {
                        validate_customer_payment_amounts();
                    } else if (isSupplierPayment) {
                        validate_payment_amounts();
                    } else if (isEmployeeExpense) {
                        validate_expense_payment_amounts();
                    }
                });
                
                if (isCustomerPayment) {
                    update_allocated_amount();
                }
            }
        });
    }

    // Validate customer payment amounts
    function validate_customer_payment_amounts() {
        if (!isCustomerPayment) return;

        const bankAmount = parseFloat($('#manual-amount').val().replace(/₹\s?/, '') || 0);
        let totalAllocated = 0;
        let stopProcess = false;

        $('.payment-amount-input').each(function() {
            const payment = parseFloat($(this).val()) || 0;
            const maxAmount = parseFloat($(this).data('max'));

            if (payment > maxAmount) {
                frappe.msgprint({
                    title: "Warning",
                    message: `Payment amount (₹ ${payment}) exceeds invoice outstanding amount (₹ ${maxAmount}).`,
                    indicator: "orange"
                });
            }

            totalAllocated += payment;
        });

        if (totalAllocated > bankAmount) {
            frappe.msgprint({
                title: "Warning",
                message: `Total allocated amount (₹ ${totalAllocated}) exceeds bank transaction amount (₹ ${bankAmount}). Excess will be treated as overpayment.`,
                indicator: "orange"
            });
        }

        $('#allocated-amount-input').val(totalAllocated.toFixed(2));
        update_total_payment();
    }

    // Validate expense payment amounts for Employee Expense Claim
    function validate_expense_payment_amounts() {
        if (!isEmployeeExpense) return;
        
        const bankAmount = parseFloat($('#manual-amount').val().replace(/₹\s?/, '') || 0);
        let totalPayment = 0;
        
        $('.payment-amount-input').each(function() {
            const payment = parseFloat($(this).val()) || 0;
            const maxAmount = parseFloat($(this).data('max'));
            
            if (payment > maxAmount) {
                frappe.msgprint('Payment amount cannot exceed expense claim outstanding amount (₹ ' + maxAmount + ')');
                $(this).val(maxAmount);
                totalPayment += maxAmount;
            } else {
                totalPayment += payment;
            }
        });
        
        $('#payment-amount-display').text(totalPayment.toFixed(2));
        
        if (totalPayment > bankAmount) {
            frappe.msgprint('Total payment amount (₹ ' + totalPayment + ') cannot exceed bank transaction amount (₹ ' + bankAmount + ')');
        }
    }

    // Update allocated amount for Customer Payment
    function update_allocated_amount() {
        if (!isCustomerPayment) return;
        
        let totalAllocated = 0;
        
        $('.payment-amount-input').each(function() {
            const payment = parseFloat($(this).val()) || 0;
            totalAllocated += payment;
        });
        
        $('#allocated-amount-input').val(totalAllocated.toFixed(2));
        
        update_total_payment();
        
        const bankAmount = parseFloat($('#manual-amount').val().replace(/₹\s?/, '') || 0);
        if (totalAllocated > bankAmount) {
            frappe.msgprint({title:'Warning',message:'Total allocated amount (₹ ' + totalAllocated + ') exceeds bank transaction amount (₹ ' + bankAmount + ')',indicator:'orange'});
        }
    }

    // Update total payment for Customer Payment
    function update_total_payment() {
        if (!isCustomerPayment) return;
        
        const allocated = parseFloat($('#allocated-amount-input').val()) || 0;
        const tds = parseFloat($('#tds-amount-input').val()) || 0;
        const writeoff = parseFloat($('#writeoff-amount-input').val()) || 0;
        const roundedoff = parseFloat($('#roundedoff-amount-input').val()) || 0;
        
        const totalPayment = allocated - tds - writeoff - roundedoff;
        
        $('#customer-total-highlight').text(format_currency(totalPayment));
    }

    // Validate payment amounts for Supplier Payment
    function validate_payment_amounts() {
        if (!isSupplierPayment) return;
        
        const bankAmount = parseFloat($('#manual-amount').val().replace(/₹\s?/, '') || 0);
        let totalPayment = 0;
        
        $('.payment-amount-input').each(function() {
            const payment = parseFloat($(this).val()) || 0;
            const maxAmount = parseFloat($(this).data('max'));
            
            if (payment > maxAmount) {
                frappe.msgprint('Payment amount cannot exceed invoice outstanding amount (₹ ' + maxAmount + ')');
                $(this).val(maxAmount);
                totalPayment += maxAmount;
            } else {
                totalPayment += payment;
            }
        });
        
        $('#payment-amount-display').text(totalPayment.toFixed(2));
        
        if (totalPayment > bankAmount) {
            frappe.msgprint('Total payment amount (₹ ' + totalPayment + ') cannot exceed bank transaction amount (₹ ' + bankAmount + ')');
        }
    }

    // Update pagination controls
    function update_pagination() {
        const totalPages = Math.ceil(totalRecords / perPage);
        const startItem = (currentPage - 1) * perPage + 1;
        const endItem = Math.min(currentPage * perPage, totalRecords);
        
        $('#start-item').text(startItem);
        $('#end-item').text(endItem);
        $('#total-items').text(totalRecords);
        
        const $pageNumbers = $('#page-numbers');
        $pageNumbers.empty();
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            $pageNumbers.append('<button class="page-btn" data-page="1">1</button>');
            if (startPage > 2) {
                $pageNumbers.append('<span>...</span>');
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            $pageNumbers.append('<button class="page-btn ' + (i === currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>');
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                $pageNumbers.append('<span>...</span>');
            }
            $pageNumbers.append('<button class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>');
        }
        
        $('#first-page').prop('disabled', currentPage === 1);
        $('#prev-page').prop('disabled', currentPage === 1);
        $('#next-page').prop('disabled', currentPage === totalPages);
        $('#last-page').prop('disabled', currentPage === totalPages);
    }

    // Pagination event handlers
    $('#first-page').click(() => {
        currentPage = 1;
        render_current_page();
        update_pagination();
    });

    $('#prev-page').click(() => {
        if (currentPage > 1) {
            currentPage--;
            render_current_page();
            update_pagination();
        }
    });

    $('#next-page').click(() => {
        const totalPages = Math.ceil(totalRecords / perPage);
        if (currentPage < totalPages) {
            currentPage++;
            render_current_page();
            update_pagination();
        }
    });

    $('#last-page').click(() => {
        currentPage = Math.ceil(totalRecords / perPage);
        render_current_page();
        update_pagination();
    });

    $(document).on('click', '#page-numbers .page-btn', function() {
        currentPage = parseInt($(this).data('page'));
        render_current_page();
        update_pagination();
    });

    $('#per-page').change(function() {
        perPage = parseInt($(this).val());
        currentPage = 1;
        render_current_page();
        update_pagination();
    });

    function select_statement_row(entry, $tr) {
        $('.statement-row').removeClass('selected-row');
        $tr.addClass('selected-row');
        
        selectedStatement = entry.name;
        selectedStatementData = entry;
        $tr.data('statement', entry.name);
        
        toggleRightPanel(true);
        
        const amount = entry.withdrawal || entry.deposit;
        $('#manual-amount').val('₹ ' + format_currency(amount));
        
        statementAmount = parseFloat(amount) || 0;
        
        isWithdrawal = !!entry.withdrawal;
        isDeposit = !!entry.deposit;
        
        update_category_dropdown();
        
        $('#category').val('');
        $('#employee-toggle').text('Select Employee');
        $('#employee').val('');
        $('#customer-toggle').text('Select Customer');
        $('#customer').val('');
        $('#supplier-toggle').text('Select Supplier');
        $('#supplier').val('');
        $('#expense-toggle').text('Select Expense Account');
        $('#expense').val('');
        $('#from-account-toggle').text('Select From Account');
        $('#from-account').val('');
        $('#to-account-toggle').text('Select To Account');
        $('#to-account').val('');
        $('#transfer-description').val('');
        $('#outstanding-invoices-container').empty();
        $('#employee-advance-list').empty().hide();
        $('#from-account-group').hide();
        $('#employee-group').hide();
        $('#customer-group').hide();
        $('#supplier-group').hide();
        $('#expense-account-group').hide();
        $('#to-account-group').hide();
        $('#transfer-description-group').hide();
        $('#itemized-group').hide();
        $('#invoice-info-section').hide();
        $('#customer-payment-table-section').hide();
        $('#payment-amount-display-section').hide();
        $('#match-now-section').hide();
        
        $('#from-account-error').hide();
        $('#to-account-error').hide();
        
        $('#allocated-amount-input').val('0.00');
        $('#tds-amount-input').val('0.00');
        $('#writeoff-amount-input').val('0.00');
        $('#roundedoff-amount-input').val('0.00');
        $('#customer-total-highlight').text('0.00');
        $('#payment-amount-display').text('0.00');
        
        reset_itemized_journal_entry();
        
        isCustomerPayment = false;
        isSupplierPayment = false;
        isEmployeeExpense = false;
        isExpense = false;
        isTransfer = false;
        isItemized = false;
        isEmployeeAdvance = false;
        
        if ($('.recon-tab.active').data('tab') === 'match') {
            fetch_matches(amount, entry.name, entry.description, null, entry.deposit);
        }
    }

    function format_currency(amount) {
        if (!amount) return '0.00';
        return parseFloat(amount).toFixed(2);
    }

    // Enhanced function to fix first row clickability issue
    function enhance_first_row_clickability() {
        const $firstRow = $('.statement-row:first');
        if ($firstRow.length) {
            $firstRow.find('td').css('padding-top', '15px');
            
            $firstRow.off('click.firstRow').on('click.firstRow', function(e) {
                e.stopPropagation();
                const entryName = $(this).data('statement');
                const entry = allBankEntries.find(entry => entry.name === entryName);
                if (entry) {
                    select_statement_row(entry, $(this));
                }
            });
        }
    }

    // Event listeners for tax adjustment inputs
    $('#tds-amount-input, #writeoff-amount-input, #roundedoff-amount-input').on('input', function() {
        update_total_payment();
    });

    // Fetch matches function
    function fetch_matches(amount, statement_name, description, $tr, isDeposit) {
        $('#match-info').html('<div style="text-align: center; padding: 20px;">Finding matches...</div>');
        frappe.call({
            method: 'nexapp.api.find_matching_invoices',
            args: { amount, description },
            callback: function (r) {
                const invoices = r.message || [];
                if (invoices.length === 0) {
                    $('#match-info').html('<div style="color: #666; text-align: center; padding: 20px;">No matches found.</div>');
                    return;
                }

                const bestMatch = invoices[0];
                const otherMatches = invoices.slice(1);

                let html = 
                    '<div style="background-color: #f5faff; padding: 15px; border-radius: 6px; border-left: 4px solid #F75900; margin-bottom: 15px;">' +
                        '<strong style="color: #F75900;">Best Match (' + bestMatch.match_score + '% match)</strong><br>' +
                        '<div style="margin-top: 10px;">' +
                            '<div>Invoice: ' + (bestMatch.bill_no || bestMatch.name) + '</div>' +
                            '<div>Invoice Date: ' + (bestMatch.bill_date ? frappe.datetime.str_to_user(bestMatch.bill_date) : '-') + '</div>' +
                            '<div>Party: ' + (bestMatch.party || '-') + '</div>' +
                            '<div style="margin-bottom: 10px;"><strong>Amount: ₹ ' + format_currency(bestMatch.outstanding_amount) + '</strong></div>' +
                        '</div>';

                if (isDeposit) {
                    html += create_tax_adjustments_table(bestMatch.outstanding_amount, bestMatch.name);
                }

                html += '<button class="recon-save-btn match-btn" data-invoice="' + bestMatch.name + '" data-amount="' + bestMatch.outstanding_amount + '" style="margin-top:15px; width: 100%;">Match Now</button>' +
                    '</div>';

                if (otherMatches.length > 0) {
                    html += '<div style="font-weight: bold; color: #555; margin-bottom: 10px;">Other Possible Matches:</div>';
                    otherMatches.forEach(inv => {
                        html += 
                            '<div style="margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 4px;">' +
                                '<div>Invoice: ' + (inv.bill_no || inv.name) + '</div>' +
                                '<div>Invoice Date: ' + (inv.bill_date ? frappe.datetime.str_to_user(inv.bill_date) : '-') + '</div>' +
                                '<div>Party: ' + (inv.party || '-') + '</div>' +
                                '<div style="margin-bottom: 10px;"><strong>Amount: ₹ ' + format_currency(inv.outstanding_amount) + '</strong></div>' +
                                '<div>Match: ' + inv.match_score + '%</div>';

                        if (isDeposit) {
                            html += create_tax_adjustments_table(inv.outstanding_amount, inv.name);
                        }

                        html += '<button class="recon-cancel-btn match-btn" data-invoice="' + inv.name + '" data-amount="' + inv.outstanding_amount + '" style="margin-top:10px; width: 100%;">Match This Instead</button>' +
                            '</div>';
                    });
                }

                $('#match-info').html(html);

                $('.match-btn').on('click', function () {
                    const selected_invoice = $(this).data('invoice');
                    const invoiceAmount = parseFloat($(this).data('amount')) || 0;

                    let allocatedAmount = invoiceAmount;
                    let taxAdjustments = [];

                    const $container = $('.tax-adjustments-container[data-invoice="' + selected_invoice + '"]');

                    if ($container.length) {
                        const base = parseFloat($container.find('.base-amount').val()) || invoiceAmount;
                        allocatedAmount = base;

                        const tdsAmount = parseFloat($container.find('.tds-amount').val()) || 0;
                        const tdsAccount = $container.find('.tds-account').val();
                        if (tdsAmount > 0) {
                            taxAdjustments.push({
                                charge_type: "Actual",
                                account_head: tdsAccount,
                                tax_amount: tdsAmount
                            });
                        }

                        const writeOffAmount = parseFloat($container.find('.writeoff-amount').val()) || 0;
                        const writeOffAccount = $container.find('.writeoff-account').val();
                        if (writeOffAmount > 0) {
                            taxAdjustments.push({
                                charge_type: "Actual",
                                account_head: writeOffAccount,
                                tax_amount: writeOffAmount
                            });
                        }

                        const roundedOffAmount = parseFloat($container.find('.roundedoff-amount').val()) || 0;
                        const roundedOffAccount = $container.find('.roundedoff-account').val();
                        if (roundedOffAmount > 0) {
                            taxAdjustments.push({
                                charge_type: "Actual",
                                account_head: roundedOffAccount,
                                tax_amount: roundedOffAmount
                            });
                        }
                    }

                    frappe.confirm(
                        'Reconcile this statement with Invoice <b>' + selected_invoice + '</b>?',
                        function () {
                            frappe.call({
                                method: 'nexapp.api.reconcile_transaction',
                                args: {
                                    invoice: selected_invoice,
                                    amount: amount,
                                    statement_name: statement_name,
                                    allocated_amount: allocatedAmount,
                                    tax_adjustments: JSON.stringify(taxAdjustments)
                                },
                                callback: function (r) {
                                    if (r.message.status === 'ok') {
                                        frappe.msgprint('Matched successfully!');
                                        load_cards_data();
                                        toggleRightPanel(false);
                                        load_bank_statement_entries();
                                    } else {
                                        frappe.msgprint('Match failed: ' + r.message.error);
                                    }
                                }
                            });
                        }
                    );
                });
            }
        });
    }

    // Create tax adjustments table
    function create_tax_adjustments_table(invoiceAmount, invoiceName) {
        const tdsDefault = "TDS Receivable - NTPL";
        const writeOffDefault = "Write Off - NTPL";
        const roundedOffDefault = "Rounded Off - NTPL";
        
        let html = 
            '<div class="tax-adjustments-container" data-invoice="' + invoiceName + '">' +
                '<table class="tax-adjustments-table">' +
                    '<thead>' +
                        '<tr>' +
                            '<th>Type</th>' +
                            '<th>Amount</th>' +
                            '<th>Account</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                        '<tr>' +
                            '<td><strong>Allocated Amount</strong></td>' +
                            '<td>' +
                                '<input type="number" class="tax-adjustment-input base-amount" value="' + format_currency(invoiceAmount) + '" step="0.01" />' +
                            '</td>' +
                            '<td><em>Invoice Amount (editable)</em></td>' +
                        '</tr>' +
                        '<tr>' +
                            '<td><strong>TDS</strong></td>' +
                            '<td><input type="number" class="tax-adjustment-input tds-amount" data-type="tds" placeholder="0.00" step="0.01" /></td>' +
                            '<td>' +
                                '<select class="tax-adjustment-select tds-account">';
        
        taxAccounts.forEach(account => {
            html += '<option value="' + account.name + '" ' + (account.name === tdsDefault ? 'selected' : '') + '>' + account.name + '</option>';
        });
        
        html += 
                                '</select>' +
                            '</td>' +
                        '</tr>' +
                        '<tr>' +
                            '<td><strong>Write Off</strong></td>' +
                            '<td><input type="number" class="tax-adjustment-input writeoff-amount" data-type="writeoff" placeholder="0.00" step="0.01" /></td>' +
                            '<td>' +
                                '<select class="tax-adjustment-select writeoff-account">';
        
        taxAccounts.forEach(account => {
            html += '<option value="' + account.name + '" ' + (account.name === writeOffDefault ? 'selected' : '') + '>' + account.name + '</option>';
        });
        
        html += 
                                '</select>' +
                            '</td>' +
                        '</tr>' +
                        '<tr>' +
                            '<td><strong>Rounded Off</strong></td>' +
                            '<td><input type="number" class="tax-adjustment-input roundedoff-amount" data-type="roundedoff" placeholder="0.00" step="0.01" /></td>' +
                            '<td>' +
                                '<select class="tax-adjustment-select roundedoff-account">';
        
        taxAccounts.forEach(account => {
            html += '<option value="' + account.name + '" ' + (account.name === roundedOffDefault ? 'selected' : '') + '>' + account.name + '</option>';
        });
        
        html += 
                                '</select>' +
                            '</td>' +
                        '</tr>' +
                    '</tbody>' +
                '</table>' +
            '</div>';
        
        return html;
    }

    // Load transfer accounts
    function load_transfer_accounts() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Account",
                filters: {
                    custom_bank_account: 1,
                    is_group: 0,
                    company: frappe.defaults.get_default("company")
                },
                fields: ["name", "account_name"],
                limit_page_length: 0
            },
            callback: function(r) {
                transferAccounts = r.message || [];
                update_transfer_account_dropdowns();
            }
        });
    }

    // Update transfer account dropdowns
    function update_transfer_account_dropdowns() {
        const $fromItems = $('#from-account-items');
        const $toItems = $('#to-account-items');
        
        $fromItems.empty();
        $toItems.empty();

        transferAccounts.forEach(acc => {
            const name = acc.account_name || acc.name;
            $fromItems.append(`<div class="dropdown-item" data-value="${acc.name}">${name}</div>`);
            $toItems.append(`<div class="dropdown-item" data-value="${acc.name}">${name}</div>`);
        });
    }

    // Validate transfer accounts - ensure From Account and To Account are different
    function validate_transfer_accounts() {
        const fromAccount = $('#from-account').val();
        const toAccount = $('#to-account').val();
        const $fromError = $('#from-account-error');
        const $toError = $('#to-account-error');
        
        $fromError.hide();
        $toError.hide();
        
        if (fromAccount && toAccount && fromAccount === toAccount) {
            $fromError.text('From Account and To Account cannot be the same').show();
            $toError.text('From Account and To Account cannot be the same').show();
            return false;
        }
        
        return true;
    }

    // Update To Account dropdown based on From Account selection
    function update_to_account_dropdown() {
        const fromAccount = $('#from-account').val();
        const $toItems = $('#to-account-items');
        
        $toItems.empty();

        if (!fromAccount) {
            transferAccounts.forEach(acc => {
                const name = acc.account_name || acc.name;
                $toItems.append(`<div class="dropdown-item" data-value="${acc.name}">${name}</div>`);
            });
        } else {
            transferAccounts.forEach(acc => {
                if (acc.name !== fromAccount) {
                    const name = acc.account_name || acc.name;
                    $toItems.append(`<div class="dropdown-item" data-value="${acc.name}">${name}</div>`);
                }
            });
            
            const currentToAccount = $('#to-account').val();
            if (currentToAccount === fromAccount) {
                $('#to-account-toggle').text('Select To Account');
                $('#to-account').val('');
            }
        }
        
        validate_transfer_accounts();
    }

    // ============================================
    // REVERSE ENTRY FUNCTIONALITY - FIXED
    // ============================================

    // Show Reverse Entry Popup
    function showReverseEntryPopup() {
        // First, load reconciled entries to show selection popup
        loadReconciledEntriesForSelection();
    }

    // Load reconciled entries for selection
    function loadReconciledEntriesForSelection() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Bank Statement Entry",
                filters: {
                    reconciled: 1
                },
                fields: ["name", "description", "withdrawal", "deposit", "transaction_date", "bank_account"],
                limit_page_length: 0
            },
            callback: function(r) {
                reverseEntries = r.message || [];
                
                if (reverseEntries.length === 0) {
                    frappe.msgprint("No reconciled entries found to reverse.");
                    return;
                }
                
                // Show selection popup
                showEntrySelectionPopup();
            }
        });
    }

    // Show entry selection popup
    function showEntrySelectionPopup() {
        // Create popup overlay with new structure
        const $popupOverlay = $(`
            <div class="reverse-entry-popup-overlay" id="reverse-entry-selection-popup">
                <div class="reverse-entry-popup">
                    <div class="reverse-popup-header">
                        <h3>Select Entries to Reverse</h3>
                        <button class="close-popup-btn">&times;</button>
                    </div>

                    <div class="reverse-popup-wrapper">
                        <div class="reverse-popup-content">
                            <div class="reverse-filters-section">
                                <div class="reverse-filters-row">
                                    <div class="reverse-filter-group">
                                        <label for="reverse-filter-name">Name</label>
                                        <input type="text" id="reverse-filter-name" class="reverse-filter-input" placeholder="Filter by name">
                                    </div>
                                    <div class="reverse-filter-group">
                                        <label for="reverse-filter-description">Description</label>
                                        <input type="text" id="reverse-filter-description" class="reverse-filter-input" placeholder="Filter by description">
                                    </div>
                                    <div class="reverse-filter-group">
                                        <label for="reverse-filter-withdrawal">Withdrawal</label>
                                        <input type="text" id="reverse-filter-withdrawal" class="reverse-filter-input" placeholder="Filter by withdrawal">
                                    </div>
                                </div>
                                <div class="reverse-filters-row">
                                    <div class="reverse-filter-group">
                                        <label for="reverse-filter-deposit">Deposit</label>
                                        <input type="text" id="reverse-filter-deposit" class="reverse-filter-input" placeholder="Filter by deposit">
                                    </div>
                                    <div class="reverse-filter-group">
                                        <label for="reverse-filter-transaction-date">Transaction Date</label>
                                        <input type="text" id="reverse-filter-transaction-date" class="reverse-filter-input" placeholder="Filter by transaction date">
                                    </div>
                                    <div class="reverse-filter-group">
                                        <label for="reverse-filter-bank-account">Bank Account</label>
                                        <input type="text" id="reverse-filter-bank-account" class="reverse-filter-input" placeholder="Filter by bank account">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="reverse-table-container">
                                <table class="reverse-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 40px;">
                                                <input type="checkbox" id="select-all-reverse" class="reverse-checkbox">
                                            </th>
                                            <th>Name</th>
                                            <th>Description</th>
                                            <th>Withdrawal</th>
                                            <th>Deposit</th>
                                            <th>Transaction Date</th>
                                            <th>Bank Account</th>
                                        </tr>
                                    </thead>
                                    <tbody id="reverse-entries-body">
                                        <tr>
                                            <td colspan="7" style="text-align: center; padding: 20px;">
                                                <div>Loading reconciled entries...</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- FIXED FOOTER BUTTONS -->
                        <div class="reverse-popup-footer">
                            <button class="reverse-cancel-btn" id="reverse-cancel-btn">Cancel</button>
                            <button class="reverse-select-btn" id="reverse-select-btn" disabled>Reverse Selected (0)</button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        $popupOverlay.appendTo('body');
        
        // Render entries
        renderReverseEntriesForSelection();
        
        // Setup event listeners for selection popup
        setupReverseSelectionPopupEvents();
    }

    // Render reverse entries for selection
    function renderReverseEntriesForSelection(filteredEntries = null) {
        const entriesToDisplay = filteredEntries || reverseEntries;
        const $tbody = $('#reverse-entries-body');
        $tbody.empty();

        if (entriesToDisplay.length === 0) {
            $tbody.append(`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px;">
                        <div>No reconciled entries found</div>
                    </td>
                </tr>
            `);
            return;
        }

        entriesToDisplay.forEach(entry => {
            const isSelected = selectedReverseEntries.includes(entry.name);
            const withdrawal = entry.withdrawal ? '₹ ' + format_currency(entry.withdrawal) : '-';
            const deposit = entry.deposit ? '₹ ' + format_currency(entry.deposit) : '-';
            const transactionDate = entry.transaction_date ? frappe.datetime.str_to_user(entry.transaction_date) : '-';
            
            const row = $(`
                <tr data-entry-id="${entry.name}" class="${isSelected ? 'selected' : ''}">
                    <td>
                        <input type="checkbox" class="reverse-checkbox entry-checkbox" 
                               data-entry-id="${entry.name}" 
                               ${isSelected ? 'checked' : ''}>
                    </td>
                    <td>${entry.name || '-'}</td>
                    <td>${entry.description || '-'}</td>
                    <td style="text-align: right;">${withdrawal}</td>
                    <td style="text-align: right;">${deposit}</td>
                    <td>${transactionDate}</td>
                    <td>${entry.bank_account || '-'}</td>
                </tr>
            `);

            $tbody.append(row);
        });
        
        updateReverseSelectButton();
    }

    // Setup reverse selection popup events
    function setupReverseSelectionPopupEvents() {
        // Close popup when clicking X button
        $('.close-popup-btn').click(function() {
            $('#reverse-entry-selection-popup').remove();
            selectedReverseEntries = [];
        });

        // Close popup when clicking cancel button
        $('#reverse-cancel-btn').click(function() {
            $('#reverse-entry-selection-popup').remove();
            selectedReverseEntries = [];
        });

        // Select all checkbox
        $(document).on('change', '#select-all-reverse', function() {
            const isChecked = $(this).is(':checked');
            $('.entry-checkbox').prop('checked', isChecked);
            
            if (isChecked) {
                // Add all visible entries to selection
                $('.entry-checkbox').each(function() {
                    const entryId = $(this).data('entry-id');
                    if (!selectedReverseEntries.includes(entryId)) {
                        selectedReverseEntries.push(entryId);
                    }
                });
            } else {
                // Clear all selections
                selectedReverseEntries = [];
            }
            
            $('tr[data-entry-id]').toggleClass('selected', isChecked);
            updateReverseSelectButton();
        });

        // Individual entry checkbox
        $(document).on('change', '.entry-checkbox', function() {
            const entryId = $(this).data('entry-id');
            const isChecked = $(this).is(':checked');
            
            if (isChecked) {
                if (!selectedReverseEntries.includes(entryId)) {
                    selectedReverseEntries.push(entryId);
                }
            } else {
                const index = selectedReverseEntries.indexOf(entryId);
                if (index > -1) {
                    selectedReverseEntries.splice(index, 1);
                }
            }
            
            $(this).closest('tr').toggleClass('selected', isChecked);
            
            // Update select all checkbox state
            const totalVisible = $('.entry-checkbox').length;
            const totalSelected = $('.entry-checkbox:checked').length;
            $('#select-all-reverse').prop('checked', totalSelected === totalVisible && totalVisible > 0);
            
            updateReverseSelectButton();
        });

        // Row click to toggle selection
        $(document).on('click', 'tr[data-entry-id]', function(e) {
            if (!$(e.target).is('input, button, select, textarea') && !$(e.target).closest('input, button, select, textarea').length) {
                const checkbox = $(this).find('.entry-checkbox');
                checkbox.prop('checked', !checkbox.is(':checked')).trigger('change');
            }
        });

        // Reverse selected entries button
        $('#reverse-select-btn').click(function() {
            if (selectedReverseEntries.length === 0) {
                frappe.msgprint('Please select at least one entry to reverse');
                return;
            }

            // Close the selection popup first
            $('#reverse-entry-selection-popup').remove();
            
            // Now show the simple confirmation
            showSimpleConfirmation();
        });

        // Setup filters
        setupReverseFiltersForSelection();
    }

    // Setup reverse filters for selection
    function setupReverseFiltersForSelection() {
        let reverseFilterTimeout;
        
        $('.reverse-filter-input').on('input', function() {
            clearTimeout(reverseFilterTimeout);
            reverseFilterTimeout = setTimeout(() => {
                filterReverseEntriesForSelection();
            }, 300);
        });
    }

    // Filter reverse entries for selection
    function filterReverseEntriesForSelection() {
        const filters = {
            name: $('#reverse-filter-name').val().toLowerCase(),
            description: $('#reverse-filter-description').val().toLowerCase(),
            withdrawal: $('#reverse-filter-withdrawal').val().toLowerCase(),
            deposit: $('#reverse-filter-deposit').val().toLowerCase(),
            transaction_date: $('#reverse-filter-transaction-date').val().toLowerCase(),
            bank_account: $('#reverse-filter-bank-account').val().toLowerCase()
        };

        const filteredEntries = reverseEntries.filter(entry => {
            // Name filter
            if (filters.name && (!entry.name || !entry.name.toLowerCase().includes(filters.name))) {
                return false;
            }
            
            // Description filter
            if (filters.description && (!entry.description || !entry.description.toLowerCase().includes(filters.description))) {
                return false;
            }
            
            // Withdrawal filter
            if (filters.withdrawal) {
                if (!entry.withdrawal) return false;
                const withdrawalStr = '₹ ' + format_currency(entry.withdrawal).toLowerCase();
                if (!withdrawalStr.includes(filters.withdrawal)) return false;
            }
            
            // Deposit filter
            if (filters.deposit) {
                if (!entry.deposit) return false;
                const depositStr = '₹ ' + format_currency(entry.deposit).toLowerCase();
                if (!depositStr.includes(filters.deposit)) return false;
            }
            
            // Transaction date filter
            if (filters.transaction_date && entry.transaction_date) {
                const dateStr = frappe.datetime.str_to_user(entry.transaction_date).toLowerCase();
                if (!dateStr.includes(filters.transaction_date)) return false;
            }
            
            // Bank account filter
            if (filters.bank_account && (!entry.bank_account || !entry.bank_account.toLowerCase().includes(filters.bank_account))) {
                return false;
            }
            
            return true;
        });

        renderReverseEntriesForSelection(filteredEntries);
    }

    // Show simple confirmation dialog
    function showSimpleConfirmation() {
        const entryCount = selectedReverseEntries.length;
        const confirmationMessage = entryCount === 1 
            ? `Are you sure you want to reverse this entry?`
            : `Are you sure you want to reverse ${entryCount} selected entries?`;

        frappe.confirm(
            confirmationMessage,
            function() {
                // Proceed with reversal
                reverseSelectedEntries();
            },
            function() {
                // Cancelled - do nothing
                selectedReverseEntries = [];
            }
        );
    }

    // Reverse selected entries - FIXED FUNCTION
    function reverseSelectedEntries() {
        if (selectedReverseEntries.length === 0) {
            frappe.msgprint('Please select at least one entry to reverse');
            return;
        }

        frappe.call({
            method: "nexapp.api.reverse_bank_entries",
            args: {
                entry_names: selectedReverseEntries
            },
            callback: function(r) {
                if (r.message) {
                    if (r.message.status === 'success') {
                        const successCount = r.message.success_count || 0;
                        frappe.msgprint({
                            title: __('Success'),
                            indicator: 'green',
                            message: __(successCount + ' entry' + (successCount === 1 ? '' : 'ies') + ' reversed successfully!')
                        });
                        
                        // Clear selection
                        selectedReverseEntries = [];
                        
                        // Refresh data
                        load_bank_statement_entries();
                        load_cards_data();
                    } else if (r.message.status === 'partial') {
                        const successCount = r.message.success_count || 0;
                        const failedCount = r.message.failed_count || 0;
                        
                        let message = successCount + ' entry' + (successCount === 1 ? '' : 'ies') + ' reversed successfully';
                        if (failedCount > 0) {
                            message += ', ' + failedCount + ' entry' + (failedCount === 1 ? '' : 'ies') + ' failed';
                        }
                        
                        frappe.msgprint({
                            title: __('Partial Success'),
                            indicator: 'orange',
                            message: __(message)
                        });
                        
                        // Clear selection
                        selectedReverseEntries = [];
                        
                        // Refresh data
                        load_bank_statement_entries();
                        load_cards_data();
                    } else {
                        const errorMsg = r.message.message || r.message.error || 'Unknown error';
                        frappe.msgprint({
                            title: __('Error'),
                            indicator: 'red',
                            message: __('Error reversing entries: ' + errorMsg)
                        });
                    }
                } else {
                    frappe.msgprint({
                        title: __('Error'),
                        indicator: 'red',
                        message: __('Unknown error occurred while reversing entries')
                    });
                }
            }
        });
    }

    // Update reverse select button state
    function updateReverseSelectButton() {
        const $button = $('#reverse-select-btn');
        if (selectedReverseEntries.length > 0) {
            $button.prop('disabled', false);
            $button.text(`Reverse Selected (${selectedReverseEntries.length})`);
        } else {
            $button.prop('disabled', true);
            $button.text('Reverse Selected (0)');
        }
    }

    // Reverse Entry Button Click Handler
    $('#reverse-entry-btn').click(function() {
        showReverseEntryPopup();
    });

    // ============================================
    // UNRECONCILED REPORT BUTTON FUNCTIONALITY
    // ============================================

    // Unreconciled Report Button Click Handler
    $('#unreconciled-report-btn').click(function() {
        // Redirect to the Unreconciled Report page
        window.open("https://erp.nexapp.co.in/app/query-report/Bank%20Unreconciled%20Transactions", "_blank");
    });

    // ============================================
    // INITIALIZATION
    // ============================================

    // Initial setup
    load_bank_accounts();
    load_employees();
    load_customers();
    load_suppliers();
    load_expense_accounts();
    load_transfer_accounts();
    load_tax_accounts();
    initialize_dropdowns();
    initialize_date_filters();
    initialize_table_filters();
    load_cards_data();
    load_bank_statement_entries();
};

    // FIX: Re-show Customer Advance fields when switching back to Categorize tab
    $('.recon-tab').on('click', function () {
        const tab = $(this).data('tab');
        if (tab === 'categorize' && $('#category').val() === 'Customer Advance') {
            $('#customer-group').show();
            $('#sales-order-group').show();
            $('#customer-advance-amount-group').show();
            $('#payment-amount-display-section').show();
            $('#match-now-section').show();
        }
    });

    $('#customer-advance-amount').on('input', function () {
        const amt = parseFloat($(this).val()) || 0;
        $('#manual-amount').val(amt.toFixed(2));
        $('#payment-amount-display').text(amt.toFixed(2));
    });

    function show_customer_advance_fields() {
        ensure_customer_advance_block();
        $('#customer-group').show();
        $('#sales-order-group').show();
        $('#customer-advance-amount-group').show();
        $('#invoice-info-section').hide();
        $('#payment-amount-display-section').show();
        $('#match-now-section').show();
    }

    $('.recon-tab').on('click', function () {
        const tab = $(this).data('tab');
        if (tab === 'categorize' && $('#category').val() === 'Customer Advance') {
            show_customer_advance_fields();
        }
    });

    $(document).on('input', '#customer-advance-amount', function () {
        const amt = parseFloat($(this).val()) || 0;
        $('#manual-amount').val(amt.toFixed(2));
        $('#payment-amount-display').text(amt.toFixed(2));
    });


// ================= LOAD SALES ORDERS FROM PY (Customer Advance) =================
function load_sales_orders_for_customer(customer) {
    if (!customer) return;

    frappe.call({
        method: "nexapp.api.get_submitted_sales_orders_by_customer",
        args: {
            customer: customer
        },
        callback: function (r) {
            const orders = r.message || [];
            const $items = $('#sales-order-items');
            $items.empty();

            if (!orders.length) {
                $items.append('<div class="dropdown-item no-click">No submitted Sales Orders</div>');
                return;
            }

            orders.forEach(so => {
                $items.append(`
                    <div class="dropdown-item"
                         data-value="${so.name}"
                         data-amount="${so.grand_total}">
                        ${so.name} — ₹ ${so.grand_total.toFixed(2)}
                    </div>
                `);
            });
        }
    });
}



    // =========================================================
    // Load Sales Orders for Customer (Customer Advance) - CLEAN
    // =========================================================
    function load_sales_orders_for_customer(customer) {
        if (!customer) return;

        frappe.call({
            method: "nexapp.api.get_submitted_sales_orders_by_customer",
            args: {
                customer: customer
            },
            callback: function (r) {
                const orders = r.message || [];
                const $items = $('#sales-order-items');
                $items.empty();

                if (!orders.length) {
                    $items.append('<div class="dropdown-item no-click">No submitted Sales Orders</div>');
                    return;
                }

                orders.forEach(so => {
                    const amount = parseFloat(so.grand_total || 0);
                    $items.append(
                        '<div class="dropdown-item" ' +
                        'data-value="' + so.name + '" ' +
                        'data-amount="' + amount + '">' +
                        so.name + ' — ₹ ' + amount.toFixed(2) +
                        '</div>'
                    );
                });
            }
        });
    }


// ================= ABSOLUTE OVERRIDE: CUSTOMER ADVANCE VISIBILITY =================
function __force_customer_advance_ui__() {
    if ($('#category').val() !== 'Customer Advance') return;

    // Ensure blocks exist
    if (!$('#sales-order-group').length) {
        ensure_customer_advance_block();
    }

    // FORCE SHOW (override all previous hide logic)
    $('#manual-categorize-section').show();
    $('#customer-group').css('display', 'block');
    $('#sales-order-group').css('display', 'block');
    $('#customer-advance-amount-group').css('display', 'block');
    $('#invoice-info-section').css('display', 'none');
    $('#payment-amount-display-section').css('display', 'block');
    $('#match-now-section').css('display', 'block');
}

// Hook everywhere (cannot be overridden)
$(document).on('change', '#category', __force_customer_advance_ui__);
$(document).on('click', '.recon-tab', function () {
    setTimeout(__force_customer_advance_ui__, 50);
});
$(document).on('click', '.statement-row', function () {
    setTimeout(__force_customer_advance_ui__, 50);
});

$(document).on('change', '#customer', function () {
    if ($('#category').val() === 'Customer Advance') {
        load_sales_orders_for_customer($(this).val());
    }
});

$(document).on('change', '#sales-order', function () {
    const $row = $('#sales-order-items').find('[data-value="' + this.value + '"]');
    const amount = parseFloat($row.data('amount')) || 0;

    $('#customer-advance-amount').val(amount.toFixed(2));
    $('#manual-amount').val(amount.toFixed(2));
    $('#payment-amount-display').text(amount.toFixed(2));
});


/* ================= CUSTOMER ADVANCE : MATCH NOW -> PAYMENT ENTRY =================
   This block integrates with existing UI and uses:
   PY: nexapp.api.create_customer_advance_payment_entry
   It DOES NOT remove or change any existing logic.
=============================================================================== */

(function () {
    function isCustomerAdvanceSelected() {
        return $('#category').val() === 'Customer Advance';
    }

    function getCustomerAdvancePayload() {
        return {
            bank_statement_entry: window.selectedStatement,
            customer: $('#customer').val(),
            sales_order: $('#sales-order').val(),
            amount: parseFloat($('#customer-advance-amount').val() || 0),
            bank_account: $('#bank-account-select').val()
        };
    }

    function validateCustomerAdvance() {
        if (!$('#customer').val()) {
            frappe.msgprint('Please select Customer');
            return false;
        }
        if (!$('#sales-order').val()) {
            frappe.msgprint('Please select Sales Order');
            return false;
        }
        const amt = parseFloat($('#customer-advance-amount').val() || 0);
        if (!amt || amt <= 0) {
            frappe.msgprint('Advance amount must be greater than zero');
            return false;
        }
        return true;
    }

    $(document).on('click', '#match-now-btn', function () {
        if (!isCustomerAdvanceSelected()) return;
        if (!validateCustomerAdvance()) return;

        const payload = getCustomerAdvancePayload();

        frappe.call({
            method: 'nexapp.api.create_customer_advance_payment_entry',
            args: payload,
            freeze: true,
            freeze_message: 'Creating Customer Advance Payment Entry...',
            callback: function (r) {
                if (!r || !r.message) return;

                if (r.message.status === 'success') {
                    frappe.show_alert({
                        message: 'Payment Entry ' + r.message.payment_entry + ' created successfully',
                        indicator: 'green'
                    });

                    // Update paid/received = allocated (safety)
                    if (typeof __force_set_paid_amount__ === 'function') {
                        __force_set_paid_amount__(r.message.payment_entry);
                    }

                    // Close panel + reload data
                    $('.close-panel').trigger('click');
                    if (typeof load_bank_statement_entries === 'function') {
                        load_bank_statement_entries();
                    }
                } else {
                    frappe.msgprint(r.message.error || 'Failed to create Payment Entry');
                }
            }
        });
    });
})();