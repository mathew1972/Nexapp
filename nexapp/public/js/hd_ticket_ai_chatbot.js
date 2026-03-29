// Nexapp HD Ticket AI Chatbot - ADVANCED CLARIFICATION VERSION
(function () {

    "use strict";

    if (window.hd_ai_chatbot_loaded) return;
    window.hd_ai_chatbot_loaded = true;

    const VERSION = "7.1.0-CLARIFICATION-AI";
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
            const email = frappe.session.user;

            if (
                frappe.boot &&
                frappe.boot.user_info &&
                frappe.boot.user_info[email] &&
                frappe.boot.user_info[email].full_name
            ) {
                return frappe.boot.user_info[email].full_name.split(" ")[0];
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
<span class="hd-ai-title">Nexapp AI Assistant</span>
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

<div class="hd-ai-input-wrapper">
<div class="hd-ai-input-container">

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
                        renderTicketsTable(r.message.tickets, r.message.labels, filters, $container);
                    } else {
                        $container.html('<div style="color:#777;font-size:12px;padding:10px;">No closed tickets found for these filters.</div>');
                    }
                }
            });
        }

        function renderTicketsTable(tickets, labels, filters, $container) {
            const keys = Object.keys(labels);
            const headers = Object.values(labels);

            let html = `
            <div class="hd-ai-report-container">
                <div class="hd-ai-report-header">
                    <span class="hd-ai-report-title">Ticket # ${current_ticket} History (${tickets.length} Tickets)</span>
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


        function sendMessage() {

            if (is_sending) return;

            const message = $input.val()?.trim();
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
                    // Basic HTML sanitization (allow <b>, <i>, <br>, <p>, <div>, <button>)
                    response = response.replace(/<(?!\/?(b|i|br|p|div|button)\b)[^>]*>/g, "");
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