import json
import asyncio
from typing import List, Dict, Any, Tuple, Optional
from google import genai
from google.genai import types
import asyncpg
from app.config import settings
from app.common.token_tracker import log_api_usage, check_token_budget
from app.common.exceptions import ValidationError

async def call_gemini_with_retry(
    client: genai.Client,
    model: str,
    contents: str,
    config: types.GenerateContentConfig,
    max_retries: int = 3
) -> Any:
    """
    Helper function to call Gemini API and retry up to 3 times with exponential backoff (1s -> 2s -> 4s).
    """
    backoff = 1.0
    for attempt in range(max_retries + 1):
        try:
            # Generate content synchronously but wrapped for threading or simple execution
            # In python, client.models.generate_content is blocking, so we execute it
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
            return response
        except Exception as e:
            if attempt == max_retries:
                raise e
            print(f"Gemini API call failed (attempt {attempt + 1}/{max_retries + 1}): {e}. Retrying in {backoff}s...")
            await asyncio.sleep(backoff)
            backoff *= 2.0

async def generate_tailored_content(
    conn: asyncpg.Connection,
    user_id: str,
    jd_text: str,
    selected_projects: List[Dict[str, Any]],
    has_summary: bool
) -> Tuple[Optional[str], Dict[str, List[str]]]:
    """
    Step 5: Calls gemini-3.5-flash to rewrite project descriptions as tailored bullet points
    and generate a professional summary (if has_summary is True) matching the job description.
    Returns (summary_text, projects_bullets_map).
    """
    if not selected_projects and not has_summary:
        return None, {}

    await check_token_budget(conn)
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    # 1. Format the projects context for the prompt
    projects_input = []
    for proj in selected_projects:
        struct_data = proj.get("structured_data") or {}
        summary_txt = struct_data.get("flattened_summary") or proj.get("description", "")
        tech_tags = struct_data.get("tech_tags") or []
        
        projects_input.append({
            "id": str(proj["id"]),
            "name": proj["name"],
            "original_summary": summary_txt,
            "technologies": tech_tags
        })

    # 2. Setup system instructions
    system_instruction = """
    You are an expert ATS-focused resume editor. Review the job description (JD) and the user's projects.
    Your task is to:
    1. For each project, write exactly 3-4 bullet points highlighting responsibilities, technical tasks, and accomplishments tailored specifically to the JD context.
       CRITICAL RULE: Do NOT fabricate or make up any metrics, percentages, dollar amounts, or statistics (e.g. do NOT say "increased efficiency by 40%"). Write strong, action-oriented, and qualitative technical sentences.
    2. If has_summary is true, generate a 2-3 sentence Professional Summary tailored to the JD, incorporating key strengths from the user's background. If has_summary is false, set the summary to null.
    
    Return a JSON object with this EXACT structure:
    {
      "summary": "Tailored professional summary or null",
      "projects": [
        {
          "id": "project-uuid-string",
          "bullet_points": [
            "Tailored bullet point 1 starting with strong action verb.",
            "Tailored bullet point 2 focusing on relevant technologies.",
            "Tailored bullet point 3 focusing on engineering contribution."
          ]
        }
      ]
    }
    """

    prompt = f"""
    Job Description:
    {jd_text}
    
    Has Summary: {has_summary}
    
    User Projects:
    {json.dumps(projects_input, indent=2)}
    """

    # 3. Invoke LLM with retry handler
    response = await call_gemini_with_retry(
        client=client,
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.2
        )
    )

    # 4. Log token usage
    usage = response.usage_metadata
    if usage:
        await log_api_usage(
            conn=conn,
            user_id=user_id,
            model_name="gemini-3.5-flash",
            prompt_tokens=usage.prompt_token_count,
            completion_tokens=usage.candidates_token_count,
            endpoint="content_generator:tailor_resume"
        )

    # 5. Parse output
    try:
        parsed = json.loads(response.text)
        summary = parsed.get("summary")
        
        bullets_map = {}
        for p in parsed.get("projects", []):
            proj_id = p.get("id")
            bullets = p.get("bullet_points", [])
            if proj_id:
                bullets_map[proj_id] = bullets
                
        return summary, bullets_map
    except Exception as e:
        raise ValidationError(f"Failed to parse generation output: {e}")
