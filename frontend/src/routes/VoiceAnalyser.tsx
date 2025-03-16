import { useState } from 'react';
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
    };
}

const VoiceAnalyser = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('audio', file);
            
            setIsProcessing(true);
            setAnalysisResult(null);

            const response = await fetch('http://localhost:3000/audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload file');
            }

            const data = await response.json();
            setAnalysisResult(data);
            console.log('Server response:', data);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file.');
        } finally {
            setIsProcessing(false);
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
                            <li>Upload a file from your device</li>
                            <li>Wait for the analysis results</li>
                        </ol>
                    </div>

                    <div className="flex flex-col items-center gap-8">
                        {/* Upload Section */}
                        <div className="flex flex-col items-center gap-4 w-full max-w-md">
                            <h3 className="text-lg font-semibold dark:text-white">Upload File</h3>
                            <div className="w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-300 border-dashed rounded-lg cursor-pointer bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Icon icon="heroicons:cloud-arrow-up" className="w-8 h-8 mb-3 text-neutral-500 dark:text-neutral-400" />
                                        <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">All file types accepted</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Status and Results */}
                        {isProcessing && !analysisResult && (
                            <div className="text-center mt-4">
                                <p className="text-green-500 dark:text-green-400">
                                    Processing file... Analysis in progress...
                                </p>
                            </div>
                        )}

                        {/* Analysis Results */}
                        {analysisResult && (
                            <div className="w-full mt-6 space-y-6">

                                {/* Medical Analysis Results */}
                                {analysisResult.analysis.medical_info && analysisResult.analysis.prediction && (
                                    <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                                        <h3 className="text-xl font-semibold mb-4 dark:text-white">Medical Analysis</h3>
                                        
                                        {/* Prediction Results */}
                                        <div className="mb-6">
                                            <h4 className="text-lg font-medium mb-3 dark:text-white">Prediction Results</h4>
                                            <div className="grid gap-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-neutral-600 dark:text-neutral-300">Condition:</span>
                                                    <span className="font-medium dark:text-white capitalize">{analysisResult.analysis.prediction.condition}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-neutral-600 dark:text-neutral-300">Confidence:</span>
                                                    <span className="font-medium dark:text-white">{analysisResult.analysis.prediction.confidence.toFixed(1)}%</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-neutral-600 dark:text-neutral-300">Severity:</span>
                                                    <span className={`font-medium ${
                                                        analysisResult.analysis.prediction.severity === 'Low' 
                                                            ? 'text-green-500' 
                                                            : analysisResult.analysis.prediction.severity === 'Medium'
                                                            ? 'text-yellow-500'
                                                            : 'text-red-500'
                                                    }`}>
                                                        {analysisResult.analysis.prediction.severity}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Medical Information */}
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-lg font-medium mb-2 dark:text-white">Brief Description</h4>
                                                <p className="text-neutral-600 dark:text-neutral-300">
                                                    {analysisResult.analysis.medical_info.brief_description}
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-medium mb-2 dark:text-white">Detailed Explanation</h4>
                                                <p className="text-neutral-600 dark:text-neutral-300">
                                                    {analysisResult.analysis.medical_info.detailed_explanation}
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-medium mb-2 dark:text-white">Recommendation</h4>
                                                <p className="text-neutral-600 dark:text-neutral-300">
                                                    {analysisResult.analysis.medical_info.recommendation}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
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