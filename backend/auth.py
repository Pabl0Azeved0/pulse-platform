import os
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()

    access_token_expire = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
    expire_minutes = int(access_token_expire) if access_token_expire else 30

    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})

    secret_key = os.getenv("SECRET_KEY")
    algorithm = os.getenv("ALGORITHM")

    if not secret_key or not algorithm:
        raise ValueError("CRITICAL: SECRET_KEY or ALGORITHM not found in environment.")

    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt
