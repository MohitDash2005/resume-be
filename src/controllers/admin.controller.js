const User      = require("../models/user.model");
const Resume    = require("../models/resume.model");
const Interview = require("../models/interview.model");
const Feedback  = require("../models/feedback.model");

// ── GET /api/admin/stats ──
const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalResumes, totalInterviews,
           avgResumeArr, avgInterviewArr, newUsersThisWeek,
           scoreDistribution, activityTrend,
           feedbackStats, feedbackByCategory] = await Promise.all([

      User.countDocuments(),
      Resume.countDocuments({ status: "done" }),
      Interview.countDocuments({ status: "completed" }),

      Resume.aggregate([
        { $match: { status: "done" } },
        { $group: { _id: null, avg: { $avg: "$analysis.score" } } },
      ]),
      Interview.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, avg: { $avg: "$overallScore" } } },
      ]),

      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),

      // Score buckets 0-40, 40-60, 60-80, 80-100
      Resume.aggregate([
        { $match: { status: "done" } },
        { $bucket: {
            groupBy: "$analysis.score",
            boundaries: [0, 40, 60, 80, 101],
            default: "other",
            output: { count: { $sum: 1 } },
        }},
      ]),

      // Last 30 days activity
      Resume.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, status: "done" } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, resumes: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Feedback avg rating + total count
      Feedback.aggregate([
        { $group: { _id: null, avg: { $avg: "$rating" }, total: { $sum: 1 } } },
      ]),

      // Feedback by category
      Feedback.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      totalUsers,
      totalResumes,
      totalInterviews,
      avgResumeScore:    Math.round(avgResumeArr[0]?.avg    || 0),
      avgInterviewScore: Math.round(avgInterviewArr[0]?.avg || 0),
      newUsersThisWeek,
      scoreDistribution: scoreDistribution.map(b => ({
        range: b._id === 0 ? "0-40" : b._id === 40 ? "40-60" : b._id === 60 ? "60-80" : "80-100",
        count: b.count,
      })),
      activityTrend,
      feedbackTotal:    feedbackStats[0]?.total || 0,
      feedbackAvgRating: Math.round((feedbackStats[0]?.avg || 0) * 10) / 10,
      feedbackByCategory: feedbackByCategory.map(f => ({ category: f._id, count: f.count })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/users ──
const getUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.search?.trim().slice(0, 100) || "";

    const query = search
      ? { $or: [
          { name:  { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ]}
      : {};

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit),
      User.countDocuments(query),
    ]);

    // Attach resume + interview counts per user
    const userIds = users.map(u => u._id);
    const [resumeCounts, interviewCounts] = await Promise.all([
      Resume.aggregate([{ $match: { user: { $in: userIds }, status: "done" } }, { $group: { _id: "$user", count: { $sum: 1 } } }]),
      Interview.aggregate([{ $match: { user: { $in: userIds }, status: "completed" } }, { $group: { _id: "$user", count: { $sum: 1 } } }]),
    ]);

    const rcMap = Object.fromEntries(resumeCounts.map(r => [r._id.toString(), r.count]));
    const icMap = Object.fromEntries(interviewCounts.map(i => [i._id.toString(), i.count]));

    const enriched = users.map(u => ({
      ...u.toJSON(),
      resumeCount:    rcMap[u._id.toString()]    || 0,
      interviewCount: icMap[u._id.toString()] || 0,
    }));

    res.json({ users: enriched, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/users/:id ──
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    // Clean up their data
    await Promise.all([
      Resume.deleteMany({ user: req.params.id }),
      Interview.deleteMany({ user: req.params.id }),
    ]);
    res.json({ message: "User and all associated data deleted" });
  } catch (err) { next(err); }
};

// ── GET /api/admin/resumes ──
const getResumes = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [resumes, total] = await Promise.all([
      Resume.find({ status: "done" })
        .populate("user", "name email avatar")
        .select("filename filepath analysis.score analysis.atsScore analysis.extractedSkills analysis.missingSkills createdAt user")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
      Resume.countDocuments({ status: "done" }),
    ]);
    const serverUrl = process.env.SERVER_URL || "http://localhost:5000";
    const enriched = resumes.map(r => ({
      ...r.toObject(),
      fileUrl: `${serverUrl}/uploads/${r.filename}`,
    }));
    res.json({ resumes: enriched, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/resumes/:id ──
const deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findByIdAndDelete(req.params.id);
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    res.json({ message: "Resume deleted" });
  } catch (err) { next(err); }
};

// ── GET /api/admin/interviews ──
const getInterviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [sessions, total] = await Promise.all([
      Interview.find({ status: "completed" })
        .populate("user", "name email avatar")
        .select("track difficulty overallScore grade duration weakAreas strengths answers createdAt user")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
      Interview.countDocuments({ status: "completed" }),
    ]);

    // Track-wise averages
    const trackStats = await Interview.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$track", avgScore: { $avg: "$overallScore" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ sessions, total, pages: Math.ceil(total / limit), trackStats });
  } catch (err) { next(err); }
};

const getInterviewDetail = async (req, res, next) => {
  try {
    const session = await Interview.findById(req.params.id)
      .populate("user", "name email avatar");
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/interviews/:id ──
const deleteInterview = async (req, res, next) => {
  try {
    const session = await Interview.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ message: "Interview session deleted" });
  } catch (err) { next(err); }
};

// ── GET /api/admin/skills/search?skill=React ──
// Returns users who HAVE the skill and users who are MISSING it
const searchSkill = async (req, res, next) => {
  try {
    const { skill } = req.query;
    if (!skill?.trim()) return res.status(400).json({ error: "skill query param required" });

    const regex = new RegExp(skill.trim(), "i");

    const [haveIt, missingIt] = await Promise.all([
      Resume.find({ status: "done", "analysis.extractedSkills": { $regex: regex } })
        .populate("user", "name email avatar")
        .select("user analysis.score createdAt")
        .sort({ createdAt: -1 }),

      Resume.find({ status: "done", "analysis.missingSkills": { $regex: regex } })
        .populate("user", "name email avatar")
        .select("user analysis.score createdAt")
        .sort({ createdAt: -1 }),
    ]);

    // Deduplicate by user
    const dedup = (arr) => {
      const seen = new Set();
      return arr.filter(r => {
        const uid = r.user?._id?.toString();
        if (!uid || seen.has(uid)) return false;
        seen.add(uid); return true;
      });
    };

    res.json({
      skill: skill.trim(),
      haveIt:    dedup(haveIt).map(r => ({ user: r.user, score: r.analysis?.score ?? 0 })),
      missingIt: dedup(missingIt).map(r => ({ user: r.user, score: r.analysis?.score ?? 0 })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/skills/top ──
// Returns top skills across all resumes (present + missing)
const getTopSkills = async (req, res, next) => {
  try {
    const [present, missing] = await Promise.all([
      Resume.aggregate([
        { $match: { status: "done" } },
        { $unwind: "$analysis.extractedSkills" },
        { $group: { _id: "$analysis.extractedSkills", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 30 },
      ]),
      Resume.aggregate([
        { $match: { status: "done" } },
        { $unwind: "$analysis.missingSkills" },
        { $group: { _id: "$analysis.missingSkills", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 30 },
      ]),
    ]);

    res.json({ present, missing });
  } catch (err) { next(err); }
};

module.exports = { getStats, getUsers, deleteUser, getResumes, deleteResume, getInterviews, getInterviewDetail, deleteInterview, searchSkill, getTopSkills };
