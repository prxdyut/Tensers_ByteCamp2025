const { ImageAnnotatorClient } = require('@google-cloud/vision');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Google Vision Client
const configureVisionClient = () => {
  try {
    // Parse the private key (it comes as a string with escaped newlines)
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    return new ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Error configuring Vision client:', error);
    throw error;
  }
};

// Function to extract text from image buffer using Google Vision API
const extractTextFromImageBuffer = async (imageBuffer) => {
  try {
    const client = configureVisionClient();
    
    // Process the image buffer directly
    const [result] = await client.textDetection({
      image: { content: imageBuffer }
    });
    
    const detections = result.textAnnotations;
    
    if (detections && detections.length > 0) {
      // The first annotation contains the entire detected text
      return detections[0].description;
    } else {
      return 'No text detected in the image.';
    }
  } catch (error) {
    console.error('Error detecting text:', error);
    throw error;
  }
};

module.exports = extractTextFromImageBuffer