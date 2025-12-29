frappe.pages['invoicing'].on_page_load = function(wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: '',
    single_column: true
  });

  // Simple state management
  const state = {
    page: 1,
    page_size: 20,
    total: 0,
    current_order: null,
    filters: {
      sales_order_no: "",
      customer_name: "",
      order_type: "",
      min_amount: "",
      max_amount: "",
      billing_month: ""
    },
    cached_order_data: {},
    stats: {
      total: 0,
      billed: 0,
      balance: 0,
      percentage: 0
    },
    isRefreshing: false,
    isRightPanelOpen: false,
    currentBillingDetails: null
  };

  // Utility functions
  const utils = {
    formatDate(dt_str) {
      if (!dt_str) return "";
      try {
        let dateStr = dt_str;
        if (dt_str.includes(' ')) {
          dateStr = dt_str.replace(" ", "T");
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
          return dt_str;
        }
        const pad = n => String(n).padStart(2, "0");
        return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}`;
      } catch (e) { 
        console.error('Date formatting error:', e, dt_str);
        return dt_str; 
      }
    },

    formatNumber(num) {
      if (num === null || num === undefined) return "0.00";
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    },

    formatCurrency(num) {
      return `₹${this.formatNumber(num)}`;
    },

    escapeHtml(text) {
      if (text === null || text === undefined) return "";
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    getOrderTypeColor(orderType) {
      const colorMap = {
        'Sales': '#10b981',
        'Service': '#2563eb',
        'Project': '#8b5cf6',
        'Maintenance': '#d97706',
        'Standard': '#6b7280'
      };
      return colorMap[orderType] || '#6b7280';
    },

    createOrderTypeBadge(orderType) {
      if (!orderType || orderType === '-') return '-';
      const color = this.getOrderTypeColor(orderType);
      return `
        <span class="order-type-badge" style="
          background: ${color}15;
          color: ${color};
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          display: inline-block;
        ">
          ${orderType}
        </span>
      `;
    },

    stripHtmlTags(html) {
      if (!html) return "";
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    },

    truncateText(text, length = 100) {
      if (!text) return "";
      if (text.length <= length) return text;
      return text.substring(0, length) + '...';
    }
  };

  // Create UI components
  const UI = {
    async init() {
      console.log('Initializing Invoice Management page...');
      
      // First test the API
      await this.testAPI();
      
      this.renderLayout();
      this.bindEvents();
      await this.loadTotalStats();
      await this.loadData();
      console.log('Invoice Management page initialized');
    },

    async testAPI() {
      try {
        console.log('Testing API connection...');
        const response = await frappe.call({
          method: "nexapp.api.test_api",
          callback: function(r) {
            console.log('Test API response:', r);
          }
        });
        
        if (response && response.message) {
          console.log('API Test Result:', response.message);
          if (response.message.status === 'success') {
            console.log('API is working. Sample data:', response.message.sample_data);
            console.log('Total Billing Statements:', response.message.total_billing_statements);
          } else {
            console.error('API test failed:', response.message.message);
          }
        }
      } catch (error) {
        console.error('Error testing API:', error);
      }
    },

    renderLayout() {
      const layout = `
        <div class="invoicing-container">
          <!-- Header -->
          <div class="invoicing-header">
            <div class="header-spacer"></div>
            <div class="header-content">
              <div>
                <h1>Invoice Management</h1>
                <p class="subtitle">Total visibility into your invoicing</p>               
              </div>
              <div class="header-actions">
                <button id="refresh-btn" class="refresh-btn" title="Refresh">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6"/>
                    <path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </button>
              </div>
            </div>             
          </div>

          <!-- Stats Cards -->
          <div class="stats-section">
            <div class="stats-grid">
              <div class="stat-card total-orders">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-total">0.00</div>
                  <div class="stat-label">TOTAL BILLING STATEMENTS</div>
                </div>
              </div>

              <div class="stat-card billed-amount">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-billed">₹0.00</div>
                  <div class="stat-label">TOTAL BILLED AMOUNT</div>
                </div>
              </div>

              <div class="stat-card balance-amount">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-balance">₹0.00</div>
                  <div class="stat-label">TOTAL BALANCE TO BILL</div>
                </div>
              </div>

              <div class="stat-card percentage">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2"/>
                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-percentage">0%</div>
                  <div class="stat-label">OVERALL BILLING PROGRESS</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="main-content">
            <!-- Sales Orders Section -->
            <div class="orders-section">
              <div class="section-header">
                <!-- ROW 1: Title -->
                <div style="margin-bottom: 16px;">
                  <h2>Pending Invoices Against Sales Orders</h2>
                </div>

                <!-- ROW 2: Filters -->
                <div class="filter-input-group" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px;">
                  <input type="text" id="filter-order-no" placeholder="Billing Statement No" class="filter-input">
                  <input type="text" id="filter-customer" placeholder="Customer Name" class="filter-input">
                  <input type="text" id="filter-order-type" placeholder="Order Type" class="filter-input">
                  <input type="number" id="filter-min-amount" placeholder="Min Amount" class="filter-input" min="0" step="0.01">
                  <input type="number" id="filter-max-amount" placeholder="Max Amount" class="filter-input" min="0" step="0.01">
                </div>
              </div>

              <div class="table-container">
                <table class="orders-table">
                  <thead>
                    <tr>
                      <th>BILLING STATEMENT NO</th>
                      <th>SALES ORDER NO</th>
                      <th>CUSTOMER NAME</th>
                      <th>ORDER TYPE</th>
                      <th>SALES ORDER AMOUNT</th>
                      <th>BILLED AMOUNT</th>
                      <th>BALANCE TO BILL</th>
                    </tr>
                  </thead>
                  <tbody id="table-body"></tbody>
                </table>
              </div>

              <div class="table-footer">
                <div class="table-info">
                  <span id="table-info">Loading...</span>
                </div>
                <div class="table-controls">
                  <div class="pagination" id="pagination"></div>
                  <div class="rows-selector">
                    <label>Rows:</label>
                    <select id="rows-per-page">
                      <option value="10">10</option>
                      <option value="20" selected>20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- NEW: Right Panel Container for Billing Details -->
            <div class="right-panel-wrapper">
              <div id="billing-details-panel" class="billing-details-panel">
                <!-- Panel Header with Gradient -->
                <div class="panel-header gradient-bg">
                  <div class="panel-header-content">
                    <div class="billing-header">
                      <div class="billing-title">
                        <div class="billing-header-top">
                          <h3>BILLING TRANSACTION DETAILS</h3>
                          <button class="close-panel">&times;</button>
                        </div>
                        <div class="billing-number">
                          <span id="billing-statement-display">Billing Statement</span>
                          <div class="status-display-header">
                            <div id="billing-status" class="billing-status">PENDING</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="panel-content">
                  <!-- Billing Details Content -->
                  <div class="billing-details-content">
                    <!-- Basic Information -->
                    <div class="details-section">
                      <div class="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>BILLING INFORMATION</span>
                      </div>
                      
                      <div class="info-grid">
                        <div class="info-item">
                          <div class="info-label">Sales Order No</div>
                          <div class="info-value" id="detail-sales-order-no">-</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">Customer</div>
                          <div class="info-value" id="detail-customer">-</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">Billing Period</div>
                          <div class="info-value" id="detail-billing-period">-</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">Total Amount</div>
                          <div class="info-value amount-total" id="detail-total-amount">₹0.00</div>
                        </div>
                      </div>
                    </div>

                    <!-- Billing Period -->
                    <div class="details-section">
                      <div class="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 6v6l4 2"/>
                        </svg>
                        <span>BILLING PERIOD</span>
                      </div>
                      
                      <div class="period-display">
                        <div class="period-from">
                          <div class="period-label">From</div>
                          <div class="period-value" id="detail-period-from">-</div>
                        </div>
                        <div class="period-separator">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 12h16"/>
                          </svg>
                        </div>
                        <div class="period-to">
                          <div class="period-label">To</div>
                          <div class="period-value" id="detail-period-to">-</div>
                        </div>
                      </div>
                    </div>

                    <!-- Item Information Table -->
                    <div class="details-section">
                      <div class="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                          <line x1="12" y1="8" x2="12" y2="16"/>
                          <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        <span>ITEM INFORMATION</span>
                      </div>
                      
                      <div class="table-container-sm">
                        <table class="items-table">
                          <thead>
                            <tr>
                              <th>CIRCUIT ID</th>
                              <th>ITEM DESCRIPTION</th>
                              <th>BILLING START DATE</th>
                              <th>RATE</th>
                              <th>QUANTITY</th>
                              <th>AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody id="items-table-body">
                            <tr>
                              <td colspan="6" style="text-align:center;padding:20px;color:#6b7280;">No items found</td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colspan="5" style="text-align:right;font-weight:600;">Total Amount:</td>
                              <td id="items-total-amount" style="font-weight:700;color:#059669;">₹0.00</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    <!-- Billing Summary -->
                    <div class="details-section">
                      <div class="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 20v-6M6 20v-4M18 20v-8"/>
                          <path d="M20 21H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span>BILLING SUMMARY</span>
                      </div>
                      
                      <div class="summary-grid">
                        <div class="summary-item">
                          <div class="summary-label">Billed Amount</div>
                          <div class="summary-value amount-billed" id="summary-billed">₹0.00</div>
                        </div>
                        <div class="summary-item">
                          <div class="summary-label">Balance to Bill</div>
                          <div class="summary-value amount-balance" id="summary-balance">₹0.00</div>
                        </div>
                        <div class="summary-item full-width">
                          <div class="summary-label">Billing Progress</div>
                          <div class="progress-container">
                            <div class="progress-bar">
                              <div class="progress-fill" id="billing-progress-bar" style="width: 0%"></div>
                            </div>
                            <div class="progress-percentage" id="billing-progress-text">0%</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="action-buttons">
                      <button class="btn-secondary" id="view-full-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View Full Statement
                      </button>
                      <button class="btn-primary" id="bill-now-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22,4 12,14.01 9,11.01"/>
                        </svg>
                        Bill Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>
          .header-spacer {
            height: 10px;
          }

          /* Base Styles */
          .invoicing-container {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            min-height: 100vh;
            padding: 20px 24px 24px 24px;
          }

          /* Header */
          .invoicing-header {
            margin-bottom: 24px;
          }

          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
          }

          .header-content h1 {
            margin: 0 0 4px 0;
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .subtitle {
            margin: 0;
            color: #6b7280;
            font-size: 13px;
            font-weight: 500;
          }

          /* Header Actions */
          .header-actions {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          /* Refresh Button */
          .refresh-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
            border: none;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            flex-shrink: 0;
            position: relative;
            overflow: hidden;
          }

          .refresh-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .refresh-btn:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 6px 16px rgba(5, 150, 105, 0.3);
          }

          .refresh-btn:hover::before {
            opacity: 1;
          }

          .refresh-btn:active {
            transform: translateY(0) scale(0.98);
          }

          .refresh-btn.refreshing svg {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Stats Section */
          .stats-section {
            margin-bottom: 24px;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          .stat-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .stat-card::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: #059669;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.1);
            border-color: rgba(5, 150, 105, 0.2);
          }

          .stat-card:hover::before {
            opacity: 1;
          }

          .stat-card.total-orders .stat-icon {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            color: #059669;
          }

          .stat-card.billed-amount .stat-icon {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            color: #2563eb;
          }

          .stat-card.balance-amount .stat-icon {
            background: linear-gradient(135deg, #fef2f2 0%, #fed7d7 100%);
            color: #dc2626;
          }

          .stat-card.percentage .stat-icon {
            background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
            color: #8b5cf6;
          }

          .stat-icon {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
          }

          .stat-icon svg {
            width: 24px;
            height: 24px;
          }

          .stat-info {
            flex: 1;
            min-width: 0;
          }

          .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            line-height: 1;
            margin-bottom: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .stat-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Main Content */
          .main-content {
            display: flex;
            gap: 24px;
            position: relative;
          }

          .orders-section {
            flex: 1;
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
            transition: all 0.3s ease;
          }

          .right-panel-wrapper.active + .orders-section {
            margin-right: 60%;
          }

          .section-header {
            margin-bottom: 24px;
          }

          .section-header h2 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
          }

          .filter-input-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
          }

          .filter-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 13px;
            background: white;
            color: #374151;
            transition: all 0.2s ease;
          }

          .filter-input:focus {
            outline: none;
            border-color: #059669;
            box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
          }

          .filter-input::placeholder {
            color: #9ca3af;
          }

          /* Table */
          .table-container {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            margin-bottom: 16px;
          }

          .orders-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 900px;
          }

          .orders-table th {
            padding: 16px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e5e7eb;
            background: #f8fafc;
          }

          .orders-table td {
            padding: 16px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
            color: #374151;
            vertical-align: middle;
          }

          .orders-table tbody tr {
            transition: all 0.2s ease;
          }

          .orders-table tbody tr:hover {
            background: #f8fafc;
            cursor: pointer;
          }

          .orders-table tbody tr.selected {
            background: #f0fdf4;
            border-left: 4px solid #059669;
          }

          .orders-table .amount-cell {
            font-family: 'SF Mono', 'Roboto Mono', monospace;
            font-weight: 600;
            font-size: 13px;
          }

          .amount-fully-billed {
            color: #10b981 !important;
          }

          .amount-partial-billed {
            color: #d97706 !important;
          }

          .amount-not-billed {
            color: #dc2626 !important;
          }

          /* Table Footer */
          .table-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }

          .table-info {
            font-size: 13px;
            color: #6b7280;
          }

          .table-controls {
            display: flex;
            align-items: center;
            gap: 24px;
          }

          .pagination {
            display: flex;
            gap: 4px;
          }

          .page-btn {
            padding: 6px 12px;
            border: 1px solid #e5e7eb;
            background: white;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 36px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .page-btn:hover:not(:disabled) {
            border-color: #059669;
            color: #059669;
          }

          .page-btn.active {
            background: #059669;
            color: white;
            border-color: #059669;
          }

          .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .rows-selector {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #6b7280;
          }

          .rows-selector select {
            padding: 6px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: white;
            font-size: 12px;
          }

          /* Right Panel Styles */
          .right-panel-wrapper {
            position: fixed;
            right: -60%;
            top: 50px;
            width: 60%;
            height: calc(100vh - 56px);
            background: white;
            box-shadow: -4px 0 20px rgba(0,0,0,0.15);
            transition: right 0.3s ease;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            border-radius: 12px 0 0 12px;
          }

          .right-panel-wrapper.active {
            right: 0;
          }

          .billing-details-panel {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #f8fafc;
          }

          /* Panel Header with Gradient */
          .panel-header.gradient-bg {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            padding: 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px 0 0 0;
          }

          .billing-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .billing-header-top h3 {
            margin: 0;
            font-size: 11px;
            font-weight: 700;
            color: white;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
          }

          .close-panel {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
            color: white;
            cursor: pointer;
            font-size: 18px;
            font-weight: 300;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .close-panel:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: rotate(90deg);
          }

          .billing-number {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .billing-number span {
            font-size: 24px;
            font-weight: 800;
            color: white;
            letter-spacing: -0.5px;
          }

          .status-display-header {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.1);
            padding: 8px 16px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
          }

          .billing-status {
            font-size: 12px;
            font-weight: 600;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Panel Content */
          .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 0;
          }

          .billing-details-content {
            padding: 24px;
          }

          /* Details Sections */
          .details-section {
            background: white;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            padding: 20px;
            margin-bottom: 20px;
            transition: all 0.2s ease;
          }

          .details-section:hover {
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.1);
            border-color: #059669;
          }

          .section-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }

          .section-title svg {
            width: 16px;
            height: 16px;
            color: #059669;
          }

          /* Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .info-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .info-value {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            line-height: 1.4;
          }

          .amount-total {
            color: #059669;
            font-weight: 700;
            font-size: 16px;
          }

          /* Period Display */
          .period-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 30px;
            padding: 20px 0;
          }

          .period-from,
          .period-to {
            text-align: center;
            flex: 1;
          }

          .period-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }

          .period-value {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            padding: 12px 20px;
            background: #f0fdf4;
            border-radius: 8px;
            border: 2px solid #10b981;
          }

          .period-separator {
            color: #6b7280;
          }

          /* Items Table */
          .table-container-sm {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            margin-top: 16px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 600px;
          }

          .items-table th {
            padding: 12px;
            text-align: left;
            font-size: 10px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e5e7eb;
            background: #f8fafc;
          }

          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 12px;
            color: #374151;
          }

          .items-table tbody tr:hover {
            background: #f8fafc;
          }

          .items-table tfoot {
            background: #f8fafc;
            font-weight: 600;
          }

          .items-table tfoot td {
            padding: 16px 12px;
            font-size: 14px;
          }

          /* Summary Grid */
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .summary-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .summary-item.full-width {
            grid-column: 1 / -1;
          }

          .summary-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .summary-value {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.4;
          }

          .amount-billed {
            color: #2563eb;
          }

          .amount-balance {
            color: #dc2626;
          }

          /* Progress Bar */
          .progress-container {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .progress-bar {
            flex: 1;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            border-radius: 4px;
            transition: width 0.3s ease;
          }

          .progress-percentage {
            font-size: 14px;
            font-weight: 700;
            color: #059669;
            min-width: 40px;
          }

          /* Action Buttons */
          .action-buttons {
            display: flex;
            gap: 16px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            margin-top: 8px;
          }

          .btn-primary,
          .btn-secondary {
            flex: 1;
            padding: 14px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            border: none;
          }

          .btn-primary {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
          }

          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
          }

          .btn-primary:active {
            transform: translateY(0);
          }

          .btn-secondary {
            background: white;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .btn-secondary:hover {
            border-color: #059669;
            color: #059669;
            transform: translateY(-2px);
          }

          .btn-secondary:active {
            transform: translateY(0);
          }

          /* Responsive Design */
          @media (max-width: 1400px) {
            .right-panel-wrapper {
              width: 60%;
            }
            
            .right-panel-wrapper.active + .orders-section {
              margin-right: 60%;
            }
          }

          @media (max-width: 1200px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .stat-card {
              min-height: 140px;
            }
            
            .right-panel-wrapper {
              width: 60%;
            }
            
            .right-panel-wrapper.active + .orders-section {
              margin-right: 60%;
            }
            
            .info-grid,
            .summary-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 992px) {
            .main-content {
              flex-direction: column;
            }
            
            .right-panel-wrapper {
              position: fixed;
              top: auto;
              bottom: 0;
              left: 0;
              right: 0;
              width: 100%;
              height: 70vh;
              border-radius: 12px 12px 0 0;
            }
            
            .right-panel-wrapper.active {
              right: 0;
            }
            
            .right-panel-wrapper.active + .orders-section {
              margin-right: 0;
            }
            
            .panel-header.gradient-bg {
              border-radius: 12px 12px 0 0;
            }
            
            .action-buttons {
              flex-direction: column;
            }
            
            .btn-primary,
            .btn-secondary {
              width: 100%;
            }
          }

          @media (max-width: 768px) {
            .invoicing-container {
              padding: 16px;
            }
            
            .stats-grid {
              grid-template-columns: 1fr;
              gap: 12px;
            }
            
            .stat-card {
              min-height: 120px;
              padding: 20px;
            }
            
            .filter-input-group {
              grid-template-columns: 1fr;
            }
            
            .table-footer {
              flex-direction: column;
              gap: 16px;
              align-items: flex-start;
            }
            
            .table-controls {
              flex-direction: column;
              gap: 12px;
              align-items: flex-start;
            }
            
            .header-actions {
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
              width: 100%;
            }
            
            .refresh-btn {
              align-self: flex-end;
              width: 40px;
              height: 40px;
            }
            
            .period-display {
              flex-direction: column;
              gap: 20px;
            }
          }

          @media (max-width: 576px) {
            .orders-table th,
            .orders-table td {
              padding: 12px 8px;
              font-size: 12px;
            }
            
            .stat-card {
              min-height: 100px;
              padding: 16px;
            }
            
            .stat-icon {
              width: 48px;
              height: 48px;
              margin-bottom: 12px;
            }
            
            .stat-value {
              font-size: 24px;
            }
            
            .billing-details-content {
              padding: 16px;
            }
            
            .details-section {
              padding: 16px;
            }
            
            .items-table th,
            .items-table td {
              padding: 8px;
              font-size: 11px;
            }
          }
        </style>
      `;

      $(page.body).html(layout);
      this.restoreFilterInputs();
      // Remove default Frappe page header space
      setTimeout(() => {
        $('.page-head').hide();
        $('.page-container').css('padding-top', '0');
      }, 50);
    },

    bindEvents() {
      // Refresh button click
      $(document).on('click', '#refresh-btn', () => {
        this.manualRefresh();
      });

      // Pagination and filters
      $('#rows-per-page').on('change', (e) => {
        state.page_size = parseInt($(e.target).val(), 10);
        state.page = 1;
        this.loadData();
      });

      // Filter inputs - enter key support
      $(document).on('keypress', '.filter-input', (e) => {
        if (e.which === 13) {
          state.page = 1;
          this.loadData();
        }
      });

      // Filter inputs - change event with debounce
      let filterTimeout;
      $(document).on('input', '.filter-input', (e) => {
        const $target = $(e.target);
        const id = $target.attr('id');
        const value = $target.val().trim();

        // Update state.filters immediately
        switch (id) {
          case 'filter-order-no': state.filters.sales_order_no = value; break;
          case 'filter-customer': state.filters.customer_name = value; break;
          case 'filter-order-type': state.filters.order_type = value; break;
          case 'filter-min-amount': state.filters.min_amount = value; break;
          case 'filter-max-amount': state.filters.max_amount = value; break;
        }

        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
          state.page = 1;
          this.loadData();
        }, 450);
      });

      // Panel close button
      $(document).on('click', '.close-panel', () => this.closePanel());

      // View Full Statement button
      $(document).on('click', '#view-full-btn', () => {
        this.viewFullStatement();
      });

      // Bill Now button
      $(document).on('click', '#bill-now-btn', () => {
        this.billNow();
      });

      // Close panel when clicking outside (for mobile)
      $(document).on('click', (e) => {
        if (state.isRightPanelOpen && 
            !$(e.target).closest('.right-panel-wrapper').length && 
            !$(e.target).closest('.orders-table tbody tr').length) {
          this.closePanel();
        }
      });
    },

    async refreshAllData() {
      if (state.isRefreshing) return;
      
      const $btn = $('#refresh-btn');
      
      // Add spinning animation
      $btn.addClass('refreshing');
      state.isRefreshing = true;
      
      try {
        console.log('Refreshing all billing data...');
        
        const response = await frappe.call({
          method: "nexapp.api.refresh_billing_data",
          callback: function(r) {
            console.log('Refresh response:', r);
          }
        });
        
        console.log('Refresh API response:', response);
        
        if (response && response.message && response.message.status === 'success') {
          frappe.show_alert({
            message: response.message.message,
            indicator: 'green'
          }, 5);
          
          // Refresh both stats and data
          await Promise.all([
            this.loadTotalStats(),
            this.loadData()
          ]);
        } else {
          const errorMsg = response?.message?.message || 'Error refreshing data';
          frappe.show_alert({
            message: errorMsg,
            indicator: 'red'
          }, 5);
        }
      } catch (error) {
        console.error('Refresh all error:', error);
        frappe.show_alert({
          message: 'Error refreshing data',
          indicator: 'red'
        }, 5);
      } finally {
        state.isRefreshing = false;
        $btn.removeClass('refreshing');
      }
    },

    async manualRefresh() {
      if (state.isRefreshing) return;
      
      const $btn = $('#refresh-btn');
      
      // Add spinning animation
      $btn.addClass('refreshing');
      state.isRefreshing = true;
      
      try {
        console.log('Manual refresh...');
        await Promise.all([
          this.loadTotalStats(),
          this.loadData()
        ]);
        
        // Show success message
        frappe.show_alert({
          message: 'Data refreshed successfully',
          indicator: 'green'
        }, 3);
        
      } catch (error) {
        console.error('Manual refresh error:', error);
        frappe.show_alert({
          message: 'Error refreshing data',
          indicator: 'red'
        }, 3);
      } finally {
        state.isRefreshing = false;
        $btn.removeClass('refreshing');
      }
    },

    async loadTotalStats() {
      try {
        console.log('Loading stats...');
        
        const response = await frappe.call({
          method: "nexapp.api.get_invoice_stats",
          callback: function(r) {
            console.log('Stats API response:', r);
          }
        });

        console.log('Stats response:', response);
        
        if (response && response.message) {
          state.stats = response.message;
          this.updateStatsDisplay();
        } else {
          console.warn('No response from stats API');
          state.stats = {
            total: 0,
            billed: 0,
            balance: 0,
            percentage: 0
          };
          this.updateStatsDisplay();
        }
      } catch (error) {
        console.error('Error loading stats:', error);
        state.stats = {
          total: 0,
          billed: 0,
          balance: 0,
          percentage: 0
        };
        this.updateStatsDisplay();
      }
    },

    updateStatsDisplay() {
      console.log('Updating stats display:', state.stats);
      $('#stat-total').text(utils.formatNumber(state.stats.total));
      $('#stat-billed').text(utils.formatCurrency(state.stats.billed));
      $('#stat-balance').text(utils.formatCurrency(state.stats.balance));
      $('#stat-percentage').text(`${state.stats.percentage}%`);
    },

    getFilters() {
      const filters = {
        sales_order_no: state.filters.sales_order_no || "",
        customer_name: state.filters.customer_name || "",
        order_type: state.filters.order_type || "",
        min_amount: state.filters.min_amount || "",
        max_amount: state.filters.max_amount || "",
        billing_month: state.filters.billing_month || ""
      };
      return filters;
    },

    async loadData() {
      try {
        console.log('Loading data...');
        console.log('Filters:', this.getFilters());
        console.log('Page:', state.page, 'Page size:', state.page_size);
        
        $('#table-body').html('<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7280;">Loading billing statements...</td></tr>');

        const filters = this.getFilters();
        const response = await frappe.call({
          method: "nexapp.api.get_sales_orders",
          args: {
            filters: JSON.stringify(filters),
            page: state.page,
            page_size: state.page_size
          },
          callback: function(r) {
            console.log('Data API response:', r);
          }
        });

        console.log('Data response:', response);
        
        if (response && response.message) {
          state.total = response.message.total || 0;
          const orders = response.message.orders || [];
          console.log('Total orders:', state.total);
          console.log('Orders data:', orders);
          
          this.renderTable(orders);
          this.updateTableInfo();
          this.renderPagination();
        } else {
          console.warn('No response from data API');
          $('#table-body').html('<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7280;">No billing statements found</td></tr>');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        $('#table-body').html('<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444;">Error loading data: ' + error.message + '</td></tr>');
      }
    },

    restoreFilterInputs() {
      try {
        $('#filter-order-no').val(state.filters.sales_order_no || '');
        $('#filter-customer').val(state.filters.customer_name || '');
        $('#filter-order-type').val(state.filters.order_type || '');
        $('#filter-min-amount').val(state.filters.min_amount || '');
        $('#filter-max-amount').val(state.filters.max_amount || '');
      } catch (e) {
        console.warn('Error restoring filter inputs:', e);
      }
    },

    renderTable(orders) {
      const tbody = $('#table-body');
      tbody.empty();

      console.log('Rendering table with orders:', orders);
      
      if (!orders || orders.length === 0) {
        tbody.append('<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7280;">No billing statements found</td></tr>');
        return;
      }

      orders.forEach(order => {
        console.log('Processing order:', order);
        
        const orderTypeBadge = utils.createOrderTypeBadge(order.order_type || '');
        
        // Calculate colors based on billing status
        const total = parseFloat(order.sales_order_amount) || 0;
        const billed = parseFloat(order.billed_amount) || 0;
        const balance = parseFloat(order.balance_to_bill) || 0;
        
        let totalClass = 'amount-not-billed';
        let billedClass = 'amount-not-billed';
        let balanceClass = 'amount-not-billed';
        
        if (total > 0) {
          if (billed >= total) {
            totalClass = 'amount-fully-billed';
            billedClass = 'amount-fully-billed';
            balanceClass = 'amount-fully-billed';
          } else if (billed > 0) {
            totalClass = 'amount-partial-billed';
            billedClass = 'amount-partial-billed';
            balanceClass = 'amount-partial-billed';
          }
        }
        
        const row = $(`
          <tr data-order="${utils.escapeHtml(order.billing_statement_no)}">
            <td><strong>${utils.escapeHtml(order.billing_statement_no || '-')}</strong></td>
            <td>${utils.escapeHtml(order.sales_order_no || '-')}</td>
            <td>${utils.escapeHtml(order.customer_name || '-')}</td>
            <td>${orderTypeBadge}</td>
            <td class="amount-cell ${totalClass}">${utils.formatCurrency(total)}</td>
            <td class="amount-cell ${billedClass}">${utils.formatCurrency(billed)}</td>
            <td class="amount-cell ${balanceClass}">${utils.formatCurrency(balance)}</td>
          </tr>
        `);

        row.on('click', () => this.openOrderDetails(order));
        tbody.append(row);
      });
    },

    async openOrderDetails(order) {
      // Highlight selected row
      $('.orders-table tr').removeClass('selected');
      $(`[data-order="${order.billing_statement_no}"]`).addClass('selected');

      // Open right panel
      $('.right-panel-wrapper').addClass('active');
      state.isRightPanelOpen = true;
      state.current_order = order.billing_statement_no;

      // Set basic information
      $('#billing-statement-display').text(order.billing_statement_no || 'Billing Statement');
      $('#detail-sales-order-no').text(order.sales_order_no || '-');
      $('#detail-customer').text(order.customer_name || '-');
      $('#detail-total-amount').text(utils.formatCurrency(order.sales_order_amount || 0));

      // Set billing status
      const billed = parseFloat(order.billed_amount) || 0;
      const total = parseFloat(order.sales_order_amount) || 0;
      const balance = parseFloat(order.balance_to_bill) || 0;
      
      let billingStatus = 'PENDING';
      if (billed >= total) {
        billingStatus = 'FULLY BILLED';
        $('#billing-status').css('color', '#10b981');
      } else if (billed > 0) {
        billingStatus = 'PARTIALLY BILLED';
        $('#billing-status').css('color', '#d97706');
      } else {
        $('#billing-status').css('color', '#dc2626');
      }
      $('#billing-status').text(billingStatus);

      // Set billing period
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      $('#detail-billing-period').text(`Monthly Billing`);
      $('#detail-period-from').text(utils.formatDate(firstDay.toISOString()));
      $('#detail-period-to').text(utils.formatDate(lastDay.toISOString()));

      // Load item details
      this.loadBillingItems();

      // Update summary
      $('#summary-billed').text(utils.formatCurrency(billed));
      $('#summary-balance').text(utils.formatCurrency(balance));
      
      // Calculate and update progress
      const percentage = total > 0 ? Math.round((billed / total) * 100) : 0;
      $('#billing-progress-bar').css('width', `${percentage}%`);
      $('#billing-progress-text').text(`${percentage}%`);
    },

    loadBillingItems() {
      try {
        const itemsBody = $('#items-table-body');
        itemsBody.empty();
        
        const sampleItems = [
          {
            circuit_id: '69623',
            item_description: 'Installation & Commissioning charges',
            billing_start_date: '01-10-2025',
            rate: 9500,
            quantity: 1,
            amount: 9500
          },
          {
            circuit_id: '69623',
            item_description: 'NextEdge-Inteligent WAN 10Mbps ILL-4GD',
            billing_start_date: '24-09-2025',
            rate: 16350,
            quantity: 1,
            amount: 16350
          },
          {
            circuit_id: '69623',
            item_description: '100Mbps-MBB 12-12-2025',
            billing_start_date: '12-12-2025',
            rate: 4650,
            quantity: 1,
            amount: 4650
          }
        ];
        
        let totalAmount = 0;
        
        sampleItems.forEach(item => {
          totalAmount += item.amount;
          
          const row = $(`
            <tr>
              <td>${item.circuit_id}</td>
              <td>${item.item_description}</td>
              <td>${item.billing_start_date}</td>
              <td>${utils.formatCurrency(item.rate)}</td>
              <td>${item.quantity}</td>
              <td>${utils.formatCurrency(item.amount)}</td>
            </tr>
          `);
          
          itemsBody.append(row);
        });
        
        $('#items-total-amount').text(utils.formatCurrency(totalAmount));
        
      } catch (error) {
        console.error('Error loading billing items:', error);
        const itemsBody = $('#items-table-body');
        itemsBody.html('<tr><td colspan="6" style="text-align:center;padding:20px;color:#6b7280;">Error loading items</td></tr>');
      }
    },

    closePanel() {
      $('.right-panel-wrapper').removeClass('active');
      state.isRightPanelOpen = false;
      state.current_order = null;
      $('.orders-table tr').removeClass('selected');
    },

    viewFullStatement() {
      if (state.current_order) {
        frappe.set_route('Form', 'Billing Statement', state.current_order);
      } else {
        frappe.show_alert({
          message: 'Please select a billing statement first',
          indicator: 'red'
        }, 3);
      }
    },

    async billNow() {
      if (!state.current_order) {
        frappe.show_alert({
          message: 'Please select a billing statement first',
          indicator: 'red'
        }, 3);
        return;
      }

      frappe.confirm(
        'Are you sure you want to generate the invoice for this billing statement?',
        () => {
          this.generateInvoice();
        },
        () => {
          console.log('Bill Now action cancelled');
        }
      );
    },

    async generateInvoice() {
      try {
        frappe.show_alert({
          message: 'Generating invoice...',
          indicator: 'blue'
        }, 3);
        
        setTimeout(() => {
          frappe.show_alert({
            message: 'Invoice generated successfully! (Demo Mode)',
            indicator: 'green'
          }, 5);
          
          this.loadTotalStats();
          this.loadData();
          
        }, 1500);
        
      } catch (error) {
        console.error('Error generating invoice:', error);
        frappe.show_alert({
          message: 'Error generating invoice: ' + error.message,
          indicator: 'red'
        }, 5);
      }
    },

    updateTableInfo() {
      const start = state.total === 0 ? 0 : ((state.page - 1) * state.page_size + 1);
      const end = Math.min(state.total, state.page * state.page_size);
      $('#table-info').text(`Showing ${start}–${end} of ${state.total}`);
    },

    renderPagination() {
      const container = $('#pagination');
      container.empty();

      const totalPages = Math.max(1, Math.ceil(state.total / state.page_size));

      // Previous buttons
      this.addPaginationButton(container, '«', 1, state.page === 1);
      this.addPaginationButton(container, '‹', state.page - 1, state.page === 1);

      // Page numbers
      const maxButtons = 7;
      let startPage = Math.max(1, state.page - Math.floor(maxButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);

      if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        this.addPaginationButton(container, i, i, false, i === state.page);
      }

      // Next buttons
      this.addPaginationButton(container, '›', state.page + 1, state.page === totalPages);
      this.addPaginationButton(container, '»', totalPages, state.page === totalPages);
    },

    addPaginationButton(container, label, page, disabled = false, active = false) {
      const button = $(`<button class="page-btn">${label}</button>`);

      if (active) button.addClass('active');
      if (disabled) button.prop('disabled', true);

      if (!disabled) {
        button.on('click', () => {
          state.page = page;
          this.loadData();
        });
      }

      container.append(button);
    }
  };

  // Initialize the application
  UI.init();
};