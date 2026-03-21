from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from . import database
from . import scheduler
from . import intelligence
from .models import MedicationCreate, HealthInput, DoseLogInput, AIRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    scheduler.start_scheduler()
    yield


app = FastAPI(title="SilverCare AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "SilverCare AI Backend is Live!"}


@app.get("/medications")
def get_medications():
    meds = database.get_all_medications()
    print("GET /medications ->", meds)
    return meds


@app.post("/medications")
def create_medication(med: MedicationCreate):
    print("POST /medications 收到:", med.model_dump())
    med_id = database.add_medication(
        med.name, med.dose, med.frequency, med.times, med.notes
    )
    return {"message": "Medication successfully logged", "id": med_id}


@app.delete("/medications/{med_id}")
def delete_medication(med_id: int):
    print(f"DELETE /medications/{med_id}")
    database.delete_medication(med_id)
    return {"message": "Medication removed"}


@app.post("/ai/explain")
def ai_explain(req: AIRequest):
    print("POST /ai/explain 收到:", req.model_dump())
    response = intelligence.explain_medication(req.medication_name or "")
    return {"response": response}


@app.post("/ai/ask")
def ai_ask(req: AIRequest):
    print("POST /ai/ask 收到:", req.model_dump())
    response = intelligence.ask_general_question(req.question)
    return {"response": response}


@app.post("/health")
def create_health_log(health: HealthInput):
    print("POST /health 收到:", health.model_dump())

    log_id = database.add_health_log(
        health.date,
        health.mood,
        health.blood_pressure,
        health.heart_rate,
        health.symptoms,
        health.notes,
    )

    alerts = []
    if health.mood == "poor":
        alerts.append({"message": "You reported feeling poor today. Please consider checking in with a caregiver."})

    return {"message": "Daily health data logged successfully", "log_id": log_id, "alerts": alerts}


@app.get("/health")
def get_health_history():
    logs = database.get_health_logs()
    print("GET /health ->", logs)
    return logs


@app.post("/logs")
def create_dose_log(log: DoseLogInput):
    print("POST /logs 收到:", log.model_dump())
    database.add_intake_log(log.medication_id, log.taken, log.date)
    return {"message": "Dose log recorded"}


@app.get("/logs/date/{date}")
def get_logs_by_date(date: str):
    logs = database.get_logs_by_date(date)
    print(f"GET /logs/date/{date} ->", logs)
    return logs


@app.get("/logs/adherence")
def get_adherence():
    data = database.get_adherence()
    print("GET /logs/adherence ->", data)
    return data


@app.get("/alerts")
def get_alerts():
    alerts = database.get_alerts()
    print("GET /alerts ->", alerts)
    return alerts


@app.delete("/alerts")
def clear_alerts():
    print("DELETE /alerts")
    database.clear_alerts()
    return {"message": "Alerts cleared"}