from flask import Flask, request, jsonify
import torch
import pandas as pd
from datetime import datetime
import os
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import ast
import re

app = Flask(__name__)
device = "cpu"

print(f"Loading models on {device}...")

# ----------------------
# Load embedding model
# ----------------------
embedding_model = SentenceTransformer('all-MiniLM-L6-v2', device=device)

if os.path.exists("reranker.pt"):
    state_dict = torch.load("reranker.pt", map_location=device)
    embedding_model.load_state_dict(state_dict, strict=False)
    print("Custom weights loaded from reranker.pt")
else:
    print("Using base all-MiniLM-L6-v2 weights.")

embedding_model.eval()

# ----------------------
# Load physician availability
# ----------------------
physicians_df = pd.read_csv("physicians.csv")

def safe_parse_mask(s):
    if pd.isna(s):
        mask = []
    elif isinstance(s, (list, tuple)):
        mask = [int(x) for x in s]
    else:
        try:
            if isinstance(s, str):
                parsed = ast.literal_eval(s)
                if isinstance(parsed, (list, tuple)):
                    mask = [int(x) for x in parsed]
                else:
                    mask = [int(x) for x in re.findall(r'-?\d+', s)]
            else:
                mask = [int(x) for x in re.findall(r'-?\d+', str(s))]
        except Exception:
            mask = [int(x) for x in re.findall(r'-?\d+', str(s))]

    if len(mask) < 24:
        mask += [0]*(24-len(mask))
    elif len(mask) > 24:
        mask = mask[:24]

    return mask

if 'availability_mask' in physicians_df.columns:
    physicians_df['availability_mask'] = physicians_df['availability_mask'].apply(safe_parse_mask)

# ----------------------
# Specialty + embeddings
# ----------------------
specialty_keywords = {
    "Pulmonology": ["cough","asthma","wheezing","shortness of breath"],
    "Cardiology": ["chest pain","palpitations","heart attack","cardiac"],
    "Neurology": ["headache","seizure","stroke","numbness"],
    "Gastroenterology": ["abdominal pain","nausea","diarrhea","vomiting"],
    "Orthopedics": ["fracture","sprain","joint pain","back pain"],
    "Dermatology": ["rash","itch","eczema","psoriasis"],
    "Psychiatry": ["anxiety","depression","suicidal","hallucinations"],
    "Pediatrics": ["child","infant","childhood","pediatric"],
    "OBGYN": ["pregnancy","labor","uterus","ovary","prenatal"],
    "ENT": ["ear pain","nosebleed","throat","sinus"],
    "Oncology": ["cancer","tumor","chemotherapy"],
    "AllergyImmunology": ["allergy","hives","anaphylaxis","immune"]
}

specialty_embeddings = {
    spec: embedding_model.encode(spec, convert_to_tensor=True)
    for spec in specialty_keywords.keys()
}

# ----------------------
# ESI embeddings
# ----------------------
esi_prototypes = {
    1: "critical, not breathing, cardiac arrest",
    2: "high risk, severe chest pain, stroke",
    3: "moderate risk, needs resources",
    4: "minor injury",
    5: "stable"
}

esi_embeddings = {
    level: embedding_model.encode(text, convert_to_tensor=True)
    for level, text in esi_prototypes.items()
}

# ----------------------
# Summarizer
# ----------------------
print("Initializing BART Summarizer...")

summary_model_name = "facebook/bart-large-cnn"
sum_tokenizer = AutoTokenizer.from_pretrained(summary_model_name)
sum_model = AutoModelForSeq2SeqLM.from_pretrained(summary_model_name)
sum_model.eval()

# ----------------------
# Helpers
# ----------------------
def make_serializable(obj):
    if isinstance(obj, torch.Tensor): return obj.tolist()
    if isinstance(obj, (int,float,str,bool,type(None))): return obj
    if isinstance(obj, dict): return {k: make_serializable(v) for k,v in obj.items()}
    if isinstance(obj, list): return [make_serializable(x) for x in obj]
    return str(obj)

def generate_ai_summary(text):
    try:
        inputs = sum_tokenizer([text], max_length=1024, return_tensors="pt", truncation=True)
        ids = sum_model.generate(inputs["input_ids"], max_length=50)
        return sum_tokenizer.decode(ids[0], skip_special_tokens=True)
    except Exception as e:
        print("Summary error:", e)
        return text[:200]

def match_specialty(description):
    desc = description.lower()
    for spec, kws in specialty_keywords.items():
        if any(kw in desc for kw in kws):
            return spec

    with torch.no_grad():
        vec = embedding_model.encode(description, convert_to_tensor=True)
        best, score = None, -1
        for spec, emb in specialty_embeddings.items():
            s = torch.cosine_similarity(vec, emb, dim=0).item()
            if s > score:
                best, score = spec, s
    return best or "General Medicine"

def calculate_esi_semantic(text):
    with torch.no_grad():
        vec = embedding_model.encode(text, convert_to_tensor=True)
        best, score = 5, -1
        for lvl, emb in esi_embeddings.items():
            s = torch.cosine_similarity(vec, emb, dim=0).item()
            if s > score:
                best, score = lvl, s
    return int(best)

def find_physician(spec):
    now = datetime.now().hour
    df = physicians_df[physicians_df['specialty'] == spec]
    if df.empty:
        df = physicians_df

    for i in range(24):
        h = (now+i)%24
        avail = df[df['availability_mask'].apply(lambda m: m[h]==1)]
        if not avail.empty:
            r = avail.sort_values('workload_score').iloc[0]
            return str(r['physician_id']), str(r['name'])

    r = df.sort_values('workload_score').iloc[0]
    return str(r['physician_id']), str(r['name'])

# ----------------------
# ROUTE (FIXED)
# ----------------------
@app.route("/triage", methods=["POST"])
def triage():
    try:
        data = request.get_json()

        if not data or "transcript" not in data:
            return jsonify({"error": "Missing transcript"}), 400

        transcript = str(data["transcript"])

        specialty = match_specialty(transcript)
        esi = calculate_esi_semantic(transcript)
        pid, pname = find_physician(specialty)

        result = {
            "ESI": esi,
            "specialty": specialty,
            "assigned_physician": {"id": pid, "name": pname},
            "ai_summary": generate_ai_summary(transcript),
            "ward": {
                1:"Resuscitation",
                2:"Critical Care",
                3:"General Ward",
                4:"Urgent Care",
                5:"Outpatient"
            }.get(esi, "Outpatient")
        }

        return jsonify(make_serializable(result)), 200

    except Exception as e:
        print("🔥 TRIAGE ERROR:", e)
        return jsonify({"error": str(e)}), 500


# ----------------------
# RUN (FIXED)
# ----------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    # ✅ THREADED = NO BLOCKING
    app.run(host="0.0.0.0", port=port, threaded=True)