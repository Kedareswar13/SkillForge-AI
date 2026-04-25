from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.pdf_utils import extract_text_from_pdf
from app.llm_helper import call_llm_json
import httpx
from bs4 import BeautifulSoup

router = APIRouter()


class JDTextInput(BaseModel):
    text: str


class JDUrlInput(BaseModel):
    url: str


@router.post("/extract-pdf")
async def extract_jd_pdf(file: UploadFile = File(...)):
    """Extract text from JD PDF."""
    file_bytes = await file.read()
    text, _ = extract_text_from_pdf(file_bytes)
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    return {"text": text}


@router.post("/extract-url")
async def extract_jd_url(data: JDUrlInput):
    """Scrape JD text from URL using Jina Reader API."""
    try:
        # Use Jina Reader API to bypass bot-protection and extract text from JS-heavy sites like Naukri
        jina_url = f"https://r.jina.ai/{data.url}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(jina_url, follow_redirects=True)
            response.raise_for_status()
        
        text = response.text
        
        if len(text) < 50:
            raise HTTPException(status_code=400, detail="Could not extract meaningful text from URL")
        
        return {"text": text[:6000]}  # Reduced limit to save tokens
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")


@router.post("/parse")
async def parse_jd(data: JDTextInput):
    """Parse JD text to extract required/preferred skills and role type."""
    
    system_prompt = """You are a job description analyzer. Extract skills and requirements.

Return ONLY valid JSON:
{
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill3", "skill4"],
  "role_type": "Full Stack Developer",
  "experience_level": "mid-senior",
  "key_responsibilities": ["resp1", "resp2"]
}

Rules:
- required_skills: skills explicitly required or strongly implied
- preferred_skills: nice-to-have or preferred skills
- role_type: the job title/role
- Be specific with skill names (e.g., "React" not "frontend framework")
- Include both technical and important soft skills"""

    user_prompt = f"Parse this job description:\n\n{data.text[:6000]}"
    
    try:
        result = call_llm_json(system_prompt, user_prompt)
        return {
            "required_skills": result.get("required_skills", []),
            "preferred_skills": result.get("preferred_skills", []),
            "role_type": result.get("role_type", ""),
            "experience_level": result.get("experience_level", ""),
            "key_responsibilities": result.get("key_responsibilities", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse JD: {str(e)}")
