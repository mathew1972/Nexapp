window.HelpdeskPages = window.HelpdeskPages || {};

HelpdeskPages.tickets = {

  pageSize: 20,
  totalTickets: 0,
  refreshTimer: null,

  currentView: "All Tickets",
  currentViewType: "status",
  searchText: "",
  selectedCustomer: "",
  
  // Additional filter properties
  selectedCircuitId: "",
  selectedTicketId: "",
  selectedAgent: "",
  selectedStatus: [],
  selectedStage: [],
  selectedPriority: [],
  selectedChannel: [],
  selectedImpact: "",           // single value (Link field)
  selectedSeverity: [],
  selectedRangeFrom: "",        // actual from date
  selectedRangeTo: "",          // actual to date
  selectedRangeOption: "",      // preset option: "Today", "Yesterday", etc. or "Custom"
  
  // Parent filter tracking
  parentFilter: null,
  parentFilterValue: null,
  parentFilterDisplay: null,

  start: 0,
  loadingMore: false,
  isFilterVisible: true,

  // Selected tickets for bulk actions
  selectedTickets: [],
  allSelected: false,           // flag indicating "all tickets" are selected

  render(content) {
    // Load saved filter state from localStorage
    this.loadFilterState();
    
    content.innerHTML = `
      <div class="tickets-page">
        <div class="tickets-container">
          <!-- LEFT SIDE FILTER PANEL -->
          <div id="filter-sidebar" class="filter-sidebar ${this.isFilterVisible ? '' : 'collapsed'}">
            <div class="filter-sidebar-header">
              <div class="filter-sidebar-title">
                <span>Filter</span>
                <button class="filter-close-btn" onclick="HelpdeskPages.tickets.toggleFilterSidebar()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="filter-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" id="global-filter-search" placeholder="Search filters..."
                  onkeyup="HelpdeskPages.tickets.filterSidebarItems(this.value)">
              </div>
            </div>
            
            <div class="filter-sidebar-content" id="filter-sidebar-content">
              <!-- Customer Filter -->
              <div class="filter-group" data-filter-name="customer">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Customer</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <div class="filter-search-group">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" placeholder="Search Customer..." id="customer-search"
                      onfocus="HelpdeskPages.tickets.onCustomerSearchFocus()"
                      onkeyup="HelpdeskPages.tickets.searchCustomer(this.value)"
                      onblur="setTimeout(() => HelpdeskPages.tickets.hideCustomerList(), 200)">
                  </div>
                  <div id="customer-list" class="filter-options-list" style="display: none;">
                    ${this.renderInitialCustomers()}
                  </div>
                  ${this.selectedCustomer ? `
                    <div class="selected-filter-badge">
                      <span>${this.selectedCustomer}</span>
                      <button onclick="HelpdeskPages.tickets.clearCustomerFilter()">×</button>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Status Filter -->
              <div class="filter-group" data-filter-name="status">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Status</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <div class="filter-options-list">
                    ${this.renderStatusOptions()}
                  </div>
                </div>
              </div>

              <!-- Stage Filter -->
              <div class="filter-group" data-filter-name="stage">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Stage</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <div class="filter-options-list">
                    ${this.renderStageOptions()}
                  </div>
                </div>
              </div>

              <!-- Circuit ID Filter -->
              <div class="filter-group" data-filter-name="circuit">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Circuit ID</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <div class="filter-search-group">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" placeholder="Search Circuit ID..." id="circuit-search"
                      onfocus="HelpdeskPages.tickets.onCircuitSearchFocus()"
                      onkeyup="HelpdeskPages.tickets.searchCircuitId(this.value)"
                      onblur="setTimeout(() => HelpdeskPages.tickets.hideCircuitList(), 200)">
                  </div>
                  <div id="circuit-list" class="filter-options-list" style="display: none;">
                    ${this.renderInitialCircuits()}
                  </div>
                  ${this.selectedCircuitId ? `
                    <div class="selected-filter-badge">
                      <span>${this.selectedCircuitId}</span>
                      <button onclick="HelpdeskPages.tickets.clearCircuitFilter()">×</button>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Priority Filter -->
              <div class="filter-group" data-filter-name="priority">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Priority</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <div class="filter-options-list">
                    ${this.renderPriorityOptions()}
                  </div>
                </div>
              </div>

              <!-- Channel Filter -->
              <div class="filter-group" data-filter-name="channel">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Channel</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <div class="filter-options-list">
                    ${this.renderChannelOptions()}
                  </div>
                </div>
              </div>

              <!-- Impact Filter -->
              <div class="filter-group" data-filter-name="impact">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Impact</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <div class="filter-search-group">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" placeholder="Search Impact..." id="impact-search"
                      onfocus="HelpdeskPages.tickets.onImpactSearchFocus()"
                      onkeyup="HelpdeskPages.tickets.searchImpact(this.value)"
                      onblur="setTimeout(() => HelpdeskPages.tickets.hideImpactList(), 200)">
                  </div>
                  <div id="impact-list" class="filter-options-list" style="display: none;">
                    ${this.renderInitialImpacts()}
                  </div>
                  ${this.selectedImpact ? `
                    <div class="selected-filter-badge">
                      <span>${this.selectedImpact}</span>
                      <button onclick="HelpdeskPages.tickets.clearImpactFilter()">×</button>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Severity Filter -->
              <div class="filter-group" data-filter-name="severity">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Severity</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <div class="filter-options-list">
                    ${this.renderSeverityOptions()}
                  </div>
                </div>
              </div>

              <!-- Range Time Filter with Presets -->
              <div class="filter-group" data-filter-name="range">
                <div class="filter-group-header" onclick="HelpdeskPages.tickets.toggleFilterGroup(this)">
                  <span>Range Time</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div class="filter-group-content">
                  <!-- Preset options -->
                  <div class="filter-options-list" id="range-presets">
                    ${this.renderRangeOptions()}
                  </div>
                  <!-- Custom date inputs (hidden unless Custom is selected) -->
                  <div id="custom-range-inputs" class="date-range-filter" style="${this.selectedRangeOption === 'Custom' ? 'display:block;' : 'display:none;'}">
                    <div class="date-input-group">
                      <label>From</label>
                      <input type="date" id="range-from" class="date-input"
                        value="${this.selectedRangeFrom || ''}"
                        onchange="HelpdeskPages.tickets.setCustomRange()">
                    </div>
                    <div class="date-input-group">
                      <label>To</label>
                      <input type="date" id="range-to" class="date-input"
                        value="${this.selectedRangeTo || ''}"
                        onchange="HelpdeskPages.tickets.setCustomRange()">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="filter-sidebar-footer">
              <button class="clear-filters-btn" onclick="HelpdeskPages.tickets.clearAllFilters()">
                Clear All
              </button>
            </div>
          </div>

          <!-- MAIN CONTENT AREA -->
          <div class="tickets-main" id="tickets-main">
            <div class="ticket-toolbar">
              <div class="toolbar-left">
                <!-- NORMAL LEFT CONTROLS (visible when no ticket selected) -->
                <div class="toolbar-left-normal">
                  <button class="filter-toggle-btn" onclick="HelpdeskPages.tickets.toggleFilterSidebar()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2">
                      <path d="M3 4h18l-7 8v6l-4 2v-8z"/>
                    </svg>
                    <span>Filters</span>
                    <span id="active-filter-count" class="active-filter-count hidden">0</span>
                  </button>

                  <div class="view-dropdown" onclick="HelpdeskPages.tickets.toggleViewMenu(event)">
                    <span id="current-view">All Tickets</span>
                    <span class="view-count" id="ticket-count">(0)</span> ▾
                  </div>

                  <div class="toolbar-icon" title="Refresh"
                       onclick="HelpdeskPages.tickets.fetchTickets()">
                    ${this.refreshIcon()}
                  </div>

                  <div id="active-filters-container" class="active-filters-container"></div>
                </div>

                <!-- ACTION BAR (visible when tickets are selected) -->
                <div class="action-bar hidden">
                  <label class="master-checkbox">
                    <input type="checkbox" id="master-checkbox" onchange="HelpdeskPages.tickets.toggleSelectAll(this.checked)">
                  </label>
                  <span class="selected-count" id="selected-tickets-count">0</span>
                  <button class="action-btn" onclick="alert('Assign To action')">Assign To</button>
                  <button class="action-btn" onclick="alert('Update action')">Update</button>
                  <button class="action-btn" onclick="alert('Comment action')">Comment</button>
                  <button class="action-btn" onclick="alert('Close action')">Close</button>
                  <button class="action-btn" onclick="alert('Merge action')">Merge</button>
                  <button class="action-btn" onclick="alert('More action')">More</button>
                </div>
              </div>

              <button class="btn-create-ticket" onclick="HelpdeskPages.tickets.createTicket()">
                + Create Ticket
              </button>
            </div>

            <div id="view-menu" class="view-menu hidden" onclick="event.stopPropagation()">
              <div class="view-search">
                <input type="text" placeholder="Search filter..."
                  onkeyup="HelpdeskPages.tickets.filterViewList(this.value)">
              </div>
              <div class="filter-group-container">
                ${this.buildGroup("Status Wise","status",[
                  "All Tickets","Open Tickets","Replied Tickets","On Hold Tickets",
                  "Wrong Tickets","Resolved Tickets","Closed Tickets"
                ])}
                ${this.buildGroup("Priority Wise","status",[
                  "Urgent","High","Medium","Low"
                ])}
                ${this.buildGroup("Severity Wise","status",[
                  "Critical","Major","Minor"
                ])}
                ${this.buildGroup("Channel Wise Tickets","channel",[
                  "Email","Portal","Chat","Phone","Web Form","SSP","NMS","NMS-API"
                ])}
                ${this.buildGroup("Stage Wise Tickets","stage",[
                  "Inprocess","Finance Issue","Customer Issue","Hardware Dispatch",
                  "MBB Issue","LMS-Re-Feasibility","Maintenance Visit","Wrong Circuit",
                  "Other","Configuration Change","Project"
                ])}
              </div>
            </div>

            <div id="filter-panel" class="filter-panel hidden">
              <input type="text" id="subject-search" placeholder="Search subject..."
                onkeyup="HelpdeskPages.tickets.search(this.value)">
            </div>

            <div id="ticket-list" class="ticket-list"></div>
          </div>
        </div>
      </div>
    `;

    // Apply initial filter state
    setTimeout(() => {
      if (!this.isFilterVisible) {
        document.getElementById("tickets-main")?.classList.add("expanded");
      }
      // Force a reflow
      void document.getElementById("tickets-main")?.offsetHeight;
    }, 50);

    this.fetchTickets();
    this.startAutoRefresh();
    this.loadInitialData();
    this.setupScrollListener();
  },

  /* ---------------- FILTER STATE MANAGEMENT ---------------- */

  loadFilterState() {
    const savedState = localStorage.getItem('hd_filter_visible');
    if (savedState !== null) {
      this.isFilterVisible = savedState === 'true';
    }
  },

  saveFilterState() {
    localStorage.setItem('hd_filter_visible', this.isFilterVisible);
  },

  /* ---------------- FILTER SIDEBAR FUNCTIONS ---------------- */

  toggleFilterSidebar() {
    this.isFilterVisible = !this.isFilterVisible;
    const sidebar = document.getElementById("filter-sidebar");
    const main = document.getElementById("tickets-main");
    
    if (sidebar && main) {
      if (this.isFilterVisible) {
        sidebar.classList.remove("collapsed");
        main.classList.remove("expanded");
      } else {
        sidebar.classList.add("collapsed");
        main.classList.add("expanded");
      }
      
      // Save state to localStorage
      this.saveFilterState();
      
      // Force reflow
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        void main.offsetHeight;
        const ticketList = document.getElementById("ticket-list");
        if (ticketList) {
          ticketList.dispatchEvent(new Event('scroll'));
        }
      }, 50);
    }
  },

  toggleFilterGroup(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector("svg");
    
    if (content.classList.contains("expanded")) {
      content.classList.remove("expanded");
      icon.style.transform = "rotate(-90deg)";
    } else {
      content.classList.add("expanded");
      icon.style.transform = "rotate(0deg)";
    }
  },

  filterSidebarItems(searchText) {
    const groups = document.querySelectorAll(".filter-group");
    const searchLower = searchText.toLowerCase();
    
    groups.forEach(group => {
      const filterName = group.getAttribute("data-filter-name") || "";
      if (filterName.includes(searchLower) || searchText === "") {
        group.style.display = "block";
      } else {
        group.style.display = "none";
      }
    });
  },

  /* ---------------- INITIAL DATA LOADING ---------------- */

  loadInitialData() {
    // Customers are loaded on focus
    // Circuits are loaded on focus
    // Impacts are loaded on focus
  },

  /* ---------------- CUSTOMER FILTER ---------------- */

  renderInitialCustomers() {
    return '<div class="filter-loading">Loading customers...</div>';
  },

  onCustomerSearchFocus() {
    const list = document.getElementById("customer-list");
    if (!list.hasChildNodes() || list.children.length === 0 || list.children[0].classList.contains('filter-loading')) {
      this.loadInitialCustomers();
    } else {
      list.style.display = 'block';
    }
  },

  loadInitialCustomers() {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Customer",
        fields: ["name"],
        limit_page_length: 5,
        order_by: "name asc"
      },
      callback: (r) => {
        this.renderCustomerList(r.message || []);
      }
    });
  },

  renderCustomerList(customers) {
    const list = document.getElementById("customer-list");
    if (!list) return;
    
    let html = "";
    customers.forEach(c => {
      html += `<div class="filter-option" onclick="HelpdeskPages.tickets.applyCustomerFilter('${c.name}')">
                <span>${c.name}</span>
              </div>`;
    });
    list.innerHTML = html;
    list.style.display = 'block';
  },

  hideCustomerList() {
    document.getElementById("customer-list").style.display = 'none';
  },

  searchCustomer(text) {
    if (!text) {
      this.loadInitialCustomers();
      return;
    }

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Customer",
        fields: ["name"],
        filters: { name: ["like", "%" + text + "%"] },
        limit_page_length: 10
      },
      callback: (r) => {
        this.renderCustomerList(r.message || []);
      }
    });
  },

  applyCustomerFilter(customer) {
    this.selectedCustomer = customer;
    this.start = 0;
    this.updateActiveFilters();
    this.hideCustomerList();
    this.fetchTickets();
  },

  clearCustomerFilter() {
    this.selectedCustomer = "";
    document.getElementById("customer-search").value = "";
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  /* ---------------- CIRCUIT ID FILTER ---------------- */

  renderInitialCircuits() {
    return '<div class="filter-loading">Loading circuits...</div>';
  },

  onCircuitSearchFocus() {
    const list = document.getElementById("circuit-list");
    if (!list.hasChildNodes() || list.children.length === 0 || list.children[0].classList.contains('filter-loading')) {
      this.loadInitialCircuits();
    } else {
      list.style.display = 'block';
    }
  },

  loadInitialCircuits() {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "HD Ticket",
        fields: ["custom_circuit_id"],
        filters: { "custom_circuit_id": ["!=", ""] },
        limit_page_length: 5,
        order_by: "custom_circuit_id asc"
      },
      callback: (r) => {
        this.renderCircuitList(r.message || []);
      }
    });
  },

  renderCircuitList(circuits) {
    const list = document.getElementById("circuit-list");
    if (!list) return;
    
    let html = "";
    const seen = new Set();
    circuits.forEach(t => {
      if (t.custom_circuit_id && !seen.has(t.custom_circuit_id)) {
        seen.add(t.custom_circuit_id);
        html += `<div class="filter-option" onclick="HelpdeskPages.tickets.applyCircuitFilter('${t.custom_circuit_id}')">
                  <span>${t.custom_circuit_id}</span>
                </div>`;
      }
    });
    list.innerHTML = html;
    list.style.display = 'block';
  },

  hideCircuitList() {
    document.getElementById("circuit-list").style.display = 'none';
  },

  searchCircuitId(text) {
    const filters = {
      "custom_circuit_id": ["!=", ""]
    };
    if (text) {
      filters["custom_circuit_id"] = ["like", "%" + text + "%"];
    }

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "HD Ticket",
        fields: ["custom_circuit_id"],
        filters: filters,
        limit_page_length: 10,
        order_by: "custom_circuit_id asc"
      },
      callback: (r) => {
        this.renderCircuitList(r.message || []);
      }
    });
  },

  applyCircuitFilter(circuit) {
    this.selectedCircuitId = circuit;
    this.start = 0;
    this.updateActiveFilters();
    this.hideCircuitList();
    this.fetchTickets();
  },

  clearCircuitFilter() {
    this.selectedCircuitId = "";
    document.getElementById("circuit-search").value = "";
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  /* ---------------- IMPACT FILTER (LINK FIELD) ---------------- */

  renderInitialImpacts() {
    return '<div class="filter-loading">Loading impacts...</div>';
  },

  onImpactSearchFocus() {
    const list = document.getElementById("impact-list");
    if (!list.hasChildNodes() || list.children.length === 0 || list.children[0].classList.contains('filter-loading')) {
      this.loadInitialImpacts();
    } else {
      list.style.display = 'block';
    }
  },

  loadInitialImpacts() {
    // Adjust method name as per your backend
    frappe.call({
      method: "nexapp.api.get_filter_options",
      args: { filter_type: "impact" },
      callback: (r) => {
        const impacts = r.message || [];
        // If no impacts, try alternative method
        if (impacts.length === 0) {
          // Fallback: fetch from HD Ticket distinct custom_impact
          frappe.call({
            method: "frappe.client.get_list",
            args: {
              doctype: "HD Ticket",
              fields: ["custom_impact"],
              filters: { "custom_impact": ["!=", ""] },
              limit_page_length: 5,
              order_by: "custom_impact asc"
            },
            callback: (r2) => {
              const impactList = [...new Set(r2.message.map(d => d.custom_impact).filter(Boolean))];
              this.renderImpactList(impactList);
            }
          });
        } else {
          this.renderImpactList(impacts);
        }
      }
    });
  },

  renderImpactList(impacts) {
    const list = document.getElementById("impact-list");
    if (!list) return;
    
    let html = "";
    impacts.forEach(impact => {
      html += `<div class="filter-option" onclick="HelpdeskPages.tickets.applyImpactFilter('${impact}')">
                <span>${impact}</span>
              </div>`;
    });
    list.innerHTML = html;
    list.style.display = 'block';
  },

  hideImpactList() {
    document.getElementById("impact-list").style.display = 'none';
  },

  searchImpact(text) {
    if (!text) {
      this.loadInitialImpacts();
      return;
    }

    // Search impacts via backend
    frappe.call({
      method: "nexapp.api.get_filter_options",
      args: { filter_type: "impact", search: text },
      callback: (r) => {
        let impacts = r.message || [];
        if (impacts.length === 0) {
          // Fallback search in HD Ticket
          frappe.call({
            method: "frappe.client.get_list",
            args: {
              doctype: "HD Ticket",
              fields: ["custom_impact"],
              filters: { "custom_impact": ["like", "%" + text + "%"] },
              limit_page_length: 10,
              order_by: "custom_impact asc"
            },
            callback: (r2) => {
              const impactList = [...new Set(r2.message.map(d => d.custom_impact).filter(Boolean))];
              this.renderImpactList(impactList);
            }
          });
        } else {
          this.renderImpactList(impacts);
        }
      }
    });
  },

  applyImpactFilter(impact) {
    this.selectedImpact = impact;
    this.start = 0;
    this.updateActiveFilters();
    this.hideImpactList();
    this.fetchTickets();
  },

  clearImpactFilter() {
    this.selectedImpact = "";
    document.getElementById("impact-search").value = "";
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  /* ---------------- STATUS/STAGE/PRIORITY/CHANNEL/SEVERITY RENDERING ---------------- */

  renderStatusOptions() {
    const statuses = ["Open", "Replied", "On Hold", "Wrong Circuit", "Resolved", "Closed"];
    return statuses.map(status => `
      <label class="filter-checkbox">
        <input type="checkbox" value="${status}" 
               ${this.selectedStatus.includes(status) ? 'checked' : ''}
               onchange="HelpdeskPages.tickets.toggleStatus('${status}', this.checked)">
        <span>${status}</span>
      </label>
    `).join("");
  },

  renderStageOptions() {
    const stages = [
      "Inprocess", "Finance Issue", "Customer Issue", "Hardware Dispatch",
      "MBB Issue", "LMS-Re-Feasibility", "Maintenance Visit", "Wrong Circuit",
      "Other", "Configuration Change", "Project"
    ];
    return stages.map(stage => `
      <label class="filter-checkbox">
        <input type="checkbox" value="${stage}"
               ${this.selectedStage.includes(stage) ? 'checked' : ''}
               onchange="HelpdeskPages.tickets.toggleStage('${stage}', this.checked)">
        <span>${stage}</span>
      </label>
    `).join("");
  },

  renderPriorityOptions() {
    const priorities = ["Urgent", "High", "Medium", "Low"];
    return priorities.map(priority => `
      <label class="filter-checkbox">
        <input type="checkbox" value="${priority}"
               ${this.selectedPriority.includes(priority) ? 'checked' : ''}
               onchange="HelpdeskPages.tickets.togglePriority('${priority}', this.checked)">
        <span>${priority}</span>
      </label>
    `).join("");
  },

  renderChannelOptions() {
    const channels = ["Email", "Portal", "Chat", "Phone", "Web Form", "SSP", "NMS", "NMS-API"];
    return channels.map(channel => `
      <label class="filter-checkbox">
        <input type="checkbox" value="${channel}"
               ${this.selectedChannel.includes(channel) ? 'checked' : ''}
               onchange="HelpdeskPages.tickets.toggleChannel('${channel}', this.checked)">
        <span>${channel}</span>
      </label>
    `).join("");
  },

  renderSeverityOptions() {
    const severities = ["Critical", "Major", "Minor"];
    return severities.map(severity => `
      <label class="filter-checkbox">
        <input type="checkbox" value="${severity}"
               ${this.selectedSeverity.includes(severity) ? 'checked' : ''}
               onchange="HelpdeskPages.tickets.toggleSeverity('${severity}', this.checked)">
        <span>${severity}</span>
      </label>
    `).join("");
  },

  /* ---------------- FILTER TOGGLE FUNCTIONS (MULTI-SELECT) ---------------- */

  toggleStatus(status, isChecked) {
    if (isChecked) {
      if (!this.selectedStatus.includes(status)) {
        this.selectedStatus.push(status);
      }
    } else {
      this.selectedStatus = this.selectedStatus.filter(s => s !== status);
    }
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  toggleStage(stage, isChecked) {
    if (isChecked) {
      if (!this.selectedStage.includes(stage)) {
        this.selectedStage.push(stage);
      }
    } else {
      this.selectedStage = this.selectedStage.filter(s => s !== stage);
    }
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  togglePriority(priority, isChecked) {
    if (isChecked) {
      if (!this.selectedPriority.includes(priority)) {
        this.selectedPriority.push(priority);
      }
    } else {
      this.selectedPriority = this.selectedPriority.filter(p => p !== priority);
    }
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  toggleChannel(channel, isChecked) {
    if (isChecked) {
      if (!this.selectedChannel.includes(channel)) {
        this.selectedChannel.push(channel);
      }
    } else {
      this.selectedChannel = this.selectedChannel.filter(c => c !== channel);
    }
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  toggleSeverity(severity, isChecked) {
    if (isChecked) {
      if (!this.selectedSeverity.includes(severity)) {
        this.selectedSeverity.push(severity);
      }
    } else {
      this.selectedSeverity = this.selectedSeverity.filter(s => s !== severity);
    }
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  /* ---------------- RANGE TIME PRESETS ---------------- */

  renderRangeOptions() {
    const options = [
      "Today",
      "Yesterday",
      "Current Week",
      "Current Month",
      "Last 3 days",
      "Last 7 days",
      "Last 15 days",
      "Last 30 days",
      "Last 3 months",
      "Custom"
    ];
    return options.map(option => `
      <div class="filter-option ${this.selectedRangeOption === option ? 'selected' : ''}" 
           onclick="HelpdeskPages.tickets.selectRangeOption('${option}')">
        ${option}
      </div>
    `).join("");
  },

  selectRangeOption(option) {
    this.selectedRangeOption = option;
    const now = new Date();
    let fromDate = null;
    let toDate = null;

    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    if (option === "Today") {
      fromDate = new Date(now);
      toDate = new Date(now);
    } else if (option === "Yesterday") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 1);
      toDate = new Date(fromDate);
    } else if (option === "Current Week") {
      const day = now.getDay();
      const diff = (day === 0 ? 6 : day - 1);
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - diff);
      toDate = new Date(now);
    } else if (option === "Current Month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (option === "Last 3 days") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 3);
      toDate = new Date(now);
    } else if (option === "Last 7 days") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 7);
      toDate = new Date(now);
    } else if (option === "Last 15 days") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 15);
      toDate = new Date(now);
    } else if (option === "Last 30 days") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 30);
      toDate = new Date(now);
    } else if (option === "Last 3 months") {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 3);
      toDate = new Date(now);
    } else if (option === "Custom") {
      document.getElementById("custom-range-inputs").style.display = 'block';
      this.updateActiveFilters();
      this.start = 0;
      this.fetchTickets();
      return;
    }

    if (fromDate && toDate) {
      this.selectedRangeFrom = formatDate(fromDate);
      this.selectedRangeTo = formatDate(toDate);
      document.getElementById("custom-range-inputs").style.display = 'none';
    }

    const presets = document.querySelectorAll('#range-presets .filter-option');
    presets.forEach(el => {
      if (el.textContent === option) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });

    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  setCustomRange() {
    this.selectedRangeFrom = document.getElementById("range-from").value;
    this.selectedRangeTo = document.getElementById("range-to").value;
    this.selectedRangeOption = "Custom";
    const presets = document.querySelectorAll('#range-presets .filter-option');
    presets.forEach(el => {
      if (el.textContent === "Custom") {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  /* ---------------- ACTIVE FILTERS DISPLAY ---------------- */

  updateActiveFilters() {
    const container = document.getElementById("active-filters-container");
    const countBadge = document.getElementById("active-filter-count");
    
    let totalFilters = 0;
    let html = "";

    if (this.selectedCustomer) {
      totalFilters++;
      html += `<div class="active-filter-badge">
                <span>Customer: ${this.selectedCustomer}</span>
                <button onclick="HelpdeskPages.tickets.clearCustomerFilter()">×</button>
              </div>`;
    }

    if (this.selectedCircuitId) {
      totalFilters++;
      html += `<div class="active-filter-badge">
                <span>Circuit: ${this.selectedCircuitId}</span>
                <button onclick="HelpdeskPages.tickets.clearCircuitFilter()">×</button>
              </div>`;
    }

    this.selectedStatus.forEach(status => {
      totalFilters++;
      html += `<div class="active-filter-badge">
                <span>Status: ${status}</span>
                <button onclick="HelpdeskPages.tickets.clearSingleStatusFilter('${status}')">×</button>
              </div>`;
    });

    this.selectedStage.forEach(stage => {
      totalFilters++;
      html += `<div class="active-filter-badge">
                <span>Stage: ${stage}</span>
                <button onclick="HelpdeskPages.tickets.clearSingleStageFilter('${stage}')">×</button>
              </div>`;
    });

    this.selectedPriority.forEach(priority => {
      totalFilters++;
      html += `<div class="active-filter-badge">
                <span>Priority: ${priority}</span>
                <button onclick="HelpdeskPages.tickets.clearSinglePriorityFilter('${priority}')">×</button>
              </div>`;
    });

    this.selectedChannel.forEach(channel => {
      totalFilters++;
      html += `<div class="active-filter-badge">
                <span>Channel: ${channel}</span>
                <button onclick="HelpdeskPages.tickets.clearSingleChannelFilter('${channel}')">×</button>
              </div>`;
    });

    if (this.selectedImpact) {
      totalFilters++;
      html += `<div class="active-filter-badge">
                <span>Impact: ${this.selectedImpact}</span>
                <button onclick="HelpdeskPages.tickets.clearImpactFilter()">×</button>
              </div>`;
    }

    this.selectedSeverity.forEach(severity => {
      totalFilters++;
      html += `<div class="active-filter-badge">
                <span>Severity: ${severity}</span>
                <button onclick="HelpdeskPages.tickets.clearSingleSeverityFilter('${severity}')">×</button>
              </div>`;
    });

    if (this.selectedRangeFrom || this.selectedRangeTo || this.selectedRangeOption) {
      totalFilters++;
      let rangeText = "";
      if (this.selectedRangeOption && this.selectedRangeOption !== "Custom") {
        rangeText = `Range: ${this.selectedRangeOption}`;
      } else if (this.selectedRangeFrom || this.selectedRangeTo) {
        rangeText = `Range: ${this.selectedRangeFrom || '...'} - ${this.selectedRangeTo || '...'}`;
      } else {
        rangeText = "Range: Custom";
      }
      html += `<div class="active-filter-badge">
                <span>${rangeText}</span>
                <button onclick="HelpdeskPages.tickets.clearRangeDateFilter()">×</button>
              </div>`;
    }

    if (container) {
      container.innerHTML = html;
    }
    
    if (countBadge) {
      if (totalFilters > 0) {
        countBadge.textContent = totalFilters;
        countBadge.classList.remove("hidden");
      } else {
        countBadge.classList.add("hidden");
      }
    }
  },

  /* ---------------- CLEAR SINGLE FILTER FUNCTIONS ---------------- */

  clearSingleStatusFilter(status) {
    this.selectedStatus = this.selectedStatus.filter(s => s !== status);
    const checkboxes = document.querySelectorAll('.filter-group[data-filter-name="status"] input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.value === status) cb.checked = false;
    });
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  clearSingleStageFilter(stage) {
    this.selectedStage = this.selectedStage.filter(s => s !== stage);
    const checkboxes = document.querySelectorAll('.filter-group[data-filter-name="stage"] input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.value === stage) cb.checked = false;
    });
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  clearSinglePriorityFilter(priority) {
    this.selectedPriority = this.selectedPriority.filter(p => p !== priority);
    const checkboxes = document.querySelectorAll('.filter-group[data-filter-name="priority"] input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.value === priority) cb.checked = false;
    });
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  clearSingleChannelFilter(channel) {
    this.selectedChannel = this.selectedChannel.filter(c => c !== channel);
    const checkboxes = document.querySelectorAll('.filter-group[data-filter-name="channel"] input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.value === channel) cb.checked = false;
    });
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  clearSingleSeverityFilter(severity) {
    this.selectedSeverity = this.selectedSeverity.filter(s => s !== severity);
    const checkboxes = document.querySelectorAll('.filter-group[data-filter-name="severity"] input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.value === severity) cb.checked = false;
    });
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  clearRangeDateFilter() {
    this.selectedRangeFrom = "";
    this.selectedRangeTo = "";
    this.selectedRangeOption = "";
    document.getElementById("range-from").value = "";
    document.getElementById("range-to").value = "";
    document.getElementById("custom-range-inputs").style.display = 'none';
    const presets = document.querySelectorAll('#range-presets .filter-option');
    presets.forEach(el => el.classList.remove('selected'));
    this.updateActiveFilters();
    this.start = 0;
    this.fetchTickets();
  },

  clearAllFilters() {
    this.selectedCustomer = "";
    this.selectedCircuitId = "";
    this.selectedStatus = [];
    this.selectedStage = [];
    this.selectedPriority = [];
    this.selectedChannel = [];
    this.selectedImpact = "";
    this.selectedSeverity = [];
    this.selectedRangeFrom = "";
    this.selectedRangeTo = "";
    this.selectedRangeOption = "";
    
    document.getElementById("customer-search").value = "";
    document.getElementById("circuit-search").value = "";
    document.getElementById("impact-search").value = "";
    document.getElementById("range-from").value = "";
    document.getElementById("range-to").value = "";
    document.getElementById("custom-range-inputs").style.display = 'none';
    
    document.querySelectorAll('.filter-checkbox input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    const presets = document.querySelectorAll('#range-presets .filter-option');
    presets.forEach(el => el.classList.remove('selected'));
    
    this.clearParentFilter(false);
    
    this.searchText = "";
    document.getElementById("subject-search").value = "";
    
    this.updateActiveFilters();
    
    this.start = 0;
    this.fetchTickets();
  },

  /* ---------------- FETCH TICKETS ---------------- */

  fetchTickets(silent = false, append = false) {
    const container = document.getElementById("ticket-list");
    if (!silent && !append) {
      container.innerHTML = '<div class="loading-spinner">Loading...</div>';
      this.start = 0;
      this.clearSelection(); // clear selection on new list
    }

    let filterArgs = {
      page_length: this.pageSize,
      start: this.start,
      search: this.searchText,
      view: this.currentView,
      view_type: this.currentViewType,
      customer: this.selectedCustomer,
      circuit_id: this.selectedCircuitId,
      status: this.selectedStatus.length ? this.selectedStatus.join(',') : undefined,
      stage: this.selectedStage.length ? this.selectedStage.join(',') : undefined,
      priority: this.selectedPriority.length ? this.selectedPriority.join(',') : undefined,
      channel: this.selectedChannel.length ? this.selectedChannel.join(',') : undefined,
      impact: this.selectedImpact || undefined,
      severity: this.selectedSeverity.length ? this.selectedSeverity.join(',') : undefined,
      created_from: this.selectedRangeFrom,
      created_to: this.selectedRangeTo,
    };

    frappe.call({
      method: "nexapp.api.get_hd_tickets",
      args: filterArgs,
      callback: (r) => {
        const data = r.message.tickets || [];
        let html = "";
        this.totalTickets = r.message.count || data.length;
        document.getElementById("ticket-count").innerText = "(" + this.totalTickets + ")";

        data.forEach(t => {
          const slaStatus = this.getSLAStatus(t.resolution_by);
          html += this.buildTicketRowHTML(t, slaStatus);
        });

        if (data.length === 0 && !append) {
          html = '<div class="no-tickets">No tickets found</div>';
        }

        if (append) {
          container.insertAdjacentHTML("beforeend", html);
        } else {
          container.innerHTML = html;
        }
        
        // If allSelected is true, check all new rows and add them to selectedTickets
        if (this.allSelected) {
          container.querySelectorAll('.ticket-row .row-checkbox').forEach(cb => {
            const ticketId = cb.closest('.ticket-row').getAttribute('data-id');
            if (ticketId && !this.selectedTickets.includes(ticketId)) {
              this.selectedTickets.push(ticketId);
            }
            cb.checked = true;
            cb.closest('.ticket-row').classList.add('selected');
          });
        }

        this.updateMasterCheckbox();
        this.loadingMore = false;
      }
    });
  },

  buildTicketRowHTML(t, slaStatus) {
    return `
      <div class="ticket-row" data-id="${t.name}"
           onclick="HelpdeskPages.tickets.openTicket('${t.name}', this)">
        <div class="ticket-left">
          <div class="ticket-icon">${this.mailIcon()}</div>
          <input type="checkbox" class="row-checkbox"
            onclick="event.stopPropagation();"
            onchange="HelpdeskPages.tickets.toggle('${t.name}', this); return false;">
        </div>
        <div class="ticket-content">
          <div class="ticket-subject ${t.custom_is_read ? 'read-subject' : 'unread-subject'}">${t.subject || "-"}</div>
          <div class="ticket-meta-line">
            <span>#${t.name}</span>
            <span class="dot">•</span>
            <span>${t.customer || "-"}</span>
            ${t.custom_circuit_id ? `
              <span class="dot">•</span>
              <span class="ticket-circuit-id">Circuit: ${t.custom_circuit_id}</span>
            ` : ''}
            <span class="dot">•</span>
            <span class="time" title="Created On ${this.formatFullDate(t.creation)}">
              ${this.clockIcon()} ${this.timeAgo(t.creation)}
            </span>
            ${t.priority ? `
              <span class="dot">•</span>
              <span class="ticket-priority priority-${t.priority.toLowerCase()}">${t.priority}</span>
            ` : ''}
          </div>
        </div>
        <div class="ticket-actions">
          <div class="read-toggle"
               onclick="event.stopPropagation(); HelpdeskPages.tickets.toggleRead('${t.name}', this)">
            ${this.readIcon(t.custom_is_read)}
          </div>
        </div>
        <div class="ticket-status">${this.getStatusBadge(t.status)}</div>
        <div class="ticket-assignee">${this.getAvatar(t.assigned_to, t.user_image)}</div>
      </div>
    `;
  },

  setupScrollListener() {
    const listEl = document.getElementById("ticket-list");
    if (listEl) {
      listEl.addEventListener("scroll", () => {
        if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 50 && !this.loadingMore) {
          this.loadingMore = true;
          this.start += this.pageSize;
          this.fetchTickets(true, true);
        }
      });
    }
  },

  /* ---------------- AUTO REFRESH (ENHANCED) ---------------- */

  startAutoRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      this.silentRefresh();
    }, 30000);
  },

  silentRefresh() {
    // Build filter args with current filters
    let filterArgs = {
      page_length: this.pageSize,
      start: 0,
      search: this.searchText,
      view: this.currentView,
      view_type: this.currentViewType,
      customer: this.selectedCustomer,
      circuit_id: this.selectedCircuitId,
      status: this.selectedStatus.length ? this.selectedStatus.join(',') : undefined,
      stage: this.selectedStage.length ? this.selectedStage.join(',') : undefined,
      priority: this.selectedPriority.length ? this.selectedPriority.join(',') : undefined,
      channel: this.selectedChannel.length ? this.selectedChannel.join(',') : undefined,
      impact: this.selectedImpact || undefined,
      severity: this.selectedSeverity.length ? this.selectedSeverity.join(',') : undefined,
      created_from: this.selectedRangeFrom,
      created_to: this.selectedRangeTo,
    };

    frappe.call({
      method: "nexapp.api.get_hd_tickets",
      args: filterArgs,
      callback: (r) => {
        const newTickets = r.message.tickets || [];
        const container = document.getElementById("ticket-list");
        if (!container) return;

        // Get existing rows as a map
        const existingRows = {};
        container.querySelectorAll('.ticket-row').forEach(row => {
          const id = row.getAttribute('data-id');
          if (id) existingRows[id] = row;
        });

        // Set to keep track of processed ids
        const processedIds = new Set();

        // Iterate over new tickets
        newTickets.forEach(t => {
          processedIds.add(t.name);
          const slaStatus = this.getSLAStatus(t.resolution_by);
          const rowHTML = this.buildTicketRowHTML(t, slaStatus);
          const existingRow = existingRows[t.name];

          if (existingRow) {
            // Update existing row (replace with new HTML)
            existingRow.outerHTML = rowHTML;
          } else {
            // Prepend new row
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rowHTML;
            const newRow = tempDiv.firstElementChild;
            container.prepend(newRow);
          }
        });

        // Remove rows that are no longer in the result
        Object.keys(existingRows).forEach(id => {
          if (!processedIds.has(id)) {
            existingRows[id].remove();
          }
        });

        // Update total count
        this.totalTickets = r.message.count || newTickets.length;
        document.getElementById("ticket-count").innerText = "(" + this.totalTickets + ")";

        // Restore selection after DOM update
        if (this.allSelected) {
          // Re-fetch all ticket IDs to update the full list
          this.fetchAllTicketIds((ids) => {
            this.selectedTickets = ids;
            // Check all visible checkboxes
            container.querySelectorAll('.ticket-row .row-checkbox').forEach(cb => {
              cb.checked = true;
              cb.closest('.ticket-row').classList.add('selected');
            });
            this.updateMasterCheckbox();
            this.updateActionBarVisibility();
          });
        } else {
          // Restore selection for visible rows based on current selectedTickets
          container.querySelectorAll('.ticket-row').forEach(row => {
            const id = row.getAttribute('data-id');
            const cb = row.querySelector('.row-checkbox');
            if (this.selectedTickets.includes(id)) {
              cb.checked = true;
              row.classList.add('selected');
            } else {
              cb.checked = false;
              row.classList.remove('selected');
            }
          });
          this.updateMasterCheckbox();
          this.updateActionBarVisibility();
        }
      }
    });
  },

  /* ---------------- SELECTION MANAGEMENT ---------------- */

  // Fetch all ticket IDs matching current filters using existing endpoint
  fetchAllTicketIds(callback) {
    let filterArgs = {
      page_length: 1000000, // large enough to cover all tickets
      start: 0,
      search: this.searchText,
      view: this.currentView,
      view_type: this.currentViewType,
      customer: this.selectedCustomer,
      circuit_id: this.selectedCircuitId,
      status: this.selectedStatus.length ? this.selectedStatus.join(',') : undefined,
      stage: this.selectedStage.length ? this.selectedStage.join(',') : undefined,
      priority: this.selectedPriority.length ? this.selectedPriority.join(',') : undefined,
      channel: this.selectedChannel.length ? this.selectedChannel.join(',') : undefined,
      impact: this.selectedImpact || undefined,
      severity: this.selectedSeverity.length ? this.selectedSeverity.join(',') : undefined,
      created_from: this.selectedRangeFrom,
      created_to: this.selectedRangeTo,
    };

    frappe.call({
      method: "nexapp.api.get_hd_tickets",
      args: filterArgs,
      callback: (r) => {
        const ids = (r.message.tickets || []).map(t => t.name);
        callback(ids);
      }
    });
  },

  toggleSelectAll(checked) {
    if (checked) {
      this.fetchAllTicketIds((ids) => {
        this.selectedTickets = ids;
        this.allSelected = true;
        // Check all visible checkboxes
        document.querySelectorAll('.ticket-row .row-checkbox').forEach(cb => {
          cb.checked = true;
          cb.closest('.ticket-row').classList.add('selected');
        });
        this.updateMasterCheckbox();
        this.updateActionBarVisibility();
      });
    } else {
      this.selectedTickets = [];
      this.allSelected = false;
      document.querySelectorAll('.ticket-row .row-checkbox').forEach(cb => {
        cb.checked = false;
        cb.closest('.ticket-row').classList.remove('selected');
      });
      this.updateMasterCheckbox();
      this.updateActionBarVisibility();
    }
  },

  toggleSelectTicket(ticketId, checked) {
    if (checked) {
      if (!this.selectedTickets.includes(ticketId)) {
        this.selectedTickets.push(ticketId);
      }
    } else {
      this.selectedTickets = this.selectedTickets.filter(id => id !== ticketId);
    }
    // If we had allSelected true and user unchecks one, we turn off allSelected
    if (this.allSelected && !checked) {
      this.allSelected = false;
    }
    // Update row class
    const row = document.querySelector(`.ticket-row[data-id="${ticketId}"]`);
    if (row) {
      if (checked) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    }
    this.updateMasterCheckbox();
    this.updateActionBarVisibility();
  },

  updateMasterCheckbox() {
    const masterCheckbox = document.getElementById('master-checkbox');
    if (!masterCheckbox) return;
    const totalVisible = document.querySelectorAll('.ticket-row .row-checkbox').length;
    const checkedCount = this.selectedTickets.length;
    if (checkedCount === 0) {
      masterCheckbox.checked = false;
      masterCheckbox.indeterminate = false;
    } else if (checkedCount === totalVisible && !this.allSelected) {
      masterCheckbox.checked = true;
      masterCheckbox.indeterminate = false;
    } else if (this.allSelected) {
      masterCheckbox.checked = true;
      masterCheckbox.indeterminate = false;
    } else {
      masterCheckbox.checked = false;
      masterCheckbox.indeterminate = true;
    }
  },

  updateActionBarVisibility() {
    const normalLeft = document.querySelector('.toolbar-left-normal');
    const actionBar = document.querySelector('.action-bar');
    if (!normalLeft || !actionBar) return;
    if (this.selectedTickets.length > 0 || this.allSelected) {
      normalLeft.classList.add('hidden');
      actionBar.classList.remove('hidden');
      // Update selected count
      const countSpan = document.getElementById('selected-tickets-count');
      if (countSpan) {
        if (this.allSelected) {
          countSpan.textContent = this.totalTickets;
        } else {
          countSpan.textContent = this.selectedTickets.length;
        }
      }
    } else {
      normalLeft.classList.remove('hidden');
      actionBar.classList.add('hidden');
    }
  },

  clearSelection() {
    this.selectedTickets = [];
    this.allSelected = false;
    const checkboxes = document.querySelectorAll('.ticket-row .row-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = false;
      cb.closest('.ticket-row').classList.remove('selected');
    });
    this.updateMasterCheckbox();
    this.updateActionBarVisibility();
  },

  syncSelectionFromDOM() {
    // Only sync if not in allSelected mode
    if (this.allSelected) return;
    this.selectedTickets = [];
    document.querySelectorAll('.ticket-row .row-checkbox:checked').forEach(cb => {
      const ticketId = cb.closest('.ticket-row').getAttribute('data-id');
      if (ticketId) this.selectedTickets.push(ticketId);
    });
    this.updateMasterCheckbox();
    this.updateActionBarVisibility();
  },

  /* ---------------- EXISTING FUNCTIONS (PRESERVED) ---------------- */

  buildGroup(title, type, items) {
    return `<div class="filter-group">
      <div class="filter-heading"
           onclick="event.stopPropagation();
                    const all=document.querySelectorAll('.filter-items');
                    all.forEach(el=>{ if(el!==this.nextElementSibling) el.classList.add('hidden'); });
                    this.nextElementSibling.classList.toggle('hidden');">
        ▶ ${title}
      </div>
      <div class="filter-items hidden">
        ${items.map(i => `<div class="view-item" data-label="${i}"
          onclick="HelpdeskPages.tickets.changeView('${i}','${type}')">${i}</div>`).join("")}
      </div>
    </div>`;
  },

  toggleViewMenu(e) {
    if (e) e.stopPropagation();
    document.getElementById("view-menu").classList.toggle("hidden");
  },

  filterViewList(text) {
    document.querySelectorAll(".view-item").forEach(i => {
      i.style.display = i.innerText.toLowerCase().includes(text.toLowerCase()) ? "block" : "none";
    });
  },

  changeView(view, type = "status") {
    this.currentView = view;
    this.currentViewType = type;
    this.start = 0;
    document.getElementById("current-view").innerText = view;
    document.getElementById("view-menu").classList.add("hidden");
    this.fetchTickets();
  },

  getSLAStatus(date) {
    if (!date) return null;
    const now = new Date();
    const sla = new Date(date);
    return sla < now ? "breach" : "ok";
  },

  slaIcon(status) {
    const color = status === "breach" ? "#ef4444" : "#22c55e";
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="${color}">
      <path d="M6 2h12v2l-4 5v2l4 5v2H6v-2l4-5V9L6 4V2z"/>
    </svg>`;
  },

  formatSLADate(dt) {
    const d = new Date(dt);
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[d.getMonth()];
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month} ${hours}:${minutes} ${ampm}`;
  },

  toggleFilterPanel() {
    document.getElementById("filter-panel").classList.toggle("hidden");
  },

  search(value) {
    this.searchText = value;
    this.start = 0;
    this.fetchTickets();
  },

  filterIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" stroke="#f97316" fill="none" stroke-width="2"><path d="M3 4h18l-7 8v6l-4 2v-8z"/></svg>`;
  },

  refreshIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" stroke="#f97316" fill="none" stroke-width="2"><path d="M20 6v6h-6"/><path d="M4 18v-6h6"/></svg>`;
  },
  
  openTicket(ticketId, rowEl) {
    const subject = rowEl.querySelector(".ticket-subject");
    if (subject.classList.contains("unread-subject")) {
      subject.classList.remove("unread-subject");
      subject.classList.add("read-subject");
      const icon = rowEl.querySelector(".read-toggle");
      if (icon) {
        icon.innerHTML = this.readIcon(1);
      }
      frappe.call({
        method: "nexapp.api.toggle_ticket_read_status",
        args: { ticket_id: ticketId },
        freeze: false
      });
    }
    if (typeof HelpdeskPages.ticket_view !== 'undefined' && HelpdeskPages.ticket_view) {
      HelpdeskPages.ticket_view.render(ticketId);
    } else {
      frappe.set_route(`/hd-ticket/${ticketId}`);
    }
  },

  toggleRead(ticketId, el) {
    frappe.call({
      method: "nexapp.api.toggle_ticket_read_status",
      args: { ticket_id: ticketId },
      callback: (r) => {
        const isRead = r.message;
        el.innerHTML = HelpdeskPages.tickets.readIcon(isRead);
        const row = el.closest(".ticket-row");
        const subject = row.querySelector(".ticket-subject");
        subject.classList.toggle("unread-subject", !isRead);
        subject.classList.toggle("read-subject", isRead);
      }
    });
  },

  readIcon(isRead) {
    return isRead ?
      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M2 8l10 6 10-6"/><path d="M2 8v10h20V8"/></svg>` :
      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 4l10 8 10-8"/></svg>`;
  },

  toggle(id, checkbox) {
    this.toggleSelectTicket(id, checkbox.checked);
  },

  getStatusBadge(status) {
    if (!status) return "";
    const cls = status.toLowerCase().replace(/\s/g, "");
    return `<span class="status-pill status-${cls}">${status}</span>`;
  },

  getAvatar(user, image) {
    if (!user) return "";
    if (image) return `<img src="${image}" class="agent-avatar" title="${user}" />`;
    const parts = user.trim().split(" ");
    const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : user.substring(0, 2);
    return `<div class="agent-avatar-fallback">${initials.toUpperCase()}</div>`;
  },

  timeAgo(datetime) {
    if (!datetime) return "-";
    const created = new Date(datetime);
    const now = new Date();
    const diff = Math.floor((now - created) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
    return Math.floor(diff / 604800) + "w ago";
  },

  mailIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 4l10 8 10-8"/></svg>`;
  },

  clockIcon() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
  },

  createTicket() {
    frappe.msgprint("Open Ticket Creation Form");
  },

  formatFullDate(datetime) {
    if (!datetime) return "";
    const d = new Date(datetime);
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
  },

  /* ---------------- PARENT FILTER FUNCTIONS (PRESERVED) ---------------- */

  setParentFilter(filterType, filterValue, displayValue) {
    if (this.parentFilter) {
      this.clearParentFilter(false);
    }
    this.parentFilter = filterType;
    this.parentFilterValue = filterValue;
    this.parentFilterDisplay = displayValue || filterValue;
    this.updateParentFilterUI();
    this.updateActiveLabel(filterType, filterValue, displayValue);
  },

  clearParentFilter(fetchTickets = true) {
    const previousParent = this.parentFilter;
    this.parentFilter = null;
    this.parentFilterValue = null;
    this.parentFilterDisplay = null;

    if (previousParent === 'customer') {
      this.selectedCustomer = "";
      const label = document.getElementById("active-customer-label");
      if (label) {
        label.innerHTML = "";
        label.style.display = "none";
      }
    } else if (previousParent === 'circuit') {
      this.selectedCircuitId = "";
      const label = document.getElementById("active-circuit-label");
      if (label) {
        label.innerHTML = "";
        label.style.display = "none";
      }
    } else if (previousParent === 'ticket') {
      this.selectedTicketId = "";
      const label = document.getElementById("active-ticket-label");
      if (label) {
        label.innerHTML = "";
        label.style.display = "none";
      }
    } else if (previousParent === 'agent') {
      this.selectedAgent = "";
      const label = document.getElementById("active-agent-label");
      if (label) {
        label.innerHTML = "";
        label.style.display = "none";
      }
    }

    this.enableAllFilterSections();
    const banner = document.getElementById("parent-filter-banner");
    if (banner) banner.classList.add("hidden");
    const parentBadges = document.querySelectorAll('.parent-badge');
    parentBadges.forEach(badge => badge.classList.add('hidden'));

    if (fetchTickets) {
      this.start = 0;
      this.fetchTickets();
    }
  },

  updateParentFilterUI() {
    if (!this.parentFilter) return;
    const banner = document.getElementById("parent-filter-banner");
    const messageEl = document.getElementById("parent-filter-message-text");
    let filterLabel = "";
    switch (this.parentFilter) {
      case "customer": filterLabel = "Customer"; break;
      case "circuit": filterLabel = "Circuit ID"; break;
      case "ticket": filterLabel = "Ticket ID"; break;
      case "agent": filterLabel = "Agent"; break;
    }
    if (messageEl) {
      messageEl.innerHTML = `Filtering by ${filterLabel}: <strong>${this.parentFilterDisplay}</strong> - Other filters are disabled`;
    }
    if (banner) banner.classList.remove("hidden");
    const badgeId = `${this.parentFilter}-parent-badge`;
    const badge = document.getElementById(badgeId);
    if (badge) badge.classList.remove("hidden");
    this.disableOtherFilterSections(this.parentFilter);
  },

  updateActiveLabel(filterType, filterValue, displayValue) {
    const labelId = `active-${filterType}-label`;
    const label = document.getElementById(labelId);
    if (label) {
      let labelText = "";
      switch (filterType) {
        case "customer": labelText = "Customer: " + (displayValue || filterValue); break;
        case "circuit": labelText = "Circuit: " + (displayValue || filterValue); break;
        case "ticket": labelText = "Ticket: #" + (displayValue || filterValue); break;
        case "agent": labelText = "Agent: " + (displayValue || filterValue); break;
      }
      label.innerHTML = labelText;
      label.style.display = "inline";
    }
  },

  disableOtherFilterSections(activeFilterType) {
    const sections = [
      { id: "filter-section-customer", type: "customer", inputId: "customer-search", listId: "customer-list", messageId: null },
      { id: "filter-section-circuit", type: "circuit", inputId: "circuit-search", listId: "circuit-list", messageId: "circuit-blocked-message" },
      { id: "filter-section-ticket", type: "ticket", inputId: "ticket-search", listId: "ticket-list-filter", messageId: "ticket-blocked-message" },
      { id: "filter-section-agent", type: "agent", inputId: "agent-search", listId: "agent-list", messageId: "agent-blocked-message" }
    ];

    sections.forEach(section => {
      const sectionEl = document.getElementById(section.id);
      if (!sectionEl) return;

      if (section.type === activeFilterType) {
        sectionEl.classList.remove("filter-section-disabled");
        const input = document.getElementById(section.inputId);
        if (input) input.disabled = false;
        if (section.messageId) {
          const msgEl = document.getElementById(section.messageId);
          if (msgEl) msgEl.classList.add("hidden");
        }
      } else {
        sectionEl.classList.add("filter-section-disabled");
        const input = document.getElementById(section.inputId);
        if (input) {
          input.disabled = true;
          input.value = "";
        }
        const listEl = document.getElementById(section.listId);
        if (listEl) listEl.innerHTML = "";
        if (section.messageId) {
          const msgEl = document.getElementById(section.messageId);
          if (msgEl) {
            msgEl.classList.remove("hidden");
            const parentType = this.parentFilter;
            let parentLabel = "";
            switch (parentType) {
              case "customer": parentLabel = "Customer"; break;
              case "circuit": parentLabel = "Circuit ID"; break;
              case "ticket": parentLabel = "Ticket ID"; break;
              case "agent": parentLabel = "Agent"; break;
            }
            const msgSpan = msgEl.querySelector("span");
            if (msgSpan) {
              msgSpan.innerHTML = `🔒 Select ${parentLabel} first or clear parent filter`;
            }
          }
        }
      }
    });
  },

  enableAllFilterSections() {
    const sections = [
      { id: "filter-section-customer", inputId: "customer-search", listId: "customer-list", messageId: null },
      { id: "filter-section-circuit", inputId: "circuit-search", listId: "circuit-list", messageId: "circuit-blocked-message" },
      { id: "filter-section-ticket", inputId: "ticket-search", listId: "ticket-list-filter", messageId: "ticket-blocked-message" },
      { id: "filter-section-agent", inputId: "agent-search", listId: "agent-list", messageId: "agent-blocked-message" }
    ];

    sections.forEach(section => {
      const sectionEl = document.getElementById(section.id);
      if (sectionEl) {
        sectionEl.classList.remove("filter-section-disabled");
        const input = document.getElementById(section.inputId);
        if (input) input.disabled = false;
        if (section.messageId) {
          const msgEl = document.getElementById(section.messageId);
          if (msgEl) msgEl.classList.add("hidden");
        }
      }
    });
  },

  toggleAdvancedFilter() {
    const panel = document.getElementById("advanced-filter");
    panel.classList.toggle("hidden");
  },

  applyTicketFilter(ticketId) {
    this.selectedTicketId = ticketId;
    this.start = 0;
    const label = document.getElementById("active-ticket-label");
    if (label) {
      label.innerHTML = "Ticket: #" + ticketId;
      label.style.display = "inline";
    }
    const ticketSearchInput = document.getElementById("ticket-search");
    if (ticketSearchInput) {
      ticketSearchInput.value = ticketId;
    }
    document.getElementById("ticket-list-filter").innerHTML = "";
    document.getElementById("advanced-filter")?.classList.add("hidden");
    this.fetchTickets();
  },

  clearTicketFilter() {
    this.selectedTicketId = "";
    this.start = 0;
    document.getElementById("ticket-list-filter").innerHTML = "";
    const ticketSearchInput = document.getElementById("ticket-search");
    if (ticketSearchInput) {
      ticketSearchInput.value = "";
    }
    const label = document.getElementById("active-ticket-label");
    if (label) {
      label.innerHTML = "";
      label.style.display = "none";
    }
    this.fetchTickets();
  },

  searchAgent(text) {
    if (!this.parentFilter || this.parentFilter !== "customer") {
      return;
    }
    if (!text) {
      document.getElementById("agent-list").innerHTML = "";
      return;
    }

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "HD Ticket",
        fields: ["_assign"],
        filters: {
          "customer": this.parentFilterValue
        },
        limit_page_length: 100
      },
      callback: (ticketResponse) => {
        let agents = new Set();
        (ticketResponse.message || []).forEach(t => {
          if (t._assign) {
            try {
              const assigned = JSON.parse(t._assign);
              assigned.forEach(a => agents.add(a));
            } catch (e) { }
          }
        });

        frappe.call({
          method: "nexapp.api.search_agents",
          args: {
            text: text
          },
          callback: (r) => {
            let html = "";
            (r.message || []).forEach(agent => {
              if (agents.has(agent.name)) {
                const displayName = agent.full_name || agent.name;
                html += `<div class="filter-option"
                          onclick="HelpdeskPages.tickets.applyAgentFilter('${agent.name}', '${displayName.replace(/'/g, "\\'")}')">
                          ${displayName}
                        </div>`;
              }
            });
            if (html === "") {
              html = `<div class="filter-option disabled">No matching agents for this customer</div>`;
            }
            document.getElementById("agent-list").innerHTML = html;
          }
        });
      }
    });
  },

  applyAgentFilter(agent, displayName) {
    this.selectedAgent = agent;
    this.start = 0;
    const label = document.getElementById("active-agent-label");
    if (label) {
      label.innerHTML = "Agent: " + (displayName || agent);
      label.style.display = "inline";
    }
    const agentSearchInput = document.getElementById("agent-search");
    if (agentSearchInput) {
      agentSearchInput.value = displayName || agent;
    }
    document.getElementById("agent-list").innerHTML = "";
    document.getElementById("advanced-filter")?.classList.add("hidden");
    this.fetchTickets();
  },

  clearAgentFilter() {
    this.selectedAgent = "";
    this.start = 0;
    document.getElementById("agent-list").innerHTML = "";
    const agentSearchInput = document.getElementById("agent-search");
    if (agentSearchInput) {
      agentSearchInput.value = "";
    }
    const label = document.getElementById("active-agent-label");
    if (label) {
      label.innerHTML = "";
      label.style.display = "none";
    }
    this.fetchTickets();
  }
};

document.addEventListener("click", function (e) {
  const menu = document.getElementById("view-menu");
  const btn = document.querySelector(".view-dropdown");
  const filterPanel = document.getElementById("advanced-filter");
  const filterBtn = document.querySelector(".toolbar-icon[title='Advanced Filter']");

  if (menu) {
    if (!menu.contains(e.target) && !(btn && btn.contains(e.target))) {
      menu.classList.add("hidden");
    }
  }

  if (filterPanel && !filterPanel.classList.contains("hidden")) {
    if (!filterPanel.contains(e.target) && !(filterBtn && filterBtn.contains(e.target))) {
      filterPanel.classList.add("hidden");
    }
  }
});