const OpenAI = require("openai");

let client = null;

const getClient = () => {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
};

/**
 * Sends a chat completion request and parses the JSON response.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {string} model
 * @returns {Promise<object>} Parsed JSON from the AI response
 */
const chatJSON = async (systemPrompt, userMessage, model = process.env.OPENAI_MODEL || "gpt-4o", temperature = 0.1) => {
  const openai = getClient();

  let response;
  try {
    response = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
      temperature,
      max_tokens:  2048,
    });
  } catch (err) {
    // Wrap OpenAI API errors with a cleaner message
    const msg = err?.error?.message || err?.message || "OpenAI API error";
    throw new Error(`AI service error: ${msg}`);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
};

module.exports = { chatJSON };
