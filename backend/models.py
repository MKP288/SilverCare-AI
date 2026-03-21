from pydantic import BaseModel
from typing import Optional

class Medication(BaseModel):
    name: str
    dosage: str
    schedule_time: str  # Format like "08:00"

class HealthInput(BaseModel):
    mood: str
    symptoms: Optional[str] = None