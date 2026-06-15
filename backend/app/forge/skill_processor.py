from typing import Dict, List, Any
from app.common.skill_aliases import normalize_skill

def process_vault_skills(
    vault_skills_data: Dict[str, List[Dict[str, Any]]],
    jd_text: str,
    jd_skills: List[str]
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Step 4: Intersects vault skills with parsed JD skills using aliases for normalization.
    Reorders skills per category: matching skills first, sorted by frequency of mention in the JD.
    Retains all original skills (never removing user_pdf or manual ones), just shifts them down if non-matching.
    """
    # 1. Normalize and lowercase JD skills for lookup
    normalized_jd_skills = {normalize_skill(skill).lower() for skill in jd_skills}
    jd_text_lower = jd_text.lower()
    
    reordered_skills = {}
    
    # 2. Iterate through each category (frontend, backend, devops, databases)
    for category, skill_list in vault_skills_data.items():
        if not isinstance(skill_list, list):
            reordered_skills[category] = []
            continue
            
        scored_skills = []
        for skill in skill_list:
            name = skill.get("name", "")
            origin = skill.get("origin_source", "manual")
            
            # Normalize skill name
            canonical_name = normalize_skill(name)
            
            # Check if this skill exists in the JD's normalized hard skills
            is_match = 1 if canonical_name.lower() in normalized_jd_skills else 0
            
            # Count frequency of occurrences in the raw JD text
            frequency = 0
            if is_match:
                # Count canonical name and original name occurrences
                freq_canonical = jd_text_lower.count(canonical_name.lower())
                freq_original = jd_text_lower.count(name.lower())
                frequency = max(freq_canonical, freq_original, 1) # Default to at least 1 since it matched
                
            scored_skills.append({
                "skill": skill,
                "is_match": is_match,
                "frequency": frequency,
                "is_user_pdf": 1 if origin == "user_pdf" else 0
            })
            
        # 3. Sort:
        # 1st key: is_match (DESC - 1 first, then 0)
        # 2nd key: frequency (DESC - higher counts first)
        # Python sort is stable, keeping original relative order for ties (like non-matches)
        scored_skills.sort(
            key=lambda x: (x["is_match"], x["frequency"]),
            reverse=True
        )
        
        # 4. Extract back the ordered skill dictionaries
        reordered_skills[category] = [item["skill"] for item in scored_skills]
        
    return reordered_skills
