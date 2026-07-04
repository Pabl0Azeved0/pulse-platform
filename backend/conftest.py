import os

# These must be set before main (and auth.py) are imported, since auth.py
# caches SECRET_KEY/ALGORITHM at import time.
os.environ["SECRET_KEY"] = "super_secret_test_key"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"

import pytest, pytest_asyncio
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import models
from models import Base
from main import app

# Use in-memory SQLite for instant, isolated tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def test_db():
    # 1. Setup SQLite Engine
    engine = create_async_engine(
        TEST_DATABASE_URL, connect_args={"check_same_thread": False}
    )

    # 2. Create Tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 3. Create Session Factory
    TestingSessionLocal = sessionmaker(
        class_=AsyncSession,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        bind=engine,
    )

    # 4. Yield the session to the test
    async with TestingSessionLocal() as session:
        yield session

    # 5. Teardown (Drop tables after test)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()  # Clean shutdown


@pytest_asyncio.fixture(scope="function")
async def client(test_db):
    # Generator for the override
    async def override_get_session():
        yield test_db

    # Patch 'schema.get_session' AND 'models.get_session'
    # This ensures the app uses our test DB, not the real Postgres
    with patch("schema.get_session", side_effect=override_get_session), patch(
        "models.get_session", side_effect=override_get_session
    ):

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from rate_limit import rate_limiter

    rate_limiter.reset()
    yield
    rate_limiter.reset()
