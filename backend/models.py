import os
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, sessionmaker, declarative_base, backref
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://pulse_user:pulse_password@db:5432/pulse_db"
)

engine = create_async_engine(
    DATABASE_URL, echo=os.getenv("SQL_ECHO", "false").lower() == "true"
)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    avatar = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationship to Posts
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")

    followers = relationship(
        "Follow",
        foreign_keys="[Follow.followed_id]",
        backref="followed",
        lazy="selectin",
    )
    following = relationship(
        "Follow",
        foreign_keys="[Follow.follower_id]",
        backref="follower",
        lazy="selectin",
    )


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationship to User
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post")


class Like(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)

    __table_args__ = (UniqueConstraint("user_id", "post_id", name="_user_post_uc"),)


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    created_at = Column(String)

    user_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)

    author = relationship("User", lazy="selectin")
    post = relationship("Post")

    replies = relationship(
        "Comment", backref=backref("parent", remote_side=[id]), lazy="selectin"
    )


class Follow(Base):
    __tablename__ = "follows"
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"))
    followed_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(String)

    __table_args__ = (
        UniqueConstraint("follower_id", "followed_id", name="_follower_followed_uc"),
    )


async def init_db():
    async with engine.begin() as conn:
        # This creates tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    async with async_session() as session:
        yield session
