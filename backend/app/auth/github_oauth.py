import urllib.parse
import httpx
from app.config import settings
from app.common.exceptions import ValidationError

def get_github_auth_url() -> str:
    """
    Generates the GitHub authorization URL to redirect users to.
    """
    redirect_uri = f"{settings.BACKEND_URL.rstrip('/')}/auth/github/callback"
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "repo read:user user:email",
    }
    encoded_params = urllib.parse.urlencode(params)
    return f"https://github.com/login/oauth/authorize?{encoded_params}"

async def get_github_access_token(code: str) -> str:
    """
    Exchanges the authorization code for a GitHub access token.
    Uses non-expiring tokens.
    """
    redirect_uri = f"{settings.BACKEND_URL.rstrip('/')}/auth/github/callback"
    url = "https://github.com/login/oauth/access_token"
    headers = {
        "Accept": "application/json"
    }
    data = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": redirect_uri
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=data, timeout=10.0)
            response.raise_for_status()
            res_json = response.json()
            
            if "error" in res_json:
                raise ValidationError(f"GitHub OAuth error: {res_json.get('error_description', res_json['error'])}")
                
            access_token = res_json.get("access_token")
            if not access_token:
                raise ValidationError("Failed to obtain access token from GitHub response.")
            return access_token
        except httpx.HTTPError as e:
            raise ValidationError(f"Network error during GitHub code exchange: {e}") from e

async def get_github_user_profile(access_token: str) -> dict:
    """
    Fetches the authenticated user's profile and primary verified email from the GitHub API.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "ResumeForge",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # 1. Fetch main user profile
            profile_resp = await client.get("https://api.github.com/user", headers=headers, timeout=10.0)
            profile_resp.raise_for_status()
            profile = profile_resp.json()
            
            # 2. Fetch email addresses if profile email is missing/private
            email = profile.get("email")
            if not email:
                emails_resp = await client.get("https://api.github.com/user/emails", headers=headers, timeout=10.0)
                if emails_resp.status_code == 200:
                    emails = emails_resp.json()
                    # First pass: Look for primary AND verified email
                    for em in emails:
                        if em.get("primary") and em.get("verified"):
                            email = em.get("email")
                            break
                    # Second pass fallback: Look for just primary email
                    if not email:
                        for em in emails:
                            if em.get("primary"):
                                email = em.get("email")
                                break
                    # Third pass fallback: Fallback to the first email in the list
                    if not email and emails:
                        email = emails[0].get("email")
                        
            if not email:
                raise ValidationError("GitHub account must have an associated email address.")
                
            profile["email"] = email
            return profile
        except httpx.HTTPError as e:
            raise ValidationError(f"Failed to fetch profile details from GitHub: {e}") from e
