import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from models import init_db, get_session, User
from auth import get_password_hash, verify_password, create_access_token


# --- GraphQL Types ---
@strawberry.type
class UserType:
    id: int
    username: str
    email: str


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
                user=UserType(id=user.id, username=user.username, email=user.email),
            )


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Pulse API is alive."


schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema)

app = FastAPI()

# --- CORS ---
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
