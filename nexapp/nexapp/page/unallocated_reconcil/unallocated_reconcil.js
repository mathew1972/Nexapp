frappe.pages['unallocated_reconcil'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({ parent: wrapper, title: '', single_column: true });

    // Clean minimal header
    $(`<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;
        background:#fff;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:16px;
        box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <h2 style="display:flex;align-items:center;margin:0;color:#1f2937;font-size:20px;font-weight:700;
            letter-spacing:-0.3px;">
            <span style="background:#f0fdf4;border-radius:8px;padding:7px;margin-right:10px;
                display:flex;border:1px solid #bbf7d0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
                    <path d="M6 6.9L3.87 4.78 5.28 3.37l7.78 7.78-1.41 1.41L6 6.9z"/>
                    <path d="M19.78 3.37l1.41 1.41L8.83 17.14l-1.41-1.41L19.78 3.37z"/>
                    <path d="M12.5 3H11v2h1.5V3zm5.3 2.1l-1.06 1.06 1.41 1.42 1.06-1.06-1.41-1.42zM12.5 19H11v2h1.5v-2zm5.3-2.1l-1.06-1.06-1.41 1.42 1.06 1.06 1.41-1.42z"/>
                    <path d="M16 11.5c0-2.49-2.01-4.5-4.5-4.5S7 9.01 7 11.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5zm-7.5 0c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/>
                    <path d="M4 10H2v3h2v-3zm16 0h2v3h-2v-3zM11 18v2h2v-2h-2zM11 2v2h2V2h-2z"/>
                </svg>
            </span>Unallocated Reconciliation
        </h2>
    </div>`).appendTo(page.body);

    // Clean modern CSS
    $(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .unallocated-recon-layout{font-family:'Inter',-apple-system,sans-serif;animation:urFade .4s ease; background:#F5FAFF; padding:20px; min-height:100vh;}
        @keyframes urFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

        /* Filter Section */
        .ur-filter-section{padding:16px 20px;background:#fff;border-radius:10px;
            border:1px solid #e5e7eb;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
        .ur-filter-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
        .ur-filter-group{flex:1 1 170px;min-width:140px}
        .ur-filter-group label{display:block;margin-bottom:5px;font-size:11px;font-weight:700;
            color:#4b5563;text-transform:uppercase;letter-spacing:0.6px}
        .ur-filter-input,.ur-filter-select{width:100%;padding:8px 12px;border:1px solid #e5e7eb;
            border-radius:8px;font-size:13px;background:#fff;transition:all .2s ease;
            font-family:'Inter',sans-serif;color:#374151}
        .ur-filter-input:focus,.ur-filter-select:focus{outline:none;border-color:#10b981;
            box-shadow:0 0 0 3px rgba(16,185,129,0.08)}
        .ur-btn-apply{padding:8px 20px;border:none;border-radius:8px;font-size:13px;font-weight:600;
            cursor:pointer;transition:all .2s ease;font-family:'Inter',sans-serif;
            background:#10b981;color:#fff}
        .ur-btn-apply:hover{background:#059669}
        .ur-btn-reset{padding:8px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;
            font-weight:600;cursor:pointer;transition:all .2s ease;font-family:'Inter',sans-serif;
            background:#fff;color:#6b7280}
        .ur-btn-reset:hover{background:#f9fafb;border-color:#d1d5db}

        /* Table */
        .ur-table-card{background:#fff;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden;
            box-shadow:0 1px 3px rgba(0,0,0,0.04)}
        .ur-table-scroll{max-height:calc(100vh - 340px);overflow:auto}
        .ur-table{width:100%;border-collapse:collapse;table-layout:fixed}
        .ur-table thead{position:sticky;top:0;z-index:10}
        .ur-table thead th{background:#f9fafb;padding:10px 14px;font-size:11px;font-weight:700;
            color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;
            text-align:left;vertical-align:top}
        .ur-table tbody td{padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;
            word-wrap:break-word;white-space:normal}
        .ur-table tbody tr{cursor:pointer;transition:background .15s ease}
        .ur-table tbody tr:hover{background:#f0fdf4}
        .ur-table tbody tr.ur-row-selected{background:#d1fae5}
        .ur-table tbody tr.ur-row-selected:hover{background:#a7f3d0}
        .ur-table th:nth-child(1),.ur-table td:nth-child(1){width:9%}
        .ur-table th:nth-child(2),.ur-table td:nth-child(2){width:14%}
        .ur-table th:nth-child(3),.ur-table td:nth-child(3){width:15%}
        .ur-table th:nth-child(4),.ur-table td:nth-child(4){width:33%}
        .ur-table th:nth-child(5),.ur-table td:nth-child(5){width:11%}
        .ur-table th:nth-child(6),.ur-table td:nth-child(6){width:13%}

        /* Column filters */
        .ur-col-filter{width:100%;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;
            font-size:11px;margin-top:6px;font-family:'Inter',sans-serif;transition:all .2s ease;
            background:#fff;color:#374151;box-sizing:border-box}
        .ur-col-filter:focus{outline:none;border-color:#10b981;box-shadow:0 0 0 2px rgba(16,185,129,0.1)}
        .ur-col-filter::placeholder{color:#d1d5db}

        /* Badges */
        .ur-amount-val{font-weight:600;color:#059669}
        .ur-type-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;
            font-weight:600;letter-spacing:0.2px}
        .ur-type-supplier{background:#fef3c7;color:#92400e}
        .ur-type-customer{background:#dbeafe;color:#1e40af}
        .ur-type-other{background:#f3f4f6;color:#6b7280}

        /* Pagination */
        .ur-pagination{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;
            border-top:1px solid #f3f4f6}
        .ur-page-info{color:#9ca3af;font-size:13px}
        .ur-page-info strong{color:#374151}
        .ur-page-buttons{display:flex;gap:3px;align-items:center}
        .ur-page-btn{padding:5px 10px;border:1px solid #e5e7eb;background:#fff;border-radius:6px;
            cursor:pointer;font-size:12px;font-weight:500;color:#6b7280;transition:all .15s ease;
            font-family:'Inter',sans-serif}
        .ur-page-btn:hover:not(:disabled){background:#f0fdf4;border-color:#10b981;color:#059669}
        .ur-page-btn.active{background:#10b981;color:#fff;border-color:#10b981}
        .ur-page-btn:disabled{opacity:.35;cursor:not-allowed}
        .ur-per-page{padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;
            font-family:'Inter',sans-serif;color:#6b7280;margin-left:6px;cursor:pointer}

        /* Right Panel */
        .ur-panel{position:fixed;right:0;top:0;width:462px;height:100%;background:#fafbfc;z-index:1050;
            transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);
            box-shadow:-8px 0 30px rgba(0,0,0,0.08);display:flex;flex-direction:column;
            border-left:1px solid #e5e7eb}
        .ur-panel.open{transform:translateX(0)}
        .ur-panel-overlay{position:fixed;top:0;left:0;width:100%;height:100%;
            background:transparent;z-index:1049;opacity:0;visibility:hidden;
            transition:all .3s ease}
        .ur-panel-overlay.open{opacity:1;visibility:visible}
        .ur-panel-head{padding:18px 24px;background:linear-gradient(135deg,#065f46 0%,#10b981 100%);
            display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
        .ur-panel-title{font-size:16px;font-weight:700;color:#fff;display:flex;align-items:center;gap:10px}
        .ur-panel-title-icon{background:rgba(255,255,255,0.2);border-radius:8px;padding:6px;
            display:flex;align-items:center;justify-content:center}
        .ur-panel-close{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);
            color:#fff;width:32px;height:32px;
            border-radius:8px;cursor:pointer;font-size:18px;display:flex;align-items:center;
            justify-content:center;transition:all .15s ease}
        .ur-panel-close:hover{background:rgba(255,255,255,0.3);border-color:rgba(255,255,255,0.4)}
        .ur-panel-body{padding:24px;overflow-y:auto;flex:1}
        .ur-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}
        .ur-detail-card{background:#fff;border-radius:10px;padding:14px 16px;
            border:1px solid #e5e7eb;border-left:3px solid #10b981;
            transition:box-shadow .2s ease}
        .ur-detail-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.04)}
        .ur-detail-label{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;
            letter-spacing:0.7px;margin-bottom:6px}
        .ur-detail-val{font-size:14px;font-weight:600;color:#1f2937;word-break:break-word;
            line-height:1.4}
        .ur-detail-card.full{grid-column:1/-1}
        .ur-detail-card.amount-card{border-left-color:#059669;background:#f0fdf4}
        .ur-section-divider{height:1px;background:linear-gradient(to right,transparent,#e5e7eb,transparent);
            margin:8px 0 20px 0}
        .ur-alloc-title{font-size:15px;font-weight:700;color:#1f2937;margin:0 0 14px 0;
            display:flex;align-items:center;gap:8px}
        .ur-alloc-title svg{flex-shrink:0}
        .ur-remaining{padding:14px 16px;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);
            border-radius:10px;text-align:center;
            font-weight:600;font-size:14px;color:#166534;margin-bottom:16px;
            border:1px solid #bbf7d0;display:flex;align-items:center;justify-content:center;gap:8px}
        .ur-remaining span{color:#059669;font-size:17px;font-weight:700}
        .ur-inv-table{width:100%;border-collapse:separate;border-spacing:0;
            border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
        .ur-inv-table th{background:linear-gradient(180deg,#f9fafb 0%,#f3f4f6 100%);
            padding:10px 14px;font-size:11px;font-weight:600;
            color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:left;
            border-bottom:1px solid #e5e7eb}
        .ur-inv-table td{padding:10px 14px;font-size:13px;color:#374151;
            border-top:1px solid #f3f4f6;background:#fff}
        .ur-inv-table tbody tr{transition:background .15s ease}
        .ur-inv-table tbody tr:hover td{background:#f0fdf4}
        .ur-alloc-input{width:100px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;
            text-align:right;font-size:13px;font-family:'Inter',sans-serif;transition:all .15s ease;
            background:#fff;-moz-appearance:textfield}
        .ur-alloc-input::-webkit-outer-spin-button,
        .ur-alloc-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .ur-alloc-input:focus{outline:none;border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.12)}
        .ur-save-btn{margin-top:20px;padding:12px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);
            color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px;width:100%;
            transition:all .2s ease;font-family:'Inter',sans-serif;
            box-shadow:0 2px 8px rgba(16,185,129,0.25)}
        .ur-save-btn:hover{background:linear-gradient(135deg,#059669 0%,#047857 100%);
            box-shadow:0 4px 12px rgba(16,185,129,0.35);transform:translateY(-1px)}
        .ur-save-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
        .ur-no-inv{text-align:center;color:#9ca3af;padding:28px;font-style:italic;font-size:13px;
            background:#fff;border-radius:10px;border:1px dashed #e5e7eb}
        .ur-warning{color:#dc2626;font-size:12px;margin-top:8px;display:none;font-weight:600;
            text-align:center;background:#fef2f2;padding:8px 12px;border-radius:8px;
            border:1px solid #fecaca}
        .ur-empty-row td{text-align:center;padding:32px!important;color:#9ca3af;font-size:13px}
        .page-head{display:none!important}
    </style>`).appendTo('head');

    // Main HTML
    const $container = $(`
        <div class="unallocated-recon-layout">
            <div class="ur-filter-section">
                <div class="ur-filter-row">
                    <div class="ur-filter-group">
                        <label>Company</label>
                        <select id="company-select" class="ur-filter-select"><option value="">Select Company</option></select>
                    </div>
                    <div class="ur-filter-group">
                        <label>Statement Date From</label>
                        <input type="date" id="date-from" class="ur-filter-input">
                    </div>
                    <div class="ur-filter-group">
                        <label>Statement Date To</label>
                        <input type="date" id="date-to" class="ur-filter-input">
                    </div>
                    <div class="ur-filter-group" style="flex:0 0 auto;display:flex;gap:6px;align-items:flex-end">
                        <button id="apply-filters" class="ur-btn-apply">Apply</button>
                        <button id="reset-filters" class="ur-btn-reset">Reset</button>
                    </div>
                </div>
            </div>

            <div class="ur-table-card">
                <div class="ur-table-scroll">
                    <table class="ur-table">
                        <thead>
                            <tr>
                                <th>Date<br><input type="text" class="ur-col-filter" id="filter-date" placeholder="Filter..."></th>
                                <th>Payment ID<br><input type="text" class="ur-col-filter" id="filter-pid" placeholder="Filter..."></th>
                                <th>Party Name<br><input type="text" class="ur-col-filter" id="filter-party" placeholder="Filter..."></th>
                                <th>Statement Details<br><input type="text" class="ur-col-filter" id="filter-stmt" placeholder="Filter..."></th>
                                <th>Payment Type<br><input type="text" class="ur-col-filter" id="filter-type" placeholder="Filter..."></th>
                                <th>Amount<br><input type="text" class="ur-col-filter" id="filter-amount" placeholder="Filter..."></th>
                            </tr>
                        </thead>
                        <tbody id="payment-entries-body">
                            <tr class="ur-empty-row"><td colspan="6">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="ur-pagination">
                    <div class="ur-page-info">Showing <strong><span id="start-item">0</span>–<span id="end-item">0</span></strong> of <strong><span id="total-items">0</span></strong></div>
                    <div class="ur-page-buttons">
                        <button class="ur-page-btn" id="first-page" disabled>&laquo;</button>
                        <button class="ur-page-btn" id="prev-page" disabled>&lsaquo;</button>
                        <span id="page-numbers"></span>
                        <button class="ur-page-btn" id="next-page" disabled>&rsaquo;</button>
                        <button class="ur-page-btn" id="last-page" disabled>&raquo;</button>
                    </div>
                    <div style="display:flex;align-items:center">
                        <span style="font-size:12px;color:#9ca3af">Rows:</span>
                        <select class="ur-per-page" id="per-page">
                            <option value="10">10</option><option value="20" selected>20</option>
                            <option value="50">50</option><option value="100">100</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `);

    // Right panel + overlay
    const $overlay = $('<div class="ur-panel-overlay" id="ur-overlay"></div>');
    const $rightPanel = $(`
        <div class="ur-panel" id="ur-panel">
            <div class="ur-panel-head">
                <div class="ur-panel-title">
                    <span class="ur-panel-title-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM6 20V4h5v7h7v9H6z"/><path d="M8 12h8v2H8zm0 4h5v2H8z"/></svg>
                    </span>
                    Transaction Details
                </div>
                <button class="ur-panel-close" id="ur-close">&times;</button>
            </div>
            <div class="ur-panel-body">
                <div class="ur-detail-grid">
                    <div class="ur-detail-card"><div class="ur-detail-label">Date</div><div id="detail-date" class="ur-detail-val"></div></div>
                    <div class="ur-detail-card"><div class="ur-detail-label">Payment ID</div><div id="detail-payment-id" class="ur-detail-val"></div></div>
                    <div class="ur-detail-card"><div class="ur-detail-label">Party Name</div><div id="detail-party" class="ur-detail-val"></div></div>
                    <div class="ur-detail-card"><div class="ur-detail-label">Payment Type</div><div id="detail-type" class="ur-detail-val"></div></div>
                    <div class="ur-detail-card full"><div class="ur-detail-label">Statement Details</div><div id="detail-ref" class="ur-detail-val"></div></div>
                    <div class="ur-detail-card amount-card"><div class="ur-detail-label">Unallocated Amount</div><div id="detail-amount" class="ur-detail-val" style="color:#059669;font-size:16px"></div></div>
                </div>
                <div class="ur-section-divider"></div>
                <div id="invoice-allocation-section" style="display:none">
                    <div class="ur-alloc-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>
                        <span id="allocation-title">Allocate to Purchase Invoices</span>
                    </div>
                    <div class="ur-remaining" id="remaining-amount-indicator">
                        Remaining Amount: ₹ <span id="remaining-amount-value">0.00</span>
                    </div>
                    <div id="invoice-table-container">
                        <table class="ur-inv-table" id="invoice-table">
                            <thead id="invoice-table-header"></thead>
                            <tbody id="invoice-tbody"></tbody>
                        </table>
                    </div>
                    <div class="ur-no-inv" id="no-invoices-msg" style="display:none">No outstanding invoices found for this party.</div>
                    <div class="ur-warning" id="allocation-warning">⚠ Total allocated amount exceeds the payment amount!</div>
                    <button class="ur-save-btn" id="save-allocation-btn" style="display:none">💾 Update Allocations</button>
                </div>
            </div>
        </div>
    `);

    $container.appendTo(page.body);
    $overlay.appendTo('body');
    $rightPanel.appendTo('body');

    // ========== VARIABLES ==========
    let currentPage = 1, perPage = 20, totalRecords = 0;
    let allEntries = [], filteredEntries = [], companies = [], parties = [];
    let selectedPayment = null, outstandingInvoices = [], currentPartyType = '';
    let colFilters = { date: '', pid: '', party: '', stmt: '', type: '', amount: '' };

    // ========== HELPERS ==========
    function format_currency(amount) {
        if (!amount) return '0.00';
        return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function update_remaining_amount() {
        if (!selectedPayment) return;
        let totalAllocated = 0;
        $('.allocated-amount').each(function () { totalAllocated += parseFloat($(this).val()) || 0; });
        const remaining = selectedPayment.unallocated_amount - totalAllocated;
        $('#remaining-amount-value').text(format_currency(remaining));
        if (totalAllocated > selectedPayment.unallocated_amount) {
            $('#allocation-warning').show(); $('#save-allocation-btn').prop('disabled', true);
        } else {
            $('#allocation-warning').hide(); $('#save-allocation-btn').prop('disabled', false);
        }
    }

    function load_companies() {
        frappe.call({
            method: "frappe.client.get_list",
            args: { doctype: "Company", fields: ["name"], limit_page_length: 0 },
            callback: function (r) {
                companies = r.message || [];
                const $s = $('#company-select').empty().append('<option value="">Select Company</option>');
                companies.forEach(c => $s.append(`<option value="${c.name}">${c.name}</option>`));
                const def = frappe.defaults.get_default("company");
                if (def) $s.val(def);
                load_parties(); load_data();
            }
        });
    }

    function load_parties() {
        frappe.call({
            method: "nexapp.api.get_unallocated_parties",
            args: { company: $('#company-select').val(), from_date: $('#date-from').val(), to_date: $('#date-to').val() },
            callback: function (r) {
                parties = r.message || [];
                if (cb) cb();
            }
        });
    }

    function load_data() {
        const company = $('#company-select').val();
        if (!company) {
            $('#payment-entries-body').html('<tr class="ur-empty-row"><td colspan="6">Please select a company</td></tr>');
            return;
        }
        frappe.call({
            method: "nexapp.api.get_unallocated_payment_entries",
            args: { company, from_date: $('#date-from').val(), to_date: $('#date-to').val(), party: $('#party-filter').val() },
            callback: function (r) { allEntries = r.message || []; filter_and_render(); }
        });
    }

    function reset_filters() {
        $('#date-from').val(''); $('#date-to').val(''); $('#party-filter').val('');
        $('.ur-col-filter').val('');
        colFilters = { date: '', pid: '', party: '', stmt: '', type: '', amount: '' };
        load_parties(); load_data();
    }

    function filter_and_render() {
        const selectedParty = '';
        let entries = selectedParty ? allEntries.filter(e => e.party === selectedParty) : [...allEntries];

        // Apply column filters
        if (colFilters.date) {
            const q = colFilters.date.toLowerCase();
            entries = entries.filter(e => (e.posting_date ? frappe.datetime.str_to_user(e.posting_date) : '').toLowerCase().includes(q));
        }
        if (colFilters.pid) {
            const q = colFilters.pid.toLowerCase();
            entries = entries.filter(e => (e.name || '').toLowerCase().includes(q));
        }
        if (colFilters.party) {
            const q = colFilters.party.toLowerCase();
            entries = entries.filter(e => (e.party || '').toLowerCase().includes(q));
        }
        if (colFilters.stmt) {
            const q = colFilters.stmt.toLowerCase();
            entries = entries.filter(e => (e.reference_no || '').toLowerCase().includes(q));
        }
        if (colFilters.type) {
            const q = colFilters.type.toLowerCase();
            entries = entries.filter(e => (e.party_type || '').toLowerCase().includes(q));
        }
        if (colFilters.amount) {
            const q = colFilters.amount.toLowerCase();
            entries = entries.filter(e => format_currency(e.unallocated_amount).toLowerCase().includes(q));
        }

        filteredEntries = entries;
        totalRecords = filteredEntries.length;
        currentPage = 1;
        update_pagination(); render_current_page();
    }

    function get_type_badge(type) {
        if (type === 'Supplier') return `<span class="ur-type-badge ur-type-supplier">${type}</span>`;
        if (type === 'Customer') return `<span class="ur-type-badge ur-type-customer">${type}</span>`;
        return `<span class="ur-type-badge ur-type-other">${type || '—'}</span>`;
    }

    function render_current_page() {
        const start = (currentPage - 1) * perPage;
        const end = Math.min(start + perPage, totalRecords);
        const entries = filteredEntries.slice(start, end);
        const $tbody = $('#payment-entries-body').empty();

        if (!entries.length) {
            $tbody.append('<tr class="ur-empty-row"><td colspan="6">No records found</td></tr>');
            return;
        }
        entries.forEach(e => {
            const date = e.posting_date ? frappe.datetime.str_to_user(e.posting_date) : '';
            const amt = e.unallocated_amount ? '₹ ' + format_currency(e.unallocated_amount) : '₹ 0.00';
            const row = $(`<tr>
                <td>${date}</td>
                <td style="font-weight:600;color:#374151">${e.name || ''}</td>
                <td>${e.party || ''}</td>
                <td style="font-size:12px;color:#6b7280">${e.reference_no || ''}</td>
                <td>${get_type_badge(e.party_type)}</td>
                <td style="text-align:right"><span class="ur-amount-val">${amt}</span></td>
            </tr>`);
            row.on('click', function () {
                $('.ur-table tbody tr').removeClass('ur-row-selected');
                $(this).addClass('ur-row-selected');
                select_payment(e);
            });
            $tbody.append(row);
        });
    }

    function update_pagination() {
        const totalPages = Math.ceil(totalRecords / perPage) || 1;
        const s = totalRecords ? (currentPage - 1) * perPage + 1 : 0;
        const e = Math.min(currentPage * perPage, totalRecords);
        $('#start-item').text(s); $('#end-item').text(e); $('#total-items').text(totalRecords);
        const $pn = $('#page-numbers').empty();
        let sp = Math.max(1, currentPage - 2), ep = Math.min(totalPages, sp + 4);
        if (ep - sp < 4) sp = Math.max(1, ep - 4);
        if (sp > 1) { $pn.append('<button class="ur-page-btn" data-page="1">1</button>'); if (sp > 2) $pn.append('<span style="padding:0 4px;color:#d1d5db">…</span>'); }
        for (let i = sp; i <= ep; i++) $pn.append(`<button class="ur-page-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`);
        if (ep < totalPages) { if (ep < totalPages - 1) $pn.append('<span style="padding:0 4px;color:#d1d5db">…</span>'); $pn.append(`<button class="ur-page-btn" data-page="${totalPages}">${totalPages}</button>`); }
        $('#first-page').prop('disabled', currentPage === 1); $('#prev-page').prop('disabled', currentPage === 1);
        $('#next-page').prop('disabled', currentPage === totalPages); $('#last-page').prop('disabled', currentPage === totalPages);
    }

    // ========== PANEL ==========
    function togglePanel(show) {
        if (show) { $('#ur-panel').addClass('open'); $('#ur-overlay').addClass('open'); }
        else { $('#ur-panel').removeClass('open'); $('#ur-overlay').removeClass('open'); selectedPayment = null; outstandingInvoices = []; $('#invoice-allocation-section').hide(); $('#save-allocation-btn').hide(); $('.ur-table tbody tr').removeClass('ur-row-selected'); }
    }

    function select_payment(entry) {
        selectedPayment = entry; currentPartyType = entry.party_type;
        $('#detail-date').text(entry.posting_date ? frappe.datetime.str_to_user(entry.posting_date) : '');
        $('#detail-payment-id').text(entry.name);
        $('#detail-party').text(entry.party);
        $('#detail-ref').text(entry.reference_no);
        $('#detail-type').html(get_type_badge(entry.party_type));
        $('#detail-amount').text(entry.unallocated_amount ? '₹ ' + format_currency(entry.unallocated_amount) : '₹ 0.00');
        if (entry.party_type === 'Supplier' || entry.party_type === 'Customer') {
            $('#invoice-allocation-section').show();
            const dt = entry.party_type === 'Supplier' ? 'Purchase Invoice' : 'Sales Invoice';
            $('#allocation-title').text('Allocate to ' + (entry.party_type === 'Supplier' ? 'Purchase' : 'Sales') + ' Invoices');
            load_outstanding_invoices(dt, entry.party);
        } else { $('#invoice-allocation-section').hide(); }
        togglePanel(true);
        update_remaining_amount();
    }

    function load_outstanding_invoices(doctype, party) {
        frappe.call({
            method: "nexapp.api.get_outstanding_invoices",
            args: { doctype, party_field: doctype === 'Purchase Invoice' ? 'supplier' : 'customer', party_name: party, company: $('#company-select').val() },
            callback: function (r) { outstandingInvoices = r.message || []; render_invoice_table(doctype); }
        });
    }

    function render_invoice_table(doctype) {
        const $tbody = $('#invoice-tbody').empty();
        const label = doctype === 'Purchase Invoice' ? 'Purchase Invoice' : 'Sales Invoice';
        $('#invoice-table-header').html(`<tr><th>${label}</th><th>Outstanding</th><th>Allocate</th></tr>`);
        if (!outstandingInvoices.length) { $('#no-invoices-msg').show(); $('#invoice-table-container').hide(); $('#save-allocation-btn').hide(); return; }
        $('#no-invoices-msg').hide(); $('#invoice-table-container').show(); $('#save-allocation-btn').show();
        outstandingInvoices.forEach(inv => {
            $tbody.append(`<tr><td style="font-weight:500">${inv.name}</td><td>₹ ${format_currency(inv.outstanding_amount)}</td>
                <td><input type="number" class="ur-alloc-input allocated-amount" data-invoice="${inv.name}" data-doctype="${doctype}" data-max="${inv.outstanding_amount}" step="0.01" placeholder="0"></td></tr>`);
        });
        $('.allocated-amount').off('input').on('input', function () {
            let max = parseFloat($(this).data('max')), val = parseFloat($(this).val()) || 0;
            if (val > max) { $(this).val(max); frappe.msgprint(`Allocated amount cannot exceed ₹ ${max}.`); }
            update_remaining_amount();
        });
    }

    function save_allocations() {
        const allocations = []; let totalAllocated = 0;
        const paymentAmount = selectedPayment.unallocated_amount;
        $('.allocated-amount').each(function () {
            const amt = parseFloat($(this).val()) || 0;
            if (amt > 0) { allocations.push({ invoice: $(this).data('invoice'), allocated_amount: amt, doctype: $(this).data('doctype') }); totalAllocated += amt; }
        });
        if (totalAllocated > paymentAmount) { frappe.msgprint(`Total (₹ ${totalAllocated}) exceeds unallocated (₹ ${paymentAmount}).`); return; }
        if (!allocations.length) { frappe.msgprint('Please enter at least one allocation amount.'); return; }

        // Confirmation dialog before updating submitted Payment Entry
        frappe.confirm(
            `Are you sure you want to update Payment Entry <b>${selectedPayment.name}</b> with ₹ ${format_currency(totalAllocated)} allocation?`,
            () => {
                frappe.call({
                    method: "nexapp.api.allocate_payment_to_invoices",
                    args: { payment_entry: selectedPayment.name, allocations: JSON.stringify(allocations), company: $('#company-select').val() },
                    callback: function (r) {
                        if (r.message && r.message.status === 'success') {
                            frappe.msgprint(`Payment Entry <b>${r.message.payment_entry}</b> updated successfully.`);
                            togglePanel(false); load_data();
                        } else {
                            frappe.msgprint('Error: ' + (r.message ? r.message.error : 'Unknown error'));
                        }
                    }
                });
            }
        );
    }

    // ========== EVENTS ==========
    $('#first-page').click(() => { currentPage = 1; render_current_page(); update_pagination(); });
    $('#prev-page').click(() => { if (currentPage > 1) { currentPage--; render_current_page(); update_pagination(); } });
    $('#next-page').click(() => { const tp = Math.ceil(totalRecords / perPage); if (currentPage < tp) { currentPage++; render_current_page(); update_pagination(); } });
    $('#last-page').click(() => { currentPage = Math.ceil(totalRecords / perPage); render_current_page(); update_pagination(); });
    $(document).on('click', '#page-numbers .ur-page-btn', function () { currentPage = parseInt($(this).data('page')); render_current_page(); update_pagination(); });
    $('#per-page').change(function () { perPage = parseInt($(this).val()); currentPage = 1; render_current_page(); update_pagination(); });
    $('#apply-filters').click(() => { load_parties(); load_data(); });
    $('#reset-filters').click(() => reset_filters());
    $('#refresh-btn').click(() => { load_parties(); load_data(); });
    $('#company-select').change(() => { load_parties(); load_data(); });
    $('#party-filter').change(() => filter_and_render());
    $('#ur-close, #ur-overlay').click(() => togglePanel(false));
    $('#save-allocation-btn').click(() => save_allocations());

    // Column filter debounce
    let colTimer;
    $(document).on('input', '.ur-col-filter', function () {
        clearTimeout(colTimer);
        colTimer = setTimeout(() => {
            colFilters.date = $('#filter-date').val() || '';
            colFilters.pid = $('#filter-pid').val() || '';
            colFilters.party = $('#filter-party').val() || '';
            colFilters.stmt = $('#filter-stmt').val() || '';
            colFilters.type = $('#filter-type').val() || '';
            colFilters.amount = $('#filter-amount').val() || '';
            filter_and_render();
        }, 300);
    });

    load_companies();
};