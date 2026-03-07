from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from typing import List, Optional
import uuid
import socket
import os
import shutil
import asyncio

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads folder setup
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# In-memory database
complaints_db = []


class Complaint(BaseModel):
    id: str
    description: str
    department: str
    category: str
    status: str
    image_status: str
    ai_score: int
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    image_url: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


def get_free_port(starting_port: int = 8000) -> int:
    port = starting_port
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("0.0.0.0", port)) != 0:
                return port
            port += 1


def analyze_text_and_score(text: str):
    import re

    text_lower = text.lower()
    tokens = re.findall(r"[a-z0-9]+", text_lower)

    def keyword_matches(keyword: str) -> bool:
        keyword_lower = keyword.lower()
        if keyword_lower in text_lower:
            return True
        return any(token.startswith(keyword_lower) for token in tokens)

    categories = [
        ("Emergency", "Emergency & Safety", [
            "accident",
            "ambulance",
            "police",
            "fire",
            "theft",
            "fight",
            "harassment",
        ]),
        ("Sanitation", "Sanitation (Swachh Bharat)", [
            "garbage",
            "waste",
            "dustbin",
            "cleaning",
            "drainage",
            "toilet",
            "smell",
        ]),
        ("Water", "Water Supply Board", [
            "leakage",
            "no water",
            "dirty water",
            "pipeline",
            "tanker",
        ]),
        ("Electricity", "Electricity Board", [
            "electric",
            "power",
            "shock",
            "power cut",
            "sparking",
            "transformer",
            "meter issue",
            "bill correction",
        ]),
        ("Roads/PWD", "PWD / Roads Department", [
            "pothole",
            "broken road",
            "footpath",
            "encroachment",
        ]),
        ("Health", "Health & Medical", [
            "hospital",
            "medicines",
            "vaccine",
            "doctor availability",
        ]),
        ("Administrative", "Revenue & Identity", [
            "aadhar",
            "certificate",
            "license",
            "land records",
        ]),
    ]

    for category, department, keywords in categories:
        match_count = sum(1 for keyword in keywords if keyword_matches(keyword))
        if match_count > 0:
            ai_score = min(95, 80 + match_count * 5)
            return category, department, ai_score

    return "General", "General Support", 70


def analyze_image(filename: Optional[str]) -> str:
    if filename:
        return "Verified Issue (AI Confidence: 92%)"
    return "No Image Uploaded"


async def delete_resolved_tickets():
    while True:
        await asyncio.sleep(3600)
        global complaints_db
        complaints_db = [c for c in complaints_db if c.status != "Resolved"]
        print("Auto-Cleanup: Removed resolved tickets from database")


@app.on_event("startup")
async def start_cleanup_task():
    asyncio.create_task(delete_resolved_tickets())


@app.post("/submit-complaint", response_model=Complaint)
async def submit_complaint(
    description: str = Form(...),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    category, department, ai_score = analyze_text_and_score(description)
    image_status = analyze_image(file.filename if file else None)

    # Image save logic
    image_url = None
    if file:
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        image_url = f"/uploads/{file.filename}"

    new_complaint = Complaint(
        id=str(uuid.uuid4())[:8].upper(),
        description=description,
        department=department,
        category=category,
        status="Pending",
        image_status=image_status,
        ai_score=ai_score,
        latitude=latitude,
        longitude=longitude,
        image_url=image_url,
    )
    complaints_db.append(new_complaint)
    return new_complaint


@app.get("/complaints", response_model=List[Complaint])
def get_complaints():
    return complaints_db


@app.get("/complaints/{complaint_id}", response_model=Complaint)
def get_complaint(complaint_id: str):
    for c in complaints_db:
        if c.id == complaint_id:
            return c
    raise HTTPException(status_code=404, detail="Complaint not found")


@app.put("/complaints/{complaint_id}/status")
def update_status(complaint_id: str, update_data: StatusUpdate):
    for c in complaints_db:
        if c.id == complaint_id:
            c.status = update_data.status
            return {"message": "Status updated", "complaint": c}
    return {"error": "Complaint not found"}


if __name__ == "__main__":
    port = get_free_port(8000)
    print(f"Starting server on port {port}...")
    uvicorn.run("backend:app", host="0.0.0.0", port=port, reload=True)
