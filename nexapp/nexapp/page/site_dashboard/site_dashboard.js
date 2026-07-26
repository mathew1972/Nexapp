frappe.provide('frappe.pages');

frappe.pages['site-dashboard'] = frappe.pages['site-dashboard'] || {};

frappe.pages['site-dashboard'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Project Management Dashboard'),
        single_column: true
    });

    var dashboard = new SiteDashboardRenderer(wrapper, page);
    dashboard.init();
}

function SiteDashboardRenderer(wrapper, page) {
    this.wrapper = $(wrapper);
    this.page = page;
    this.filters = {};

    this.init = function () {
        this.setup_layout();
        this.setup_filters();
        this.setup_page_actions();
        this.setup_events();
        this.refresh();
    };

    this.setup_page_actions = function () {
        this.page.add_inner_button(__('Custom Report Builder'), () => {
            this.show_custom_report_builder();
        });
    };

    this.setup_layout = function () {
        const html = `
            <div class="site-dashboard-container">
                <div class="kpi-grid">
                    <div class="kpi-card clickable" id="card-wip-sites">
                        <div class="kpi-label">${__('Work In Process')}</div>
                        <div id="metric-wip-sites" class="kpi-value">0</div>
                    </div>
                    <div class="kpi-card clickable" id="card-live-sites">
                        <div class="kpi-label">${__('Delivery & Live')}</div>
                        <div id="metric-live-sites" class="kpi-value">0</div>
                    </div>
                    <div class="kpi-card clickable" id="card-wip-age">
                        <div class="kpi-label">${__('Avg. WIP Age (Days)')}</div>
                        <div id="metric-avg-wip-age" class="kpi-value">0</div>
                    </div>
                    <div class="kpi-card clickable" id="card-total-circuits">
                        <div class="kpi-label">${__('Total Circuits')}</div>
                        <div id="metric-total-circuits" class="kpi-value">0</div>
                    </div>
                </div>

                <div class="charts-grid">
                    <div class="chart-card">
                        <div class="chart-title">${__('WIP Status Distribution')}</div>
                        <div id="chart-status-distribution"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('Work In Process by Territory')}</div>
                        <div id="chart-territory-backlog"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('Circuit Delivered')}</div>
                        <div id="chart-delivered-6-months"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('LMS Delivered last 6 Month')}</div>
                        <div id="chart-lms-delivered-6-months"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('Top LMS Supplier last 6 Month')}</div>
                        <div id="chart-lms-supplier-6-months"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('Complete Site Status Breakdown')}</div>
                        <div id="chart-lms-stage"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('Bandwidth Type last 6 Month')}</div>
                        <div id="chart-lms-bandwidth-6-months"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('Delivered and Live by Territory')}</div>
                        <div id="chart-delivered-live-territory"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('Circuit Cancelled')}</div>
                        <div id="chart-cancelled-6-months"></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">${__('Circuit Disconnection In Process/ Disconnected')}</div>
                        <div id="chart-disconnections-6-months"></div>
                    </div>
                </div>

                <div class="recent-sites-card">
                    <div class="chart-title">${__('Sites Updated in Last 24 Hours')}</div>
                    <div class="table-responsive">
                        <table class="recent-sites-table">
                            <thead>
                                <tr>
                                    <th>${__('Circuit')}</th>
                                    <th>${__('Site Name')}</th>
                                    <th>${__('Customer')}</th>
                                    <th>${__('Updated By')}</th>
                                    <th>${__('Status')}</th>
                                    <th>${__('Last Updated')}</th>
                                </tr>
                            </thead>
                            <tbody id="recent-sites-list">
                                <tr><td colspan="6" class="text-center">${__('Loading...')}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        this.page.main.html(html);
    };

    this.setup_filters = function () {
        this.page.add_field({
            fieldname: 'territory',
            label: __('Territory'),
            fieldtype: 'Link',
            options: 'Territory',
            on_change: () => {
                this.filters.territory = this.page.fields_dict.territory.get_value();
                this.refresh();
            }
        });

        this.page.add_field({
            fieldname: 'customer',
            label: __('Customer'),
            fieldtype: 'Link',
            options: 'Customer',
            on_change: () => {
                this.filters.customer = this.page.fields_dict.customer.get_value();
                this.refresh();
            }
        });
    };

    this.setup_events = function () {
        this.wrapper.find('#card-wip-age').on('click', () => {
            this.show_site_drilldown('wip', __('Work In Process Aging Details'));
        });
        this.wrapper.find('#card-wip-sites').on('click', () => {
            this.show_site_drilldown('wip', __('Work In Process Sites'));
        });
        this.wrapper.find('#card-live-sites').on('click', () => {
            this.show_site_drilldown('live', __('Delivery & Live Sites'));
        });
        this.wrapper.find('#card-total-circuits').on('click', () => {
            this.show_total_circuits_filter();
        });
    };
    this.show_total_circuits_filter = function () {
        frappe.call({
            method: 'nexapp.nexapp.page.site_dashboard.site_dashboard.get_total_circuits_filter_options',
            callback: (r) => {
                if (!r.message) return;
                const opts = r.message;

                const filter_dlg = new frappe.ui.Dialog({
                    title: __('Total Circuits - Filter'),
                    fields: [
                        {
                            fieldname: 'date_range',
                            label: __('Circuit From'),
                            fieldtype: 'Select',
                            options: 'All\nCurrent Month\nLast 3 Months\nCustom',
                            default: 'All',
                            change: function () {
                                const val = filter_dlg.get_value('date_range');
                                filter_dlg.fields_dict.from_date.toggle(val === 'Custom');
                                filter_dlg.fields_dict.to_date.toggle(val === 'Custom');
                            }
                        },
                        {
                            fieldname: 'from_date',
                            label: __('From Date'),
                            fieldtype: 'Date',
                            depends_on: 'eval:doc.date_range=="Custom"',
                            hidden: 1
                        },
                        {
                            fieldname: 'to_date',
                            label: __('To Date'),
                            fieldtype: 'Date',
                            depends_on: 'eval:doc.date_range=="Custom"',
                            hidden: 1
                        },
                        { fieldtype: 'Column Break' },
                        {
                            fieldname: 'customer',
                            label: __('Customer'),
                            fieldtype: 'Select',
                            options: ['All', ...opts.customers].join('\n'),
                            default: 'All'
                        },
                        {
                            fieldname: 'site_status',
                            label: __('Site Status'),
                            fieldtype: 'Select',
                            options: ['All', ...opts.statuses].join('\n'),
                            default: 'All'
                        },
                        {
                            fieldname: 'customer_type',
                            label: __('Customer Type'),
                            fieldtype: 'Select',
                            options: ['All', ...opts.customer_types].join('\n'),
                            default: 'All'
                        }
                    ],
                    primary_action_label: __('Show Data'),
                    primary_action: (values) => {
                        filter_dlg.hide();
                        this.fetch_total_circuits(values);
                    }
                });
                filter_dlg.show();
            }
        });
    };

    // ══════════════════════════════════════════════════
    //  Custom Report Builder — Full-screen Native Modal
    // ══════════════════════════════════════════════════

    this._crb_selected_circuits = [];
    this._crb_report_data = null;
    this._crb_filters = null;
    this._crb_fields = null;

    this.show_custom_report_builder = function () {
        frappe.call({
            method: 'nexapp.nexapp.page.site_dashboard.site_dashboard.get_total_circuits_filter_options',
            callback: (r) => {
                if (!r.message) return;
                this._crb_selected_circuits = [];
                this._crb_report_data = null;
                this._crb_build_modal(r.message);
            }
        });
    };

    this._crb_build_modal = function (opts) {
        // Remove existing
        $('.crb-overlay').remove();

        const self = this;
        const status_options = (opts.statuses || []).map(s => `<option value="${s}">${s}</option>`).join('');
        const lms_status_options = (opts.lms_stages || []).map(s => `<option value="${s}">${s}</option>`).join('');
        const customer_options = (opts.customers || []).map(c => `<option value="${c}">${c}</option>`).join('');

        const field_groups = [
            {
                main_label: 'SITE', icon: 'fa-building', doctype: 'Site',
                sections: [
                    {
                        label: 'Branch Information',
                        fields: [
                            { id: 'territory', label: 'Territory' },
                            { id: 'site_id__legal_code', label: 'Site ID / Legal Code' },
                            { id: 'site_type', label: 'Site Type' },
                            { id: 'order_type', label: 'Order Type' },
                            { id: 'customer_type', label: 'Customer Type' },
                            { id: 'lms_type', label: 'Service Type' },
                            { id: 'stock_stage', label: 'Stock Stage' },
                            { id: 'lms_stage', label: 'LMS Stage' },
                            { id: 'solution_name', label: 'Solution Name' },
                            { id: 'creation', label: 'Site Created Date' },
                            { id: 'status_timestamp', label: 'Site Status Timestamp' },
                            { id: 'cancel_reason', label: 'Cancel Reason' },
                            { id: 'circuit_delivery_date', label: 'Circuit Delivery Date' }
                        ]
                    },
                    {
                        label: 'Project Review',
                        fields: [
                            { id: 'project_review', label: 'Project Review' },
                            { id: 'lms_review', label: 'LMS Review' },
                            { id: 'task_ownership', label: 'Task Ownership' }
                        ]
                    },
                    {
                        label: 'Central Spoke Contact Information',
                        fields: [
                            { id: 'central_spoke', label: 'Central Spoke' },
                            { id: 'mobile', label: 'Mobile' },
                            { id: 'central_email', label: 'Central Email' }
                        ]
                    },
                    {
                        label: 'Branch Contact Information',
                        fields: [
                            { id: 'contact_person', label: 'Contact Person' },
                            { id: 'primary_contact_mobile', label: 'Primary Contact Mobile' },
                            { id: 'email', label: 'Email' }
                        ]
                    },
                    {
                        label: 'Site Address Information',
                        fields: [
                            { id: 'address_street', label: 'Address/ Street' },
                            { id: 'city', label: 'City' },
                            { id: 'pincode', label: 'Pincode' },
                            { id: 'state', label: 'State' }
                        ]
                    }
                ]
            },
            {
                label: 'Lastmile Services Master', icon: 'fa-link', doctype: 'Lastmile Services Master',
                main_label: 'LASTMILE SERVICES MASTER',
                sections: [
                    {
                        label: 'LMS INFORMATION',
                        fields: [
                            { id: 'lms_id', label: 'LMS ID' },
                            { id: 'supplier', label: 'Supplier' },
                            { id: 'lms_stage', label: 'LMS Stage' },
                            { id: 'expected_delivery_date', label: 'Expected Delivery Date' },
                            { id: 'bandwith_type', label: 'Bandwidth Type' },
                            { id: 'lms_brandwith_name', label: 'LMS Bandwidth Name' },
                            { id: 'media', label: 'Media' },
                            { id: 'lms_delivery_date', label: 'LMS Delivery Date' },
                            { id: 'lms_creation', label: 'LMS Created Date' }
                        ]
                    },
                    {
                        label: 'LMS SUPPLIER COSTING',
                        fields: [
                            { id: 'item_name', label: 'Item Name' },
                            { id: 'item_rate', label: 'Item Rate' },
                            { id: 'qty', label: 'Qty' },
                            { id: 'total_amount', label: 'Total Amount' }
                        ]
                    },
                    {
                        label: 'PO INFORMATION',
                        fields: [
                            { id: 'po_requeste_id', label: 'PO Requeste ID' },
                            { id: 'po_requested_date', label: 'PO Requested Date' },
                            { id: 'po_released_datetime', label: 'PO Released Date' },
                            { id: 'po_number', label: 'PO Number' }
                        ]
                    },
                    {
                        label: 'ESCALATION METRIX',
                        fields: [
                            { id: 'level', label: 'Level' },
                            { id: 'link_zitr', label: 'Contact Name' },
                            { id: 'contact_phone', label: 'Contact Phone' },
                            { id: 'link_syot', label: 'Contact Email' },
                            { id: 'designation', label: 'Designation' },
                            { id: 'department', label: 'Department' }
                        ]
                    }
                ]
            },
            {
                label: 'Provisioning', icon: 'fa-cogs',
                fields: [
                    { id: 'provisioning_status', label: 'Provisioning Status' },
                    { id: 'provisioning_completed_date', label: 'Provisioning Completed Date' },
                    { id: 'provisioning_partially_completed_date', label: 'Prov. Partially Completed' },
                    { id: 'branch_router_ip', label: 'Branch Router IP' },
                    { id: 'provisioning_creation', label: 'Provisioning Created Date' }
                ]
            },
            {
                label: 'Shipment', icon: 'fa-truck', doctype: 'Shipment',
                fields: [
                    { id: 'pickup_from', label: 'Pickup from' },
                    { id: 'custom_person_name', label: 'Site Contact Person' },
                    { id: 'delivery_contact', label: 'Site Contact' },
                    { id: 'shipment_type', label: 'Shipment Type' },
                    { id: 'pickup_type', label: 'Pickup Type' },
                    { id: 'pickup_date', label: 'Pickup Date' },
                    { id: 'carrier', label: 'Carrier' },
                    { id: 'carrier_service', label: 'Carrier Service' },
                    { id: 'awb_number', label: 'AWB Number' },
                    { id: 'tracking_status', label: 'Tracking Status' },
                    { id: 'custom_delivery_date', label: 'Delivery Date' },
                    { id: 'shipment_creation', label: 'Shipment Created Date' }
                ]
            }
        ];

        let fields_html = '';
        field_groups.forEach(g => {
            if (g.main_label) {
                // Nested structure for SITE
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
            } else {
                // Standard flat structure
                const items = g.fields.map(f =>
                    `<label class="crb-field-item">
                        <input type="checkbox" class="crb-field-cb" data-doctype="${g.doctype || g.label}" data-field="${f.id}">
                        <span>${f.label}</span>
                    </label>`
                ).join('');
                fields_html += `
                    <div class="crb-field-group">
                        <div class="crb-field-group-title">
                            <i class="fa ${g.icon}"></i> ${g.label}
                            <span class="crb-select-all" data-group="${g.label}">Select All</span>
                        </div>
                        <div class="crb-field-grid">${items}</div>
                    </div>`;
            }
        });

        const overlay = $(`
        <div class="crb-overlay">
            <div class="crb-modal">
                <!-- Top Bar -->
                <div class="crb-topbar">
                    <div class="crb-topbar-left">
                        <div>
                            <div class="crb-topbar-title">Custom Site Report Builder</div>
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

                <!-- 3-Panel Body -->
                <div class="crb-body">
                    <!-- LEFT: Filters -->
                    <div class="crb-panel-filters">
                        <div class="crb-filter-section">
                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Site Created Date</div>
                                <select class="crb-filter-select" id="crb-date-range">
                                    <option value="All">All</option>
                                    <option value="Current Month">Current Month</option>
                                    <option value="Last 3 Months">Last 3 Months</option>
                                    <option value="Custom">Custom</option>
                                </select>
                                <div class="crb-filter-dates" id="crb-custom-dates">
                                    <input type="date" class="crb-filter-input" id="crb-from-date" placeholder="From">
                                    <input type="date" class="crb-filter-input" id="crb-to-date" placeholder="To">
                                </div>
                            </div>

                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Customer</div>
                                <select class="crb-filter-select" id="crb-customer">
                                    <option value="All">All</option>
                                    ${customer_options}
                                </select>
                            </div>

                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Site Status</div>
                                <select class="crb-filter-select" id="crb-status">
                                    <option value="All">All</option>
                                    ${status_options}
                                </select>
                            </div>

                            <div class="crb-filter-group">
                                <div class="crb-filter-label">Circuit Delivery Date</div>
                                <select class="crb-filter-select" id="crb-delivery-date-range">
                                    <option value="All">All</option>
                                    <option value="Current Month">Current Month</option>
                                    <option value="Last 3 Months">Last 3 Months</option>
                                    <option value="Custom">Custom</option>
                                </select>
                                <div class="crb-filter-dates" id="crb-delivery-custom-dates">
                                    <input type="date" class="crb-filter-input" id="crb-delivery-from-date" placeholder="From">
                                    <input type="date" class="crb-filter-input" id="crb-delivery-to-date" placeholder="To">
                                </div>
                            </div>
                        </div>

                        <div class="crb-filter-section lms-section">
                            <div class="crb-filter-group">
                                <div class="crb-filter-label">LMS Delivery Date</div>
                                <select class="crb-filter-select" id="crb-lms-delivery-date-range">
                                    <option value="All">All</option>
                                    <option value="Current Month">Current Month</option>
                                    <option value="Last 3 Months">Last 3 Months</option>
                                    <option value="Custom">Custom</option>
                                </select>
                                <div class="crb-filter-dates" id="crb-lms-delivery-custom-dates">
                                    <input type="date" class="crb-filter-input" id="crb-lms-delivery-from-date" placeholder="From">
                                    <input type="date" class="crb-filter-input" id="crb-lms-delivery-to-date" placeholder="To">
                                </div>
                            </div>

                            <div class="crb-filter-group">
                                <div class="crb-filter-label">LMS Status</div>
                                <select class="crb-filter-select" id="crb-lms-status">
                                    <option value="All">All</option>
                                    ${lms_status_options}
                                </select>
                            </div>
                        </div>

                        <div class="crb-filter-group">
                            <div class="crb-filter-label">Circuit ID</div>
                            <div class="crb-circuit-search">
                                <i class="fa fa-search crb-circuit-search-icon"></i>
                                <input type="text" class="crb-circuit-search-input" id="crb-circuit-search" placeholder="Search Circuit ID..." autocomplete="off">
                                <div class="crb-circuit-dropdown" id="crb-circuit-dropdown"></div>
                            </div>
                            <div class="crb-circuit-tags" id="crb-circuit-tags"></div>
                        </div>
                    </div>

                    <!-- CENTER: Fields -->
                    <div class="crb-panel-fields">
                        <div class="crb-panel-title">Select Report Columns</div>
                        <div class="crb-field-groups">${fields_html}</div>
                    </div>

                    <!-- RIGHT: Preview -->
                    <div class="crb-panel-preview">
                        <div class="crb-preview-header">
                            <div class="crb-preview-title">
                                Report Preview <span class="crb-preview-badge" id="crb-record-count">0 Records</span>
                            </div>
                            <div class="crb-preview-date-range" id="crb-date-info"></div>
                        </div>
                        <div class="crb-preview-empty" id="crb-preview-empty">
                            <i class="fa fa-table"></i>
                            <p>Select fields and click <b>Generate Report</b> to see data here</p>
                        </div>
                        <div class="crb-preview-table-wrap" id="crb-table-wrap" style="display:none;">
                            <table class="crb-preview-table" id="crb-preview-table">
                                <thead id="crb-thead"></thead>
                                <tbody id="crb-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Status Bar -->
                <div class="crb-statusbar">
                    <div class="crb-fixed-fields">
                        <span>Fixed columns:</span>
                        <span class="crb-fixed-chip">Circuit ID</span>
                        <span class="crb-fixed-chip">Site Name</span>
                        <span class="crb-fixed-chip">Customer</span>
                        <span class="crb-fixed-chip">Site Status</span>
                        <span class="crb-fixed-chip">Assigned Name</span>
                    </div>
                    <div id="crb-status-msg" style="font-style: italic;"></div>
                </div>
            </div>
        </div>`);

        $('body').append(overlay);

        // ── Events ──
        // Close
        $('#crb-close').on('click', () => overlay.remove());
        overlay.on('click', (e) => { if ($(e.target).hasClass('crb-overlay')) overlay.remove(); });
        $(document).on('keydown.crb', (e) => { if (e.key === 'Escape') { overlay.remove(); $(document).off('keydown.crb'); } });

        // Date range toggle
        $('#crb-date-range').on('change', function () {
            $('#crb-custom-dates').toggleClass('visible', $(this).val() === 'Custom');
        });

        $('#crb-delivery-date-range').on('change', function () {
            $('#crb-delivery-custom-dates').toggleClass('visible', $(this).val() === 'Custom');
        });

        $('#crb-lms-delivery-date-range').on('change', function () {
            $('#crb-lms-delivery-custom-dates').toggleClass('visible', $(this).val() === 'Custom');
        });

        // Select All toggle
        overlay.on('click', '.crb-select-all', function () {
            const group = $(this).data('group');
            const cbs = overlay.find(`.crb-field-cb[data-doctype="${group}"]`);
            const allChecked = cbs.filter(':checked').length === cbs.length;
            cbs.prop('checked', !allChecked);
            $(this).text(allChecked ? 'Select All' : 'Deselect All');
        });

        // Circuit ID search
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

        // Close dropdown on outside click
        overlay.on('click', function (e) {
            if (!$(e.target).closest('.crb-circuit-search').length) {
                $('#crb-circuit-dropdown').removeClass('visible');
            }
        });

        // Generate
        $('#crb-btn-generate').on('click', () => this._crb_generate(overlay));

        // Excel Download
        $('#crb-btn-excel').on('click', () => this._crb_download_excel());
    };

    this._crb_render_circuit_tags = function () {
        const html = this._crb_selected_circuits.map(id =>
            `<span class="crb-circuit-tag">${id}<span class="crb-circuit-tag-remove" data-id="${id}">&times;</span></span>`
        ).join('');
        $('#crb-circuit-tags').html(html);
    };

    this._crb_get_filters = function () {
        const f = {
            date_range: $('#crb-date-range').val(),
            delivery_date_range: $('#crb-delivery-date-range').val(),
            lms_delivery_date_range: $('#crb-lms-delivery-date-range').val(),
            lms_status: $('#crb-lms-status').val(),
            customer: $('#crb-customer').val(),
            site_status: $('#crb-status').val()
        };
        if (f.date_range === 'Custom') {
            f.from_date = $('#crb-from-date').val();
            f.to_date = $('#crb-to-date').val();
        }
        if (f.delivery_date_range === 'Custom') {
            f.delivery_from_date = $('#crb-delivery-from-date').val();
            f.delivery_to_date = $('#crb-delivery-to-date').val();
        }
        if (f.lms_delivery_date_range === 'Custom') {
            f.lms_delivery_from_date = $('#crb-lms-delivery-from-date').val();
            f.lms_delivery_to_date = $('#crb-lms-delivery-to-date').val();
        }
        if (this._crb_selected_circuits.length > 0) {
            f.circuit_id = this._crb_selected_circuits.join(',');
        }
        return f;
    };

    this._crb_get_fields = function (overlay) {
        const selected = { 'Site': ['circuit_id', 'site_name', 'customer', 'site_status', 'assigned_name'] };
        overlay.find('.crb-field-cb:checked').each(function () {
            const dt = $(this).data('doctype');
            const f = $(this).data('field');
            if (!selected[dt]) selected[dt] = [];
            if (!selected[dt].includes(f)) selected[dt].push(f);
        });
        return selected;
    };

    this._crb_generate = function (overlay) {
        const filters = this._crb_get_filters();
        const fields = this._crb_get_fields(overlay);

        // Show loading spinner in preview panel
        $('#crb-preview-empty').hide();
        $('#crb-table-wrap').hide();
        $('#crb-record-count').text('...');
        $('#crb-date-info').text('');
        $('#crb-status-msg').html('<i class="fa fa-circle-o-notch fa-spin"></i> Generating...');
        $('#crb-btn-generate').prop('disabled', true).html('<i class="fa fa-circle-o-notch fa-spin"></i> Generating...');

        // Show spinner inside preview area
        const loader = $(`
            <div class="crb-loading" id="crb-loader">
                <div class="crb-spinner"></div>
                <div style="font-size: 13px; font-weight: 600;">Generating Report...</div>
                <div style="font-size: 11px;">Please wait while we fetch your data</div>
            </div>
        `);
        $('.crb-panel-preview').append(loader);

        frappe.call({
            method: 'nexapp.nexapp.page.site_dashboard.site_dashboard.get_custom_report_data',
            args: { filters: filters, fields: fields },
            callback: (r) => {
                // Remove loader and restore button
                $('#crb-loader').remove();
                $('#crb-btn-generate').prop('disabled', false).html('<i class="fa fa-play"></i> Generate Report');

                if (r.message && r.message.length > 0) {
                    this._crb_report_data = r.message;
                    this._crb_filters = filters;
                    this._crb_fields = fields;
                    this._crb_render_table(r.message, filters);
                    $('#crb-btn-excel').prop('disabled', false);
                    $('#crb-status-msg').html('<i class="fa fa-check" style="color:#10b981;"></i> Report generated successfully');
                } else {
                    $('#crb-preview-empty').show().find('p').html('No data found for the selected criteria.');
                    $('#crb-table-wrap').hide();
                    $('#crb-btn-excel').prop('disabled', true);
                    $('#crb-status-msg').text('No results');
                    this._crb_report_data = null;
                }
            }
        });
    };

    this._crb_render_table = function (data, filters) {
        const all_fields = {
            'circuit_id': 'Circuit ID', 'customer': 'Customer', 'site_status': 'Site Status',
            'assigned_name': 'Assigned Name',
            'customer_type': 'Customer Type', 'site_name': 'Site Name', 'order_type': 'Order Type',
            'site_type': 'Site Type', 'stock_stage': 'Stock Stage', 'site_lms_stage': 'Site LMS Stage',
            'site_id__legal_code': 'Site ID / Legal Code', 'service_type': 'Service Type',
            'solution_name': 'Solution Name',
            'project_review': 'Project Review', 'lms_review': 'LMS Review', 'task_ownership': 'Task Ownership',
            'central_spoke': 'Central Spoke', 'mobile': 'Mobile',
            'central_email': 'Central Email', 'contact_person': 'Contact Person',
            'primary_contact_mobile': 'Primary Contact Mobile', 'address_street': 'Address/ Street',
            'city': 'City', 'state': 'State', 'circuit_delivery_date': 'Circuit Delivery Date',
            'supplier': 'Supplier', 'lms_master_stage': 'LMS Stage (Master)',
            'expected_delivery_date': 'Expected Delivery Date', 'bandwith_type': 'Bandwidth Type',
            'lms_brandwith_name': 'LMS Bandwidth Name', 'media': 'Media',
            'lms_id': 'LMS ID',
            'lms_delivery_date': 'LMS Delivery Date',
            'lms_creation': 'LMS Created Date',
            'email': 'Email', 'pincode': 'Pincode', 'territory': 'Territory',
            'provisioning_status': 'Provisioning Status',
            'provisioning_completed_date': 'Provisioning Completed Date',
            'provisioning_partially_completed_date': 'Prov. Partially Completed',
            'branch_router_ip': 'Branch Router IP',
            'provisioning_creation': 'Provisioning Created Date',
            'pickup_from': 'Pickup from', 'custom_person_name': 'Site Contact Person',
            'delivery_contact': 'Site Contact', 'shipment_type': 'Shipment Type',
            'pickup_type': 'Pickup Type', 'pickup_date': 'Pickup Date',
            'carrier': 'Carrier', 'carrier_service': 'Carrier Service',
            'awb_number': 'AWB Number', 'tracking_status': 'Tracking Status',
            'custom_delivery_date': 'Delivery Date',
            'shipment_creation': 'Shipment Created Date',
            'item_name': 'Item Name', 'item_rate': 'Item Rate', 'qty': 'Qty', 'total_amount': 'Total Amount',
            'po_requeste_id': 'PO Requeste ID', 'po_requested_date': 'PO Requested Date',
            'po_released_datetime': 'PO Released Date', 'po_number': 'PO Number',
            'level': 'Level', 'link_zitr': 'Contact Name', 'contact_phone': 'Contact Phone',
            'link_syot': 'Contact Email', 'designation': 'Designation', 'department': 'Department',
            'creation': 'Site Created Date',
            'status_timestamp': 'Site Status Timestamp',
            'cancel_reason': 'Cancel Reason'
        };

        const keys = Object.keys(data[0]).filter(k => k !== 'name');
        let thead = '<tr>' + keys.map(k => `<th>${all_fields[k] || k}</th>`).join('') + '</tr>';
        let tbody = '';
        data.forEach(row => {
            tbody += '<tr>';
            keys.forEach(k => {
                let val = row[k] || '-';
                if (k === 'circuit_id') {
                    val = `<a href="/app/site/${row[k]}" target="_blank">${row[k]}</a>`;
                } else if (val && val !== '-' && (k.includes('date') || k.includes('creation'))) {
                    try { val = frappe.datetime.str_to_user(val); } catch (e) { }
                }
                tbody += `<td>${val}</td>`;
            });
            tbody += '</tr>';
        });

        $('#crb-thead').html(thead);
        $('#crb-tbody').html(tbody);
        $('#crb-preview-empty').hide();
        $('#crb-table-wrap').show();
        $('#crb-record-count').text(data.length + ' Records');

        // Date range info
        let info = '';
        if (filters && filters.date_range && filters.date_range !== 'All') {
            let from_d = '', to_d = frappe.datetime.now_date();
            if (filters.date_range === 'Current Month') from_d = frappe.datetime.month_start();
            else if (filters.date_range === 'Last 3 Months') from_d = frappe.datetime.add_months(to_d, -3);
            else if (filters.date_range === 'Custom') { from_d = filters.from_date; to_d = filters.to_date; }
            if (from_d && to_d) info = frappe.datetime.str_to_user(from_d) + ' to ' + frappe.datetime.str_to_user(to_d);
        }
        $('#crb-date-info').text(info);
    };

    this._crb_download_excel = function () {
        if (!this._crb_filters || !this._crb_fields) return;
        let params = {
            filters: JSON.stringify(this._crb_filters),
            fields: JSON.stringify(this._crb_fields)
        };
        const url = frappe.request.url + '?cmd=nexapp.nexapp.page.site_dashboard.site_dashboard.download_custom_report_xlsx&' + $.param(params);
        window.open(url, '_blank');
    };


    this.fetch_total_circuits = function (values) {
        frappe.call({
            method: 'nexapp.nexapp.page.site_dashboard.site_dashboard.get_total_circuits_data',
            args: values,
            callback: (r) => {
                if (r.message && r.message.length > 0) {
                    this.render_total_circuits_dialog(r.message, values);
                } else {
                    frappe.msgprint(__('No circuits found for the selected filters.'));
                }
            }
        });
    };

    this.render_total_circuits_dialog = function (data, filter_values) {
        const td = 'padding: 4px; border: 1px solid #ddd;';
        const th = 'padding: 6px; border: 1px solid #cbd5e1; text-align: left;';
        let rows = '';
        data.forEach(d => {
            rows += `
                <tr style="font-size: 10px;">
                    <td style="${td}"><a href="/app/site/${d.name}">${d.name}</a></td>
                    <td style="${td}">${d.site_name || '-'}</td>
                    <td style="${td}">${d.customer_name || '-'}</td>
                    <td style="${td}">${d.customer_type || '-'}</td>
                    <td style="${td}">${d.solution_name || '-'}</td>
                    <td style="${td}">${d.site_status || '-'}</td>
                    <td style="${td}">${d.delivery_date ? frappe.datetime.str_to_user(d.delivery_date).split(' ')[0] : '-'}</td>
                    <td style="${td}">${d.city || '-'}</td>
                    <td style="${td}">${d.state || '-'}</td>
                    <td style="${td}">${d.territory || '-'}</td>
                </tr>
            `;
        });

        const table_html = `
            <div style="margin-bottom: 10px; font-size: 12px; color: #64748b;">Total: <b>${data.length}</b> circuits</div>
            <div style="overflow-x: auto; max-height: 400px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #333;">
                    <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 1;">
                        <tr>
                            <th style="${th}">Circuit</th>
                            <th style="${th}">Site Name</th>
                            <th style="${th}">Customer</th>
                            <th style="${th}">Type</th>
                            <th style="${th}">Solution</th>
                            <th style="${th}">Status</th>
                            <th style="${th}">Delivery Date</th>
                            <th style="${th}">City</th>
                            <th style="${th}">State</th>
                            <th style="${th}">Territory</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        const d = new frappe.ui.Dialog({
            title: __('Total Circuits') + ' (' + data.length + ')',
            size: 'extra-large',
            primary_action_label: __('Download Excel'),
            primary_action: () => {
                let params = new URLSearchParams(filter_values).toString();
                const url = frappe.request.url + '?cmd=nexapp.nexapp.page.site_dashboard.site_dashboard.download_total_circuits_xlsx&' + params;
                window.open(url, '_blank');
            }
        });
        d.set_secondary_action(() => d.hide());
        d.set_secondary_action_label(__('Close'));
        d.show();
        d.$wrapper.find('.modal-body').html(table_html);
    };

    this.show_site_drilldown = function (card_type, title) {
        frappe.call({
            method: 'nexapp.nexapp.page.site_dashboard.site_dashboard.get_site_drilldown_data',
            args: { card_type: card_type, filters: this.filters },
            callback: (r) => {
                if (r.message && r.message.length > 0) {
                    this.render_drilldown_dialog(r.message, title, card_type);
                } else {
                    frappe.msgprint(__('No sites found for the current filters.'));
                }
            }
        });
    };

    this.render_drilldown_dialog = function (data, title, card_type) {
        let rows = '';
        let headers = '';
        let col_count = 10;
        const td = 'padding: 4px; border: 1px solid #ddd;';
        const th = 'padding: 6px; border: 1px solid #cbd5e1; text-align: left;';

        if (card_type === 'live') {
            col_count = 9;
            headers = `
                <th style="${th}">Circuit</th>
                <th style="${th}">Site Name</th>
                <th style="${th}">Customer</th>
                <th style="${th}">Type</th>
                <th style="${th}">Solution</th>
                <th style="${th}">Delivery Date</th>
                <th style="${th}">City</th>
                <th style="${th}">State</th>
                <th style="${th}">Territory</th>
            `;
            if (data && data.length > 0) {
                data.forEach(d => {
                    rows += `
                        <tr style="font-size: 10px;">
                            <td style="${td}"><a href="/app/site/${d.name}">${d.name}</a></td>
                            <td style="${td}">${d.site_name || '-'}</td>
                            <td style="${td}">${d.customer_name || '-'}</td>
                            <td style="${td}">${d.customer_type || '-'}</td>
                            <td style="${td}">${d.solution_name || '-'}</td>
                            <td style="${td}">${d.delivery_date ? frappe.datetime.str_to_user(d.delivery_date).split(' ')[0] : '-'}</td>
                            <td style="${td}">${d.city || '-'}</td>
                            <td style="${td}">${d.state || '-'}</td>
                            <td style="${td}">${d.territory || '-'}</td>
                        </tr>
                    `;
                });
            }
        } else {
            col_count = 14;
            headers = `
                <th style="${th}">Circuit</th>
                <th style="${th}">Site Name</th>
                <th style="${th}">Customer</th>
                <th style="${th}">Status</th>
                <th style="${th}">Stock</th>
                <th style="${th}">LMS</th>
                <th style="${th}">Type</th>
                <th style="${th}">Solution</th>
                <th style="${th}">Project Review</th>
                <th style="${th}">LMS Review</th>
                <th style="${th}">Task Ownership</th>
                <th style="${th}">Created</th>
                <th style="${th}">Aging</th>
                <th style="${th}; text-align:center;">Flow</th>
            `;
            if (data && data.length > 0) {
                data.forEach(d => {
                    rows += `
                        <tr style="font-size: 10px;">
                            <td style="${td}"><a href="/app/site/${d.name}">${d.name}</a></td>
                            <td style="${td}">${d.site_name || '-'}</td>
                            <td style="${td}">${d.customer_name || '-'}</td>
                            <td style="${td}">${d.site_status || '-'}</td>
                            <td style="${td}">${d.stock_stage || '-'}</td>
                            <td style="${td}">${d.lms_stage || '-'}</td>
                            <td style="${td}">${d.customer_type || '-'}</td>
                            <td style="${td}">${d.solution_name || '-'}</td>
                            <td style="${td}">${d.project_review || '-'}</td>
                            <td style="${td}">${d.lms_review || '-'}</td>
                            <td style="${td}">${d.task_ownership || '-'}</td>
                            <td style="${td}">${d.circuit_created_date ? frappe.datetime.str_to_user(d.circuit_created_date).split(' ')[0] : '-'}</td>
                            <td style="${td} font-weight: bold;">${d.aging}</td>
                            <td style="${td} text-align:center;"><button class="btn-flow-view" data-circuit="${d.name}" title="View Flow"><i class="fa fa-project-diagram" style="pointer-events:none;"></i></button></td>
                        </tr>
                    `;
                });
            }
        }

        if (!rows) {
            rows = `<tr><td colspan="${col_count}" class="text-center" style="padding: 20px;">${__('No sites found')}</td></tr>`;
        }

        const table_html = `
            <div style="overflow-x: auto; max-height: 400px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #333;">
                    <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 1;">
                        <tr>${headers}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        const me = this;
        const d = new frappe.ui.Dialog({
            title: title || __('Site Details'),
            size: 'extra-large',
            primary_action_label: __('Download Excel'),
            primary_action: () => {
                const url = frappe.request.url + '?cmd=nexapp.nexapp.page.site_dashboard.site_dashboard.download_site_xlsx&card_type=' + (card_type || 'wip') + '&filters=' + JSON.stringify(this.filters);
                window.open(url, '_blank');
            }
        });

        d.set_secondary_action(() => d.hide());
        d.set_secondary_action_label(__('Close'));
        d.show();
        d.$wrapper.find('.modal-body').html(table_html);

        // Attach flow button click handlers
        d.$wrapper.find('.btn-flow-view').on('click', function (e) {
            e.stopPropagation();
            const circuit_id = $(this).data('circuit');
            me.show_circuit_flow(circuit_id);
        });
    };

    this.show_circuit_flow = function (circuit_id) {
        frappe.call({
            method: 'nexapp.nexapp.page.site_dashboard.site_dashboard.get_circuit_flow_data',
            args: { circuit_id: circuit_id },
            freeze: true,
            freeze_message: __('Loading Flow...'),
            callback: (r) => {
                if (r.message) {
                    this.render_circuit_flow_dialog(r.message, circuit_id);
                }
            }
        });
    };

    this.render_circuit_flow_dialog = function (data, circuit_id) {
        const site = data.site || {};
        const stock = data.stock || {};
        const ship = data.shipment || {};
        const lms = data.lms || {};
        const prov = data.provisioning || {};

        function get_node_state(record, status_field) {
            if (!record || !record.name) return 'pending';
            const val = (record[status_field] || '').toLowerCase();
            if (['delivered', 'delivered and live', 'completed', 'provisioning completed', 'lms delivered', 'stock delivered'].some(s => val.includes(s.toLowerCase()))) return 'complete';
            if (val && val !== '' && val !== 'pending') return 'active';
            return 'pending';
        }

        const stages = [
            {
                title: 'Site',
                state: get_node_state(site, 'site_status'),
                record: site,
                icon: 'fa-building',
                details: [
                    { label: 'Site Status', value: site.site_status },
                    { label: 'Stock Stage', value: site.stage },
                    { label: 'LMS Stage', value: site.lms_stage },
                    { label: 'Project Review', value: site.project_review },
                    { label: 'LMS Review', value: site.lms_review },
                    { label: 'Task Ownership', value: site.task_ownership }
                ]
            },
            {
                title: 'Stock',
                state: get_node_state(stock, 'status'),
                record: stock,
                icon: 'fa-cube',
                details: [
                    { label: 'Status', value: stock.status },
                    { label: 'DN ID', value: stock.delivery_note_id }
                ]
            },
            {
                title: 'Shipment',
                state: get_node_state(ship, 'status'),
                record: ship,
                icon: 'fa-truck',
                details: [
                    { label: 'Pickup Date', value: fmt_date(ship.pickup_date) },
                    { label: 'Carrier', value: ship.carrier },
                    { label: 'Carrier Service', value: ship.carrier_service },
                    { label: 'Person Name', value: ship.custom_person_name },
                    { label: 'Tracking Info', value: ship.tracking_status_info },
                    { label: 'AWB', value: ship.awb_number },
                    { label: 'Delivery Date', value: fmt_date(ship.custom_delivery_date) }
                ]
            },
            {
                title: 'LMS',
                state: get_node_state(lms, 'lms_stage'),
                record: lms,
                icon: 'fa-server',
                details: [
                    { label: 'LMS Stage', value: lms.lms_stage },
                    { label: 'Supplier', value: lms.supplier }
                ]
            },
            {
                title: 'Provisioning',
                state: get_node_state(prov, 'status'),
                record: prov,
                icon: 'fa-plug',
                details: [
                    { label: 'Status', value: prov.status },
                    { label: 'Completed', value: fmt_date(prov.provisioning_date) }
                ]
            }
        ];

        function fmt_val(v) { return v || '-'; }
        function fmt_date(d) {
            if (!d) return '-';
            try { return frappe.datetime.str_to_user(d).split(' ')[0]; } catch (e) { return d; }
        }

        function make_link(doctype, name) {
            if (!name) return '<span class="zigzag-not-created">Not Created</span>';
            const slug = doctype.toLowerCase().replace(/ /g, '-');
            return `<a href="/app/${slug}/${name}" target="_blank" class="zigzag-id-link">${name}</a>`;
        }

        let zigzag_nodes_html = '';
        stages.forEach((s, i) => {
            const is_top = i % 2 === 0;
            const pos_class = is_top ? 'pos-top' : 'pos-bottom';
            const state_icon = s.state === 'complete' ? '<i class="fa fa-check"></i>' : (s.state === 'active' ? '<i class="fa fa-spinner fa-pulse"></i>' : '<i class="fa fa-ellipsis-h"></i>');

            // Center nodes by using 10% to 90% range (80% spread centered at 50%)
            const left_pct = 10 + (i * 20);

            // Change Stock icon to fa-cube for better reliability
            const icon = s.title === 'Stock' ? 'fa-cube' : s.icon;

            zigzag_nodes_html += `
                <div class="zigzag-node ${s.state} ${pos_class}" style="left: ${left_pct}%;">
                    <div class="zigzag-circle-wrapper">
                        <div class="zigzag-status-badge">${state_icon}</div>
                        <div class="zigzag-circle">
                            <i class="fa ${icon}"></i>
                        </div>
                    </div>
                    <div class="zigzag-content">
                        <div class="zigzag-title">${s.title}</div>
                        <div class="zigzag-id">${make_link(s.title === 'Stock' ? 'Stock Management' : (s.title === 'LMS' ? 'Lastmile Services Master' : s.title), s.record.name)}</div>
                        <div class="zigzag-details">
                            ${(s.details || []).filter(d => d.value && d.value !== '').map(d => `
                                <div class="zigzag-detail-row">
                                    <span class="zigzag-label">${d.label}:</span>
                                    <span class="zigzag-value">${fmt_val(d.value)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });

        // SVG Path for zig-zag line (updated to match 10%-90% spacing)
        const svg_path = `
            <svg class="zigzag-svg" viewBox="0 0 1000 200" preserveAspectRatio="none">
                <path d="M 100 40 C 200 40, 200 160, 300 160 S 400 40, 500 40 S 600 160, 700 160 S 800 40, 900 40" 
                      fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="8,5" />
            </svg>
        `;

        const timeline_items = stages.map(s => ({ label: s.title, date: s.record.creation, state: s.state }));
        const total_days = site.creation ? frappe.datetime.get_diff(frappe.datetime.now_date(), site.creation) : 0;

        let timeline_html = '<div class="flow-timeline"><div class="flow-timeline-track">';
        timeline_items.forEach((t, i) => {
            const dot_cls = t.date ? t.state : 'pending';
            timeline_html += `
                <div class="flow-timeline-item">
                    <div class="flow-timeline-dot ${dot_cls}"></div>
                    <div class="flow-timeline-label">${t.label}</div>
                    <div class="flow-timeline-date">${t.date ? fmt_date(t.date) : '—'}</div>
                </div>`;
            if (i < timeline_items.length - 1) timeline_html += '<div class="flow-timeline-line"></div>';
        });
        timeline_html += '</div></div>';

        const flow_html = `
            <div class="circuit-flow-header">
                <div class="flow-header-left">
                    <div class="flow-circuit-id">${circuit_id}</div>
                    <div class="flow-site-name">${site.site_name || ''}</div>
                </div>
                <div class="flow-header-right">
                    <span class="flow-header-tag"><i class="fa fa-user"></i> ${site.customer || '-'}</span>
                    <span class="flow-header-tag"><i class="fa fa-cog"></i> ${site.solution_name || '-'}</span>
                    <span class="flow-header-tag"><i class="fa fa-tag"></i> ${site.customer_type || '-'}</span>
                </div>
                <i class="fa fa-times zigzag-close-btn" title="Close"></i>
            </div>

            <div class="zigzag-container">
                ${svg_path}
                ${zigzag_nodes_html}
            </div>

            <div class="flow-section-label">
                <div class="flow-label-left"><i class="fa fa-clock-o"></i> Creation Timeline</div>
                <div class="flow-label-right"><b>Total Days:</b> ${total_days} Days</div>
            </div>
            ${timeline_html}
        `;

        const dlg = new frappe.ui.Dialog({
            title: __('Circuit Flow') + ' — ' + circuit_id,
            size: 'extra-large'
        });

        try {
            dlg.$wrapper.addClass('circuit-flow-modal');
            dlg.show();
            dlg.$wrapper.find('.modal-body').html(flow_html);

            // Custom close button handler
            dlg.$wrapper.find('.zigzag-close-btn').on('click', () => dlg.hide());
        } catch (err) {
            console.error(err);
            frappe.msgprint(__('Error opening flow diagram: {0}', [err.message]));
        }
    };

    this.refresh = function () {
        frappe.call({
            method: 'nexapp.nexapp.page.site_dashboard.site_dashboard.get_dashboard_data',
            args: {
                filters: this.filters
            },
            callback: (r) => {
                if (r.message) {
                    this.render_data(r.message);
                }
            }
        });
    };

    this.render_data = function (data) {
        // Update Metrics
        $('#metric-total-circuits').text(data.metrics.total_circuits);
        $('#metric-wip-sites').text(data.metrics.wip_sites);
        $('#metric-live-sites').text(data.metrics.live_sites);
        $('#metric-avg-wip-age').text(data.metrics.avg_wip_age);

        const abbr = (l) => {
            if (!l) return '-';
            return l.replace('Partially Provisioning Completed', 'Part. Prov.')
                .replace('Awaiting Customer Approval', 'Awaiting')
                .replace('Provisioning Completed', 'Prov. Comp.')
                .replace('Installation Initiated', 'Install.')
                .replace('Provisioning', 'Prov.')
                .replace('In-process', 'In-proc.')
                .replace('Pending', 'Pend.')
                .replace('On Hold', 'Hold');
        };

        // Render WIP Status Distribution as Custom HTML Chart
        const wip_colors = ['#4299e1', '#48bb78', '#ed8936', '#F56565', '#ecc94b', '#9f7aea', '#667eea', '#f687b3'];
        const wip_data = data.status_distribution || [];
        const wip_total = wip_data.reduce((sum, d) => sum + d.count, 0) || 1;

        // Build conic-gradient for donut
        let gradient_parts = [];
        let cumulative = 0;
        wip_data.forEach((d, i) => {
            const start = cumulative;
            const end = cumulative + (d.count / wip_total) * 100;
            gradient_parts.push(`${wip_colors[i % wip_colors.length]} ${start}% ${end}%`);
            cumulative = end;
        });

        // Build legend rows
        let wip_legend = '';
        wip_data.forEach((d, i) => {
            wip_legend += `
                <div style="display:flex;align-items:center;gap:8px;padding:3px 0;">
                    <div style="width:10px;height:10px;border-radius:2px;background:${wip_colors[i % wip_colors.length]};flex-shrink:0;"></div>
                    <span style="font-size:11px;font-weight:600;color:#334155;flex:1;">${d.label}</span>
                    <span style="font-size:11px;font-weight:800;color:#1e293b;">${d.count}</span>
                </div>`;
        });

        $('#chart-status-distribution').html(`
            <div style="display:flex;align-items:center;gap:24px;padding:10px 0;">
                <div style="width:180px;height:180px;border-radius:50%;background:conic-gradient(${gradient_parts.join(', ')});display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <div style="width:110px;height:110px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                        <div style="font-size:24px;font-weight:800;color:#1e293b;">${wip_total}</div>
                        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Total WIP</div>
                    </div>
                </div>
                <div style="flex:1;">${wip_legend}</div>
            </div>
        `);

        // Render Complete Site Status as Custom HTML Horizontal Bar Chart
        const status_colors = [
            '#3182ce', '#48bb78', '#ed8936', '#F56565', '#9f7aea',
            '#38b2ac', '#ecc94b', '#4299e1', '#667eea', '#f687b3',
            '#fc8181', '#68d391', '#b794f4', '#63b3ed', '#fbb6ce'
        ];
        const status_data = data.all_status_distribution || [];
        const max_count = status_data.length > 0 ? Math.max(...status_data.map(d => d.count)) : 1;

        let status_bars_html = '';
        status_data.forEach((d, i) => {
            const pct = Math.max((d.count / max_count) * 100, 2);
            const color = status_colors[i % status_colors.length];
            status_bars_html += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:200px;max-width:200px;font-size:11px;font-weight:600;color:#334155;text-align:right;" title="${d.label}">${d.label}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:${color};height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;transition:width 0.3s ease;min-width:36px;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });

        $('#chart-lms-stage').html(`<div style="padding:8px 0;">${status_bars_html}</div>`);

        // Render Delivered and Live by Territory - Custom HTML
        const dlv_data = data.delivered_live_by_territory || [];
        const dlv_max = dlv_data.length > 0 ? Math.max(...dlv_data.map(d => d.count)) : 1;
        let dlv_bars = '';
        dlv_data.forEach((d) => {
            const pct = Math.max((d.count / dlv_max) * 100, 3);
            dlv_bars += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:120px;max-width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right;">${d.label}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:#48bb78;height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:36px;transition:width 0.3s ease;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });
        $('#chart-delivered-live-territory').html(`<div style="padding:8px 0;">${dlv_bars}</div>`);

        // Render Circuit Delivered last 6 Month
        const dlv6_data = data.delivered_last_6_months || [];
        const dlv6_period = dlv6_data.length > 0 ? `${dlv6_data[0].label} - ${dlv6_data[dlv6_data.length - 1].label}` : '';
        $('#chart-delivered-6-months').closest('.chart-card').find('.chart-title').html(`
            <span>${__('Circuit Delivered')}</span>
            <span class="chart-subtitle">${dlv6_period}</span>
        `);

        const dlv6_max = dlv6_data.length > 0 ? Math.max(...dlv6_data.map(d => d.count)) : 1;
        let dlv6_bars = '';
        dlv6_data.forEach((d) => {
            const pct = Math.max((d.count / dlv6_max) * 100, 3);
            dlv6_bars += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:120px;max-width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right;">${d.label}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:#48bb78;height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:36px;transition:width 0.3s ease;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });
        $('#chart-delivered-6-months').html(`<div style="padding:8px 0;">${dlv6_bars}</div>`);

        // Render LMS Delivered last 6 Month
        const lms6_data = data.lms_delivered_last_6_months || [];
        const lms6_period = lms6_data.length > 0 ? `${lms6_data[0].label} - ${lms6_data[lms6_data.length - 1].label}` : '';
        $('#chart-lms-delivered-6-months').closest('.chart-card').find('.chart-title').html(`
            <span>${__('LMS Delivered')}</span>
            <span class="chart-subtitle">${lms6_period}</span>
        `);

        const lms6_max = lms6_data.length > 0 ? Math.max(...lms6_data.map(d => d.count)) : 1;
        let lms6_bars = '';
        lms6_data.forEach((d) => {
            const pct = Math.max((d.count / lms6_max) * 100, 3);
            lms6_bars += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:120px;max-width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right;">${d.label}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:#9f7aea;height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:36px;transition:width 0.3s ease;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });
        $('#chart-lms-delivered-6-months').html(`<div style="padding:8px 0;">${lms6_bars}</div>`);

        // Render LMS Supplier last 6 Month
        const sup6_data = data.lms_supplier_last_6_months || [];
        const sup6_period = lms6_period; // Use same period as LMS Delivered
        $('#chart-lms-supplier-6-months').closest('.chart-card').find('.chart-title').html(`
            <span>${__('Top 10 LMS Suppliers')}</span>
            <span class="chart-subtitle">${sup6_period}</span>
        `);

        const sup6_max = sup6_data.length > 0 ? Math.max(...sup6_data.map(d => d.count)) : 1;
        let sup6_bars = '';
        sup6_data.forEach((d) => {
            const pct = Math.max((d.count / sup6_max) * 100, 3);
            sup6_bars += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:120px;max-width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right;">${d.label || 'Unknown'}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:#4299e1;height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:36px;transition:width 0.3s ease;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });
        $('#chart-lms-supplier-6-months').html(`<div style="padding:8px 0;">${sup6_bars}</div>`);

        // Render LMS Bandwidth last 6 Month
        const bnd6_data = data.lms_bandwidth_last_6_months || [];
        $('#chart-lms-bandwidth-6-months').closest('.chart-card').find('.chart-title').html(`
            <span>${__('Bandwidth Types')}</span>
            <span class="chart-subtitle">${lms6_period}</span>
        `);

        const bnd6_max = bnd6_data.length > 0 ? Math.max(...bnd6_data.map(d => d.count)) : 1;
        let bnd6_bars = '';
        bnd6_data.forEach((d) => {
            const pct = Math.max((d.count / bnd6_max) * 100, 3);
            bnd6_bars += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:120px;max-width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right;">${d.label}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:#ed8936;height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:36px;transition:width 0.3s ease;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });
        $('#chart-lms-bandwidth-6-months').html(`<div style="padding:8px 0;">${bnd6_bars}</div>`);

        // Render Circuit Cancelled last 6 Month
        const can6_data = data.cancelled_last_6_months || [];
        const can6_period = can6_data.length > 0 ? `${can6_data[0].label} - ${can6_data[can6_data.length - 1].label}` : '';
        $('#chart-cancelled-6-months').closest('.chart-card').find('.chart-title').html(`
            <span>${__('Circuit Cancelled')}</span>
            <span class="chart-subtitle">${can6_period}</span>
        `);
        const can6_max = can6_data.length > 0 ? Math.max(...can6_data.map(d => d.count)) : 1;
        let can6_bars = '';
        can6_data.forEach((d) => {
            const pct = Math.max((d.count / can6_max) * 100, 3);
            can6_bars += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:120px;max-width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right;">${d.label}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:#dc2626;height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:36px;transition:width 0.3s ease;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });
        $('#chart-cancelled-6-months').html(`<div style="padding:8px 0;">${can6_bars}</div>`);

        // Render Disconnections last 6 Month
        const disc6_data = data.disconnections_last_6_months || [];
        const disc6_period = disc6_data.length > 0 ? `${disc6_data[0].label} - ${disc6_data[disc6_data.length - 1].label}` : '';
        $('#chart-disconnections-6-months').closest('.chart-card').find('.chart-title').html(`
            <span>${__('Circuit Disconnection In Process/ Disconnected')}</span>
            <span class="chart-subtitle">${disc6_period}</span>
        `);
        const disc6_max = disc6_data.length > 0 ? Math.max(...disc6_data.map(d => d.count)) : 1;
        let disc6_bars = '';
        disc6_data.forEach((d) => {
            const pct = Math.max((d.count / disc6_max) * 100, 3);
            disc6_bars += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:120px;max-width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right;">${d.label}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:#4b5563;height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:36px;transition:width 0.3s ease;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });
        $('#chart-disconnections-6-months').html(`<div style="padding:8px 0;">${disc6_bars}</div>`);

        // Render WIP by Territory - Custom HTML
        const wip_terr_data = data.territory_backlog || [];
        const wip_terr_max = wip_terr_data.length > 0 ? Math.max(...wip_terr_data.map(d => d.count)) : 1;
        let wip_terr_bars = '';
        wip_terr_data.forEach((d) => {
            const pct = Math.max((d.count / wip_terr_max) * 100, 3);
            wip_terr_bars += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <div style="min-width:120px;max-width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right;">${d.label}</div>
                    <div style="flex:1;background:#f1f5f9;border-radius:5px;height:24px;overflow:hidden;">
                        <div style="width:${pct}%;background:#F56565;height:100%;border-radius:5px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:36px;transition:width 0.3s ease;">
                            <span style="font-size:10px;font-weight:800;color:#fff;">${d.count.toLocaleString()}</span>
                        </div>
                    </div>
                </div>`;
        });
        $('#chart-territory-backlog').html(`<div style="padding:8px 0;">${wip_terr_bars}</div>`);

        // Render Recent Sites
        let rows = '';
        data.recent_sites.forEach(site => {
            let status_class = 'status-pending';
            if (site.site_status === 'Delivered and Live') status_class = 'status-live';
            if (site.site_status === 'In-process') status_class = 'status-process';

            rows += `
                <tr>
                    <td><a href="/app/site/${site.name}">${site.name}</a></td>
                    <td>${site.site_name || '-'}</td>
                    <td>${site.customer || '-'}</td>
                    <td style="color:#6366f1;font-weight:600;">${site.updated_by || '-'}</td>
                    <td><span class="status-badge ${status_class}">${site.site_status}</span></td>
                    <td>${site.modified ? frappe.datetime.prettyDate(site.modified) : '-'}</td>
                </tr>
            `;
        });
        $('#recent-sites-list').html(rows || `<tr><td colspan="6" class="text-center">${__('No sites updated in the last 24 hours')}</td></tr>`);
    };

    this.render_chart = function (query_obj, options) {
        const chart = new frappe.Chart(query_obj, {
            title: options.title,
            data: options.data,
            type: options.type,
            height: options.height || 280,
            colors: options.colors || ['#4299e1'],
            barOptions: options.barOptions || {},
            lineOptions: options.lineOptions || {},
            axisOptions: options.axisOptions || { xIsSeries: true, xAxisMode: 'tick' },
            valuesOverPoints: 1,
            truncateLegends: 0
        });

        // Fix truncated labels after chart renders
        setTimeout(() => {
            const container = $(query_obj);
            const original_labels = options.data.labels || [];

            // Fix axis tick labels (x-axis and y-axis)
            container.find('.axis .tick text').each(function () {
                const el = $(this);
                const txt = el.text();
                if (txt.includes('…') || txt.includes('...')) {
                    const prefix = txt.replace(/[…\.]+$/, '').trim();
                    const match = original_labels.find(l => l && l.startsWith(prefix));
                    if (match) {
                        el.text(match);
                        el.css('font-size', '10px');
                    }
                }
            });

            // Fix legend text
            container.find('.legend .legend-dataset-text').each(function () {
                const el = $(this);
                const txt = el.text();
                if (txt.includes('…') || txt.includes('...')) {
                    const prefix = txt.replace(/[…\.]+$/, '').trim();
                    const match = original_labels.find(l => l && l.startsWith(prefix));
                    if (match) {
                        el.text(match);
                    }
                }
            });
        }, 100);
    };
}
