import os
from typing import Dict, List, Any, Optional
from datetime import datetime

def escape_latex(text: str) -> str:
    """
    Escapes all LaTeX special characters (&, %, $, #, _, {, }) in plain text
    using a clean character-by-character translation map to prevent double-escaping.
    """
    if not text:
        return ""
        
    special_chars = {
        "&": "\\&",
        "%": "\\%",
        "$": "\\$",
        "#": "\\#",
        "_": "\\_",
        "{": "\\{",
        "}": "\\}"
    }
    
    res = []
    for char in text:
        res.append(special_chars.get(char, char))
    return "".join(res)

def format_date_str(date_val: Any) -> str:
    """
    Converts YYYY-MM-DD or standard date string to a human readable format like 'June 2024'.
    If parsing fails, returns the original value.
    """
    if not date_val:
        return "Present"
        
    if isinstance(date_val, str):
        if date_val.lower() == "present" or date_val.lower() == "ongoing":
            return "Present"
        try:
            # Try parsing YYYY-MM-DD
            dt = datetime.strptime(date_val[:10], "%Y-%m-%d")
            return dt.strftime("%b. %Y")
        except ValueError:
            try:
                # Try parsing YYYY-MM
                dt = datetime.strptime(date_val[:7], "%Y-%m")
                return dt.strftime("%b. %Y")
            except ValueError:
                return date_val
    elif hasattr(date_val, "strftime"):
        return date_val.strftime("%b. %Y")
        
    return str(date_val)

def assemble_heading(contact: Dict[str, Any]) -> str:
    """
    Formats the heading contact block based on available fields.
    """
    full_name = escape_latex(contact.get("full_name", "Jake Ryan"))
    
    parts = []
    if contact.get("phone"):
        parts.append(escape_latex(contact["phone"]))
    if contact.get("email"):
        parts.append(f"\\href{{mailto:{contact['email']}}}{{\\underline{{{escape_latex(contact['email'])}}}}}")
    if contact.get("linkedin"):
        url = contact["linkedin"]
        # Display username cleanly
        username = url.split("linkedin.com/in/")[-1].strip("/")
        parts.append(f"\\href{{{url}}}{{\\underline{{linkedin.com/in/{escape_latex(username)}}}}}")
    if contact.get("github"):
        url = contact["github"]
        # Display username cleanly
        username = url.split("github.com/")[-1].strip("/")
        parts.append(f"\\href{{{url}}}{{\\underline{{github.com/{escape_latex(username)}}}}}")
    if contact.get("portfolio"):
        url = contact["portfolio"]
        host = url.replace("https://", "").replace("http://", "").rstrip("/")
        parts.append(f"\\href{{{url}}}{{\\underline{{{escape_latex(host)}}}}}")
        
    heading_tex = f"""\\begin{{center}}
    \\textbf{{\\Huge \\scshape {full_name}}} \\\\ \\vspace{{2pt}}
    \\small {" $|$ ".join(parts)}
\\end{{center}}"""
    return heading_tex

def assemble_education(education_list: List[Dict[str, Any]]) -> str:
    """
    Formats the education entries using \\resumeSubheading.
    """
    if not education_list:
        return ""
        
    tex_lines = ["\\section{Education}", "  \\resumeSubHeadingListStart"]
    for edu in education_list:
        school = escape_latex(edu.get("school", ""))
        location = escape_latex(edu.get("location", ""))
        degree = escape_latex(edu.get("degree", ""))
        major = escape_latex(edu.get("major", ""))
        gpa = escape_latex(str(edu.get("gpa") or ""))
        start_date = format_date_str(edu.get("start_date"))
        end_date = format_date_str(edu.get("end_date"))
        
        deg_major_parts = []
        if degree:
            deg_major_parts.append(degree)
        if major:
            deg_major_parts.append(major)
        deg_major = " in ".join(deg_major_parts) if deg_major_parts else "Student"
        
        if gpa:
            deg_major += f"; GPA: {gpa}"
            
        dates = f"{start_date} -- {end_date}" if (start_date or end_date) else ""
        
        tex_lines.append(f"    \\resumeSubheading")
        tex_lines.append(f"      {{{school}}}{{{location}}}")
        tex_lines.append(f"      {{{deg_major}}}{{{dates}}}")
        
    tex_lines.append("  \\resumeSubHeadingListEnd")
    return "\n".join(tex_lines)

