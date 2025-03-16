const textToSpeech = require("@google-cloud/text-to-speech");
const dotenv = require("dotenv");

dotenv.config();

async function generateSpeechWithGoogle(text) {
  // Creates a client with authentication from environment variables
  const client = new textToSpeech.TextToSpeechClient({
    projectId: process.env.GOOGLE_PROJECT_ID,
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }
  });

  // Rest of your code remains the same
  const request = {
    input: { text: text },
    voice: {
      languageCode: "en-US",
      ssmlGender: "FEMALE",
      name: "en-US-Studio-O",
    },
    audioConfig: { audioEncoding: "MP3" },
  };

  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}

module.exports = {
  generateSpeechWithGoogle,
};