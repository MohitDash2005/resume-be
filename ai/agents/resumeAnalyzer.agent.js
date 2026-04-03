const { chatJSON } = require("../services/openai.service");
const { RESUME_ANALYSIS_SYSTEM, buildResumePrompt } = require("../prompts/resume.prompt");

/**
 * Analyzes resume text and returns structured scoring + insights.
 * @param {string} resumeText - Raw extracted text from the resume
 * @returns {Promise<object>} Analysis result matching Resume model schema
 */
const analyzeResume = async (resumeText) => {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error("Resume text is too short to analyze");
  }

  let result;
  try {
    result = await chatJSON(RESUME_ANALYSIS_SYSTEM, buildResumePrompt(resumeText));
  } catch (err) {
    throw new Error(`Resume analysis failed: ${err.message}`);
  }

  const atsScore      = Math.min(100, Math.max(0, result.atsScore      || 0));
  const formatScore   = Math.min(100, Math.max(0, result.formatScore   || 0));
  const keywordsScore = Math.min(100, Math.max(0, result.keywordsScore || 0));
  const radarData     = Array.isArray(result.radarData) ? result.radarData : [];
  const experienceScore = radarData.find(r => r.subject === "Experience")?.A || 0;

  // Enforce weighted formula — never trust GPT-4's raw score directly
  const score = Math.round(
    atsScore * 0.35 + formatScore * 0.25 + keywordsScore * 0.25 + experienceScore * 0.15
  );

  return {
    score,
    atsScore,
    formatScore,
    keywordsScore,
    extractedSkills: Array.isArray(result.extractedSkills) ? result.extractedSkills : [],
    missingSkills:   Array.isArray(result.missingSkills)   ? result.missingSkills   : [],
    suggestions:     Array.isArray(result.suggestions)     ? result.suggestions     : [],
    radarData,
  };
};

module.exports = { analyzeResume };
