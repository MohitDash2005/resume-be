const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, lowercase: true, trim: true, default: null },
  phone:        { type: String, trim: true, default: null },
  password:     { type: String, minlength: 6, select: false },
  avatar:       { type: String, default: "" },
  googleId:     { type: String, default: null },
  githubId:     { type: String, default: null },
  isAdmin:      { type: Boolean, default: false },
  refreshToken: { type: String, select: false },
}, { timestamps: true });

// Sparse unique indexes — null values are excluded so multiple phone-only or email-only users work
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  // Strip any legacy placeholder emails
  if (obj.email?.includes("@placeholder.local")) obj.email = null;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
