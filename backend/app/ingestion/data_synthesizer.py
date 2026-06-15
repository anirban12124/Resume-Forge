import json
import base64
from typing import Optional, Dict, Any
from google import genai
from google.genai import types
import asyncpg
from app.config import settings
from app.common.token_tracker import log_api_usage
from app.common.exceptions import ValidationError

# Helper to decode base64 file content from GitHub if present
def decode_github_file(content_b64: Optional[str]) -> str:
    if not content_b64:
        return ""
    try:
        # Strip whitespace/newlines
        cleaned = re.sub(r'\s+', '', content_b64)
        return base64.b64decode(cleaned).decode("utf-8", errors="ignore")
    except Exception:
        return ""

async def synthesize_project_data(
    conn: asyncpg.Connection,
    user_id: Optional[str],
    name: str,
    description: str,
    github_url: str,
    live_url: Optional[str],
    github_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Synthesizes project form data and GitHub metadata using Gemini 2.0 Flash.
    Logs token usage.
    """
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    # Extract details for prompt
    readme_text = ""
    manifest_text = ""
    languages_str = ""
    repo_structure = ""
    stars = 0
    repo_id = None
    primary_lang = None

    if github_data:
        metadata = github_data.get("metadata", {})
        repo_id = metadata.get("id")
        stars = metadata.get("stargazers_count", 0)
        primary_lang = metadata.get("language")
        
        # Format languages
        langs = github_data.get("languages", {})
        languages_str = ", ".join([f"{k} ({v} bytes)" for k, v in langs.items()])
        
        # Format structure
        structure_items = github_data.get("root_contents", [])
        repo_structure = ", ".join([item.get("name", "") for item in structure_items if item.get("name")])
        
        # Decode manifest
        manifest = github_data.get("manifest")
        if manifest and manifest.get("content"):
            try:
                # Decoded raw content if it's base64 encoded
                b64_content = manifest.get("content", "")
                # GitHub base64 can contain newlines
                decoded = base64.b64decode(b64_content.replace("\n", "")).decode("utf-8", errors="ignore")
                # Truncate manifest text if too long
                manifest_text = decoded[:1500]
            except Exception:
                pass
                
        # Decode readme
        readme = github_data.get("readme")
        if readme and readme.get("content"):
            try:
                b64_content = readme.get("content", "")
                decoded = base64.b64decode(b64_content.replace("\n", "")).decode("utf-8", errors="ignore")
                # Truncate README text if too long to save tokens
                readme_text = decoded[:2500]
            except Exception:
                pass

    system_instruction = """
    You are an expert technical resume data synthesizer. Combine the user's form description and GitHub repository metadata (files, manifest, README, language bytes) into structured project details.
    
    Return a JSON object with this EXACT structure:
    {
      "tech_tags": ["languages, frameworks, databases, and libraries used. Include versions if mentioned."],
      "architecture_flags": ["Architectural styles detected, e.g., MVC, REST, Microservices, SPA, Monolith, Serverless, Event-Driven, Jamstack, etc."],
      "github_metadata": {
        "repo_id": number or null,
        "stars": number,
        "primary_language": "string or null"
      },
      "flattened_summary": "A detailed, dense single-paragraph summary of the project combining its core purpose, features, architecture, and technology stack. Do NOT fabricate metrics. Make it professional and search-optimized."
    }
    """

    prompt = f"""
    Form Details:
    Project Name: {name}
    Form Description: {description}
    GitHub URL: {github_url}
    Live URL: {live_url or 'None'}
    
    GitHub Repository Metadata:
    Stars: {stars}
    Primary Language: {primary_lang}
    Languages Breakdown: {languages_str}
    Root Directory Files: {repo_structure}
    Manifest ({github_data.get('manifest', {}).get('name') if github_data and github_data.get('manifest') else 'None'}):
    {manifest_text or 'None'}
    
    README Snippet:
    {readme_text or 'None'}
    """

    response = client.models.generate_content(
        model="gemini-lite-latest",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.1
        )
    )

    # Log token usage
    usage = response.usage_metadata
    if usage:
        await log_api_usage(
            conn=conn,
            user_id=user_id,
            model_name="gemini-lite-latest",
            prompt_tokens=usage.prompt_token_count,
            completion_tokens=usage.candidates_token_count,
            endpoint="synthesize_project_data"
        )

    try:
        parsed = json.loads(response.text)
    except Exception as e:
        raise ValidationError(f"Failed to parse data synthesis result: {e}")

    # Ensure github_metadata matches actual values if missing
    gm = parsed.setdefault("github_metadata", {})
    if repo_id:
        gm["repo_id"] = repo_id
    gm["stars"] = stars
    if primary_lang:
        gm["primary_language"] = primary_lang

    return parsed
