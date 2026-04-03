const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  filesize: { type: Number },
  mimetype: { type: String },
  rawText:  { type: String },

  // AI Analysis result
  analysis: {
    score:           { type: Number, default: 0 },
    extractedSkills: [String],
    missingSkills:   [String],
    suggestions:     [String],
    radarData:       [{ subject: String, A: Number }],
    atsScore:        { type: Number, default: 0 },
    formatScore:     { type: Number, default: 0 },
    keywordsScore:   { type: Number, default: 0 },
  },

  // Comparison with previous resume (only when same-name resume is re-uploaded)
  changes: {
    hasPrevious:   { type: Boolean, default: false },
    scoreDelta:    { type: Number, default: 0 },
    addedSkills:   [String],
    removedSkills: [String],
    improvements:  [String],
    regressions:   [String],
    summary:       { type: String, default: "" },
  },

  status: { type: String, enum: ["pending", "processing", "done", "failed"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Resume", resumeSchema);
