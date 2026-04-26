const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// POST /api/mock-interview/start
router.post('/start', auth, async (req, res) => {
  try {
    const { type = 'jd_based' } = req.body;
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(400).json({ error: 'Profile not found' });

    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const jdSkills = profile.jdSkills || {};
    const gapAnalysis = profile.gapAnalysis || {};

    const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/mock-interview/generate`, {
      type,
      skills: skills.map(s => ({ name: s.name, level: s.level })),
      role_type: jdSkills.roleType || '',
      jd_required: jdSkills.required || [],
      gap_areas: gapAnalysis.missing || []
    }, { timeout: 60000 });

    const currentActivity = Array.isArray(profile.recentActivity) ? profile.recentActivity : [];
    await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        recentActivity: [...currentActivity, { type: 'mock_interview', description: `Started ${type} mock interview`, timestamp: new Date().toISOString() }]
      }
    });

    res.json({ questions: aiRes.data.questions, type });
  } catch (error) {
    console.error('Mock interview error:', error.message);
    res.status(500).json({ error: 'Failed to generate mock interview' });
  }
});

// POST /api/mock-interview/evaluate
router.post('/evaluate', auth, async (req, res) => {
  try {
    const { question, answer, skill, level } = req.body;
    const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/mock-interview/evaluate`, { question, answer, skill, level }, { timeout: 30000 });
    res.json(aiRes.data);
  } catch (error) {
    console.error('Mock interview eval error:', error.message);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// POST /api/mock-interview/save
router.post('/save', auth, async (req, res) => {
  try {
    const { type, avgScore, evaluations } = req.body;
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(400).json({ error: 'Profile not found' });

    const currentHistory = Array.isArray(profile.mockInterviews) ? profile.mockInterviews : [];
    const currentActivity = Array.isArray(profile.recentActivity) ? profile.recentActivity : [];

    const newInterview = {
      type,
      avgScore,
      questionsCount: evaluations.length,
      date: new Date().toISOString()
    };

    await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        mockInterviews: [newInterview, ...currentHistory],
        recentActivity: [{ type: 'mock_interview', description: `Completed ${type} mock interview with avg score ${avgScore}/5`, timestamp: new Date().toISOString() }, ...currentActivity]
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Save mock interview error:', error.message);
    res.status(500).json({ error: 'Failed to save mock interview results' });
  }
});

module.exports = router;
