const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Message = require("../models/Message");
const HelpRequest = require("../models/HelpRequest");
const User = require("../models/User");
const { sendEmail } = require('../utils/emailService');

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

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and document files are allowed!'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Get messages for a specific request
router.get("/request/:requestId", authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Verify user has access to this request
    const request = await HelpRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Check if user is requester or helper
    if (request.requester.toString() !== req.user.id && 
        request.helper?.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to view messages" });
    }

    const messages = await Message.find({ request: requestId })
      .populate('sender', 'name email picture')
      .sort({ createdAt: 1 });

    // Transform messages to match frontend format
    const transformedMessages = messages.map(message => ({
      _id: message._id,
      requestId: message.request,
      senderId: message.sender._id,
      senderName: message.sender.name,
      senderPicture: message.sender.picture,
      content: message.content,
      messageType: message.messageType,
      fileName: message.fileName,
      fileSize: message.fileSize,
      createdAt: message.createdAt,
      isRead: message.isRead
    }));

    res.json(transformedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a new message
router.post("/", authenticateToken, [
  body("requestId").isMongoId(),
  body("content").trim().isLength({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestId, content, messageType = 'text', fileName, fileSize } = req.body;

    // Verify request exists and user has access
    const request = await HelpRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Check if user is requester or helper
    if (request.requester.toString() !== req.user.id && 
        request.helper?.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to send messages" });
    }

    // Get user details for the message
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newMessage = new Message({
      request: requestId,
      sender: req.user.id,
      content,
      messageType: messageType || 'text',
      fileName,
      fileSize,
      isRead: false
    });

    await newMessage.save();

    // Determine recipient (other party)
    let recipient;
    if (request.requester.toString() === req.user.id) {
      recipient = await User.findById(request.helper);
    } else {
      recipient = await User.findById(request.requester);
    }
    if (recipient && recipient.email) {
      await sendEmail({
        to: recipient.email,
        subject: `New message on request: ${request.title}`,
        text: `Hi ${recipient.name},\n\nYou have a new message from ${user.name} regarding the request '${request.title}':\n\n${content}\n\nPlease log in to SkillFull to reply.`,
      });
    }

    // Create response object with user details
    const messageResponse = {
      _id: newMessage._id,
      requestId: newMessage.request,
      senderId: newMessage.sender,
      senderName: user.name,
      senderPicture: user.picture,
      content: newMessage.content,
      messageType: newMessage.messageType,
      fileName: newMessage.fileName,
      fileSize: newMessage.fileSize,
      createdAt: newMessage.createdAt,
      isRead: newMessage.isRead
    };

    res.status(201).json(messageResponse);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Mark messages as read for a request
router.put("/request/:requestId/read", authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verify user has access to this request
    const request = await HelpRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Check if user is requester or helper
    if (request.requester.toString() !== req.user.id && 
        request.helper?.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Mark all messages in this request as read (since both users can see all messages)
    await Message.updateMany(
      { 
        request: requestId, 
        isRead: false 
      },
      { isRead: true }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Mark all messages as read for user
router.put("/read-all", authenticateToken, async (req, res) => {
  try {
    // Get all requests where user is requester or helper
    const userRequests = await HelpRequest.find({
      $or: [
        { requester: req.user.id },
        { helper: req.user.id }
      ]
    });

    const requestIds = userRequests.map(req => req._id);

    // Mark all messages in user's requests as read
    await Message.updateMany(
      { 
        request: { $in: requestIds },
        isRead: false 
      },
      { isRead: true }
    );

    res.json({ message: "All messages marked as read" });
  } catch (error) {
    console.error("Error marking all messages as read:", error);
    res.status(500).json({ error: "Failed to mark all messages as read" });
  }
});

// Get unread message count for user
router.get("/unread/count", authenticateToken, async (req, res) => {
  try {
    // Get all requests where user is requester or helper
    const userRequests = await HelpRequest.find({
      $or: [
        { requester: req.user.id },
        { helper: req.user.id }
      ]
    });

    const requestIds = userRequests.map(req => req._id);

    const count = await Message.countDocuments({
      request: { $in: requestIds },
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// Upload file and send message
router.post("/upload", authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { requestId } = req.body;

    // Verify request exists and user has access
    const request = await HelpRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Check if user is requester or helper
    if (request.requester.toString() !== req.user.id && 
        request.helper?.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to send messages" });
    }

    // Determine message type based on file
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileExt);
    const messageType = isImage ? 'image' : 'file';

    // Create file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Return file data for frontend to create message
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: messageType
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

module.exports = router; 