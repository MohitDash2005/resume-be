const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  question:    String,
  answer:      String,
  score:       Number,
  grade:       String,
  breakdown:   { relevance: Number, depth: Number, keywords: Number, clarity: Number, confidence: Number },
  feedback:    [String],
  modelAnswer: String,
});

const interviewSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  track:        { type: String, required: true },
  difficulty:   { type: String, required: true },
  overallScore: { type: Number, default: 0 },
  grade:        { type: String, default: "F" },
  duration:     { type: Number, default: 0 },   // seconds
  answers:      [answerSchema],
  radarData:    [{ subject: String, score: Number }],
  weakAreas:    [String],
  strengths:    [String],
  status:       { type: String, enum: ["active", "completed"], default: "active" },
}, { timestamps: true });

module.exports = mongoose.model("Interview", interviewSchema);
