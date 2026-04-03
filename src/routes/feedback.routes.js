const router      = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { submitFeedback, getFeedback, pinFeedback, getPinnedFeedback } = require("../controllers/feedback.controller");

router.post("/",       protect, submitFeedback);
router.get("/",        protect, getFeedback);
router.get("/pinned",  getPinnedFeedback);

module.exports = router;
