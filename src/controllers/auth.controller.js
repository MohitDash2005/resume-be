const User = require("../models/user.model");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../services/token.service");

// Helpers
const isPhone = (v) => /^\+?[0-9]{7,15}$/.test(v?.replace(/[\s\-()]/g, ""));
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const normalizePhone = (v) => v.replace(/[\s\-()]/g, "");

const isPlaceholderEmail = (email) => email?.includes("@placeholder.local");

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    if (!email?.trim() && !phone?.trim()) {
      return res.status(400).json({ error: "Email or phone number is required" });
    }
    if (email?.trim() && !isEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    if (phone?.trim() && !isPhone(phone)) {
      return res.status(400).json({ error: "Enter a valid phone number (7–15 digits)" });
    }

    if (email?.trim()) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) return res.status(409).json({ error: "This email is already registered" });
    }
    if (phone?.trim()) {
      const phoneExists = await User.findOne({ phone: normalizePhone(phone) });
      if (phoneExists) return res.status(409).json({ error: "This phone number is already registered" });
    }

    const userData = {
      name: name.trim(),
      password,
    };

    // Store email if provided, otherwise leave null (override required: false below)
    if (email?.trim()) userData.email = email.toLowerCase().trim();
    if (phone?.trim()) userData.phone = normalizePhone(phone);

    const user         = await User.create(userData);
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    if (!password) return res.status(400).json({ error: "Password is required" });
    if (!email?.trim() && !phone?.trim()) {
      return res.status(400).json({ error: "Email or phone number is required" });
    }

    let user;
    if (phone?.trim()) {
      // Login by phone
      if (!isPhone(phone)) return res.status(400).json({ error: "Enter a valid phone number" });
      user = await User.findOne({ phone: normalizePhone(phone) }).select("+password");
      if (!user) return res.status(401).json({ error: "No account found with this phone number" });
    } else {
      // Login by email
      if (!isEmail(email)) return res.status(400).json({ error: "Enter a valid email address" });
      user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
      if (!user) return res.status(401).json({ error: "No account found with this email" });
    }

    if (!user.password) return res.status(401).json({ error: "This account uses Google or GitHub login" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    // Clean up legacy placeholder email if present
    if (user.email?.includes("@placeholder.local")) {
      user.email = null;
      await user.save({ validateBeforeSave: false });
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

    const decoded = verifyRefreshToken(refreshToken);
    const user    = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const newAccessToken  = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken     = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    req.user.refreshToken = null;
    await req.user.save({ validateBeforeSave: false });
    res.json({ message: "Logged out successfully" });
  } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  // Clean up legacy placeholder email on every session restore
  if (req.user.email?.includes("@placeholder.local")) {
    req.user.email = null;
    await req.user.save({ validateBeforeSave: false }).catch(() => {});
  }
  res.json({ user: req.user });
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    req.user.name = name.trim();
    await req.user.save({ validateBeforeSave: false });
    res.json({ user: req.user });
  } catch (err) { next(err); }
};

// PUT /api/auth/contact  — add/update email or phone
const updateContact = async (req, res, next) => {
  try {
    const { email, phone } = req.body;

    if (email?.trim()) {
      if (!isEmail(email)) return res.status(400).json({ error: "Enter a valid email address" });
      const exists = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: req.user._id } });
      if (exists) return res.status(409).json({ error: "This email is already used by another account" });
      req.user.email = email.toLowerCase().trim();
    }

    if (phone?.trim()) {
      if (!isPhone(phone)) return res.status(400).json({ error: "Enter a valid phone number" });
      const exists = await User.findOne({ phone: normalizePhone(phone), _id: { $ne: req.user._id } });
      if (exists) return res.status(409).json({ error: "This phone number is already used by another account" });
      req.user.phone = normalizePhone(phone);
    }

    await req.user.save({ validateBeforeSave: false });
    res.json({ user: req.user });
  } catch (err) { next(err); }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both fields are required" });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });

    const user = await User.findById(req.user._id).select("+password");
    if (!user.password) return res.status(400).json({ error: "OAuth accounts cannot change password here" });
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ error: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) { next(err); }
};

// OAuth callback
const oauthCallback = async (req, res) => {
  try {
    const user         = req.user;
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    await user.save({ validateBeforeSave: false });
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    res.redirect(`${clientUrl}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  } catch {
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

module.exports = { register, login, refresh, logout, getMe, updateProfile, updateContact, changePassword, oauthCallback };
