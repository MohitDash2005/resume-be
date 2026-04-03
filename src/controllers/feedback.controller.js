const Feedback = require("../models/feedback.model");

// POST /api/feedback
const submitFeedback = async (req, res, next) => {
  try {
    const { rating, category, message } = req.body;
    if (!rating || !message?.trim()) return res.status(400).json({ error: "Rating and message are required" });
    const feedback = await Feedback.create({ user: req.user._id, rating, category, message });
    res.status(201).json({ message: "Feedback submitted. Thank you!", feedback });
  } catch (err) { next(err); }
};

// GET /api/feedback  (admin only)
const getFeedback = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = 20;
    const [items, total] = await Promise.all([
      Feedback.find().populate("user", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Feedback.countDocuments(),
    ]);
    res.json({ feedback: items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// DELETE /api/admin/feedback/:id
const deleteFeedback = async (req, res, next) => {
  try {
    const item = await Feedback.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    res.json({ message: "Feedback deleted" });
  } catch (err) { next(err); }
};

// PATCH /api/admin/feedback/:id/pin
const pinFeedback = async (req, res, next) => {
  try {
    const item = await Feedback.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    item.pinned = !item.pinned;
    await item.save();
    res.json({ pinned: item.pinned });
  } catch (err) { next(err); }
};

// GET /api/feedback/pinned  (public)
const getPinnedFeedback = async (req, res, next) => {
  try {
    const items = await Feedback.find({ pinned: true })
      .populate("user", "name avatar")
      .sort({ updatedAt: -1 })
      .limit(10);
    res.json({ feedback: items });
  } catch (err) { next(err); }
};

module.exports = { submitFeedback, getFeedback, deleteFeedback, pinFeedback, getPinnedFeedback };

