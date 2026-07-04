import os, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from strawberry.fastapi import GraphQLRouter

from models import init_db
from schema import schema, get_user_from_request
from events import broadcaster
from rate_limit import rate_limiter, client_ip
from constants import RateLimit, Upload


# --- CONFIGURATION ---
os.makedirs(Upload.DIR, exist_ok=True)

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await broadcaster.connect()
    yield
    await broadcaster.disconnect()


app = FastAPI(lifespan=lifespan)

# --- MIDDLEWARE ---
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def global_rate_limit(request: Request, call_next):
    if not rate_limiter.is_allowed(f"global:{client_ip(request)}", *RateLimit.GLOBAL):
        return JSONResponse(
            status_code=429, content={"detail": "Rate limit exceeded. Slow down."}
        )
    return await call_next(request)


# --- ROUTES ---
IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"
graphql_app = GraphQLRouter(schema, graphql_ide=None if IS_PRODUCTION else "graphiql")
app.include_router(graphql_app, prefix="/graphql")

app.mount("/uploads", StaticFiles(directory=Upload.DIR), name="uploads")


@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    # 1. Authentication — only logged-in users may upload.
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 2. Per-IP rate limit.
    if not rate_limiter.is_allowed(f"upload:{client_ip(request)}", *RateLimit.UPLOAD):
        raise HTTPException(status_code=429, detail="Too many uploads. Slow down.")

    # 3. Content-type allow-list (never trust the client filename).
    extension = Upload.ALLOWED_IMAGE_TYPES.get((file.content_type or "").lower())
    if not extension:
        raise HTTPException(
            status_code=400, detail="Unsupported file type. Images only."
        )

    # 4. Size cap — read once, enforce before writing to disk.
    contents = await file.read()
    if len(contents) > Upload.MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB).")

    unique_filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(Upload.DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    return {"url": f"{PUBLIC_BASE_URL}/uploads/{unique_filename}"}
