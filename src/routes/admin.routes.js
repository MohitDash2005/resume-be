const router      = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const {
  getStats, getUsers, deleteUser,
  getResumes, deleteResume,
  getInterviews, getInterviewDetail, deleteInterview,
  searchSkill, getTopSkills,
} = require("../controllers/admin.controller");
const { getFeedback, deleteFeedback, pinFeedback } = require("../controllers/feedback.controller");

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: "Admin access required" });
  next();
};

router.use(protect, adminOnly);

router.get("/stats",              getStats);
router.get("/users",              getUsers);
router.delete("/users/:id",       deleteUser);
router.get("/resumes",            getResumes);
router.delete("/resumes/:id",     deleteResume);
router.get("/interviews",         getInterviews);
router.get("/interviews/:id",     getInterviewDetail);
router.delete("/interviews/:id",  deleteInterview);
router.get("/skills/search",      searchSkill);
router.get("/skills/top",         getTopSkills);
router.get("/feedback",           getFeedback);
router.delete("/feedback/:id",    deleteFeedback);
router.patch("/feedback/:id/pin", pinFeedback);

module.exports = router;
