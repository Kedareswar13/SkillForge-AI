from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.llm_helper import call_llm_json

router = APIRouter()


class MockInterviewRequest(BaseModel):
    type: str = "jd_based"  # skill_specific, jd_based, mixed
    skills: list[dict] = []
    role_type: str = ""
    jd_required: list[str] = []
    gap_areas: list[str] = []


class MockEvaluateRequest(BaseModel):
    question: str
    answer: str
    skill: str = ""
    level: str = "intermediate"


@router.post("/generate")
async def generate_mock_interview(data: MockInterviewRequest):
    """Generate mock interview questions based on type."""
    
    context = f"Role: {data.role_type}\n"
    
    if data.type == "jd_based":
        context += f"Required Skills: {', '.join(data.jd_required)}\n"
        context += f"Gap Areas: {', '.join(data.gap_areas)}\n"
    elif data.type == "skill_specific":
        context += f"Skills: {', '.join([s['name'] for s in data.skills[:8]])}\n"
    else:
        context += f"Skills: {', '.join([s['name'] for s in data.skills[:5]])}\n"
        context += f"Required: {', '.join(data.jd_required[:5])}\n"
    
    skill_levels = "\n".join([
        f"- {s['name']}: {s.get('level', 'unknown')}"
        for s in data.skills[:10]
    ])
    
    system_prompt = f"""You are a mock interviewer for a {data.role_type or 'software developer'} position.

Generate 5 interview questions that test practical ability.

Match question difficulty to the candidate's level for each skill:
{skill_levels}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "question": "Tell me about...",
      "skill": "relevant skill",
      "type": "behavioral|technical|scenario|system_design",
      "difficulty": "beginner|intermediate|advanced|expert",
      "tips": "What a strong answer should include"
    }}
  ]
}}

Mix question types: some behavioral, some technical, some scenario-based.
Make questions realistic and relevant to the role."""

    user_prompt = f"Generate mock interview questions.\n\n{context}"
    
    try:
        result = call_llm_json(system_prompt, user_prompt)
        return {"questions": result.get("questions", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mock interview generation failed: {str(e)}")


@router.post("/evaluate")
async def evaluate_mock_answer(data: MockEvaluateRequest):
    """Evaluate a mock interview answer."""
    
    system_prompt = """You are evaluating a mock interview answer.

Return ONLY valid JSON:
{
  "score": 4,
  "feedback": "Detailed feedback on the answer...",
  "strengths": ["What was good"],
  "improvements": ["What could be better"],
  "sample_answer": "A model answer for reference"
}

Score 0-5. Be constructive and specific."""

    user_prompt = f"""Question: {data.question}
Skill: {data.skill}
Level: {data.level}

Answer: {data.answer}"""
    
    try:
        result = call_llm_json(system_prompt, user_prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
