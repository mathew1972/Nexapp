frappe.pages['employee-survey-page'].on_page_load = function (wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __(''),
        single_column: true
    });

    let survey = frappe.utils.get_url_arg("survey");

    if (!survey) {
        frappe.msgprint("❌ Survey not found");
        return;
    }

    // =========================
    // LOAD SURVEY DATA
    // =========================
    frappe.call({
        method: "nexapp.api.get_survey_details",
        args: { survey: survey },
        callback: function (r) {

            if (!r.message) {
                renderError(wrapper, "Survey record not found.");
                return;
            }

            let data = r.message;
            let existingAnswers = data.existing_answers || {};
            let isReadOnly = Object.keys(existingAnswers).length > 0;
            let today = frappe.datetime.get_today();
            let isRestricted = false;
            let restrictionMsg = "";

            if (!data.is_active) {
                isRestricted = true;
                restrictionMsg = "The survey is currently inactive.";
            } else if (!isReadOnly && today < data.start_date) {
                isRestricted = true;
                restrictionMsg = `The survey has not started yet. It will be available from <b>${frappe.datetime.str_to_user(data.start_date)}</b>.`;
            } else if (!isReadOnly && today > data.end_date) {
                isRestricted = true;
                restrictionMsg = `The survey has expired. It was available until <b>${frappe.datetime.str_to_user(data.end_date)}</b>.`;
            }

            let html = `
            <style>
                /* PREMIUM BACKGROUND - MATCHING DESIGN */
                body {
                    background-color: #f0f4f8 !important;
                    background-image: 
                        linear-gradient(120deg, rgba(235, 248, 255, 0.8) 0%, rgba(255, 255, 255, 0.5) 100%),
                        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233498db' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") !important;
                    background-attachment: fixed !important;
                }

                /* Remove extra space at the top */
                .layout-main-section-wrapper {
                    padding-top: 0 !important;
                    margin-top: -20px !important;
                }
                
                .page-body {
                    padding-top: 0 !important;
                }
                
                .frappe-control {
                    margin-top: 0 !important;
                }

                .survey-container { 
                    max-width: 850px; 
                    margin: 0 auto; 
                    padding: 0 20px;
                }

                /* GLASSMORPHISM HEADER */
                .survey-header {
                    background: rgba(255, 255, 255, 0.88);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    border-radius: 18px;
                    padding: 35px;
                    margin-bottom: 35px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
                }

                .survey-title { font-size: 28px; font-weight: 700; color: #1a202c; margin-bottom: 12px; }
                .survey-desc { font-size: 15px; color: #4a5568; line-height: 1.6; margin-bottom: 25px; }

                /* TIMELINE DESIGN */
                .timeline-wrapper {
                    display: flex;
                    align-items: center;
                    background: rgba(241, 245, 249, 0.8);
                    padding: 14px 22px;
                    border-radius: 12px;
                    font-size: 14px;
                    color: #64748b;
                    gap: 15px;
                }
                .timeline-label { font-weight: 600; color: #334155; }
                .timeline-bar { height: 5px; flex-grow: 1; background: #cbd5e1; border-radius: 3px; position: relative; }
                .timeline-progress { height: 100%; background: #3498db; border-radius: 3px; width: 0%; transition: width 0.6s ease-out; }

                /* GLASSMORPHISM CARDS */
                .survey-card { 
                    background: rgba(255, 255, 255, 0.75);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 16px; 
                    padding: 28px; 
                    margin-bottom: 24px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                    transition: all 0.25s ease;
                }
                ${isReadOnly ? '' : '.survey-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.06); }'}

                .question-label { font-size: 17px; font-weight: 600; margin-bottom: 18px; display: block; color: #1e293b; }
                .required-dot { color: #e53e3e; margin-left: 4px; }

                /* RATING BUTTONS IMPROVED */
                .rating-buttons { display: flex; gap: 12px; margin-top: 5px; }
                .rating-btn { 
                    width: 52px; height: 52px; border-radius: 14px; 
                    border: 1px solid #e2e8f0; background: #fff; 
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-weight: 600; font-size: 18px; color: #4a5568;
                }
                .rating-btn.active { background: #3182ce; color: #fff; border-color: #3182ce; transform: scale(1.08); box-shadow: 0 6px 15px rgba(49, 130, 206, 0.3); }
                .rating-btn:hover:not(.active):not(:disabled) { background: #ebf8ff; border-color: #3182ce; color: #3182ce; }
                .rating-btn:disabled { cursor: default; }

                .restriction-card, .submitted-notice {
                    text-align: center; padding: 40px 30px; border-radius: 16px; margin-bottom: 30px;
                }
                .restriction-card { background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; }
                .submitted-notice { background: #f0fff4; border: 1px solid #9ae6b4; color: #276749; }

                .submit-container { text-align: center; margin-top: 40px; padding-bottom: 60px; }
                .success-msg { text-align: center; padding: 70px 40px; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-radius: 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.08); }
                
                .form-control:disabled { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
                .form-control { border-radius: 10px; border: 1px solid #e2e8f0; padding: 14px; transition: all 0.2s; }
                .form-control:focus:not(:disabled) { border-color: #3182ce; box-shadow: 0 0 0 4px rgba(49, 130, 206, 0.12); }
            </style>

            <div class="survey-container">
                <div class="survey-header">
                    <div class="survey-title">${data.title}</div>
                    <div class="survey-desc">${data.description || "Thank you for participating in this survey."}</div>
                    
                    <div class="timeline-wrapper">
                        <span class="timeline-label">TIMELINE:</span>
                        <span>${frappe.datetime.str_to_user(data.start_date)}</span>
                        <div class="timeline-bar">
                            <div class="timeline-progress" id="survey-timeline-progress"></div>
                        </div>
                        <span>${frappe.datetime.str_to_user(data.end_date)}</span>
                    </div>
                </div>`;

            if (isReadOnly) {
                html += `
                <div class="submitted-notice">
                    <div style="font-size: 28px; margin-bottom: 10px;">✅</div>
                    <h4 style="margin: 0;">Submission Recorded</h4>
                    <p style="margin-top: 8px; font-size: 15px;">You have already submitted this survey. Below is a read-only view of your responses.</p>
                </div>`;
            }

            if (isRestricted) {
                html += `
                <div class="restriction-card">
                    <div style="font-size: 40px; margin-bottom: 15px;">⚠️</div>
                    <h3>Survey Access Restricted</h3>
                    <p>${restrictionMsg}</p>
                    <br>
                    <button class="btn btn-default" onclick="location.href='/app'">Go Back</button>
                </div>`;
            } else if (!data.questions || data.questions.length === 0) {
                html += `<div class="survey-card"><p>No questions found for this survey.</p></div>`;
            } else {

                data.questions.forEach((q, i) => {
                    let qtype = (q.type || "").toLowerCase();
                    let is_mandatory = q.mandatory ? 1 : 0;
                    let existingVal = existingAnswers[q.question] || "";

                    html += `<div class="survey-card" data-idx="${i}" data-mandatory="${is_mandatory}">`;
                    html += `<label class="question-label">${q.question}${q.mandatory && !isReadOnly ? '<span class="required-dot">*</span>' : ''}</label>`;

                    if (qtype.includes("text") || qtype.includes("data")) {
                        html += `<input type="text" data-question="${q.question}" id="q_${i}" class="form-control" 
                            value="${existingVal}" ${isReadOnly ? 'disabled' : ''} placeholder="Type your answer..."/>`;
                    }
                    else if (qtype.includes("paragraph") || qtype.includes("small text")) {
                        html += `<textarea data-question="${q.question}" id="q_${i}" class="form-control" rows="4" 
                            ${isReadOnly ? 'disabled' : ''} placeholder="Type your response here...">${existingVal}</textarea>`;
                    }
                    else if (qtype.includes("mcq") || q.options) {
                        html += `<select data-question="${q.question}" id="q_${i}" class="form-control" ${isReadOnly ? 'disabled' : ''}>`;
                        html += `<option value="">Choose an option</option>`;
                        if (q.options) {
                            let opts = q.options.includes(",") ? q.options.split(",") : q.options.split("\n");
                            opts.forEach(opt => {
                                let val = opt.trim();
                                if (val) {
                                    let selected = (val === existingVal) ? "selected" : "";
                                    html += `<option value="${val}" ${selected}>${val}</option>`;
                                }
                            });
                        }
                        html += `</select>`;
                    }
                    else if (qtype.includes("rating")) {
                        html += `<div class="rating-buttons" id="rate_container_${i}">`;
                        for (let star = 1; star <= 5; star++) {
                            let activeCls = (parseInt(existingVal) === star) ? "active" : "";
                            html += `<button class="rating-btn ${activeCls}" ${isReadOnly ? 'disabled' : ''} 
                                onclick="setRating(${i}, ${star}, this)">${star}</button>`;
                        }
                        html += `</div>`;
                        html += `<input type="hidden" data-question="${q.question}" id="q_${i}" value="${existingVal}"/>`;
                    }
                    else {
                        html += `<input type="text" data-question="${q.question}" id="q_${i}" class="form-control" 
                            value="${existingVal}" ${isReadOnly ? 'disabled' : ''}/>`;
                    }

                    html += `</div>`;
                });

                if (!isReadOnly) {
                    html += `
                        <div class="submit-container">
                            <button class="btn btn-primary btn-lg" style="padding: 14px 50px; font-weight: 600; border-radius: 12px; font-size: 18px;" 
                                onclick="submitSurvey()" id="btn-submit">
                                Submit Survey
                            </button>
                        </div>`;
                }
            }

            html += `</div>`;

            $(wrapper).find(".layout-main-section").html(html);

            // Update Timeline Progress bar
            setTimeout(() => {
                let total = frappe.datetime.get_diff(data.end_date, data.start_date) || 1;
                let elapsed = frappe.datetime.get_diff(today, data.start_date);
                let pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
                $("#survey-timeline-progress").css("width", pct + "%");
            }, 300);
        }
    });

    // Rating Helper
    window.setRating = function (idx, val, btn) {
        $(`#q_${idx}`).val(val);
        $(`#rate_container_${idx} .rating-btn`).removeClass('active');
        $(btn).addClass('active');
    };
};

