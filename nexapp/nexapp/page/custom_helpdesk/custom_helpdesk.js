frappe.pages['custom-helpdesk'].on_page_load = function(wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: '', // REMOVED TITLE COMPLETELY
    single_column: true
  });

  // Simple state management
  const state = {
    page: 1,
    page_size: 20,
    total: 0,
    current_ticket: null,
    cached_activity: {},
    cached_site_data: {},
    stats: {
      total: 0,
      open: 0,
      replied: 0,
      on_hold: 0,
      wrong_circuit: 0,
      resolved: 0,
      closed: 0
    },
    filters: {
      ticket_no: "",
      channel: "",
      circuit_id: "",
      customer: "",
      site_name: "",
      status: ""
    },
    // NEW: Auto-refresh state
    autoRefreshInterval: null,
    isRefreshing: false
  };

  // Utility functions (keep the same as before)
  const utils = {
    formatDate(dt_str) {
      if (!dt_str) return "";
      try {
        // Handle different date formats
        let dateStr = dt_str;
        if (dt_str.includes(' ')) {
          dateStr = dt_str.replace(" ", "T");
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
          // Try another format if first fails
          const d2 = new Date(dt_str);
          if (isNaN(d2.getTime())) return dt_str;
          return this.formatDateTime(d2);
        }
        return this.formatDateTime(d);
      } catch (e) { 
        console.error('Date formatting error:', e, dt_str);
        return dt_str; 
      }
    },

    formatDateTime(dateObj) {
      const pad = n => String(n).padStart(2, "0");
      return `${pad(dateObj.getDate())}-${pad(dateObj.getMonth()+1)}-${dateObj.getFullYear()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
    },

    formatRelativeTime(dateString) {
      if (!dateString) return "";
      const date = new Date(dateString.replace(" ", "T"));
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      const pad = n => String(n).padStart(2, "0");
      return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}`;
    },

    escapeHtml(text) {
      if (text === null || text === undefined) return "";
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    formatNumber(num) {
      return new Intl.NumberFormat().format(num);
    },

    renderQuillContent(htmlContent) {
      if (!htmlContent) return "-";
      if (htmlContent.includes('ql-editor')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const quillContent = tempDiv.querySelector('.ql-editor');
        if (quillContent) {
          return quillContent.innerHTML;
        }
      }
      return htmlContent;
    },

    getStatusColor(status) {
      const colorMap = {
        'Open': '#dc2626',
        'Replied': '#2563eb',
        'On Hold': '#d97706',
        'Wrong Circuit': '#8b5cf6',
        'Resolved': '#10b981',
        'Closed': '#6b7280'
      };
      return colorMap[status] || '#6b7280';
    },

    createStatusBadge(status) {
      if (!status || status === '-') return '-';
      const color = this.getStatusColor(status);
      return `
        <span class="status-badge" style="
          background: ${color}15;
          color: ${color};
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          display: inline-block;
        ">
          ${status}
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
    },

    // NEW: Calculate progress based on ticket status
    getStatusProgress(currentStatus) {
      // Define all status stages in order
      const stages = [
        { name: 'Open', color: '#dc2626' },
        { name: 'Replied', color: '#2563eb' },
        { name: 'On Hold', color: '#d97706' },
        { name: 'Wrong Circuit', color: '#8b5cf6' },
        { name: 'Resolved', color: '#10b981' },
        { name: 'Closed', color: '#6b7280' }
      ];
      
      // Find current stage index
      let currentIndex = 0;
      let percentage = 0;
      
      stages.forEach((stage, index) => {
        if (stage.name === currentStatus) {
          currentIndex = index;
          // Calculate percentage: (current stage + 1) / total stages * 100
          percentage = Math.round(((index + 1) / stages.length) * 100);
        }
      });
      
      return {
        stages,
        percentage,
        currentIndex,
        currentStatus
      };
    }
  };

  // Create UI components
  const UI = {
    async init() {
      this.renderLayout();
      this.bindEvents();
      this.setupStatusButton();
      this.loadTotalStats();
      this.loadData();
      this.startAutoRefresh(); // Start auto-refresh
    },

    renderLayout() {
      const layout = `
        <div class="helpdesk-container">
          <!-- Header - TOTALLY COMPACT -->
          <div class="helpdesk-header">
          <div class="header-spacer"></div>
            <div class="header-content">
              <div>
                <h1>Helpdesk</h1>
                <p class="subtitle">Stay updated on every ticket, anytime</p>               
              </div>
              <div class="header-actions">
                <!-- Refresh button moved to tickets section -->
              </div>              
            </div>             
          </div>

          <!-- Quick Stats Cards -->
          <div class="stats-section">
            <div class="stats-grid">
              <div class="stat-card total" data-status="total">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-total">0</div>
                  <div class="stat-label">Total Tickets</div>
                </div>
              </div>

              <div class="stat-card open" data-status="Open">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-open">0</div>
                  <div class="stat-label">Open</div>
                </div>
                <div class="stat-badge urgent">URGENT</div>
              </div>

              <div class="stat-card replied" data-status="Replied">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-replied">0</div>
                  <div class="stat-label">Replied</div>
                </div>
              </div>

              <div class="stat-card hold" data-status="On Hold">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-on-hold">0</div>
                  <div class="stat-label">On Hold</div>
                </div>
              </div>

              <div class="stat-card wrong-circuit" data-status="Wrong Circuit">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18.364 5.636a9 9 0 0 1 0 12.728m-12.728 0a9 9 0 0 1 0-12.728"/>
                    <path d="M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-wrong-circuit">0</div>
                  <div class="stat-label">Wrong Circuit</div>
                </div>
              </div>

              <div class="stat-card resolved" data-status="Resolved">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2"/>
                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-resolved">0</div>
                  <div class="stat-label">Resolved</div>
                </div>
              </div>

              <div class="stat-card closed" data-status="Closed">
                <div class="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <div class="stat-value" id="stat-closed">0</div>
                  <div class="stat-label">Closed</div>
                  <div class="stat-percentage" id="closed-percentage">0%</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="main-content">
            <!-- Tickets List -->
            <div class="tickets-section">
              <div class="section-header" style="display:flex; flex-direction:column; gap:12px;">

    <!-- ROW 1: Title + Refresh Button -->
    <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2>All Tickets</h2>

        <button id="refresh-btn" class="refresh-btn" title="Refresh">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
        </button>
    </div>

    <!-- ROW 2: Filters (Full Width) -->
    <div class="filter-input-group" style="display:grid; grid-template-columns: repeat(6, 1fr); gap:12px;">
        <input type="text" id="filter-ticket" placeholder="Ticket No" class="filter-input">
        <input type="text" id="filter-channel" placeholder="Channel" class="filter-input">
        <input type="text" id="filter-circuit" placeholder="Circuit ID" class="filter-input">
        <input type="text" id="filter-customer" placeholder="Customer" class="filter-input">
        <input type="text" id="filter-site" placeholder="Site Name" class="filter-input">
        <input type="text" id="filter-status" placeholder="Status" class="filter-input">
    </div>

</div>


              <div class="table-container">
                <table class="tickets-table">
                  <thead>
                    <tr>
                      <th>TICKET NO</th>
                      <th>CHANNEL</th>
                      <th>CIRCUIT ID</th>
                      <th>CUSTOMER</th>
                      <th>SITE NAME</th>
                      <th>STATUS</th>
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

            <!-- Right Panel Container - REDESIGNED -->
            <div class="right-panel-wrapper">
              <div id="details-panel" class="details-panel">
                <!-- Panel Header with Gradient -->
                <div class="panel-header gradient-bg">
                  <div class="panel-header-content">
                    <div class="ticket-header">
                      <div class="ticket-title">
                        <div class="ticket-header-top">
                          <h3>TICKET DETAILS</h3>
                          <button class="close-panel">&times;</button>
                        </div>
                        <div class="ticket-number">
                          <span id="ticket-name-display">HD Ticket</span>
                          <div class="status-display-header">
                            <div id="status-ball" class="status-ball" data-status=""></div>
                            <div id="status-text" class="status-text">-</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- UPDATED: Only Ticket Details Tab (Removed Email Activity Tab) -->
                <div class="panel-tabs">
                  <button class="tab-btn active" data-tab="details">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="tab-label">Ticket Details</span>
                  </button>
                </div>

                <div class="panel-content">
                  <!-- Enhanced Details Tab -->
                  <div id="tab-details" class="tab-content active">
                    <!-- Quick Stats - UPDATED: Positions swapped (TICKET CREATED first, then CLOSED) -->
                    <div class="quick-stats">
                      <!-- TICKET CREATED (now in first position) -->
                      <div class="stat-item">
                        <div class="stat-icon-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <div class="stat-content">
                          <div class="stat-title">TICKET CREATED</div>
                          <div class="stat-value" id="ticket-created">-</div>
                        </div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-icon-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                            <path d="M12 6v6l4 2"/>
                          </svg>
                        </div>
                        <div class="stat-content">
                          <div class="stat-title">RESOLUTION BY (SLA)</div>
                          <div class="stat-value" id="resolution-by">-</div>
                        </div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-icon-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                        </div>
                        <div class="stat-content">
                          <div class="stat-title">AGENT RESPONSE</div>
                          <div class="stat-value" id="agent-response">-</div>
                        </div>
                      </div>
                      <!-- CLOSED (now in fourth position) -->
                      <div class="stat-item">
                        <div class="stat-icon-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </div>
                        <div class="stat-content">
                          <div class="stat-title">CLOSED</div>
                          <div class="stat-value" id="closed-date">-</div>
                        </div>
                      </div>
                    </div>

                    <!-- Ticket Details Grid -->
                    <div class="details-grid">
                      <!-- Row 1: Circuit & Status -->
                    
                    <!-- FIXED: Ticket Status Progress Indicator - REMOVED PROGRESS BAR AND PERCENTAGE -->
                      <div class="detail-card status-progress-card">
                        <div class="detail-card-header">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22,4 12,14.01 9,11.01"/>
                          </svg>
                          <span>TICKET STATUS PROGRESS</span>
                          <!-- REMOVED: status-progress-percentage div -->
                        </div>
                        <div class="status-progress-container">
                          <div class="status-progress-visual">
                            <!-- REMOVED: Progress bar section -->
                            <div class="status-progress-stages">
                              <div class="status-stage" data-stage="open">
                                <div class="stage-dot" style="background-color: #dc2626;"></div>
                                <div class="stage-label">Open</div>
                              </div>
                              <div class="status-stage" data-stage="replied">
                                <div class="stage-dot" style="background-color: #2563eb;"></div>
                                <div class="stage-label">Replied</div>
                              </div>
                              <div class="status-stage" data-stage="on-hold">
                                <div class="stage-dot" style="background-color: #d97706;"></div>
                                <div class="stage-label">On Hold</div>
                              </div>
                              <div class="status-stage" data-stage="wrong-circuit">
                                <div class="stage-dot" style="background-color: #8b5cf6;"></div>
                                <div class="stage-label">Wrong Circuit</div>
                              </div>
                              <div class="status-stage" data-stage="resolved">
                                <div class="stage-dot" style="background-color: #10b981;"></div>
                                <div class="stage-label">Resolved</div>
                              </div>
                              <div class="status-stage" data-stage="closed">
                                <div class="stage-dot" style="background-color: #6b7280;"></div>
                                <div class="stage-label">Closed</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>














                      
                      <!-- Row 2: Subject -->
                      <div class="detail-card subject-card">
                        <div class="detail-card-header">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <line x1="10" y1="9" x2="8" y2="9"/>
                          </svg>
                          <span>SUBJECT</span>
                        </div>
                        <div class="detail-card-content" id="detail-subject">-</div>
                      </div>

                      <!-- Row 3: Description -->
                      <div class="detail-card description-card">
                        <div class="detail-card-header">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          <span>ISSUE DESCRIPTION</span>
                        </div>
                        <div class="detail-card-content">
                          <div id="detail-description" class="description-content">-</div>
                        </div>
                      </div>

                      <!-- Row 4: Ticket Info Grid - UPDATED: Removed TICKET CREATED, rearranged -->
                      <div class="detail-card info-grid-card">
                        <div class="detail-card-header">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                          <span>TICKET INFORMATION</span>
                        </div>
                        <div class="info-grid">

                        <div class="info-item">
                            <div class="info-label">CIRCUIT ID</div>
                            <div class="circuit-id" id="detail-circuit">-</div>
                          </div>

                          <div class="info-item">
                            <div class="info-label">SITE NAME</div>
                            <div class="info-value" id="detail-site-name">-</div>
                          </div>
                          
                          <div class="info-item">
                            <div class="info-label">SITE TYPE</div>
                            <div class="info-value" id="detail-site-type">-</div>
                          </div>                          
                          
                          <div class="info-item">
                            <div class="info-label">PRIORITY</div>
                            <div class="info-value priority-value" id="detail-priority">-</div>
                          </div>
                          <div class="info-item">
                            <div class="info-label">SITE ID</div>
                            <div class="info-value" id="detail-site-id">-</div>
                          </div>
                          <!-- UPDATED: Removed TICKET CREATED row, moved RESOLUTION to take its place -->
                          <div class="info-item">
                            <div class="info-label">RCA</div>
                            <div class="info-value" id="detail-resolution">-</div>
                          </div>
                        </div>
                      </div>

                      
                      <!-- Row 6: Site Address -->
                      <div class="detail-card address-card">
                        <div class="detail-card-header">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          <span>SITE ADDRESS</span>
                        </div>
                        <div class="address-grid">
                          <div class="address-item">
                            <div class="address-label">STREET</div>
                            <div class="address-value" id="detail-address-street">-</div>
                          </div>
                          <div class="address-item">
                            <div class="address-label">DISTRICT</div>
                            <div class="address-value" id="detail-district">-</div>
                          </div>
                          <div class="address-item">
                            <div class="address-label">CITY</div>
                            <div class="address-value" id="detail-city">-</div>
                          </div>
                          <div class="address-item">
                            <div class="address-label">PINCODE</div>
                            <div class="address-value" id="detail-pincode">-</div>
                          </div>
                          <div class="address-item">
                            <div class="address-label">STATE</div>
                            <div class="address-value" id="detail-state">-</div>
                          </div>
                          <div class="address-item">
                            <div class="address-label">TERRITORY</div>
                            <div class="address-value" id="detail-territory">-</div>
                          </div>
                        </div>
                      </div>

                      <!-- Row 7: Contact Information -->
                      <div class="detail-card contact-card">
                        <div class="detail-card-header">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span>CONTACT INFORMATION</span>
                        </div>
                        <div class="contact-grid">
                          <div class="contact-item">
                            <div class="contact-label">CONTACT PERSON</div>
                            <div class="contact-value" id="detail-contact-person">-</div>
                          </div>
                          <div class="contact-item">
                            <div class="contact-label">MOBILE</div>
                            <div class="contact-value" id="detail-primary-contact-mobile">-</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>
          .header-spacer {
          height: 10px;   /* You can adjust (e.g., 10px, 20px, 30px) */          
          }

          /* Base Styles */
          .helpdesk-container {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            min-height: 100vh;
            padding: 20px 24px 24px 24px;
          }

          /* Header - EXTREMELY COMPACT */
          .helpdesk-header {
            margin-bottom: 16px;
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
            background: linear-gradient(135deg, #F75900 0%, #ff8c42 100%);
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
            gap: 12px;
          }

          /* Refresh Button - Simple Round Button */
          .refresh-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #F75900 0%, #ff8c42 100%);
            color: white;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(247, 89, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            flex-shrink: 0;
          }

          .refresh-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(247, 89, 0, 0.3);
          }

          .refresh-btn:active {
            transform: scale(0.95);
          }

          .refresh-btn.refreshing svg {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .refresh-btn svg {
            width: 18px;
            height: 18px;
          }

          /* Stats Section */
          .stats-section {
            margin-bottom: 20px;
          }

          .stats-grid {
            display: flex;
            flex-wrap: nowrap;
            gap: 12px;
            overflow-x: hidden;
            padding-bottom: 8px;
            justify-content: space-between;
          }

          .stat-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            flex: 1;
            min-width: 0;
            min-height: 80px;
          }

          .stat-card::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: #F75900;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(247, 89, 0, 0.1);
            border-color: rgba(247, 89, 0, 0.2);
          }

          .stat-card:hover::before {
            opacity: 1;
          }

          .stat-card.active {
            background: #fffaf5;
            border-color: #F75900;
          }

          .stat-card.active::before {
            opacity: 1;
          }

          .stat-card.total .stat-icon {
            background: linear-gradient(135deg, #fffaf5 0%, #ffe8d6 100%);
            color: #F75900;
          }

          .stat-card.open .stat-icon {
            background: linear-gradient(135deg, #fef2f2 0%, #fed7d7 100%);
            color: #dc2626;
          }

          .stat-card.replied .stat-icon {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            color: #2563eb;
          }

          .stat-card.hold .stat-icon {
            background: linear-gradient(135deg, #fffbeb 0%, #fed7aa 100%);
            color: #d97706;
          }

          .stat-card.wrong-circuit .stat-icon {
            background: linear-gradient(135deg, #f5f3ff 0%, #e6e6ff 100%);
            color: #8b5cf6;
          }

          .stat-card.resolved .stat-icon {
            background: linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%);
            color: #10b981;
          }

          .stat-card.closed .stat-icon {
            background: linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%);
            color: #6b7280;
          }

          .stat-info {
            flex: 1;
            min-width: 0;
          }

          .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            line-height: 1;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .stat-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .stat-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .stat-badge.urgent {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }

          .stat-percentage {
            font-size: 11px;
            font-weight: 600;
            color: #10b981;
            margin-top: 2px;
          }

          /* Main Content */
          .main-content {
            display: flex;
            gap: 24px;
            position: relative;
          }

          .tickets-section {
            flex: 1;
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
          }

          .section-header {
            margin-bottom: 20px;
          }

          .section-header h2 {
            margin: 0 0 16px 0;
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
            border-color: #F75900;
            box-shadow: 0 0 0 3px rgba(247, 89, 0, 0.1);
          }

          .filter-input::placeholder {
            color: #9ca3af;
          }

          /* Table */
          .table-container {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }

          .tickets-table {
            width: 100%;
            border-collapse: collapse;
          }

          .tickets-table th {
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

          .tickets-table td {
            padding: 16px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
            color: #374151;
          }

          .tickets-table tbody tr {
            transition: all 0.2s ease;
          }

          .tickets-table tbody tr:hover {
            background: #f8fafc;
            cursor: pointer;
          }

          .tickets-table tbody tr.selected {
            background: #fffaf5;
            border-left: 4px solid #F75900;
          }

          /* Table Footer */
          .table-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            margin-top: 20px;
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
            border-color: #F75900;
            color: #F75900;
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

          /* REDESIGNED RIGHT PANEL */
          .right-panel-wrapper {
            position: fixed;
            right: -700px;
            top: 50px;          
            width: 700px;
            height: calc(100vh - 56px); 
            background: white;
            box-shadow: -4px 0 20px rgba(0,0,0,0.15);
            transition: right 0.3s ease;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
          }

          .right-panel-wrapper.active {
            right: 0;
          }

          .details-panel {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #f8fafc;
          }

          /* Panel Header with Gradient */
          .panel-header.gradient-bg {
            background: linear-gradient(135deg, #F75900 0%, #ff8c42 100%);
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .ticket-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .ticket-header-top h3 {
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

          .ticket-number {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .ticket-number span {
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

          .status-ball {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          .status-ball:hover {
            transform: scale(1.2);
          }

          .status-ball[data-status="Open"] {
            background: radial-gradient(circle at 30% 30%, #ffcccc, #ff3333 40%, #cc0000 80%);
          }

          .status-ball[data-status="Replied"] {
            background: radial-gradient(circle at 30% 30%, #b3d9ff, #0066cc 40%, #003d80 80%);
          }

          .status-ball[data-status="On Hold"] {
            background: radial-gradient(circle at 30% 30%, #fff7b3, #ffe600 40%, #c7a700 80%);
          }

          .status-ball[data-status="Wrong Circuit"] {
            background: radial-gradient(circle at 30% 30%, #e6b3ff, #aa00cc 40%, #660066 80%);
          }

          .status-ball[data-status="Resolved"] {
            background: radial-gradient(circle at 30% 30%, #c2ffcc, #33cc33 40%, #228822 80%);
          }

          .status-ball[data-status="Closed"] {
            background: radial-gradient(circle at 30% 30%, #e6e6e6, #999999 40%, #666666 80%);
          }

          .status-text {
            font-size: 12px;
            font-weight: 600;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Enhanced Tabs */
          .panel-tabs {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            background: white;
            padding: 0 24px;
          }

          .tab-btn {
            flex: 1;
            padding: 18px 0;
            border: none;
            background: transparent;
            font-size: 13px;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s ease;
            position: relative;
            border-bottom: 3px solid transparent;
          }

          .tab-btn.active {
            color: #F75900;
            border-bottom-color: #F75900;
          }

          .tab-btn.active svg {
            stroke: #F75900;
          }

          .tab-btn svg {
            width: 18px;
            height: 18px;
            transition: stroke 0.2s ease;
          }

          .tab-label {
            font-weight: 600;
          }

          /* Panel Content */
          .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 0;
          }

          .tab-content {
            display: none;
          }

          .tab-content.active {
            display: block;
          }

          /* Enhanced Details Tab */
          #tab-details {
            padding: 24px;
          }

          /* Quick Stats */
          .quick-stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }

          .stat-item {
            background: white;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
          }

          .stat-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(247, 89, 0, 0.1);
            border-color: #F75900;
          }

          .stat-icon-sm {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #fffaf5 0%, #ffe8d6 100%);
            color: #F75900;
            flex-shrink: 0;
          }

          .stat-content {
            flex: 1;
            min-width: 0;
          }

          .stat-title {
            font-size: 10px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }

          .stat-value {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Details Grid */
          .details-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .detail-card {
            background: white;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
            transition: all 0.2s ease;
          }

          .detail-card:hover {
            box-shadow: 0 4px 12px rgba(247, 89, 0, 0.1);
            border-color: #F75900;
          }

          .detail-card-header {
            background: #f8fafc;
            padding: 14px 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .detail-card-header svg {
            width: 16px;
            height: 16px;
            color: #F75900;
          }

          .detail-card-content {
            padding: 20px;
          }

          /* Circuit Card */
          .circuit-card .detail-card-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .circuit-id {
            font-size: 183x;
            font-weight: 600;
            color: #111827;
            margin-left: 15px; 
          }

          .circuit-status {
            font-size: 13px;
            font-weight: 600;
          }

          /* Subject Card */
          .subject-card .detail-card-content {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            line-height: 1.4;
          }

          /* Description Card */
          .description-content {
            line-height: 1.6;
            font-size: 14px;
            color: #374151;
            max-height: 200px;
            overflow-y: auto;
          }

          /* Info Grid Card - UPDATED WITH BETTER MARGIN */
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 8px; /* Increased from 4px to 8px for better spacing */
            padding: 4px 0; /* Added padding for better vertical spacing */
          }

          .info-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px; /* Added margin for better spacing */
            margin-left: 15px; 
          }

          .info-value {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            line-height: 1.4; /* Added line height for better readability */
            min-height: 20px; /* Ensures consistent height */
            word-break: break-word; /* Prevents text overflow */
            margin-left: 15px; 
          }

          .priority-value {
            color: #dc2626;
            font-weight: 700;
          }

          /* Status Progress Card - MODIFIED: Removed progress bar and percentage, kept stages */
          .status-progress-card .detail-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          /* REMOVED: status-progress-percentage CSS */

          .status-progress-container {
            padding: 20px;
          }

          .status-progress-visual {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          /* REMOVED: Progress bar CSS */

          .status-progress-stages {
            display: flex;
            justify-content: space-between;
            position: relative;
            margin-top: 10px;
          }

          .status-stage {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0;
            position: relative;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .status-stage:hover .stage-dot {
            transform: scale(1.3);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .status-stage:hover .stage-label {
            color: #111827;
            font-weight: 700;
          }

          /* FIX: Proper connecting lines - light gray by default */
          .status-stage:not(:last-child)::after {
            content: '';
            position: absolute;
            top: 5px;
            left: calc(50% + 8px);
            right: -50%;
            height: 2px;
            background: #e5e7eb; /* Light gray by default */
            z-index: 1;
            display: block; /* Show the lines */
          }

          /* Highlight lines up to current status */
          .status-stage.active-line:not(:last-child)::after {
            background: #F75900; /* Orange for completed stages */
          }

          .stage-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            z-index: 2;
            position: relative;
            transition: all 0.3s ease;
          }

          .status-stage.active .stage-dot {
            transform: scale(1.4);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }

          .stage-label {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-align: center;
            line-height: 1.2;
            max-width: 80px;
            word-wrap: break-word;
            transition: color 0.3s ease;
          }

          .status-stage.active .stage-label {
            color: #111827;
            font-weight: 700;
          }

          /* Address Card */
          .address-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .address-item {
            display: flex;
            flex-direction: column;
            gap: 8px; /* Increased from 4px to 8px */
            padding: 4px 0; /* Added padding */
          }

          .address-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px; /* Added margin */
            margin-left: 15px; 
          }

          .address-value {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            line-height: 1.4;
            min-height: 20px;
            word-break: break-word;
            margin-left: 15px;
          }

          /* Contact Card */
          .contact-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .contact-item {
            display: flex;
            flex-direction: column;
            gap: 8px; /* Increased from 4px to 8px */
            padding: 4px 0; /* Added padding */
          }

          .contact-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px; /* Added margin */
            margin-left: 15px; 
          }

          .contact-value {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            line-height: 1.4;
            min-height: 20px;
            word-break: break-word;
            margin-left: 15px; 
          }

          /* Responsive Design */
          @media (max-width: 1400px) {
            .stats-grid {
              flex-wrap: nowrap;
            }
            
            .right-panel-wrapper {
              width: 640px;
            }
          }

          @media (max-width: 1200px) {
            .stat-card {
              padding: 14px;
              gap: 10px;
            }
            
            .stat-icon {
              width: 36px;
              height: 36px;
            }
            
            .stat-value {
              font-size: 18px;
            }
            
            .stat-label {
              font-size: 10px;
            }
            
            .quick-stats {
              grid-template-columns: 1fr;
            }
            
            .status-progress-stages {
              flex-wrap: wrap;
              gap: 12px;
            }
            
            .status-stage {
              flex: 0 0 calc(33.333% - 12px);
            }
            
            /* Adjust connecting lines for wrapped layout */
            .status-stage:not(:last-child)::after {
              display: none; /* Hide lines when wrapped */
            }
          }

          @media (max-width: 992px) {
            .main-content {
              flex-direction: column;
            }
            
            .stats-grid {
              flex-wrap: wrap;
              overflow-x: hidden;
            }
            
            .stat-card {
              flex: 0 0 calc(50% - 6px);
              min-width: 0;
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
            
            .info-grid,
            .address-grid,
            .contact-grid {
              grid-template-columns: 1fr;
            }
            
            .status-progress-stages {
              flex-direction: column;
              align-items: flex-start;
              gap: 16px;
            }
            
            .status-stage {
              flex: 1;
              flex-direction: row;
              align-items: center;
              gap: 12px;
              width: 100%;
            }
            
            .status-stage:not(:last-child)::after {
              top: auto;
              left: 5px;
              right: auto;
              bottom: -8px;
              width: 2px;
              height: 16px;
              display: block; /* Show vertical lines in mobile */
            }
            
            .stage-label {
              text-align: left;
              max-width: none;
            }
          }

          @media (max-width: 768px) {
            .helpdesk-container {
              padding: 16px;
            }
            
            .stat-card {
              flex: 0 0 calc(50% - 6px);
              min-height: 70px;
            }
            
            .filter-input-group {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .refresh-btn {
              width: 36px;
              height: 36px;
            }
            
            .refresh-btn svg {
              width: 16px;
              height: 16px;
            }
            
            .status-progress-stages {
              gap: 12px;
            }
            
            .status-stage {
              flex: 0 0 calc(50% - 6px);
            }
            
            .status-stage:not(:last-child)::after {
              display: none; /* Hide lines when wrapped on small screens */
            }
          }

          @media (max-width: 576px) {
            .stats-grid {
              gap: 8px;
            }
            
            .stat-card {
              flex: 0 0 100%;
              min-height: 65px;
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
            
            .filter-input-group {
              grid-template-columns: 1fr;
            }
            
            .right-panel-wrapper {
              height: 80vh;
            }
            
            .panel-tabs {
              padding: 0 16px;
            }
            
            .tab-btn {
              padding: 14px 0;
              font-size: 12px;
            }
            
            .header-actions {
              flex-direction: column;
              gap: 8px;
            }
            
            .status-progress-stages {
              flex-direction: column;
            }
            
            .status-stage {
              flex: 1;
              width: 100%;
            }
          }
        </style>
      `;

      $(page.body).html(layout);
      this.restoreFilterInputs();
      // REMOVE DEFAULT FRAPPE PAGE HEADER SPACE
      setTimeout(() => {
        $('.page-head').hide();                // removes page title area
        $('.page-container').css('padding-top', '0');  // removes leftover padding
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
          case 'filter-ticket': state.filters.ticket_no = value; break;
          case 'filter-channel': state.filters.channel = value; break;
          case 'filter-circuit': state.filters.circuit_id = value; break;
          case 'filter-customer': state.filters.customer = value; break;
          case 'filter-site': state.filters.site_name = value; break;
          case 'filter-status': state.filters.status = value; break;
        }

        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
          state.page = 1;
          this.loadData();
        }, 450);
      });

      // Stats cards click events
      $(document).on('click', '.stat-card', (e) => {
        const status = $(e.currentTarget).data('status');

        // Clear all filters first
        this.clearAllFilters();

        if (status && status !== 'total') {
          $('#filter-status').val(status);
          state.filters.status = status;
          state.page = 1;

          // Add visual feedback
          $('.stat-card').removeClass('active');
          $(e.currentTarget).addClass('active');

          setTimeout(() => {
            this.loadData();
          }, 100);
        } else if (status === 'total') {
          state.page = 1;
          $('.stat-card').removeClass('active');
          $(e.currentTarget).addClass('active');

          setTimeout(() => {
            this.loadData();
          }, 100);
        }
      });

      // Panel controls
      $(document).on('click', '.close-panel', () => this.closePanel());

      // Tabs
      $(document).on('click', '.tab-btn', (e) => {
        const tab = $(e.currentTarget).data('tab');
        this.switchTab(tab);
      });

      // Status ball click
      $(document).on('click', '#status-ball', (e) => {
        if (state.current_ticket) {
          this.showStatusDropdown(e);
        }
      });

      // Status stage click - Keep this functionality for clicking on stages
      $(document).on('click', '.status-stage', (e) => {
        if (state.current_ticket) {
          const stage = $(e.currentTarget).data('stage');
          const statusMap = {
            'open': 'Open',
            'replied': 'Replied',
            'on-hold': 'On Hold',
            'wrong-circuit': 'Wrong Circuit',
            'resolved': 'Resolved',
            'closed': 'Closed'
          };
          
          const newStatus = statusMap[stage];
          if (newStatus) {
            this.updateTicketStatus(state.current_ticket, newStatus);
          }
        }
      });
    },

    // MODIFIED: Start auto-refresh every 2 minutes
    startAutoRefresh() {
      // Clear any existing interval
      if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
      }
      
      // Start new interval - refresh every 2 minutes (120000 milliseconds)
      state.autoRefreshInterval = setInterval(() => {
        if (!state.isRefreshing) {
          this.autoRefreshData();
        }
      }, 120000); // 2 minutes = 120000 milliseconds
    },

    // NEW: Stop auto-refresh
    stopAutoRefresh() {
      if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
      }
    },

    // MODIFIED: Auto-refresh data - refresh both stats and tickets together
    async autoRefreshData() {
      try {
        state.isRefreshing = true;
        
        // Refresh BOTH stats cards and ticket list TOGETHER
        await Promise.all([
          this.loadTotalStats(),  // Refresh stats cards
          this.loadData()         // Refresh ticket list
        ]);
        
      } catch (error) {
        console.error('Auto-refresh error:', error);
      } finally {
        state.isRefreshing = false;
      }
    },

    // MODIFIED: Manual refresh - also refresh both together
    async manualRefresh() {
      if (state.isRefreshing) return;
      
      const $btn = $('#refresh-btn');
      
      // Add spinning animation
      $btn.addClass('refreshing');
      
      try {
        state.isRefreshing = true;
        
        // Refresh BOTH stats and ticket list
        await Promise.all([
          this.loadTotalStats(),
          this.loadData()
        ]);
        
        // If a ticket is open, refresh its details too
        if (state.current_ticket) {
          await this.loadActivity(state.current_ticket, true);
        }
        
        // Show success message only for manual refresh
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
        
        // Restart auto-refresh timer
        this.startAutoRefresh();
      }
    },

    clearAllFilters() {
      state.filters = {
        ticket_no: "",
        channel: "",
        circuit_id: "",
        customer: "",
        site_name: "",
        status: ""
      };

      $('#filter-ticket').val('');
      $('#filter-channel').val('');
      $('#filter-circuit').val('');
      $('#filter-customer').val('');
      $('#filter-site').val('');
      $('#filter-status').val('');
    },

    setupStatusButton() {
      // Already handled in bindEvents
    },

    async loadTotalStats() {
      try {
        const response = await frappe.call({
          method: "nexapp.api.get_ticket_stats"
        });

        if (response && response.message) {
          state.stats = response.message;
          this.updateStatsDisplay();
        }
      } catch (error) {
        console.error('Error loading stats:', error);
        state.stats = {
          total: 0,
          open: 0,
          replied: 0,
          on_hold: 0,
          wrong_circuit: 0,
          resolved: 0,
          closed: 0
        };
        this.updateStatsDisplay();
      }
    },

    updateStatsDisplay() {
      $('#stat-total').text(utils.formatNumber(state.stats.total));
      $('#stat-open').text(utils.formatNumber(state.stats.open));
      $('#stat-replied').text(utils.formatNumber(state.stats.replied));
      $('#stat-on-hold').text(utils.formatNumber(state.stats.on_hold));
      $('#stat-wrong-circuit').text(utils.formatNumber(state.stats.wrong_circuit || 0));
      $('#stat-resolved').text(utils.formatNumber(state.stats.resolved));
      $('#stat-closed').text(utils.formatNumber(state.stats.closed));

      const closedPercentage = state.stats.total > 0 
        ? Math.round((state.stats.closed / state.stats.total) * 100)
        : 0;
      $('#closed-percentage').text(`${closedPercentage}%`);
    },

    showStatusDropdown(e) {
      const $ball = $(e.target).closest('#status-ball');
      const currentStatus = $ball.data('status');

      const dropdown = $(`
        <div class="status-dropdown">
          <div class="status-option" data-status="Open">Open</div>
          <div class="status-option" data-status="Replied">Replied</div>
          <div class="status-option" data-status="On Hold">On Hold</div>
          <div class="status-option" data-status="Wrong Circuit">Wrong Circuit</div>
          <div class="status-option" data-status="Resolved">Resolved</div>
          <div class="status-option" data-status="Closed">Closed</div>
        </div>
      `);

      const ballRect = $ball[0].getBoundingClientRect();
      dropdown.css({
        position: 'fixed',
        top: ballRect.bottom + 5,
        left: ballRect.left,
        zIndex: 1001
      });

      $('<style>')
        .text(`
          .status-dropdown {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 8px;
            min-width: 140px;
          }
          .status-option {
            padding: 10px 12px;
            cursor: pointer;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
          }
          .status-option:hover {
            background-color: #f3f4f6;
          }
        `)
        .appendTo('head');

      dropdown.on('click', '.status-option', (e) => {
        const newStatus = $(e.target).data('status');
        this.updateTicketStatus(state.current_ticket, newStatus);
        dropdown.remove();
      });

      $(document).one('click', (e) => {
        if (!$(e.target).closest('.status-dropdown').length && !$(e.target).closest('#status-ball').length) {
          dropdown.remove();
        }
      });

      $('body').append(dropdown);
    },

    async updateTicketStatus(ticketName, newStatus) {
      try {
        frappe.call({
          method: "nexapp.api.update_ticket_status",
          args: {
            ticket_name: ticketName,
            new_status: newStatus
          },
          callback: (r) => {
            if (r.message && r.message.status === 'success') {
              frappe.show_alert({
                message: `Ticket status updated to ${newStatus}`,
                indicator: 'green'
              });
              this.updateStatusBall(newStatus);
              // Update the status display
              $('#detail-ticket-status').html(utils.createStatusBadge(newStatus));
              $('#status-text').text(newStatus);
              
              // MODIFIED: Update status progress indicator without percentage
              this.updateStatusProgress(newStatus);
              
              this.loadTotalStats();
              this.loadData();
            } else {
              frappe.msgprint('Error updating ticket status');
            }
          }
        });
      } catch (error) {
        frappe.msgprint('Error updating ticket status');
      }
    },

    updateStatusBall(status) {
      const $ball = $('#status-ball');
      $ball.attr('data-status', status);
    },

    getFilters() {
      const filters = {
        ticket_no: state.filters.ticket_no || "",
        channel: state.filters.channel || "",
        circuit_id: state.filters.circuit_id || "",
        customer: state.filters.customer || "",
        site_name: state.filters.site_name || "",
        status: state.filters.status || ""
      };
      return filters;
    },

    async loadData() {
      try {
        $('#table-body').html('<tr><td colspan="6" style="text-align:center;padding:40px;color:#6b7280;">Loading tickets...</td></tr>');

        const filters = this.getFilters();
        const response = await frappe.call({
          method: "nexapp.api.get_tickets",
          args: {
            filters: JSON.stringify(filters),
            page: state.page,
            page_size: state.page_size
          }
        });

        if (response && response.message) {
          state.total = response.message.total || 0;
          const tickets = response.message.tickets || [];
          this.renderTable(tickets);
          this.updateTableInfo();
          this.renderPagination();
        } else {
          $('#table-body').html('<tr><td colspan="6" style="text-align:center;padding:40px;color:#6b7280;">No tickets found</td></tr>');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        $('#table-body').html('<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Error loading data</td></tr>');
      }
    },

    restoreFilterInputs() {
      try {
        $('#filter-ticket').val(state.filters.ticket_no || '');
        $('#filter-channel').val(state.filters.channel || '');
        $('#filter-circuit').val(state.filters.circuit_id || '');
        $('#filter-customer').val(state.filters.customer || '');
        $('#filter-site').val(state.filters.site_name || '');
        $('#filter-status').val(state.filters.status || '');
      } catch (e) {
        console.warn('Error restoring filter inputs:', e);
      }
    },

    renderTable(tickets) {
      const tbody = $('#table-body');
      tbody.empty();

      if (!tickets || tickets.length === 0) {
        tbody.append('<tr><td colspan="6" style="text-align:center;padding:40px;color:#6b7280;">No tickets found</td></tr>');
        return;
      }

      tickets.forEach(ticket => {
        const statusBadge = utils.createStatusBadge(ticket.status || '');
        const row = $(`
          <tr data-ticket="${utils.escapeHtml(ticket.name)}">
            <td><strong>${utils.escapeHtml(ticket.name)}</strong></td>
            <td>${utils.escapeHtml(ticket.custom_channel || '-')}</td>
            <td>${utils.escapeHtml(ticket.custom_circuit_id || '-')}</td>
            <td>${utils.escapeHtml(ticket.customer || '-')}</td>
            <td>${utils.escapeHtml(ticket.custom_site_name || '-')}</td>
            <td>${statusBadge}</td>
          </tr>
        `);

        row.on('click', () => this.openTicket(ticket));
        tbody.append(row);
      });
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
    },

    async openTicket(ticket) {
      $('.tickets-table tr').removeClass('selected');
      $(`[data-ticket="${ticket.name}"]`).addClass('selected');

      $('.right-panel-wrapper').addClass('active');

      state.current_ticket = ticket.name;

      $('#ticket-name-display').text(ticket.name || 'HD Ticket');
      this.updateStatusBall(ticket.status || '');
      $('#status-text').text(ticket.status || '-');
      
      // Update the status display
      $('#detail-ticket-status').html(utils.createStatusBadge(ticket.status || '-'));
      
      // UPDATED: Positions swapped - TICKET CREATED first, then CLOSED
      $('#ticket-created').text(ticket.creation ? utils.formatDate(ticket.creation) : '-');
      $('#agent-response').text(ticket.custom_agent_responded_on ? utils.formatDate(ticket.custom_agent_responded_on) : '-');
      $('#resolution-by').text(ticket.resolution_by ? utils.formatDate(ticket.resolution_by) : '-');
      $('#closed-date').text(ticket.custom_close_datetime ? utils.formatDate(ticket.custom_close_datetime) : '-');

      $('#detail-circuit').text(ticket.custom_circuit_id || '-');
      $('#detail-subject').text(ticket.subject || '-');

      const descriptionEl = $('#detail-description');
      const descriptionContent = utils.renderQuillContent(ticket.description);
      descriptionEl.html(descriptionContent || '-');

      $('#detail-site-type').text(ticket.custom_site_type || '-');
      $('#detail-site-name').text(ticket.custom_site_name || '-');

      const priorityEl = $('#detail-priority');
      priorityEl.text(ticket.priority || '-');
      priorityEl.removeClass('priority-high priority-medium priority-low');
      if ((ticket.priority || '').toLowerCase().includes('high')) {
        priorityEl.addClass('priority-high');
      }

      $('#detail-site-id').text(ticket.custom_site_id__legal_code || '-');
      
      // UPDATED: Use custom_rca field for RESOLUTION (TICKET CREATED removed from info grid)
      $('#detail-resolution').text(ticket.custom_rca || '-');

      // MODIFIED: Update Status Progress Indicator without percentage
      this.updateStatusProgress(ticket.status);

      await this.loadSiteInformation(ticket.custom_circuit_id);
      this.switchTab('details');
    },

    // MODIFIED: Update status progress indicator - removed percentage update, kept stage highlighting
    updateStatusProgress(currentStatus) {
      const progressData = utils.getStatusProgress(currentStatus);
      
      // REMOVED: Percentage update
      // REMOVED: Progress bar update
      
      // Update stage indicators and lines
      $('.status-stage').removeClass('active');
      $('.status-stage').removeClass('active-line');
      
      progressData.stages.forEach((stage, index) => {
        const stageElement = $(`.status-stage[data-stage="${stage.name.toLowerCase().replace(/\s+/g, '-')}"]`);
        if (stageElement.length) {
          // Activate current and all previous stages
          if (stage.name === currentStatus || index < progressData.stages.findIndex(s => s.name === currentStatus)) {
            stageElement.addClass('active');
          }
          
          // Highlight lines up to current stage
          if (index < progressData.stages.findIndex(s => s.name === currentStatus)) {
            stageElement.addClass('active-line');
          }
        }
      });
    },

    async loadSiteInformation(circuitId) {
      if (!circuitId) {
        this.clearSiteInformation();
        return;
      }

      if (state.cached_site_data[circuitId]) {
        this.populateSiteInformation(state.cached_site_data[circuitId]);
        return;
      }

      try {
        const response = await frappe.call({
          method: "nexapp.api.get_site_by_circuit_id",
          args: { circuit_id: circuitId }
        });

        if (response && response.message) {
          const siteData = response.message;
          state.cached_site_data[circuitId] = siteData;
          this.populateSiteInformation(siteData);
        } else {
          this.clearSiteInformation();
        }
      } catch (error) {
        console.error('Error loading site information:', error);
        this.clearSiteInformation();
      }
    },

    populateSiteInformation(siteData) {
      $('#detail-address-street').text(siteData.address_street || '-');
      $('#detail-district').text(siteData.district || '-');
      $('#detail-city').text(siteData.city || '-');
      $('#detail-pincode').text(siteData.pincode || '-');
      $('#detail-state').text(siteData.state || '-');
      $('#detail-territory').text(siteData.territory || '-');
      $('#detail-contact-person').text(siteData.contact_person || '-');
      $('#detail-primary-contact-mobile').text(siteData.primary_contact_mobile || '-');
    },

    clearSiteInformation() {
      $('#detail-address-street').text('-');
      $('#detail-district').text('-');
      $('#detail-city').text('-');
      $('#detail-pincode').text('-');
      $('#detail-state').text('-');
      $('#detail-territory').text('-');
      $('#detail-contact-person').text('-');
      $('#detail-primary-contact-mobile').text('-');
    },

    closePanel() {
      $('.right-panel-wrapper').removeClass('active');
      $('.tickets-table tr').removeClass('selected');
      state.current_ticket = null;
    },

    switchTab(tabName) {
      $('.tab-btn').removeClass('active');
      $(`.tab-btn[data-tab="${tabName}"]`).addClass('active');
      
      $('.tab-content').removeClass('active');
      $(`#tab-${tabName}`).addClass('active');
    },

    // UPDATED: Removed all activity-related functions since Email Activity tab is removed
    // The following functions are kept but not used since there's no activity tab anymore
    async loadActivity(ticketName, force = false) {
      // This function is kept for compatibility but not used
      // since Email Activity tab has been removed
    },

    // Removed other activity-related functions since they're not needed anymore
    // tryAlternativeActivityAPI, renderActivity, filterActivity, createEmailItem, viewFullEmail
  };

  // Initialize the application
  UI.init();
  
  // Clean up on page unload
  $(window).on('unload', () => {
    UI.stopAutoRefresh();
  });
};