import express, { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'audio');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'audio-' + uniqueSuffix + '.webm');
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        // Accept only WebM audio
        if (file.mimetype === 'audio/webm') {
            cb(null, true);
        } else {
            cb(new Error('Only WebM audio format is supported.'));
        }
    }
});

// Serve static files from uploads directory
router.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// POST endpoint for audio upload and analysis
router.post('/', upload.single('audio'), async (req: MulterRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No audio file provided' });
            return;
        }

        // Create a publicly accessible URL for the audio file
        const audioUrl = `/audio/uploads/${path.basename(req.file.path)}`;

        // Mock analysis
        const mockAnalysis = {
            duration: '15 seconds',
            clarity: 85,
            pace: 'Normal',
            pronunciation: 'Good',
            confidence: 0.92,
            timestamp: new Date().toISOString(),
            audioUrl: audioUrl
        };

        res.status(200).json({
            message: 'Audio file processed successfully',
            analysis: mockAnalysis
        });

    } catch (error) {
        console.error('Error processing audio:', error);
        res.status(500).json({ 
            error: 'Error processing audio file',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router; 