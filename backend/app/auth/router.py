import time
import jwt
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
import app.auth.service as service
import app.auth.github_oauth as github_oauth
import app.auth.google_oauth as google_oauth
from app.auth.schemas import UserSignup, UserLogin, TokenResponse, TokenRefreshRequest
from app.dependencies import get_db
from app.config import settings
from app.redis import redis_client
from app.common.exceptions import Forbidden, ValidationError

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory rate limiting fallback dictionary
local_rate_limit_cache: Dict[str, dict] = {}

async def check_rate_limit(request: Request, limit: int = 5, period: int = 60) -> None:
    """
    Performs rate limiting per IP using Upstash Redis,
    falling back to an in-memory dictionary if Redis is unavailable.
    """
    client_ip = request.client.host if request.client else "unknown_ip"
    key = f"rate_limit:login:{client_ip}"
    
    try:
        current_val = await redis_client.get(key)
        if current_val is None:
            await redis_client.set(key, "1", ex=period)
            return
            
        count = int(current_val)
        if count >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please try again after a minute."
            )
        
        await redis_client.execute(["INCR", key])
    except HTTPException:
        raise
    except Exception:
        # Fallback to local in-memory dict
        now = time.time()
        # Evict expired entries
        for ip, data in list(local_rate_limit_cache.items()):
            if now > data["expires"]:
                local_rate_limit_cache.pop(ip, None)
                
        if client_ip not in local_rate_limit_cache:
            local_rate_limit_cache[client_ip] = {"count": 1, "expires": now + period}
            return
            
        data = local_rate_limit_cache[client_ip]
        if data["count"] >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please try again after a minute."
            )
            
        data["count"] += 1

# --- GitHub OAuth Endpoints ---

@router.get("/github")
async def github_login():
    """
    Redirects the user to the GitHub authorization page.
    """
    auth_url = github_oauth.get_github_auth_url()
    return RedirectResponse(auth_url)

@router.get("/github/callback")
async def github_callback(code: str, conn = Depends(get_db)):
    """
    Handles the callback redirect from GitHub.
    Exchanges code for token, gets user info, creates/merges accounts,
    issues JWTs, and redirects back to the frontend.
    """
    if not code:
        raise ValidationError("Missing authorization code from GitHub callback.")
        
    # 1. Exchange authorization code for access token
    access_token = await github_oauth.get_github_access_token(code)
    
    # 2. Get profile and email info
    profile = await github_oauth.get_github_user_profile(access_token)
    email = profile["email"]
    full_name = profile.get("name") or profile.get("login")
    github_user_id = profile["id"]
    
    # 3. Create or update user (handle account merging)
    user = await service.create_or_update_oauth_user(
        conn=conn,
        email=email,
        full_name=full_name,
        auth_provider="github",
        github_user_id=github_user_id,
        github_token=access_token
    )
    
    # 4. Generate JWT access and refresh tokens
    tokens = service.create_tokens(
        user_id=user["id"],
        email=user["email"],
        auth_provider=user["auth_provider"]
    )
    
    # 5. Redirect frontend with tokens
    redirect_url = f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback?token={tokens['access_token']}&refresh={tokens['refresh_token']}"
    return RedirectResponse(redirect_url)

# --- Google OAuth Endpoints ---

@router.get("/google")
async def google_login():
    """
    Redirects the user to the Google authorization page.
    """
    auth_url = google_oauth.get_google_auth_url()
    return RedirectResponse(auth_url)

@router.get("/google/callback")
async def google_callback(code: str, conn = Depends(get_db)):
    """
    Handles the callback redirect from Google.
    Exchanges code for token, gets user info, creates/merges accounts,
    issues JWTs, and redirects back to the frontend.
    """
    if not code:
        raise ValidationError("Missing authorization code from Google callback.")
        
    # 1. Exchange code for access token
    access_token = await google_oauth.get_google_access_token(code)
    
    # 2. Retrieve user profile
    profile = await google_oauth.get_google_user_profile(access_token)
    email = profile["email"]
    full_name = profile.get("name")
    
    # 3. Create or update user in database
    user = await service.create_or_update_oauth_user(
        conn=conn,
        email=email,
        full_name=full_name,
        auth_provider="google"
    )
    
    # 4. Generate JWTs
    tokens = service.create_tokens(
        user_id=user["id"],
        email=user["email"],
        auth_provider=user["auth_provider"]
    )
    
    # 5. Redirect to frontend with tokens
    redirect_url = f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback?token={tokens['access_token']}&refresh={tokens['refresh_token']}"
    return RedirectResponse(redirect_url)

# --- Email + Password Auth Endpoints ---

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignup, conn = Depends(get_db)):
    """
    Handles registration via email and password.
    Returns access + refresh tokens upon successful signup.
    """
    # Create user
    user = await service.create_email_user(
        conn=conn,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name
    )
    
    # Generate tokens
    tokens = service.create_tokens(
        user_id=user["id"],
        email=user["email"],
        auth_provider=user["auth_provider"]
    )
    return tokens

@router.post("/login", response_model=TokenResponse)
async def login(request: Request, payload: UserLogin, conn = Depends(get_db)):
    """
    Handles login via email and password. Rate limits attempts to 5 per minute per IP.
    """
    # Enforce rate limiting
    await check_rate_limit(request, limit=5, period=60)
    
    # Fetch user
    user = await service.get_user_by_email(conn, payload.email)
    if not user:
        raise ValidationError("Invalid email or password.")
        
    # Check auth provider compatibility (can't log in via email auth if user registered strictly via Google/GitHub without password)
    if not user.get("password_hash"):
        raise ValidationError(f"This email is registered using {user['auth_provider']} login. Please use that login method.")
        
    # Verify password hash
    if not service.verify_password(payload.password, user["password_hash"]):
        raise ValidationError("Invalid email or password.")
        
    # Generate tokens
    tokens = service.create_tokens(
        user_id=user["id"],
        email=user["email"],
        auth_provider=user["auth_provider"]
    )
    return tokens

# --- Token Management ---

@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(payload: TokenRefreshRequest):
    """
    Validates a JWT refresh token and issues a new access/refresh token pair.
    """
    try:
        # Decode refresh token
        decoded = jwt.decode(payload.refresh_token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        
        # Enforce token type constraint
        if decoded.get("type") != "refresh":
            raise Forbidden("Invalid token type. Expected refresh token.")
            
        user_id = decoded.get("sub")
        email = decoded.get("email")
        auth_provider = decoded.get("auth_provider")
        
        if not user_id or not email or not auth_provider:
            raise Forbidden("Invalid token claims structure.")
            
        # Re-issue both access and refresh tokens
        new_tokens = service.create_tokens(
            user_id=user_id,
            email=email,
            auth_provider=auth_provider
        )
        return new_tokens
        
    except jwt.ExpiredSignatureError as e:
        raise Forbidden("Refresh token has expired. Please log in again.") from e
    except jwt.InvalidTokenError as e:
        raise Forbidden("Invalid refresh token.") from e
