const Resume    = require("../models/resume.model");
const Interview = require("../models/interview.model");
const User      = require("../models/user.model");

/**
 * Returns aggregated dashboard stats for a user.
 */
const getDashboardStats = async (userId) => {
  const [resumes, interviews] = await Promise.all([
    Resume.find({ user: userId, status: "done" }).sort({ createdAt: -1 }),
    Interview.find({ user: userId, status: "completed" }).sort({ createdAt: -1 }),
  ]);

  const latestResume    = resumes[0] || null;
  const latestInterview = interviews[0] || null;

  const resumeScore    = latestResume?.analysis?.score ?? 0;
  const interviewScore = latestInterview?.overallScore ?? 0;

  // Build 7-day trend from interviews
  const trend = buildTrend(interviews);

  return {
    resumeScore,
    interviewScore,
    totalAnalyses:   resumes.length,
    totalInterviews: interviews.length,
    latestResume:    latestResume ? {
      score:           latestResume?.analysis?.score ?? 0,
      extractedSkills: latestResume?.analysis?.extractedSkills ?? [],
      missingSkills:   latestResume?.analysis?.missingSkills ?? [],
      atsScore:        latestResume?.analysis?.atsScore ?? 0,
      formatScore:     latestResume?.analysis?.formatScore ?? 0,
      keywordsScore:   latestResume?.analysis?.keywordsScore ?? 0,
    } : null,
    trend,
  };
};

const buildTrend = (interviews) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const map  = {};
  days.forEach(d => { map[d] = { day: d, score: 0, interviews: 0 }; });

  interviews.slice(0, 20).forEach(iv => {
    const day = days[new Date(iv.createdAt).getDay()];
    map[day].interviews += 1;
    map[day].score = Math.max(map[day].score, iv.overallScore);
  });

  return Object.values(map);
};

/**
 * Public platform-wide stats — no auth required.
 * Used on the login page social proof section.
 */
const getPublicStatsData = async () => {
  const [totalUsers, totalResumes, totalInterviews] = await Promise.all([
    User.countDocuments(),
    Resume.countDocuments({ status: "done" }),
    Interview.countDocuments({ status: "completed" }),
  ]);

  // Get the most recent 4 user avatars/initials for the social proof row
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(4)
    .select("name avatar");

  return { totalUsers, totalResumes, totalInterviews, recentUsers };
};

module.exports = { getDashboardStats, getPublicStatsData };
