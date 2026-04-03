const { chatJSON } = require("../services/openai.service");

const SYSTEM = `
You are a senior technical recruiter comparing two versions of the same person's resume.
Your job is to identify exactly what changed between the old and new version.
Be specific, factual, and reference actual content from both resumes.

Return ONLY valid JSON with this exact structure:
{
  "scoreDelta": <number: newScore - oldScore>,
  "addedSkills": ["skill1", ...],
  "removedSkills": ["skill1", ...],
  "improvements": ["specific improvement 1", ...],
  "regressions": ["specific regression 1", ...],
  "summary": "<2-3 sentence plain-English summary of the most important changes>"
}

Rules:
- addedSkills: skills/tools/technologies present in NEW but not OLD
- removedSkills: skills/tools/technologies present in OLD but not NEW
- improvements: concrete positive changes (new role added, quantified achievement added, better formatting, new certification, etc.)
- regressions: things that got worse or were removed (removed experience, shorter descriptions, missing sections, etc.)
- summary: must mention the score change and the single most impactful change
- If nothing changed, return empty arrays and summary = "No significant changes detected between the two versions."
`;

const compareResumes = async (oldText, newText, oldAnalysis, newAnalysis) => {
  const scoreDelta = (newAnalysis?.score || 0) - (oldAnalysis?.score || 0);

  const prompt = `
OLD RESUME SCORE: ${oldAnalysis?.score || 0}
OLD SKILLS: ${(oldAnalysis?.extractedSkills || []).join(", ")}

NEW RESUME SCORE: ${newAnalysis?.score || 0}
NEW SKILLS: ${(newAnalysis?.extractedSkills || []).join(", ")}

--- OLD RESUME TEXT ---
${oldText?.slice(0, 3000) || ""}

--- NEW RESUME TEXT ---
${newText?.slice(0, 3000) || ""}

Compare these two resume versions and return the structured JSON diff.
`;

  try {
    const result = await chatJSON(SYSTEM, prompt);
    return {
      scoreDelta:    typeof result.scoreDelta === "number" ? result.scoreDelta : scoreDelta,
      addedSkills:   Array.isArray(result.addedSkills)   ? result.addedSkills   : [],
      removedSkills: Array.isArray(result.removedSkills) ? result.removedSkills : [],
      improvements:  Array.isArray(result.improvements)  ? result.improvements  : [],
      regressions:   Array.isArray(result.regressions)   ? result.regressions   : [],
      summary:       typeof result.summary === "string"   ? result.summary       : "",
    };
  } catch {
    // Fallback: basic skill diff without AI
    const oldSkills = new Set(oldAnalysis?.extractedSkills || []);
    const newSkills = new Set(newAnalysis?.extractedSkills || []);
    return {
      scoreDelta,
      addedSkills:   [...newSkills].filter(s => !oldSkills.has(s)),
      removedSkills: [...oldSkills].filter(s => !newSkills.has(s)),
      improvements:  [],
      regressions:   [],
      summary:       `Score changed by ${scoreDelta > 0 ? "+" : ""}${scoreDelta} points compared to your previous version.`,
    };
  }
};

module.exports = { compareResumes };
