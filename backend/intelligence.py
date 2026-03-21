import google.generativeai as genai
import os

# You will need to set your API key in your terminal before running:
# export GEMINI_API_KEY="your_api_key_here"
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def explain_medication(med_name: str) -> str:
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Explain the medication '{med_name}' to an older adult. Keep it extremely simple, compassionate, and under 3 sentences. Mention what it is generally used for."
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"AI Assistant unavailable right now. Error: {str(e)}"