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
      // this.loadTotalStats(); // Disabled, stats now load via loadCharts
      this.loadNexaiData();
      this.loadCharts();
      this.startAutoRefresh(); // Start auto-refresh
      this.loadData();
    },


    // ══════════════════════════════════════════════════
    //  Custom Report Builder — Full-screen Native Modal
    // ══════════════════════════════════════════════════
    _crb_selected_circuits: [],
    
    showCustomReportBuilder() {
        frappe.call({
            method: 'nexapp.api.get_ticket_filter_options',
            callback: (r) => {
                if (!r.message) return;
                this._crb_selected_circuits = [];
                this._crb_build_modal(r.message);
            }
        });
    },

    _crb_build_modal(opts) {
        $('.crb-overlay').remove();
        const self = this;
        const status_options = (opts.statuses || []).map(s => `<option value="${s}">${s}</option>`).join('');
        const customer_options = (opts.customers || []).map(c => `<option value="${c}">${c}</option>`).join('');
        const user_options = (opts.users || []).map(u => `<option value="${u}">${u}</option>`).join('');

        const field_groups = [
            {
                main_label: 'HD Ticket', icon: 'fa-ticket', doctype: 'HD Ticket',
                sections: [
                    {
                        label: 'Core Information',
                        fields: [
                            { id: 'ticket_id', label: 'Ticket ID' },
                            { id: 'subject', label: 'Subject' },
                            { id: 'status', label: 'Status' },
                            { id: 'priority', label: 'Priority' },
                            { id: 'custom_channel', label: 'Channel' },
                            { id: 'description', label: 'Description' }
                        ]
                    },
                    {
                        label: 'Contacts & Assignments',
                        fields: [
                            { id: 'raised_by', label: 'Raised By' },
                            { id: 'customer', label: 'Customer' },
                            { id: 'assigned_to', label: 'Assigned To' }
                        ]
                    },
                    {
                        label: 'Dates & Times',
                        fields: [
                            { id: 'creation_date', label: 'Creation Date' },
                            { id: 'resolution_date', label: 'Resolution Date' },
                            { id: 'first_responded_on', label: 'First Responded On' }
                        ]
                    },
                    {
                        label: 'Custom References',
                        fields: [
                            { id: 'custom_circuit_id', label: 'Circuit ID' },
                            { id: 'custom_lms_id', label: 'LMS ID' }
                        ]
                    }
                ]
            }
        ];

        let fields_html = '';
        field_groups.forEach(g => {
            let sections_html = '';
            g.sections.forEach(sec => {
                const items = sec.fields.map(f =>
                    `<label class="crb-field-item">
                        <input type="checkbox" class="crb-field-cb" data-doctype="${g.doctype}" data-field="${f.id}">
                        <span>${f.label}</span>
                    </label>`
                ).join('');
                sections_html += `
                    <div class="crb-sub-section">
                        <div class="crb-sub-section-title">${sec.label}</div>
                        <div class="crb-field-grid">${items}</div>
                    </div>`;
            });
            fields_html += `
                <div class="crb-field-group crb-main-group">
                    <div class="crb-field-group-title main-title">
                        <i class="fa ${g.icon}"></i> ${g.main_label}
                        <span class="crb-select-all" data-group="${g.doctype}">Select All</span>
                    </div>
                    ${sections_html}
                </div>`;
        });

        const overlay = $(`
        <div class="crb-overlay">
            <div class="crb-modal">
                <div class="crb-topbar">
                    <div class="crb-topbar-left">
                        <div>
                            <div class="crb-topbar-title">Custom Report Builder</div>
                            <div class="crb-topbar-subtitle">Select filters, choose fields, then generate</div>
                        </div>
                    </div>
                    <div class="crb-topbar-actions">
                        <button class="crb-btn crb-btn-generate" id="crb-btn-generate">
                            <i class="fa fa-play"></i> Generate Report
                        </button>
                        <button class="crb-btn crb-btn-excel" id="crb-btn-excel" disabled>
                            <i class="fa fa-file-excel-o"></i> Download Excel
                        </button>
                        <button class="crb-close-btn" id="crb-close">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="crb-body">
                    <div class="crb-panel-filters">
                        <div class="crb-filter-section">
                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Ticket Created Date</div>
                                <select class="crb-filter-select" id="crb-creation-date-range">
                                    <option value="All">All</option>
                                    <option value="Current Month">Current Month</option>
                                    <option value="Last 3 Months">Last 3 Months</option>
                                    <option value="Custom">Custom</option>
                                </select>
                                <div class="crb-filter-dates" id="crb-creation-custom-dates">
                                    <input type="date" class="crb-filter-input" id="crb-creation-from-date">
                                    <input type="date" class="crb-filter-input" id="crb-creation-to-date">
                                </div>
                            </div>
                            
                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Resolution Date</div>
                                <select class="crb-filter-select" id="crb-resolution-date-range">
                                    <option value="All">All</option>
                                    <option value="Current Month">Current Month</option>
                                    <option value="Last 3 Months">Last 3 Months</option>
                                    <option value="Custom">Custom</option>
                                </select>
                                <div class="crb-filter-dates" id="crb-resolution-custom-dates">
                                    <input type="date" class="crb-filter-input" id="crb-resolution-from-date">
                                    <input type="date" class="crb-filter-input" id="crb-resolution-to-date">
                                </div>
                            </div>

                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Status</div>
                                <select class="crb-filter-select" id="crb-status">
                                    <option value="All">All</option>
                                    ${status_options}
                                </select>
                            </div>
                            
                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Customer</div>
                                <select class="crb-filter-select" id="crb-customer">
                                    <option value="All">All</option>
                                    ${customer_options}
                                </select>
                            </div>
                            
                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Raised By</div>
                                <select class="crb-filter-select" id="crb-raised-by">
                                    <option value="All">All</option>
                                    ${user_options}
                                </select>
                            </div>
                            
                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Circuit ID Search</div>
                                <input type="text" class="crb-filter-input" id="crb-circuit-search" placeholder="Type Circuit ID...">
                                <div class="crb-circuit-dropdown" id="crb-circuit-dropdown"></div>
                                <div class="crb-circuit-tags" id="crb-circuit-tags"></div>
                            </div>
                        </div>
                    </div>

                    <div class="crb-panel-fields">
                        <div class="crb-panel-title">Select Report Columns</div>
                        <div class="crb-field-groups">${fields_html}</div>
                    </div>

                    <div class="crb-panel-preview">
                        <div class="crb-preview-header">
                            <div class="crb-preview-title">Report Preview <span class="crb-preview-badge" id="crb-record-count">0 Records</span></div>
                        </div>
                        <div class="crb-preview-empty" id="crb-preview-empty">
                            <i class="fa fa-table"></i>
                            <p>Select fields and click <b>Generate Report</b></p>
                        </div>
                        <div class="crb-preview-table-wrap" id="crb-table-wrap" style="display:none;">
                            <table class="crb-preview-table" id="crb-preview-table">
                                <thead id="crb-thead"></thead>
                                <tbody id="crb-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>`);

        $('body').append(overlay);

        $('#crb-close').on('click', () => overlay.remove());
        
        $('#crb-creation-date-range').on('change', function() {
            $('#crb-creation-custom-dates').toggleClass('visible', $(this).val() === 'Custom');
        });
        $('#crb-resolution-date-range').on('change', function() {
            $('#crb-resolution-custom-dates').toggleClass('visible', $(this).val() === 'Custom');
        });

        overlay.on('click', '.crb-select-all', function () {
            const group = $(this).data('group');
            const cbs = overlay.find(`.crb-field-cb[data-doctype="${group}"]`);
            const allChecked = cbs.filter(':checked').length === cbs.length;
            cbs.prop('checked', !allChecked);
            $(this).text(allChecked ? 'Select All' : 'Deselect All');
        });

        const circuit_ids = opts.circuit_ids || [];
        $('#crb-circuit-search').on('input', function () {
            const q = $(this).val().toLowerCase().trim();
            if (q.length < 1) { $('#crb-circuit-dropdown').removeClass('visible').empty(); return; }
            const matches = circuit_ids.filter(id => id.toLowerCase().includes(q) && !self._crb_selected_circuits.includes(id)).slice(0, 20);
            if (matches.length === 0) { $('#crb-circuit-dropdown').removeClass('visible').empty(); return; }
            let ddhtml = matches.map(id => `<div class="crb-circuit-option" data-id="${id}">${id}</div>`).join('');
            $('#crb-circuit-dropdown').html(ddhtml).addClass('visible');
        });

        overlay.on('click', '.crb-circuit-option', function () {
            const id = $(this).data('id');
            if (!self._crb_selected_circuits.includes(id)) {
                self._crb_selected_circuits.push(id);
                self._crb_render_circuit_tags();
            }
            $('#crb-circuit-search').val('');
            $('#crb-circuit-dropdown').removeClass('visible').empty();
        });

        overlay.on('click', '.crb-circuit-tag-remove', function () {
            const id = $(this).data('id');
            self._crb_selected_circuits = self._crb_selected_circuits.filter(c => c !== id);
            self._crb_render_circuit_tags();
        });

        $('#crb-btn-generate').on('click', () => this._crb_generate(overlay));
        $('#crb-btn-excel').on('click', () => this._crb_download_excel());
    },

    _crb_render_circuit_tags() {
        const html = this._crb_selected_circuits.map(id =>
            `<span class="crb-circuit-tag">${id}<span class="crb-circuit-tag-remove" data-id="${id}">&times;</span></span>`
        ).join('');
        $('#crb-circuit-tags').html(html);
    },

    _crb_generate(overlay) {
        const filters = {
            creation_date_range: $('#crb-creation-date-range').val(),
            resolution_date_range: $('#crb-resolution-date-range').val(),
            status: $('#crb-status').val(),
            customer: $('#crb-customer').val(),
            raised_by: $('#crb-raised-by').val()
        };
        if (filters.creation_date_range === 'Custom') {
            filters.creation_from_date = $('#crb-creation-from-date').val();
            filters.creation_to_date = $('#crb-creation-to-date').val();
        }
        if (filters.resolution_date_range === 'Custom') {
            filters.resolution_from_date = $('#crb-resolution-from-date').val();
            filters.resolution_to_date = $('#crb-resolution-to-date').val();
        }
        if (this._crb_selected_circuits.length > 0) {
            filters.circuit_id = this._crb_selected_circuits.join(',');
        }

        const fields = { 'HD Ticket': ['ticket_id', 'subject', 'status'] };
        overlay.find('.crb-field-cb:checked').each(function () {
            const dt = $(this).data('doctype');
            const f = $(this).data('field');
            if (!fields[dt]) fields[dt] = [];
            if (!fields[dt].includes(f)) fields[dt].push(f);
        });

        $('#crb-preview-empty').hide();
        $('#crb-table-wrap').hide();
        $('#crb-btn-generate').prop('disabled', true).html('<i class="fa fa-circle-o-notch fa-spin"></i> Generating...');
        
        frappe.call({
            method: 'nexapp.api.get_ticket_custom_report_data',
            args: { filters, fields },
            callback: (r) => {
                $('#crb-btn-generate').prop('disabled', false).html('<i class="fa fa-play"></i> Generate Report');
                if (r.message && r.message.length > 0) {
                    this._crb_report_data = r.message;
                    this._crb_render_table(r.message);
                    $('#crb-btn-excel').prop('disabled', false);
                    $('#crb-record-count').text(r.message.length + ' Records');
                } else {
                    $('#crb-preview-empty').show().find('p').html('No data found for the selected criteria.');
                    $('#crb-table-wrap').hide();
                    $('#crb-btn-excel').prop('disabled', true);
                    this._crb_report_data = null;
                }
            }
        });
    },

    _crb_render_table(data) {
        const keys = Object.keys(data[0]);
        const thead = '<tr>' + keys.map(k => `<th>${frappe.unscrub(k)}</th>`).join('') + '</tr>';
        const tbody = data.map(row => {
            return '<tr>' + keys.map(k => `<td>${row[k] || ''}</td>`).join('') + '</tr>';
        }).join('');
        
        $('#crb-thead').html(thead);
        $('#crb-tbody').html(tbody);
        $('#crb-table-wrap').show();
        $('#crb-preview-empty').hide();
    },

    _crb_download_excel() {
        if (!this._crb_report_data || this._crb_report_data.length === 0) return;
        const keys = Object.keys(this._crb_report_data[0]);
        const columns = keys.map(k => frappe.unscrub(k));
        const rows = [columns];
        
        this._crb_report_data.forEach(d => {
            rows.push(keys.map(k => d[k] || ''));
        });
        
        frappe.call({
            method: 'frappe.utils.xlsxutils.build_xlsx_response',
            args: {
                data: rows,
                filename: 'HD_Ticket_Custom_Report.xlsx'
            },
            callback: function(r) {
                if (r.message) {
                    window.location.href = r.message;
                }
            }
        });
    },
    
    renderLayout() {
      const layout = `
        <div class="helpdesk-container" style="max-width: 1400px; margin: 0 auto;">
          <!-- Ask NexAI Bar -->
          <div class="nexai-ask-container" style="margin-bottom: 32px;">
            <div class="nexai-ask-bar" style="background: white; border-radius: 12px; padding: 16px 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; display: flex; align-items: center; gap: 16px;">
               <span style="font-size: 20px;">🔍</span>
               <input type="text" id="nexai-ask-input" placeholder="Ask NexAI..." style="flex: 1; border: none; outline: none; font-size: 16px; color: #111827; background: transparent;">
               <button id="nexai-ask-btn" style="background: #111827; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Ask</button>
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px; font-size: 13px; color: #6b7280; flex-wrap: wrap;">
               <span>Try asking...</span>
               <span class="nexai-chip" style="background: #f3f4f6; padding: 4px 12px; border-radius: 16px; cursor: pointer; color: #3b82f6;">Why did tickets increase today?</span>
               <span class="nexai-chip" style="background: #f3f4f6; padding: 4px 12px; border-radius: 16px; cursor: pointer; color: #3b82f6;">Who needs attention?</span>
               <span class="nexai-chip" style="background: #f3f4f6; padding: 4px 12px; border-radius: 16px; cursor: pointer; color: #3b82f6;">Which customer is at risk?</span>
            </div>
          </div>

          <div class="nexai-layout" style="display: grid; grid-template-columns: 3fr 2fr; gap: 32px; margin-bottom: 40px;">
              <!-- Left Column: The Story -->
              <div class="nexai-left-column" style="display: flex; flex-direction: column; gap: 24px;">
                  
                  <!-- Morning Briefing -->
                  <div class="nexai-briefing-card" style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                          <h2 id="nexai-main-title" style="font-size: 22px; font-weight: 700; color: #111827; margin: 0;">🧠 NexAI Operations Brief</h2>
                      </div>
                      
                      <div style="font-size: 16px; color: #374151; line-height: 1.6;">
                          <p id="nexai-dynamic-greeting" style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 24px;">...</p>
                          
                          <div id="nexai-facts" style="display: flex; flex-direction: column; gap: 12px; font-size: 15px; color: #4b5563;">
                              <!-- Emojis injected via JS -->
                          </div>
                      </div>
                  </div>

                  <!-- Mission Card -->
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                      <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin: 0 0 12px 0; letter-spacing: 1px;">🎯 TODAY'S MISSION</h3>
                      <p id="nexai-mission" style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;"></p>
                      
                      <div style="display: flex; align-items: center; gap: 12px;">
                          <span style="font-size: 13px; font-weight: 600; color: #64748b;">Progress</span>
                          <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                              <div id="nexai-mission-progress-bar" style="height: 100%; width: 0%; background: #3b82f6; border-radius: 4px;"></div>
                          </div>
                          <span id="nexai-mission-progress-text" style="font-size: 13px; font-weight: 600; color: #0f172a;">0%</span>
                      </div>
                  </div>

                  <!-- Recommended Actions -->
                  <div class="nexai-actions-card" style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
                      <h3 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 20px 0;">💡 Top 3 Recommendations</h3>
                      <div id="nexai-actions-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
                  </div>

                  <!-- Customer Health -->
                  <div class="nexai-customer-card" style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
                      <h3 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 20px 0;">❤️ Customer Health</h3>
                      <div id="nexai-customer-health" style="display: flex; flex-direction: column; gap: 16px;"></div>
                  </div>

              </div>

              <!-- Right Column: The Evidence -->
              <div class="nexai-right-column" style="display: flex; flex-direction: column; gap: 24px;">
                  
                  <!-- SLA Health Redesigned -->
                  <div class="evidence-card" style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
                      <h4 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 20px 0;">SLA Health</h4>
                      <div id="nexai-sla-container">
                          <!-- Injected via JS -->
                      </div>
                  </div>

                  <!-- Live Queue -->
                  <div class="evidence-card" style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                      <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Live Queue</h4>
                      <div id="nexai-queue-bars" style="display: flex; flex-direction: column; gap: 12px;"></div>
                  </div>

                  <!-- Ticket Aging -->
                  <div class="evidence-card" style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                      <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Ticket Aging (Backlog)</h4>
                      <div id="nexai-aging-bars" style="display: flex; flex-direction: column; gap: 12px;"></div>
                  </div>

                  <!-- Agent Workload -->
                  <div class="evidence-card" style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                      <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Agent Workload</h4>
                      <div id="nexai-workload-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
                  </div>
              </div>
          </div>

          <!-- Main Content -->
          <div class="main-content" style="width: 100%;">
            <!-- Incoming Tickets Chart (Full Width) -->
            <div style="width: 100%; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; margin-bottom: 8px;">
                <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 16px;">Incoming Tickets (Last 12 Hours)</div>
                <div id="nexai-incoming-trend-chart"></div>
            </div>

            <!-- Recent Tickets -->
            <div class="recent-sites-card" style="flex: 1; width: 100%; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="font-size: 16px; font-weight: 600; color: #111827;">Recent Ticket Activity (Last 24 Hours)</div>
                    <button id="open-report-builder" style="background: #f3f4f6; color: #374151; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                        📊 Custom Report Builder
                    </button>
                </div>
                <div class="table-responsive" style="overflow-x: auto;">
                    <table class="recent-sites-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #e5e7eb; color: #6b7280; text-transform: uppercase; font-size: 11px;">
                                <th style="padding: 12px 8px;">Ticket</th>
                                <th style="padding: 12px 8px;">Channel</th>
                                <th style="padding: 12px 8px;">Circuit ID</th>
                                <th style="padding: 12px 8px;">Customer</th>
                                <th style="padding: 12px 8px;">Status</th>
                                <th style="padding: 12px 8px;">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody id="table-body">
                            <tr><td colspan="6" class="text-center" style="padding: 20px; text-align: center; color: #6b7280;">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>
        <style>
          /* Keep existing styles here for dropdowns etc */
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
            flex-direction: column;
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

        /* Custom Report Builder UI */
        .crb-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .crb-modal { width: 95vw; height: 90vh; background: #fff; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .crb-topbar { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .crb-topbar-title { font-size: 18px; font-weight: 600; color: #111827; }
        .crb-topbar-subtitle { font-size: 13px; color: #6b7280; }
        .crb-topbar-actions { display: flex; gap: 12px; align-items: center; }
        .crb-btn { padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; border: none; }
        .crb-btn-generate { background: #3b82f6; color: white; }
        .crb-btn-excel { background: #10b981; color: white; }
        .crb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .crb-close-btn { background: none; border: none; font-size: 20px; color: #6b7280; cursor: pointer; padding: 4px; }
        
        .crb-body { display: flex; flex: 1; overflow: hidden; background: #f9fafb; }
        .crb-panel-filters { width: 300px; padding: 20px; border-right: 1px solid #e5e7eb; overflow-y: auto; background: #fff; }
        .crb-filter-group { margin-bottom: 16px; }
        .crb-filter-label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; text-transform: uppercase; }
        .crb-filter-select, .crb-filter-input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
        .crb-filter-dates { display: none; gap: 8px; margin-top: 8px; }
        .crb-filter-dates.visible { display: flex; flex-direction: column; }
        .crb-circuit-dropdown { position: absolute; background: white; border: 1px solid #d1d5db; border-radius: 6px; width: 100%; max-height: 200px; overflow-y: auto; display: none; z-index: 10; margin-top: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .crb-circuit-dropdown.visible { display: block; }
        .crb-circuit-option { padding: 8px 12px; font-size: 13px; cursor: pointer; }
        .crb-circuit-option:hover { background: #f3f4f6; }
        .crb-circuit-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .crb-circuit-tag { background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: flex; align-items: center; gap: 4px; }
        .crb-circuit-tag-remove { cursor: pointer; font-weight: bold; }
        
        .crb-panel-fields { width: 350px; padding: 20px; border-right: 1px solid #e5e7eb; overflow-y: auto; background: #f9fafb; }
        .crb-panel-title { font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 16px; }
        .crb-field-group { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
        .crb-field-group-title { padding: 12px 16px; background: #f3f4f6; font-weight: 600; font-size: 13px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; }
        .crb-select-all { font-size: 11px; color: #3b82f6; cursor: pointer; font-weight: 500; }
        .crb-sub-section { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
        .crb-sub-section:last-child { border-bottom: none; }
        .crb-sub-section-title { font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; }
        .crb-field-grid { display: flex; flex-direction: column; gap: 8px; }
        .crb-field-item { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
        
        .crb-panel-preview { flex: 1; padding: 20px; overflow: hidden; display: flex; flex-direction: column; background: #fff; }
        .crb-preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .crb-preview-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 12px; }
        .crb-preview-badge { background: #f3f4f6; padding: 2px 8px; border-radius: 12px; font-size: 12px; color: #4b5563; }
        .crb-preview-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9ca3af; }
        .crb-preview-empty i { font-size: 48px; margin-bottom: 16px; }
        .crb-table-wrap { flex: 1; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
        .crb-preview-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .crb-preview-table th, .crb-preview-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: left; white-space: nowrap; }
        .crb-preview-table th { background: #f9fafb; font-weight: 600; color: #374151; position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 0 #e5e7eb; }
        .crb-preview-table tr:hover { background: #f9fafb; }


        /* Charts Grid Styling */
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }
        .chart-card {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            min-height: 300px;
        }
        .chart-title {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
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

    showNexAIModal(query, answer) {
        $('.nexai-chat-modal').remove();
        
        // Parse basic markdown to HTML for a better UI experience
        let formattedAnswer = answer;
        
        // Use frappe.markdown if available, otherwise fallback to simple regex
        if (frappe && frappe.markdown) {
            // Strip the existing <br> so markdown parses properly, then render
            formattedAnswer = frappe.markdown(answer.replace(/<br>/g, "\n"));
        } else {
            // Fallback Regex parser
            formattedAnswer = formattedAnswer
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
                .replace(/- (.*?)<br>/g, '<li>$1</li>') // List items
                .replace(/<li>(.*?)<\/li>/g, '<ul style="margin-top:4px; margin-bottom:4px; padding-left: 20px;"><li>$1</li></ul>') // Wrap lists
                .replace(/<\/ul><ul[^>]*>/g, ''); // Merge adjacent lists
        }

        
        const modalHtml = `
          <div class="nexai-chat-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 1050; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
              <div style="background: white; width: 650px; max-width: 90%; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  
                  <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: bold;">N</div>
                          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">NexAI Intelligence</h3>
                      </div>
                      <button class="nexai-chat-close" style="background: transparent; border: none; font-size: 24px; color: #6b7280; cursor: pointer; padding: 0 8px; line-height: 1;">&times;</button>
                  </div>

                  <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px; max-height: 70vh; overflow-y: auto;">
                      
                      <div style="display: flex; gap: 16px; align-items: flex-start;">
                          <div style="width: 36px; height: 36px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #4b5563; font-weight: 600; font-size: 15px;">U</div>
                          <div style="flex: 1; font-size: 15px; color: #374151; line-height: 1.5; padding-top: 6px; font-weight: 500;">
                              ${query}
                          </div>
                      </div>

                      <div style="display: flex; gap: 16px; align-items: flex-start; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
                          <div style="width: 36px; height: 36px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-weight: 600; font-size: 15px;">N</div>
                          <div style="flex: 1; font-size: 15px; color: #1e293b; line-height: 1.6; padding-top: 6px;">
                              ${formattedAnswer}
                          </div>
                      </div>
                      
                  </div>
              </div>
          </div>
        `;
        
        const $modal = $(modalHtml).appendTo('body');
        
        $modal.find('.nexai-chat-close').on('click', () => $modal.fadeOut(150, () => $modal.remove()));
        $modal.on('click', (e) => {
            if (e.target === $modal[0]) $modal.fadeOut(150, () => $modal.remove());
        });
        
        $modal.hide().fadeIn(150);
    },

    bindEvents() {
      // Suggestion chips
      $(document).off('click', '.nexai-chip').on('click', '.nexai-chip', (e) => {
          $('#nexai-ask-input').val($(e.currentTarget).text());
          $('#nexai-ask-btn').click();
      });

      // Ask NexAI Button
      $(document).off('click', '#nexai-ask-btn').on('click', '#nexai-ask-btn', () => {
          const query = $('#nexai-ask-input').val();
          if (!query) return;
          $('#nexai-ask-btn').text('Thinking...').prop('disabled', true);
          frappe.call({
              method: 'nexapp.api.ask_nexai',
              args: { query: query },
              callback: (r) => {
                  $('#nexai-ask-btn').text('Ask').prop('disabled', false);
                  if (r.message) {
                      this.showNexAIModal(query, r.message);
                  }
                  $('#nexai-ask-input').val('');
              }
          });
      });
      $(document).off('keypress', '#nexai-ask-input').on('keypress', '#nexai-ask-input', (e) => {
          if (e.which === 13) $('#nexai-ask-btn').click();
      });

      // Custom Report Builder Button
      $(document).off('click', '#open-report-builder').on('click', '#open-report-builder', () => {
        this.showCustomReportBuilder();
      });
      // Refresh button click
      $(document).on('click', '#refresh-btn', () => {
        this.manualRefresh();
      });

      // Pagination and filters
      $('#rows-per-page').on('change', (e) => {
        state.page_size = parseInt($(e.target).val(), 10);
        state.page = 1;
        this.loadCharts();
      });

      // Filter inputs - enter key support
      $(document).on('keypress', '.filter-input', (e) => {
        if (e.which === 13) {
          state.page = 1;
          this.loadCharts();
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
          this.loadCharts();
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
            this.loadCharts();
          }, 100);
        } else if (status === 'total') {
          state.page = 1;
          $('.stat-card').removeClass('active');
          $(e.currentTarget).addClass('active');

          setTimeout(() => {
            this.loadCharts();
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
          this.loadCharts()
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
              
              // this.loadTotalStats(); // Disabled, stats now load via loadCharts
              this.loadCharts();
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

    loadCharts() {
        frappe.call({
            method: 'nexapp.api.get_ticket_dashboard_charts',
            callback: (r) => {
                if(r.message) {
                    $('#hd-charts-grid').show();
                    this.renderCharts(r.message);
                }
            }
        });
    },

        
    
    loadNexaiData() {
      frappe.call({
          method: 'nexapp.api.get_nexai_dashboard_data',
          callback: (r) => {
              if (r.message) {
                  const data = r.message;
                  const firp = data.firp;
                  
                  // 1. Facts with Emojis
                  const emojis = ['✔', '⚠', '🔍', '⏰'];
                  let factsHtml = '';
                  firp.facts.forEach((f, i) => {
                      if (f) factsHtml += `<div style="display: flex; gap: 12px;"><span style="color: #6b7280;">${emojis[i%4]}</span><span>${f}</span></div>`;
                  });
                  $('#nexai-facts').html(factsHtml);
                  
                  // Good News
                  if (firp.good_news && firp.good_news.some(n => n)) {
                      let gnHtml = '<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;"><p style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;"><span>👏</span> Good News</p>';
                      firp.good_news.forEach(gn => {
                          if (gn) gnHtml += `<div style="color: #10b981; font-size: 14px; margin-bottom: 4px;">✓ ${gn}</div>`;
                      });
                      gnHtml += '</div>';
                      $('#nexai-facts').append(gnHtml);
                  }

                  // 2. Mission
                  $('#nexai-mission').text(data.mission.title || "Maintain SLA and reduce backlog.");
                  $('#nexai-mission-progress-bar').css('width', (data.mission.progress || 0) + '%');
                  $('#nexai-mission-progress-text').text((data.mission.progress || 0) + '%');

                  // 3. Top 3 Recommendations
                  let recHtml = '';
                  const medals = ['🥇', '🥈', '🥉'];
                  (data.recommendations || []).slice(0, 3).forEach((r, i) => {
                      recHtml += `
                          <div style="display: flex; align-items: center; gap: 16px; background: #f9fafb; padding: 12px 16px; border-radius: 8px;">
                              <div style="font-size: 20px;">${medals[i]}</div>
                              <div style="flex: 1; font-size: 15px; font-weight: 600; color: #1f2937;">${r.action}</div>
                          </div>
                      `;
                  });
                  if(!recHtml) recHtml = '<div style="color: #6b7280; font-size: 14px;">No critical recommendations.</div>';
                  $('#nexai-actions-list').html(recHtml);
                  
                  // 4. Customer Health
                  let chHtml = '';
                  if (data.charts && data.charts.customer_health && data.charts.customer_health.length > 0) {
                      data.charts.customer_health.forEach(c => {
                          chHtml += `
                              <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                                  <div>
                                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 4px; background: ${c.risk === 'Critical' ? '#dc2626' : '#f59e0b'};"></span>
                                          <span style="font-weight: 600; color: #111827;">${c.customer}</span>
                                      </div>
                                      <div style="font-size: 13px; color: #dc2626; margin-left: 16px;">${c.risk}</div>
                                  </div>
                                  <div style="text-align: right; font-size: 12px; color: #6b7280;">
                                      <div>${c.open_tickets} open tickets</div>
                                      <div>${c.breached} breached</div>
                                  </div>
                              </div>
                          `;
                      });
                  } else {
                      chHtml = '<div style="color: #10b981; font-size: 14px; display: flex; align-items: center; gap: 8px;"><span>✔</span> All VIP customers are healthy.</div>';
                  }
                  $('#nexai-customer-health').html(chHtml);

                  // 5. SLA Health Redesigned
                  const sla = data.charts.sla;
                  let slaHtml = '';
                  if (sla.compliance >= 90) {
                      slaHtml = `
                          <div style="display: flex; align-items: center; gap: 8px; color: #10b981; font-weight: 600; margin-bottom: 8px;">
                              <span>✔</span> Healthy
                          </div>
                          <div style="font-size: 48px; font-weight: 800; color: #111827; margin-bottom: 16px;">${sla.compliance}%</div>
                      `;
                  } else {
                      slaHtml = `
                          <div style="display: flex; align-items: center; gap: 8px; color: #dc2626; font-weight: 600; margin-bottom: 8px;">
                              <span>⚠</span> SLA Status Critical
                          </div>
                          <div style="font-size: 48px; font-weight: 800; color: #dc2626; margin-bottom: 16px;">${sla.compliance}%</div>
                      `;
                  }
                  
                  slaHtml += `
                      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                          <div>
                              <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Open</div>
                              <div style="font-size: 18px; font-weight: 600; color: #111827;">${sla.open}</div>
                          </div>
                          <div>
                              <div style="font-size: 12px; color: #f59e0b; font-weight: 600; text-transform: uppercase;">At Risk</div>
                              <div style="font-size: 18px; font-weight: 600; color: #111827;">${sla.at_risk}</div>
                          </div>
                          <div>
                              <div style="font-size: 12px; color: #dc2626; font-weight: 600; text-transform: uppercase;">Breached</div>
                              <div style="font-size: 18px; font-weight: 600; color: #111827;">${sla.breached}</div>
                          </div>
                      </div>
                  `;
                  $('#nexai-sla-container').html(slaHtml);

                  // 6. Live Queue
                  let queueHtml = '';
                  data.charts.queue.forEach(q => {
                      const max = Math.max(...data.charts.queue.map(x => x.count));
                      const width = Math.max(5, (q.count / max) * 100);
                      const color = q.priority === 'Critical' ? '#dc2626' : q.priority === 'High' ? '#f97316' : q.priority === 'Medium' ? '#3b82f6' : '#6b7280';
                      
                      queueHtml += `
                          <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
                              <div style="width: 60px; color: #4b5563;">${q.priority}</div>
                              <div style="flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px;">
                                  <div style="height: 100%; width: ${width}%; background: ${color}; border-radius: 4px;"></div>
                              </div>
                              <div style="width: 30px; text-align: right; font-weight: 600; color: #111827;">${q.count}</div>
                          </div>
                      `;
                  });
                  $('#nexai-queue-bars').html(queueHtml || '<div style="color: #6b7280; font-size: 13px;">No open tickets.</div>');

                  // 7. Aging
                  let agingHtml = '';
                  data.charts.aging.forEach(a => {
                      const max = Math.max(...data.charts.aging.map(x => x.count));
                      const width = Math.max(5, (a.count / max) * 100);
                      const color = a.age_bucket.includes('>') ? '#dc2626' : a.age_bucket.includes('Days') ? '#f59e0b' : '#3b82f6';
                      
                      agingHtml += `
                          <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
                              <div style="width: 80px; color: #4b5563;">${a.age_bucket}</div>
                              <div style="flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px;">
                                  <div style="height: 100%; width: ${width}%; background: ${color}; border-radius: 4px;"></div>
                              </div>
                              <div style="width: 30px; text-align: right; font-weight: 600; color: #111827;">${a.count}</div>
                          </div>
                      `;
                  });
                  $('#nexai-aging-bars').html(agingHtml || '<div style="color: #6b7280; font-size: 13px;">No tickets found.</div>');

                  // 8. Agent Workload
                  let wlHtml = '';
                  
                  // 9. Render Trend Chart
                  if (data.charts.trend && data.charts.trend.length > 0) {
                      const labels = data.charts.trend.map(t => t.hour);
                      const values = data.charts.trend.map(t => t.count);
                      
                      new frappe.Chart("#nexai-incoming-trend-chart", {
                          data: {
                              labels: labels,
                              datasets: [
                                  {
                                      name: "Tickets",
                                      values: values
                                  }
                              ]
                          },
                          title: "",
                          type: 'line',
                          height: 250,
                          colors: ['#8b5cf6'],
                          lineOptions: {
                              regionFill: 1, // fill area under line
                              hideDots: 0
                          },
                          axisOptions: {
                              xIsSeries: 1
                          }
                      });
                  } else {
                      $('#nexai-incoming-trend-chart').html('<div style="color: #6b7280; text-align: center; padding: 40px 0;">No tickets in the last 12 hours.</div>');
                  }

                  data.charts.workload.forEach(w => {
                      const color = w.count > 10 ? '#dc2626' : w.count > 5 ? '#f59e0b' : '#10b981';
                      wlHtml += `
                          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                              <div style="display: flex; align-items: center; gap: 8px;">
                                  <div style="width: 24px; height: 24px; border-radius: 12px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #4b5563;">
                                      ${w.agent_name.charAt(0)}
                                  </div>
                                  <span style="color: #374151; font-weight: 500;">${w.agent_name}</span>
                              </div>
                              <div style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                                  ${w.count} tickets
                              </div>
                          </div>
                      `;
                  });
                  $('#nexai-workload-list').html(wlHtml || '<div style="color: #6b7280; font-size: 13px;">No assignments found.</div>');

              }
          }
      });
    },
async loadData() {
      try {
        $('#table-body').html('<tr><td colspan="6" style="text-align:center;padding:40px;color:#6b7280;">Loading tickets...</td></tr>');

        const filters = this.getFilters();
        const response = await frappe.call({
          method: "nexapp.api.get_ticket_dashboard_charts",
          args: {
            filters: JSON.stringify(filters)
          }
        });

        if (response && response.message && response.message.recent_tickets) {
          state.total = response.message.recent_tickets.length || 0;
          const tickets = response.message.recent_tickets || [];
          this.renderTable(tickets);
          
          // Hide pagination since we are just showing recent tickets
          $('#table-info').text(`Showing latest ${tickets.length} tickets from last 24 hours`);
          $('.pagination-controls').hide();
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
        let lastUpdatedStr = '-';
        if(ticket.modified) {
            const modDate = new Date(ticket.modified);
            lastUpdatedStr = modDate.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
        }
        
        const row = $(`
          <tr data-ticket="${utils.escapeHtml(ticket.name)}" style="font-size: 13px; color: #374151;">
            <td style="padding: 12px 8px;"><strong>${utils.escapeHtml(ticket.name)}</strong></td>
            <td style="padding: 12px 8px;">${utils.escapeHtml(ticket.custom_channel || '-')}</td>
            <td style="padding: 12px 8px;">${utils.escapeHtml(ticket.custom_circuit_id || '-')}</td>
            <td style="padding: 12px 8px;">${utils.escapeHtml(ticket.customer || '-')}</td>
            <td style="padding: 12px 8px;">${statusBadge}</td>
            <td style="padding: 12px 8px; color: #6b7280; font-size: 12px;">${lastUpdatedStr}</td>
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