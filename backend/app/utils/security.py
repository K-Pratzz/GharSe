import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from app.config import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def sign_token(user_id: str, role: str) -> str:
    # 7-day default expiry
    expires_delta = timedelta(days=7)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "id": str(user_id),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return token

def verify_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
