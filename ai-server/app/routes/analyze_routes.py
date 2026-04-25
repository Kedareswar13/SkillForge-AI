from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.llm_helper import call_llm_json

router = APIRouter()


class GapAnalysisInput(BaseModel):
    resume_skills: list[dict]
    jd_required: list[str]
    jd_preferred: list[str]
    role_type: str = ""


@router.post("/gap")
async def analyze_gap(data: GapAnalysisInput):
    """Compare resume skills against JD requirements."""
    
    system_prompt = """You are a skill gap analyzer. Compare resume skills against job requirements.

Return ONLY valid JSON:
{
  "matches": ["skill1", "skill2"],
  "partial_matches": ["skill3"],
  "missing": ["skill4", "skill5"],
  "weak_areas": ["skill6"],
  "overall_readiness": 72,
  "recommendations": [
    "Focus on learning skill4 as it is critical for this role",
    "Your skill3 needs deeper practice"
  ]
}

Rules:
- matches: skills the candidate clearly has at a good level
- partial_matches: skills the candidate has but at a lower level than needed
- missing: skills completely absent from resume
- weak_areas: skills present but with low confidence/evidence
- overall_readiness: an integer between 0-100 representing the job readiness score
- CRITICAL: A skill CANNOT be in more than one list. Categories are MUTUALLY EXCLUSIVE. If a skill is a 'match', it cannot be a 'weak_area'.
- Be precise: consider skill levels and evidence strength, not just names"""

    # Build skill summary
    skill_summary = "\n".join([
        f"- {s['name']}: level={s.get('level', 'unknown')}, confidence={s.get('confidence', 0)}%, evidence={len(s.get('evidence', []))} sources"
        for s in data.resume_skills
    ])

    user_prompt = f"""Role: {data.role_type}

Required JD Skills: {', '.join(data.jd_required)}
Preferred JD Skills: {', '.join(data.jd_preferred)}

Candidate's Skills:
{skill_summary}"""

    try:
        result = call_llm_json(system_prompt, user_prompt)
        return {
            "matches": result.get("matches", []),
            "partial_matches": result.get("partial_matches", []),
            "missing": result.get("missing", []),
            "weak_areas": result.get("weak_areas", []),
            "overall_readiness": result.get("overall_readiness", 0),
            "recommendations": result.get("recommendations", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")
