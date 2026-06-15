import re
import json
from typing import Dict, Any
from google import genai
from google.genai import types
from app.config import settings
from app.common.exceptions import ValidationError

def parse_latex_blocks(latex_code: str) -> Dict[str, str]:
    r"""
    Scans the LaTeX code for \section{...} headers and captures the raw text block
    until the next \section or end of document.
    """
    # Regex to find \section{Section Name}
    pattern = re.compile(r'\\section\{([^}]+)\}', re.IGNORECASE)
    
    sections = {}
    matches = list(pattern.finditer(latex_code))
    
    for idx, match in enumerate(matches):
        section_name = match.group(1).strip()
        start_pos = match.end()
        end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(latex_code)
        sections[section_name] = latex_code[start_pos:end_pos].strip()
        
    return sections

async def parse_latex(latex_code: str, original_filename: str = "resume.tex") -> Dict[str, Any]:
    """
    Parses a LaTeX resume directly. Detects sections using regex block parsing and
    uses gemini-flash-lite-latest to clean and structure the data.
    """
    if not latex_code.strip():
        raise ValidationError("LaTeX code is empty.")
        
    # Extract blocks to verify it has structure
    blocks = parse_latex_blocks(latex_code)
    
    # We can also pass the full LaTeX code and the detected blocks to Gemini for high-fidelity extraction
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    system_instruction = """
    You are an expert resume parsing assistant specialized in LaTeX. Parse the provided LaTeX resume and extract the structured sections precisely.
    
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
      "parse_confidence_score": "Score according to your confidence"
    }
    
    Rules:
    - Extract contact info, education, and achievements from the LaTeX blocks.
    - Separate skills into the correct categories: frontend, backend, devops, databases.
    - Set 'has_summary' to true if a summary/objective section exists.
    - Calculate a 'parse_confidence_score' between 0.9 and 1.0 (since LaTeX structure is very clean, default should be high e.g. 0.98).
    """

    # Format blocks for context
    blocks_str = "\n".join([f"Section: {k}\nContent:\n{v}" for k, v in blocks.items()])
    prompt = f"Here is the raw LaTeX code:\n\n{latex_code}\n\nDetected LaTeX Section Blocks:\n{blocks_str}"

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.05,
            )
        )
        parsed_data = json.loads(response.text)
    except Exception as e:
        raise ValidationError(f"Gemini output parsing failed for LaTeX: {e}")

    # Map flat skills to database structures with metadata
    raw_skills = parsed_data.get("skills", {})
    mapped_skills = {}
    for category in ["frontend", "backend", "devops", "databases"]:
        skills_list = raw_skills.get(category, [])
        mapped_skills[category] = [
            {
                "name": skill,
                "domain_category": category,
                "origin_source": "user_pdf"  # Stored as user_pdf metadata for skills as per schema rules
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
        "parse_confidence_score": float(parsed_data.get("parse_confidence_score", 0.98)),
        "source_origin": "latex_code",
        "original_filename": original_filename
    }
