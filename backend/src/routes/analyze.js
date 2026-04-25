const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// POST /api/analyze
router.post('/', auth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const jdSkills = profile.jdSkills || {};

    if (!skills.length) return res.status(400).json({ error: 'Please upload a resume first' });
    if (!jdSkills.required?.length) return res.status(400).json({ error: 'Please add a job description first' });

    const aiRes = await axios.post(
      `${process.env.FASTAPI_URL}/api/analyze/gap`,
      {
        resume_skills: skills.map(s => ({ name: s.name, level: s.level, confidence: s.confidence, evidence: s.evidence })),
        jd_required: jdSkills.required,
        jd_preferred: jdSkills.preferred || [],
        role_type: jdSkills.roleType || ''
      },
      { timeout: 60000 }
    );

    const { matches, partial_matches, missing, weak_areas, overall_readiness, recommendations } = aiRes.data;

    console.log('📊 Raw AI gap analysis response:', JSON.stringify(aiRes.data, null, 2));
    console.log('📊 overall_readiness raw value:', overall_readiness, 'type:', typeof overall_readiness);

    let parsedReadiness = parseInt(overall_readiness, 10);
    if (isNaN(parsedReadiness)) parsedReadiness = 0;
    // Clamp to 0-100
    parsedReadiness = Math.max(0, Math.min(100, parsedReadiness));

    console.log('📊 parsedReadiness final:', parsedReadiness);
    console.log('📊 matches:', matches);
    console.log('📊 missing:', missing);
    console.log('📊 weak_areas:', weak_areas);
    console.log('📊 Resume skills sent:', skills.map(s => s.name));
    console.log('📊 JD required skills:', jdSkills.required);

    await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        gapAnalysis: { matches, partialMatches: partial_matches, missing, weakAreas: weak_areas },
        overallReadiness: parsedReadiness,
        gaps: missing || []
      }
    });

    res.json({
      gapAnalysis: { matches, partialMatches: partial_matches, missing, weakAreas: weak_areas },
      overallReadiness: parsedReadiness, recommendations
    });
  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: 'Failed to run analysis' });
  }
});

module.exports = router;
