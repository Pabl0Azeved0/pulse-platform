import strawberry
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from strawberry.fastapi import GraphQLRouter
from typing import List, AsyncGenerator, Optional

from auth import get_password_hash, verify_password, create_access_token
from broadcaster import broadcaster
from models import init_db, get_session, User, Post, Like, Comment


@strawberry.type
class UserType:
    id: int
    username: str
    email: str
    avatar: str | None

@strawberry.type
class CommentType:
    id: int
    content: str
    created_at: str
    author: UserType
    replies: List['CommentType']
    likes_count: int 
    is_liked: bool

@strawberry.type
class PostType:
    id: int
    content: str
    author: UserType
    likes_count: int
    is_liked: bool
    comments: List[CommentType]

@strawberry.type
class AuthPayload:
    access_token: str
    token_type: str = "bearer"
    user: UserType


def format_user(user_db) -> UserType:
    return UserType(
        id=user_db.id,
        username=user_db.username,
        email=user_db.email,
        avatar=user_db.avatar
    )

def format_comment_node(comment_db) -> CommentType:
    return CommentType(
        id=comment_db.id,
        content=comment_db.content,
        created_at=comment_db.created_at or datetime.utcnow().isoformat(),
        author=format_user(comment_db.author),
        replies=[],
        likes_count=0,
        is_liked=False
    )

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def register(self, username: str, email: str, password: str) -> UserType:
        async for session in get_session():
            hashed_pw = get_password_hash(password)
            new_user = User(username=username, email=email, password_hash=hashed_pw)
            try:
                session.add(new_user)
                await session.commit()
                await session.refresh(new_user)
                return UserType(
                    id=new_user.id,
                    username=new_user.username,
                    email=new_user.email,
                    avatar=None,
                )
            except IntegrityError:
                await session.rollback()
                raise Exception("That username or email is already taken.")

    @strawberry.mutation
    async def login(self, username: str, password: str) -> AuthPayload:
        async for session in get_session():
            query = select(User).where(User.username == username)
            result = await session.execute(query)
            user = result.scalars().first()
            if not user or not verify_password(password, user.password_hash):
                raise Exception("Invalid credentials")
            token = create_access_token({"sub": user.username})
            return AuthPayload(
                access_token=token,
                user=format_user(user),
            )

    @strawberry.mutation
    async def create_post(self, username: str, content: str) -> PostType:
        async for session in get_session():
            q = select(User).where(User.username == username)
            user = (await session.execute(q)).scalars().first()
            if not user: raise Exception("User not found")

            new_post = Post(content=content, user_id=user.id)
            session.add(new_post)
            await session.commit()
            await session.refresh(new_post)

            post_response = PostType(
                id=new_post.id,
                content=new_post.content,
                likes_count=0,
                is_liked=False,
                author=format_user(user),
                comments=[]
            )

            await broadcaster.publish(post_response)
            return post_response

    @strawberry.mutation
    async def update_avatar(self, username: str, avatar_data: str) -> UserType:
        async for session in get_session():
            query = select(User).where(User.username == username)
            user = (await session.execute(query)).scalars().first()
            if not user: raise Exception("User not found")

            user.avatar = avatar_data
            await session.commit()
            return format_user(user)

    @strawberry.mutation
    async def like_post(self, username: str, post_id: int) -> int:
        async for session in get_session():
            q_user = select(User).where(User.username == username)
            user = (await session.execute(q_user)).scalars().first()
            if not user: raise Exception("User not found")

            q_like = select(Like).where(Like.user_id == user.id, Like.post_id == post_id)
            existing_like = (await session.execute(q_like)).scalars().first()

            if existing_like:
                await session.delete(existing_like)
            else:
                session.add(Like(user_id=user.id, post_id=post_id))
            
            await session.commit()
            
            q_count = select(func.count(Like.id)).where(Like.post_id == post_id)
            return (await session.execute(q_count)).scalar() or 0

    @strawberry.mutation
    async def create_comment(self, username: str, post_id: int, content: str, parent_id: Optional[int] = None) -> CommentType:
        async for session in get_session():
            q_user = select(User).where(User.username == username)
            user = (await session.execute(q_user)).scalars().first()
            if not user: raise Exception("User not found")

            new_comment = Comment(
                content=content, 
                user_id=user.id, 
                post_id=post_id,
                parent_id=parent_id,
                created_at=datetime.utcnow().isoformat()
            )
            session.add(new_comment)
            await session.commit()
            # Refresh to load relationships via selectin
            await session.refresh(new_comment)
            
            return format_comment_node(new_comment)

@strawberry.type
class Subscription:
    @strawberry.subscription
    async def new_post(self) -> AsyncGenerator[PostType, None]:
        async for post in broadcaster.subscribe():
            yield post

@strawberry.type
class Query:
    @strawberry.field
    async def posts(self, viewer: Optional[str] = None) -> List[PostType]:
        async for session in get_session():
            viewer_id = None
            if viewer:
                u = (await session.execute(select(User).where(User.username == viewer))).scalars().first()
                if u: viewer_id = u.id

            posts_list = (await session.execute(select(Post).order_by(Post.id.desc()))).scalars().all()
            
            response_posts = []
            for p in posts_list:
                author = (await session.execute(select(User).where(User.id == p.user_id))).scalars().first()
                
                count = (await session.execute(select(func.count(Like.id)).where(Like.post_id == p.id))).scalar() or 0
                user_liked = False
                if viewer_id:
                    check = (await session.execute(select(Like).where(Like.user_id == viewer_id, Like.post_id == p.id))).scalars().first()
                    if check: user_liked = True
                
                c_query = select(Comment).where(Comment.post_id == p.id).options(selectinload(Comment.author)).order_by(Comment.id.asc())
                all_comments_db = (await session.execute(c_query)).scalars().all()

                comment_map = {}
                for c_db in all_comments_db:
                    comment_map[c_db.id] = format_comment_node(c_db)

                root_comments = []
                for c_db in all_comments_db:
                    node = comment_map[c_db.id]
                    if c_db.parent_id is None:
                        root_comments.append(node)
                    else:
                        parent_node = comment_map.get(c_db.parent_id)
                        if parent_node:
                            parent_node.replies.append(node)

                response_posts.append(PostType(
                    id=p.id,
                    content=p.content,
                    likes_count=count,
                    is_liked=user_liked,
                    author=format_user(author),
                    comments=root_comments
                ))
            return response_posts

# --- APP SETUP ---
schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
graphql_app = GraphQLRouter(schema)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(graphql_app, prefix="/graphql")

@app.on_event("startup")
async def on_startup():
    await init_db()
