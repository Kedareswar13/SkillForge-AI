from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.llm_helper import call_llm_json

router = APIRouter()

# ════════════════════════════════════════════════════════════════════
# Alias map — handles common naming variations for the same skill
# ════════════════════════════════════════════════════════════════════
SKILL_ALIASES = {
    "react": ["react.js", "reactjs", "react js"],
    "node.js": ["nodejs", "node js", "node"],
    "express.js": ["expressjs", "express js", "express"],
    "next.js": ["nextjs", "next js"],
    "vue.js": ["vuejs", "vue js", "vue"],
    "angular": ["angularjs", "angular.js"],
    "typescript": ["ts"],
    "javascript": ["js", "es6", "ecmascript"],
    "python": ["python3", "python 3"],
    "mongodb": ["mongo", "mongo db"],
    "postgresql": ["postgres", "psql"],
    "mysql": ["my sql"],
    "docker": ["docker compose", "docker-compose"],
    "kubernetes": ["k8s"],
    "aws": ["amazon web services"],
    "gcp": ["google cloud", "google cloud platform"],
    "azure": ["microsoft azure"],
    "machine learning": ["ml"],
    "deep learning": ["dl"],
    "natural language processing": ["nlp"],
    "artificial intelligence": ["ai"],
    "ai/ml": ["ai & ml", "ai and ml", "machine learning / ai"],
    "ci/cd": ["cicd", "ci cd", "continuous integration"],
    "rest api": ["rest apis", "restful api", "restful apis", "rest"],
    "graphql": ["graph ql"],
    "tailwind css": ["tailwindcss", "tailwind"],
    "sass": ["scss"],
    "langchain": ["lang chain"],
    "langgraph": ["lang graph"],
    "tensorflow": ["tf"],
    "pytorch": ["torch"],
    "scikit-learn": ["sklearn", "scikit learn"],
    "pandas": ["pd"],
    "numpy": ["np"],
    "html": ["html5"],
    "css": ["css3"],
    "c++": ["cpp", "c plus plus"],
    "c#": ["csharp", "c sharp"],
    ".net": ["dotnet", "dot net"],
    "spring boot": ["springboot", "spring-boot"],
    "react native": ["react-native"],
    "flutter": ["flutter sdk"],
    "generative ai": ["gen ai", "genai"],
    "agentic ai": ["ai agents", "autonomous agents"],
    "rag": ["retrieval augmented generation", "retrieval-augmented generation"],
    "prompt engineering": ["prompt design"],
    "llm": ["large language model", "large language models"],
    "openai api": ["openai", "chatgpt api"],
}

# Build reverse lookup: alias → canonical name
_ALIAS_REVERSE = {}
for canonical, aliases in SKILL_ALIASES.items():
    _ALIAS_REVERSE[canonical] = canonical
    for alias in aliases:
        _ALIAS_REVERSE[alias] = canonical


def _normalize(skill: str) -> str:
    """Normalize a skill name to its canonical form."""
    s = skill.strip().lower()
    return _ALIAS_REVERSE.get(s, s)


def _similarity(a: str, b: str) -> float:
    """Simple token-overlap similarity (Jaccard) — fast and effective."""
    tokens_a = set(a.lower().split())
    tokens_b = set(b.lower().split())
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return len(intersection) / len(union)


