from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.models import * # Import all models to register them on Base.metadata
from app.api.v1.routers import auth, projects, chat

# Create tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EmbedMind AI API",
    description="The AI Operating System for Embedded Systems Engineers Backend API",
    version="1.0.0"
)

# CORS Configuration
# Allow local Next.js frontend (standard ports: 3000, 3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(chat.router, prefix="/api/v1/projects", tags=["Chat"])

@app.get("/")
def read_root():
    return {"name": "EmbedMind AI API", "status": "healthy", "version": "1.0.0"}
