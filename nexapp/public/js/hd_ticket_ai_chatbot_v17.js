// Nexapp HD Ticket AI Chatbot - ADVANCED CLARIFICATION VERSION
(function () {

    "use strict";

    if (window.hd_ai_chatbot_v16_loaded) return;
    window.hd_ai_chatbot_v16_loaded = true;

    // Clean up any stale chatbot elements from old versions
    $("#hd-ai-chatbot").remove();
    $("#hd-ai-fab-v12").remove();

    const VERSION = "16.0.0-REFRESHED";
    console.log(`%c Nexapp AI Assistant ${VERSION} Loaded`,
        'background:#7D32E8;color:white;padding:4px 8px;border-radius:4px;');

    let ai_chat_enabled = null;
    let current_ticket = null;
    let is_sending = false;   // throttle flag

    /* ---------------------------------------------------------
    GET USER FIRST NAME
    --------------------------------------------------------- */
    function getUserFirstName() {
        try {
            // Priority 1: frappe.boot.user_fullname
            if (window.frappe && frappe.boot && frappe.boot.user_fullname) {
                const name = frappe.boot.user_fullname.trim();
                if (name && name.toLowerCase() !== "guest") {
                    return name.split(" ")[0];
                }
            }

            // Priority 2: frappe.session.user_fullname
            if (window.frappe && frappe.session && frappe.session.user_fullname) {
                const name = frappe.session.user_fullname.trim();
                if (name && name.toLowerCase() !== "guest") {
                    return name.split(" ")[0];
                }
            }

            // Priority 3: user_info map
            const email = frappe.session.user;
            if (frappe.boot && frappe.boot.user_info && frappe.boot.user_info[email]) {
                const name = frappe.boot.user_info[email].full_name;
                if (name) return name.split(" ")[0];
            }
        } catch (e) {
            console.warn("User name read failed", e);
        }

        return "User";
    }


    /* ---------------------------------------------------------
    GET ACTIVE HD TICKET
    --------------------------------------------------------- */
    function getActiveTicketContext() {

        const route = frappe.get_route();

        if (route && route[0] === "Form" && route[1] === "HD Ticket" && route[2]) {
            return { name: route[2] };
        }

        return null;
    }


    /* ---------------------------------------------------------
    HANDLE TICKET CHANGE
    --------------------------------------------------------- */
    function handleTicketChange() {

        const ctx = getActiveTicketContext();

        if (!ctx) {
            hideAiEverything();
            return;
        }

        if (current_ticket !== ctx.name) {

            current_ticket = ctx.name;

            console.log("AI Context Switched →", current_ticket);

            if ($("#hd-ai-chatbot").length) {
                resetChatUI();
            }
        }

        checkVisibility();
    }


    /* ---------------------------------------------------------
    RESET CHAT UI
    --------------------------------------------------------- */
    function resetChatUI() {

        const firstName = getUserFirstName();

        $("#hd-ai-messages").html(`
        <div class="hd-ai-bot">
        Hi <b>${escapeHtml(firstName)}</b>! 👋<br>
        Now working on ticket <b>#${escapeHtml(current_ticket)}</b>.<br>
        Ask me anything.
        </div>
    `);
    }


    /* ---------------------------------------------------------
    VISIBILITY CONTROL
    --------------------------------------------------------- */
    function checkVisibility() {

        const ctx = getActiveTicketContext();

        if (!ctx) {
            $("#hd-ai-fab-v12").hide();
            return;
        }

        if (ai_chat_enabled !== null) {
            ai_chat_enabled ? showAiFab() : hideAiEverything();
            return;
        }

        frappe.call({
            method: "nexapp.api.is_chatbot_enabled",
            callback: function (r) {
                ai_chat_enabled = !!r.message;
                ai_chat_enabled ? showAiFab() : hideAiEverything();
            },
            error: function () {
                hideAiEverything();
            }
        });
    }


    /* ---------------------------------------------------------
    SHOW FAB
    --------------------------------------------------------- */
    function showAiFab() {

        const selector = "#hd-ai-fab-v12";

        if (!$(selector).length) {

            $("body").append(`<div id="hd-ai-fab-v12">🤖</div>`);

            $(selector).on("click", function () {

                if ($("#hd-ai-chatbot").length) {
                    toggleChatbot();
                } else {

                    const ctx = getActiveTicketContext();

                    if (ctx && ctx.name) {
                        current_ticket = ctx.name;
                        openChat();
                        toggleChatbot(true);
                    }
                }
            });
        }

        $(selector).css("display", "flex");
    }


    /* ---------------------------------------------------------
    HIDE
    --------------------------------------------------------- */
    function hideAiEverything() {
        $("#hd-ai-fab-v12").hide();
        $("#hd-ai-chatbot").removeClass("visible");
    }


    /* ---------------------------------------------------------
    TOGGLE
    --------------------------------------------------------- */
    function toggleChatbot(force = false) {

        const $chat = $("#hd-ai-chatbot");
        const $fab = $("#hd-ai-fab-v12");

        if (force || !$chat.hasClass("visible")) {
            $chat.addClass("visible");
            $fab.addClass("active");
        } else {
            $chat.removeClass("visible");
            $fab.removeClass("active");
        }
    }


    /* ---------------------------------------------------------
    ROUTER EVENTS
    --------------------------------------------------------- */
    frappe.router.on("change", () => {
        setTimeout(handleTicketChange, 300);
    });

    frappe.ui.form.on("HD Ticket", {
        refresh: function () {
            setTimeout(handleTicketChange, 300);
        }
    });


    /* ---------------------------------------------------------
    OPEN CHATBOT
    --------------------------------------------------------- */
    function openChat() {

        if ($("#hd-ai-chatbot").length) return;

        const firstName = getUserFirstName();

        const chatbot_html = `
<div id="hd-ai-chatbot">

<div class="hd-ai-header">
<div class="hd-ai-header-content">
<div class="hd-ai-logo">🤖</div>
<span class="hd-ai-title">Nexapp AI Assistant ✨</span>
</div>

<div class="hd-ai-actions">
<span id="hd-ai-expand" title="Toggle Size">⛶</span>
<span id="hd-ai-refresh" title="Clear Chat">↻</span>
<span id="hd-ai-close" title="Close">✕</span>
</div>
</div>

<div id="hd-ai-messages">
<div class="hd-ai-bot">
Hi <b>${escapeHtml(firstName)}</b>! 👋<br>
Now working on ticket <b>#${escapeHtml(current_ticket)}</b>.
</div>
</div>

<!-- PROMPT DROPDOWN -->
<div class="hd-ai-prompt-dropdown" id="hd-ai-prompt-dropdown">
<div class="hd-ai-dropdown-header">Quick Prompts</div>
<div class="hd-ai-dropdown-body">
<div class="hd-ai-dropdown-item" data-prompt="Site Info">🏢 Site Info</div>
<div class="hd-ai-dropdown-item" data-prompt="LMS Info">📡 LMS Info</div>
<div class="hd-ai-dropdown-item" data-prompt="Provisioning Info">⚙️ Provisioning Info</div>
<div class="hd-ai-dropdown-item" data-prompt="__create_task__">✅ Create Task</div>
<div class="hd-ai-dropdown-item" data-prompt="__maintenance__">🔧 Maintenance</div>
<div class="hd-ai-dropdown-item" data-prompt="__ticket_history__">📋 Ticket History</div>
<div class="hd-ai-dropdown-item" data-prompt="__insight__">🔍 Insite</div>
</div>
</div>

<div class="hd-ai-input-wrapper">
<div class="hd-ai-input-container">

<button id="hd-ai-quick-actions" title="Prompt">⚡︎</button>
<input type="text" id="hd-ai-input" placeholder="Ask a question..." autocomplete="off"/>

<button id="hd-ai-send">
<svg viewBox="0 0 24 24">
<line x1="22" y1="2" x2="11" y2="13"></line>
<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
</svg>
</button>

</div>
</div>
</div>
`;

        $("body").append(chatbot_html);

        initChat();
    }


    /* ---------------------------------------------------------
    🔥 ENHANCED CHAT LOGIC (CLARIFICATION SUPPORT + THROTTLE)
    --------------------------------------------------------- */
    function initChat() {

        const $input = $("#hd-ai-input");
        const $send = $("#hd-ai-send");
        const $messages = $("#hd-ai-messages");

        $("#hd-ai-close").on("click", () => toggleChatbot(false));

        $("#hd-ai-expand").on("click", function () {
            $("#hd-ai-chatbot").toggleClass("maximized");
            $(this).text($("#hd-ai-chatbot").hasClass("maximized") ? "❐" : "⛶");
        });

        // --- REPORT LOGIC ---
        $messages.on("click", ".hd-ai-report-btn", function () {
            const $trigger = $(this).closest(".hd-ai-report-trigger");
            const filters = $trigger.data("filters");
            fetchAndRenderReport(filters, $trigger);
        });

        $messages.on("click", ".hd-ai-direct-download-btn", function () {
            const $trigger = $(this).closest(".hd-ai-report-trigger");
            const filters = $trigger.data("filters");
            const url = `/api/method/nexapp.api.download_closed_tickets_csv?filters=${encodeURIComponent(JSON.stringify(filters))}`;
            window.location.href = url;
        });

        function fetchAndRenderReport(filters, $container) {
            $container.html(`
            <div class="hd-ai-loading">
                <div class="hd-ai-dot"></div>
                <div class="hd-ai-dot"></div>
                <div class="hd-ai-dot"></div>
            </div>
        `);

            frappe.call({
                method: "nexapp.api.get_filtered_closed_tickets",
                args: {
                    filters: filters,
                    current_ticket: current_ticket
                },
                callback: function (r) {
                    if (r.message && r.message.tickets && r.message.tickets.length > 0) {
                        renderTicketsTable(r.message.tickets, r.message.labels, filters, $container, r.message.customer_name);
                    } else {
                        $container.html('<div style="color:#777;font-size:12px;padding:10px;">No closed tickets found for these filters.</div>');
                    }
                }
            });
        }

        function renderTicketsTable(tickets, labels, filters, $container, customerName) {
            const keys = Object.keys(labels);
            const headers = Object.values(labels);

            const custDisplay = customerName ? ` — ${escapeHtml(customerName)}` : '';
            let html = `
            <div class="hd-ai-report-container">
                <div class="hd-ai-report-header">
                    <span class="hd-ai-report-title">Ticket # ${current_ticket}${custDisplay} History (${tickets.length} Tickets)</span>
                    <a href="#" class="hd-ai-download-link" data-filters='${JSON.stringify(filters)}'>Download Excel</a>
                </div>
                <div class="hd-ai-report-table-wrapper">
                    <table class="hd-ai-report-table">
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tickets.map(t => `
                                <tr>
                                    ${keys.map(k => `<td>${escapeHtml(String(t[k] || ''))}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
            $container.html(html);
            $messages.scrollTop($messages[0].scrollHeight);
        }

        $messages.on("click", ".hd-ai-download-link", function (e) {
            e.preventDefault();
            const filters = $(this).data("filters");
            const url = `/api/method/nexapp.api.download_closed_tickets_csv?filters=${encodeURIComponent(JSON.stringify(filters))}&current_ticket=${current_ticket}`;
            window.location.href = url;
        });
        // --- END REPORT LOGIC ---

        $("#hd-ai-refresh").on("click", function () {

            frappe.call({
                method: "nexapp.api.hd_ticket_ai_chat",
                args: {
                    ticket: current_ticket,
                    question: "clear"
                },
                callback: function () {
                    resetChatUI();
                }
            });
        });


        // --- QUICK ACTIONS TOGGLE ---
        $("#hd-ai-quick-actions").on("click", function (e) {
            e.stopPropagation();
            const $dropdown = $("#hd-ai-prompt-dropdown");
            $dropdown.toggleClass("active");
            $(this).toggleClass("active");
        });

        // Close dropdown on click outside
        $(document).on("click", function (e) {
            if (!$(e.target).closest("#hd-ai-prompt-dropdown, #hd-ai-quick-actions").length) {
                $("#hd-ai-prompt-dropdown").removeClass("active");
                $("#hd-ai-quick-actions").removeClass("active");
            }
        });

        // --- PROMPT DROPDOWN HANDLER ---
        $(".hd-ai-dropdown-item").on("click", function () {
            const prompt = $(this).data("prompt");
            if (!prompt) return;

            $("#hd-ai-prompt-dropdown").removeClass("active");
            $("#hd-ai-quick-actions").removeClass("active");

            // Intercept Create Task to show task-type options
            if (prompt === "__create_task__") {
                showTaskTypeOptions();
                return;
            }

            // Intercept Maintenance
            if (prompt === "__maintenance__") {
                handleMaintenance();
                return;
            }

            // Intercept Ticket History
            if (prompt === "__ticket_history__") {
                handleTicketHistory();
                return;
            }

            // Intercept Insight
            if (prompt === "__insight__") {
                handleInsight();
                return;
            }

            sendMessage(prompt);
        });

        // --- CREATE TASK: SHOW OPTIONS ---
        function showTaskTypeOptions() {
            $messages.append(`<div class="hd-ai-user">Create Task</div>`);
            $messages.append(`
                <div class="hd-ai-bot">
                    Which task do you want to create?<br><br>
                    <button class="hd-ai-task-btn" data-task-type="finance">💰 Finance Issue</button>
                    <button class="hd-ai-task-btn" data-task-type="hardware">🖥️ Hardware Dispatch</button>
                </div>
            `);
            $messages.scrollTop($messages[0].scrollHeight);
        }

        // --- MAINTENANCE: SHOW CONFIRMATION ---
        function handleMaintenance() {
            if (is_sending) return;

            const firstName = getUserFirstName();
            $messages.append(`<div class="hd-ai-user">Maintenance</div>`);
            $messages.append(`
                <div class="hd-ai-bot">
                    Hi <b>${escapeHtml(firstName)}</b>, are you sure you want to create a <b>Maintenance Visit</b> for this ticket?<br><br>
                    <button class="hd-ai-maint-btn hd-ai-maintenance-confirm" data-confirm="yes">✅ Yes, Create</button>
                    <button class="hd-ai-maint-btn hd-ai-maintenance-confirm" data-confirm="no">❌ No, Cancel</button>
                </div>
            `);
            $messages.scrollTop($messages[0].scrollHeight);
        }

        // --- MAINTENANCE: HANDLE CONFIRMATION ---
        $messages.on("click", ".hd-ai-maintenance-confirm", function () {
            if (is_sending) return;

            const choice = $(this).data("confirm");

            // Disable both buttons
            $messages.find(".hd-ai-maintenance-confirm").prop("disabled", true).css("opacity", "0.5");

            if (choice === "no") {
                const firstName = getUserFirstName();
                $messages.append(`<div class="hd-ai-bot">No worries <b>${escapeHtml(firstName)}</b>, Maintenance Visit creation cancelled.</div>`);
                $messages.scrollTop($messages[0].scrollHeight);
                return;
            }

            // User confirmed — create the Maintenance Visit
            $messages.append(`<div class="hd-ai-user">Yes, Create</div>`);

            const $loading = $(`
                <div class="hd-ai-loading">
                    <div class="hd-ai-dot"></div>
                    <div class="hd-ai-dot"></div>
                    <div class="hd-ai-dot"></div>
                </div>`);
            $messages.append($loading);
            $messages.scrollTop($messages[0].scrollHeight);

            is_sending = true;

            frappe.call({
                method: "nexapp.api.create_maintenance_visit_from_ticket",
                args: { ticket: current_ticket },
                callback: function (r) {
                    $loading.remove();
                    let response = r.message || "Maintenance Visit created.";
                    $messages.append(`<div class="hd-ai-bot">${response}</div>`);
                    $messages.scrollTop($messages[0].scrollHeight);
                    is_sending = false;
                },
                error: function () {
                    $loading.remove();
                    $messages.append(`<div class="hd-ai-bot">⚠️ Error creating Maintenance Visit</div>`);
                    $messages.scrollTop($messages[0].scrollHeight);
                    is_sending = false;
                }
            });
        });

        // --- TICKET HISTORY: HANDLE ---
        function handleTicketHistory() {
            if (is_sending) return;

            const firstName = getUserFirstName();
            $messages.append(`<div class="hd-ai-user">Ticket History</div>`);

            const $reportBox = $(`
                <div class="hd-ai-bot" style="max-width:98%!important;width:98%!important;padding:8px!important;">
                    <div class="hd-ai-loading">
                        <div class="hd-ai-dot"></div>
                        <div class="hd-ai-dot"></div>
                        <div class="hd-ai-dot"></div>
                    </div>
                </div>
            `);
            $messages.append($reportBox);
            $messages.scrollTop($messages[0].scrollHeight);

            is_sending = true;

            const historyFilters = { is_history: true };

            frappe.call({
                method: "nexapp.api.get_filtered_closed_tickets",
                args: {
                    filters: historyFilters,
                    current_ticket: current_ticket
                },
                callback: function (r) {
                    is_sending = false;
                    if (r.message && r.message.tickets && r.message.tickets.length > 0) {
                        renderTicketsTable(r.message.tickets, r.message.labels, historyFilters, $reportBox, r.message.customer_name);
                    } else {
                        $reportBox.html(`Hi <b>${escapeHtml(firstName)}</b>, no closed ticket history found for this circuit.`);
                    }
                    $messages.scrollTop($messages[0].scrollHeight);
                },
                error: function () {
                    is_sending = false;
                    $reportBox.html(`⚠️ Error loading ticket history.`);
                    $messages.scrollTop($messages[0].scrollHeight);
                }
            });
        }

        // --- INSIGHT: HANDLE ---
        function handleInsight() {
            if (is_sending) return;

            $messages.append(`<div class="hd-ai-user">🔍 Insite</div>`);

            // Auto-maximize for better view
            const $chat = $("#hd-ai-chatbot");
            if (!$chat.hasClass("maximized")) {
                $chat.addClass("maximized");
                $("#hd-ai-expand").text("❐");
            }

            const $insightBox = $(`
                <div class="hd-ai-bot" style="max-width:98%!important;width:98%!important;padding:8px!important;">
                    <div class="hd-ai-loading">
                        <div class="hd-ai-dot"></div>
                        <div class="hd-ai-dot"></div>
                        <div class="hd-ai-dot"></div>
                    </div>
                </div>
            `);
            $messages.append($insightBox);
            $messages.scrollTop($messages[0].scrollHeight);

            is_sending = true;

            frappe.call({
                method: "nexapp.api.get_ticket_insight",
                args: { ticket: current_ticket },
                callback: function (r) {
                    is_sending = false;
                    if (r.message && r.message.error) {
                        $insightBox.html(`⚠️ ${r.message.error}`);
                    } else if (r.message) {
                        $insightBox.html(renderInsightDashboard(r.message));
                    } else {
                        $insightBox.html(`⚠️ No insight data available.`);
                    }
                    $messages.scrollTop($messages[0].scrollHeight);
                },
                error: function () {
                    is_sending = false;
                    $insightBox.html(`⚠️ Error loading ticket insight.`);
                    $messages.scrollTop($messages[0].scrollHeight);
                }
            });
        }

        // --- INSIGHT: RENDER DASHBOARD ---
        function renderInsightDashboard(data) {
            const s = data.summary || {};
            const ta = data.time_analysis || {};
            const ra = data.response_analysis || {};
            const impact = data.impact || {};
            const priorityDist = data.priority_dist || {};
            const rca = data.rca || {};
            const slaDist = data.sla_dist || {};
            const chart = ta.status_chart || [];
            const impactChart = impact.chart || [];
            const priorityChart = priorityDist.chart || [];
            const rcaChart = rca.chart || [];
            const slaChart = slaDist.chart || [];

            // Helper: build a pie section HTML (modern box version)
            function buildPieHtml(title, icon, chartData, totalTickets) {
                if (!chartData || chartData.length === 0) return '';
                let gradStops = '', cumPct = 0;
                chartData.forEach((item, i) => {
                    const start = cumPct;
                    cumPct += item.percent;
                    gradStops += `${item.color} ${start}% ${cumPct}%`;
                    if (i < chartData.length - 1) gradStops += ', ';
                });

                let h = `<div class="ins-chart-box">`;
                h += `<div class="ins-section-title"><span class="ins-section-icon">${icon}</span> ${title}</div>`;
                h += `<div class="ins-impact-row">`;
                h += `<div class="ins-impact-pie" style="background:conic-gradient(${gradStops})">
                    <div class="ins-impact-pie-inner">${totalTickets}</div>
                </div>`;
                h += `<div class="ins-impact-legend">`;
                chartData.forEach(item => {
                    h += `<div class="ins-impact-legend-item">
                        <span class="ins-dot" style="background:${item.color}"></span>
                        <span class="ins-impact-label">${esc(item.label)}</span>
                        <span class="ins-impact-val">${item.count} (${item.percent}%)</span>
                    </div>`;
                });
                h += `</div></div></div>`;
                return h;
            }

            // --- REDESIGNED DASHBOARD ASSEMBLY ---
            let html = `<div class="ins-dashboard">`;
            html += `<div class="ins-header">
                <div class="ins-title">🔍 Ticket Insite</div>
                <div class="ins-analysis-banner">Analysis for Last 10 Tickets</div>
            </div>`;

            // Start charts grid (2x2 Balanced)
            html += `<div class="ins-charts-grid">`;

            // Row 1: Impact & Priority
            html += buildPieHtml('Impact', '💥', impactChart, impact.total_tickets);
            html += buildPieHtml('Priority', '🚨', priorityChart, priorityDist.total_tickets);

            // Row 2: RCA & SLA Status
            html += buildPieHtml('Root Cause Analysis', '🔎', rcaChart, rca.total_tickets);
            html += buildPieHtml('SLA Status', '📜', slaChart, slaDist.total_tickets);

            html += `</div>`; // Close grid
            html += `</div>`; // Close dashboard
            return html;
        }

        // Lightweight escape for insight renderer
        function esc(str) {
            if (str === null || str === undefined) return '—';
            return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
        }

        // --- CREATE TASK: HANDLE BUTTON CLICK ---
        $messages.on("click", ".hd-ai-task-btn", function () {
            if (is_sending) return;

            const taskType = $(this).data("task-type");
            const label = taskType === "finance" ? "Finance Issue" : "Hardware Dispatch";

            // Disable both buttons to prevent double-click
            $messages.find(".hd-ai-task-btn").prop("disabled", true).css("opacity", "0.5");

            $messages.append(`<div class="hd-ai-user">${escapeHtml(label)}</div>`);

            const $loading = $(`
                <div class="hd-ai-loading">
                    <div class="hd-ai-dot"></div>
                    <div class="hd-ai-dot"></div>
                    <div class="hd-ai-dot"></div>
                </div>`);
            $messages.append($loading);
            $messages.scrollTop($messages[0].scrollHeight);

            is_sending = true;

            // Step 1: Send "create task" to set backend state
            frappe.call({
                method: "nexapp.api.hd_ticket_ai_chat",
                args: { ticket: current_ticket, question: "create task" },
                callback: function () {
                    // Step 2: Send the selection ("1" or "2")
                    const answer = taskType === "finance" ? "1" : "2";
                    frappe.call({
                        method: "nexapp.api.hd_ticket_ai_chat",
                        args: { ticket: current_ticket, question: answer },
                        callback: function (r) {
                            $loading.remove();
                            let response = r.message || "Task created successfully.";
                            response = response.replace(/<(?!\/?(?:b|i|br|p|div|button|table|thead|tbody|tr|th|td)\b)[^>]*>/g, "");
                            $messages.append(`<div class="hd-ai-bot">${response}</div>`);
                            $messages.scrollTop($messages[0].scrollHeight);
                            is_sending = false;
                        },
                        error: function () {
                            $loading.remove();
                            $messages.append(`<div class="hd-ai-bot">⚠️ Error creating task</div>`);
                            $messages.scrollTop($messages[0].scrollHeight);
                            is_sending = false;
                        }
                    });
                },
                error: function () {
                    $loading.remove();
                    $messages.append(`<div class="hd-ai-bot">⚠️ Error creating task</div>`);
                    $messages.scrollTop($messages[0].scrollHeight);
                    is_sending = false;
                }
            });
        });

        function sendMessage(customMessage = null) {

            if (is_sending) return;

            const message = typeof customMessage === 'string' ? customMessage : $input.val()?.trim();
            if (!message) return;

            // CLEAR COMMAND
            if (message.toLowerCase() === "clear") {

                frappe.call({
                    method: "nexapp.api.hd_ticket_ai_chat",
                    args: {
                        ticket: current_ticket,
                        question: "clear"
                    },
                    callback: function () {
                        resetChatUI();
                    }
                });

                $input.val("");
                return;
            }

            // INTERCEPT "create task" typed by user
            if (message.toLowerCase().includes("create task")) {
                $input.val("");
                showTaskTypeOptions();
                return;
            }

            // INTERCEPT "maintenance" typed by user
            if (message.toLowerCase().includes("maintenance")) {
                $input.val("");
                handleMaintenance();
                return;
            }

            // INTERCEPT "insight" typed by user
            if (message.toLowerCase().includes("insight")) {
                $input.val("");
                handleInsight();
                return;
            }

            $messages.append(`<div class="hd-ai-user">${escapeHtml(message)}</div>`);
            $input.val("");

            const $loading = $(`
<div class="hd-ai-loading">
<div class="hd-ai-dot"></div>
<div class="hd-ai-dot"></div>
<div class="hd-ai-dot"></div>
</div>`);

            $messages.append($loading);
            $messages.scrollTop($messages[0].scrollHeight);

            is_sending = true;
            $send.prop("disabled", true);
            $input.prop("disabled", true);

            frappe.call({
                method: "nexapp.api.hd_ticket_ai_chat",
                args: {
                    ticket: current_ticket,
                    question: message
                },
                callback: function (r) {

                    $loading.remove();

                    let response = r.message || "No response";
                    // Basic HTML sanitization (allow <b>, <i>, <br>, <p>, <div>, <button>, <table>, <thead>, <tbody>, <tr>, <th>, <td>)
                    response = response.replace(/<(?!\/?(b|i|br|p|div|button|table|thead|tbody|tr|th|td)\b)[^>]*>/g, "");
                    $messages.append(`<div class="hd-ai-bot">${response}</div>`);
                    $messages.scrollTop($messages[0].scrollHeight);

                    is_sending = false;
                    $send.prop("disabled", false);
                    $input.prop("disabled", false);
                    $input.focus();
                },
                error: function () {

                    $loading.remove();

                    $messages.append(`<div class="hd-ai-bot">⚠️ Error occurred</div>`);
                    $messages.scrollTop($messages[0].scrollHeight);

                    is_sending = false;
                    $send.prop("disabled", false);
                    $input.prop("disabled", false);
                    $input.focus();
                }
            });
        }

        $send.on("click", sendMessage);

        $input.on("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Simple HTML escape helper
    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }


    /* ---------------------------------------------------------
    INIT
    --------------------------------------------------------- */
    $(function () {
        handleTicketChange();
        setTimeout(handleTicketChange, 1000);
    });

})();