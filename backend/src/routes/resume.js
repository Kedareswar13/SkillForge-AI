const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.userId}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

// POST /api/resume/upload
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const aiResponse = await axios.post(
      `${process.env.FASTAPI_URL}/api/resume/parse`,
      formData,
      { headers: formData.getHeaders(), timeout: 120000 }
    );

    const { text, sections, skills, skillsWithEvidence } = aiResponse.data;

    // Get current profile
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const currentActivity = Array.isArray(profile?.recentActivity) ? profile.recentActivity : [];

    const strengths = skillsWithEvidence
      .filter(s => s.level === 'advanced' || s.level === 'expert')
      .map(s => s.name);

    // Keep the file for PDF viewing — store path in resumeSections.filePath
    const savedPath = req.file.filename;

    await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        resumeText: text,
        resumeFileName: req.file.originalname,
        resumeSections: { ...sections, filePath: savedPath },
        skills: skillsWithEvidence.map(s => ({
          name: s.name, level: s.level, confidence: s.confidence,
          evidence: s.evidence, category: s.category || 'technical'
        })),
        strengths,
        recentActivity: [
          ...currentActivity,
          { type: 'resume_upload', description: `Uploaded resume: ${req.file.originalname}`, timestamp: new Date().toISOString() }
        ]
      }
    });

    // Keep file — do not delete

    res.json({ message: 'Resume processed successfully', sections, skills: skillsWithEvidence, strengths });
  } catch (error) {
    console.error('Resume upload error:', error.message);
    if (error.response) return res.status(error.response.status).json({ error: error.response.data.detail || 'AI service error' });
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

module.exports = router;
