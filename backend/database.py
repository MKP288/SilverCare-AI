import sqlite3
import os
from datetime import datetime

DB_PATH = "database/silvercare.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs("database", exist_ok=True)
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dose TEXT NOT NULL,
            frequency TEXT NOT NULL,
            times TEXT NOT NULL,
            notes TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS health_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            mood TEXT NOT NULL,
            blood_pressure TEXT,
            heart_rate INTEGER,
            symptoms TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS intake_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medication_id INTEGER NOT NULL,
            taken INTEGER NOT NULL,
            date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def add_medication(name: str, dose: str, frequency: str, times: list[str], notes: str | None):
    conn = get_conn()
    c = conn.cursor()
    times_str = ",".join(times)

    c.execute(
        "INSERT INTO medications (name, dose, frequency, times, notes) VALUES (?, ?, ?, ?, ?)",
        (name, dose, frequency, times_str, notes)
    )
    conn.commit()
    med_id = c.lastrowid
    conn.close()
    return med_id


def get_all_medications():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM medications ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "name": row["name"],
            "dose": row["dose"],
            "frequency": row["frequency"],
            "times": [t.strip() for t in row["times"].split(",") if t.strip()],
            "notes": row["notes"]
        })
    return result


def delete_medication(med_id: int):
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM medications WHERE id = ?", (med_id,))
    conn.commit()
    conn.close()


def add_health_log(date: str, mood: str, blood_pressure: str | None, heart_rate: int | None, symptoms: str | None, notes: str | None):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        INSERT INTO health_logs (date, mood, blood_pressure, heart_rate, symptoms, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (date, mood, blood_pressure, heart_rate, symptoms, notes))
    conn.commit()
    log_id = c.lastrowid
    conn.close()
    return log_id


def get_health_logs():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM health_logs ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_intake_log(medication_id: int, taken: bool, date: str):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        INSERT INTO intake_logs (medication_id, taken, date)
        VALUES (?, ?, ?)
    """, (medication_id, 1 if taken else 0, date))
    conn.commit()
    conn.close()


def get_logs_by_date(date: str):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT medication_id, taken, date
        FROM intake_logs
        WHERE date = ?
    """, (date,))
    rows = c.fetchall()
    conn.close()

    return [
        {
            "medication_id": row["medication_id"],
            "taken": bool(row["taken"]),
            "date": row["date"]
        }
        for row in rows
    ]


def get_adherence():
    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM intake_logs WHERE taken = 1")
    taken = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM intake_logs WHERE taken = 0")
    missed = c.fetchone()[0]

    conn.close()
    return {"taken": taken, "missed": missed}


def get_alerts():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM alerts ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def clear_alerts():
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM alerts")
    conn.commit()
    conn.close()


def check_if_taken_today(med_id: int) -> bool:
    today = datetime.now().strftime("%Y-%m-%d")
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT id FROM intake_logs
        WHERE medication_id = ? AND taken = 1 AND date = ?
    """, (med_id, today))
    result = c.fetchone()
    conn.close()
    return result is not None