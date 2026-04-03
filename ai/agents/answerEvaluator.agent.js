const { chatJSON } = require("../services/openai.service");
const { EVALUATION_SYSTEM, buildEvaluationPrompt } = require("../prompts/evaluation.prompt");

const BANKS = {
  Java:       ["java","jvm","spring","maven","gradle","oop","inheritance","polymorphism","interface","abstract","thread","concurrency","garbage","collection","stream","lambda","generics","hibernate","jdbc","microservice"],
  Python:     ["python","django","flask","pandas","numpy","scikit","tensorflow","pytorch","decorator","generator","comprehension","asyncio","pip","virtualenv","pytest","lambda","class","module","package","api"],
  JavaScript: ["javascript","react","node","express","async","await","promise","closure","prototype","event","dom","webpack","babel","typescript","hook","component","state","props","callback","fetch"],
  "C++":      ["c++","pointer","memory","allocation","template","stl","vector","map","class","inheritance","virtual","destructor","constructor","namespace","overload","reference","iterator","algorithm","complexity"],
  SQL:        ["sql","query","join","index","transaction","acid","normalization","primary","foreign","key","aggregate","group","having","subquery","view","stored","procedure","trigger","constraint","schema"],
  HR:         ["team","leadership","communication","conflict","deadline","initiative","responsibility","impact","result","learned","improved","managed","delivered","collaborate","challenge","solution","goal","growth","passion","value"],
  General:    ["experience","skill","project","role","achieve","professional","background","strength","weakness","future","example","situation","action","result","because","therefore","however","specifically","demonstrated"],
};

const FILLERS = ["um","uh","like","basically","literally","you know","i mean","sort of","kind of","actually","honestly","right","okay so","well so"];

