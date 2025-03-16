const { GoogleGenerativeAI } = require("@google/generative-ai");
const sharp = require("sharp");
const dotenv = require("dotenv");

dotenv.config();

/**
 * Analyzes a medical image using Google's Generative AI (Gemini Pro Vision)
 * @param {Buffer} imageBuffer - The raw image buffer
 * @param {string} userPrompt - User's description or question about the image
 * @returns {Promise<string>} - The analysis result
 */
async function analyzeMedicalImage(imageBuffer, userPrompt) {
  try {
    // Initialize Gemini API client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY1);

    // Get Gemini Pro Vision model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Process the image: Resize while maintaining aspect ratio
    const processedImageBuffer = await sharp(imageBuffer)
      .resize({ width: 800, height: 800, fit: "inside" })
      .toFormat("jpeg")
      .toBuffer();

    // Convert image to base64 for API
    const base64Image = processedImageBuffer.toString("base64");

    // Prepare the image part for Gemini API
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg", // Ensure correct MIME type
      },
    };

    // Refined prompt for better response clarity
    const prompt = `
      You are an AI Image Analyzer specialised in medical imaging analysis.
      The patient described: "${userPrompt || "Please analyze this medical image"}"
      
      Carefully analyze the image and provide insights:
      1. **Observations**: Describe key visible elements in the image.
      2. **Potential Medical Insights**: Mention possible medical implications (without diagnosing).
      3. **Patient Advice**: Explain findings in simple terms.
      4. **Next Steps**: If relevant, suggest whether a professional medical review is needed.
      
      Keep responses precise, informative, and non-alarming.
      Remember Your response will be passed to another AI for further analysis.SO please be as detailed as possible.
    `;

    // Generate response from Gemini
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = await response.text(); // Fixed incorrect response extraction
    console.log("Medical image analysis:", text);
    return text;
  } catch (error) {
    console.error("Error analyzing medical image:", error.message);
    return "⚠️ Unable to analyze the medical image due to a technical issue. Ensure the image is clear and try again.";
  }
}

module.exports = analyzeMedicalImage;
