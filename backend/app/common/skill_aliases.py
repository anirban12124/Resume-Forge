from typing import Dict

SKILL_ALIASES: Dict[str, str] = {
    "react.js": "React",
    "reactjs": "React",
    "react js": "React",
    "react": "React",
    "vue.js": "Vue.js",
    "vuejs": "Vue.js",
    "vue js": "Vue.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "node js": "Node.js",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "next js": "Next.js",
    "nuxt.js": "Nuxt.js",
    "nuxtjs": "Nuxt.js",
    "nuxt js": "Nuxt.js",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mongodb": "MongoDB",
    "mongo": "MongoDB",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "golang": "Go",
    "go lang": "Go",
    "python": "Python",
    "py": "Python",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "GCP",
    "google cloud platform": "GCP",
    "html5": "HTML",
    "html": "HTML",
    "css3": "CSS",
    "css": "CSS",
}

def normalize_skill(skill_name: str) -> str:
    """
    Normalizes a skill name using standard mappings for ATS compatibility.
    """
    cleaned = skill_name.strip().lower()
    return SKILL_ALIASES.get(cleaned, skill_name.strip())
