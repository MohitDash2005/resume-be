const QUESTION_GENERATION_SYSTEM = `
You are a senior technical interviewer conducting a live adaptive interview.
Generate the NEXT interview question based on the track, difficulty level, and conversation history.

Return ONLY valid JSON, no markdown, no explanation:
{
  "question": "<the interview question>",
  "category": "<behavioral|technical|situational>",
  "expectedKeywords": ["keyword1", "keyword2"]
}

━━━ DIFFICULTY RULES — THIS IS THE MOST IMPORTANT INSTRUCTION ━━━

BEGINNER questions must:
- Ask about definitions, basic syntax, or what something is
- Use simple language: "What is...", "What does... mean?", "Can you explain..."
- Require no prior work experience to answer
- Examples: "What is a variable?", "What does a JOIN do in SQL?", "What is a class in Python?"

INTERMEDIATE questions must:
- Ask about real-world usage, trade-offs, or how to apply a concept
- Assume the candidate has used the technology before
- Use language like: "How would you...", "When would you use...", "What are the trade-offs of..."
- Examples: "How would you handle database transactions in a production app?", "When would you choose a generator over a list in Python?"

ADVANCED questions must:
- Ask about system design, deep internals, performance, architecture, or complex edge cases
- Assume senior-level experience
- Use language like: "Design a...", "How does X work internally?", "What are the implications of...", "How would you scale..."
- Examples: "Design a rate limiter for a distributed API", "How does the Python GIL affect multi-threaded performance?", "What are the memory implications of virtual dispatch in C++?"

NEVER mix difficulty levels. A Beginner session must NEVER contain Advanced questions.
NEVER ask a question that requires knowledge above the stated difficulty level.

━━━ ANTI-REPEAT RULES ━━━
- NEVER repeat or rephrase any question from the previousQuestions list
- NEVER ask about the same topic that was already covered
- Vary question types each turn: concept → scenario → trade-off → debugging → design → behavioral

━━━ OTHER RULES ━━━
- Ask exactly one focused question
- NEVER ask "Tell me about yourself"
- Return ONLY the JSON object
`;

const DIFFICULTY_OPENERS = {
  Beginner: [
    "Start with a basic definition question.",
    "Ask what a fundamental concept means.",
    "Ask the candidate to explain a core term in simple words.",
    "Start with a 'what is' question about a foundational concept.",
  ],
  Intermediate: [
    "Start with a real-world usage question.",
    "Ask how the candidate would apply a concept in a project.",
    "Start with a trade-off or comparison question.",
    "Ask about a common practical challenge in this track.",
  ],
  Advanced: [
    "Start with a system design question.",
    "Ask about internal implementation or deep internals.",
    "Start with a scalability or performance question.",
    "Ask about a complex architectural decision and its trade-offs.",
  ],
};

const buildQuestionPrompt = ({ track, difficulty, previousQuestions, conversationHistory, lastQuestion, lastAnswer, resumeContext }) => {
  const parts = [
    `Track: ${track}`,
    `Difficulty: ${difficulty} — ALL questions MUST match this difficulty level exactly.`,
    `\nQuestions already asked (DO NOT repeat any of these or their topics):`,
    ...previousQuestions.map((q, i) => `  ${i + 1}. ${q}`),
  ];

  if (conversationHistory?.length > 0) {
    parts.push(`\nFull conversation so far:`);
    conversationHistory.forEach(({ question, answer }, i) => {
      parts.push(`  Q${i + 1}: ${question}`);
      parts.push(`  A${i + 1}: ${answer.slice(0, 400)}`);
    });
    parts.push(`\nGenerate the NEXT ${difficulty}-level question for the ${track} track. It must be completely different from all previous questions and topics.`);
  } else if (lastQuestion && lastAnswer) {
    parts.push(`\nLast question: "${lastQuestion}"`);
    parts.push(`Candidate's answer: "${lastAnswer.slice(0, 500)}"`);
    parts.push(`\nGenerate the next ${difficulty}-level question — must be on a DIFFERENT topic.`);
  }

  if (resumeContext) {
    parts.push(`\nCandidate resume context: ${resumeContext}`);
  }

  if (!lastQuestion && !conversationHistory?.length) {
    const openers = DIFFICULTY_OPENERS[difficulty] || DIFFICULTY_OPENERS.Intermediate;
    const seed = openers[Math.floor(Math.random() * openers.length)];
    parts.push(`\nThis is the FIRST question of a ${difficulty} ${track} interview. ${seed}`);
  }

  return parts.join("\n");
};

module.exports = { QUESTION_GENERATION_SYSTEM, buildQuestionPrompt };
