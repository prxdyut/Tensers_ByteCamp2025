const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const analyzeMedicalImage = require('./analyzeMedicalImage');
const FormData = require('form-data');


// Create a directory to store received media
const mediaDir = path.join(__dirname, 'received_media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir);
}

// Define allowed phone numbers
const allowedPhoneNumbers = [
    '917577897882', // +91 75778 97882
    '917028393406', // +91 70283 93406
    '919152051206', // +91 91520 51206
    '918263954372',
];

// Store active doctor sessions for each user
const userSessions = {};

// Initialize the WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate QR code for authentication
client.on('qr', (qr) => {
    console.log('QR RECEIVED. Scan this with your WhatsApp app:');
    qrcode.generate(qr, { small: true });
});

// Handle ready state
client.on('ready', () => {
    console.log('Client is ready!');
});

// Handle incoming messages
client.on('message', async (message) => {
    // Extract the sender's phone number without the "@c.us" suffix
    const senderNumber = message.from.split('@')[0];
    
    // Check if the sender is in the allowed list
    if (!allowedPhoneNumbers.includes(senderNumber)) {
        console.log(`Ignored message from unauthorized number: ${senderNumber}`);
        return; // Ignore messages from unauthorized numbers
    }
    
    console.log(`Message received from authorized number ${senderNumber}: ${message.body}`);
    
    try {
        // Handle text messages
        if (message.body) {
            await handleTextMessage(message, senderNumber);
        }
        
        // Handle media (images, audio, etc.)
        if (message.hasMedia) {
            await handleMediaMessage(message, senderNumber);
        }
    } catch (error) {
        console.error('Error processing message:', error);
        await message.reply('Sorry, I encountered an error while processing your message.');
    }
});

// Function to handle text messages
async function handleTextMessage(message, senderNumber) {
    const content = message.body.toLowerCase();
    
    // Check for session commands first
    if (content === 'start doctor' || content === 'doctor help') {
        // Create a new doctor session for the user
        await startDoctorSession(message, senderNumber);
        return;
    } else if (content === 'end doctor') {
        // End the doctor session if active
        await endDoctorSession(message, senderNumber);
        return;
    }
    
    // Check if user has an active doctor session
    if (userSessions[senderNumber] && userSessions[senderNumber].active) {
        // Forward message to the doctor agent API
        await processDoctorMessage(message, senderNumber);
        return;
    }
    
    // Default command handling if no active doctor session
    if (content === 'hello' || content === 'hi') {
        await message.reply('Hello! How can I help you today? Type "doctor help" to start a consultation.');
    } else if (content === 'help') {
        await message.reply(
            'Available commands:\n' +
            '- hello/hi: Greeting\n' +
            '- help: Show this help menu\n' +
            '- start doctor: Begin a doctor consultation\n' +
            '- end doctor: End a doctor consultation\n' +
            '- time: Get current time\n' +
            '- echo [text]: Echo back your text'
        );
    } else if (content === 'time') {
        await message.reply(`The current time is: ${new Date().toLocaleString()}`);
    } else if (content.startsWith('echo ')) {
        const echoText = message.body.slice(5).trim();
        await message.reply(echoText);
    } else {
        await message.reply('I received your message. Type "help" to see available commands or "start doctor" to begin a consultation.');
    }
}

