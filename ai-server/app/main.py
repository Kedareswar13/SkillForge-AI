from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routes import resume_routes, jd_routes, analyze_routes, assessment_routes, learning_routes, mock_interview_routes

app = FastAPI(
    title="SkillForge AI Service",
    description="AI-powered resume parsing, skill extraction, and assessment engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(resume_routes.router, prefix="/api/resume", tags=["Resume"])
app.include_router(jd_routes.router, prefix="/api/jd", tags=["Job Description"])
app.include_router(analyze_routes.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(assessment_routes.router, prefix="/api/assessment", tags=["Assessment"])
app.include_router(learning_routes.router, prefix="/api/learning", tags=["Learning"])
app.include_router(mock_interview_routes.router, prefix="/api/mock-interview", tags=["Mock Interview"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-service"}
