import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.database import connect_db, close_db
from app.middleware.error_handlers import (
    http_exception_handler,
    validation_exception_handler,
    duplicate_key_exception_handler,
    generic_exception_handler
)
from app.routers import auth, foods, orders, sellers, reviews, complaints, admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure uploads directory exists
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing GharSe backend service...")
    await connect_db()
    yield
    # Shutdown
    logger.info("Shutting down GharSe backend service...")
    await close_db()

app = FastAPI(
    title="GharSe API",
    description="Hyperlocal home-cooked food marketplace API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
origins = [
    settings.CLIENT_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(DuplicateKeyError, duplicate_key_exception_handler)
# Fallback exception handler in production
if os.getenv("ENV") == "production":
    app.add_exception_handler(Exception, generic_exception_handler)

# Serve uploaded static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "gharse-backend"}

# Register Routers
app.include_router(auth.router)
app.include_router(foods.router)
app.include_router(orders.router)
app.include_router(sellers.router)
app.include_router(reviews.router)
app.include_router(complaints.router)
app.include_router(admin.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
