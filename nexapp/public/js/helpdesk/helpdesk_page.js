window.HelpdeskPages = window.HelpdeskPages || {};

window.HelpdeskApp = {

  currentPage: null,

  init(wrapper) {
    wrapper.innerHTML = `
      <div class="helpdesk-app-layout">
        
        <!-- LEFT SIDEBAR -->
        <div class="hd-sidebar collapsed" id="hd-sidebar">
          
            <div class="hd-logo">
              <span class="logo-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
                </svg>
              </span>
              <span class="logo-text">Nexapp ITMS</span>
          </div>
          
          <div class="hd-menu">

            <div class="hd-item active" data-page="dashboard"
                 onclick="HelpdeskApp.loadPage('dashboard', this)">
              <span class="hd-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="9"></rect>
                  <rect x="14" y="3" width="7" height="5"></rect>
                  <rect x="14" y="12" width="7" height="9"></rect>
                  <rect x="3" y="16" width="7" height="5"></rect>
                </svg>
              </span>
              <span class="hd-label">Dashboard</span>
            </div>

            <div class="hd-item" data-page="tickets"
                 onclick="HelpdeskApp.loadPage('tickets', this)">
              <span class="hd-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7h18l-2 10H5L3 7z"></path>
                  <path d="M16 3l-4 4-4-4"></path>
                </svg>
              </span>
              <span class="hd-label">Service Desk</span>
            </div>

            <div class="hd-item" data-page="kb"
                 onclick="HelpdeskApp.loadPage('kb', this)">
              <span class="hd-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19h16"></path>
                  <path d="M4 15h16"></path>
                  <path d="M4 11h16"></path>
                  <path d="M4 7h16"></path>
                </svg>
              </span>
              <span class="hd-label">Knowledge Base</span>
            </div>

            <div class="hd-item" data-page="agents"
                 onclick="HelpdeskApp.loadPage('agents', this)">
              <span class="hd-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M17 11c2 0 4 1 4 3v2H3v-2c0-2 2-3 4-3"></path>
                </svg>
              </span>
              <span class="hd-label">Agents</span>
            </div>

            <div class="hd-item" data-page="lms"
                 onclick="HelpdeskApp.loadPage('lms', this)">
              <span class="hd-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20"></path>
                  <path d="M8 22h8"></path>
                  <path d="M5 7a7 7 0 0 1 14 0"></path>
                  <path d="M7 10a5 5 0 0 1 10 0"></path>
                  <path d="M9 13a3 3 0 0 1 6 0"></path>
                </svg>
              </span>
              <span class="hd-label">LMS Master</span>
            </div>

          </div>

          <div class="hd-collapse" id="sidebarToggle" title="Expand">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
        </div>

        <!-- CONTENT -->
        <div class="hd-content" id="hd-content"></div>

      </div>
    `;

    // Attach toggle click
    document.getElementById("sidebarToggle").onclick = () => this.toggleSidebar();

    this.loadPage("dashboard", document.querySelector(".hd-item[data-page='dashboard']"));
  },

  /* 🔥 PAGE LOADER */
  loadPage(page, element) {

    if (this.currentPage === page) return;
    this.currentPage = page;

    const content = document.getElementById("hd-content");

    document.querySelectorAll(".hd-item").forEach(item => item.classList.remove("active"));
    if (element) element.classList.add("active");

    content.innerHTML = `<div style="padding:20px">Loading...</div>`;

    frappe.require(
      [`/assets/nexapp/js/helpdesk/pages/${page}.js`],
      () => {
        if (window.HelpdeskPages[page]) {
          window.HelpdeskPages[page].render(content);
        } else {
          content.innerHTML = `<div style="padding:20px">Page not found</div>`;
        }
      }
    );
  },

  goToTicketsList() {
    const ticketsMenu = document.querySelector(".hd-item[data-page='tickets']");
    this.loadPage("tickets", ticketsMenu);
  },

  toggleSidebar() {
    const sidebar = document.getElementById("hd-sidebar");
    const toggle = document.getElementById("sidebarToggle");
    const icon = toggle.querySelector("svg"); // Get the SVG

    sidebar.classList.toggle("collapsed");

    if (sidebar.classList.contains("collapsed")) {
      toggle.title = "Expand";
      icon.style.transform = "rotate(0deg)";
    } else {
      toggle.title = "Collapse";
      icon.style.transform = "rotate(180deg)";
    }
  }

};
