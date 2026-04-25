const express = require('express');
const axios = require('axios');
const multer = require('multer');
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
    cb(null, `jd_${req.userId}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/jd/process
router.post('/process', auth, upload.single('jdFile'), async (req, res) => {
  try {
    const { jdText, jdUrl } = req.body;
    let processedText = '';

    if (req.file) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(req.file.path));
      const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/jd/extract-pdf`, formData, { headers: formData.getHeaders(), timeout: 60000 });
      processedText = aiRes.data.text;
      fs.unlink(req.file.path, () => {});
    } else if (jdUrl) {
      const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/jd/extract-url`, { url: jdUrl }, { timeout: 30000 });
      processedText = aiRes.data.text;
    } else if (jdText) {
      processedText = jdText;
    } else {
      return res.status(400).json({ error: 'Provide JD text, PDF file, or URL' });
    }

    const aiRes = await axios.post(`${process.env.FASTAPI_URL}/api/jd/parse`, { text: processedText }, { timeout: 60000 });
    const { required_skills, preferred_skills, role_type } = aiRes.data;

    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const currentActivity = Array.isArray(profile?.recentActivity) ? profile.recentActivity : [];

    await prisma.profile.update({
      where: { userId: req.userId },
      data: {
        latestJD: processedText,
        jdSkills: { required: required_skills, preferred: preferred_skills, roleType: role_type },
        recentActivity: [
          ...currentActivity,
          { type: 'jd_added', description: `Added JD for: ${role_type || 'Target Role'}`, timestamp: new Date().toISOString() }
        ]
      }
    });

    res.json({ message: 'JD processed successfully', jdSkills: { required: required_skills, preferred: preferred_skills, roleType: role_type } });
  } catch (error) {
    console.error('JD processing error:', error.message);
    res.status(500).json({ error: 'Failed to process job description' });
  }
});

module.exports = router;
