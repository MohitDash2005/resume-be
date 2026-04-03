const router      = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { getStats, getPublicStats } = require("../controllers/dashboard.controller");

router.get("/stats",        protect, getStats);
router.get("/public-stats", getPublicStats);  // no auth — used on login page

module.exports = router;
