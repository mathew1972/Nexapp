import frappe
from frappe import _

def get_context(context):
    context.no_cache = 1
    # Check if a specific job is requested
    job_name = frappe.form_dict.get("job")
    
    if job_name:
        try:
            job = frappe.get_doc("Job Opening", job_name)
            if job.status == "Open":
                context.job = job
                context.title = job.job_title
        except Exception:
            pass
            
    # If no specific job, get all published jobs
    context.title = _("Careers at Nexapp")
    
    # Let's try to get jobs dynamically
    try:
        jobs = frappe.get_all("Job Opening", 
            filters={
                "status": "Open",
            }, 
            fields=["*"],
            order_by="creation desc"
        )
        from frappe.utils import getdate
        today = getdate()
        
        filtered_jobs = []
        for j in jobs:
            # Strictly check if any of the publish flag fields are set to 1/True
            if j.get("publish") or j.get("publish_on_website") or j.get("published"):
                # Real-time check: if closes_on is set and has passed, do not show it!
                if j.get("closes_on") and getdate(j.get("closes_on")) < today:
                    continue
                filtered_jobs.append(j)
        
        # Only return the jobs that are explicitly published and not expired.
        context.jobs = filtered_jobs
        
        # Fetch dropdown options dynamically
        try:
            context.sources = frappe.get_all("Job Applicant Source", pluck="name", order_by="name asc")
            
            meta = frappe.get_meta("Job Applicant")
            notice_field = meta.get_field("custom_notice_period")
            if notice_field and notice_field.options:
                context.notice_periods = [opt.strip() for opt in notice_field.options.split('\n') if opt.strip()]
            else:
                context.notice_periods = []
                
            qual_field = meta.get_field("custom_highest_qualification_held")
            if qual_field and qual_field.options:
                context.qualifications = [opt.strip() for opt in qual_field.options.split('\n') if opt.strip()]
            else:
                context.qualifications = []
        except Exception:
            pass
            
    except Exception as e:
        context.jobs = []
        context.error = str(e)

