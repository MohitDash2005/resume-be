const router      = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { createSession, completeSession, getHistory, getSession } = require("../controllers/interview.controller");

router.post("/session",              protect, createSession);
router.post("/session/:id/complete", protect, completeSession);
router.get("/history",               protect, getHistory);
router.get("/session/:id",           protect, getSession);

module.exports = router;
