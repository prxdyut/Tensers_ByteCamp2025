const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Cache for teacher profile photos and talking photo IDs
const teacherProfiles = {};
const talkingPhotoCache = {};

class HeyGenVideoGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.heygen.com/v1';
  }

  // Step 1: Upload Talking Photo
  async uploadTalkingPhoto(imageBuffer) {
    try {
      // Convert buffer to form data
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      formData.append('file', blob, 'teacher.jpg');

      const response = await axios.post(`${this.baseUrl}/talking_photo.upload`, formData, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.data.talking_photo_id;
    } catch (error) {
      console.error('Photo upload failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  // Step 2: Generate Video
  async generateVideo(talkingPhotoId, text, voiceId = 'd7bbcdd6964c47bdaae26decade4a933') {
    try {
      const response = await axios.post(
        'https://api.heygen.com/v2/video/generate', 
        {
          video_inputs: [
            {
              character: {
                type: "talking_photo",
                talking_photo_id: talkingPhotoId
              },
              voice: {
                type: "text",
                input_text: text,
                voice_id: voiceId
              },
              background: {
                type: "color",
                value: "#FAFAFA"
              }
            }
          ]
        },
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data.video_id;
    } catch (error) {
      console.error('Video generation failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  // Step 3: Retrieve Video
  async getVideoStatus(videoId) {
    try {
      const response = await axios.get(`${this.baseUrl}/video.status?video_id=${videoId}`, {
        headers: {
          'X-Api-Key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('Video status check failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }
}

// Function to load teacher profile or fetch from database
async function getTeacherProfile(teacherId) {
  if (teacherProfiles[teacherId]) {
    return teacherProfiles[teacherId];
  }

  // Default to teacher1 if no specific ID provided
  const id = teacherId || "teacher1";

  try {
    const photoPath = path.join(__dirname, "../assets/teachers", `${id}.jpg`);
    if (fs.existsSync(photoPath)) {
      const teacherPhoto = fs.readFileSync(photoPath);
      teacherProfiles[id] = teacherPhoto;
      return teacherPhoto;
    } else {
      // Fallback to a default image if specific teacher isn't found
      console.warn(`Teacher image ${id}.jpg not found, using default`);
      const defaultPhoto = fs.readFileSync(
        path.join(__dirname, "../assets/teachers", "teacher1.jpg")
      );
      return defaultPhoto;
    }
  } catch (error) {
    console.error("Error loading teacher profile:", error);
    throw new Error("Failed to load teacher profile image");
  }
}

async function generateAvatarVideo(audioBuffer, teacherId, text) {
  try {
    console.log("Generating avatar video for teacher:", teacherId);
    // Get teacher's profile photo
    const teacherPhoto = await getTeacherProfile(teacherId);
    
    // Initialize HeyGen API client
    const heyGen = new HeyGenVideoGenerator(process.env.HEYGEN_API_KEY);

    try {
      // Check if we already have a talking photo ID for this teacher
      let talkingPhotoId = talkingPhotoCache[teacherId];
      
      if (!talkingPhotoId) {
        // Upload the teacher's photo to get a talking photo ID
        talkingPhotoId = await heyGen.uploadTalkingPhoto(teacherPhoto);
        talkingPhotoCache[teacherId] = talkingPhotoId;
        console.log(`Created new talking photo ID for teacher ${teacherId}: ${talkingPhotoId}`);
      }

      // Generate video using the talking photo ID
      const videoId = await heyGen.generateVideo(talkingPhotoId, text);
      console.log(`Generated video with ID: ${videoId}`);

      // Poll for video completion
      const videoUrl = await pollForVideoCompletion(heyGen, videoId);

      // Download the video
      const videoResponse = await axios({
        method: "get",
        url: videoUrl,
        responseType: "arraybuffer",
        timeout: 15000,
      });

      return {
        videoData: Buffer.from(videoResponse.data),
        videoUrl: videoUrl, // Also return the URL for flexibility
        success: true
      };
    } catch (videoError) {
      // If video generation fails, log the error but don't throw
      console.warn("Video generation failed, falling back to audio only:", videoError.message);
      
      // Return a response indicating video generation failed but with teacher photo
      return {
        photoData: teacherPhoto,
        success: false,
        reason: videoError.message
      };
    }
  } catch (error) {
    console.error("Error in avatar generation:", error);
    throw error;
  }
}

// Poll for video completion
async function pollForVideoCompletion(heyGen, videoId) {
  const maxAttempts = 30;
  const delay = 2000; // 2 seconds between polls

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const statusResponse = await heyGen.getVideoStatus(videoId);
      
      if (statusResponse.data && statusResponse.data.status === "completed") {
        return statusResponse.data.video_url;
      }

      if (statusResponse.data && statusResponse.data.status === "failed") {
        throw new Error(`HeyGen error: ${statusResponse.data.error || "Unknown error"}`);
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      console.error(`Polling error on attempt ${attempt}:`, error);
      if (attempt === maxAttempts - 1) throw error;
    }
  }

  throw new Error("Video generation timed out");
}

module.exports = generateAvatarVideo;