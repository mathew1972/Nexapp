frappe.provide('frappe.pages');

frappe.pages['survey-dashboard'] = frappe.pages['survey-dashboard'] || {};
frappe.pages['survey-dashboard'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Survey Analytics Master'),
        single_column: true
    });

    try {
        var dashboard = new SurveyDashboardRenderer(wrapper, page);
        dashboard.init();
    } catch (e) {
        console.error("Dashboard Renderer Error:", e);
    }
}

// Support for underscore naming alias
frappe.pages['survey_dashboard'] = frappe.pages['survey-dashboard'];

function SurveyDashboardRenderer(wrapper, page) {
    this.wrapper = $(wrapper);
    this.page = page;
    this.filters = { survey: "" };

    this.init = function () {
        this.page.clear_fields();
        this.setup_layout();
        this.setup_filters();
        this.setup_menu();
        this.refresh();
    };

    /**
     * V19 Impressive Horizontal Design
     */
    this.setup_layout = function () {
        const html = `
            <style>
                .v19-dashboard { background: #f8fafc; min-height: 100vh; padding: 10px; font-family: 'Inter', sans-serif; }
                .v19-header-card { display: none; }
                
                .v19-filter-strip { background: white; padding: 12px 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
                .v19-filter-item { flex: 1; min-width: 250px; }
                .v19-btn-export { background: #00a19a; color: white !important; font-weight: 700; height: 36px; display: flex; align-items: center; gap: 8px; border: none; box-shadow: 0 2px 5px rgb(0 161 154 / 0.2); }
                
                .v19-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                .v19-stat-card { background: white; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .v19-stat-label { font-size: 9px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em; display: block; }
                .v19-stat-val { font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1; }
                
                .v19-section-head { margin: 40px 0 25px; font-size: 20px; font-weight: 800; color: #334155; display: flex; align-items: center; gap: 12px; }
                .v19-section-head i { color: #00a19a; }
                
                /* SurveyCake v19 Impressive Visuals */
                .v19-q-card { background: white; border-radius: 10px; border-top: 5px solid #00a19a; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: flex; overflow: hidden; min-height: 220px; }
                .v19-q-left { flex: 0 0 32%; padding: 25px; border-right: 1px solid #f1f5f9; background: #fafdfc; display: flex; flex-direction: column; justify-content: center; }
                .v19-q-right { flex: 1; padding: 25px; display: flex; flex-direction: column; justify-content: center; }
                
                .v19-q-title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 15px; line-height: 1.4; }
                .v19-tag { display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: #e6f6f5; color: #00a19a; text-transform: uppercase; border: 1px solid #b3e6e3; width: fit-content; margin-bottom: 10px; }
                .v19-count-badge { font-size: 13px; font-weight: 600; color: #64748b; margin-top: 5px; }

                /* V21 Gender Drilldown Styling */
                .v21-legend { display: flex; gap: 15px; margin-left: auto; font-size: 11px; font-weight: 700; text-transform: uppercase; }
                .v21-legend-item { display: flex; align-items: center; gap: 6px; }
                .v21-dot { width: 10px; height: 10px; border-radius: 50%; }
                .v21-dot.male { background: #3b82f6; }
                .v21-dot.female { background: #f472b6; }

                /* Custom Impressive Bar Styling (v21 Gender Split) */
                .v20-custom-bar-row { display: flex; align-items: center; margin-bottom: 15px; gap: 15px; }
                .v20-custom-bar-label { flex: 0 0 140px; text-align: right; font-size: 13px; font-weight: 700; color: #334155; line-height: 1.2; }
                .v20-custom-bar-track { flex: 1; height: 30px; background: #f1f5f9; border-radius: 6px; position: relative; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); display: flex; }
                .v21-bar-segment { height: 100%; transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                .v21-bar-segment:hover { filter: brightness(1.15); box-shadow: inset 0 0 10px rgba(255,255,255,0.2); z-index: 10; }
                .v21-bar-segment.male { background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%); }
                .v21-bar-segment.female { background: linear-gradient(180deg, #fb7185 0%, #f472b6 100%); }
                
                .v22-bar-text { color: #fff; font-size: 13px; font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.2); opacity: 0; transition: opacity 0.5s ease 1s; white-space: nowrap; }
                .v21-bar-segment[style*="width"] .v22-bar-text { opacity: 1; } /* Show when width is animated */
                
                .v20-custom-bar-val { flex: 0 0 110px; font-size: 15px; font-weight: 800; color: #1e293b; display: flex; align-items: center; justify-content: flex-end; }
                .v20-custom-bar-val b { color: #00a19a; font-size: 17px; margin-left: 8px; }

                /* V23 Vertical Rating Chart Styling */
                .v23-rating-container { display: flex; justify-content: space-around; align-items: flex-end; height: 185px; padding: 35px 15px 10px; background: #fff; border-radius: 8px; margin-top: 5px; border: 1px solid #f1f5f9; position: relative; }
                .v23-rating-track { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; position: relative; max-width: 70px; }
                .v23-rating-bar-wrapper { flex: 1; width: 30px; background: #f1f5f9; border-radius: 5px 5px 0 0; position: relative; overflow: hidden; display: flex; flex-direction: column-reverse; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
                .v23-rating-segment { width: 100%; transition: height 1s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center; }
                .v23-rating-segment.male { background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%); }
                .v23-rating-segment.female { background: linear-gradient(180deg, #f472b6 0%, #db2777 100%); }
                .v23-rating-segment:hover { filter: brightness(1.1); transform: scaleX(1.1); z-index: 10; }
                
                .v23-rating-pct-top { font-size: 12px; font-weight: 800; color: #7c3aed; margin-bottom: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); opacity: 0; transition: opacity 0.5s ease 1s; }
                .v23-rating-track[data-has-val="true"] .v23-rating-pct-top { opacity: 1; }
                
                .v23-rating-score-label { font-size: 13px; font-weight: 800; color: #64748b; padding-top: 8px; border-top: 2px solid #f1f5f9; width: 100%; text-align: center; margin-top: 4px; }

                .v20-btn-export { background: #00a19a; color: white !important; font-weight: 700; padding: 10px 20px; border-radius: 8px; border: none; box-shadow: 0 4px 10px rgb(0 161 154 / 0.4); }

                @media (max-width: 991px) {
                    .v19-q-card { flex-direction: column; }
                    .v19-q-left { flex: none; border-right: none; border-bottom: 1px solid #f1f5f9; padding: 30px; }
                    .v19-custom-bar-label { flex: 0 0 120px; font-size: 12px; }
                }

                @media print {
                    .v19-dashboard { background: white !important; padding: 0 !important; }
                    .v19-filter-strip, .v19-btn-export, .page-head, .page-head-container { display: none !important; }
                    .v19-q-card { border: 1px solid #ddd !important; box-shadow: none !important; break-inside: avoid; flex-direction: row !important; margin-bottom: 20px !important; }
                    .v21-bar-segment, .v23-rating-segment { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .v21-bar-segment.male, .v23-rating-segment.male { background: #3b82f6 !important; }
                    .v21-bar-segment.female, .v23-rating-segment.female { background: #f472b6 !important; }
                    .v22-bar-text, .v23-rating-pct-top { opacity: 1 !important; visibility: visible !important; color: #000 !important; }
                    .v20-custom-bar-label { flex: 0 0 100px !important; font-size: 11px !important; }
                    .v20-custom-bar-val { flex: 0 0 80px !important; font-size: 12px !important; }
                    .v19-q-left { flex: 0 0 30% !important; padding: 15px !important; }
                    .v19-q-right { padding: 15px !important; }
                }
            </style>

			<div class="v19-dashboard">
				<div class="v19-filter-strip">
                    <div id="v19-survey-filter" class="v19-filter-item"></div>
                    <button id="update-dashboard-btn" class="btn btn-primary btn-sm" style="margin-top: 0; min-width: 140px; height: 36px; font-weight: 700;">${__('Update Dashboard')}</button>
                    <button class="btn btn-primary v19-btn-export" id="v17-print-pdf">
                        <i class="fa fa-file-pdf-o"></i> ${__('Export Report')}
                    </button>
                </div>

				<div class="v19-stats-grid">
					<div class="v19-stat-card"><span class="v19-stat-label">${__('Participation')}</span><span id="stat-total-participation" class="v19-stat-val">0</span></div>
					<div class="v19-stat-card"><span class="v19-stat-label">${__('Responses')}</span><span id="stat-responses" class="v19-stat-val">0</span></div>
					<div class="v19-stat-card"><span class="v19-stat-label">${__('Female')}</span><span id="stat-female" class="v19-stat-val">0</span></div>
					<div class="v19-stat-card"><span class="v19-stat-label">${__('Male')}</span><span id="stat-male" class="v19-stat-val">0</span></div>
				</div>

				<div id="v19-main-content">
					<div class="v19-section-head"><i class="fa fa-bar-chart"></i> ${__('Insights')}</div>
					<div id="questions-container" style="padding: 100px 60px; background: white; border-radius: 12px; border: 3px dashed #00a19a; text-align: center; color: #00a19a;">
                        <p style="font-weight: 700; font-size: 18px;">${__('Select a Survey to visualize your results.')}</p>
                    </div>
				</div>
			</div>
			</div>
		`;
        const target = this.page.main || this.wrapper.find('.layout-main-section');
        target.html(html);

        this.wrapper.find('#update-dashboard-btn').on('click', () => {
            this.filters.survey = this.survey_control ? this.survey_control.get_value() : "";
            this.refresh();
        });

        this.wrapper.find('#v17-print-pdf').on('click', () => {
            window.print();
        });
    };

    /**
     * V19 Impressive Redesign Logic
     */
    this.setup_menu = function () {
        this.page.add_menu_item(__('Print PDF'), () => window.print(), true);
    };

    this.setup_filters = function () {
        const filter_target = this.wrapper.find('#v19-survey-filter');
        if (!filter_target.length) return;

        this.survey_control = frappe.ui.form.make_control({
            df: {
                fieldname: 'survey',
                label: __('Survey Filter'),
                fieldtype: 'Link',
                options: 'Employee Survey',
                placeholder: __('Search for survey...'),
                get_query: () => { return { filters: { is_active: 1 } }; },
                on_change: () => {
                    setTimeout(() => {
                        const val = this.survey_control.get_value();
                        if (val !== this.filters.survey) {
                            this.filters.survey = val;
                            this.refresh();
                        }
                    }, 50);
                }
            },
            parent: filter_target,
            render_input: true
        });
    };

    this.refresh = function () {
        const survey = this.filters.survey || (this.survey_control ? this.survey_control.get_value() : "");
        this.reset_ui(survey);

        if (survey) {
            this.fetch_dashboard_stats(survey);
            this.fetch_question_analytics(survey);
        } else {
            this.wrapper.find('#stat-total-participation, #stat-responses, #stat-female, #stat-male').text('0');
        }
    };

    this.reset_ui = function (survey) {
        if (survey) {
            this.wrapper.find('#stat-total-participation, #stat-responses, #stat-female, #stat-male').text('0');
            this.wrapper.find('#questions-container').html(`<div style="padding: 60px;"><div class="spinner-border text-primary" style="color: #00a19a !important; width: 3rem; height: 3rem;"></div><p style="margin-top:20px; font-weight: 700; color: #00a19a;">${__('Generating Powerful Analysis...')}</p></div>`);
        } else {
            const container = this.wrapper.find('#questions-container');
            container.empty().css({ 'padding': '100px 60px', 'background': 'white', 'border': '3px dashed #00a19a', 'text-align': 'center' })
                .html(`<p style="font-weight: 700; font-size: 18px; color: #00a19a;">${__('Select a Survey to visualize your results.')}</p>`);
        }
    };

    /**
     * Backend Call Wrappers
     */
    this.fetch_dashboard_stats = function (survey) {
        frappe.call({
            method: 'nexapp.survey_dashboard_api.get_dashboard_stats',
            args: { survey: survey },
            callback: (r) => {
                if (r.message) {
                    const stats = r.message;
                    this.wrapper.find('#stat-total-participation').text(stats.total_participation || 0);
                    this.wrapper.find('#stat-responses').text(stats.total_responses || 0);
                    this.wrapper.find('#stat-female').text(stats.female_responses || 0);
                    this.wrapper.find('#stat-male').text(stats.male_responses || 0);
                }
            }
        });
    };

    this.fetch_question_analytics = function (survey) {
        const container = this.wrapper.find('#questions-container');
        frappe.call({
            method: 'nexapp.survey_dashboard_api.get_question_analytics',
            args: { survey: survey },
            callback: (r) => {
                if (r.message && r.message.length > 0) {
                    container.empty().css({ 'text-align': 'left', 'background': 'transparent', 'border': 'none', 'padding': '0' });
                    r.message.forEach((q, idx) => {
                        this.render_v19_card(container, q, idx);
                    });
                } else {
                    container.html(`<div style="padding: 40px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);"><p class="text-muted">${__('No feedback entries found.')}</p></div>`);
                }
            }
        });
    };

    /**
     * V19 Horizontal Drill-down (Custom Bars for Most Impression)
     */
    this.render_v19_card = function (container, q, idx) {
        const chartId = `chart-v19-${idx}`;
        const card = $(`
            <div class="v19-q-card">
                <div class="v19-q-left">
                    <span class="v19-tag">${q.type}</span>
                    <div class="v19-q-title">${q.question}</div>
                    <div class="v19-q-meta" style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <span class="v19-count-badge">${q.count} ${__('Total Submissions')}</span>
                            ${q.avg ? `<span class="v19-count-badge" style="color: #00a19a;">${__('Avg:')} <b>${q.avg} / 5</b></span>` : ''}
                        </div>
                        
                        <div class="v21-legend" style="margin-left: 0;">
                            <div class="v21-legend-item"><div class="v21-dot male"></div> ${__('Male')}</div>
                            <div class="v21-legend-item"><div class="v21-dot female"></div> ${__('Female')}</div>
                        </div>
                    </div>
                </div>
                <div class="v19-q-right" id="${chartId}">
                </div>
            </div>
        `).appendTo(container);

        if (q.data && q.data.length > 0) {
            const right_pane = card.find('.v19-q-right');
            const isRating = q.type === 'Rating (1–5)';

            if (isRating) {
                const ratingContainer = $(`<div class="v23-rating-container"></div>`).appendTo(right_pane);

                // Scores 1 to 5
                [1, 2, 3, 4, 5].forEach(score => {
                    const d = q.data.find(item => item.label == score) || { value: 0, male: 0, female: 0 };
                    const total_pct = q.count > 0 ? (d.value / q.count * 100) : 0;
                    const male_pct = q.count > 0 ? (d.male / q.count * 100) : 0;
                    const female_pct = q.count > 0 ? (d.female / q.count * 100) : 0;

                    const trackHtml = `
                        <div class="v23-rating-track" data-has-val="${d.value > 0}">
                            <div class="v23-rating-pct-top">${Math.round(total_pct)}%</div>
                            <div class="v23-rating-bar-wrapper">
                                <div class="v23-rating-segment male" style="height: 0%;" data-height="${male_pct}" title="Male: ${d.male}">
                                    ${male_pct >= 10 ? `<div class="v22-bar-text">${Math.round(male_pct)}%</div>` : ''}
                                </div>
                                <div class="v23-rating-segment female" style="height: 0%;" data-height="${female_pct}" title="Female: ${d.female}">
                                    ${female_pct >= 10 ? `<div class="v22-bar-text">${Math.round(female_pct)}%</div>` : ''}
                                </div>
                            </div>
                            <div class="v23-rating-score-label">${score}</div>
                        </div>
                    `;
                    ratingContainer.append(trackHtml);
                });

                // Trigger vertical animations
                setTimeout(() => {
                    ratingContainer.find('.v23-rating-segment').each(function () {
                        $(this).css('height', $(this).data('height') + '%');
                    });
                }, 200);
            }
            else {
                q.data.forEach(d => {
                    const total_pct = q.count > 0 ? (d.value / q.count * 100) : 0;
                    const male_pct = q.count > 0 ? (d.male / q.count * 100) : 0;
                    const female_pct = q.count > 0 ? (d.female / q.count * 100) : 0;

                    const rowHtml = `
                        <div class="v20-custom-bar-row">
                            <div class="v20-custom-bar-label">${d.label}</div>
                            <div class="v20-custom-bar-track">
                                <div class="v21-bar-segment male" style="width: 0%;" data-pct="${male_pct}" title="Male: ${d.male}">
                                    ${male_pct >= 8 ? `<div class="v22-bar-text">${Math.round(male_pct)}%</div>` : ''}
                                </div>
                                <div class="v21-bar-segment female" style="width: 0%;" data-pct="${female_pct}" title="Female: ${d.female}">
                                    ${female_pct >= 8 ? `<div class="v22-bar-text">${Math.round(female_pct)}%</div>` : ''}
                                </div>
                            </div>
                            <div class="v20-custom-bar-val">${d.value} <b>(${Math.round(total_pct)}%)</b></div>
                        </div>
                    `;
                    right_pane.append(rowHtml);
                });

                // Trigger animations
                setTimeout(() => {
                    right_pane.find('.v21-bar-segment').each(function () {
                        $(this).css('width', $(this).data('pct') + '%');
                    });
                }, 200);
            }
        }
    };
}
