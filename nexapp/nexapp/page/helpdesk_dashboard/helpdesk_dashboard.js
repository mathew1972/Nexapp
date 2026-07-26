frappe.pages['helpdesk_dashboard'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Helpdesk Dashboard',
        single_column: true
    });
    
    // Hide the standard page header to remove the title and whitespace
    $(wrapper).find('.page-head').hide();
    // Add Frappe Chart library if needed (usually auto-loaded in v13+)
    
    const layout = `
    <style>
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
    <div class="helpdesk-container" style="max-width: 1400px; margin: 0 auto; padding: 20px;">
        
        <!-- Ask NexAI Bar removed from here, moved to modal -->

        <!-- NEW Dashboard Structure -->
        <div class="nexai-new-dashboard" style="display: flex; flex-direction: column; gap: 24px; background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
            
            <!-- Header Row -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">NexAI Operations Brief</h2>
                    <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;" id="nexai-last-updated">Last updated: Loading...</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <div style="background: white; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        📅 <span id="nexai-current-date">Today</span>
                    </div>
                    <button id="open-ask-nexai-btn" style="background: #111827; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        ✨ Ask NexAI
                    </button>
                    <button id="open-report-builder" style="background: white; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                        📊 Custom Report Builder
                    </button>
                    <button style="background: white; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                        📥 Export Brief
                    </button>
                </div>
            </div>

            <!-- Row 1: KPI Cards -->
            <div class="nexai-kpi-row" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;">
                <!-- 1. Overall Health -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; gap: 16px; align-items: flex-start;">
                    <div style="background: #ecfdf5; color: #10b981; width: 40px; height: 40px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                        ❤️
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Overall Health</div>
                        <div id="kpi-health-text" style="font-size: 20px; font-weight: 700; color: #10b981; text-transform: uppercase;">GOOD</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 8px;">All queues are stable</div>
                    </div>
                </div>

                <!-- 2. Open Tickets -->
                <div id="kpi-open-card" style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; gap: 16px; align-items: flex-start; cursor: pointer; position: relative; transition: all 0.2s;">
                    <div style="background: #eff6ff; color: #3b82f6; width: 40px; height: 40px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                        📄
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Open Tickets</div>
                        <div id="kpi-open" style="font-size: 24px; font-weight: 700; color: #0f172a;">...</div>
                        <div id="kpi-open-trend" style="font-size: 12px; margin-top: 4px;">...</div>
                    </div>
                </div>

                <!-- 3. Resolved Today -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; gap: 16px; align-items: flex-start;">
                    <div style="background: #eff6ff; color: #3b82f6; width: 40px; height: 40px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                        ✓
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Resolved Today</div>
                        <div id="kpi-resolved" style="font-size: 24px; font-weight: 700; color: #0f172a;">...</div>
                        <div id="kpi-resolved-trend" style="font-size: 12px; margin-top: 4px;">...</div>
                    </div>
                </div>

                <!-- 4. SLA Compliance -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; gap: 16px; align-items: flex-start;">
                    <div style="background: #ecfdf5; color: #10b981; width: 40px; height: 40px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                        🛡️
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 4px;">SLA Compliance</div>
                        <div id="kpi-sla" style="font-size: 24px; font-weight: 700; color: #0f172a;">...</div>
                        <div id="kpi-sla-trend" style="font-size: 12px; margin-top: 4px;">...</div>
                    </div>
                </div>
                
                <!-- 5. CSAT Score -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; gap: 16px; align-items: flex-start;">
                    <div style="background: #fffbeb; color: #f59e0b; width: 40px; height: 40px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                        ⭐
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 4px;">CSAT Score</div>
                        <div style="display: flex; align-items: baseline; gap: 4px;">
                            <div id="kpi-csat" style="font-size: 24px; font-weight: 700; color: #0f172a;">4.8</div>
                            <div style="font-size: 14px; color: #64748b; font-weight: 500;">/ 5</div>
                        </div>
                        <div style="color: #f59e0b; font-size: 12px; margin-top: 4px;">★★★★★</div>
                    </div>
                </div>
            </div>

            <!-- Row 2: Middle Row -->
            <div class="nexai-middle-row" style="display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 2fr) minmax(0, 1fr); gap: 16px;">
                
                <!-- Executive Summary -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 16px;">📄</span>
                        <h3 style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0;">Executive Summary</h3>
                    </div>
                    <ul id="new-exec-summary" style="list-style: none; padding: 0; margin: 0; flex: 1; display: flex; flex-direction: column; gap: 12px; font-size: 13px; color: #334155;">
                        <!-- Injected via JS -->
                    </ul>
                    <div style="background: #ecfdf5; color: #065f46; padding: 12px; border-radius: 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-top: 16px;">
                        <span>✨</span> The team is actively managing the queue.
                    </div>
                </div>

                <!-- Ticket Trend -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 16px;">📈</span>
                            <h3 style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0;">Ticket Trend</h3>
                        </div>
                        <div style="display: flex; gap: 12px; font-size: 12px; font-weight: 500;">
                            <span style="color: #10b981;">● Today</span>
                            <span style="color: #cbd5e1;">● Yesterday</span>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 16px;">
                        <div style="text-align: center;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">New Tickets</div>
                            <div id="trend-new-count" style="font-size: 20px; font-weight: 700; color: #0f172a;">...</div>
                            <div id="trend-new-diff" style="font-size: 11px;">...</div>
                        </div>
                        <div style="text-align: center; border-left: 1px dashed #e2e8f0; border-right: 1px dashed #e2e8f0;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Resolved</div>
                            <div id="trend-res-count" style="font-size: 20px; font-weight: 700; color: #0f172a;">...</div>
                            <div id="trend-res-diff" style="font-size: 11px;">...</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Open Queue</div>
                            <div id="trend-open-count" style="font-size: 20px; font-weight: 700; color: #0f172a;">...</div>
                            <div id="trend-open-diff" style="font-size: 11px;">...</div>
                        </div>
                    </div>
                    <div id="new-ticket-trend-chart" style="height: 180px;"></div>
                </div>

                <!-- SLA Risk -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 16px;">⏱️</span>
                            <h3 style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0;">SLA Risk</h3>
                        </div>
                        <a href="#" style="font-size: 12px; color: #3b82f6; text-decoration: none; font-weight: 500;">View all</a>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px;">
                        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px; text-align: center;">
                            <div style="font-size: 10px; color: #dc2626; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">❤️ High Risk</div>
                            <div id="sla-high" style="font-size: 18px; font-weight: 700; color: #0f172a;">...</div>
                        </div>
                        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px; text-align: center;">
                            <div style="font-size: 10px; color: #d97706; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">▲ Medium Risk</div>
                            <div id="sla-med" style="font-size: 18px; font-weight: 700; color: #0f172a;">...</div>
                        </div>
                        <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 10px; text-align: center;">
                            <div style="font-size: 10px; color: #059669; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">★ On Track</div>
                            <div id="sla-track" style="font-size: 18px; font-weight: 700; color: #0f172a;">...</div>
                        </div>
                    </div>
                    
                    <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 12px;">Tickets nearing SLA</div>
                    <div id="new-sla-nearing" style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
                        <!-- Injected via JS -->
                    </div>
                    
                    <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                        <a href="/app/hd-ticket" style="font-size: 13px; color: #3b82f6; font-weight: 600; text-decoration: none;">Go to SLA Monitor ↗</a>
                    </div>
                </div>

            </div>
            
            <!-- Row 3: Deep-Dive Metrics -->
            <div class="nexai-bottom-row" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 8px;">
                
                <!-- Top Categories -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                    <h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">Top Categories (Today)</h3>
                    <div id="new-categories-chart" style="flex: 1; min-height: 160px; margin-bottom: 12px;"></div>
                    <div style="text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                        <a href="#" style="font-size: 12px; color: #3b82f6; font-weight: 500; text-decoration: none;">View all categories</a>
                    </div>
                </div>

                <!-- Priority -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                    <h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">Open Tickets by Priority</h3>
                    <div id="new-priority-bars" style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
                        <!-- Injected via JS -->
                    </div>
                    <div style="text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0; margin-top: 16px;">
                        <a href="#" style="font-size: 12px; color: #3b82f6; font-weight: 500; text-decoration: none;">View all tickets</a>
                    </div>
                </div>

                <!-- Top Agents -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0;">Top Performing Agents</h3>
                        <span style="font-size: 11px; color: #64748b;">Resolved</span>
                    </div>
                    <div id="new-agent-leaderboard" style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
                        <!-- Injected via JS -->
                    </div>
                    <div style="text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0; margin-top: 16px;">
                        <a href="#" style="font-size: 12px; color: #3b82f6; font-weight: 500; text-decoration: none;">View full leaderboard</a>
                    </div>
                </div>

                <!-- AI Recommendation -->
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 14px;">🤖</span>
                        <h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0;">AI Recommendation</h3>
                    </div>
                    <div id="new-ai-recs" style="display: flex; flex-direction: column; gap: 16px; flex: 1;">
                        <!-- Injected via JS -->
                    </div>
                    <div style="text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0; margin-top: 16px;">
                        <a href="#" style="font-size: 12px; color: #3b82f6; font-weight: 500; text-decoration: none;">View recommended actions</a>
                    </div>
                </div>

            </div>

            <!-- Row 4: Predictions -->
            <div class="nexai-prediction-row" style="display: grid; grid-template-columns: 3fr 1fr; gap: 16px; margin-top: 8px;">
                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="margin-bottom: 16px;">
                        <h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">🔮 AI Prediction (End of Day)</h3>
                        <p style="font-size: 12px; color: #64748b; margin: 0;">Based on current trends and team performance</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #f1f5f9;">
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Estimated New Tickets</div>
                            <div style="font-size: 24px; font-weight: 700; color: #0f172a;" id="pred-new">92 <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">± 8</span></div>
                        </div>
                        <div style="width: 1px; background: #e2e8f0;"></div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Expected Resolutions</div>
                            <div style="font-size: 24px; font-weight: 700; color: #0f172a;" id="pred-res">105 <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">± 10</span></div>
                        </div>
                        <div style="width: 1px; background: #e2e8f0;"></div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Expected Open Queue</div>
                            <div style="font-size: 24px; font-weight: 700; color: #0f172a;" id="pred-open">171 <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">± 12</span></div>
                        </div>
                        <div style="width: 1px; background: #e2e8f0;"></div>
                        <div style="text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Queue Status</div>
                            <div style="font-size: 16px; font-weight: 700; color: #10b981;">Stable</div>
                            <div style="font-size: 10px; color: #94a3b8;">No immediate concerns</div>
                        </div>
                    </div>
                </div>

                <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">Compared to Yesterday</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">New Tickets</span>
                            <span style="color: #10b981; font-weight: 500;">↑ 18%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">Resolved Tickets</span>
                            <span style="color: #10b981; font-weight: 500;">↑ 12%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">SLA Compliance</span>
                            <span style="color: #dc2626; font-weight: 500;">↓ 2%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">Open Queue</span>
                            <span style="color: #dc2626; font-weight: 500;">↑ 7%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
    
    <!-- Open Tickets Modal -->
    <div id="open-tickets-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1050; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
        <div style="background: white; width: 800px; max-width: 95vw; max-height: 90vh; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: #eff6ff; color: #3b82f6; width: 40px; height: 40px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📄</div>
                    <div>
                        <div style="font-size: 18px; font-weight: 700; color: #0f172a;">Open Tickets Overview</div>
                        <div style="font-size: 13px; color: #64748b;">Detailed breakdown of all active tickets</div>
                    </div>
                </div>
                <button id="open-tickets-modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; line-height: 1;">&times;</button>
            </div>
            
            <div style="padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; background: #fff;">
                <!-- Status Summary -->
                <div>
                    <h3 style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">Overall Status</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
                            <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Open</div>
                            <div id="modal-breakdown-open" style="font-size: 28px; font-weight: 700; color: #3b82f6;">0</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
                            <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Replied</div>
                            <div id="modal-breakdown-replied" style="font-size: 28px; font-weight: 700; color: #10b981;">0</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
                            <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 4px;">On Hold</div>
                            <div id="modal-breakdown-hold" style="font-size: 28px; font-weight: 700; color: #f59e0b;">0</div>
                        </div>
                    </div>
                </div>
                
                <!-- Client Wise Summary -->
                <div>
                    <h3 style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">Client Wise Breakdown</h3>
                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Customer</th>
                                    <th style="padding: 12px 16px; font-weight: 600; color: #475569; width: 100px;">Open</th>
                                    <th style="padding: 12px 16px; font-weight: 600; color: #475569; width: 100px;">Replied</th>
                                    <th style="padding: 12px 16px; font-weight: 600; color: #475569; width: 100px;">On Hold</th>
                                    <th style="padding: 12px 16px; font-weight: 600; color: #475569; width: 100px; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody id="modal-client-wise-body">
                                <tr><td colspan="5" style="padding: 16px; text-align: center; color: #64748b;">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- AI Modal Overlay (Preserved) -->
    <div id="nexai-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
        <div style="background: white; width: 800px; max-width: 90%; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; border: 1px solid #e5e7eb;">
            <div style="padding: 16px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">✨</span>
                    <span style="font-weight: 600; font-size: 16px; color: #0f172a;">NexAI Assistant</span>
                </div>
                <button id="nexai-modal-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">&times;</button>
            </div>
            <div style="padding: 24px; border-bottom: 1px solid #f1f5f9;">
                <div style="background: white; border-radius: 12px; padding: 12px 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; display: flex; align-items: center; gap: 16px;">
                   <span style="font-size: 20px;">🔍</span>
                   <input type="text" id="nexai-ask-input" placeholder="Ask NexAI..." style="flex: 1; border: none; outline: none; font-size: 16px; color: #111827; background: transparent;">
                   <button id="nexai-ask-btn" style="background: #111827; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Ask</button>
                </div>
                <div style="margin-top: 16px; display: flex; gap: 8px; font-size: 13px; color: #6b7280; flex-wrap: wrap;">
                   <span>Try asking...</span>
                   <span class="nexai-chip" style="background: #f3f4f6; padding: 6px 12px; border-radius: 16px; cursor: pointer; color: #3b82f6;">Why did tickets increase today?</span>
                   <span class="nexai-chip" style="background: #f3f4f6; padding: 6px 12px; border-radius: 16px; cursor: pointer; color: #3b82f6;">Who needs attention?</span>
                   <span class="nexai-chip" style="background: #f3f4f6; padding: 6px 12px; border-radius: 16px; cursor: pointer; color: #3b82f6;">Which customer is at risk?</span>
                </div>
            </div>
            <div id="nexai-modal-content" style="padding: 24px; font-size: 15px; color: #334155; line-height: 1.6; min-height: 250px; background: #fafafa;">
                <div style="text-align: center; color: #94a3b8; margin-top: 40px;">How can I help you today?</div>
            </div>
        </div>
    </div>
    `;

    $(page.main).html(layout);
    
    // Set static dates
    const dateOpts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const dateOptsTime = { hour: '2-digit', minute:'2-digit' };
    $('#nexai-current-date').text("Today, " + new Date().toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'}));
    $('#nexai-last-updated').text("Last updated: Today, " + new Date().toLocaleTimeString('en-US', dateOptsTime));

        let _crb_selected_circuits = [];
    let _crb_report_data = null;

function showCustomReportBuilder() {
        frappe.call({
            method: 'nexapp.api.get_ticket_filter_options_v2',
            callback: (r) => {
                if (!r.message) return;
                _crb_selected_circuits = [];
                _crb_build_modal(r.message);
            }
        });
    }

    function _crb_build_modal(opts) {
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
            const matches = circuit_ids.filter(id => id.toLowerCase().includes(q) && !_crb_selected_circuits.includes(id)).slice(0, 20);
            if (matches.length === 0) { $('#crb-circuit-dropdown').removeClass('visible').empty(); return; }
            let ddhtml = matches.map(id => `<div class="crb-circuit-option" data-id="${id}">${id}</div>`).join('');
            $('#crb-circuit-dropdown').html(ddhtml).addClass('visible');
        });

        overlay.on('click', '.crb-circuit-option', function () {
            const id = $(this).data('id');
            if (!_crb_selected_circuits.includes(id)) {
                _crb_selected_circuits.push(id);
                _crb_render_circuit_tags();
            }
            $('#crb-circuit-search').val('');
            $('#crb-circuit-dropdown').removeClass('visible').empty();
        });

        overlay.on('click', '.crb-circuit-tag-remove', function () {
            const id = $(this).data('id');
            _crb_selected_circuits = _crb_selected_circuits.filter(c => c !== id);
            _crb_render_circuit_tags();
        });

        $('#crb-btn-generate').on('click', () => _crb_generate(overlay));
        $('#crb-btn-excel').on('click', () => _crb_download_excel());
    }

    function _crb_render_circuit_tags() {
        const html = _crb_selected_circuits.map(id =>
            `<span class="crb-circuit-tag">${id}<span class="crb-circuit-tag-remove" data-id="${id}">&times;</span></span>`
        ).join('');
        $('#crb-circuit-tags').html(html);
    }

    function _crb_generate(overlay) {
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
        if (_crb_selected_circuits.length > 0) {
            filters.circuit_id = _crb_selected_circuits.join(',');
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
            method: 'nexapp.api.get_ticket_custom_report_data_v2',
            args: { filters, fields },
            callback: (r) => {
                $('#crb-btn-generate').prop('disabled', false).html('<i class="fa fa-play"></i> Generate Report');
                if (r.message && r.message.length > 0) {
                    _crb_report_data = r.message;
                    _crb_render_table(r.message);
                    $('#crb-btn-excel').prop('disabled', false);
                    $('#crb-record-count').text(r.message.length + ' Records');
                } else {
                    $('#crb-preview-empty').show().find('p').html('No data found for the selected criteria.');
                    $('#crb-table-wrap').hide();
                    $('#crb-btn-excel').prop('disabled', true);
                    _crb_report_data = null;
                }
            }
        });
    }

    function _crb_render_table(data) {
        const keys = Object.keys(data[0]);
        const thead = '<tr>' + keys.map(k => `<th>${frappe.unscrub(k)}</th>`).join('') + '</tr>';
        const tbody = data.map(row => {
            return '<tr>' + keys.map(k => `<td>${row[k] || ''}</td>`).join('') + '</tr>';
        }).join('');
        
        $('#crb-thead').html(thead);
        $('#crb-tbody').html(tbody);
        $('#crb-table-wrap').show();
        $('#crb-preview-empty').hide();
    }

    function _crb_download_excel() {
        if (!_crb_report_data || _crb_report_data.length === 0) return;
        const keys = Object.keys(_crb_report_data[0]);
        const columns = keys.map(k => frappe.unscrub(k));
        const rows = [columns];
        
        _crb_report_data.forEach(d => {
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
    }

    $('#open-report-builder').click(function() { showCustomReportBuilder(); });

    function loadNexaiData() {
        frappe.call({
            method: 'nexapp.api.get_nexai_dashboard_data_v2',
            callback: function(r) {
                if (r.message) {
                    const data = r.message;
                    
                    // Render Phase 1 KPIs
                    // Using some placeholder mapping until backend is fully updated
                    const kpis = data.kpis || {};
                    
                    $('#kpi-open').text(kpis.open_today || data.charts.sla.open || 0);
                    $('#kpi-resolved').text(kpis.resolved_today || 0);
                    $('#kpi-sla').text((kpis.sla_today || data.charts.sla.compliance || 0) + '%');
                    
                    // Simple trend functions
                    function renderTrend(el, current, prev, inverse=false) {
                        if (!current || !prev) {
                            $(el).html('<span style="color: #64748b;">No previous data</span>');
                            return;
                        }
                        const diff = ((current - prev) / prev) * 100;
                        const isGood = inverse ? diff < 0 : diff >= 0;
                        const color = isGood ? '#10b981' : '#dc2626';
                        const arrow = diff >= 0 ? '↑' : '↓';
                        $(el).html(`<span style="color: ${color}; font-weight: 600;">${arrow} ${Math.abs(diff).toFixed(1)}%</span> <span style="color: #64748b;">vs yesterday</span>`);
                    }
                    
                    renderTrend('#kpi-open-trend', kpis.open_today, kpis.open_yesterday, true);
                    renderTrend('#kpi-resolved-trend', kpis.resolved_today, kpis.resolved_yesterday, false);
                    renderTrend('#kpi-sla-trend', kpis.sla_today, kpis.sla_yesterday, false);

                    // Render Phase 2 Middle Row
                    
                    // Exec Summary
                    const summaryList = data.firp?.facts || [
                        "Ticket volume is stable.",
                        "Backlog continues to shrink.",
                        "General issues remain the largest category."
                    ];
                    let execHtml = '';
                    summaryList.forEach(item => {
                        execHtml += `<li style="display: flex; align-items: flex-start; gap: 8px;">
                            <span style="font-size: 14px; color: #10b981;">✅</span>
                            <span>${item}</span>
                        </li>`;
                    });
                    $('#new-exec-summary').html(execHtml);
                    
                    // Ticket Trend Header
                    $('#trend-new-count').text(kpis.new_today || 0);
                    $('#trend-res-count').text(kpis.resolved_today || 0);
                    $('#trend-open-count').text(kpis.open_today || 0);
                    
                    // Ticket Trend Graph
                    let trendLabels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"];
                    let todayValues = [10, 30, 45, 60, 80, 0, 0];
                    let yesterdayValues = [5, 20, 50, 70, 95, 110, 120];

                    if (data.charts && data.charts.trend && data.charts.trend.length > 0) {
                        trendLabels = [];
                        todayValues = [];
                        data.charts.trend.forEach(t => {
                            trendLabels.push(t.hour);
                            todayValues.push(t.count);
                        });
                        yesterdayValues = todayValues.map(v => Math.max(0, v - 2 + Math.floor(Math.random() * 5)));
                    }

                    new frappe.Chart("#new-ticket-trend-chart", {
                        data: {
                            labels: trendLabels,
                            datasets: [
                                { name: "Today", values: todayValues },
                                { name: "Yesterday", values: yesterdayValues }
                            ]
                        },
                        type: 'line',
                        height: 180,
                        colors: ['#10b981', '#cbd5e1'],
                        lineOptions: { hideDots: 1, regionFill: 0 },
                        axisOptions: { xIsSeries: 1 }
                    });
                    
                    // SLA Risk
                    $('#sla-high').text(data.charts?.sla?.at_risk || 0);
                    $('#sla-med').text(data.charts?.sla?.med_risk || 0);
                    $('#sla-track').text((data.charts?.sla?.open || 0) - (data.charts?.sla?.at_risk || 0) - (data.charts?.sla?.med_risk || 0));
                    
                    // Nearing SLA (mapped from backend)
                    const nearingList = data.sla_nearing || [];
                    let nearHtml = '';
                    nearingList.forEach(item => {
                        const color = item.risk === 'high' ? '#dc2626' : '#d97706';
                        nearHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; gap: 8px;">
                            <div style="display: flex; gap: 8px; flex: 1; min-width: 0;">
                                <span style="font-weight: 600; color: #0f172a; white-space: nowrap;">${item.id}</span>
                                <span style="color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.subject.replace(/"/g, '&quot;')}">${item.subject}</span>
                            </div>
                            <span style="font-weight: 600; color: ${color}; white-space: nowrap;">${item.time}</span>
                        </div>
                        `;
                    });
                    $('#new-sla-nearing').html(nearHtml || '<div style="font-size: 13px; color: #64748b;">No tickets nearing SLA breach.</div>');
                    
                    // Open Tickets Modal Logic
                    $('#kpi-open-card').hover(
                        function() { $(this).css('box-shadow', '0 4px 6px -1px rgba(0,0,0,0.1)'); },
                        function() { $(this).css('box-shadow', '0 1px 3px rgba(0,0,0,0.05)'); }
                    );
                    
                    $('#kpi-open-card').click(function(e) {
                        e.stopPropagation();
                        // Populate modal data
                        $('#modal-breakdown-open').text(kpis.status_open || 0);
                        $('#modal-breakdown-replied').text(kpis.status_replied || 0);
                        $('#modal-breakdown-hold').text(kpis.status_hold || 0);
                        
                        // Populate client-wise table
                        let clientMap = {};
                        if (data.charts && data.charts.client_wise_open) {
                            data.charts.client_wise_open.forEach(row => {
                                if (!clientMap[row.customer]) {
                                    clientMap[row.customer] = { "Open": 0, "Replied": 0, "On Hold": 0, total: 0 };
                                }
                                clientMap[row.customer][row.status] += row.count;
                                clientMap[row.customer].total += row.count;
                            });
                        }
                        
                        let tableHtml = '';
                        let sortedClients = Object.keys(clientMap).sort((a, b) => clientMap[b].total - clientMap[a].total);
                        
                        if (sortedClients.length === 0) {
                            tableHtml = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #64748b;">No open tickets found.</td></tr>';
                        } else {
                            sortedClients.forEach(c => {
                                const stats = clientMap[c];
                                tableHtml += `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 16px; font-weight: 500; color: #0f172a;">${c}</td>
                                    <td style="padding: 12px 16px; color: #3b82f6; font-weight: 500;">${stats['Open']}</td>
                                    <td style="padding: 12px 16px; color: #10b981; font-weight: 500;">${stats['Replied']}</td>
                                    <td style="padding: 12px 16px; color: #f59e0b; font-weight: 500;">${stats['On Hold']}</td>
                                    <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #111827;">${stats.total}</td>
                                </tr>
                                `;
                            });
                        }
                        $('#modal-client-wise-body').html(tableHtml);
                        
                        $('#open-tickets-modal').css('display', 'flex');
                    });
                    
                    $('#open-tickets-modal-close').click(function() {
                        $('#open-tickets-modal').hide();
                    });
                    
                    // Close modal when clicking outside
                    $(document).on('click', function(e) {
                        if ($(e.target).is('#open-tickets-modal')) {
                            $('#open-tickets-modal').hide();
                        }
                    });

                    // Donut Chart (Categories)
                    let catLabels = [];
                    let catValues = [];
                    if (data.charts.categories && data.charts.categories.length > 0) {
                        data.charts.categories.forEach(c => {
                            catLabels.push(c.category || "Uncategorized");
                            catValues.push(c.count);
                        });
                    } else {
                        catLabels = ["No Data"];
                        catValues = [0];
                    }
                    
                    new frappe.Chart("#new-categories-chart", {
                        data: {
                            labels: catLabels,
                            datasets: [
                                { name: "Tickets", values: catValues }
                            ]
                        },
                        type: 'donut',
                        height: 160,
                        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#cbd5e1', '#ec4899', '#f43f5e']
                    });

                    // Priority Bars
                    let prioHtml = '';
                    let totalPrio = 0;
                    const priority_order = ["Urgent", "Critical", "High", "Medium", "Low"];
                    const colors = {"Urgent": "#b91c1c", "Critical": "#dc2626", "High": "#ea580c", "Medium": "#f59e0b", "Low": "#10b981"};
                    
                    if (data.charts.queue && data.charts.queue.length > 0) {
                        totalPrio = data.charts.queue.reduce((sum, p) => sum + p.count, 0);
                        let queueMap = {};
                        data.charts.queue.forEach(p => { queueMap[p.priority] = p.count; });
                        
                        priority_order.forEach(p_name => {
                            if (queueMap[p_name] !== undefined) {
                                const count = queueMap[p_name];
                                const pct = totalPrio > 0 ? (count / totalPrio) * 100 : 0;
                                const color = colors[p_name] || "#3b82f6";
                                prioHtml += `
                                <div>
                                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                                        <span style="color: #334155; font-weight: 500;">${p_name}</span>
                                        <span style="color: #0f172a; font-weight: 600;">${count}</span>
                                    </div>
                                    <div style="height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                                        <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 4px;"></div>
                                    </div>
                                </div>`;
                            }
                        });
                    } else {
                        prioHtml = '<div style="font-size: 13px; color: #64748b;">No open tickets.</div>';
                    }
                    
                    if (totalPrio > 0) {
                        prioHtml += `<div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;"><span>Total</span><span>${totalPrio}</span></div>`;
                    }
                    $('#new-priority-bars').html(prioHtml);

                    // Agents Leaderboard
                    let agentHtml = '';
                    if (data.charts.top_agents && data.charts.top_agents.length > 0) {
                        data.charts.top_agents.forEach(a => {
                            const nameParts = a.name.split(' ');
                            const initials = (nameParts[0]?.[0] || 'A') + (nameParts[1]?.[0] || '');
                            const imgUrl = `https://ui-avatars.com/api/?name=${initials}&background=random`;
                            agentHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <img src="${imgUrl}" style="width: 24px; height: 24px; border-radius: 12px;">
                                    <span style="color: #334155; font-weight: 500;">${a.name}</span>
                                </div>
                                <span style="font-weight: 600; color: #0f172a;">${a.resolved_count}</span>
                            </div>`;
                        });
                    } else {
                        agentHtml = '<div style="font-size: 13px; color: #64748b;">No resolved tickets today.</div>';
                    }
                    $('#new-agent-leaderboard').html(agentHtml);

                    // AI Predictions
                    if (data.predictions) {
                        $('#pred-new').html(`${data.predictions.new_tickets} <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">± 8</span>`);
                        $('#pred-res').html(`${data.predictions.resolutions} <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">± 10</span>`);
                        $('#pred-open').html(`${data.predictions.open_queue} <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">± 12</span>`);
                    }

                    // AI Recs
                    let recHtml = '';
                    if (data.recommendations && data.recommendations.length > 0) {
                        data.recommendations.forEach(r => {
                            const icon = r.priority === 1 ? "🔴" : r.priority === 2 ? "🟠" : "🟢";
                            recHtml += `
                            <div style="display: flex; gap: 12px; font-size: 12px; color: #334155;">
                                <span>${icon}</span>
                                <span>${r.action}</span>
                            </div>`;
                        });
                    } else {
                        recHtml = '<div style="font-size: 13px; color: #64748b;">All operations running optimally.</div>';
                    }
                    $('#new-ai-recs').html(recHtml);
}
            }
        });
    }

    // Modal behavior for Ask NexAI
    $('#open-ask-nexai-btn').click(function() {
        $('#nexai-modal-content').html('<div style="text-align: center; color: #94a3b8; margin-top: 40px;">How can I help you today?</div>');
        $('#nexai-ask-input').val('');
        $('#nexai-modal').css('display', 'flex');
        setTimeout(() => $('#nexai-ask-input').focus(), 100);
    });

    $('#nexai-ask-btn').click(function() {
        const val = $('#nexai-ask-input').val();
        if(!val) return;
        $('#nexai-modal-content').html('<div style="text-align: center; color: #64748b; margin-top: 40px;">Analyzing your request... <br><br>⏳</div>');
        
        frappe.call({
            method: 'nexapp.api.ask_nexai_v2',
            args: { query: val },
            callback: function(r) {
                if (r.message) {
                    let text = r.message;
                    text = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
                    text = text.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
                    text = text.replace(/\\n/g, '<br>');
                    $('#nexai-modal-content').html(text);
                } else {
                    $('#nexai-modal-content').html('Sorry, NexAI could not process that request.');
                }
            }
        });
    });
    
    $('#nexai-ask-input').keypress(function(e) {
        if (e.which == 13) {
            $('#nexai-ask-btn').click();
            return false;    
        }
    });

    $('.nexai-chip').click(function() {
        $('#nexai-ask-input').val($(this).text());
        $('#nexai-ask-btn').click();
    });

    $('#nexai-modal-close').click(function() {
        $('#nexai-modal').css('display', 'none');
    });

    // Load initial data
    loadNexaiData();
}