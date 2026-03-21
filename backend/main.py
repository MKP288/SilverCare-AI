from fastapi import FastAPI
from contextlib import asynccontextmanager
from models import Medication, HealthInput
import database
import scheduler
import intelligence

# Lifespan context manager handles startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run on startup
    database.init_db()
    scheduler.start_scheduler()
    yield

app = FastAPI(title="SilverCare AI", lifespan=lifespan)

@app.get("/")
def read_root():
    return {"status": "SilverCare AI Backend is Live!"}

@app.post("/api/medications/")
def create_medication(med: Medication):
    med_id = database.add_medication(med.name, med.dosage, med.schedule_time)
    return {"message": "Medication successfully logged", "medication_id": med_id}

@app.get("/api/explain/{med_name}")
def get_ai_explanation(med_name: str):
    explanation = intelligence.explain_medication(med_name)
    return {"medication": med_name, "explanation": explanation}

@app.get("/api/medications/")
def get_medications():
    meds = database.get_all_medications()
    return {"medications": meds}

@app.post("/api/health/")
def create_health_log(health: HealthInput):
    log_id = database.add_health_log(health.mood, health.symptoms)
    return {"message": "Daily health data logged successfully", "log_id": log_id}

@app.get("/api/health/")
def get_health_history():
    logs = database.get_health_logs()
    return {"health_history": logs}

@app.post("/api/medications/{med_id}/confirm")
def confirm_medication_intake(med_id: int):

    database.log_medication_intake(med_id, status="taken")
    return {"message": f"Medication ID {med_id} confirmed as taken."}