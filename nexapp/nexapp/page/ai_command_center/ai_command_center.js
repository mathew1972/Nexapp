frappe.pages['ai-command-center'].on_page_load = function (wrapper) {

    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'AI Command Center',
        single_column: true
    });

    load_html(page);
};


// ======================================
// LOAD HTML FROM PUBLIC FOLDER
// ======================================
function load_html(page) {

    show_loader(page);

    fetch('/assets/nexapp/html/ai_command_center.html')
        .then(response => {
            if (!response.ok) {
                throw new Error("HTML file not found");
            }
            return response.text();
        })
        .then(html => {
            $(page.body).html(html);
            init_ai();
        })
        .catch(err => {
            console.error("HTML Load Error:", err);
            $(page.body).html(`
                <div class="text-danger">
                    <h4>❌ Failed to load AI Command Center UI</h4>
                    <p>Check file path: /assets/nexapp/html/ai_command_center.html</p>
                </div>
            `);
        });
}


// ======================================
// LOADER UI
// ======================================
function show_loader(page) {
    $(page.body).html(`
        <div style="text-align:center; padding:40px;">
            <h4>⏳ Loading AI Command Center...</h4>
        </div>
    `);
}


// ======================================
// INIT PAGE
// ======================================
function init_ai() {

    set_greeting();
    bind_events();
}


// ======================================
// GREETING
// ======================================
function set_greeting() {

    const user = frappe.session.user_fullname || "User";

    $("#ai-greeting").text("Hi " + frappe.session.user_fullname + ", what would you like to do today?");
}


// ======================================
// EVENT BINDINGS
// ======================================
function bind_events() {

    // Ask AI
    $("#ai-send").off("click").on("click", function () {
        let input = $("#ai-input").val();
        handle_input(input);
    });

    // Enter key
    $("#ai-input").off("keypress").on("keypress", function (e) {
        if (e.which === 13) {
            $("#ai-send").click();
        }
    });

    // Quick actions
    $(".ai-action").off("click").on("click", function () {
        let action = $(this).data("action");
        load_feature(action);
    });
}


// ======================================
// HANDLE USER INPUT
// ======================================
function handle_input(text) {

    if (!text || !text.trim()) {
        frappe.msgprint("Please enter something");
        return;
    }

    let intent = detect_user_intent(text);

    load_feature(intent);
}


// ======================================
// INTENT DETECTION
// ======================================
function detect_user_intent(text) {

    text = text.toLowerCase();

    if (typeof detect_intent === "function") {
        return detect_intent(text);
    }

    // fallback logic
    if (text.includes("feasibility")) return "feasibility";
    if (text.includes("lead")) return "lead";

    return "unknown";
}


// ======================================
// LOAD FEATURE MODULE
// ======================================
function load_feature(feature) {

    const workspace = $("#ai-workspace");

    // Clear workspace
    workspace.html("");

    // Show loading state
    workspace.html(`
        <div style="padding:20px;">
            <p>⚡ Processing...</p>
        </div>
    `);

    setTimeout(() => {

        if (feature === "feasibility") {

            if (typeof render_feasibility === "function") {
                render_feasibility();
            } else {
                workspace.html(`
                    <div class="text-danger">
                        ⚠️ Feasibility module not loaded
                    </div>
                `);
            }

            return;
        }

        if (feature === "lead") {
            workspace.html(`
                <div class="card p-3">
                    <h4>📈 Lead Module</h4>
                    <p>Coming Soon...</p>
                </div>
            `);
            return;
        }

        // Unknown
        workspace.html(`
            <div class="card p-3">
                <p>❓ I didn’t understand. Try:</p>
                <ul>
                    <li>Create feasibility</li>
                    <li>Create lead</li>
                </ul>
            </div>
        `);

    }, 300);
}