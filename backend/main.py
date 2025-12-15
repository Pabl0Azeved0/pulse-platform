import strawberry
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select
from strawberry.fastapi import GraphQLRouter
from typing import List, AsyncGenerator, Optional

from auth import get_password_hash, verify_password, create_access_token
from broadcaster import broadcaster
from models import init_db, get_session, User, Post, Like


@strawberry.type
class UserType:
    id: int
    username: str
    email: str
    avatar: str | None


@strawberry.type
class PostType:
    id: int
    content: str
    author: UserType
    likes_count: int
    is_liked: bool


@strawberry.type
class AuthPayload:
    access_token: str
    token_type: str = "bearer"
    user: UserType


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
                user=UserType(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    avatar=user.avatar,
                ),
            )

    @strawberry.mutation
    async def create_post(self, username: str, content: str) -> PostType:
        async for session in get_session():
            q = select(User).where(User.username == username)
            user = (await session.execute(q)).scalars().first()
            if not user:
                raise Exception("User not found")

            new_post = Post(content=content, user_id=user.id)
            session.add(new_post)
            await session.commit()
            await session.refresh(new_post)

            post_response = PostType(
                id=new_post.id,
                content=new_post.content,
                likes_count=0,
                is_liked=False,
                author=UserType(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    avatar=user.avatar,
                ),
            )

            await broadcaster.publish(post_response)
            return post_response

    @strawberry.mutation
    async def update_avatar(self, username: str, avatar_data: str) -> UserType:
        async for session in get_session():
            query = select(User).where(User.username == username)
            result = await session.execute(query)
            user = result.scalars().first()

            if not user:
                raise Exception("User not found")

            user.avatar = avatar_data
            await session.commit()

            return UserType(
                id=user.id, username=user.username, email=user.email, avatar=user.avatar
            )

    @strawberry.mutation
    async def like_post(self, username: str, post_id: int) -> int:
        async for session in get_session():
            q_user = select(User).where(User.username == username)
            user = (await session.execute(q_user)).scalars().first()
            if not user:
                raise Exception("User not found")

            q_like = select(Like).where(
                Like.user_id == user.id, Like.post_id == post_id
            )
            result = await session.execute(q_like)
            existing_like = result.scalars().first()

            if existing_like:
                await session.delete(existing_like)
            else:
                new_like = Like(user_id=user.id, post_id=post_id)
                session.add(new_like)

            await session.commit()

            q_count = select(func.count(Like.id)).where(Like.post_id == post_id)
            count = (await session.execute(q_count)).scalar()
            return count or 0


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def new_post(self) -> AsyncGenerator[PostType, None]:
        # Connects the user to the broadcaster
        async for post in broadcaster.subscribe():
            yield post


@strawberry.type
class Query:
    @strawberry.field
    async def posts(self, viewer: Optional[str] = None) -> List[PostType]:
        async for session in get_session():
            viewer_id = None
            if viewer:
                q_user = select(User).where(User.username == viewer)
                u = (await session.execute(q_user)).scalars().first()
                if u:
                    viewer_id = u.id

            query = select(Post).order_by(Post.id.desc())
            result = await session.execute(query)
            posts_list = result.scalars().all()

            response_posts = []
            for p in posts_list:
                u_result = await session.execute(
                    select(User).where(User.id == p.user_id)
                )
                author = u_result.scalars().first()

                l_result = await session.execute(
                    select(func.count(Like.id)).where(Like.post_id == p.id)
                )
                count = l_result.scalar() or 0

                user_liked = False
                if viewer_id:
                    q_check = select(Like).where(
                        Like.user_id == viewer_id, Like.post_id == p.id
                    )
                    check = (await session.execute(q_check)).scalars().first()
                    if check:
                        user_liked = True

                response_posts.append(
                    PostType(
                        id=p.id,
                        content=p.content,
                        likes_count=count,
                        is_liked=user_liked,
                        author=UserType(
                            id=author.id,
                            username=author.username,
                            email=author.email,
                            avatar=author.avatar,
                        ),
                    )
                )
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
