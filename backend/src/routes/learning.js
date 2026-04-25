const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /api/learning-plan
router.get('/', auth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const plan = Array.isArray(profile.learningPlan) ? profile.learningPlan : [];
    return res.json({ learningPlan: plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch learning plan' });
  }
});

// POST /api/learning-plan/generate
router.post('/generate', auth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const skills = Array.isArray(profile?.skills) ? profile.skills : [];
    const gapAnalysis = profile?.gapAnalysis || {};
    const jdSkills = profile?.jdSkills || {};

    if (!skills.length) return res.status(400).json({ error: 'Please complete resume upload and analysis first' });

    const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/learning/generate`, {
      skills: skills.map(s => ({ name: s.name, level: s.level, confidence: s.confidence })),
      gap_analysis: { missing: gapAnalysis.missing || [], weak_areas: gapAnalysis.weakAreas || [] },
      role_type: jdSkills.roleType || '',
      jd_required: jdSkills.required || []
    }, { timeout: 60000 });

    const { learning_plan } = aiRes.data;
    const formattedPlan = learning_plan.map(item => ({
      skill: item.skill, currentLevel: item.current_level, targetLevel: item.target_level,
      reason: item.reason, timeEstimate: item.time_estimate, steps: item.steps,
      resources: item.resources || [], progress: 0, completed: false
    }));

    const currentActivity = Array.isArray(profile?.recentActivity) ? profile.recentActivity : [];
    await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        learningPlan: formattedPlan,
        recentActivity: [...currentActivity, { type: 'learning_started', description: 'Generated personalized learning roadmap', timestamp: new Date().toISOString() }]
      }
    });

    res.json({ learningPlan: formattedPlan });
  } catch (error) {
    console.error('Learning plan error:', error.message);
    res.status(500).json({ error: 'Failed to generate learning plan' });
  }
});

// PUT /api/learning-plan/:index/progress
router.put('/:index/progress', auth, async (req, res) => {
  try {
    const { progress } = req.body;
    const index = parseInt(req.params.index);
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const plan = Array.isArray(profile?.learningPlan) ? [...profile.learningPlan] : [];
    if (!plan[index]) return res.status(404).json({ error: 'Learning plan item not found' });

    plan[index].progress = progress;
    plan[index].completed = progress >= 100;

    await prisma.profile.update({ where: { userId: req.userId }, data: { learningPlan: plan } });
    res.json({ learningPlan: plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// POST /api/learning-plan/:index/validate/question
router.post('/:index/validate/question', auth, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const { resourceIndex } = req.body || {};
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const plan = Array.isArray(profile?.learningPlan) ? profile.learningPlan : [];
    if (!plan[index]) return res.status(404).json({ error: 'Learning plan item not found' });

    const item = plan[index];
    let skillQuery = item.skill;
    if (resourceIndex !== undefined && item.resources && item.resources[resourceIndex]) {
      skillQuery = `${item.skill} (Focus: ${item.resources[resourceIndex].title})`;
    }

    const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/assessment/question`, {
      skill: skillQuery,
      level: item.targetLevel,
      role_type: profile.jdSkills?.roleType || '',
      previous_questions: []
    }, { timeout: 30000 });

    res.json({ question: aiRes.data.question });
  } catch (error) {
    console.error('Validation question error:', error.message);
    res.status(500).json({ error: 'Failed to generate validation question' });
  }
});

// POST /api/learning-plan/:index/validate/answer
router.post('/:index/validate/answer', auth, async (req, res) => {
  try {
    const { question, answer, resourceIndex } = req.body;
    const index = parseInt(req.params.index);
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const plan = Array.isArray(profile?.learningPlan) ? [...profile.learningPlan] : [];
    if (!plan[index]) return res.status(404).json({ error: 'Learning plan item not found' });

    const item = plan[index];
    let skillQuery = item.skill;
    if (resourceIndex !== undefined && item.resources && item.resources[resourceIndex]) {
      skillQuery = `${item.skill} (Focus: ${item.resources[resourceIndex].title})`;
    }

    const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/assessment/evaluate`, {
      skill: skillQuery,
      level: item.targetLevel,
      question,
      answer
    }, { timeout: 30000 });

    const { score, reasoning } = aiRes.data;
    let newProgress = item.progress || 0;
    
    // If score is good (>= 3 out of 5), mark resource or skill as complete
    if (score >= 3) {
      if (resourceIndex !== undefined && item.resources && item.resources[resourceIndex]) {
        plan[index].resources[resourceIndex].completed = true;
        
        // Calculate new progress based on completed resources
        const totalResources = plan[index].resources.length;
        if (totalResources > 0) {
          const completedCount = plan[index].resources.filter(r => r.completed).length;
          newProgress = Math.round((completedCount / totalResources) * 100);
          plan[index].progress = newProgress;
          if (newProgress >= 100) plan[index].completed = true;
        }
      } else {
        // Fallback if no resource index provided (complete entire skill)
        newProgress = 100;
        plan[index].progress = 100;
        plan[index].completed = true;
      }
      
      const currentActivity = Array.isArray(profile.recentActivity) ? profile.recentActivity : [];
      await prisma.profile.update({
        where: { userId: req.userId },
        data: {
          learningPlan: plan,
          recentActivity: [...currentActivity, { 
            type: 'assessment_completed', 
            description: `Validated knowledge for: ${item.skill}`, 
            timestamp: new Date().toISOString() 
          }]
        }
      });
    }

    res.json({ score, reasoning, passed: score >= 3, newProgress });
  } catch (error) {
    console.error('Validation answer error:', error.message);
    res.status(500).json({ error: 'Failed to validate answer' });
  }
});

module.exports = router;
