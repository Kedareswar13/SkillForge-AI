<![CDATA[<div align="center">

# ⚡ SkillForge AI

### AI-Powered Skill Assessment & Personalised Learning Plan Agent

*A resume tells you what someone claims to know — not how well they actually know it.*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-6366f1?style=for-the-badge)](https://skillforge-ai.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-06b6d4?style=for-the-badge)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)

</div>

---

## 📌 Problem Statement

> **AI-Powered Skill Assessment & Personalised Learning Plan Agent**
>
> Build an agent that takes a Job Description and a candidate's resume, conversationally assesses real proficiency on each required skill, identifies gaps, and generates a personalised learning plan focused on adjacent skills the candidate can realistically acquire — with curated resources and time estimates.

---

## 🎯 What SkillForge AI Does

SkillForge AI is an end-to-end intelligent platform that goes far beyond keyword matching. It:

1. **Parses Resumes with Evidence Mapping** — Extracts skills from projects, experience, and education sections; assigns confidence scores based on real evidence strength (not just listing).
2. **Extracts JD Requirements** — Accepts Job Descriptions via text paste, PDF upload, or direct URL scraping (Naukri, LinkedIn, etc.) using Jina Reader.
3. **Performs Gap Analysis** — Compares candidate skills against JD requirements using an LLM, categorizing them into matches, partial matches, missing skills, and weak areas.
4. **Conducts Adaptive Skill Assessments** — A conversational, multi-round assessment engine that dynamically adjusts question difficulty based on candidate answers (beginner → intermediate → advanced → expert).
5. **Generates Personalised Learning Roadmaps** — Builds a topologically-sorted learning plan based on a custom Skill Adjacency Graph that considers transferable skills and realistic time estimates.
6. **Provides Mock Interviews** — Generates role-specific mock interview questions with instant AI-powered feedback, scoring, and model answers.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
│  ┌─────────┐ ┌──────┐ ┌──────┐ ┌────────────┐ ┌───────┐ ┌─────┐│
│  │Dashboard│ │Resume│ │  JD  │ │  Analysis  │ │Assess.│ │Road.││
│  │         │ │Upload│ │Input │ │  Gap View  │ │ Chat  │ │ Map ││
│  └─────────┘ └──────┘ └──────┘ └────────────┘ └───────┘ └─────┘│
│  ┌───────────┐ ┌────────────┐                                    │
│  │Mock       │ │  Profile   │     Port 3000 (Vite Dev Proxy)     │
│  │Interview  │ │  + PDF     │                                    │
│  └───────────┘ └────────────┘                                    │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST API (Axios + JWT Auth)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│               BACKEND (Node.js + Express + Prisma)               │
│                         Port 5000                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐          │
│  │Auth (JWT)│ │ Resume   │ │   JD     │ │  Analyze   │          │
│  │Signup/   │ │ Upload   │ │ Process  │ │  Gap API   │          │
│  │Login     │ │ + OCR    │ │ + Scrape │ │            │          │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │Assessment│ │ Learning │ │  Mock    │                          │
│  │Start/    │ │ Plan Gen │ │Interview │  ← Orchestration Layer  │
│  │Answer    │ │ + Valid. │ │ Gen/Eval │                          │
│  └──────────┘ └──────────┘ └──────────┘                         │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Internal HTTP (Axios)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              AI SERVER (Python FastAPI)                           │
│                      Port 8000                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐        │
│  │ Resume Parse │ │  JD Parse    │ │   Gap Analysis    │        │
│  │ + OCR        │ │  + Scraping  │ │   (LLM-based)     │        │
│  │ (pdfplumber  │ │  (Jina/BS4)  │ │                   │        │
│  │  + Tesseract)│ │              │ │                   │        │
│  └──────────────┘ └──────────────┘ └───────────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐        │
│  │  Adaptive    │ │  Learning    │ │  Mock Interview   │        │
│  │  Assessment  │ │  Plan Gen    │ │  Gen + Evaluate   │        │
│  │  Q&A Engine  │ │  + Skill     │ │                   │        │
│  │              │ │    Graph     │ │                   │        │
│  └──────────────┘ └──────────────┘ └───────────────────┘        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐      │
│  │           LLM Helper (Groq + Ollama Failsafe)          │      │
│  │  Groq API (llama-3.3-70b) ──fail──▶ Local Ollama       │      │
│  │  + JSON Extraction  + Auto-Retry on Parse Failure       │      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  PostgreSQL 18 (Docker Volume)                   │
│  ┌──────┐  ┌─────────┐  ┌────────────┐                          │
│  │ User │  │ Profile  │  │ Assessment │   Managed by Prisma ORM  │
│  │      │  │ (skills, │  │ (questions,│                          │
│  │      │  │  gaps,   │  │  scores,   │                          │
│  │      │  │  plans)  │  │  levels)   │                          │
│  └──────┘  └─────────┘  └────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Scoring & Logic

### 1. Resume Skill Extraction (Evidence-Based)
Skills are NOT just keyword-matched. The AI analyzes the **full resume context** and assigns:

| Evidence Source | Strength | Confidence Impact |
|---|---|---|
| Listed in Skills section only | `weak` | 20–40% |
| Used in 1 project | `medium` | 40–65% |
| Multiple projects + work experience | `strong` | 65–95% |

Each skill gets a `level` (beginner / intermediate / advanced / expert) inferred from evidence depth.

### 2. Gap Analysis (LLM-Powered)
The Groq LLM compares resume skills against JD requirements:
- **Matches** — Skills the candidate clearly has at a good level
- **Partial Matches** — Skills present but at a lower level than needed
- **Missing** — Skills completely absent from the resume
- **Weak Areas** — Skills present but with low confidence/evidence

> **Critical Rule:** Categories are mutually exclusive — a skill can only appear in ONE category.

**Overall Readiness Score** = Integer 0–100, calculated by the LLM based on weighted skill coverage.

### 3. Adaptive Assessment Engine
The assessment dynamically adjusts difficulty using a 4-tier system:

```
Beginner → Conceptual / definition questions
Intermediate → Practical / code / scenario questions
Advanced → Architecture / optimization / trade-off questions
Expert → System-level / edge-case / production debugging questions
```

**Level Adjustment Rules:**
- Score 0–1/5 → Move DOWN one level
- Score 2–3/5 → Stay at current level
- Score 4–5/5 → Move UP one level

Each skill gets 2–3 questions before moving to the next. The final confidence score for each skill is the average across all questions.

### 4. Learning Plan Generation (Skill Adjacency Graph)
The system uses a **custom Skill Transfer Graph** with 70+ skill nodes and weighted edges:

```python
# Example: A React developer learning Vue.js gets a transfer bonus
transfer_bonus = known_overlapping_skills / total_related_skills
# Capped at 80% time reduction
```

**Topological Sorting** ensures foundations are learned first:
```
Tier 0: Languages (Python, JavaScript)
Tier 1: Frameworks (React, FastAPI)
Tier 2: Data Science / ML
Tier 3: Deep Learning
Tier 4: Generative AI
Tier 5: LangChain
Tier 6: RAG / Advanced Frameworks
Tier 7: Agentic AI
```

### 5. Learning Validation
Each resource in the learning plan can be **validated** — the system generates a focused question on that specific topic. Score ≥ 3/5 marks the resource as completed and updates progress.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, React Router 7, Recharts, Lucide Icons, Framer Motion |
| **Backend** | Node.js 20, Express 4, Prisma ORM 5, JWT Auth, Multer |
| **AI Server** | Python 3.10, FastAPI, pdfplumber, Tesseract OCR, BeautifulSoup |
| **LLM** | Groq API (Llama 3.3 70B) with local Ollama failsafe |
| **Database** | PostgreSQL 16 (Alpine) |
| **Infra** | Docker Compose, multi-container orchestration |
| **External** | Jina Reader (URL scraping for protected job sites) |

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A free [Groq API Key](https://console.groq.com/keys)

### Steps

**1. Clone the repository:**
```bash
git clone https://github.com/Kedareswar13/SkillForge-AI.git
cd SkillForge-AI
```

**2. Create the AI server environment file:**
```bash
# Create ai-server/.env
echo GROQ_API_KEY=your_groq_api_key_here > ai-server/.env
```

**3. Launch with Docker Compose:**
```bash
docker-compose up --build
```

**4. Open the app:**
```
http://localhost:3000
```

That's it! Docker handles PostgreSQL, the backend, AI server, and frontend — all in one command.

### Service Ports

| Service | Port | Description |
|---|---|---|
| Frontend | `3000` | React application (Vite dev server) |
| Backend | `5000` | Express API + Prisma ORM |
| AI Server | `8000` | FastAPI (LLM + OCR pipeline) |
| PostgreSQL | `5432` | Database (auto-provisioned) |

---

## 📂 Project Structure

```
SkillForge-AI/
├── docker-compose.yml          # Multi-container orchestration
├── .gitignore
├── README.md
│
├── frontend/                   # React + Vite
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api.js              # Axios API layer
│       ├── context/AuthContext.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── ProtectedRoute.jsx
│       └── pages/
│           ├── Dashboard.jsx   # Stats, charts, journey tracker
│           ├── ResumeUpload.jsx
│           ├── JDInput.jsx     # Text / PDF / URL input
│           ├── Analysis.jsx    # Gap analysis + readiness score
│           ├── Assessment.jsx  # Adaptive Q&A engine
│           ├── LearningRoadmap.jsx  # Ordered learning plan
│           ├── MockInterview.jsx
│           ├── ProfilePage.jsx # Skill profile + PDF viewer
│           └── Results.jsx     # Assessment results
│
├── backend/                    # Node.js + Express
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma      # User, Profile, Assessment models
│   └── src/
│       ├── index.js            # Express server entry
│       ├── lib/prisma.js       # Prisma client singleton
│       ├── middleware/auth.js  # JWT verification
│       └── routes/
│           ├── auth.js         # Signup, Login, Me
│           ├── resume.js       # Upload + forward to AI
│           ├── jd.js           # JD process + URL extraction
│           ├── analyze.js      # Gap analysis orchestrator
│           ├── assessment.js   # Adaptive assessment logic
│           ├── learning.js     # Learning plan CRUD
│           ├── mockInterview.js
│           └── profile.js      # Profile + resume PDF
│
├── ai-server/                  # Python FastAPI
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   └── app/
│       ├── llm_helper.py       # Groq + Ollama dual-provider
│       ├── pdf_utils.py        # pdfplumber + Tesseract OCR
│       ├── skill_graph.py      # Adjacency graph + transfer logic
│       └── routes/
│           ├── resume_routes.py     # Parse + skill extraction
│           ├── jd_routes.py         # JD parsing + URL scraping
│           ├── analyze_routes.py    # Gap analysis prompt
│           ├── assessment_routes.py # Adaptive Q&A + eval
│           ├── learning_routes.py   # Roadmap generation
│           └── mock_interview_routes.py
```

---

## 📊 Sample Inputs & Outputs

### Sample Input: Resume
A B.Tech CSE student's resume with:
- **Skills:** Java, C, C++, Python, HTML, CSS, JavaScript, React.js, Node.js, MongoDB, SQL, REST APIs, Redux, Tailwind CSS
- **Experience:** Agentic AI Eval Engineer Intern at RealPage India, Web Dev Intern at Bharat Intern
- **Projects:** MERN stack applications, LeetCode/CodeChef/Codeforces competitive programming

### Sample Input: Job Description
> **Agentic AI Developer** — Requires: Agentic AI, LangChain, LangGraph, CrewAI, AutoGen, RAG architectures, Azure OpenAI Service, Python, Machine Learning, Data Science

### Sample Output: Gap Analysis

```json
{
  "gapAnalysis": {
    "matches": ["Python"],
    "partialMatches": [],
    "missing": [
      "Agentic AI", "AI Copilots", "LangChain", "LangGraph",
      "AutoGen", "RAG architectures", "Azure OpenAI Service",
      "Machine Learning", "Data Science"
    ],
    "weakAreas": []
  },
  "overallReadiness": 5,
  "recommendations": [
    "Focus on learning Agentic AI, AI, and Machine Learning as they are critical for this role",
    "Develop skills in Data Science, LangChain, and LangGraph to improve overall readiness",
    "Familiarize yourself with Azure OpenAI Service and Software Engineering"
  ]
}
```

### Sample Output: Adaptive Assessment Question

```json
{
  "question": "Explain the difference between a list and a tuple in Python. When would you use one over the other?",
  "expected_key_points": [
    "Lists are mutable, tuples are immutable",
    "Tuples are faster for iteration",
    "Tuples can be used as dictionary keys"
  ],
  "difficulty": "beginner"
}
```

### Sample Output: Learning Plan Item

```json
{
  "skill": "Machine Learning",
  "current_level": "none",
  "target_level": "intermediate",
  "reason": "Core prerequisite for AI/ML roles",
  "time_estimate": "4-6 weeks",
  "depends_on": ["Python"],
  "steps": [
    "Complete Andrew Ng's ML Specialization on Coursera",
    "Build 3 end-to-end ML projects with scikit-learn",
    "Study feature engineering and model evaluation"
  ],
  "resources": [
    {
      "title": "Machine Learning Specialization - Coursera",
      "url": "https://www.coursera.org/specializations/machine-learning",
      "type": "course"
    }
  ]
}
```

---

## 🌐 Deployment

The application is deployed using **Render** (free tier) with the following setup:

| Service | Platform | Type |
|---|---|---|
| Frontend | Render | Static Site / Web Service |
| Backend | Render | Web Service (Docker) |
| AI Server | Render | Web Service (Docker) |
| Database | Render | PostgreSQL (Managed) |

**Live URL:** [https://skillforge-ai.onrender.com](https://skillforge-ai.onrender.com)

---

## 🔑 Environment Variables

| Variable | Service | Description |
|---|---|---|
| `GROQ_API_KEY` | AI Server | Groq API key for LLM access |
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | Secret key for JWT signing |
| `JWT_EXPIRE` | Backend | Token expiration (e.g., `7d`) |
| `FASTAPI_URL` | Backend | AI server internal URL |
| `PORT` | Backend | Express server port |

---

## 🎬 Demo Video

📹 **Watch the full walkthrough:** [Demo Video Link](https://youtu.be/YOUR_VIDEO_LINK)

The demo covers:
1. User registration and login
2. Resume upload with OCR-based skill extraction
3. Job description input (text + URL scraping from Naukri)
4. AI-powered gap analysis with readiness scoring
5. Adaptive skill assessment with dynamic difficulty
6. Personalised learning roadmap generation
7. Mock interview with instant AI feedback

---

## 👨‍💻 Author

**Pattapu Kedareswar**
- GitHub: [@Kedareswar13](https://github.com/Kedareswar13)
- Email: kedareswar.pattapu@gmail.com

---

## 📄 License

This project is built for the **Deccan AI Catalyst Hackathon 2026**.

---

<div align="center">

**Built with ❤️ for the Deccan AI Catalyst Hackathon**

*SkillForge AI — Know what you truly know.*

</div>
]]>
