import strawberry
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select
from strawberry.fastapi import GraphQLRouter
from typing import List, AsyncGenerator

from auth import get_password_hash, verify_password, create_access_token
from broadcaster import broadcaster
from models import init_db, get_session, User, Post


@strawberry.type
class UserType:
    id: int
    username: str
    email: str

@strawberry.type
class PostType:
    id: int
    content: str
    author: UserType

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
                return UserType(id=new_user.id, username=new_user.username, email=new_user.email)
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
                user=UserType(id=user.id, username=user.username, email=user.email)
            )

    @strawberry.mutation
    async def create_post(self, username: str, content: str) -> PostType:
        async for session in get_session():
            query = select(User).where(User.username == username)
            result = await session.execute(query)
            user = result.scalars().first()
            if not user:
                raise Exception("User not found")

            new_post = Post(content=content, user_id=user.id)
            session.add(new_post)
            await session.commit()
            await session.refresh(new_post)

            # Convert to GraphQL Type
            post_response = PostType(
                id=new_post.id, 
                content=new_post.content, 
                author=UserType(id=user.id, username=user.username, email=user.email)
            )

            await broadcaster.publish(post_response)

            return post_response


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
    async def posts(self) -> List[PostType]:
        async for session in get_session():
            query = select(Post).order_by(Post.id.desc())
            result = await session.execute(query)
            posts = result.scalars().all()
            response_posts = []
            for p in posts:
                u_result = await session.execute(select(User).where(User.id == p.user_id))
                author = u_result.scalars().first()
                response_posts.append(PostType(
                    id=p.id, 
                    content=p.content, 
                    author=UserType(id=author.id, username=author.username, email=author.email)
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
