const   router    = require("express").Router();
const { body }  = require("express-validator");
const passport  = require("../config/passport");
const validate  = require("../middleware/validate");
const { protect } = require("../middleware/auth.middleware");
const { register, login, refresh, logout, getMe, updateProfile, updateContact, changePassword, oauthCallback } = require("../controllers/auth.controller");

router.post("/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  register
);

router.post("/login",
  [
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

router.post("/refresh",          refresh);
router.post("/logout",           protect, logout);
router.get("/me",                protect, getMe);
router.put("/profile",          protect, updateProfile);
router.put("/contact",          protect, updateContact);
router.put("/change-password",  protect, changePassword);

// ── Google OAuth ──
router.get("/google",          passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=google_failed`, session: false }), oauthCallback);

// ── GitHub OAuth ──
router.get("/github",          passport.authenticate("github", { scope: ["user:email"] }));
router.get("/github/callback", passport.authenticate("github", { failureRedirect: `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=github_failed`, session: false }), oauthCallback);

module.exports = router;