function renderError(wrapper, msg) {
    $(wrapper).find(".layout-main-section").html(`<div class="container" style="padding: 50px; text-align: center;"><h3>❌ ${msg}</h3></div>`);
}

// =========================
// SUBMIT FUNCTION
// =========================
window.submitSurvey = function () {
    let survey = frappe.utils.get_url_arg("survey");
    if (!survey) return;

    let answers = [];
    let isValid = true;
    let missingQuestions = [];

    $(".survey-card").css("border-color", "rgba(255, 255, 255, 0.5)");

    document.querySelectorAll(".survey-card[data-idx]").forEach(card => {
        let i = card.getAttribute("data-idx");
        let is_mandatory = parseInt(card.getAttribute("data-mandatory"));
        let input = document.getElementById(`q_${i}`);

        if (!input) return;

        let val = input.value.trim();
        let questionText = input.getAttribute("data-question");

        if (is_mandatory && !val) {
            isValid = false;
            $(card).css("border-color", "#e53e3e");
            missingQuestions.push(questionText);
        }

        answers.push({
            question: questionText,
            answer: val
        });
    });

    if (!isValid) {
        frappe.msgprint({
            title: __('Validation Error'),
            indicator: 'red',
            message: __('Please answer all mandatory questions:<br><br><ul><li>' + missingQuestions.join('</li><li>') + '</li></ul>')
        });
        return;
    }

    if (answers.length === 0) {
        frappe.msgprint("❌ No questions found to submit");
        return;
    }

    frappe.call({
        method: "nexapp.api.save_survey_response",
        args: { survey: survey, answers: answers },
        freeze: true,
        freeze_message: "Submitting...",
        callback: function (r) {
            if (r.message && r.message.status === "success") {
                let successHtml = `
                    <div class="success-msg">
                        <div style="font-size: 70px; margin-bottom: 25px;">🎉</div>
                        <h1 style="color: #1a202c; font-weight: 800; font-size: 32px; letter-spacing: -0.5px;">Submission Received!</h1>
                        <p style="font-size: 18px; color: #4a5568; margin-top: 15px;">Thank you for your valuable feedback. Your response has been recorded.</p>
                        <br><br>
                        <button class="btn btn-default btn-lg" onclick="location.reload()" style="padding: 12px 40px; border-radius: 12px;">Close Survey</button>
                    </div>`;
                $(".survey-container").html(successHtml);
            } else {
                frappe.msgprint("❌ Error: " + (r.message?.message || "Internal Server Error"));
            }
        },
        error: function (err) {
            frappe.msgprint("❌ Submission Failed (Server Error)");
        }
    });
};
/////////////////////////////////////////////////////////////////////////////////
