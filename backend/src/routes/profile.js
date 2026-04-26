const express = require('express');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /api/profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });

    if (!profile) {
      return res.json({
        user: { id: user.id, name: user.name, email: user.email, targetRole: user.targetRole, avatarColor: user.avatarColor },
        profile: null
      });
    }

    // Fetch latest completed assessment for scores
    const latestAssessment = await prisma.assessment.findFirst({
      where: { userId: req.userId, status: 'completed' },
      orderBy: { completedAt: 'desc' }
    });

    const recentActivity = Array.isArray(profile.recentActivity) ? profile.recentActivity : [];
    const mockInterviews = Array.isArray(profile.mockInterviews) ? profile.mockInterviews : [];

    res.json({
      user: { id: user.id, name: user.name, email: user.email, targetRole: user.targetRole, avatarColor: user.avatarColor },
      profile: {
        resumeFileName: profile.resumeFileName,
        resumeSections: profile.resumeSections,
        skills: profile.skills,
        jdSkills: profile.jdSkills,
        gapAnalysis: profile.gapAnalysis,
        overallReadiness: profile.overallReadiness,
        strengths: profile.strengths,
        gaps: profile.gaps,
        learningPlan: profile.learningPlan,
        mockInterviews: mockInterviews,
        recentActivity: recentActivity.slice(0, 10),
        lastUpdated: profile.lastUpdated,
        // Include assessment scores
        latestAssessment: latestAssessment ? {
          id: latestAssessment.id,
          finalScores: latestAssessment.finalScores,
          completedAt: latestAssessment.completedAt,
          skillsAssessed: latestAssessment.skillsToAssess
        } : null
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/profile/resume-pdf
router.get('/resume-pdf', auth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const sections = profile?.resumeSections || {};
    const filePath = sections.filePath;

    if (!filePath) {
      return res.status(404).json({ error: 'No resume file found' });
    }

    const fullPath = path.join(__dirname, '../../uploads', filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Resume file not found on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${profile.resumeFileName || 'resume.pdf'}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    console.error('Resume PDF error:', error);
    res.status(500).json({ error: 'Failed to serve resume PDF' });
  }
});

// PUT /api/profile
router.put('/', auth, async (req, res) => {
  try {
    const { targetRole, name } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (targetRole !== undefined) updateData.targetRole = targetRole;

    await prisma.user.update({ where: { id: req.userId }, data: updateData });
    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
