import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

SECRET = os.environ.get("JWT_SECRET", "supersecret_local_key_change_this")
ALGO = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_minutes: int = 60):
    """
    Create a JWT access token with proper UTC timezone handling
    """
    # Use timezone-aware datetime to avoid issues
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)

    to_encode = {
        "exp": expire,
        "iat": now,
        "sub": data.get("email"),
        "email": data.get("email"),
        "iss": "LMS-Backend",
        "token_type": "access"
    }

    token = jwt.encode(to_encode, SECRET, algorithm=ALGO)
    
    print(f"[AUTH] Token created for {data.get('email')}")
    print(f"[AUTH] Expires at: {expire} (in {expires_minutes} minutes)")
    
    return token


def verify_token(token: str):
    """
    Verify and decode a JWT token
    Returns payload if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(
            token,
            SECRET,
            algorithms=[ALGO],
            issuer="LMS-Backend",
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iss": True
            }
        )

        if payload.get("token_type") != "access":
            print(f"[AUTH] Invalid token type: {payload.get('token_type')}")
            return None
        
        print(f"[AUTH] Token verified for: {payload.get('email')}")
        return payload

    except jwt.ExpiredSignatureError:
        print("[AUTH] Token expired")
        return None
    except jwt.JWTClaimsError as e:
        print(f"[AUTH] JWT claims error: {e}")
        return None
    except JWTError as e:
        print(f"[AUTH] JWT error: {e}")
        return None
    except Exception as e:
        print(f"[AUTH] Unexpected error: {e}")
        return None


def create_refresh_token(data: dict, expires_days: int = 30) -> str:
    """
    Create a refresh token with longer expiration
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=expires_days)

    to_encode = {
        "exp": expire,
        "iat": now,
        "sub": data.get("email"),
        "email": data.get("email"),
        "iss": "LMS-Backend",
        "token_type": "refresh"
    }

    return jwt.encode(to_encode, SECRET, algorithm=ALGO)