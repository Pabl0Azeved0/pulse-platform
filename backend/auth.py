import os
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is required. Set it to a strong random "
        "value (32+ bytes). No insecure default is provided."
    )

# Constant hash used to equalize login timing when a username does not exist
# (mitigates timing-based user enumeration).
DUMMY_PASSWORD_HASH = pwd_context.hash("timing-attack-mitigation")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()

    access_token_expire = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
    expire_minutes = int(access_token_expire) if access_token_expire else 30

    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
