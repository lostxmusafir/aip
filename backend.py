import asyncio
import os
import shutil
import socket
import uuid
import json
import base64
import urllib.request
import urllib.error
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ?? GOD MODE AI (FREE): Direct REST API Fallback
# ? AAPKI DONO KEYS YAHAN ADD KAR DI GAYI HAIN
GEMINI_API_KEYS = []

# ?? AUTO-DISCOVERY: List of models to try until one works
MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash"
]

complaints_db = []
DB_PATH = os.path.join(os.path.dirname(__file__), "complaints.db")
TICKETS_DIR = os.path.join(os.path.dirname(__file__), "tickets_data")

def get_db_connection() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)

def init_db() -> None:
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS complaints (
                id TEXT PRIMARY KEY,
                description TEXT,
                contact_no TEXT,
                department TEXT,
                category TEXT,
                sub_division TEXT,
                status TEXT,
                image_status TEXT,
                ai_score INTEGER,
                ai_status TEXT,
                latitude TEXT,
                longitude TEXT,
                image_url TEXT,
                created_at TEXT
            )
            """
        )
        # Add created_at column for existing DBs
        cols = [row[1] for row in conn.execute("PRAGMA table_info(complaints)").fetchall()]
        if "created_at" not in cols:
            conn.execute("ALTER TABLE complaints ADD COLUMN created_at TEXT")
        conn.commit()

def load_complaints_from_db() -> None:
    global complaints_db
    with get_db_connection() as conn:
        rows = conn.execute("SELECT id, description, contact_no, department, category, sub_division, status, image_status, ai_score, ai_status, latitude, longitude, image_url, created_at FROM complaints").fetchall()
    complaints_db = [
        Complaint(
            id=row[0],
            description=row[1],
            contact_no=row[2],
            department=row[3],
            category=row[4],
            sub_division=row[5],
            status=row[6],
            image_status=row[7],
            ai_score=row[8],
            ai_status=row[9],
            latitude=row[10],
            longitude=row[11],
            image_url=row[12],
            created_at=row[13] or Complaint.__fields__["created_at"].default_factory(),
        )
        for row in rows
    ]

def upsert_complaint(complaint: "Complaint") -> None:
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO complaints (id, description, contact_no, department, category, sub_division, status, image_status, ai_score, ai_status, latitude, longitude, image_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                description=excluded.description,
                contact_no=excluded.contact_no,
                department=excluded.department,
                category=excluded.category,
                sub_division=excluded.sub_division,
                status=excluded.status,
                image_status=excluded.image_status,
                ai_score=excluded.ai_score,
                ai_status=excluded.ai_status,
                latitude=excluded.latitude,
                longitude=excluded.longitude,
                image_url=excluded.image_url,
                created_at=excluded.created_at
            """
            ,
            (
                complaint.id,
                complaint.description,
                complaint.contact_no,
                complaint.department,
                complaint.category,
                complaint.sub_division,
                complaint.status,
                complaint.image_status,
                complaint.ai_score,
                complaint.ai_status,
                complaint.latitude,
                complaint.longitude,
                complaint.image_url,
                complaint.created_at,
            ),
        )
        conn.commit()

def update_status_in_db(complaint_id: str, status: str) -> None:
    with get_db_connection() as conn:
        conn.execute("UPDATE complaints SET status = ? WHERE id = ?", (status, complaint_id))
        conn.commit()

# Reference lists for Prompt Context
VALID_CATEGORIES = [
    "Emergency",
    "Sanitation & Waste",
    "Water & Sewage",
    "Power & Electricity",
    "Roads & Traffic",
    "Health & Medical",
    "Administrative",
    "Animal Control",
    "Parks & Environment",
    "Public Nuisance"
]

DEPARTMENTS = {
    "Emergency": "Emergency & Safety",
    "Sanitation & Waste": "Sanitation (Swachh Bharat)",
    "Water & Sewage": "Water Supply Board",
    "Power & Electricity": "Electricity Board (PGVCL)",
    "Roads & Traffic": "PWD / Roads Department",
    "Health & Medical": "Health Department",
    "Administrative": "Civic Administration",
    "Animal Control": "Veterinary & Animal Control",
    "Parks & Environment": "Environment & Forest",
    "Public Nuisance": "Law & Order"
}