def _programmatic_gap_analysis(resume_skills: list[dict], jd_required: list[str], jd_preferred: list[str]) -> dict:
    """
    Deterministic, algorithmic gap analysis with fuzzy matching + alias resolution.
    Runs BEFORE the LLM to give it pre-computed signals.
    """
    # Build normalized resume skill map
    resume_map = {}  # canonical_name -> skill_data
    for s in resume_skills:
        canonical = _normalize(s["name"])
        # Keep the one with higher confidence if duplicate
        if canonical not in resume_map or s.get("confidence", 0) > resume_map[canonical].get("confidence", 0):
            resume_map[canonical] = s

    matches = []
    partial_matches = []
    missing = []
    weak_areas = []

    all_jd = [(skill, "required") for skill in jd_required] + [(skill, "preferred") for skill in jd_preferred]

    for jd_skill, priority in all_jd:
        jd_norm = _normalize(jd_skill)

        # Direct match (after alias resolution)
        if jd_norm in resume_map:
            rs = resume_map[jd_norm]
            conf = rs.get("confidence", 0)
            level = rs.get("level", "beginner")

            if level in ("advanced", "expert") and conf >= 60:
                matches.append(jd_skill)
            elif level == "intermediate" and conf >= 40:
                partial_matches.append(jd_skill)
            elif conf < 40 or level == "beginner":
                weak_areas.append(jd_skill)
            else:
                partial_matches.append(jd_skill)
            continue

        # Fuzzy match — check similarity against all resume skills
        best_sim = 0.0
        best_skill = None
        for canonical, rs in resume_map.items():
            sim = _similarity(jd_norm, canonical)
            # Also check original name
            sim2 = _similarity(jd_skill.lower(), rs["name"].lower())
            max_sim = max(sim, sim2)
            if max_sim > best_sim:
                best_sim = max_sim
                best_skill = rs

        if best_sim >= 0.6 and best_skill:
            # Fuzzy match found
            conf = best_skill.get("confidence", 0)
            level = best_skill.get("level", "beginner")
            if level in ("advanced", "expert") and conf >= 60:
                matches.append(jd_skill)
            elif conf >= 30:
                partial_matches.append(jd_skill)
            else:
                weak_areas.append(jd_skill)
        else:
            # No match at all
            missing.append(jd_skill)

    # Calculate algorithmic readiness
    total = len(jd_required) if jd_required else 1
    match_score = sum(1 for m in matches if m in jd_required) * 1.0
    partial_score = sum(1 for p in partial_matches if p in jd_required) * 0.5
    weak_score = sum(1 for w in weak_areas if w in jd_required) * 0.2
    algo_readiness = int(min(100, ((match_score + partial_score + weak_score) / total) * 100))

    return {
        "algo_matches": matches,
        "algo_partial": partial_matches,
        "algo_missing": missing,
        "algo_weak": weak_areas,
        "algo_readiness": algo_readiness,
    }


class GapAnalysisInput(BaseModel):
    resume_skills: list[dict]
    jd_required: list[str]
    jd_preferred: list[str]
    role_type: str = ""


@router.post("/gap")
async def analyze_gap(data: GapAnalysisInput):
    """Compare resume skills against JD requirements.
    
    Uses a hybrid approach:
    1. Programmatic fuzzy matching + alias resolution (deterministic)
    2. LLM as a judge to refine edge cases (intelligent)
    """
    
    # ── Step 1: Algorithmic pre-analysis ──────────────────────────
    algo = _programmatic_gap_analysis(data.resume_skills, data.jd_required, data.jd_preferred)

    # ── Step 2: LLM refinement with algorithmic signals ──────────
    system_prompt = """You are a skill gap analyzer. Compare resume skills against job requirements.

You are given BOTH algorithmic pre-analysis results AND the raw data. Your job is to:
1. VALIDATE the algorithmic results — correct any mistakes
2. Handle nuanced cases the algorithm might miss (e.g., "System Design" implied by architecture experience)
3. Refine the overall_readiness score based on skill importance for the role

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
- Be precise: consider skill levels and evidence strength, not just names
- Use the algorithmic pre-analysis as a strong baseline — only override when you have clear reason to"""

    # Build skill summary
    skill_summary = "\n".join([
        f"- {s['name']}: level={s.get('level', 'unknown')}, confidence={s.get('confidence', 0)}%, evidence={len(s.get('evidence', []))} sources"
        for s in data.resume_skills
    ])

    user_prompt = f"""Role: {data.role_type}

Required JD Skills: {', '.join(data.jd_required)}
Preferred JD Skills: {', '.join(data.jd_preferred)}

Candidate's Skills:
{skill_summary}

--- ALGORITHMIC PRE-ANALYSIS (use as baseline) ---
Matches: {', '.join(algo['algo_matches']) or 'none'}
Partial Matches: {', '.join(algo['algo_partial']) or 'none'}
Missing: {', '.join(algo['algo_missing']) or 'none'}
Weak Areas: {', '.join(algo['algo_weak']) or 'none'}
Algorithmic Readiness: {algo['algo_readiness']}%

Validate and refine these results. Override only when you have clear evidence to do so."""

    try:
        result = call_llm_json(system_prompt, user_prompt)
        return {
            "matches": result.get("matches", algo["algo_matches"]),
            "partial_matches": result.get("partial_matches", algo["algo_partial"]),
            "missing": result.get("missing", algo["algo_missing"]),
            "weak_areas": result.get("weak_areas", algo["algo_weak"]),
            "overall_readiness": result.get("overall_readiness", algo["algo_readiness"]),
            "recommendations": result.get("recommendations", [])
        }
    except Exception as e:
        # Fallback: return pure algorithmic results if LLM fails
        print(f"⚠️ LLM gap analysis failed, using algorithmic fallback: {e}")
        return {
            "matches": algo["algo_matches"],
            "partial_matches": algo["algo_partial"],
            "missing": algo["algo_missing"],
            "weak_areas": algo["algo_weak"],
            "overall_readiness": algo["algo_readiness"],
            "recommendations": [f"Consider improving skills: {', '.join(algo['algo_missing'][:3])}"]
        }
