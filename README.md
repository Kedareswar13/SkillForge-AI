<div align="center">

# ⚡ SkillForge AI
### AI-Powered Skill Assessment & Personalised Learning Agent

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-6366f1?style=for-the-badge)](https://skill-forge-ai-three.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-06b6d4?style=for-the-badge)](LICENSE)

*A resume tells you what someone claims to know — not how well they actually know it. SkillForge proves it.*

</div>

---

## 🎯 What is SkillForge AI?

SkillForge AI is an intelligent platform built for the **Deccan AI Catalyst Hackathon 2026**. 

Instead of just matching keywords, it takes a candidate's Resume and a Job Description, conducts a conversational AI interview to test their *actual* knowledge, and generates a step-by-step personalized learning roadmap to fill in the gaps.

## ✨ Key Features

1. **📄 Smart Resume Parsing:** Extracts skills and looks for real evidence (e.g., used in projects vs. just listed).
2. **🏢 Job Description Scraping:** Paste text, upload a PDF, or just paste a Naukri/LinkedIn URL to extract requirements.
3. **📊 Gap Analysis:** Instantly compares the candidate's skills against the JD and calculates a Readiness Score.
4. **🧠 Adaptive AI Assessment:** A conversational interview that adjusts difficulty based on how well you answer (Beginner → Expert).
5. **🗺️ Personalized Roadmaps:** Generates an ordered, realistic learning plan with time estimates and curated resources.
6. **🎤 Mock Interviews:** Practice for the real thing with AI-generated role-specific questions and instant feedback.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Recharts, Framer Motion
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL
- **AI Server:** Python, FastAPI, pdfplumber (OCR)
- **AI Models:** Groq API (Llama 3.3 70B) with local Ollama failsafe
- **Infrastructure:** Docker Compose

---

## 🚀 How to Run Locally

You can run the entire application (Frontend, Backend, AI Server, and Database) with just one command using Docker.

### Prerequisites
- Docker Desktop installed
- A free [Groq API Key](https://console.groq.com/keys)

### Setup Steps

**1. Clone the repository:**
```bash
git clone https://github.com/Kedareswar13/SkillForge-AI.git
cd SkillForge-AI
```

**2. Add your API Key:**
Open the `ai-server/` folder, create a file named `.env`, and add your Groq API key:
```env
GROQ_API_KEY=gsk_your_api_key_here
```

**3. Run the application:**
```bash
docker-compose up --build
```

**4. Open the app:**
Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 👨‍💻 Built By
**Pattapu Kedareswar**
- GitHub: [@Kedareswar13](https://github.com/Kedareswar13)
- Built for the Deccan AI Catalyst Hackathon
