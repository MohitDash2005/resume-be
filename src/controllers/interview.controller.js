const Interview = require("../models/interview.model");

// POST /api/interview/session
const createSession = async (req, res, next) => {
  try {
    const { track, difficulty } = req.body;
    if (!track || !difficulty) {
      return res.status(400).json({ error: "track and difficulty are required" });
    }
    const session = await Interview.create({ user: req.user._id, track, difficulty });
    res.status(201).json({ sessionId: session._id, track, difficulty });
  } catch (err) {
    next(err);
  }
};

// POST /api/interview/session/:id/complete
const completeSession = async (req, res, next) => {
  try {
    const { answers, overallScore, grade, duration, radarData, weakAreas, strengths } = req.body;

    if (overallScore === undefined || !grade) {
      return res.status(400).json({ error: "overallScore and grade are required" });
    }

    const session = await Interview.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "active" },
      { answers: answers || [], overallScore, grade, duration: duration || 0, radarData: radarData || [], weakAreas: weakAreas || [], strengths: strengths || [], status: "completed" },
      { new: true }
    );

    if (!session) return res.status(404).json({ error: "Session not found or already completed" });
    res.json({ session });
  } catch (err) {
    next(err);
  }
};

// GET /api/interview/history
const getHistory = async (req, res, next) => {
  try {
    const sessions = await Interview.find({ user: req.user._id, status: "completed" })
      .select("track difficulty overallScore grade duration createdAt")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
};

// GET /api/interview/session/:id
const getSession = async (req, res, next) => {
  try {
    const session = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  } catch (err) {
    next(err);
  }
};

module.exports = { createSession, completeSession, getHistory, getSession };