// Function to handle media messages
async function handleMediaMessage(message, senderNumber) {
    try {
        console.log('Handling media message of type:', message.type);
        
        const media = await message.downloadMedia();
        
        if (!media) {
            console.error('Failed to download media');
            await message.reply('Failed to download media.');
            return;
        }
        
        console.log('Media downloaded successfully, mimetype:', media.mimetype);
        
        // Save the media file
        const fileName = `${Date.now()}-${message.id.id}`;
        let filePath;
        let fileExtension;
        
        // Check if it's a voice note (type "ptt") regardless of mimetype
        if (message.type === 'ptt' || media.mimetype.startsWith('audio/')) {
            console.log('Processing voice note or audio...');
            
            // Determine file extension based on mimetype
            if (media.mimetype.includes('ogg')) {
                fileExtension = 'ogg';
            } else if (media.mimetype.includes('mpeg')) {
                fileExtension = 'mp3';
            } else if (media.mimetype.includes('webm')) {
                fileExtension = 'webm';
            } else {
                fileExtension = 'mp4';
            }
            
            filePath = path.join(mediaDir, `${fileName}.${fileExtension}`);
            
            // Save the audio file to disk
            try {
                fs.writeFileSync(filePath, media.data, 'base64');
                console.log('Audio file saved to:', filePath);
            } catch (writeError) {
                console.error('Error saving audio file:', writeError);
                throw writeError;
            }
            
            // Process the audio
            await processAudioMessage(message, senderNumber, filePath, media.data);
            return;
        }
        
        // Handle other media types
        switch (media.mimetype) {
            case 'image/jpeg':
            case 'image/png':
                console.log('Processing image...');
                fileExtension = media.mimetype.split('/')[1];
                filePath = path.join(mediaDir, `${fileName}.${fileExtension}`);
                fs.writeFileSync(filePath, media.data, 'base64');
                
                // If in a doctor session, analyze the medical image
                if (userSessions[senderNumber] && userSessions[senderNumber].active) {
                    await message.reply('Analyzing your medical image, please wait...');
                    
                    // Convert base64 to buffer for image analysis
                    const imageBuffer = Buffer.from(media.data, 'base64');
                    
                    // Get user's last message as context for the image
                    const imageContext = userSessions[senderNumber].lastMessage || "Please analyze this medical image";
                    
                    // Analyze the medical image
                    const analysisResult = await analyzeMedicalImage(imageBuffer, imageContext);
                    
                    // Send analysis to doctor API
                    await processDoctorImageAnalysis(message, senderNumber, analysisResult);
                } else {
                    await message.reply(`I received your image and saved it as ${fileName}.${fileExtension}. Type "start doctor" to analyze it as a medical image.`);
                }
                break;
                
            default:
                console.log('Processing unknown media type...');
                fileExtension = media.mimetype.split('/')[1] || 'unknown';
                filePath = path.join(mediaDir, `${fileName}.${fileExtension}`);
                fs.writeFileSync(filePath, media.data, 'base64');
                await message.reply(`I received your file (${media.mimetype}) and saved it as ${fileName}.${fileExtension}`);
        }
    } catch (error) {
        console.error('Error handling media message:', error);
        await message.reply('Sorry, I encountered an error while processing your media.');
    }
}


