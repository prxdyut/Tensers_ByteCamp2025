import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';

interface AnalysisResult {
    message: string;
    analysis: {
        duration: string;
        clarity: number;
        pace: string;
        pronunciation: string;
        confidence: number;
        timestamp: string;
        audioUrl: string;
    };
}

const VoiceAnalyser = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingComplete, setRecordingComplete] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const sampleText = `Please read this paragraph aloud clearly and at a natural pace. 
    Your voice will be recorded and analyzed for various parameters including clarity, 
    pace, and pronunciation. Take a deep breath before you start, and click the 
    microphone icon when you're ready to begin reading. Click it again when you're 
    finished.`;

    const getSupportedMimeType = () => {
        const types = [
            'audio/webm',
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];
        return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudioToServer(audioBlob);
                setRecordingComplete(true);
            };

            // Request data every second to ensure we get all audio
            mediaRecorder.start(1000);
            setIsRecording(true);
            setRecordingComplete(false);
            setAnalysisResult(null);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            if (error instanceof Error && error.name === 'NotSupportedError') {
                alert('Your browser does not support WebM audio recording. Please use a modern browser like Chrome or Firefox.');
            } else {
                alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const sendAudioToServer = async (audioBlob: Blob) => {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('http://localhost:3000/audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to send audio to server');
            }

            const data = await response.json();
            setAnalysisResult(data);
            console.log('Server response:', data);
        } catch (error) {
            console.error('Error sending audio to server:', error);
            alert('Error sending audio recording to server.');
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <main className="dashboard-main">
            <div className="navbar-header border-b border-neutral-200 dark:border-neutral-600">
                <div className="flex items-center justify-between">
                    <div className="col-auto">
                        <div className="flex flex-wrap items-center gap-[16px]">
                            <button type="button" className="sidebar-toggle">
                                <Icon icon="heroicons:bars-3-solid" className="icon non-active" />
                                <Icon icon="iconoir:arrow-right" className="icon active" />
                            </button>
                            <h6 className="font-semibold mb-0 dark:text-white">Voice Analyser</h6>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-main-body">
                <div className="max-w-3xl mx-auto mt-8 p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-lg">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">Voice Analysis Test</h2>
                        <p className="text-neutral-600 dark:text-neutral-300 mb-2">Instructions:</p>
                        <ol className="list-decimal list-inside text-neutral-600 dark:text-neutral-300 mb-6">
                            <li>Read the text below aloud</li>
                            <li>Click the microphone icon to start recording</li>
                            <li>Click again when you're finished</li>
                            <li>Wait for the analysis results</li>
                        </ol>
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-700 p-6 rounded-lg mb-8">
                        <p className="text-lg text-neutral-800 dark:text-neutral-200 leading-relaxed">
                            {sampleText}
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={toggleRecording}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    isRecording 
                                        ? 'bg-red-500 hover:bg-red-600' 
                                        : 'bg-primary-500 hover:bg-primary-600'
                                }`}
                            >
                                <Icon 
                                    icon={isRecording ? "mdi:microphone-off" : "mdi:microphone"} 
                                    className="text-white text-3xl"
                                />
                            </button>
                            {isRecording && (
                                <>
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></span>
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"></span>
                                </>
                            )}
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <p className={`text-lg font-medium ${isRecording ? 'text-red-500 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                {isRecording ? 'Recording in progress...' : 'Click to start recording'}
                            </p>
                            {isRecording && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 animate-pulse">
                                    Click microphone again to stop
                                </p>
                            )}
                        </div>
                        {recordingComplete && !analysisResult && (
                            <div className="text-center mt-4">
                                <p className="text-green-500 dark:text-green-400">
                                    Recording complete! Analysis in progress...
                                </p>
                            </div>
                        )}
                        {analysisResult && (
                            <div className="w-full mt-6 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                                <h3 className="text-xl font-semibold mb-4 dark:text-white">Analysis Results</h3>
                                <div className="grid gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-600 dark:text-neutral-300">Duration:</span>
                                        <span className="font-medium dark:text-white">{analysisResult.analysis.duration}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-600 dark:text-neutral-300">Clarity:</span>
                                        <span className="font-medium dark:text-white">{analysisResult.analysis.clarity}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-600 dark:text-neutral-300">Pace:</span>
                                        <span className="font-medium dark:text-white">{analysisResult.analysis.pace}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-600 dark:text-neutral-300">Pronunciation:</span>
                                        <span className="font-medium dark:text-white">{analysisResult.analysis.pronunciation}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-600 dark:text-neutral-300">Confidence:</span>
                                        <span className="font-medium dark:text-white">{(analysisResult.analysis.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="mt-4">
                                        <audio 
                                            ref={audioPlayerRef}
                                            src={`http://localhost:3000${analysisResult.analysis.audioUrl}`}
                                            controls
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <footer className="d-footer">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="mb-0 text-neutral-600">
                        © {new Date().getFullYear()} TensersWatch. All Rights Reserved.
                    </p>
                    <p className="mb-0">
                        Powered by{" "}
                        <a href="#" className="text-primary-600 dark:text-primary-600 hover:underline">
                            Tensers
                        </a>
                    </p>
                </div>
            </footer>
        </main>
    );
};

export default VoiceAnalyser; 