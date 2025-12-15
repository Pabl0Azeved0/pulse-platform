from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://pulse_user:pulse_password@db:5432/pulse_db"
)

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    avatar = Column(String, nullable=True)

    # Relationship to Posts
    posts = relationship("Post", back_populates="author")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationship to User
    author = relationship("User", back_populates="posts")


class Like(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))

    __table_args__ = (UniqueConstraint("user_id", "post_id", name="_user_post_uc"),)


async def init_db():
    async with engine.begin() as conn:
        # This creates tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    async with async_session() as session:
        yield session
