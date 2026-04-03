const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User           = require("../models/user.model");

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email  = profile.emails?.[0]?.value;
    const avatar = profile.photos?.[0]?.value || "";

    // Build query — only include email condition if email exists
    const orConditions = [{ googleId: profile.id }];
    if (email) orConditions.push({ email });

    let user = await User.findOne({ $or: orConditions });

    if (user) {
      if (!user.googleId) { user.googleId = profile.id; user.avatar = avatar; await user.save({ validateBeforeSave: false }); }
      return done(null, user);
    }

    const userData = { name: profile.displayName, avatar, googleId: profile.id };
    if (email) userData.email = email;
    user = await User.create(userData);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.use(new GitHubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/github/callback`,
  scope: ["user:email"],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email  = profile.emails?.[0]?.value;
    const avatar = profile.photos?.[0]?.value || "";

    const orConditions = [{ githubId: profile.id }];
    if (email) orConditions.push({ email });

    let user = await User.findOne({ $or: orConditions });

    if (user) {
      if (!user.githubId) { user.githubId = profile.id; user.avatar = avatar; await user.save({ validateBeforeSave: false }); }
      return done(null, user);
    }

    const userData = { name: profile.displayName || profile.username, avatar, githubId: profile.id };
    if (email) userData.email = email;
    user = await User.create(userData);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
