import asyncio
import os
import shutil
import socket
import uuid
import base64
import json
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import AsyncOpenAI

# 🧠 GOD MODE AI: Initialize OpenAI Client
# Put your actual OpenAI API Key here!
OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

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

# Reference lists for OpenAI Prompt Context
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

def encode_image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

# ⏱️ 5-SECOND BACKGROUND WORKER (POWERED BY GPT-4o-mini)
async def background_ai_worker() -> None:
    while True:
        await asyncio.sleep(5) 
        
        for complaint in complaints_db:
            if complaint.ai_status == "Queued":
                complaint.ai_status = "Processing"
                print(f"🧠 OpenAI God Mode is analyzing Ticket: {complaint.id}")
                
                try:
                    # Prepare content for OpenAI
                    messages_content = [
                        {
                            "type": "text",
                            "text": f"Analyze this civic complaint from India (can be Hindi, Gujarati, Hinglish, or English).\n\nDescription: '{complaint.description}'\n\nBased on the description and image (if provided), output a strictly formatted JSON object with no markdown wrappers or extra text. Use these exact keys:\n1. 'category': Must be one of {VALID_CATEGORIES}.\n2. 'sub_division': If category is 'Emergency', must be one of {VALID_SUB_DIVISIONS}. Otherwise, use 'N/A'.\n3. 'ai_score': An integer between 70 and 99 representing confidence level.\n4. 'image_status': A short 1-sentence description of what you see in the image (if any) and how it relates to the complaint. If no image, say 'No Image Uploaded'."
                        }
                    ]

                    # Add Image if it exists
                    if complaint.image_url:
                        local_image_path = f".{complaint.image_url}"
                        if os.path.exists(local_image_path):
                            base64_image = encode_image_to_base64(local_image_path)
                            messages_content.append({
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            })

                    # Call OpenAI API
                    response = await openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {
                                "role": "system", 
                                "content": "You are an advanced AI dispatcher for a Smart City in India. You accurately classify citizen complaints and output ONLY valid JSON."
                            },
                            {
                                "role": "user", 
                                "content": messages_content
                            }
                        ],
                        max_tokens=300,
                        temperature=0.0,
                        response_format={ "type": "json_object" }
                    )

                    # Parse JSON Response
                    result_text = response.choices[0].message.content
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
                    print(f"✅ God Mode Success! Ticket {complaint.id} -> {complaint.department} ({complaint.sub_division}) [Score: {complaint.ai_score}]")

                except Exception as e:
                    print(f"❌ OpenAI API Error for Ticket {complaint.id}: {e}")
                    # Revert to Queued so it tries again, or mark as Failed
                    complaint.ai_status = "Failed"
                    complaint.department = "Manual Review Required"
                    complaint.category = "General"
                    complaint.sub_division = "N/A"

@app.on_event("startup")
async def startup_event() -> None:
    asyncio.create_task(background_ai_worker())

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
    print(f"🚀 Starting God Mode Server on port {port}...")
    uvicorn.run("backend:app", host="0.0.0.0", port=port, reload=True)
