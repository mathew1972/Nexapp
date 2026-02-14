window.HelpdeskPages = window.HelpdeskPages || {};

HelpdeskPages.dashboard = {

    render(content) {
        content.innerHTML = `
      <div class="dashboard-container">
        
        <!-- Header -->
        <div class="h-header header-flex">
          <div>
            <h1>Dashboard</h1>
            <div class="h-sub">Overview of ITMS Service Delivery</div>
          </div>
          <div class="header-actions">
            <button class="btn-create-ticket" onclick="HelpdeskPages.tickets.createTicket()">+ New Ticket</button>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="kpi-grid">
          
          <!-- Total Tickets -->
          <div class="h-card kpi-card">
            <div class="kpi-title">Total Tickets</div>
            <div class="kpi-value" id="kpi-total">0</div>
            <div class="kpi-trend">
              <span class="trend-neutral">--</span> vs last month
            </div>
            <div class="kpi-icon-bg">
              <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/><path d="M12 13h5v2h-5zM7 9h2v2H7zM7 13h2v2H7zM12 9h5v2h-5z"/></svg>
            </div>
          </div>

          <!-- Open Tickets -->
          <div class="h-card kpi-card">
            <div class="kpi-title">Open Issues</div>
            <div class="kpi-value" id="kpi-open" style="color: #ef4444;">0</div>
            <div class="kpi-trend">
              <span class="trend-neutral">--</span> Active
            </div>
            <div class="kpi-icon-bg" style="color: #ef4444;">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
          </div>

          <!-- Resolved Today -->
          <div class="h-card kpi-card">
            <div class="kpi-title">Resolved Today</div>
            <div class="kpi-value" id="kpi-resolved" style="color: #10b981;">0</div>
            <div class="kpi-trend">
              <span class="trend-up">↑ 12%</span> Efficiency
            </div>
            <div class="kpi-icon-bg" style="color: #10b981;">
              <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
          </div>

          <!-- SLA Breach -->
          <div class="h-card kpi-card">
            <div class="kpi-title">SLA Breaches</div>
            <div class="kpi-value" id="kpi-sla" style="color: #f59e0b;">0</div>
            <div class="kpi-trend">
              <span class="trend-down">↓ 2</span> Critical
            </div>
            <div class="kpi-icon-bg" style="color: #f59e0b;">
              <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            </div>
          </div>

        </div>

        <!-- Charts Row -->
        <div class="charts-grid">
          
          <!-- Main Trend Chart -->
          <div class="h-card chart-container">
            <h3>Ticket Volume (Last 30 Days)</h3>
            <div id="chart-trends" style="height: 300px;"></div>
          </div>

          <!-- Distribution Chart -->
          <div class="h-card chart-container">
            <h3>By Channel</h3>
            <div id="chart-channel" style="height: 300px;"></div>
          </div>

        </div>

        <!-- Bottom Row -->
        <div class="charts-grid">

          <!-- Recent Activity -->
          <div class="h-card" style="grid-column: span 1;">
            <div class="header-flex" style="margin-bottom:15px;">
              <h3>Recent Activity</h3>
              <a onclick="HelpdeskApp.goToTicketsList()" style="cursor:pointer; font-size:12px; color:var(--primary-color);">View All</a>
            </div>
            <div class="recent-activity-list" id="recent-activity-list">
              <!-- Rendered via JS -->
              <div style="padding:20px; text-align:center; color:#94a3b8;">Loading activity...</div>
            </div>
          </div>

          <!-- Agent Leaderboard -->
          <div class="h-card" style="grid-column: span 1;">
             <h3>Top Agents</h3>
             <div id="agent-leaderboard" style="padding-top:15px;">
                <!-- Rendered JS -->
             </div>
          </div>

        </div>

      </div>
    `;

        this.loadDashboardData();
    },

    loadDashboardData() {
        // Parallel Calls for data
        this.fetchKPIs();
        this.fetchCharts();
        this.fetchRecentActivity();
    },

    fetchKPIs() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "HD Ticket",
                fields: ["status", "custom_is_read"], // Minimal fields
                limit_page_length: 1000
            },
            callback: (r) => {
                const tickets = r.message || [];
                const total = tickets.length;
                const open = tickets.filter(t => ["Open", "Replied", "New"].includes(t.status)).length;
                const resolved = tickets.filter(t => t.status === "Resolved").length; // TODO: Filter by Today
                const sla = 0; // Placeholder

                this.animateValue("kpi-total", 0, total, 1000);
                this.animateValue("kpi-open", 0, open, 1000);
                this.animateValue("kpi-resolved", 0, resolved, 1000);
                document.getElementById("kpi-sla").innerText = sla;
            }
        });
    },

    fetchCharts() {
        // 1. Trend Chart
        const dates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toLocaleDateString('en-US', { weekday: 'short' });
        }).reverse();

        // Mock Data for Demo
        const data = {
            labels: dates,
            datasets: [
                {
                    name: "Tickets Created",
                    values: [12, 19, 3, 5, 2, 3, 15]
                },
                {
                    name: "Tickets Closed",
                    values: [10, 15, 8, 12, 5, 8, 10]
                }
            ]
        };

        const trendConfig = {
            title: "",
            data: data,
            type: 'line', // Frappe Charts type
            height: 280,
            colors: ['#f97316', '#10b981'],
            navigable: false
        };

        new frappe.Chart("#chart-trends", trendConfig);

        // 2. Channel Chart (Donut)
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "HD Ticket",
                fields: ["custom_channel"],
                limit_page_length: 1000
            },
            callback: (r) => {
                const tickets = r.message || [];
                const counts = {};
                tickets.forEach(t => {
                    const ch = t.custom_channel || "Email";
                    counts[ch] = (counts[ch] || 0) + 1;
                });

                const chartData = {
                    labels: Object.keys(counts),
                    datasets: [{ values: Object.values(counts) }]
                };

                new frappe.Chart("#chart-channel", {
                    data: chartData,
                    type: 'donut',
                    height: 280,
                    colors: ['#3b82f6', '#f97316', '#10b981', '#6366f1']
                });
            }
        });
    },

    fetchRecentActivity() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "HD Ticket",
                fields: ["name", "subject", "status", "modified", "owner"],
                limit_page_length: 5,
                order_by: "modified desc"
            },
            callback: (r) => {
                const list = document.getElementById("recent-activity-list");
                if (!list) return;

                let html = "";
                (r.message || []).forEach(t => {
                    html += `
            <div class="activity-row">
              <div class="activity-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div class="activity-content">
                <div class="activity-text">
                    <span style="font-weight:600;">${t.owner}</span> updated ticket 
                    <a href="#" style="color:var(--primary-color)" onclick="HelpdeskPages.tickets.openTicket('${t.name}', this)">#${t.name}</a>
                </div>
                <div class="activity-time">${frappe.datetime.comment_when(t.modified)} • ${t.subject}</div>
              </div>
              <div class="h-badge badge-${t.status.toLowerCase()}">${t.status}</div>
            </div>
          `;
                });
                list.innerHTML = html;
            }
        });
    },

    animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

};
