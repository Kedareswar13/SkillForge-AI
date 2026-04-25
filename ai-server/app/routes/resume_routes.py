from fastapi import APIRouter, UploadFile, File, HTTPException
from app.pdf_utils import extract_text_from_pdf
from app.llm_helper import call_llm_json

router = APIRouter()


@router.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    """Parse uploaded resume PDF: extract text, sections, skills with evidence."""
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    file_bytes = await file.read()
    text, used_ocr = extract_text_from_pdf(file_bytes)
    
    if not text or len(text) < 20:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    
    # Step 1: Parse resume into sections
    sections = await _parse_sections(text)
    
    # Step 2: Extract skills with evidence
    skills_with_evidence = await _extract_skills_with_evidence(text, sections)
    
    return {
        "text": text,
        "used_ocr": used_ocr,
        "sections": sections,
        "skills": [s["name"] for s in skills_with_evidence],
        "skillsWithEvidence": skills_with_evidence
    }


async def _parse_sections(text: str) -> dict:
    """Use LLM to parse resume into structured sections."""
    system_prompt = """You are a resume parser. Extract and structure resume sections.
Return ONLY valid JSON with this exact structure:
{
  "summary": "professional summary text",
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "date range",
      "bullets": ["responsibility 1", "responsibility 2"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "brief description",
      "technologies": ["tech1", "tech2"],
      "bullets": ["what was done 1", "what was done 2"]
    }
  ],
  "skills": ["skill1", "skill2"],
  "education": [
    {
      "degree": "degree name",
      "institution": "school name",
      "year": "graduation year or range"
    }
  ]
}

Be thorough. Extract ALL information. If a section is missing, use empty array or empty string."""

    user_prompt = f"Parse this resume:\n\n{text[:6000]}"
    
    try:
        result = call_llm_json(system_prompt, user_prompt)
        # Ensure all fields exist
        return {
            "summary": result.get("summary", ""),
            "experience": result.get("experience", []),
            "projects": result.get("projects", []),
            "skills": result.get("skills", []),
            "education": result.get("education", [])
        }
    except Exception as e:
        print(f"Section parsing error: {e}")
        return {
            "summary": "",
            "experience": [],
            "projects": [],
            "skills": [],
            "education": []
        }


async def _extract_skills_with_evidence(text: str, sections: dict) -> list:
    """Extract skills with evidence mapping and level inference."""
    system_prompt = """You are a skill extraction expert. Analyze the resume and extract skills with evidence.

CRITICAL RULES:
1. Projects and experience are MORE IMPORTANT than the skills section
2. A skill mentioned only in the skills section = weak evidence
3. A skill used in a project = medium evidence  
4. A skill used in multiple projects or work experience = strong evidence

For each skill, determine:
- level: beginner (just listed), intermediate (used once), advanced (multiple uses), expert (complex/production usage)
- confidence: 0-100 based on evidence strength
- category: technical, soft, tool, framework, language, database, devops, ai_ml

Return ONLY valid JSON array:
[
  {
    "name": "Skill Name",
    "level": "beginner|intermediate|advanced|expert",
    "confidence": 75,
    "category": "technical",
    "evidence": [
      {
        "source": "project|experience|skills_section|education",
        "detail": "Used React to build real-time dashboard in ProjectX",
        "strength": "weak|medium|strong"
      }
    ]
  }
]

Extract ALL skills you can find. Be accurate with evidence mapping."""

    # Build context from sections
    context_parts = []
    if sections.get("experience"):
        context_parts.append("EXPERIENCE:\n" + "\n".join([
            f"- {exp.get('title', '')} at {exp.get('company', '')}: {'; '.join(exp.get('bullets', []))}"
            for exp in sections["experience"]
        ]))
    if sections.get("projects"):
        context_parts.append("PROJECTS:\n" + "\n".join([
            f"- {proj.get('name', '')}: {proj.get('description', '')} | Tech: {', '.join(proj.get('technologies', []))} | {'; '.join(proj.get('bullets', []))}"
            for proj in sections["projects"]
        ]))
    if sections.get("skills"):
        context_parts.append(f"SKILLS SECTION: {', '.join(sections['skills'])}")

    user_prompt = f"Full resume text:\n{text[:5000]}\n\nStructured sections:\n{chr(10).join(context_parts)}"
    
    try:
        result = call_llm_json(system_prompt, user_prompt)
        if isinstance(result, list):
            return result
        elif isinstance(result, dict) and "skills" in result:
            return result["skills"]
        return result if isinstance(result, list) else []
    except Exception as e:
        print(f"Skill extraction error: {e}")
        # Fallback: return skills from sections
        return [
            {
                "name": skill,
                "level": "beginner",
                "confidence": 30,
                "category": "technical",
                "evidence": [{"source": "skills_section", "detail": "Listed in skills section", "strength": "weak"}]
            }
            for skill in sections.get("skills", [])
        ]
