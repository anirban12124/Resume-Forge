import re
import httpx
from typing import Tuple, Optional, Dict, Any
from app.common.exceptions import ResumeForgeException

class InvalidGitHubToken(ResumeForgeException):
    """Raised when GitHub API returns 401 Unauthorized."""
    pass

def parse_github_url(url: str) -> Optional[Tuple[str, str]]:
    """
    Parses a GitHub repository URL to extract (owner, repo).
    Supports:
      - https://github.com/owner/repo
      - git@github.com:owner/repo.git
    """
    if not url:
        return None
    # Match github.com/owner/repo
    match = re.search(r'github\.com/([^/]+)/([^/]+)', url)
    if match:
        owner = match.group(1)
        repo = match.group(2)
        if repo.endswith('.git'):
            repo = repo[:-4]
        repo = repo.rstrip('/')
        return owner, repo
    return None

async def fetch_github_repo_data(
    github_url: str,
    decrypted_token: Optional[str]
) -> Optional[Dict[str, Any]]:
    """
    Fetches exactly up to 5 API calls for a given repository.
    Returns a dict with all fetched contents or None if skipped/failed.
    Raises InvalidGitHubToken if token is invalid (401).
    """
    if not decrypted_token:
        # User is not authenticated with GitHub
        return None

    parsed = parse_github_url(github_url)
    if not parsed:
        return None

    owner, repo = parsed
    base_url = "https://api.github.com"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {decrypted_token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ResumeForge-Backend"
    }

    async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
        # Call 1: Get metadata (stars, language, description)
        metadata_url = f"{base_url}/repos/{owner}/{repo}"
        try:
            r = await client.get(metadata_url)
            if r.status_code == 401:
                raise InvalidGitHubToken("GitHub token is invalid or expired.")
            if r.status_code != 200:
                # Repo might be private or not found; skip fetching
                return None
            metadata = r.json()
        except httpx.HTTPError:
            return None

        # Call 2: Get language breakdown
        languages = {}
        languages_url = f"{base_url}/repos/{owner}/{repo}/languages"
        try:
            r = await client.get(languages_url)
            if r.status_code == 200:
                languages = r.json()
        except httpx.HTTPError:
            pass

        # Call 3: Get root directory contents
        contents = []
        contents_url = f"{base_url}/repos/{owner}/{repo}/contents/"
        try:
            r = await client.get(contents_url)
            if r.status_code == 200:
                contents = r.json()
        except httpx.HTTPError:
            pass

        # Call 4: Get manifest (package.json, requirements.txt, or go.mod)
        manifest_content = None
        manifest_name = None
        if isinstance(contents, list):
            names = [item.get("name") for item in contents if isinstance(item, dict)]
            if "package.json" in names:
                manifest_name = "package.json"
            elif "requirements.txt" in names:
                manifest_name = "requirements.txt"
            elif "go.mod" in names:
                manifest_name = "go.mod"

        if manifest_name:
            manifest_url = f"{base_url}/repos/{owner}/{repo}/contents/{manifest_name}"
            try:
                r = await client.get(manifest_url)
                if r.status_code == 200:
                    manifest_content = r.json()
            except httpx.HTTPError:
                pass

        # Call 5: Get README content
        readme_content = None
        readme_url = f"{base_url}/repos/{owner}/{repo}/readme"
        try:
            r = await client.get(readme_url)
            if r.status_code == 200:
                readme_content = r.json()
        except httpx.HTTPError:
            pass

        # Return synthesized dict
        return {
            "metadata": {
                "id": metadata.get("id"),
                "name": metadata.get("name"),
                "description": metadata.get("description"),
                "stargazers_count": metadata.get("stargazers_count"),
                "language": metadata.get("language"),
                "html_url": metadata.get("html_url"),
                "default_branch": metadata.get("default_branch"),
                "pushed_at": metadata.get("pushed_at"),
                "size": metadata.get("size")
            },
            "languages": languages,
            "root_contents": [
                {"name": item.get("name"), "type": item.get("type"), "sha": item.get("sha")}
                for item in contents if isinstance(item, dict)
            ] if isinstance(contents, list) else [],
            "manifest": {
                "name": manifest_name,
                "sha": manifest_content.get("sha") if manifest_content else None,
                "content": manifest_content.get("content") if manifest_content else None
            } if manifest_content else None,
            "readme": {
                "sha": readme_content.get("sha") if readme_content else None,
                "content": readme_content.get("content") if readme_content else None
            } if readme_content else None
        }