VALID_SUB_DIVISIONS = [
    "Police Action Required",
    "Fire Brigade",
    "Medical Emergency",
    "Ambulance Required",
    "Noise Pollution",
    "Public Drinking",
    "Illegal Encroachment",
    "Public Disturbance",
    "Streetlights Issue",
    "Power Outage",
    "Transformer Issue",
    "Water Leakage",
    "No Water Supply",
    "Sewage Overflow",
    "Drain Blockage",
    "Garbage Collection",
    "Waste Dumping",
    "Sanitation Drive Needed",
    "Pothole Repair",
    "Road Damage",
    "Traffic Jam",
    "Signal Malfunction",
    "Fallen Tree",
    "Park Maintenance",
    "Tree Cutting",
    "Animal Rescue",
    "Stray Animal",
    "Health Hazard",
    "Hospital Assistance",
    "Document Verification",
    "Revenue Issue",
    "License/Permit Issue",
    "Other",
    "N/A"
]

class Complaint(BaseModel):
    id: str
    description: str
    contact_no: str
    department: str = "Analyzing..."
    category: str = "Analyzing..."
    sub_division: str = "Analyzing..."
    status: str = "Pending"
    image_status: str = "Pending Analysis"
    ai_score: int = 0
    ai_status: str = "Queued"  
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    image_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().strftime("%d-%m-%Y %H:%M:%S"))

class StatusUpdate(BaseModel):
    status: str

def get_free_port(starting_port: int = 8000) -> int:
    port = starting_port
    while True:
        # ?? THE FIX: Properly calling socket.SOCK_STREAM without double socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
            if server_socket.connect_ex(("0.0.0.0", port)) != 0:
                return port
            port += 1

def save_ticket_to_file(complaint: "Complaint") -> None:
    os.makedirs(TICKETS_DIR, exist_ok=True)
    file_path = os.path.join(TICKETS_DIR, f"Ticket_{complaint.id}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(complaint.dict(), f, ensure_ascii=False, indent=2)

def load_tickets_from_files() -> None:
    global complaints_db
    os.makedirs(TICKETS_DIR, exist_ok=True)
    loaded: List[Complaint] = []
    for file_name in os.listdir(TICKETS_DIR):
        if not file_name.lower().endswith(".json"):
            continue
        file_path = os.path.join(TICKETS_DIR, file_name)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            loaded.append(Complaint(**data))
        except Exception as e:
            print(f"?? Skipping corrupted ticket file {file_name}: {e}")
    complaints_db = loaded
    for complaint in complaints_db:
        upsert_complaint(complaint)

init_db()
load_tickets_from_files()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ?? LIVE AI ANALYZER (Synchronous function for instant popup results)
async def analyze_complaint_live(complaint: Complaint) -> None:
    complaint.ai_status = "Processing"
    print(f"\n?? LIVE AI Analysis Started for Ticket: {complaint.id}")
    
    success = False
    
    # ?? Loop 1: Iterate through available API Keys
    for api_key_idx, api_key in enumerate(GEMINI_API_KEYS):
        if success: break
        
        # ?? Loop 2: Auto-Discover active model
        for model_name in MODELS_TO_TRY:
            if success: break
            
            try:
                print(f"   [Try] Key {api_key_idx + 1} | Model: {model_name}...")
                
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                
                prompt_text = f"Analyze this civic complaint from India (can be Hindi, Gujarati, Hinglish, or English).\n\nDescription: '{complaint.description}'\n\nBased on the description and image (if provided), output a strictly formatted JSON object with no markdown wrappers or extra text. Use these exact keys:\n1. 'category': MUST be exactly one of {VALID_CATEGORIES}. Do not invent new categories.\n2. 'sub_division': MUST be exactly one of {VALID_SUB_DIVISIONS}. Do not invent new sub-divisions. Use 'N/A' only if none fit.\n3. 'ai_score': An integer between 70 and 99 representing confidence level.\n4. 'image_status': A short 1-sentence description of what you see in the image (if any) and how it relates to the complaint. If no image, say 'No Image Uploaded'."
                
                parts = [{"text": prompt_text}]

                # Add Image if it exists
                if complaint.image_url:
                    local_image_path = f".{complaint.image_url}"
                    if os.path.exists(local_image_path):
                        with open(local_image_path, "rb") as img_file:
                            b64_img = base64.b64encode(img_file.read()).decode('utf-8')
                        
                        ext = os.path.splitext(local_image_path)[1].lower()
                        mime_type = "image/png" if ext == ".png" else "image/jpeg"
                        
                        parts.append({
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": b64_img
                            }
                        })

                # Construct payload perfectly with safety filters OFF
                payload = {
                    "contents": [{"parts": parts}],
                    "generationConfig": {"responseMimeType": "application/json"},
                    "safetySettings": [
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
                    ]
                }

                req = urllib.request.Request(
                    url, 
                    data=json.dumps(payload).encode('utf-8'), 
                    headers={'Content-Type': 'application/json'}
                )
                
                # Execute request in a thread so it doesn't block FastAPI
                response = await asyncio.to_thread(urllib.request.urlopen, req)
                response_data = json.loads(response.read().decode('utf-8'))
                
                # Extract the result text
                result_text = response_data['candidates'][0]['content']['parts'][0]['text']
                
                # ??? Bulletproof JSON Cleaning
                result_text = result_text.strip()
                start_idx = result_text.find('{')
                end_idx = result_text.rfind('}')
                
                if start_idx != -1 and end_idx != -1:
                    result_text = result_text[start_idx:end_idx+1]
                    
                result_json = json.loads(result_text)

                # Update Ticket
                category = result_json.get("category", "Public Nuisance")
                if category not in VALID_CATEGORIES:
                    category = "Public Nuisance"

                sub_division = result_json.get("sub_division", "N/A")
                if sub_division not in VALID_SUB_DIVISIONS:
                    sub_division = "N/A"
                    
                complaint.category = category
                complaint.department = DEPARTMENTS.get(category, "Law & Order")
                complaint.sub_division = sub_division
                complaint.ai_score = int(result_json.get("ai_score", 85))
                complaint.image_status = result_json.get("image_status", "Analyzed successfully.")
                
                complaint.ai_status = "Completed"
                print(f"? LIVE AI SUCCESS! Ticket {complaint.id} -> {complaint.department} ({complaint.sub_division}) [Model: {model_name}]")
                
                # Mark as success to break out of all loops
                success = True

            except urllib.error.HTTPError as e:
                error_msg = e.read().decode('utf-8')
                if e.code == 429:
                    print(f"   ? Rate limit hit on Key {api_key_idx + 1} | Model: {model_name}. Trying next fallback...")
                    await asyncio.sleep(2)
                    continue
                if e.code == 404:
                    print(f"   ?? 404: '{model_name}' is dead. Trying next model...")
                    continue
                else:
                    print(f"   ? API Error on Key {api_key_idx + 1} | Code: {e.code} | MSG: {error_msg}")
                    continue 
                    
            except Exception as e:
                print(f"   ? General Error: {e}")
                continue 

    if not success:
        print(f"? FATAL: All Models and API Keys failed for Ticket {complaint.id}.")
        complaint.ai_status = "Failed"
        complaint.department = "Manual Review Required"
        complaint.category = "General"
        complaint.sub_division = "N/A"

@app.post("/submit-complaint", response_model=Complaint)
async def submit_complaint(
    description: str = Form(...),
    contact_no: str = Form(...),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
) -> Complaint:
    image_url = None
    if file:
        original_name = os.path.basename(file.filename or "upload.jpg")
        safe_name = f"{uuid.uuid4().hex}_{original_name}"
        saved_image_path = os.path.join("uploads", safe_name)
        with open(saved_image_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        image_url = f"/uploads/{safe_name}"

    new_complaint = Complaint(
        id=str(uuid.uuid4())[:8].upper(),
        description=description,
        contact_no=contact_no,
        latitude=latitude,
        longitude=longitude,
        image_url=image_url,
    )
    
    # ?? AWAIT LIVE AI ANALYSIS HERE BEFORE RETURNING TO FRONTEND
    await analyze_complaint_live(new_complaint)
    
    complaints_db.append(new_complaint)
    upsert_complaint(new_complaint)
    save_ticket_to_file(new_complaint)
    return new_complaint

@app.get("/complaints", response_model=List[Complaint])
def get_complaints() -> List[Complaint]:
    return complaints_db

@app.get("/complaints/{complaint_id}", response_model=Complaint)
def get_complaint(complaint_id: str) -> Complaint:
    for complaint in complaints_db:
        if complaint.id == complaint_id:
            return complaint
    raise HTTPException(status_code=404, detail="Complaint not found")

@app.put("/complaints/{complaint_id}/status")
def update_status(complaint_id: str, update_data: StatusUpdate) -> Dict[str, object]:
    for complaint in complaints_db:
        if complaint.id == complaint_id:
            complaint.status = update_data.status
            update_status_in_db(complaint_id, update_data.status)
            save_ticket_to_file(complaint)
            return {"message": "Status updated", "complaint": complaint}
    return {"error": "Complaint not found"}

if __name__ == "__main__":
    port = get_free_port(8000)
    print(f"?? Starting Auto-Discovery AI Server (LIVE MODE) on port {port}...")
    uvicorn.run("backend:app", host="0.0.0.0", port=port, reload=True)



