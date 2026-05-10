import frappe
from frappe import _

@frappe.whitelist()
def get_dashboard_stats(survey=None, survey_type=None, start_date=None, end_date=None):
    filters = {}
    
    if survey:
        filters["survey"] = survey
    elif survey_type:
        filters["survey.survey_type"] = survey_type
        
    if start_date and end_date:
        filters["submitted_on"] = ["between", [start_date, end_date + " 23:59:59"]]

    total_responses = frappe.db.count("Survey Response", filters)
    
    # Gender Analytics
    # We join with Employee to count by gender
    gender_stats = frappe.get_all("Survey Response",
        filters=filters,
        fields=["employee.gender as gender"]
    )
    
    male_responses = len([r for r in gender_stats if r.gender == "Male"])
    female_responses = len([r for r in gender_stats if r.gender == "Female"])
    
    # Active Surveys
    survey_filters = {"is_active": 1}
    if survey:
        survey_filters["name"] = survey
    if survey_type:
        survey_filters["survey_type"] = survey_type
    active_surveys = frappe.db.count("Employee Survey", survey_filters)
    
    # Total Surveys
    total_survey_filters = {}
    if survey_type:
        total_survey_filters["survey_type"] = survey_type
    total_surveys = frappe.db.count("Employee Survey", total_survey_filters)
    
    # Participation Rate
    total_employees = frappe.db.count("Employee", {"status": "Active"}) or 1
    
    # Unique responders using the same filters
    unique_responders = frappe.get_all("Survey Response",
        filters=filters,
        fields=["distinct employee"]
    )
    unique_count = len(unique_responders)
    
    participation_rate = (unique_count / total_employees * 100)

    return {
        "total_responses": total_responses,
        "active_surveys": active_surveys,
        "total_surveys": total_surveys,
        "participation_rate": round(participation_rate, 2),
        "total_participation": total_employees,  # Total eligible employees
        "male_responses": male_responses,
        "female_responses": female_responses
    }

# ... (get_responses_over_time and get_survey_distribution unchanged) ...

@frappe.whitelist()
def get_recent_responses(survey=None, survey_type=None, limit=10):
    filters = {}
    if survey:
        filters["survey"] = survey
    elif survey_type:
        filters["survey.survey_type"] = survey_type
        
    # Join with Employee to get the name
    responses = frappe.get_all("Survey Response", 
        filters=filters,
        fields=["name", "survey", "employee", "employee.employee_name as employee_name", "submitted_on"],
        order_by="submitted_on DESC",
        limit=limit
    )
    
    return responses

@frappe.whitelist()
def get_question_analytics(survey=None, survey_type=None):
    """
    Returns detailed analytics for each question in the survey(s).
    """
    surveys = []
    if survey:
        surveys = [survey]
    elif survey_type:
        surveys = frappe.get_all("Employee Survey", filters={"survey_type": survey_type}, pluck="name")
    
    frappe.errprint(f"DEBUG: get_question_analytics called with survey={survey}, survey_type={survey_type}")
    frappe.errprint(f"DEBUG: Resolved surveys: {surveys}")

    if not surveys:
        return []

    # Get all questions for these surveys
    questions_data = frappe.get_all("Survey Question", 
        filters={"parent": ["in", surveys], "parenttype": "Employee Survey"},
        fields=["question", "question_type", "options"]
    )
    
    unique_questions = {}
    for q in questions_data:
        # Robust splitting: check for newline first, then comma if only one item found
        raw_options = q.options or ""
        if "\n" in raw_options:
            options = [opt.strip() for opt in raw_options.split("\n") if opt.strip()]
        elif "," in raw_options:
            options = [opt.strip() for opt in raw_options.split(",") if opt.strip()]
        else:
            options = [raw_options.strip()] if raw_options.strip() else []

        if q.question not in unique_questions:
            unique_questions[q.question] = {
                "type": q.question_type,
                "options": options
            }

    # Get all answers
    responses = frappe.get_all("Survey Response", filters={"survey": ["in", surveys]}, pluck="name")
    frappe.errprint(f"DEBUG: Responses found: {len(responses)}")

    if not responses:
        return [{"question": k, "type": v["type"], "data": [], "avg": 0} for k, v in unique_questions.items()]

    # Get all answers with gender info using a robust JOIN
    answers_with_gender = frappe.db.sql("""
        SELECT 
            ans.question, ans.answer, ans.rating_value, res.employee, emp.gender
        FROM 
            `tabSurvey Answer` ans
        JOIN 
            `tabSurvey Response` res ON ans.parent = res.name
        LEFT JOIN 
            `tabEmployee` emp ON res.employee = emp.name
        WHERE 
            ans.parent IN %(responses)s AND ans.parenttype = 'Survey Response'
    """, {"responses": responses}, as_dict=True)
    frappe.errprint(f"DEBUG: Joined Answers found: {len(answers_with_gender)}")

    analytics = []
    for q_label, q_info in unique_questions.items():
        q_answers = [a for a in answers_with_gender if a.question == q_label]
        
        result = {
            "question": q_label,
            "type": q_info["type"],
            "count": len(q_answers)
        }

        if q_info["type"] == "Multiple Choice":
            dist = {}
            for opt in q_info["options"]:
                dist[opt] = {"total": 0, "male": 0, "female": 0}
            
            for a in q_answers:
                opt_key = a.answer if a.answer in dist else None
                if opt_key:
                    dist[opt_key]["total"] += 1
                    if a.gender == "Male": dist[opt_key]["male"] += 1
                    elif a.gender == "Female": dist[opt_key]["female"] += 1
            
            result["data"] = [
                {"label": k, "value": v["total"], "male": v["male"], "female": v["female"]} 
                for k, v in dist.items()
            ]
            
        elif q_info["type"] == "Rating (1–5)":
            ratings = [a.rating_value for a in q_answers if a.rating_value]
            avg = round(sum(ratings) / len(ratings), 2) if ratings else 0
            
            dist = {str(i): {"total": 0, "male": 0, "female": 0} for i in range(1, 6)}
            for a in q_answers:
                if a.rating_value:
                    key = str(int(a.rating_value))
                    if key in dist:
                        dist[key]["total"] += 1
                        if a.gender == "Male": dist[key]["male"] += 1
                        elif a.gender == "Female": dist[key]["female"] += 1
            
            result["avg"] = avg
            result["data"] = [
                {"label": k, "value": v["total"], "male": v["male"], "female": v["female"]} 
                for k, v in dist.items()
            ]
        
        else:
            result["data"] = []

        analytics.append(result)

    return analytics
