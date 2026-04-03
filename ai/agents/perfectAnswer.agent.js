const { chatJSON } = require("../services/openai.service");
const { PERFECT_ANSWER_SYSTEM, buildPerfectAnswerPrompt } = require("../prompts/perfectAnswer.prompt");

const generatePerfectAnswer = async ({ question, track = "General", userAnswer = "" }) => {
  let result;
  try {
    result = await chatJSON(
      PERFECT_ANSWER_SYSTEM,
      buildPerfectAnswerPrompt({ question, track, userAnswer }),
      undefined,
      0.7
    );
  } catch (err) {
    console.error("[perfectAnswer] OpenAI error:", err?.message);
    throw new Error("AI service unavailable");
  }

  const answer = result?.fullScoreAnswer;
  if (!answer || typeof answer !== "string" || !answer.trim()) {
    console.error("[perfectAnswer] Bad response:", JSON.stringify(result));
    throw new Error("AI returned an empty full-score answer");
  }

  return {
    fullScoreAnswer: answer.trim(),
    studyNotes: Array.isArray(result.studyNotes) ? result.studyNotes.slice(0, 3) : [],
  };
};

module.exports = { generatePerfectAnswer };
