import os
import json
from google import genai
from google.genai import types
from django.conf import settings
from django.db.models import Q


def _get_constitution_context(query: str) -> str:
    """
    Searches the constitution_articles table for articles relevant to the user query.
    Returns a compact, well-structured text block to inject into Gemini's prompt.
    Falls back to the JSON file if the DB table is empty or unavailable.
    """
    try:
        from AILegal.models import ConstitutionArticle  # local import to avoid circular refs

        # Build a DB query: match article number, title, description, full_text, or tags
        words = [w for w in query.split() if len(w) > 2]
        if not words:
            words = [query]

        q_filter = Q()
        for word in words[:6]:  # cap at 6 keywords
            q_filter |= (
                Q(article_number__icontains=word) |
                Q(title__icontains=word) |
                Q(short_description__icontains=word) |
                Q(full_text__icontains=word)
            )

        articles = ConstitutionArticle.objects.filter(q_filter)[:8]

        if articles.exists():
            lines = ["=== RELEVANT CONSTITUTION ARTICLES (from database) ==="]
            for a in articles:
                lines.append(
                    f"\n[{a.article_number}] {a.title} | {a.part}\n"
                    f"Tags: {', '.join(a.tags)}\n"
                    f"Text: {a.full_text[:600]}"
                )
            return "\n".join(lines)

    except Exception:
        pass  # DB not available — fall through to JSON fallback

    # Fallback: load the full JSON file
    filepath = os.path.join(settings.BASE_DIR, 'AILegal', 'data', 'constitution_full.json')
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return f"=== CONSTITUTION REFERENCE DATA (JSON) ===\n{json.dumps(data)}"

    return ""


def get_gemini_advice(query):
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

    try:
        constitution_context = _get_constitution_context(query)
        context = (
            f"{constitution_context}\n\n"
            f"=== USER QUERY ===\n{query}"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=context,
            config=types.GenerateContentConfig(
                temperature=0.2,
                top_p=0.95,
                top_k=64,
                max_output_tokens=8192,
                response_mime_type="application/json",
                system_instruction=(
                    "You are a professional Indian legal advisor AI. For every query:\n"
                    "1. Identify relevant Indian Constitution article or IPC section\n"
                    "2. Provide clear step-by-step guidance (numbered list)\n"
                    "3. List exact documents the user will need\n"
                    "4. Specify exact authority/court/forum to approach\n"
                    "5. State realistic possible outcomes\n"
                    "6. End with: This is for informational purposes only. Consult a licensed advocate.\n\n"
                    "You have been provided with the actual text of relevant Constitutional articles above. "
                    "Use this database context to give accurate, article-specific advice.\n\n"
                    "Respond strictly in the following JSON format:\n"
                    "{\n"
                    '  "constitution_reference": "string",\n'
                    '  "applicable_law": "string",\n'
                    '  "steps_to_take": ["string"],\n'
                    '  "documents_required": ["string"],\n'
                    '  "where_to_file": "string",\n'
                    '  "possible_outcomes": ["string"],\n'
                    '  "disclaimer": "This is for informational purposes only. Consult a licensed advocate."\n'
                    "}"
                )
            )
        )
        return json.loads(response.text)
    except Exception as e:
        return {"error": str(e)}



import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def generate_legal_document_text(doc_type, details):
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    prompt = f"Generate a proper Indian legal document.\nType: {doc_type}\nDetails: {json.dumps(details)}\nRespond ONLY with the document text."
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Error generating document: {str(e)}"

def create_pdf_buffer(text):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    textobject = p.beginText(40, 750)
    textobject.setFont("Helvetica", 12)
    
    for line in text.split('\n'):
        words = line.split()
        current_line = ""
        for word in words:
            if len(current_line) + len(word) < 90:
                current_line += word + " "
            else:
                textobject.textLine(current_line)
                current_line = word + " "
                if textobject.getY() < 40:
                    p.drawText(textobject)
                    p.showPage()
                    textobject = p.beginText(40, 750)
                    textobject.setFont("Helvetica", 12)
        textobject.textLine(current_line)
        if textobject.getY() < 40:
             p.drawText(textobject)
             p.showPage()
             textobject = p.beginText(40, 750)
             textobject.setFont("Helvetica", 12)

    p.drawText(textobject)
    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer
