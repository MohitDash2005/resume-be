const Resume          = require("../models/resume.model");
const { extractText, deleteFile } = require("../services/file.service");
const orchestrator    = require("../../ai/orchestrator");

// Normalise a filename for name-match comparison (strip extension, lowercase, trim)
const baseName = (filename) =>
  filename.replace(/\.[^/.]+$/, "").toLowerCase().trim();

// POST /api/resume/upload
const uploadResume = async (req, res, next) => {
  let resume = null;
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { filename, path: filepath, size, mimetype } = req.file;

    // 1. Find & delete the user's existing resume (one-per-user rule)
    const existing = await Resume.findOne({ user: req.user._id, status: "done" });
    let oldRawText   = null;
    let oldAnalysis  = null;
    let sameNameUpload = false;

    if (existing) {
      oldRawText  = existing.rawText;
      oldAnalysis = existing.analysis;
      // Check if the new file has the same base name as the old one
      sameNameUpload = baseName(filename) === baseName(existing.filename);
      // Delete old physical file
      deleteFile(existing.filepath);
      await existing.deleteOne();
    }

    // 2. Save new record
    resume = await Resume.create({
      user:     req.user._id,
      filename,
      filepath,
      filesize: size,
      mimetype,
      status:   "processing",
    });

    // 3. Extract text
    const rawText = await extractText(filepath, mimetype);
    if (!rawText || rawText.trim().length < 50) {
      resume.status = "failed";
      await resume.save({ validateBeforeSave: false });
      return res.status(422).json({ error: "Could not extract enough text from the file. Please upload a text-based PDF or DOCX." });
    }
    resume.rawText = rawText;

    // 4. Run AI analysis
    const analysis = await orchestrator.analyzeResume(rawText);
    resume.analysis = analysis;

    // 5. If same-name re-upload, run comparison
    let changes = null;
    if (sameNameUpload && oldRawText && oldAnalysis) {
      changes = await orchestrator.compareResumes(oldRawText, rawText, oldAnalysis, analysis);
      resume.changes = { hasPrevious: true, ...changes };
    }

    resume.status = "done";
    await resume.save();

    res.json({
      score:           analysis.score,
      atsScore:        analysis.atsScore,
      formatScore:     analysis.formatScore,
      keywordsScore:   analysis.keywordsScore,
      extractedSkills: analysis.extractedSkills,
      missingSkills:   analysis.missingSkills,
      suggestions:     analysis.suggestions,
      radarData:       analysis.radarData,
      resumeId:        resume._id,
      changes:         changes ? { hasPrevious: true, ...changes } : null,
    });
  } catch (err) {
    if (resume && resume.status === "processing") {
      resume.status = "failed";
      await resume.save({ validateBeforeSave: false }).catch(() => {});
    }
    next(err);
  }
};

// GET /api/resume/history
const getHistory = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user._id, status: "done" })
      .select("filename analysis.score createdAt")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ resumes });
  } catch (err) {
    next(err);
  }
};

// GET /api/resume/:id
const getResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    res.json({ resume });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadResume, getHistory, getResume };