// Function to process audio messages with the external API
async function processAudioMessage(message, senderNumber, filePath, audioData) {
    try {
        await message.reply('Processing your audio message, please wait...');
        
        console.log('Audio processing started for:', filePath);
        console.log('Audio message type:', message.type);
        
        // Create a form data object for the request
        const formData = new FormData();
        
        // Read the file from disk instead of using the base64 data directly
        // This ensures we're sending the complete audio file
        let fileBuffer;
        try {
            fileBuffer = fs.readFileSync(filePath);
            console.log('File read successfully, size:', fileBuffer.length, 'bytes');
        } catch (readError) {
            console.error('Error reading audio file:', readError);
            throw new Error('Failed to read audio file');
        }
        
        // Determine content type based on the file extension
        const fileExtension = path.extname(filePath).toLowerCase();
        let contentType;
        
        if (fileExtension === '.ogg') {
            contentType = 'audio/ogg';
        } else if (fileExtension === '.mp3') {
            contentType = 'audio/mpeg';
        } else if (fileExtension === '.webm') {
            contentType = 'audio/webm';
        } else {
            contentType = 'audio/mp4';
        }
        
        console.log('Using content type:', contentType);
        
        // The endpoint expects the file with key 'file'
        formData.append('file', fileBuffer, {
            filename: path.basename(filePath),
            contentType: contentType
        });
        
        console.log('Sending request to audio processing API...');
        
        // Send the audio to the API endpoint
        const response = await axios.post('https://182d-35-238-250-153.ngrok-free.app/predict', formData, {
            headers: {
                ...formData.getHeaders(),
                'Accept': 'application/json'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000 // 120 seconds timeout for longer audio files
        });
        
        console.log('API response received:', JSON.stringify(response.data));
        
        if (response.data && response.data.success) {
            console.log('Audio processing successful');
            
            // Format the medical analysis response
            const medicalInfo = response.data.medical_info;
            const prediction = response.data.prediction;
            
            const formattedAnalysis = 
                `*Voice Analysis Results*\n\n` +
                `*Detected Condition:* ${prediction.condition}\n` +
                `*Confidence:* ${prediction.confidence.toFixed(2)}%\n` +
                `*Severity:* ${prediction.severity}\n\n` +
                `*Description:* ${medicalInfo.brief_description}\n\n` +
                `*Detailed Explanation:* ${medicalInfo.detailed_explanation}\n\n` +
                `*Recommendation:* ${medicalInfo.recommendation}`;
            
            // If user has an active doctor session, send the analysis to the doctor API
            if (userSessions[senderNumber] && userSessions[senderNumber].active) {
                // Save analysis as the last message for context
                userSessions[senderNumber].lastMessage = 
                    `I sent a voice note that was analyzed as: ${prediction.condition} (${prediction.severity} severity, ${prediction.confidence.toFixed(2)}% confidence)`;
                
                // Send analysis to doctor API
                await processDoctorVoiceAnalysis(message, senderNumber, response.data);
            } else {
                // Just reply with the formatted analysis
                await message.reply(
                    formattedAnalysis + 
                    '\n\nTo discuss this with an AI doctor, type "start doctor".'
                );
            }
        } else {
            const errorMsg = response.data?.error || 'No analysis was produced';
            console.error('Audio processing API error:', errorMsg);
            throw new Error(`Failed to process audio: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Error processing audio message:', error.message);
        if (error.response) {
            console.error('API response error:', error.response.status, error.response.statusText);
            console.error('API response data:', error.response.data);
        }
        await message.reply('Sorry, I encountered an error while processing your audio. Please try again or send a clearer recording.');
    }
}

// New function to process voice analysis with doctor API
async function processDoctorVoiceAnalysis(message, senderNumber, analysisResult) {
    try {
        // Send analyzed voice data to doctor API
        const response = await axios.post('http://localhost:6500/analyze-patient', {
            userId: userSessions[senderNumber].userId,
            text: userSessions[senderNumber].lastMessage,
            voiceAnalysis: {
                condition: analysisResult.prediction.condition,
                confidence: analysisResult.prediction.confidence,
                severity: analysisResult.prediction.severity,
                description: analysisResult.medical_info.brief_description,
                detailedExplanation: analysisResult.medical_info.detailed_explanation,
                recommendation: analysisResult.medical_info.recommendation
            }
        });
        
        if (response.data && response.data.success) {
            await message.reply(response.data.text);
        } else {
            throw new Error('Failed to get doctor analysis for voice');
        }
    } catch (error) {
        console.error('Error processing voice analysis:', error);
        
        // If API fails, still provide the analysis to user
        const medicalInfo = analysisResult.medical_info;
        const prediction = analysisResult.prediction;
        
        const formattedAnalysis = 
            `*Voice Analysis Results*\n\n` +
            `*Detected Condition:* ${prediction.condition}\n` +
            `*Confidence:* ${prediction.confidence.toFixed(2)}%\n` +
            `*Severity:* ${prediction.severity}\n\n` +
            `*Description:* ${medicalInfo.brief_description}\n\n` +
            `*Detailed Explanation:* ${medicalInfo.detailed_explanation}\n\n` +
            `*Recommendation:* ${medicalInfo.recommendation}\n\n` +
            `(Note: I couldn't connect to the doctor API, but here's your voice analysis)`;
        
        await message.reply(formattedAnalysis);
    }
}

// Function to start a doctor session
async function startDoctorSession(message, senderNumber) {
    try {
        // Check if a session already exists
        if (userSessions[senderNumber] && userSessions[senderNumber].active) {
            await message.reply('You already have an active doctor consultation. Send your symptoms or type "end doctor" to finish.');
            return;
        }
        
        // Create a new session
        userSessions[senderNumber] = {
            active: true,
            userId: `whatsapp-${senderNumber}`,
            created: new Date(),
            lastMessage: ''
        };
        
        // Start session with API
        const response = await axios.post('http://localhost:6500/api/doctor/start', {
            userId: userSessions[senderNumber].userId,
            patientInfo: `WhatsApp user ${senderNumber}`
        });
        
        if (response.data && response.data.success) {
            await message.reply(
                '🏥 *AI Doctor Consultation Started* 🏥\n\n' +
                'Hello! I\'m your AI medical assistant. Please describe your symptoms or health concerns, ' +
                'or send a photo of any visible symptoms. You can also send voice notes describing your symptoms.\n\n' +
                'Type "end doctor" anytime to end this consultation.'
            );
        } else {
            throw new Error('Failed to start doctor session');
        }
    } catch (error) {
        console.error('Error starting doctor session:', error);
        await message.reply('Sorry, I couldn\'t start your doctor consultation. Please try again later.');
        delete userSessions[senderNumber];
    }
}

// Function to end a doctor session
async function endDoctorSession(message, senderNumber) {
    try {
        // Check if session exists
        if (!userSessions[senderNumber] || !userSessions[senderNumber].active) {
            await message.reply('You don\'t have an active doctor consultation. Type "start doctor" to begin.');
            return;
        }
        
        // End session with API
        const response = await axios.post('http://localhost:6500/api/doctor/end', {
            userId: userSessions[senderNumber].userId
        });
        
        // Clean up session
        delete userSessions[senderNumber];
        
        await message.reply('Your doctor consultation has ended. Type "start doctor" if you need assistance again.');
    } catch (error) {
        console.error('Error ending doctor session:', error);
        await message.reply('Sorry, I encountered an error while ending your consultation.');
    }
}

// Function to process text messages for doctor consultation
async function processDoctorMessage(message, senderNumber, overrideText = null) {
    try {
        // Use override text if provided (e.g., from audio transcription)
        const messageText = overrideText || message.body;
        
        // Save last message for context with images
        userSessions[senderNumber].lastMessage = messageText;
        
        // Send message to doctor API
        const response = await axios.post('http://localhost:6500/analyze-patient', {
            userId: userSessions[senderNumber].userId,
            text: messageText
        });
        
        if (response.data && response.data.success) {
            await message.reply(response.data.text);
        } else {
            throw new Error('Failed to get doctor response');
        }
    } catch (error) {
        console.error('Error processing doctor message:', error);
        await message.reply('Sorry, I couldn\'t process your message. Please try again or type "end doctor" to restart.');
    }
}

// Function to process image analysis for doctor consultation
async function processDoctorImageAnalysis(message, senderNumber, analysisResult) {
    try {
        // Send analyzed image data to doctor API
        const response = await axios.post('http://localhost:6500/analyze-patient', {
            userId: userSessions[senderNumber].userId,
            text: userSessions[senderNumber].lastMessage || "I sent a medical image for analysis",
            imageAnalysis: analysisResult
        });
        
        if (response.data && response.data.success) {
            await message.reply(response.data.text);
        } else {
            throw new Error('Failed to get doctor analysis');
        }
    } catch (error) {
        console.error('Error processing image analysis:', error);
        await message.reply('Sorry, I couldn\'t analyze your medical image. Please try again or send a clearer image.');
    }
}

// Start the client
client.initialize();

module.exports = client;