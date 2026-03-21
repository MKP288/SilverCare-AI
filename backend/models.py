from pydantic import BaseModel
from typing import Optional, List


class MedicationCreate(BaseModel):
    name: str
    dose: str
    frequency: str
    times: List[str]
    notes: Optional[str] = None


class HealthInput(BaseModel):
    date: str
    mood: str
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    symptoms: Optional[str] = None
    notes: Optional[str] = None


class DoseLogInput(BaseModel):
    medication_id: int
    taken: bool
    date: str


class AIRequest(BaseModel):
    question: str
    medication_name: Optional[str] = None