def assemble_internships(internship_list: List[Dict[str, Any]]) -> str:
    """
    Formats internships experiences using \\resumeSubheading and \\resumeItem.
    """
    if not internship_list:
        return ""
        
    tex_lines = ["\\section{Experience}", "  \\resumeSubHeadingListStart"]
    for intern in internship_list:
        role = escape_latex(intern.get("role", ""))
        company = escape_latex(intern.get("company_name", ""))
        start_date = format_date_str(intern.get("start_date"))
        end_date = format_date_str(intern.get("end_date"))
        bullets = intern.get("description_bullets") or []
        
        location = "" # Default empty since not in internship schema
        dates = f"{start_date} -- {end_date}"
        
        tex_lines.append(f"    \\resumeSubheading")
        tex_lines.append(f"      {{{role}}}{{{dates}}}")
        tex_lines.append(f"      {{{company}}}{{{location}}}")
        tex_lines.append(f"      \\resumeItemListStart")
        for bullet in bullets:
            escaped_bullet = escape_latex(bullet)
            tex_lines.append(f"        \\resumeItem{{{escaped_bullet}}}")
        tex_lines.append(f"      \\resumeItemListEnd")
        
    tex_lines.append("  \\resumeSubHeadingListEnd")
    return "\n".join(tex_lines)

def assemble_projects(projects_list: List[Dict[str, Any]], bullets_map: Dict[str, List[str]]) -> str:
    """
    Formats projects using \\resumeProjectHeading and \\resumeItem.
    """
    if not projects_list:
        return ""
        
    tex_lines = ["\\section{Projects}", "  \\resumeSubHeadingListStart"]
    for proj in projects_list:
        proj_id = str(proj.get("id", ""))
        name = escape_latex(proj.get("name", ""))
        
        # Tech stack from structured_data
        struct_data = proj.get("structured_data") or {}
        tech_tags = struct_data.get("tech_tags") or []
        tech_str = escape_latex(", ".join(tech_tags))
        
        # Links
        github_url = proj.get("github_url") or ""
        live_url = proj.get("live_url") or ""
        
        links_parts = []
        if github_url:
            links_parts.append(f"\\href{{{github_url}}}{{\\underline{{GitHub}}}}")
        if live_url:
            links_parts.append(f"\\href{{{live_url}}}{{\\underline{{Live}}}}")
            
        links_tex = " $|$ ".join(links_parts)
        
        heading_left = f"\\textbf{{{name}}}"
        if tech_str:
            heading_left += f" $|$ \\emph{{{tech_str}}}"
            
        # Prioritize the LLM tailored bullets
        bullets = bullets_map.get(proj_id)
        if not bullets:
            # Fallback to structured_data flattened_summary or raw description
            bullets = struct_data.get("bullet_points") or [proj.get("description", "")]
            
        tex_lines.append(f"      \\resumeProjectHeading")
        tex_lines.append(f"          {{{heading_left}}}{{{links_tex}}}")
        tex_lines.append(f"          \\resumeItemListStart")
        for bullet in bullets:
            escaped_bullet = escape_latex(bullet)
            tex_lines.append(f"            \\resumeItem{{{escaped_bullet}}}")
        tex_lines.append(f"          \\resumeItemListEnd")
        
    tex_lines.append("  \\resumeSubHeadingListEnd")
    return "\n".join(tex_lines)

