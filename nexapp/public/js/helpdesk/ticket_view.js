window.HelpdeskPages = window.HelpdeskPages || {};

HelpdeskPages.ticket_view = {

  render(ticketId) {

    const content = document.querySelector(".hd-content");

    content.innerHTML = `
      <div class="ticket-view-layout">

        <div class="ticket-view-main">

          <div class="ticket-action-bar">
            <div>
              <button class="back-btn" onclick="HelpdeskPages.tickets.render(document.querySelector('.hd-content'))">
                ← Back to Tickets
              </button>
              <h2 class="ticket-title-line">
             <span class="ticket-link" onclick="HelpdeskApp.goToTicketsList()">Tickets</span>
              / ${ticketId} — Device offline alert from site router
            </h2>

              <!-- ✅ TIMELINE MOVED INSIDE WHITE HEADER -->
              <div class="ticket-timeline">
                <div class="timeline-line"></div>
                ${this.timelineStep("Open", "07-02-2026 19:22", "open")}
                ${this.timelineStep("Replied", "07-02-2026 19:22", "replied")}
                ${this.timelineStep("On Hold", "07-02-2026 19:22", "hold")}
                ${this.timelineStep("Wrong Circuit", "07-02-2026 19:22", "wrong")}
                ${this.timelineStep("Resolved", "07-02-2026 19:22", "resolved")}
                ${this.timelineStep("Closed", "07-02-2026 19:22", "closed")}
              </div>
            </div>

            <select class="status-dropdown status-open">
              <option value="open" selected>🔴 Open</option>
              <option value="replied">🔵 Replied</option>
              <option value="hold">🟠 On Hold</option>
              <option value="wrong">🟣 Wrong Circuit</option>
              <option value="resolved">🟢 Resolved</option>
              <option value="closed">⚫ Closed</option>
            </select>
          </div>

          <!-- TABS -->
          <div class="ticket-tabs">
            <div class="tab active" onclick="HelpdeskPages.ticket_view.switchTab(this, 'data')">📄 Data</div>
            <div class="tab" onclick="HelpdeskPages.ticket_view.switchTab(this, 'activity')">⚡ Activity</div>
            <div class="tab" onclick="HelpdeskPages.ticket_view.switchTab(this, 'emails')">✉ Email</div>
            <div class="tab" onclick="HelpdeskPages.ticket_view.switchTab(this, 'comments')">💬 Comments</div>
            <div class="tab" onclick="HelpdeskPages.ticket_view.switchTab(this, 'history')">🕓 History</div>
            <div class="tab" onclick="HelpdeskPages.ticket_view.switchTab(this, 'lms')">🌐 LMS</div>
            <div class="tab" onclick="HelpdeskPages.ticket_view.switchTab(this, 'provisioning')">🧩 Provisioning</div>
          </div>

          <div id="tab-content">
            <div class="tab-panel" id="data">
              <div class="data-grid">
                <div><b>Status:</b> Open</div>
                <div><b>Priority:</b> Medium</div>
                <div><b>Customer:</b> Blink Commerce Pvt Ltd</div>
                <div><b>Stage:</b> In Progress</div>
                <div><b>Assigned To:</b> Rohit Landge</div>
                <div><b>Source:</b> Email</div>
                <div><b>Created On:</b> Today 10:32 AM</div>
                <div><b>Type:</b> Incident</div>
              </div>
            </div>
          </div>

        </div>

        <div class="resize-handle" id="dragbar"></div>

        <div class="ticket-view-side">
          <div class="side-section">
            <h3>Ticket Information</h3>
            <div class="side-row"><span>Ticket Type</span><b>Incident</b></div>
            <div class="side-row"><span>Priority</span><b>Medium</b></div>
            <div class="side-row"><span>Customer</span><b>Blink Commerce Pvt Ltd</b></div>
            <div class="side-row"><span>Channel</span><b>Email</b></div>
          </div>
        </div>

      </div>
    `;

    this.enableResize();
    this.initStatusColor();
    this.updateTimeline(document.querySelector(".status-dropdown").value);
  },

  timelineStep(label, date, type){
    return `
      <div class="timeline-step ${type}" data-step="${type}">
        <div class="timeline-dot"></div>
        <div class="timeline-label">${label}</div>
        <div class="timeline-date">${date}</div>
      </div>
    `;
  },

  updateTimeline(status){
    const order = ["open","replied","hold","wrong","resolved","closed"];
    const index = order.indexOf(status);

    document.querySelectorAll(".timeline-step").forEach((step, i)=>{
      step.classList.remove("done","active");
      if(i < index) step.classList.add("done");
      if(i === index) step.classList.add("active");
    });
  },

  switchTab(el, id) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    el.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
  },

  enableResize() {
    const dragbar = document.getElementById("dragbar");
    const side = document.querySelector(".ticket-view-side");
    dragbar.addEventListener("mousedown", e => {
      document.onmousemove = ev => { side.style.width = (window.innerWidth - ev.clientX) + "px"; };
      document.onmouseup = () => document.onmousemove = null;
    });
  },

  initStatusColor() {
    const dd = document.querySelector(".status-dropdown");
    dd.addEventListener("change", (e)=>{
      this.updateTimeline(e.target.value);
    });
  }

};
