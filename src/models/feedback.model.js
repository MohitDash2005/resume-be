const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  category:{ type: String, enum: ["general", "resume", "interview", "ui", "other"], default: "general" },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  pinned:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
