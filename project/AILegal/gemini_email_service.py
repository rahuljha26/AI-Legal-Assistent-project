import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

def draft_email_with_gemini(user_name: str, email_type: str, raw_content: dict) -> str:
    """
    Uses Google Gemini API to convert structured data into a warm, clear email body.
    Returns plain text string to inject into HTML template.
    Returns None if generation fails.
    """
    system_prompt = (
        "You are a professional legal communication assistant for AI Legal Assistant, "
        "an Indian legal advisory platform. Your job is to convert structured legal "
        "advice data into a warm, clear, and empathetic email body that a common "
        "Indian citizen can easily understand. Use simple English. Be professional "
        "but approachable. Do not add any information that is not in the provided data. "
        "Always end with a reminder to consult a licensed advocate."
    )
    
    user_prompt = f"\\nWrite a professional email body (not the subject, not greeting, just body) for {user_name} based on this legal advice data:\\n\\n"
    
    if email_type == 'advice':
        user_prompt += f"Constitution Reference: {raw_content.get('constitution_reference', '')}\\n"
        user_prompt += f"Applicable Law: {raw_content.get('applicable_law', '')}\\n"
        user_prompt += f"Steps to Take: {raw_content.get('steps_to_take', [])}\\n"
        user_prompt += f"Documents Required: {raw_content.get('documents_required', [])}\\n"
        user_prompt += f"Where to File: {raw_content.get('where_to_file', '')}\\n"
        user_prompt += f"Disclaimer: {raw_content.get('disclaimer', '')}\\n"
    elif email_type == 'case_summary':
        user_prompt += f"Case Details: {raw_content.get('case_details', '')}\n"
        user_prompt += f"Next Steps: {raw_content.get('next_steps', [])}\n"
    elif email_type == 'lawyer_communication':
        user_prompt += f"Sender (User): {raw_content.get('user_name', '')} ({raw_content.get('user_email', '')})\n"
        user_prompt += f"Recipient (Lawyer/Authority): {raw_content.get('lawyer_name', 'Advocate')} ({raw_content.get('to_email', '')})\n"
        user_prompt += f"Case Context: {raw_content.get('case_situation', '')}\n"
        user_prompt += f"Urgency: {raw_content.get('urgency', 'Normal')}\n"
        user_prompt += f"Specific Ask: {raw_content.get('specific_ask', '')}\n"
    else:
        user_prompt += f"Document Summary: {str(raw_content)[:500]}\n"
        
    user_prompt += "\\nWrite in clear paragraphs. Use numbered list for steps.\\nKeep tone professional and compassionate.\\nOutput only the email body text, no subject line, no greeting."
    
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content([
            {"role": "user", "parts": [system_prompt + user_prompt]}
        ])
        return response.text
    except Exception as e:
        print(f"Gemini email draft failed: {e}")
        return None
