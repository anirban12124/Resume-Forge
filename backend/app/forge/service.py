import os
import json
import uuid
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID

import app.database as database
from app.redis import redis_client
from app.s3 import upload_file, generate_presigned_url
from app.forge.jd_parser import parse_and_embed_jd
from app.forge.project_selector import select_relevant_projects
from app.forge.internship_selector import select_relevant_internships
from app.forge.skill_processor import process_vault_skills
from app.forge.content_generator import generate_tailored_content
from app.forge.latex_assembler import generate_latex_resume
from app.forge.compiler import compile_latex, TectonicError

async def update_task_status(
    task_id: str,
    status: str,
    error_message: Optional[str] = None,
    result: Optional[dict] = None
) -> None:
    """
    Serializes and stores task status inside Redis with a 24-hour expiration.
    Preserves the user_id if it already exists in the cache.
    """
    user_id = None
    try:
        existing = await redis_client.get(f"forge_task:{task_id}")
        if existing:
            existing_data = json.loads(existing)
            user_id = existing_data.get("user_id")
    except Exception:
        pass

    data = {
        "task_id": task_id,
        "status": status,
        "error_message": error_message,
        "result": result,
        "user_id": user_id
    }
    await redis_client.set(f"forge_task:{task_id}", json.dumps(data), ex=86400)

def get_dummy_pdf() -> bytes:
    """
    Generates a tiny valid 1-page PDF indicating compilation bypass.
    """
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
        b"4 0 obj\n<< /Length 72 >>\nstream\n"
        b"BT\n/F1 12 Tf\n50 700 Td\n(Tectonic is not installed locally. PDF compilation was bypassed.) Tj\nET\n"
        b"endstream\nendobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000212 00000 n \n"
        b"trailer\n<< /Size 5 /Root 1 0 R >>\n"
        b"startxref\n333\n%%EOF\n"
    )

async def run_forge_pipeline(
    task_id: str,
    user_id: UUID,
    vault_id: UUID,
    project_count: int,
    internship_count: int,
    jd_text: str
) -> None:
    """
    Background worker function orchestrating the complete Resume Forge pipeline.
    Runs with a 120-second timeout.
    """
    try:
        await update_task_status(task_id, "parsing_jd")
        
        # Enforce 120s timeout limit on the entire pipeline execution
        await asyncio.wait_for(
            _execute_pipeline(task_id, user_id, vault_id, project_count, internship_count, jd_text),
            timeout=120.0
        )
    except asyncio.TimeoutError:
        print(f"Pipeline run {task_id} timed out after 120 seconds.")
        await update_task_status(
            task_id,
            "failed",
            error_message="Pipeline execution exceeded the 120-second limit."
        )
    except Exception as e:
        print(f"Pipeline run {task_id} encountered an error: {e}")
        await update_task_status(
            task_id,
            "failed",
            error_message=f"Pipeline error: {str(e)}"
        )