@frappe.whitelist(allow_guest=True)
def apply_for_job(job_name, first_name, last_name, email, mobile_no, current_company, total_experience, current_ctc, expected_ctc, notice_period, linkedin_profile=None, cover_letter=None, custom_secondary_email=None, custom_street=None, custom_city=None, custom_state=None, custom_pincode=None, custom_highest_qualification_held=None, custom_additional_info=None, resume_attachment=None, source=None, applicant_rating=None, resume_link=None, **kwargs):
    try:
        from frappe.utils import add_months, getdate
        
        # Check for duplicates within the last 6 months
        recent_application = frappe.get_all("Job Applicant", 
            filters={
                "email_id": email, 
                "job_title": job_name,
                "creation": (">=", add_months(getdate(), -6))
            },
            limit=1
        )
        
        if recent_application:
            return {"status": "error", "message": "You have already applied for this position within the last 6 months. Please wait before reapplying."}
            
        if custom_secondary_email and email and custom_secondary_email.strip().lower() == email.strip().lower():
            return {"status": "error", "message": "Secondary Email cannot be the same as the primary Email Address."}
            
        applicant = frappe.new_doc("Job Applicant")
        applicant.job_title = job_name
        applicant.applicant_name = f"{first_name} {last_name}"
        applicant.email_id = email
        applicant.phone_number = mobile_no
        applicant.status = "Open"
        
        # Explicitly map the custom mandatory fields exactly as defined in the Frappe schema
        applicant.custom_mobile = mobile_no
        applicant.custom_current_employer = current_company
        applicant.custom_experience_in_years = total_experience
        applicant.custom_current_ctc = current_ctc
        applicant.custom_expected_ctc = expected_ctc
        applicant.custom_notice_period = notice_period
        
        # Optionally add other fields if they exist in Job Applicant
        # Usually, cover letter and custom fields can be set directly.
        # Frappe will ignore fields that don't exist if set via db_set or if we just set them.
        # Frappe will ignore fields that don't exist if set via db_set or if we just set them.
        
        applicant.custom_secondary_email = custom_secondary_email
        applicant.custom_street = custom_street
        applicant.custom_city = custom_city
        applicant.custom_state = custom_state
        applicant.custom_pincode = custom_pincode
        applicant.custom_highest_qualification_held = custom_highest_qualification_held
        applicant.custom_additional_info = custom_additional_info
        
        if source:
            if not frappe.db.exists("Job Applicant Source", source):
                frappe.get_doc({"doctype": "Job Applicant Source", "source_name": source}).insert(ignore_permissions=True)
            applicant.source = source
            
        if applicant_rating:
            applicant.applicant_rating = applicant_rating
            
        if resume_link:
            applicant.resume_link = resume_link
            
        if cover_letter:
            applicant.cover_letter = cover_letter
        
        if resume_attachment:
            applicant.resume_attachment = resume_attachment

        if linkedin_profile:
            applicant.custom_linkedin_profile = linkedin_profile
            
        applicant.flags.ignore_mandatory = True
        applicant.insert(ignore_permissions=True)
        
        # Handle Base64 file upload (for Guest mobile users where /api/method/upload_file is blocked)
        if kwargs.get('resume_b64') and kwargs.get('resume_name'):
            import base64
            b64_data = kwargs.get('resume_b64')
            if "," in b64_data:
                b64_data = b64_data.split(",")[1]
                
            file_doc = frappe.get_doc({
                "doctype": "File",
                "file_name": kwargs.get('resume_name'),
                "attached_to_doctype": "Job Applicant",
                "attached_to_name": applicant.name,
                "content": base64.b64decode(b64_data),
                "is_private": 1
            })
            file_doc.insert(ignore_permissions=True)
            applicant.db_set("resume_attachment", file_doc.file_url)
            
        # Link the uploaded file strictly to the new Job Applicant record
        elif resume_attachment:
            try:
                frappe.db.set_value("File", {"file_url": resume_attachment}, {
                    "attached_to_doctype": "Job Applicant",
                    "attached_to_name": applicant.name
                })
            except Exception:
                pass
        
        # Send Email Notifications
        try:
            job = frappe.get_doc("Job Opening", job_name)
            
            # Email to Candidate (Disabled - Handled via Notification Doctype)
            # subject_candidate = f"Application Received: {job.job_title} at Nexapp"
            # message_candidate = f"""
            # <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            #     <h2 style="color: #0d9488;">Application Received!</h2>
            #     <p>Hi <b>{first_name} {last_name}</b>,</p>
            #     <p>Thank you for taking the time to apply for the <b>{job.job_title}</b> role at Nexapp. We're thrilled that you are interested in joining our team!</p>
            #     <p>Your application and resume have been successfully received and added to our system. Our hiring team will carefully review your profile, and if your background is a great match for the role, we will reach out to you directly with the next steps.</p>
            #     <p>We appreciate your interest in Nexapp and wish you the best of luck!</p>
            #     <br>
            #     <p style="color: #6b7280; font-size: 0.9em;">Best regards,<br><b>The Nexapp Recruitment Team</b></p>
            # </div>
            # """
            sender_email = "talent@nexapp.co.in"
            # frappe.sendmail(
            #     recipients=[email], 
            #     subject=subject_candidate, 
            #     message=message_candidate, 
            #     delayed=True,
            #     reference_doctype="Job Applicant",
            #     reference_name=applicant.name
            # )
            
            # Email to HR (Assigned Person)
            subject_hr = f"New Job Applicant - {job.job_title}"
            message_hr = f"Hello Team,<br><br>A new job application has been received.<br><br><b>Applicant Name:</b> {first_name} {last_name}<br><b>Job Title:</b> {job.job_title}<br><br><a href='/app/job-applicant/{applicant.name}'>Click here to view the Job Applicant details</a>"
            
            # Fetch assigned users from ToDo
            assigned_todos = frappe.db.get_all("ToDo", filters={"reference_type": "Job Opening", "reference_name": job.name}, fields=["allocated_to"])
            hr_recipients = [todo.allocated_to for todo in assigned_todos if todo.allocated_to]
            
            if not hr_recipients:
                # Fallback to HR Managers if no one is assigned
                hr_users = frappe.db.get_all("Has Role", filters={"role": "HR Manager", "parenttype": "User"}, fields=["parent"])
                hr_recipients = [user.parent for user in hr_users]
                
            if not hr_recipients:
                hr_recipients = [frappe.db.get_value("User", "Administrator", "email") or "admin@localhost"]
                
            frappe.sendmail(
                recipients=hr_recipients, 
                subject=subject_hr, 
                message=message_hr, 
                delayed=True,
                reference_doctype="Job Applicant",
                reference_name=applicant.name
            )
        except Exception as e:
            frappe.log_error(message=str(e), title="Careers Portal Email Error")

        return {"status": "success", "applicant": applicant.name}
    except frappe.exceptions.UniqueValidationError:
        return {"status": "error", "message": "You have already applied for this position."}
    except Exception as e:
        frappe.log_error(message=str(e), title="Job Application Error")
        return {"status": "error", "message": "An error occurred while submitting your application."}

