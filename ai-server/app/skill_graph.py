"""Skill transfer / adjacency graph for realistic learning recommendations."""

SKILL_GRAPH = {
    # Frontend
    "javascript": ["typescript", "node.js", "react", "vue.js", "angular"],
    "typescript": ["javascript", "node.js", "react", "angular"],
    "html": ["css", "javascript", "react"],
    "css": ["html", "tailwind css", "sass", "bootstrap"],
    "react": ["next.js", "react native", "redux", "typescript", "javascript"],
    "next.js": ["react", "vercel", "server-side rendering"],
    "vue.js": ["nuxt.js", "javascript", "typescript"],
    "angular": ["typescript", "rxjs", "javascript"],
    "tailwind css": ["css", "html"],
    
    # Backend
    "node.js": ["express.js", "javascript", "typescript", "nest.js", "mongodb"],
    "express.js": ["node.js", "rest api", "middleware"],
    "python": ["fastapi", "django", "flask", "machine learning", "data science"],
    "fastapi": ["python", "rest api", "pydantic"],
    "django": ["python", "rest api", "postgresql"],
    "flask": ["python", "rest api"],
    "java": ["spring boot", "kotlin", "android"],
    "spring boot": ["java", "microservices", "rest api"],
    "c#": [".net", "asp.net", "unity"],
    "go": ["microservices", "docker", "kubernetes"],
    "rust": ["systems programming", "webassembly"],
    
    # Database
    "mongodb": ["mongoose", "node.js", "nosql"],
    "postgresql": ["sql", "prisma", "database design"],
    "mysql": ["sql", "database design"],
    "redis": ["caching", "node.js", "python"],
    "sql": ["postgresql", "mysql", "database design"],
    "prisma": ["postgresql", "typescript", "node.js"],
    
    # DevOps
    "docker": ["kubernetes", "docker compose", "ci/cd"],
    "kubernetes": ["docker", "helm", "microservices"],
    "aws": ["cloud computing", "ec2", "s3", "lambda"],
    "git": ["github", "ci/cd", "version control"],
    "ci/cd": ["github actions", "jenkins", "docker"],
    
    # AI/ML
    "machine learning": ["python", "tensorflow", "pytorch", "scikit-learn", "deep learning"],
    "deep learning": ["machine learning", "tensorflow", "pytorch", "natural language processing"],
    "tensorflow": ["python", "deep learning", "keras"],
    "pytorch": ["python", "deep learning"],
    "natural language processing": ["python", "transformers", "machine learning", "deep learning"],
    "langchain": ["python", "llm", "openai api", "rag"],
    "langgraph": ["langchain", "python", "agentic ai"],
    "crewai": ["python", "langchain", "agentic ai"],
    "autogen": ["python", "langchain", "agentic ai"],
    "llm": ["langchain", "prompt engineering", "openai api"],
    "generative ai": ["deep learning", "llm", "natural language processing", "python"],
    "agentic ai": ["langchain", "langgraph", "generative ai", "python", "rag"],
    "rag": ["langchain", "llm", "vector databases", "python"],
    "ai/ml": ["python", "machine learning", "deep learning"],
    "data science": ["python", "statistics", "machine learning", "sql"],
    "prompt engineering": ["llm", "openai api"],
    "openai api": ["python", "rest api"],
    
    # Mobile
    "react native": ["react", "javascript", "mobile development"],
    "flutter": ["dart", "mobile development"],
    "swift": ["ios", "mobile development"],
    "kotlin": ["android", "java", "mobile development"],
    
    # General
    "rest api": ["http", "json", "api design"],
    "graphql": ["rest api", "apollo", "api design"],
    "microservices": ["docker", "kubernetes", "api design"],
    "system design": ["microservices", "database design", "scalability"],
}


def get_related_skills(skill: str) -> list[str]:
    """Get skills that are related/transferable from a given skill."""
    skill_lower = skill.lower()
    return SKILL_GRAPH.get(skill_lower, [])


def get_transfer_bonus(known_skills: list[str], target_skill: str) -> float:
    """
    Calculate how much easier a target skill is based on known skills.
    Returns a float 0.0-1.0 representing difficulty reduction.
    """
    target_lower = target_skill.lower()
    known_lower = [s.lower() for s in known_skills]
    
    related = SKILL_GRAPH.get(target_lower, [])
    if not related:
        return 0.0
    
    overlap = sum(1 for r in related if r in known_lower)
    return min(overlap / len(related), 0.8)  # Cap at 80% reduction


def get_learning_prerequisites(skill: str) -> list[str]:
    """Get recommended prerequisites for learning a skill."""
    prereqs = {
        "react": ["javascript", "html", "css"],
        "next.js": ["react", "javascript"],
        "node.js": ["javascript"],
        "express.js": ["node.js", "javascript"],
        "fastapi": ["python"],
        "django": ["python"],
        "typescript": ["javascript"],
        "mongodb": ["database basics"],
        "postgresql": ["sql"],
        "docker": ["command line", "linux basics"],
        "kubernetes": ["docker"],
        "machine learning": ["python", "statistics"],
        "deep learning": ["machine learning", "python"],
        "langchain": ["python", "llm basics"],
        "langgraph": ["langchain", "python"],
        "crewai": ["langchain", "python"],
        "autogen": ["langchain", "python"],
        "react native": ["react", "javascript"],
        "redux": ["react", "javascript"],
        "graphql": ["rest api", "javascript"],
        "generative ai": ["deep learning", "python", "natural language processing"],
        "agentic ai": ["generative ai", "langchain", "python"],
        "rag": ["langchain", "python", "vector databases"],
        "ai/ml": ["python", "mathematics", "statistics"],
        "data science": ["python", "sql", "statistics"],
        "natural language processing": ["machine learning", "python"],
        "prompt engineering": ["llm basics"],
        "openai api": ["python", "rest api"],
    }
    return prereqs.get(skill.lower(), [])
