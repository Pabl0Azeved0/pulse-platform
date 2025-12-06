import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Pulse API is alive and beating."


schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graphql_app, prefix="/graphql")


@app.get("/")
def root():
    return {"message": "Welcome to Pulse"}
