from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.llm_helper import call_llm_json, call_llm

router = APIRouter()


class QuestionRequest(BaseModel):
    skill: str
    level: str  # beginner, intermediate, advanced, expert
    role_type: str = ""
    previous_questions: list[str] = []


class EvaluateRequest(BaseModel):
    skill: str
    level: str
    question: str
    answer: str


@router.post("/question")
async def generate_question(data: QuestionRequest):
    """Generate an adaptive question based on skill and level."""
    
    level_descriptions = {
        "beginner": "Ask a conceptual/definition question. Test if they understand what it is and basic usage.",
        "intermediate": "Ask a practical question. Test if they can apply it in real scenarios, write code, or solve common problems.",
        "advanced": "Ask a scenario-based question. Test architecture decisions, performance optimization, or complex use cases.",
        "expert": "Ask a system-level or edge-case question. Test deep internals, trade-offs, or production-level debugging."
    }
    
    level_desc = level_descriptions.get(data.level, level_descriptions["beginner"])
    
    previous = ""
    if data.previous_questions:
        previous = f"\n\nDO NOT repeat these questions:\n" + "\n".join([f"- {q}" for q in data.previous_questions])
    
    system_prompt = f"""You are a technical interviewer assessing {data.skill} skills.
The candidate's current level is: {data.level}

{level_desc}

{f"The target role is: {data.role_type}" if data.role_type else ""}

Return ONLY valid JSON:
{{
  "question": "Your question here",
  "expected_key_points": ["point1", "point2", "point3"],
  "difficulty": "{data.level}"
}}

Rules:
- Ask ONE clear, focused question
- Make it practical and relevant
- Don't make it too long
- For coding questions, describe the problem clearly{previous}"""

    user_prompt = f"Generate a {data.level}-level assessment question for {data.skill}."
    
    try:
        result = call_llm_json(system_prompt, user_prompt)
        return {
            "question": result.get("question", ""),
            "expected_key_points": result.get("expected_key_points", []),
            "difficulty": data.level
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")


@router.post("/evaluate")
async def evaluate_answer(data: EvaluateRequest):
    """Evaluate a candidate's answer to an assessment question."""
    
    system_prompt = f"""You are evaluating a candidate's answer about {data.skill} at {data.level} level.

Score the answer from 0 to 5:
0 = No answer or completely wrong
1 = Vaguely correct but missing key points
2 = Partially correct, shows basic understanding
3 = Good answer, covers main points
4 = Strong answer, shows deep understanding
5 = Excellent, expert-level answer

Based on the score, determine the updated skill level:
- Score 0-1: Move DOWN one level (min: beginner)
- Score 2-3: Stay at current level
- Score 4-5: Move UP one level (max: expert)

Return ONLY valid JSON:
{{
  "score": 4,
  "reasoning": "The answer correctly covers X and Y, but missed Z...",
  "updated_level": "advanced",
  "key_points_hit": ["point1", "point2"],
  "key_points_missed": ["point3"]
}}"""

    user_prompt = f"""Question ({data.level} level, {data.skill}):
{data.question}

Candidate's Answer:
{data.answer}"""

    try:
        result = call_llm_json(system_prompt, user_prompt)
        
        # Ensure proper level adjustment
        levels = ["beginner", "intermediate", "advanced", "expert"]
        current_idx = levels.index(data.level) if data.level in levels else 0
        score = result.get("score", 2)
        
        if score <= 1:
            new_idx = max(0, current_idx - 1)
        elif score >= 4:
            new_idx = min(3, current_idx + 1)
        else:
            new_idx = current_idx
        
        return {
            "score": score,
            "reasoning": result.get("reasoning", ""),
            "updated_level": levels[new_idx],
            "key_points_hit": result.get("key_points_hit", []),
            "key_points_missed": result.get("key_points_missed", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answer evaluation failed: {str(e)}")
