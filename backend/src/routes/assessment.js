const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// POST /api/assessment/start
router.post('/start', auth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const skills = Array.isArray(profile?.skills) ? profile.skills : [];
    if (!skills.length) return res.status(400).json({ error: 'Please upload a resume first' });

    const gapAnalysis = profile.gapAnalysis || {};
    const jdSkills = profile.jdSkills || {};
    const skillsToAssess = [];

    if (gapAnalysis.missing) skillsToAssess.push(...gapAnalysis.missing.slice(0, 3));
    if (gapAnalysis.weakAreas) skillsToAssess.push(...gapAnalysis.weakAreas.slice(0, 2));
    const topSkills = [...skills].sort((a, b) => b.confidence - a.confidence).slice(0, 3).map(s => s.name);
    skillsToAssess.push(...topSkills);
    const uniqueSkills = [...new Set(skillsToAssess)].slice(0, 8);

    const firstSkill = uniqueSkills[0];
    const inferredLevel = skills.find(s => s.name.toLowerCase() === firstSkill.toLowerCase())?.level || 'beginner';

    const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/assessment/question`, {
      skill: firstSkill, level: inferredLevel, role_type: jdSkills.roleType || '', previous_questions: []
    }, { timeout: 30000 });

    const assessment = await prisma.assessment.create({
      data: {
        userId: req.userId,
        skillsToAssess: uniqueSkills,
        currentSkillIndex: 0,
        currentLevel: inferredLevel,
        questions: [{ skill: firstSkill, level: inferredLevel, question: aiRes.data.question }]
      }
    });

    const currentActivity = Array.isArray(profile?.recentActivity) ? profile.recentActivity : [];
    await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        recentActivity: [...currentActivity, { type: 'assessment_completed', description: 'Started skill assessment', timestamp: new Date().toISOString() }]
      }
    });

    res.json({ assessmentId: assessment.id, currentSkill: firstSkill, currentLevel: inferredLevel, question: aiRes.data.question, totalSkills: uniqueSkills.length, currentSkillIndex: 0 });
  } catch (error) {
    console.error('Assessment start error:', error.message);
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// POST /api/assessment/answer
router.post('/answer', auth, async (req, res) => {
  try {
    const { assessmentId, answer } = req.body;
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment || assessment.userId !== req.userId) return res.status(404).json({ error: 'Assessment not found' });

    const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
    const finalScores = Array.isArray(assessment.finalScores) ? assessment.finalScores : [];
    const skillsToAssess = Array.isArray(assessment.skillsToAssess) ? assessment.skillsToAssess : [];
    const currentQuestion = questions[questions.length - 1];

    const evalRes = await axios.post(`${process.env.FASTAPI_URL}/api/assessment/evaluate`, {
      skill: currentQuestion.skill, level: currentQuestion.level, question: currentQuestion.question, answer
    }, { timeout: 30000 });

    const { score, reasoning, updated_level } = evalRes.data;
    currentQuestion.answer = answer;
    currentQuestion.score = score;
    currentQuestion.reasoning = reasoning;
    currentQuestion.updatedLevel = updated_level;
    currentQuestion.answeredAt = new Date().toISOString();

    const currentSkill = skillsToAssess[assessment.currentSkillIndex];
    const questionsForSkill = questions.filter(q => q.skill === currentSkill).length;
    let isComplete = false;
    let nextQuestion = null;
    let newSkillIndex = assessment.currentSkillIndex;

    const shouldMoveOn = questionsForSkill >= 3 || (score >= 4 && questionsForSkill >= 2);

    if (shouldMoveOn) {
      const skillQuestions = questions.filter(q => q.skill === currentSkill);
      const avgScore = skillQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / skillQuestions.length;
      finalScores.push({ skill: currentSkill, level: updated_level, confidence: Math.round(avgScore * 20), evidenceSummary: `Answered ${questionsForSkill} questions, avg ${avgScore.toFixed(1)}/5` });

      newSkillIndex = assessment.currentSkillIndex + 1;

      if (newSkillIndex >= skillsToAssess.length) {
        isComplete = true;
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: { status: 'completed', completedAt: new Date(), questions, finalScores, currentSkillIndex: newSkillIndex }
        });

        // Update profile skills with assessment results
        const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
        const profileSkills = Array.isArray(profile?.skills) ? [...profile.skills] : [];
        for (const fs of finalScores) {
          const idx = profileSkills.findIndex(s => s.name.toLowerCase() === fs.skill.toLowerCase());
          if (idx !== -1) {
            profileSkills[idx].assessmentScore = fs.confidence;
            profileSkills[idx].level = fs.level;
            profileSkills[idx].confidence = Math.round((profileSkills[idx].confidence + fs.confidence) / 2);
          } else {
            profileSkills.push({ name: fs.skill, level: fs.level, confidence: fs.confidence, assessmentScore: fs.confidence, evidence: [{ source: 'assessment', detail: fs.evidenceSummary, strength: 'strong' }] });
          }
        }
        const currentActivity = Array.isArray(profile?.recentActivity) ? profile.recentActivity : [];
        await prisma.profile.update({
          where: { userId: req.userId },
          data: {
            skills: profileSkills,
            recentActivity: [...currentActivity, { type: 'assessment_completed', description: `Completed assessment for ${skillsToAssess.length} skills`, timestamp: new Date().toISOString() }]
          }
        });
      } else {
        const nextSkill = skillsToAssess[newSkillIndex];
        const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
        const profileSkills = Array.isArray(profile?.skills) ? profile.skills : [];
        const nextLevel = profileSkills.find(s => s.name.toLowerCase() === nextSkill.toLowerCase())?.level || 'beginner';

        const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/assessment/question`, {
          skill: nextSkill, level: nextLevel, role_type: profile.jdSkills?.roleType || '', previous_questions: []
        }, { timeout: 30000 });

        questions.push({ skill: nextSkill, level: nextLevel, question: aiRes.data.question });
        nextQuestion = { skill: nextSkill, level: nextLevel, question: aiRes.data.question, currentSkillIndex: newSkillIndex };

        await prisma.assessment.update({
          where: { id: assessmentId },
          data: { questions, finalScores, currentSkillIndex: newSkillIndex, currentLevel: nextLevel }
        });
      }
    } else {
      const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
      const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/assessment/question`, {
        skill: currentSkill, level: updated_level, role_type: profile.jdSkills?.roleType || '',
        previous_questions: questions.filter(q => q.skill === currentSkill).map(q => q.question)
      }, { timeout: 30000 });

      questions.push({ skill: currentSkill, level: updated_level, question: aiRes.data.question });
      nextQuestion = { skill: currentSkill, level: updated_level, question: aiRes.data.question, currentSkillIndex: assessment.currentSkillIndex };

      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { questions, currentLevel: updated_level }
      });
    }

    res.json({ evaluation: { score, reasoning, updatedLevel: updated_level }, isComplete, nextQuestion, totalSkills: skillsToAssess.length, finalScores: isComplete ? finalScores : undefined });
  } catch (error) {
    console.error('Assessment answer error:', error.message);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// GET /api/assessment/history
router.get('/history', auth, async (req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { userId: req.userId },
      orderBy: { startedAt: 'desc' },
      take: 10
    });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessment history' });
  }
});

module.exports = router;
