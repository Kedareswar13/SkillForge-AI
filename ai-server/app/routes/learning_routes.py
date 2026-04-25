from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.llm_helper import call_llm_json
from app.skill_graph import get_transfer_bonus, get_learning_prerequisites, get_related_skills

router = APIRouter()


class LearningPlanRequest(BaseModel):
    skills: list[dict]
    gap_analysis: dict
    role_type: str = ""
    jd_required: list[str] = []


@router.post("/generate")
async def generate_learning_plan(data: LearningPlanRequest):
    """Generate personalized learning roadmap based on current level and gaps."""
    
    known_skill_names = [s["name"] for s in data.skills]
    
    # Determine which skills need learning plans
    target_skills = []
    for skill in data.gap_analysis.get("missing", []):
        transfer = get_transfer_bonus(known_skill_names, skill)
        prereqs = get_learning_prerequisites(skill)
        target_skills.append({
            "name": skill,
            "current_level": "none",
            "transfer_bonus": round(transfer, 2),
            "prerequisites": prereqs,
            "priority": "high"
        })
    
    for skill in data.gap_analysis.get("weak_areas", []):
        existing = next((s for s in data.skills if s["name"].lower() == skill.lower()), None)
        transfer = get_transfer_bonus(known_skill_names, skill)
        target_skills.append({
            "name": skill,
            "current_level": existing.get("level", "beginner") if existing else "beginner",
            "transfer_bonus": round(transfer, 2),
            "prerequisites": [],
            "priority": "medium"
        })
    
    # Also add skills that are just at beginner level but required
    for skill in data.jd_required:
        existing = next((s for s in data.skills if s["name"].lower() == skill.lower()), None)
        if existing and existing.get("level") in ["beginner"] and skill.lower() not in [t["name"].lower() for t in target_skills]:
            target_skills.append({
                "name": skill,
                "current_level": "beginner",
                "transfer_bonus": get_transfer_bonus(known_skill_names, skill),
                "prerequisites": [],
                "priority": "medium"
            })
    
    if not target_skills:
        return {"learning_plan": []}
    
    # Sort target skills by prerequisite order (foundations first)
    target_skills = _topological_sort(target_skills)
    
    # Build context for LLM
    skill_context = "\n".join([
        f"- {s['name']}: current={s['current_level']}, transfer_bonus={s['transfer_bonus']}, priority={s['priority']}, prereqs={s['prerequisites']}"
        for s in target_skills[:10]
    ])
    
    known_context = "\n".join([
        f"- {s['name']}: level={s.get('level', 'unknown')}, confidence={s.get('confidence', 0)}%"
        for s in data.skills[:15]
    ])
    
    system_prompt = f"""You are a learning path generator. Create personalized, ORDERED learning roadmaps.

CRITICAL RULES:
1. ORDER MATTERS! Follow this strict learning hierarchy:
   - Foundational languages (Python, JavaScript, SQL) FIRST
   - Then frameworks and libraries (React, FastAPI, Node.js)
   - Then specialized topics (Machine Learning, Data Science)
   - Then advanced AI topics (Deep Learning, NLP, Generative AI)
   - Then cutting-edge (Agentic AI, LangChain, RAG) LAST
2. NEVER put an advanced topic before its prerequisites
3. If a user knows related skills (transfer_bonus > 0), reduce estimated time
4. If prerequisites are already known, skip them but mention it
5. Include specific, actionable resources (real courses, docs, tutorials)
6. Each step should be concrete and achievable
7. For each skill, include a "depends_on" field listing which skills in this plan should be learned first

Return ONLY valid JSON:
{{
  "learning_plan": [
    {{
      "skill": "Skill Name",
      "current_level": "none|beginner|intermediate",
      "target_level": "intermediate|advanced|expert",
      "reason": "Why this skill matters for the target role",
      "time_estimate": "2-3 weeks",
      "depends_on": ["Prerequisite Skill 1"],
      "steps": [
        "Step 1: specific action",
        "Step 2: specific action",
        "Step 3: build a project using this skill"
      ],
      "resources": [
        {{
          "title": "Resource name",
          "url": "https://example.com",
          "type": "course|article|video|book|practice"
        }}
      ]
    }}
  ]
}}

IMPORTANT: Order the array so that foundational skills come FIRST and advanced skills come LAST.
For example: Python → Machine Learning → Deep Learning → Generative AI → Agentic AI
Never put RAG or Agentic AI before ML fundamentals."""

    user_prompt = f"""Target Role: {data.role_type}

Skills to Learn/Improve:
{skill_context}

User's Known Skills:
{known_context}

Generate a personalized, ORDERED learning roadmap. Put foundational skills first and advanced skills last. 
Remember: the user already knows some things, so don't start from zero for related skills."""
    
    try:
        result = call_llm_json(system_prompt, user_prompt)
        plan = result.get("learning_plan", result if isinstance(result, list) else [])
        # CRITICAL: Sort the LLM output to enforce correct ordering
        plan = _sort_plan_output(plan)
        return {"learning_plan": plan}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning plan generation failed: {str(e)}")


# Tier map used for BOTH input sorting and output sorting
TIER_MAP = {
    # Tier 0: Foundations / Languages
    "python": 0, "javascript": 0, "java": 0, "c": 0, "c++": 0, "sql": 0,
    "html": 0, "css": 0, "mathematics": 0, "statistics": 0,
    # Tier 1: Frameworks / Tools / Databases
    "react": 1, "react.js": 1, "node.js": 1, "express.js": 1, "fastapi": 1,
    "django": 1, "flask": 1, "mongodb": 1, "postgresql": 1, "docker": 1,
    "git": 1, "rest api": 1, "rest apis": 1, "tailwind css": 1, "bootstrap": 1,
    "redux": 1, "typescript": 1, "next.js": 1, "software engineering": 1,
    # Tier 2: Data & ML Foundations
    "data structures & algorithms": 2, "data science": 2,
    "machine learning": 2, "ai/ml": 2,
    # Tier 3: Advanced ML/AI
    "deep learning": 3, "pytorch": 3, "tensorflow": 3,
    "natural language processing": 3, "computer vision": 3,
    # Tier 4: Generative AI
    "generative ai": 4, "llm": 4, "prompt engineering": 4, "openai api": 4,
    # Tier 5: GenAI Frameworks (LangChain first)
    "langchain": 5,
    # Tier 6: RAG & Advanced Frameworks
    "retrieval-augmented generation (rag)": 6, "rag": 6,
    "retrieval-augmented generation (rag) architectures": 6,
    "langgraph": 6, "crewai": 6, "autogen": 6,
    # Tier 7: Agentic AI (always last in the AI track)
    "agentic ai": 7,
    # Tier 8: Platform-specific / Misc (learn after core)
    "microsoft m365 copilot": 8, "azure openai service": 8,
    "power platform": 8, "azure certification": 8,
}


def _get_tier(skill_name: str) -> int:
    """Get the learning tier for a skill."""
    return TIER_MAP.get(skill_name.lower(), 4)  # Default to tier 4


def _topological_sort(skills: list[dict]) -> list[dict]:
    """Sort skills so prerequisites come before dependent skills."""
    return sorted(skills, key=lambda s: (_get_tier(s["name"]), s["priority"] != "high"))


def _sort_plan_output(plan: list[dict]) -> list[dict]:
    """Sort the LLM-generated learning plan by correct learning order."""
    return sorted(plan, key=lambda item: _get_tier(item.get("skill", "")))
