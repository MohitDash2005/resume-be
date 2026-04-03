const { getDashboardStats, getPublicStatsData } = require("../services/dashboard.service");

// GET /api/dashboard/stats
const getStats = async (req, res, next) => {
  try {
    const stats = await getDashboardStats(req.user._id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/public-stats  (no auth)
const getPublicStats = async (req, res, next) => {
  try {
    const stats = await getPublicStatsData();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getPublicStats };
