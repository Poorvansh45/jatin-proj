const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Real authentication middleware using JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// POST /api/ai-chatbot
router.post('/', authenticateToken, upload.array('files'), async (req, res) => {
  console.log('AI Chatbot endpoint hit');
  try {
    const { prompt } = req.body;
    console.log(prompt)
    const files = req.files || [];
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured.' });
    }

    // Prepare files for Gemini API (base64 encode)
    const fileData = await Promise.all(files.map(async (file) => {
      const data = await fs.promises.readFile(file.path);
      return {
        filename: file.originalname,
        content: data.toString('base64'),
        mimetype: file.mimetype
      };
    }));

    // Build Gemini API parts array
    let parts = [];
    if (prompt) {
      parts.push({ text: prompt });
    }
    if (fileData.length > 0) {
      parts = parts.concat(fileData.map(f => ({ inlineData: { data: f.content, mimeType: f.mimetype } })));
    }
    if (parts.length === 0) {
      return res.status(400).json({ error: 'No prompt or files provided.' });
    }

    // Call Gemini API
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        contents: [
          { role: 'user', parts }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(response.data)
    // Clean up uploaded files
    files.forEach(file => fs.unlink(file.path, () => {}));

    // Return AI response
    res.json({
      aiResponse: response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.'
    });
  } catch (error) {
    console.error('AI Chatbot error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Failed to get AI response.' });
  }
});

module.exports = router; 