async def _execute_pipeline(
    task_id: str,
    user_id: UUID,
    vault_id: UUID,
    project_count: int,
    internship_count: int,
    jd_text: str
) -> None:
    """
    Core executor running the stages sequentially.
    """
    if database.pool is None:
        raise RuntimeError("Database connection pool is not initialized.")

    async with database.pool.acquire() as conn:
        # --- STAGE 1: JD Parsing & Embedding ---
        try:
            hard_skills, semantic_paragraph, role_domain, embedding_vector, jd_hash, metadata = \
                await parse_and_embed_jd(conn, str(user_id), jd_text)
        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Stage 'parsing_jd' failed: {str(e)}")
            return

        # Fetch vault information
        try:
            vault_row = await conn.fetchrow(
                "SELECT skills_data, constants_data, has_summary FROM vaults WHERE id = $1 AND user_id = $2",
                vault_id, user_id
            )
            if not vault_row:
                await update_task_status(task_id, "failed", error_message="Selected Vault does not exist or access is denied.")
                return
            
            # De-serialize JSON fields from DB
            skills_data = vault_row["skills_data"]
            if isinstance(skills_data, str):
                skills_data = json.loads(skills_data)
                
            constants_data = vault_row["constants_data"]
            if isinstance(constants_data, str):
                constants_data = json.loads(constants_data)
                
            has_summary = vault_row["has_summary"]
        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Failed to read vault details: {str(e)}")
            return

        # --- STAGE 2: Project Selection ---
        await update_task_status(task_id, "selecting_projects")
        try:
            selected_projects, warning_msg = await select_relevant_projects(
                conn, vault_id, embedding_vector, project_count
            )
        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Stage 'selecting_projects' failed: {str(e)}")
            return

        # --- STAGE 3: Internship Selection ---
        try:
            selected_internships = await select_relevant_internships(
                conn, vault_id, hard_skills, role_domain, internship_count
            )
        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Stage 'selecting_internships' failed: {str(e)}")
            return

        # --- STAGE 4: Skills Processing ---
        try:
            reordered_skills = process_vault_skills(skills_data, jd_text, hard_skills)
        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Stage 'processing_skills' failed: {str(e)}")
            return

        # --- STAGE 5: Content Generation (Gemini 3.5 Flash) ---
        await update_task_status(task_id, "generating_content")
        try:
            summary_text, bullets_map = await generate_tailored_content(
                conn, str(user_id), jd_text, selected_projects, has_summary
            )
        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Stage 'generating_content' failed: {str(e)}")
            return

        # --- STAGE 6: LaTeX Assembly ---
        try:
            template_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "templates",
                "resume_template.tex"
            )
            tex_content = generate_latex_resume(
                template_path=template_path,
                constants=constants_data,
                skills=reordered_skills,
                projects=selected_projects,
                internships=selected_internships,
                summary=summary_text,
                bullets_map=bullets_map
            )
        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Stage 'assembling_latex' failed: {str(e)}")
            return

        # --- STAGE 7: Compilation ---
        await update_task_status(task_id, "compiling_latex")
        try:
            pdf_bytes = compile_latex(tex_content)
            fallback_used = False
            if pdf_bytes is None:
                # Tectonic not available, proceed with fallback dummy PDF
                pdf_bytes = get_dummy_pdf()
                fallback_used = True
        except TectonicError as te:
            # Mark compilation failure with detailed logs
            err_msg = f"Stage 'compiling_latex' failed: {str(te)}\n{te.log}"
            await update_task_status(task_id, "failed", error_message=err_msg)
            return
        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Stage 'compiling_latex' failed: {str(e)}")
            return

        # --- STAGE 8: Upload & Archive ---
        await update_task_status(task_id, "uploading")
        try:
            resume_id = uuid.uuid4()
            pdf_s3_key = f"resumes/{user_id}/{resume_id}/resume.pdf"
            tex_s3_key = f"resumes/{user_id}/{resume_id}/resume.tex"

            # Upload files asynchronously
            await upload_file(pdf_bytes, pdf_s3_key)
            await upload_file(tex_content.encode("utf-8"), tex_s3_key)

            # Assemble title
            company = metadata.get("company")
            role_title = metadata.get("role_title")
            if role_title and company:
                title = f"{role_title} - {company}"
            elif role_title:
                title = role_title
            elif company:
                title = f"Resume - {company}"
            else:
                title = f"Tailored Resume - {datetime.utcnow().strftime('%Y-%m-%d')}"

            # Save configuration options used in this run
            forge_config = {
                "hard_skills": hard_skills,
                "semantic_paragraph": semantic_paragraph,
                "role_domain": role_domain,
                "company": company,
                "role_title": role_title,
                "project_count": project_count,
                "internship_count": internship_count,
                "warning_message": warning_msg,
                "pdf_fallback_used": fallback_used
            }

            # Write record to the DB
            archive_query = """
                INSERT INTO resume_archive (
                    id, user_id, vault_id, title, pdf_s3_key, tex_s3_key, jd_hash, jd_text, forge_config, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            """
            await conn.execute(
                archive_query,
                resume_id,
                user_id,
                vault_id,
                title,
                pdf_s3_key,
                tex_s3_key,
                jd_hash,
                jd_text,
                json.dumps(forge_config)
            )

            # Generate S3 presigned URL for downloading the PDF
            pdf_url = await generate_presigned_url(pdf_s3_key)

            # Completed! Save the finished outputs to the task status object in Redis
            result_data = {
                "pdf_url": pdf_url,
                "tex_content": tex_content,
                "archive_id": str(resume_id)
            }
            await update_task_status(task_id, "completed", result=result_data)

        except Exception as e:
            await update_task_status(task_id, "failed", error_message=f"Stage 'uploading_archive' failed: {str(e)}")
            return
