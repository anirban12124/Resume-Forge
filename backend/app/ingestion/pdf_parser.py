import os
import tempfile
import json
from typing import Dict, Any
from llama_parse import LlamaParse
from google import genai
from google.genai import types
from app.config import settings
from app.common.exceptions import ValidationError

async def parse_pdf(file_bytes: bytes, original_filename: str) -> Dict[str, Any]:
    """
    Parses a PDF resume using LlamaParse and Gemini 2.0 Flash.
    Returns a dict with:
      - constants: contact_info, education, achievements
      - skills: categorized with domain_category and origin_source
      - has_summary: bool
      - parse_confidence_score: float
      - source_origin: 'pdf'
      - original_filename: str
    """
    # 1. Write the bytes to a temp file
    suffix = os.path.splitext(original_filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(file_bytes)
        temp_path = temp_file.name

    try:
        # 2. Run LlamaParse
        parser = LlamaParse(
            api_key=settings.LLAMA_CLOUD_API_KEY,
            result_type="markdown",
            verbose=False
        )
        documents = await parser.aload_data(temp_path)
        markdown_text = "\n".join([doc.text for doc in documents])

        if not markdown_text.strip():
            raise ValidationError("Could not extract any text from the PDF.")

        # 3. Use Gemini to structure the Markdown
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = """
        You are an expert resume parsing assistant. Parse the provided Markdown representation of a resume and extract the structured sections precisely.
        
        Return a JSON object with this EXACT structure:
        {
          "contact_info": {
            "full_name": "Name",
            "email": "Email address or null",
            "phone": "Phone number or null",
            "location": "City, State, Country or null",
            "github": "GitHub profile URL or null",
            "linkedin": "LinkedIn profile URL or null",
            "portfolio": "Portfolio URL or null"
          },
          "education": [
            {
              "school": "Institution name",
              "degree": "Degree (e.g. BS, MS) or null",
              "major": "Field of study or null",
              "gpa": "GPA as string/float or null",
              "start_date": "Start date or null",
              "end_date": "End date or null",
              "location": "City, State or null"
            }
          ],
          "achievements": [
             "List of achievements, certifications, or awards as strings"
          ],
          "skills": {
             "frontend": ["list of frontend skills like React, HTML, CSS, JavaScript, etc."],
             "backend": ["list of backend skills like Python, Go, FastAPI, Django, Java, etc."],
             "devops": ["list of devops/tools like Docker, AWS, Kubernetes, Git, CI/CD, etc."],
             "databases": ["list of database/storage like PostgreSQL, Redis, MongoDB, MySQL, etc."]
          },
          "has_summary": true/false,
          "parse_confidence_score": 0.95
        }
        
        Rules:
        - Separate skills into the correct categories: frontend, backend, devops, databases.
        - Set 'has_summary' to true if there is a summary, objective, or profile section.
        - Calculate a 'parse_confidence_score' between 0.0 and 1.0 reflecting how cleanly and completely you parsed the data.
        """

        try:
            response = client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=f"Here is the resume markdown:\n\n{markdown_text}",
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.1,
                )
            )
            parsed_data = json.loads(response.text)
        except Exception as e:
            raise ValidationError(f"Gemini output parsing failed: {e}")

        # Map flat skills to database structures with metadata
        raw_skills = parsed_data.get("skills", {})
        mapped_skills = {}
        for category in ["frontend", "backend", "devops", "databases"]:
            skills_list = raw_skills.get(category, [])
            mapped_skills[category] = [
                {
                    "name": skill,
                    "domain_category": category,
                    "origin_source": "user_pdf"
                }
                for skill in skills_list
            ]

        # Extract constants
        constants = {
            "contact_info": parsed_data.get("contact_info", {}),
            "education": parsed_data.get("education", []),
            "achievements": parsed_data.get("achievements", [])
        }

        return {
            "constants": constants,
            "skills": mapped_skills,
            "has_summary": bool(parsed_data.get("has_summary", False)),
            "parse_confidence_score": float(parsed_data.get("parse_confidence_score", 0.8)),
            "source_origin": "pdf",
            "original_filename": original_filename
        }

    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
