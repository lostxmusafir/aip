import asyncio
import os
import shutil
import socket
import uuid
import json
import base64
import urllib.request
import urllib.error
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# 🧠 GOD MODE AI (FREE): Direct REST API Fallback
GEMINI_API_KEYS = [
    "AIzaSyCimbYgJP7HcNGOSGU8DkdA9lDH5wTAPTc",
    "AIzaSyBk-VqejT-c2Ak08UbJy3bzhqhUwrky1RM"
]

# 🎯 AUTO-DISCOVERY: List of models to try until one works
MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
]

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

complaints_db = []

# Reference lists for Prompt Context
VALID_CATEGORIES = [
    "Emergency", "Sanitation", "Water", "Electricity", 
    "Roads/PWD", "Health", "Administrative", "Animal Control", 
    "Environment", "General"
]

DEPARTMENTS = {
    "Emergency": "Emergency & Safety",
    "Sanitation": "Sanitation (Swachh Bharat)",
    "Water": "Water Supply Board",
    "Electricity": "Electricity Board",
    "Roads/PWD": "PWD / Roads Department",
    "Health": "Health & Medical",
    "Administrative": "Revenue & Identity",
    "Animal Control": "Veterinary & Animal Control",
    "Environment": "Environment & Forest",
    "General": "General Support"
}

VALID_SUB_DIVISIONS = [
    "Police Department", "Medical (EMS)", "Fire Department", "Quick Response Team", "N/A"
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

class StatusUpdate(BaseModel):
    status: str

def get_free_port(starting_port: int = 8000) -> int:
    port = starting_port
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
            if server_socket.connect_ex(("0.0.0.0", port)) != 0:
                return port
            port += 1

# 🧹 AUTO-CLEANUP WORKER
async def delete_resolved_tickets() -> None:
    while True:
        await asyncio.sleep(3600)
        global complaints_db
        complaints_db = [complaint for complaint in complaints_db if complaint.status != "Resolved"]
        print("Auto-Cleanup: Removed resolved tickets from database")

# ⏱️ 5-SECOND BACKGROUND WORKER (POWERED BY AUTO-DISCOVERY REST API)
async def background_ai_worker() -> None:
    while True:
        await asyncio.sleep(5) 
        
        for complaint in complaints_db:
            if complaint.ai_status == "Queued":
                complaint.ai_status = "Processing"
                print(f"\n🧠 Starting AI Analysis for Ticket: {complaint.id}")
                
                success = False
                
                # 🔄 Loop 1: Iterate through available API Keys
                for api_key_idx, api_key in enumerate(GEMINI_API_KEYS):
                    if success: break
                    
                    # 🔄 Loop 2: Auto-Discover active model
                    for model_name in MODELS_TO_TRY:
                        if success: break
                        
                        try:
                            print(f"   [Try] Key {api_key_idx + 1} | Model: {model_name}...")
                            
                            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                            
                            prompt_text = f"Analyze this civic complaint from India (can be Hindi, Gujarati, Hinglish, or English).\n\nDescription: '{complaint.description}'\n\nBased on the description and image (if provided), output a strictly formatted JSON object with no markdown wrappers or extra text. Use these exact keys:\n1. 'category': Must be one of {VALID_CATEGORIES}.\n2. 'sub_division': If category is 'Emergency', must be one of {VALID_SUB_DIVISIONS}. Otherwise, use 'N/A'.\n3. 'ai_score': An integer between 70 and 99 representing confidence level.\n4. 'image_status': A short 1-sentence description of what you see in the image (if any) and how it relates to the complaint. If no image, say 'No Image Uploaded'."
                            
                            parts = [{"text": prompt_text}]

                            # Add Image if it exists
                            if complaint.image_url:
                                local_image_path = f".{complaint.image_url}"
                                if os.path.exists(local_image_path):
                                    with open(local_image_path, "rb") as img_file:
                                        b64_img = base64.b64encode(img_file.read()).decode('utf-8')
                                    
                                    ext = os.path.splitext(local_image_path)[1].lower()
                                    mime_type = "image/png" if ext == ".png" else "image/jpeg"
                                    
                                    # 🛠️ FIX: Strict camelCase required by Google REST API
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
                            
                            # 🛠️ Bulletproof JSON Cleaning
                            result_text = result_text.strip()
                            start_idx = result_text.find('{')
                            end_idx = result_text.rfind('}')
                            
                            if start_idx != -1 and end_idx != -1:
                                result_text = result_text[start_idx:end_idx+1]
                                
                            result_json = json.loads(result_text)

                            # Update Ticket
                            category = result_json.get("category", "General")
                            if category not in VALID_CATEGORIES:
                                category = "General"
                                
                            complaint.category = category
                            complaint.department = DEPARTMENTS.get(category, "General Support")
                            complaint.sub_division = result_json.get("sub_division", "N/A")
                            complaint.ai_score = int(result_json.get("ai_score", 85))
                            complaint.image_status = result_json.get("image_status", "Analyzed successfully.")
                            
                            complaint.ai_status = "Completed"
                            print(f"✅ SUCCESS! Ticket {complaint.id} -> {complaint.department} ({complaint.sub_division}) [Model Used: {model_name}]")
                            
                            # Mark as success to break out of all loops
                            success = True

                        except urllib.error.HTTPError as e:
                            error_msg = e.read().decode('utf-8')
                            if e.code == 404:
                                print(f"   ⚠️ 404: '{model_name}' is dead. Trying next model...")
                                continue # Try the next model name in the list
                            else:
                                print(f"   ❌ API Error on Key {api_key_idx + 1} | Code: {e.code} | MSG: {error_msg}")
                                break # Break model loop, this key is bad. Try next key.
                                
                        except Exception as e:
                            print(f"   ❌ General Error: {e}")
                            break # Break model loop, try next key

                if not success:
                    print(f"❌ FATAL: All Models and API Keys failed for Ticket {complaint.id}.")
                    # Revert to Queued so it tries again later, or mark as Failed
                    complaint.ai_status = "Failed"
                    complaint.department = "Manual Review Required"
                    complaint.category = "General"
                    complaint.sub_division = "N/A"

@app.on_event("startup")
async def startup_event() -> None:
    asyncio.create_task(background_ai_worker())
    asyncio.create_task(delete_resolved_tickets())

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
    complaints_db.append(new_complaint)
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
            return {"message": "Status updated", "complaint": complaint}
    return {"error": "Complaint not found"}

if __name__ == "__main__":
    port = get_free_port(8000)
    print(f"🚀 Starting Auto-Discovery AI Server on port {port}...")
    uvicorn.run("backend:app", host="0.0.0.0", port=port, reload=True)
