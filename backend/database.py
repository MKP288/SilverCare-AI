import sqlite3
import os
import sqlite3
import os
from datetime import datetime

DB_PATH = "database/silvercare.db"

DB_PATH = "database/silvercare.db"

def init_db():
    os.makedirs("database", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS medications
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, dosage TEXT, schedule_time TEXT)''')
                 
    c.execute('''CREATE TABLE IF NOT EXISTS health_logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, mood TEXT, symptoms TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
                 
    c.execute('''CREATE TABLE IF NOT EXISTS intake_logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, med_id INTEGER, status TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
                 
    conn.commit()
    conn.close()

def add_medication(name: str, dosage: str, time: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO medications (name, dosage, schedule_time) VALUES (?, ?, ?)", (name, dosage, time))
    conn.commit()
    med_id = c.lastrowid
    conn.close()
    return med_id

def get_all_medications():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    c = conn.cursor()
    
    c.execute("SELECT id, name, dosage, schedule_time FROM medications")
    rows = c.fetchall()
    conn.close()

def add_health_log(mood: str, symptoms: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO health_logs (mood, symptoms) VALUES (?, ?)", (mood, symptoms))
    conn.commit()
    log_id = c.lastrowid
    conn.close()
    return log_id

def get_health_logs():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM health_logs ORDER BY timestamp DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def log_medication_intake(med_id: int, status: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO intake_logs (med_id, status) VALUES (?, ?)", (med_id, status))
    conn.commit()
    conn.close()

def check_if_taken_today(med_id: int) -> bool:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")
    c.execute("SELECT id FROM intake_logs WHERE med_id = ? AND status = 'taken' AND date(timestamp) = ?", (med_id, today))
    result = c.fetchone()
    conn.close()
    return result is not None
