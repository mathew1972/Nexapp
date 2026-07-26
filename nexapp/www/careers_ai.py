import frappe
import re
import os

@frappe.whitelist(allow_guest=True)
def extract_via_llm(resume_text):
    try:
        import requests
        import json
        
        # Try fetching as a Single DocType first
        try:
            api_config = frappe.get_doc("API Configuration")
        except Exception:
            # Fallback to fetching the first record if it's a standard DocType
            api_configs = frappe.get_all("API Configuration", limit=1)
            if not api_configs:
                return None
            api_config = frappe.get_doc("API Configuration", api_configs[0].name)
            
        api_key = api_config.get_password("api_key") or api_config.api_key
        base_url = api_config.api_base_url
        model_name = api_config.model_name
        
        if not api_key or not base_url:
            frappe.log_error("Missing API Key or Base URL in API Configuration", "Resume AI Parsing")
            return None
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": frappe.utils.get_url(),
            "X-Title": "Nexapp Careers Portal"
        }
            
        try:
            np_field = frappe.get_meta("Job Applicant").get_field("notice_period")
            np_options = [opt.strip() for opt in np_field.options.split('\n') if opt.strip()]
        except Exception:
            np_options = ["Immediate", "15 Days", "30 Days", "60 Days", "90 Days"]
            
        try:
            hq_field = frappe.get_meta("Job Applicant").get_field("custom_highest_qualification_held")
            hq_options = [opt.strip() for opt in hq_field.options.split('\n') if opt.strip()]
        except Exception:
            hq_options = ["MCA", "MBA", "BE", "BSc", "B.Tech", "BCA", "BA", "M.Sc", "M.Tech", "ME", "BBA", "Graduate"]
            
        system_prompt = f'''You are an expert HR data extractor. Extract the following details from the resume text and return ONLY a valid JSON object with these exact keys:
- first_name (string)
- last_name (string)
- email (string)
- mobile_no (string, digits only)
- total_experience (string, just the number e.g. "5")
- custom_city (string)
- current_company (string, The candidate's current or most recent employer. YOU MUST LOOK AT THE DATES! Choose the company with the most recent dates (e.g., 2024, 2025, or Present).)
- linkedin_profile (string, The candidate's full LinkedIn URL)
- custom_highest_qualification_held (string, Map their education to EXACTLY ONE of these options: {hq_options}. If no exact match but they have a degree, use "Graduate".)
- custom_street (string, The candidate's street address or locality. Ignore university names.)
- custom_city (string)
- custom_pincode (string)
- custom_state (string)
- notice_period (string, Map their stated notice period to EXACTLY ONE of these options: {np_options}. If not stated, return empty string.)
- current_ctc (string, numeric)

If a field is not found, return an empty string for that key. Do not add any markdown formatting like ```json. Return raw JSON only.'''

        truncated_text = resume_text[:3500]
        
        frappe.log_error(f"Text being sent to AI (Length: {len(resume_text)}):\n{truncated_text}", "LLM Resume Text")

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Resume Text:\n{truncated_text}"}
            ],
            "temperature": 0.0
        }
        
        response = requests.post(base_url, headers=headers, json=payload, timeout=8)
        response.raise_for_status()
        
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.startswith("```"):
            content = content.replace("```", "", 1)
        if content.endswith("```"):
            content = content[:-3]
            
        return json.loads(content.strip())
        
    except Exception as e:
        frappe.log_error(f"LLM Extraction Failed: {str(e)}", "Resume AI Parsing")
        return None


