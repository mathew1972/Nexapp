// ===========================================
// ORIGINAL CLEAN DESIGN - STABLE
// ===========================================

const init_survey_page = function (wrapper) {
    const $wrapper = $(wrapper);
    let surveyData = null;
    let surveyName = frappe.utils.get_url_arg("survey");

    const initialLayout = `
        <div id="survey-page-root">
            <div class="sticky-progress-container"><div class="sticky-progress-bar" id="page-progress-bar"></div></div>
            <div class="survey-container">
                <div id="submission-status-banner"></div>
                <div id="survey-skeleton">
                    <div class="survey-header" style="height: 250px;"><div class="skeleton-shimmer" style="height: 40px; width: 60%; border-radius: 8px;"></div></div>
                    <div class="survey-card" style="height: 150px;"></div>
                </div>
                <div id="survey-main-content" style="display: none;">
                    <div class="survey-header">
                        <div class="survey-type-badge" id="survey-type-display" style="display: none;"></div>
                        <div class="survey-title" id="survey-title-display"></div>
                        <div class="survey-desc" id="survey-desc-display"></div>
                        <div class="timeline-wrapper">
                            <span class="timeline-label">TIMELINE:</span>
                            <span id="survey-start-display"></span>
                            <div class="timeline-bar"><div class="timeline-progress" id="survey-timeline-progress"></div></div>
                            <span id="survey-end-display"></span>
                        </div>
                    </div>
                    <div id="survey-questions-container"></div>
                    <div class="submit-container">
                        <button class="btn btn-survey btn-save-survey" id="btn-manual-save">Save Progress</button>
                        <button class="btn btn-survey btn-primary-survey" id="btn-manual-submit">Submit Survey</button>
                    </div>
                </div>
            </div>
        </div>
        <div id="confetti-wrapper" class="confetti-container"></div>
    `;

    let main = $wrapper.find(".layout-main-section");
    if (!main.length) main = $wrapper.find(".page-body");
    if (!main.length) main = $wrapper;
    main.html(initialLayout);

    if (!surveyName) {
        renderError(main, "Survey record not found");
        return;
    }

    frappe.call({
        method: "nexapp.api.get_survey_details",
        args: { survey: surveyName },
        callback: function (r) {
            if (!r.message) {
                renderError(main, "Survey missing or inactive");
                return;
            }
            surveyData = r.message;
            $wrapper.find("#survey-skeleton").fadeOut(200, function () {
                renderUI(surveyData);
                $wrapper.find("#survey-main-content").fadeIn(400);
            });
        }
    });

    function renderUI(data) {
        let existing = data.existing_answers || {};
        let isReadOnly = Object.keys(existing).length > 0;

        if (data.survey_type) {
            $wrapper.find("#survey-type-display").text(data.survey_type).show();
        }
        $wrapper.find("#survey-title-display").text(data.title);
        $wrapper.find("#survey-desc-display").html(data.description || "");
        $wrapper.find("#survey-start-display").text(frappe.datetime.str_to_user(data.start_date));
        $wrapper.find("#survey-end-display").text(frappe.datetime.str_to_user(data.end_date));

        let today = frappe.datetime.get_today();
        let total = frappe.datetime.get_diff(data.end_date, data.start_date) || 1;
        let elapsed = frappe.datetime.get_diff(today, data.start_date);
        let pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
        $wrapper.find("#survey-timeline-progress").css("width", pct + "%");

        let html = "";
        data.questions.forEach((q, i) => {
            html += renderQuestion(q, i, existing, isReadOnly);
        });
        $wrapper.find("#survey-questions-container").html(html);

        if (isReadOnly) {
            $wrapper.find(".submit-container").hide();
            $wrapper.find(".survey-card").addClass("read-only");

            if (data.submission_date) {
                let parts = data.submission_date.split(" ");
                let formatted_date = frappe.datetime.str_to_user(parts[0]);
                let time = parts[1].substring(0, 5);
                $wrapper.find("#submission-status-banner").html(`
                    <div class="submission-banner">
                        <i class="fa fa-check-circle"></i>
                        <span>You submitted this survey as <strong>${data.user_fullname}</strong> 
                        on <strong>${formatted_date}</strong> at <strong>${time}</strong>.</span>
                    </div>
                `).fadeIn();
            }
        } else {
            loadDrafts();
            bindEvents();
            updateScrollProgress();
        }
    }

    function renderQuestion(q, i, existing, isReadOnly) {
        let qtype = (q.type || "").toLowerCase();
        let mandatory = q.mandatory ? 1 : 0;
        let val = existing[q.question] || "";

        let html = `<div class="survey-card" data-idx="${i}" data-mandatory="${mandatory}">`;
        if (q.image) html += `<img src="${q.image}" class="question-image">`;
        html += `<label class="question-label">${q.question}${q.mandatory && !isReadOnly ? '<span class="required-dot">*</span>' : ''}</label>`;
        if (q.description) html += `<div class="question-desc">${q.description}</div>`;

        if (qtype.includes("text") || qtype.includes("data") || qtype.includes("paragraph")) {
            if (qtype.includes("paragraph")) {
                html += `<textarea id="q_${i}" data-q="${q.question}" class="form-control s-in" rows="4" ${isReadOnly ? 'disabled' : ''}>${val}</textarea>`;
            } else {
                html += `<input type="text" id="q_${i}" data-q="${q.question}" class="form-control s-in" value="${val}" ${isReadOnly ? 'disabled' : ''}/>`;
            }
        } else if (qtype.includes("slider")) {
            let currentVal = val || 50;
            html += `<div class="slider-wrapper">
                        <input type="range" id="q_${i}" data-q="${q.question}" class="survey-slider s-in" min="0" max="100" value="${currentVal}" ${isReadOnly ? 'disabled' : ''}>
                        <div class="slider-value-display">${currentVal}%</div>
                     </div>`;
        } else if (qtype.includes("rating") || qtype.includes("emoji")) {
            const emojiMap = { 1: "😢", 2: "😐", 3: "🙂", 4: "😊", 5: "😍" };
            html += `<div class="rating-buttons emoji-grid" id="btn_grp_${i}">`;
            for (let s = 1; s <= 5; s++) {
                let active = (String(s) === String(val)) ? "active" : "";
                html += `
                    <button class="emoji-btn s-btn ${active}" data-val="${s}" data-idx="${i}">
                        <span class="emoji-icon">${emojiMap[s]}</span>
                        <span class="emoji-label">${s}</span>
                    </button>`;
            }
            html += `</div>`;
            html += `<input type="hidden" id="q_${i}" data-q="${q.question}" value="${val}"/>`;
        } else if (qtype.includes("mcq") || q.options) {
            html += `<div class="rating-buttons" id="btn_grp_${i}">`;
            let opts = q.options.includes(",") ? q.options.split(",") : q.options.split("\n");
            opts.forEach(opt => {
                let o = String(opt).trim();
                if (o) {
                    let active = (o === String(val)) ? "active" : "";
                    html += `<button class="rating-btn s-btn ${active}" data-val="${o}" data-idx="${i}">${o}</button>`;
                }
            });
            html += `</div>`;
            html += `<input type="hidden" id="q_${i}" data-q="${q.question}" value="${val}"/>`;
        }

        html += `<div class="error-text" style="display:none;">⚠️ This field is mandatory</div>`;
        html += `</div>`;
        return html;
    }

    function bindEvents() {
        $wrapper.find(".s-btn").on("click", function () {
            let i = $(this).attr("data-idx");
            let v = $(this).attr("data-val");
            $(this).siblings().removeClass("active");
            $(this).addClass("active");
            $wrapper.find(`#q_${i}`).val(v).trigger("change");
        });

        $wrapper.find(".s-in, input[type='hidden']").on("input change", function () {
            if ($(this).hasClass("survey-slider")) {
                let v = $(this).val();
                $(this).closest(".slider-wrapper").find(".slider-value-display").text(v + "%");
                updateSliderTrack($(this));
            }
            updateScrollProgress();
            saveDrafts();
            $(this).closest(".survey-card").find(".error-text").hide();
        });

        $wrapper.find("#btn-manual-save").on("click", () => {
            saveDrafts();
            frappe.show_alert({ message: "Progress saved!", indicator: "green" });
        });

        $wrapper.find("#btn-manual-submit").on("click", submitSurveyResponse);

        // Init sliders
        $wrapper.find(".survey-slider").each(function () {
            updateSliderTrack($(this));
        });
    }

    function updateSliderTrack($slider) {
        let v = $slider.val();
        let r = Math.floor(255 * (1 - v / 100));
        let g = Math.floor(200 * (v / 100));
        let color = `rgb(${r}, ${g}, 0)`;
        $slider.css("background", `linear-gradient(90deg, ${color} ${v}%, #e2e8f0 ${v}%)`);
    }

    function updateScrollProgress() {
        let mandatory = $wrapper.find(".survey-card[data-mandatory='1']");
        let filled = 0;
        mandatory.each(function () {
            let i = $(this).attr("data-idx");
            if ($wrapper.find(`#q_${i}`).val()) filled++;
        });
        let pct = mandatory.length > 0 ? (filled / mandatory.length) * 100 : 0;
        $wrapper.find("#page-progress-bar").css("width", pct + "%");
    }

    function saveDrafts() {
        let d = {};
        $wrapper.find(".survey-card[data-idx]").each(function () {
            let i = $(this).attr("data-idx");
            d[i] = $wrapper.find(`#q_${i}`).val();
        });
        localStorage.setItem("survey_draft_" + surveyName, JSON.stringify(d));
    }

    function loadDrafts() {
        let d = localStorage.getItem("survey_draft_" + surveyName);
        if (d) {
            d = JSON.parse(d);
            Object.keys(d).forEach(i => {
                let v = d[i];
                if (v) {
                    $wrapper.find(`#q_${i}`).val(v);
                    $wrapper.find(`#btn_grp_${i} .s-btn`).each(function () {
                        if (String($(this).attr("data-val")) === String(v)) $(this).addClass("active");
                    });
                }
            });
        }
    }

    function submitSurveyResponse() {
        let ans = [];
        let valid = true;
        let first = null;

        $wrapper.find(".survey-card[data-idx]").each(function () {
            let i = $(this).attr("data-idx");
            let v = $wrapper.find(`#q_${i}`).val();
            let q = $wrapper.find(`#q_${i}`).attr("data-q");
            let m = $(this).attr("data-mandatory") === "1";

            if (m && (!v || !v.trim())) {
                valid = false;
                $(this).find(".error-text").fadeIn();
                if (!first) first = this;
            }
            ans.push({ question: q, answer: v });
        });

        if (!valid) {
            if (first) $('html, body').animate({ scrollTop: $(first).offset().top - 100 }, 600);
            return;
        }

        frappe.call({
            method: "nexapp.api.save_survey_response",
            args: { survey: surveyName, answers: ans },
            freeze: true,
            callback: function (r) {
                if (r.message && r.message.status === "success") {
                    localStorage.removeItem("survey_draft_" + surveyName);

                    // Clear and Show Success
                    const successHtml = `
                        <div class="survey-card success-card" style="text-align: center; padding: 80px 40px; margin-top: 40px;">
                            <div style="font-size: 80px; margin-bottom: 20px;">🎉</div>
                            <h2 style="font-weight: 800; font-size: 32px;">Submission Successful!</h2>
                            <p style="font-size: 18px; color: #4a5568; margin-bottom: 30px;">Thank you for taking the time to provide your feedback.</p>
                            <button class="btn btn-primary btn-lg" onclick="location.reload()" style="padding: 12px 60px; border-radius: 12px; font-weight: 700;">Done</button>
                        </div>`;

                    $wrapper.find(".survey-container").html(successHtml);
                    $wrapper.find("#page-progress-bar").css("width", "100%").css("background", "#48bb78");
                    triggerConfetti();
                }
            }
        });
    }

    function renderError(target, msg) {
        target.html(`<div class="container" style="padding: 50px; text-align: center;"><h3>❌ ${msg}</h3></div>`);
    }

    function triggerConfetti() {
        const container = $("#confetti-wrapper");
        const colors = ['#f2d74e', '#95c3de', '#ff9a91', '#85cc7a', '#7878d1'];
        for (let i = 0; i < 50; i++) {
            let confetti = $('<div class="confetti"></div>');
            confetti.css({
                'left': Math.random() * 100 + '%',
                'background-color': colors[Math.floor(Math.random() * colors.length)],
                'animation-delay': Math.random() * 2 + 's',
                'width': (Math.random() * 10 + 6) + 'px',
                'height': (Math.random() * 10 + 6) + 'px'
            });
            container.append(confetti);
        }
    }
};

// DUAL HOOK REGISTRATION
frappe.pages['employee-survey-page'].on_page_load = function (wrapper) { init_survey_page(wrapper); };
frappe.pages['employee_survey_page'].on_page_load = function (wrapper) { init_survey_page(wrapper); };
