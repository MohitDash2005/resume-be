require("dotenv").config();

const resumeAnalyzerAgent    = require("./agents/resumeAnalyzer.agent");
const questionGeneratorAgent = require("./agents/questionGenerator.agent");
const answerEvaluatorAgent   = require("./agents/answerEvaluator.agent");
const resumeComparisonAgent  = require("./agents/resumeComparison.agent");
const perfectAnswerAgent     = require("./agents/perfectAnswer.agent");

const orchestrator = {
  analyzeResume:  (resumeText) => resumeAnalyzerAgent.analyzeResume(resumeText),
  compareResumes: (oldText, newText, oldAnalysis, newAnalysis) =>
    resumeComparisonAgent.compareResumes(oldText, newText, oldAnalysis, newAnalysis),
  generateQuestion: (params) => questionGeneratorAgent.generateQuestion(params),
  evaluateAnswer:   (params) => answerEvaluatorAgent.evaluateAnswer(params),
  generatePerfectAnswer: (params) => perfectAnswerAgent.generatePerfectAnswer(params),
};

module.exports = orchestrator;
