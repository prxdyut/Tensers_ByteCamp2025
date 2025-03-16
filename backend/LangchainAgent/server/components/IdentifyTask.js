const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

// Define your API key directly (though using environment variables is more secure)
const Gemini =
  process.env.GEMINI_API_KEY1 || "AIzaSyDU7hW5y76wNHswahAxYC-8iTI_luzaaFo";

/**
 * Identifies whether the given task question is a coding task or a normal (non-coding) task
 * @param {string} question - The task question to analyze
 * @returns {Promise<string>} - String "coding" or "normal" indicating task type
 */
async function identifyTask(question) {
  try {
    console.log("Identifying task type for:", question);
    console.log("Using API Key:", Gemini);

    // Initialize Gemini with the API key
    const genAI = new GoogleGenerativeAI(Gemini);

    // Use the more recent model and add system instructions
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: `
You are a Task Type Analyzer that determines if a user's question/task is coding-related or not.

RULES:
1. Analyze the user's input to determine if it's a coding task or a non-coding task.
2. Coding tasks include: writing functions, algorithms, code snippets, debugging, code explanation, etc.
3. Non-coding tasks include: general knowledge questions, facts, explanations of non-programming concepts, etc.

OUTPUT FORMAT:
Return a JSON object with:
{
  "taskType": string  // Either "coding" or "normal"
}`,
    });

    // Configure generation parameters
    const generationConfig = {
      temperature: 0.1, // Low temperature for more deterministic results
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 100,
      responseMimeType: "text/plain",
    };

    try {
      // Start chat session and send the message
      const chatSession = model.startChat({ generationConfig });
      const result = await chatSession.sendMessage(question);
      const response = result.response.text().trim().toLowerCase();
      
      // Simply return the taskType directly
      if (response.includes("coding")) {
        return "coding";
      } else {
        return "normal";
      }
    } catch (error) {
      console.error("Error in Gemini API call:", error);
      const response = error.response?.text?.().toLowerCase() || "";
      if (response.includes("coding")) {
        return "coding";
      } else {
        return "normal";
      }
    }
  } catch (error) {
    console.error("Error identifying task:", error);
    // Return a default in case of error
    return "normal";
  }
}

module.exports = identifyTask;