const isNonAnswer = (answer = "") => {
  const lower = String(answer).toLowerCase().trim();
  return (
    lower.length <= 20 &&
    /\b(i don't know|i dont know|don't know|dont know|do not know|not sure|no idea|can't remember|cannot remember|sorry)\b/.test(lower)
  );
};

const buildAdaptiveFallbackQuestion = ({ question, track = "General", answer = "", breakdown = {} }) => {
  const safeQuestion = String(question || "").trim();
  const lowerQuestion = safeQuestion.toLowerCase();
  const lowerAnswer = String(answer || "").toLowerCase();

  if ((breakdown.relevance ?? 0) <= 4) {
    return `Let's step back for a moment. In simple terms, what is ${track === "Python" && lowerQuestion.includes("generator") ? "a Python generator" : "the core concept behind this topic"}?`;
  }
  if ((breakdown.clarity ?? 0) <= 4) {
    return "Can you explain that again in one or two simple, well-structured sentences?";
  }
  if ((breakdown.depth ?? 0) <= 4) {
    return `Can you go one level deeper and give me a concrete example of how you would use that in a real ${track} project?`;
  }
  if (track === "Python") {
    if (lowerQuestion.includes("generator")) return "How is a generator different from returning a full list in memory, and what trade-offs would you consider?";
    if (lowerQuestion.includes("lists, tuples, and sets")) return "When would you choose a tuple over a list in production Python code, and why?";
  }
  if (lowerAnswer.includes("api") || lowerQuestion.includes("backend")) {
    return `If you were designing this in a real ${track} service, what trade-offs or edge cases would you think about next?`;
  }
  return "Good. Let's go a bit deeper: can you give me a practical example and explain the trade-offs?";
};

const buildFallbackEvaluation = ({ question, answer, track = "General" }) => {
  const safeAnswer = String(answer || "");
  const safeQuestion = String(question || "");
  const words = safeAnswer.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  const lower = safeAnswer.toLowerCase();
  const qLower = safeQuestion.toLowerCase();

  const qWords = qLower.split(/\s+/).filter((w) => w.length > 4);
  const overlap = qWords.filter((w) => lower.includes(w)).length;
  const relevance = Math.min(20, Math.round((overlap / Math.max(qWords.length, 1)) * 16) + (wc > 15 ? 4 : 0));
  const depth = wc < 15 ? 4 : wc < 35 ? 10 : wc < 60 ? 15 : wc < 100 ? 18 : 20;
  const bank = [...(BANKS[track] || []), ...BANKS.General];
  const hits = bank.filter((k) => lower.includes(k)).length;
  const keywords = Math.min(20, hits * 3 + (hits >= 3 ? 5 : 0));
  const sentences = safeAnswer.split(/[.!?]+/).filter((s) => s.trim().length > 4).length;
  const fillerCount = FILLERS.filter((f) => lower.includes(f)).length;
  const avgLen = wc / Math.max(sentences, 1);
  const structureOk = sentences >= 2 && avgLen >= 6 && avgLen <= 28;
  const clarityBase = structureOk ? 16 : 9;
  const clarity = Math.max(0, Math.min(20, clarityBase - fillerCount * 2 + (sentences >= 3 ? 4 : 0)));
  const assertive = ["i have","i built","i led","i designed","i implemented","i achieved","i improved","i managed","i created","i developed","my experience","in my","i am","i believe","i know"].filter((p) => lower.includes(p)).length;
  const hedging = ["i think maybe","i'm not sure","i guess","probably","might be","i don't know"].filter((p) => lower.includes(p)).length;
  const confidence = Math.max(0, Math.min(20, assertive * 4 - hedging * 3 + (wc > 40 ? 4 : 0)));
  const total = relevance + depth + keywords + clarity + confidence;
  const grade = total >= 85 ? "A" : total >= 70 ? "B" : total >= 55 ? "C" : total >= 40 ? "D" : "F";

  const feedback = [];
  if (relevance < 10) feedback.push("Address the question more directly.");
  if (depth < 10) feedback.push(wc < 30 ? "Expand your answer with more detail." : "Good length.");
  if (keywords < 8) feedback.push("Use more domain-specific terminology.");
  if (clarity < 10) feedback.push(fillerCount > 2 ? "Reduce filler words for clearer delivery." : "Structure your answer with clear sentences.");
  if (confidence < 8) feedback.push("Use assertive language to sound more confident.");
  if (!feedback.length) feedback.push("Good answer with clear structure and relevant detail.");

  return {
    total,
    grade,
    breakdown: { relevance, depth, keywords, clarity, confidence },
    feedback,
    modelAnswer: null,
    nextQuestion: buildAdaptiveFallbackQuestion({
      question, track, answer,
      breakdown: {
        relevance: Math.round(relevance / 2),
        depth: Math.round(depth / 2),
        clarity: Math.round(clarity / 2),
        keywords: Math.round(keywords / 2),
      },
    }),
    missingKeywords: [],
    wordCount: wc,
  };
};

const evaluateAnswer = async ({ question, answer, track = "General" }) => {
  if (!answer || answer.trim().length < 5) {
    return {
      total: 0, grade: "F",
      breakdown: { relevance: 0, depth: 0, keywords: 0, clarity: 0, confidence: 0 },
      feedback: ["No answer provided."],
      modelAnswer: null,
      nextQuestion: buildAdaptiveFallbackQuestion({ question, track, answer, breakdown: { relevance: 0, depth: 0, clarity: 0, keywords: 0 } }),
      missingKeywords: [],
    };
  }

  if (isNonAnswer(answer)) {
    return {
      total: 3, grade: "F",
      breakdown: { relevance: 1, depth: 0, keywords: 0, clarity: 1, confidence: 1 },
      feedback: [
        "It is okay to say you do not know, but try sharing any related concept you remember.",
        "Start with a simple definition or a small practical example next time.",
      ],
      modelAnswer: null,
      nextQuestion: buildAdaptiveFallbackQuestion({ question, track, answer, breakdown: { relevance: 0, depth: 0, clarity: 1, keywords: 0 } }),
      missingKeywords: [],
      wordCount: answer.trim().split(/\s+/).filter(Boolean).length,
    };
  }

  let result;
  try {
    result = await chatJSON(EVALUATION_SYSTEM, buildEvaluationPrompt({ question, answer, track }));
  } catch {
    return buildFallbackEvaluation({ question, answer, track });
  }

  const rawEval = result?.evaluation;
  if (!rawEval || typeof rawEval !== "object") {
    return buildFallbackEvaluation({ question, answer, track });
  }

  const clamp10 = (v) => Math.min(10, Math.max(0, Math.round(Number(v) || 0)));
  const tenPoint = {
    relevance: clamp10(rawEval.relevance),
    depth:     clamp10(rawEval.depth),
    keywords:  clamp10(rawEval.keywords),
    clarity:   clamp10(rawEval.clarity),
  };

  if (tenPoint.relevance + tenPoint.depth + tenPoint.keywords + tenPoint.clarity === 0) {
    return buildFallbackEvaluation({ question, answer, track });
  }

  const confidenceBase = Math.round((tenPoint.clarity + tenPoint.depth) / 2);
  const assertiveBoost = /\b(i built|i implemented|i designed|i used|i created|i improved|i led)\b/i.test(answer) ? 2 : 0;
  const hedgePenalty   = /\b(i think|maybe|not sure|probably|i guess|i don't know|i dont know)\b/i.test(answer) ? 2 : 0;
  const confidenceTen  = Math.max(0, Math.min(10, confidenceBase + assertiveBoost - hedgePenalty));

  const breakdown = {
    relevance:  tenPoint.relevance * 2,
    depth:      tenPoint.depth * 2,
    keywords:   tenPoint.keywords * 2,
    clarity:    tenPoint.clarity * 2,
    confidence: confidenceTen * 2,
  };

  const total = breakdown.relevance + breakdown.depth + breakdown.keywords + breakdown.clarity + breakdown.confidence;
  const grade = total >= 85 ? "A" : total >= 70 ? "B" : total >= 55 ? "C" : total >= 40 ? "D" : "F";

  const bank = [...(BANKS[track] || []), ...BANKS.General];
  const lowerAnswer = answer.toLowerCase();
  const missingKeywords = bank.filter(k => !lowerAnswer.includes(k)).slice(0, 6);

  const feedback = [
    typeof rawEval.feedback === "string" && rawEval.feedback.trim() ? rawEval.feedback.trim() : null,
    ...(Array.isArray(rawEval.mistakes) ? rawEval.mistakes.filter(m => typeof m === "string").slice(0, 3) : []),
  ].filter(Boolean);

  return {
    total,
    grade,
    breakdown,
    feedback: feedback.length ? feedback : ["Keep practicing to improve your answers."],
    modelAnswer: typeof result.full_score_answer === "string" && result.full_score_answer.trim()
      ? result.full_score_answer.trim()
      : null,
    nextQuestion: typeof result.next_question === "string" && result.next_question.trim()
      ? result.next_question.trim()
      : buildAdaptiveFallbackQuestion({ question, track, answer, breakdown: tenPoint }),
    missingKeywords,
    wordCount: answer.trim().split(/\s+/).filter(Boolean).length,
  };
};

module.exports = { evaluateAnswer };
