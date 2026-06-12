import urllib.parse
import httpx
from app.config import settings
from app.common.exceptions import ValidationError

def get_google_auth_url() -> str:
    """
    Generates the Google authorization URL to redirect users to.
    """
    redirect_uri = f"{settings.BACKEND_URL.rstrip('/')}/auth/google/callback"
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    encoded_params = urllib.parse.urlencode(params)
    return f"https://accounts.google.com/o/oauth2/v2/auth?{encoded_params}"

async def get_google_access_token(code: str) -> str:
    """
    Exchanges the authorization code for a Google access token.
    """
    redirect_uri = f"{settings.BACKEND_URL.rstrip('/')}/auth/google/callback"
    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, data=data, timeout=10.0)
            response.raise_for_status()
            res_json = response.json()
            
            access_token = res_json.get("access_token")
            if not access_token:
                raise ValidationError("Failed to obtain access token from Google response.")
            return access_token
        except httpx.HTTPError as e:
            raise ValidationError(f"Network error during Google code exchange: {e}") from e

async def get_google_user_profile(access_token: str) -> dict:
    """
    Retrieves OpenID Connect profile info (email, name) from Google API.
    """
    url = "https://www.googleapis.com/oauth2/v3/userinfo"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            profile = response.json()
            
            email = profile.get("email")
            if not email:
                raise ValidationError("Google profile did not return a valid email address.")
                
            return profile
        except httpx.HTTPError as e:
            raise ValidationError(f"Failed to fetch profile details from Google: {e}") from e