def assemble_skills(skills_data: Dict[str, List[Dict[str, Any]]]) -> str:
    """
    Formats the skills tag section grouped by frontend, backend, devops, databases.
    """
    category_labels = {
        "frontend": "Frontend Development",
        "backend": "Backend & Languages",
        "devops": "Developer Tools & Cloud",
        "databases": "Databases & Storage"
    }
    
    tex_lines = [
        "\\section{Technical Skills}",
        " \\begin{itemize}[leftmargin=0.15in, label={}]",
        "    \\small{\\item{"
    ]
    
    item_lines = []
    for cat_key in ["frontend", "backend", "devops", "databases"]:
        skills = skills_data.get(cat_key) or []
        if not skills:
            continue
        skill_names = [escape_latex(s.get("name", "")) for s in skills]
        skill_str = ", ".join(skill_names)
        label = category_labels.get(cat_key, cat_key.capitalize())
        item_lines.append(f"     \\textbf{{{label}}}{{: {skill_str}}}")
        
    tex_lines.append(" \\\\\n".join(item_lines))
    tex_lines.append("    }}")
    tex_lines.append(" \\end{itemize}")
    return "\n".join(tex_lines)

def assemble_achievements(achievements: List[str]) -> str:
    """
    Formats achievements as a list of visual items.
    """
    if not achievements:
        return ""
        
    tex_lines = ["\\section{Achievements}", " \\begin{itemize}[leftmargin=0.15in]"]
    for ach in achievements:
        escaped = escape_latex(ach)
        if ":" in escaped:
            parts = escaped.split(":", 1)
            tex_lines.append(f"    \\resumeItem{{\\textbf{{{parts[0].strip()}:}} {parts[1].strip()}}}")
        else:
            tex_lines.append(f"    \\resumeItem{{{escaped}}}")
            
    tex_lines.append(" \\end{itemize}")
    return "\n".join(tex_lines)

def assemble_summary(summary_text: Optional[str]) -> str:
    """
    Formats the professional summary block.
    """
    if not summary_text:
        return ""
        
    escaped_summary = escape_latex(summary_text)
    return f"""\\section{{Professional Summary}}
  \\small{{{escaped_summary}}}
  \\vspace{{-5pt}}"""

def generate_latex_resume(
    template_path: str,
    constants: Dict[str, Any],
    skills: Dict[str, List[Dict[str, Any]]],
    projects: List[Dict[str, Any]],
    internships: List[Dict[str, Any]],
    summary: Optional[str],
    bullets_map: Dict[str, List[str]]
) -> str:
    """
    Loads raw LaTeX template and replaces segments dynamically to build
    the finished .tex output.
    """
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"LaTeX template not found at: {template_path}")
        
    with open(template_path, "r", encoding="utf-8") as f:
        template_content = f.read()

    # Generate custom compiled blocks
    contact_info = constants.get("contact_info", {})
    heading_tex = assemble_heading(contact_info)
    
    education_tex = assemble_education(constants.get("education", []))
    summary_tex = assemble_summary(summary)
    experience_tex = assemble_internships(internships)
    projects_tex = assemble_projects(projects, bullets_map)
    skills_tex = assemble_skills(skills)
    achievements_tex = assemble_achievements(constants.get("achievements", []))

    # We will assemble the resume sections in order inside the document body.
    # The original document content from \begin{document} to \end{document} in the template
    # will be replaced with our custom compiled sections.
    
    # Let's find everything from \documentclass to \begin{document}
    doc_start_idx = template_content.find("\\begin{document}")
    if doc_start_idx == -1:
        raise ValueError("Invalid LaTeX template. Could not locate \\begin{document}.")
        
    preamble = template_content[:doc_start_idx]
    
    # Build the document body
    body_parts = ["\\begin{document}"]
    
    if heading_tex:
        body_parts.append(heading_tex)
        body_parts.append("")
        
    if summary_tex:
        body_parts.append(summary_tex)
        body_parts.append("")
        
    if education_tex:
        body_parts.append(education_tex)
        body_parts.append("")
        
    if experience_tex:
        body_parts.append(experience_tex)
        body_parts.append("")
        
    if projects_tex:
        body_parts.append(projects_tex)
        body_parts.append("")
        
    if skills_tex:
        body_parts.append(skills_tex)
        body_parts.append("")
        
    if achievements_tex:
        body_parts.append(achievements_tex)
        body_parts.append("")
        
    body_parts.append("\\end{document}")
    
    full_tex = preamble + "\n".join(body_parts)
    return full_tex
