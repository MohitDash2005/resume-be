const orchestrator = require("../../ai/orchestrator");

// POST /api/ai/analyze
const analyzeResume = async (req, res, next) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText?.trim()) return res.status(400).json({ error: "resumeText is required" });
    if (resumeText.trim().length < 50) return res.status(400).json({ error: "Resume text is too short" });
    const result = await orchestrator.analyzeResume(resumeText);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/question
const generateQuestion = async (req, res, next) => {
  try {
    const { track, difficulty, previousQuestions = [], conversationHistory = [], lastQuestion, lastAnswer, resumeContext } = req.body;
    if (!track?.trim() || !difficulty?.trim()) {
      return res.status(400).json({ error: "track and difficulty are required" });
    }
    const safeContext     = resumeContext  ? String(resumeContext).slice(0, 1000)  : undefined;
    const safeLastAnswer  = lastAnswer     ? String(lastAnswer).slice(0, 800)      : undefined;
    const safePrevious    = Array.isArray(previousQuestions)    ? previousQuestions.slice(-15)    : [];
    const safeHistory     = Array.isArray(conversationHistory)  ? conversationHistory.slice(-10)  : [];

    const question = await orchestrator.generateQuestion({ track, difficulty, previousQuestions: safePrevious, conversationHistory: safeHistory, lastQuestion, lastAnswer: safeLastAnswer, resumeContext: safeContext });
    res.json({ question });
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/evaluate
const evaluateAnswer = async (req, res, next) => {
  try {
    const { question, answer, track } = req.body;
    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({ error: "question and answer are required" });
    }
    if (answer.trim().length < 3) {
      return res.status(400).json({ error: "Answer is too short to evaluate" });
    }
    const evaluation = await orchestrator.evaluateAnswer({ question, answer: answer.slice(0, 2000), track });
    res.json(evaluation);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/perfect-answer
const generatePerfectAnswer = async (req, res, next) => {
  try {
    const { question, track, userAnswer } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const result = await orchestrator.generatePerfectAnswer({
      question: question.slice(0, 500),
      track,
      userAnswer: String(userAnswer || "").slice(0, 2000),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { analyzeResume, generateQuestion, evaluateAnswer, generatePerfectAnswer };
