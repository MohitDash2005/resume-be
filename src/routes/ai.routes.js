const router      = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { analyzeResume, generateQuestion, evaluateAnswer, generatePerfectAnswer } = require("../controllers/ai.controller");

router.post("/analyze",  protect, analyzeResume);
router.post("/question", protect, generateQuestion);   // ← replaces old /interview/question
router.post("/evaluate", protect, evaluateAnswer);
router.post("/perfect-answer", protect, generatePerfectAnswer);

module.exports = router;
