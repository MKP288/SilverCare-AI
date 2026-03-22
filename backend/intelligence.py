import google.generativeai as genai
import os

genai.configure(api_key="")     ## Wirte your Gemini_API


def explain_medication(med_name: str) -> str:
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = (
            f"Explain the medication '{med_name}' to an older adult. "
            f"Keep it simple, compassionate, and under 3 sentences."
        )
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"AI Assistant unavailable right now. Error: {str(e)}"


def ask_general_question(question: str) -> str:
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = (
            "You are a kind health assistant for older adults. "
            "Do not diagnose. Keep the answer short, clear, and supportive.\n\n"
            f"User question: {question}"
        )
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"AI Assistant unavailable right now. Error: {str(e)}"
