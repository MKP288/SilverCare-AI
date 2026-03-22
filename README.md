# 🩺 SilverCare AI

SilverCare AI is a simple full-stack health assistant designed for older adults.  
It helps users manage medications, track daily health, receive reminders, and ask AI-powered health questions.

---

## 🚀 Features

- 💊 Medication management
- ✅ Daily intake tracking (Taken / Missed)
- 📊 Adherence summary
- 🩺 Daily health check-in
- ⚠️ Alerts for missed doses
- 🤖 AI assistant (medication explanation & general questions)

---

## 🛠️ Requirements

Before running the project, make sure you have:

- Python **3.13**
- pip (comes with Python)

---

## 📦 Required Python Packages

This project depends on the following Python libraries:

| Package             |            Purpose               |
|--------             |                          --------|
| fastapi             | Backend framework                |
| uvicorn             | ASGI server to run FastAPI       |
| pydantic            | Data validation                  |
| google-generativeai | Gemini AI integration            |
| apscheduler         | Background scheduler (reminders) |

All dependencies are already listed in `requirements.txt`.

---

## 📥 Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/SilverCare-AI.git
cd SilverCare-AI


2，Install dependencies:

pip install -r requirements.txt


3, Configure AI API key:

Go to the file:

backend/intelligence.py

Find this line:

genai.configure(api_key="Your_APi_KEY")

Replace "Your_APi_KEY" with your own Gemini API key.

▶️ Running the Backend

Start the FastAPI server:

uvicorn backend.main:app --reload

Backend will run at:

http://127.0.0.1:8000

🌐 Running the Frontend

Open the frontend directly:

frontend/index.html

(Double-click the file or open it in your browser)

🧪 How to Use

Start the backend

Open the frontend

Add medications

Track daily intake

Submit health check-ins

Use the AI assistant

⚠️ Notes

The backend must be running before using the frontend

Data is stored locally using SQLite (no setup required)

AI features require a valid Gemini API key