@frappe.whitelist(allow_guest=True)
def process_resume_autofill(file_url):
    extracted_data = {
        "first_name": "",
        "last_name": "",
        "email": "",
        "mobile_no": "",
        "total_experience": "",
        "custom_city": ""
    }
    
    try:
        if file_url.startswith("/private/files/"):
            file_path = frappe.get_site_path("private", "files", file_url.replace("/private/files/", ""))
        elif file_url.startswith("/files/"):
            file_path = frappe.get_site_path("public", "files", file_url.replace("/files/", ""))
        else:
            return extracted_data
            
        import os
        if not os.path.exists(file_path):
            return extracted_data
            
        text = ""
        name_candidate = ""
        
        if file_path.lower().endswith('.pdf'):
            try:
                import fitz
                doc = fitz.open(file_path)
                for page in doc:
                    text += page.get_text()
                    
                # Intelligent Name Extraction using Top-Down Y-Coordinate sorting
                first_page = doc[0]
                spans = []
                blocks = first_page.get_text("dict").get("blocks", [])
                for b in blocks:
                    if b.get('type') == 0:
                        for l in b.get("lines", []):
                            for s in l.get("spans", []):
                                t = s.get('text', '').strip()
                                # Clean bullet points if any
                                t = re.sub(r'^[•\-\*]\s*', '', t).strip()
                                if t:
                                    spans.append({
                                        'text': t,
                                        'y0': s.get('bbox', [0,0,0,0])[1]
                                    })
                
                # Sort strictly by vertical position (top of page first)
                spans.sort(key=lambda x: x['y0'])
                
                exclude_words = ["RESUME", "CV", "CURRICULUM", "VITAE", "PROFILE", "SUMMARY", "COMPETENCIES", "EXPERIENCE", "EDUCATION", "SKILLS", "CONTACT", "ABOUT", "CORE", "OBJECTIVE", "DETAILS", "PERSONAL", "WORK", "NURSING", "REGISTERED", "NURSE"]
                
                for s in spans[:10]:  # Only look at the absolute top 10 elements on the page
                    t = s['text']
                    # 1-3 words, no numbers, no emails, no punctuation like comma
                    if 1 <= len(t.split()) <= 3 and not re.search(r'[\d,@,\.,\,]', t):
                        if not any(w in t.upper() for w in exclude_words):
                            name_candidate = t
                            break
                            
            except Exception as e:
                frappe.log_error(f"PyMuPDF error: {str(e)}")
                
        if not text:
            return extracted_data
            
        import re
        
        # 1. Email (standard regex)
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        if email_match:
            extracted_data["email"] = email_match.group(0)
            
        # 2. Phone (Tolerant of spaces/dashes between digits)
        phone_match = re.search(r'(?:\+?91[\-\s]?)?[6-9](?:[\-\s]*\d){9}', text)
        if phone_match:
            raw_phone = phone_match.group(0)
            cleaned = re.sub(r'[\-\s\+]', '', raw_phone)
            if cleaned.startswith('91') and len(cleaned) == 12:
                cleaned = cleaned[2:]
            extracted_data["mobile_no"] = cleaned
            
        # 3. Apply Name
        if name_candidate:
            parts = name_candidate.split()
            if len(parts) >= 2:
                extracted_data["first_name"] = parts[0].capitalize()
                extracted_data["last_name"] = " ".join(parts[1:]).title()
            else:
                extracted_data["first_name"] = parts[0].capitalize()
                
        # 4. Total Experience (Heuristic: "X years" or "X+ years")
        exp_match = re.search(r'(\d+)(?:\.\d+)?\+?\s*(?:years?|yrs?)(?:\s*of\s*experience)?', text, re.IGNORECASE)
        if exp_match:
            extracted_data["total_experience"] = exp_match.group(1)
            
        # 5. Pincode (Indian PIN - 6 digits)
        pin_match = re.search(r'\b[1-9][0-9]{5}\b', text)
        if pin_match:
            extracted_data["custom_pincode"] = pin_match.group(0)
            
        # 6. City Extraction
        cities = ["Mumbai", "Delhi", "Bengaluru", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Gwalior", "Jabalpur", "Coimbatore", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Mysore", "Gurgaon", "Gurugram", "Noida", "Kochi", "Trivandrum", "Thiruvananthapuram", "Dehradun", "Bhubaneswar"]
        
        found_city = ""
        # Format: "Pune, India" or "Pune, Maharashtra"
        city_match = re.search(r'([A-Z][a-zA-Z]+)(?:,\s*(?:India|Maharashtra|Karnataka|Tamil Nadu|Delhi|Telangana|Gujarat|UP|Haryana|West Bengal|Kerala|Punjab|Rajasthan|MP|AP|Bihar|Odisha))', text)
        if city_match:
            candidate = city_match.group(1)
            # Avoid matching words like 'In, India'
            if len(candidate) > 3 and candidate not in ["Email", "Phone", "Mobile"]:
                found_city = candidate
                
        if not found_city:
            for city in cities:
                if re.search(r'\b' + city + r'\b', text, re.IGNORECASE):
                    found_city = city
                    break
                    
        if found_city:
            extracted_data["custom_city"] = found_city.title()
            
        return extracted_data
        
    except Exception as e:
        frappe.log_error(f"Resume Extraction Error: {str(e)}")
        return extracted_data