@frappe.whitelist(allow_guest=True)
def process_resume_autofill(file_url=None, file_b64=None, file_name=None):
    import os
    import re
    import json
    import io
    import base64
    
    extracted_data = {
        "first_name": "",
        "last_name": "",
        "email": "",
        "mobile_no": "",
        "total_experience": "",
        "custom_pincode": "",
        "custom_state": "",
        "custom_city": "",
        "custom_street": "",
        "current_company": "",
        "custom_highest_qualification_held": "",
        "notice_period": "",
        "current_ctc": "",
        "linkedin_profile": "",
        "extracted_by": "python"
    }
    
    try:
        file_bytes = None
        file_ext = ""
        
        if file_b64 and file_name:
            if "," in file_b64:
                file_b64 = file_b64.split(",")[1]
            file_bytes = base64.b64decode(file_b64)
            file_ext = os.path.splitext(file_name)[1].lower()
            
        elif file_url:
            import urllib.parse
            decoded_url = urllib.parse.unquote(file_url)
            
            if "private/files/" in decoded_url:
                f_name = decoded_url.split("private/files/")[-1]
                file_path = frappe.get_site_path("private", "files", f_name)
            elif "/files/" in decoded_url:
                f_name = decoded_url.split("/files/")[-1]
                file_path = frappe.get_site_path("public", "files", f_name)
            else:
                frappe.log_error(f"Unrecognized file URL format: {decoded_url}", "Resume AI Parsing")
                return extracted_data
                
            if not os.path.exists(file_path):
                frappe.log_error(f"File not found on disk: {file_path}", "Resume AI Parsing")
                return extracted_data
                
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            file_ext = os.path.splitext(file_path)[1].lower()
        else:
            return extracted_data
            
        text = ""
        name_candidate = ""
        
        if file_ext == '.pdf':
            try:
                import fitz
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                for page in doc:
                    try:
                        text += page.get_text(sort=True)
                    except TypeError:
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
                
        elif file_ext == '.docx':
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as docx:
                    tree = ET.XML(docx.read('word/document.xml'))
                    paragraphs = []
                    for paragraph in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                        texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
                        if texts:
                            paragraphs.append(''.join(texts))
                    text = '\n'.join(paragraphs)
            except Exception as e:
                frappe.log_error(f"DOCX Extraction error: {str(e)}")
                
        if not text:
            return extracted_data
            
        # --- AI Parsing Attempt (Primary) ---
        llm_data = extract_via_llm(text)
        if llm_data and isinstance(llm_data, dict):
            # Merge with default empty keys
            for k in extracted_data.keys():
                if k == "extracted_by":
                    continue
                if llm_data.get(k):
                    extracted_data[k] = llm_data[k]
                    
            # Sanitize Qualification to match exactly
            hq = extracted_data.get("custom_highest_qualification_held", "")
            if hq:
                hq_upper = hq.upper().replace(".", "").replace(" ", "")
                if "BTECH" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "B.Tech"
                elif "MTECH" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "M.Tech"
                elif "BCA" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "BCA"
                elif "MCA" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "MCA"
                elif "MBA" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "MBA"
                elif "BBA" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "BBA"
                elif "BSC" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "BSc"
                elif "MSC" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "M.Sc"
                elif "BE" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "BE"
                elif "ME" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "ME"
                elif "BA" in hq_upper:
                    extracted_data["custom_highest_qualification_held"] = "BA"
                else:
                    extracted_data["custom_highest_qualification_held"] = "Graduate"
                    
            extracted_data["extracted_by"] = "ai"
            return extracted_data
        # --- End AI Parsing Attempt ---
            
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
        city_match = re.search(r'([A-Z][a-zA-Z\s]+)(?:,\s*(?:India|Maharashtra|Karnataka|Tamil Nadu|Delhi|Telangana|Gujarat|UP|Haryana|West Bengal|Kerala|Punjab|Rajasthan|MP|AP|Bihar|Odisha))', text)
        if city_match:
            candidate = city_match.group(1).strip()
            # Avoid matching words like 'In, India'
            if len(candidate) > 2 and candidate not in ["Email", "Phone", "Mobile", "In"]:
                found_city = candidate
                
        if not found_city:
            for city in cities:
                if re.search(r'\b' + city + r'\b', text, re.IGNORECASE):
                    found_city = city
                    break
                    
        if found_city:
            extracted_data["custom_city"] = found_city.title()
            
        # Address (Heuristic based on Indian States) for State/Street
        indian_states = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"]
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        for i, line in enumerate(lines[:30]):
            line_upper = line.upper()
            found_state = None
            for state in indian_states:
                if state.upper() in line_upper:
                    found_state = state
                    extracted_data["custom_state"] = state
                    break
            
            if found_state:
                # Basic street heuristic based on previous lines
                if not extracted_data.get("custom_street") and i > 0:
                    prev_line = lines[i-1]
                    # If prev line isn't just the city or name, assume it's part of the address
                    if prev_line and prev_line.lower() not in [extracted_data.get("custom_city", "").lower(), extracted_data.get("first_name", "").lower()]:
                        extracted_data["custom_street"] = prev_line[:140]
                break
                
        # 8. Highest Qualification (Fallback)
        text_upper = text.upper().replace(".", "").replace(" ", "")
        if "BTECH" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "B.Tech"
        elif "MTECH" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "M.Tech"
        elif "BCA" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "BCA"
        elif "MCA" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "MCA"
        elif "MBA" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "MBA"
        elif "BBA" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "BBA"
        elif "BSC" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "BSc"
        elif "MSC" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "M.Sc"
        elif "BE" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "BE"
        elif "ME" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "ME"
        elif "BA" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "BA"
        elif "GRADUATE" in text_upper:
            extracted_data["custom_highest_qualification_held"] = "Graduate"
                
        return extracted_data
        
    except Exception as e:
        frappe.log_error(f"Resume Extraction Error: {str(e)}")
        return extracted_data
