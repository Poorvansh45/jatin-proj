const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const HelpRequest = require("../models/HelpRequest");
const Category = require("../models/Category");
const User = require("../models/User");
const { sendEmail } = require('../utils/emailService');

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

// Get all help requests
router.get("/", async (req, res) => {
  try {
    const { status, category, search } = req.query;
    
    let query = {};
    
    // Only filter by status if it's explicitly provided
    if (status) {
      query.status = status;
    }
    
    if (category) {
      const categoryDoc = await Category.findOne({ name: category });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const requests = await HelpRequest.find(query)
      .populate('requester', 'name email picture')
      .populate('category', 'name description icon')
      .populate('helper', 'name email picture')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// Get single help request
router.get("/:id", async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id)
      .populate('requester', 'name email picture')
      .populate('category', 'name description icon')
      .populate('helper', 'name email picture');

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json(request);
  } catch (error) {
    console.error("Error fetching request:", error);
    res.status(500).json({ error: "Failed to fetch request" });
  }
});

// Create new help request
router.post("/", authenticateToken, [
  body("title").trim().isLength({ min: 1 }),
  body("description").trim().isLength({ min: 1 }),
  body("categoryId").isMongoId(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      categoryId,
      skillsNeeded,
      urgency,
      estimatedDuration,
      location,
      isRemote,
      budgetMin,
      budgetMax
    } = req.body;

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const newRequest = new HelpRequest({
      requester: req.user.id,
      category: categoryId,
      title,
      description,
      skillsNeeded: skillsNeeded || [],
      urgency: urgency || 'medium',
      estimatedDuration,
      location,
      isRemote: isRemote !== false,
      budgetMin,
      budgetMax
    });

    await newRequest.save();

    const populatedRequest = await HelpRequest.findById(newRequest._id)
      .populate('requester', 'name email picture')
      .populate('category', 'name description icon');

    try {
      await sendEmail({
        to: populatedRequest.requester.email,
        subject: `Your help request has been created: ${populatedRequest.title}`,
        text: `Hi ${populatedRequest.requester.name},\n\nYour help request titled '${populatedRequest.title}' has been successfully created.\n\nDescription: ${populatedRequest.description}\n\nThank you for using SkillFull!`,
      });
    } catch (e) {
      console.error('Failed to send creation email:', e);
    }

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error("Error creating request:", error);
    res.status(500).json({ error: "Failed to create request" });
  }
});

// Accept help request
router.post("/:id/accept", authenticateToken, async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== 'open') {
      return res.status(400).json({ error: "Request is not available" });
    }

    if (request.requester.toString() === req.user.id) {
      return res.status(400).json({ error: "Cannot accept your own request" });
    }

    request.helper = req.user.id;
    request.status = 'in_progress';
    request.acceptedAt = new Date();
    await request.save();

    const populatedRequest = await HelpRequest.findById(request._id)
      .populate('requester', 'name email picture')
      .populate('category', 'name description icon')
      .populate('helper', 'name email picture');

    // Emit socket event to notify both users
    const io = req.app.get('io');
    if (io) {
      // Emit to both helper and requester
      io.emit("request_accepted", {
        requestId: request._id,
        requestTitle: request.title,
        helperId: req.user.id,
        requesterId: request.requester.toString(),
        helperName: req.user.name,
        requesterName: populatedRequest.requester.name
      });

      // Also emit a status update event
      io.emit("request_status_updated", {
        requestId: request._id,
        requestTitle: request.title,
        status: 'in_progress',
        helperId: req.user.id,
        requesterId: request.requester.toString(),
        helperName: req.user.name,
        requesterName: populatedRequest.requester.name
      });

      console.log("🎉 Emitted request_accepted event for:", request.title);
    }

    try {
      // Notify requester
      await sendEmail({
        to: populatedRequest.requester.email,
        subject: `Your request has been accepted!`,
        text: `Hi ${populatedRequest.requester.name},\n\nYour request '${populatedRequest.title}' has been accepted by ${populatedRequest.helper.name}.\n\nYou can now chat and collaborate.`,
      });
      // Notify helper
      await sendEmail({
        to: populatedRequest.helper.email,
        subject: `You accepted a request!`,
        text: `Hi ${populatedRequest.helper.name},\n\nYou have accepted the request '${populatedRequest.title}'.\n\nPlease reach out to the requester to get started.`,
      });
    } catch (e) {
      console.error('Failed to send acceptance email:', e);
    }

    res.json(populatedRequest);
  } catch (error) {
    console.error("Error accepting request:", error);
    res.status(500).json({ error: "Failed to accept request" });
  }
});

// Complete help request
router.post("/:id/complete", authenticateToken, async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== 'in_progress') {
      return res.status(400).json({ error: "Request is not in progress" });
    }

    if (request.helper.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the helper can complete this request" });
    }

    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();

    const populatedRequest = await HelpRequest.findById(request._id)
      .populate('requester', 'name email picture')
      .populate('category', 'name description icon')
      .populate('helper', 'name email picture');

    // Emit socket event to notify both users
    const io = req.app.get('io');
    if (io) {
      // Emit status update event
      io.emit("request_status_updated", {
        requestId: request._id,
        requestTitle: request.title,
        status: 'completed',
        helperId: request.helper.toString(),
        requesterId: request.requester.toString(),
        completedBy: req.user.id,
        completedByName: req.user.name
      });

      console.log("✅ Emitted request completion event for:", request.title);
    }

    try {
      // Notify requester
      await sendEmail({
        to: populatedRequest.requester.email,
        subject: `Your help request has been completed!`,
        text: `Hi ${populatedRequest.requester.name},\n\nYour help request '${populatedRequest.title}' has been marked as completed by ${populatedRequest.helper.name}.\n\nThank you for using SkillFull!`,
      });
      // Notify helper
      await sendEmail({
        to: populatedRequest.helper.email,
        subject: `You completed a help request!`,
        text: `Hi ${populatedRequest.helper.name},\n\nYou have marked the request '${populatedRequest.title}' as completed.\n\nThank you for helping on SkillFull!`,
      });
    } catch (e) {
      console.error('Failed to send completion email:', e);
    }

    res.json(populatedRequest);
  } catch (error) {
    console.error("Error completing request:", error);
    res.status(500).json({ error: "Failed to complete request" });
  }
});

// Get categories
router.get("/categories/all", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

module.exports = router;
