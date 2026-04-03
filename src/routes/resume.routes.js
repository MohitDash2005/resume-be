const router        = require("express").Router();
const { protect }   = require("../middleware/auth.middleware");
const upload        = require("../config/multer");
const { uploadResume, getHistory, getResume } = require("../controllers/resume.controller");

// POST /api/resume/upload  ← replaces old /upload-resume
router.post("/upload", protect, upload.single("file"), uploadResume);
router.get("/history",  protect, getHistory);
router.get("/:id",      protect, getResume);

module.exports = router;
