import os
import frappe
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BASE_PATH = frappe.get_site_path("private", "faiss_index")
VEC_FILE = os.path.join(BASE_PATH, "vectorizer.pkl")
DATA_FILE = os.path.join(BASE_PATH, "data.pkl")

# FIX: Site uses circuit_id, and Installation Note added
CIRCUIT_FIELD_MAP = {
    "HD Ticket": "custom_circuit_id",
    "Site": "circuit_id",
    "Provisioning": "circuit_id",
    "Lastmile Services Master": "circuit_id",
    "Installation Master": "circuit_id"   # Corrected from Installation Note
}

TARGET_DOCTYPES = list(CIRCUIT_FIELD_MAP.keys())


# ---------------------------------------------------------
# BUILD INDEX
# ---------------------------------------------------------
def build_faiss_index():

    if not os.path.exists(BASE_PATH):
        os.makedirs(BASE_PATH)

    texts = []
    metadata = []

    for doctype in TARGET_DOCTYPES:

        meta = frappe.get_meta(doctype)

        # Normal fields
        for field in meta.fields:
            if not field.label:
                continue

            text = f"{doctype} {field.label}"
            texts.append(text)
            metadata.append({
                "doctype": doctype,
                "field": field.fieldname,
                "label": field.label
            })

            # Child table fields
            if field.fieldtype == "Table":
                child_meta = frappe.get_meta(field.options)

                # Improved keywords for child tables
                texts.append(f"{doctype} {field.label} list row data table information")
                metadata.append({
                    "doctype": doctype,
                    "field": field.fieldname,
                    "is_table": True,
                    "label": field.label
                })

                for child_field in child_meta.fields:
                    if not child_field.label or child_field.fieldtype in ["Section Break", "Column Break", "Tab Break"]:
                        continue

                    # Weight key fields higher by repeating them or adding synonyms
                    text = f"{doctype} {field.label} {child_field.label} details info"
                    if "contact" in child_field.label.lower() or "mobile" in child_field.label.lower():
                        text += " phone number call person"
                    if "matrix" in child_field.label.lower() or "level" in child_field.label.lower():
                        text += " escalation hierarchy support"
                    
                    texts.append(text)
                    metadata.append({
                        "doctype": doctype,
                        "field": field.fieldname,
                        "child_field": child_field.fieldname,
                        "label": f"{field.label} {child_field.label}"
                    })

    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform(texts)

    with open(VEC_FILE, "wb") as f:
        pickle.dump(vectorizer, f)

    with open(DATA_FILE, "wb") as f:
        pickle.dump((vectors, metadata), f)

    return "Index built successfully"


# ---------------------------------------------------------
# SEARCH
# ---------------------------------------------------------
def faiss_search(query, top_k=5):

    with open(VEC_FILE, "rb") as f:
        vectorizer = pickle.load(f)

    with open(DATA_FILE, "rb") as f:
        vectors, metadata = pickle.load(f)

    query_vec = vectorizer.transform([query])
    scores = cosine_similarity(query_vec, vectors)[0]
    top_indices = scores.argsort()[-top_k:][::-1]

    return [metadata[i] for i in top_indices]


# ---------------------------------------------------------
# FETCH DATA (with caching)
# ---------------------------------------------------------
def fetch_data_by_circuit(circuit_id, items):
    """
    Fetch data for each matched item.
    Uses a cache dictionary to avoid fetching the same doctype multiple times.
    """
    context = {}
    doc_cache = {}   # {doctype_name: doc_object}

    for item in items:
        doctype = item["doctype"]

        # Permission check
        if not frappe.has_permission(doctype, "read"):
            continue

        field_map = CIRCUIT_FIELD_MAP.get(doctype)
        if not field_map:
            continue

        # Get or fetch document
        if doctype not in doc_cache:
            try:
                # Get first matching document (circuit_id may be unique per doctype)
                name = frappe.db.get_value(doctype, {field_map: circuit_id}, "name")
                if name:
                    doc_cache[doctype] = frappe.get_doc(doctype, name)
                else:
                    continue
            except Exception as e:
                frappe.log_error(f"Error fetching {doctype}: {str(e)}", "FAISS Engine")
                continue

        doc = doc_cache[doctype]

        # -------------------------------------------------
        # Handle table field (entire table)
        # -------------------------------------------------
        if item.get("is_table"):
            table_field = item["field"]
            table_rows = doc.get(table_field)
            if not isinstance(table_rows, list):
                continue

            structured_rows = []
            for row in table_rows:
                row_data = {}
                for key, val in row.as_dict().items():
                    if val not in [None, "", []]:
                        row_data[key] = val
                if row_data:
                    structured_rows.append(row_data)

            if structured_rows:
                context.setdefault(doctype, {})
                context[doctype][table_field] = structured_rows
            continue

        # -------------------------------------------------
        # Handle child field (specific child field in a table)
        # -------------------------------------------------
        if "child_field" in item:
            table_field = item["field"]
            table_rows = doc.get(table_field)
            if not isinstance(table_rows, list):
                continue

            # Optionally, we could filter to only the requested child field,
            # but for simplicity we return the whole table (context may be more than needed)
            structured_rows = []
            for row in table_rows:
                row_data = {}
                for key, val in row.as_dict().items():
                    if val not in [None, "", []]:
                        row_data[key] = val
                if row_data:
                    structured_rows.append(row_data)

            if structured_rows:
                context.setdefault(doctype, {})
                context[doctype][table_field] = structured_rows
            continue

        # -------------------------------------------------
        # Normal field
        # -------------------------------------------------
        value = doc.get(item["field"])
        if value not in [None, ""]:
            context.setdefault(doctype, {})
            context[doctype][item["field"]] = value

    return context