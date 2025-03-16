import express, { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
const ngrok = "https://46b6-34-147-94-58.ngrok-free.app/predict"
console.log('Audio route module initialized');

const router = express.Router();

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

interface PredictionResponse {
    success: boolean;
    error?: string;
    medical_info?: {
        brief_description: string;
        detailed_explanation: string;
        recommendation: string;
    };
    prediction?: {
        condition: string;
        confidence: number;
        severity: string;
    };
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'files');
        console.log(`Creating upload directory at: ${uploadDir}`);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            console.log('Upload directory does not exist, creating it...');
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('Upload directory created successfully');
        } else {
            console.log('Upload directory already exists');
        }
        cb(null, uploadDir);
    },
    filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalExt = path.extname(file.originalname) || '.bin';
        const filename = 'file-' + uniqueSuffix + originalExt;
        console.log(`Generated filename: ${filename}`);
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});

// Serve static files from uploads directory
router.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));
console.log('Static file serving configured for uploads directory');

async function getPrediction(filePath: string): Promise<PredictionResponse> {
    console.log(`Starting prediction request for file: ${filePath}`);
    try {
        // Create form data
        console.log('Creating FormData for prediction request');
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), {
            filename: path.basename(filePath),
            contentType: 'application/octet-stream'
        });
        console.log('File appended to FormData successfully');

        // Send request to prediction endpoint
        console.log('Sending request to prediction endpoint...');
        const response = await axios.post<PredictionResponse>(ngrok, form, {
            headers: {
                ...form.getHeaders()
            }
        });
        console.log('Prediction response received:', response.data);

        return response.data;
    } catch (error) {
        console.error('Prediction error details:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw new Error('Failed to get prediction');
    }
}

// POST endpoint for file upload and analysis
router.post('/', upload.single('audio'), async (req: MulterRequest, res: Response): Promise<void> => {
    console.log('Received file upload request');
    try {
        if (!req.file) {
            console.log('No file provided in request');
            res.status(400).json({ error: 'No file provided' });
            return;
        }
        console.log('File upload successful:', {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            originalname: req.file.originalname
        });

        // Create a publicly accessible URL for the file
        const fileUrl = `/audio/uploads/${path.basename(req.file.path)}`;
        console.log(`Generated public file URL: ${fileUrl}`);

        try {
            // Get prediction from ML model
            console.log('Requesting prediction from ML model...');
            const prediction = await getPrediction(req.file.path);

            if (!prediction.success) {
                console.log('Prediction failed:', prediction.error);
                throw new Error(prediction.error || 'Prediction failed');
            }

            console.log('Prediction successful:', prediction);

            // Combine prediction results with file URL
            const analysis = {
                duration: '15 seconds',
                clarity: 85,
                pace: 'Normal',
                pronunciation: 'Good',
                confidence: 0.92,
                timestamp: new Date().toISOString(),
                audioUrl: fileUrl,
                medical_info: prediction.medical_info || {
                    brief_description: "No medical analysis available.",
                    detailed_explanation: "The prediction service was unable to provide a detailed medical analysis.",
                    recommendation: "Please consult with a healthcare professional for a proper evaluation."
                },
                prediction: prediction.prediction || {
                    condition: "unknown",
                    confidence: 0,
                    severity: "Unknown"
                }
            };
            console.log('Analysis results compiled:', analysis);

            res.status(200).json({
                message: 'File processed successfully',
                analysis: analysis
            });
            console.log('Success response sent to client');

        } catch (predictionError) {
            console.error('Prediction service error:', {
                error: predictionError instanceof Error ? predictionError.message : 'Unknown error',
                stack: predictionError instanceof Error ? predictionError.stack : undefined
            });
            
            // Still return basic analysis if prediction fails
            const mockAnalysis = {
                duration: '15 seconds',
                clarity: 85,
                pace: 'Normal',
                pronunciation: 'Good',
                confidence: 0.92,
                timestamp: new Date().toISOString(),
                audioUrl: fileUrl,
                medical_info: {
                    brief_description: "No medical analysis available.",
                    detailed_explanation: "The prediction service was unable to provide a detailed medical analysis.",
                    recommendation: "Please consult with a healthcare professional for a proper evaluation."
                },
                prediction: {
                    condition: "unknown",
                    confidence: 0,
                    severity: "Unknown"
                }
            };
            console.log('Using fallback analysis:', mockAnalysis);

            res.status(200).json({
                message: 'File processed with fallback analysis',
                analysis: mockAnalysis,
                warning: 'Prediction service unavailable, using fallback analysis'
            });
            console.log('Fallback response sent to client');
        }

    } catch (error) {
        console.error('Fatal error in audio processing:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ 
            error: 'Error processing audio file',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Error response sent to client');
    }
});

console.log('Audio route setup complete');

export default router; 