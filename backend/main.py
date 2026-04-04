from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"message": "pong"}

from pydantic import BaseModel

class SummaryRequest(BaseModel):
    character_name: str
    current_location: str  # For now, accept as string (e.g., CFI)

@app.post("/summarize")
def summarize(request: SummaryRequest):
    # Placeholder logic: just echo the input
    return {
        "character_name": request.character_name,
        "current_location": request.current_location,
        "summary": f"This is a placeholder summary for {request.character_name} up to {request.current_location}."
    }