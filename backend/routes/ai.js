const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

// POST /api/ai-help
router.post('/help', upload.array('files'), async (req, res) => {
  try {
    const userPrompt = `Answer concisely and clearly: ${req.body.prompt}`;
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

    // Call Gemini API (example for text + file, adjust as per Gemini API docs)
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        contents: [
          { role: 'user', parts: [
            { text: userPrompt },
            ...fileData.map(f => ({ inlineData: { data: f.content, mimeType: f.mimetype } }))
          ] }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Clean up uploaded files
    files.forEach(file => fs.unlink(file.path, () => {}));

    // Return AI response
    res.json({
      aiResponse: response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.'
    });
  } catch (error) {
    console.error('AI HelpBot error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get AI response.' });
  }
});

module.exports = router; 