import React, { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Settings,
  Users,
  Brain,
  ChevronRight,
  MessageCircle,
  Clock,
  Play,
  Check,
  Upload,
  FileText,
  X,
  Save,
  ImageIcon,
  Minimize2,
  Maximize2,
  Code,
  FileDown,
  Printer,
  CheckCircle2,
  ClipboardList,
  Download,
} from "lucide-react";
import axios from "axios";
import EnhancedSpeechRecognition from "./SpeechRecog";

export const Doctor = () => {
  const [audioUrl, setAudioUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [messages, setMessages] = useState([]);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMedicalPanel, setShowMedicalPanel] = useState(false);
  const [vitalSigns, setVitalSigns] = useState({
    temperature: "98.6°F",
    bloodPressure: "120/80",
    heartRate: "72 bpm",
    oxygenSaturation: "98%",
  });
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptom, setSelectedSymptom] = useState("");
  const [lastCapturedFrame, setLastCapturedFrame] = useState(null);
  const [doctorSessionStarted, setDoctorSessionStarted] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [medicalReport, setMedicalReport] = useState(null);
  const [healthRecommendations, setHealthRecommendations] = useState([]);
  const [reportGenerating, setReportGenerating] = useState(false);

  const userId = useRef("user_" + Math.random().toString(36).substring(2, 15));
  const videoRef = useRef(null);
  const chatContainerRef = useRef(null);
  const audioRef = useRef(new Audio());

  const { isListening, transcribedText, startListening, stopListening } =
    EnhancedSpeechRecognition();

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Update this useEffect for better camera initialization
  // Fix Video initialization - ensure it runs only once on mount and when camera state changes
  useEffect(() => {
    let videoStream = null;
    let mounted = true;

    const initializeCamera = async () => {
      if (!mounted) return;

      // Always clean up previous stream first
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      // Only try to initialize if camera should be on
      if (isCameraOn) {
        try {
          console.log("Requesting camera access...");

          const constraints = {
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
              frameRate: { ideal: 30 },
            },
            audio: false,
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);

          // Check if component is still mounted before applying stream
          if (!mounted) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoStream = stream;

            // Fix: Make sure browser knows video is ready before playing
            videoRef.current.onloadedmetadata = () => {
              if (!mounted) return;

              videoRef.current
                .play()
                .then(() => console.log("Video playing successfully"))
                .catch((err) => {
                  console.error("Error playing video:", err);
                  // Try alternative approach for mobile
                  videoRef.current.muted = true;
                  videoRef.current
                    .play()
                    .catch((e) => console.error("Failed even with muted:", e));
                });
            };
          }
        } catch (err) {
          console.error("Camera access error:", err);
          setIsCameraOn(false);
        }
      }
    };

    initializeCamera();

    // Cleanup function is crucial
    return () => {
      mounted = false;
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraOn]);

  // Add this useEffect to show live transcription
  useEffect(() => {
    if (isListening && transcribedText) {
      // Update the UI when transcription is happening
      console.log("Transcription in progress:", transcribedText);
    }
  }, [isListening, transcribedText]);

  // Handle audio playback
  // Fix audio playback implementation
  useEffect(() => {
    if (audioUrl) {
      try {
        console.log(
          "Setting up audio playback:",
          audioUrl.substring(0, 50) + "..."
        );
        audioRef.current = new Audio(`data:audio/mp3;base64,${audioUrl}`);
        audioRef.current.onplay = () => setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
        };

        // Play the audio
        audioRef.current
          .play()
          .then(() => console.log("Audio playback started"))
          .catch((e) => console.error("Audio play error:", e));
      } catch (error) {
        console.error("Audio setup error:", error);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }
    };
  }, [audioUrl]);

  // Fetch conversation history
  const fetchConversationHistory = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/doctor-history/${userId.current}`
      );

      if (response.data.success) {
        setMessages(response.data.conversation);
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  // Start medical consultation
  const startMedicalConsultation = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/start-doctor", {
        userId: userId.current,
        patientInfo: "", // Could be populated from a form or previous data
      });

      if (response.data.success) {
        setDoctorSessionStarted(true);
        setAudioUrl(response.data.audio || "");

        // Handle the situation where text or message could be sent
        const responseText =
          response.data.text ||
          response.data.message ||
          "Hello, I'm your AI doctor assistant. How can I help you today?";
        setAiResponse(responseText);

        // Add initial message to chat
        setMessages([
          {
            type: "ai",
            text: responseText,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error starting doctor consultation:", error);

      // Add a fallback message if the request fails
      setDoctorSessionStarted(true);
      const fallbackMessage =
        "Hello! I'm your AI doctor assistant. I'm here to provide medical information and answer your health-related questions. How can I assist you today?";
      setAiResponse(fallbackMessage);
      setMessages([
        {
          type: "ai",
          text: fallbackMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Improved frame capture function

  // Improved captureVideoFrame function with more reliable frame capture
  const captureVideoFrame = () => {
    if (!videoRef.current) {
      console.error("Video element not available for frame capture");
      return null;
    }

    // Check if video is actually playing and receiving frames
    if (
      !videoRef.current.srcObject ||
      !videoRef.current.srcObject.active ||
      videoRef.current.videoWidth === 0
    ) {
      console.error("Video stream not active or no frames available");
      return null;
    }

    try {
      console.log("Capturing video frame...");

      // Get the actual video dimensions from the element
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      console.log("Video dimensions:", videoWidth, "x", videoHeight);

      // Set sensible defaults if dimensions are not available
      const canvasWidth = videoWidth > 0 ? videoWidth : 640;
      const canvasHeight = videoHeight > 0 ? videoHeight : 480;

      // Create canvas with those dimensions
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw the current video frame to the canvas
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Convert to JPEG data URL with high quality
      const frameData = canvas.toDataURL("image/jpeg", 0.95);

      // Log the size
      console.log(
        "Frame captured, size:",
        Math.round(frameData.length / 1024),
        "KB"
      );

      // Store the frame for display
      setLastCapturedFrame(frameData);

      // Return the frame data
      return frameData;
    } catch (error) {
      console.error("Error during frame capture:", error);
      return null;
    }
  };

  // Update the handleDoneSpeaking to be more reliable
  const handleDoneSpeaking = async () => {
    stopListening();
    console.log("Done speaking. Transcribed text:", transcribedText);

    if (!transcribedText || transcribedText.trim() === "") {
      console.log("No transcribed text to send");
      return;
    }

    setIsLoading(true);

    // Add user message to chat immediately
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: transcribedText,
        timestamp: new Date(),
      },
    ]);

    try {
      // Attempt to capture frame if camera is on
      let frameData = null;

      if (isCameraOn) {
        // Try multiple times to capture frame with short delays
        for (let attempt = 0; attempt < 3; attempt++) {
          console.log(`Frame capture attempt ${attempt + 1}`);
          frameData = captureVideoFrame();

          if (frameData) {
            console.log(
              `Frame captured successfully on attempt ${attempt + 1}`
            );
            break;
          }

          // Wait a short time before trying again
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }
      }

      console.log("Sending request to backend");
      console.log("Frame data included:", !!frameData);

      // Send the data to your backend
      const response = await axios.post(
        "http://localhost:5000/doctor-analyze",
        {
          userId: userId.current,
          text: transcribedText,
          frameData: frameData,
        },
        {
          timeout: 60000,
          maxContentLength: 10 * 1024 * 1024,
        }
      );

      if (response.data && response.data.success) {
        // Handle audio response if present
        if (response.data.audio) {
          setAudioUrl(response.data.audio);
        }

        // Get the text response
        setAiResponse(response.data.text || "");

        // Add AI response to chat
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            text: response.data.text || "I'm analyzing your input.",
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error processing speech:", error);
      console.error("Response data:", error.response?.data);

      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: "I'm sorry, I encountered an error processing your message. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle microphone
  // Update the toggleMic function to better handle the speech recognition
  const toggleMic = () => {
    if (!isMicOn) {
      console.log("Starting speech recognition...");
      startListening();
      // Show a message if speech recognition isn't working after a delay
      setTimeout(() => {
        if (isMicOn && !transcribedText) {
          console.log("Speech recognition started but no text detected");
        }
      }, 3000);
    } else {
      console.log("Stopping speech recognition...");
      handleDoneSpeaking();
    }
    setIsMicOn(!isMicOn);
  };

  // Toggle camera
  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  // Update the handleEndSession function
  
  // Update the handleEndSession function
  const handleEndSession = async () => {
    setReportGenerating(true);
  
    try {
      // Extract just what we need for report generation
      const consultationData = {
        userId: userId.current,
        conversation: messages, // Only send conversation history
      };
  
      // Call server to generate medical report and health recommendations
      const response = await axios.post(
        "http://localhost:5000/generate-medical-report",
        consultationData
      );
  
      if (response.data && response.data.success) {
        // Parse the report text into a structured object
        const reportText = response.data.report || "";
        
        const reportObject = {
          patientConcerns: extractSection(reportText, "PATIENT CONCERNS"),
          assessmentSummary: extractSection(reportText, "ASSESSMENT"),
          recommendations: extractSection(reportText, "RECOMMENDATIONS")
        };
        
        // Set the medical report data
        setMedicalReport(reportObject);
  
        // Parse health recommendations from string to array of objects
        const recommendationsArray = parseRecommendations(response.data.healthTips || "");
        setHealthRecommendations(recommendationsArray);
  
        // Generate and download PDF automatically
        setTimeout(() => {
          if (reportObject) {
            downloadMedicalReport(reportObject, recommendationsArray);
          }
        }, 1000);
  
        // Show the end screen with report and recommendations
        setShowEndScreen(true);
  
        // Close the session on the server
        await axios.post("http://localhost:5000/end-doctor", {
          userId: userId.current,
        });
      } else {
        throw new Error("Failed to generate medical report");
      }
    } catch (error) {
      console.error("Error generating medical report:", error);
  
      // Create fallback report if real one fails
      const fallbackReport = {
        patientConcerns: "Your medical concerns were discussed during the consultation.",
        assessmentSummary: "A general assessment was provided by the AI medical assistant.",
        recommendations: "Please consult with a healthcare professional for specific medical advice."
      };
      
      const fallbackRecommendations = [
        { title: "Regular Check-ups", description: "Schedule routine medical check-ups" },
        { title: "Balanced Diet", description: "Maintain a nutritious and balanced diet" },
        { title: "Physical Activity", description: "Engage in regular physical activity" },
        { title: "Adequate Sleep", description: "Ensure 7-8 hours of quality sleep" },
        { title: "Stress Management", description: "Practice stress reduction techniques" }
      ];
      
      setMedicalReport(fallbackReport);
      setHealthRecommendations(fallbackRecommendations);
  
      // Show a basic end screen with fallback data
      setShowEndScreen(true);
      
      // Generate PDF with fallback data
      setTimeout(() => {
        downloadMedicalReport(fallbackReport, fallbackRecommendations);
      }, 1000);
  
      // Try to end the session anyway
      try {
        await axios.post("http://localhost:5000/end-doctor", {
          userId: userId.current,
        });
      } catch (endError) {
        console.error("Error ending doctor session:", endError);
      }
    } finally {
      setReportGenerating(false);
    }
  };
  
  // Helper function to extract sections from report text
  const extractSection = (text, sectionName) => {
    if (!text) return "";
    
    const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };
  
  // Helper function to parse recommendations string to array of objects
  const parseRecommendations = (recommendationsText) => {
    if (!recommendationsText) return [];
    
    const lines = recommendationsText.split('\n').filter(line => line.trim());
    const recommendations = [];
    
    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const title = line.substring(0, colonIndex).trim();
        const description = line.substring(colonIndex + 1).trim();
        if (title && description) {
          recommendations.push({ title, description });
        }
      }
    });
    
    // If parsing failed, provide fallback recommendations
    if (recommendations.length === 0) {
      return [
        { title: "Regular Exercise", description: "Stay active with moderate exercise" },
        { title: "Balanced Diet", description: "Maintain nutritious eating habits" },
        { title: "Adequate Sleep", description: "Aim for 7-8 hours of quality sleep" },
        { title: "Stress Management", description: "Practice relaxation techniques" },
        { title: "Preventive Care", description: "Schedule regular check-ups" }
      ];
    }
    
    return recommendations;
  };
  
    // Update the downloadMedicalReport function to use autotable correctly
  const downloadMedicalReport = (report, recommendations) => {
    if (!report) return;
  
    try {
      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
  
      // Add header with logo placeholder
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("AI Medical Assistant", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text("Medical Consultation Report", pageWidth / 2, 30, {
        align: "center",
      });
  
      // Add date and patient ID
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 50);
      doc.text(`Patient ID: ${userId.current}`, 15, 57);
  
      // Add report title
      doc.setFontSize(14);
      doc.text("Medical Consultation Summary", pageWidth / 2, 70, {
        align: "center",
      });
  
      // Add report content
      doc.setFontSize(11);
      let yPos = 80;
  
      // Add sections from the report
      if (report.patientConcerns) {
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Patient Concerns", 15, yPos);
        doc.setFont(undefined, "normal");
        doc.setFontSize(11);
        yPos += 10;
  
        const concernsText = doc.splitTextToSize(
          report.patientConcerns,
          pageWidth - 30
        );
        doc.text(concernsText, 15, yPos);
        yPos += concernsText.length * 7 + 10;
      }
  
      if (report.assessmentSummary) {
        // Check if we need a new page
        if (yPos > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Assessment", 15, yPos);
        doc.setFont(undefined, "normal");
        doc.setFontSize(11);
        yPos += 10;
  
        const assessmentText = doc.splitTextToSize(
          report.assessmentSummary,
          pageWidth - 30
        );
        doc.text(assessmentText, 15, yPos);
        yPos += assessmentText.length * 7 + 10;
      }
  
      if (report.recommendations) {
        // Check if we need a new page
        if (yPos > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Recommendations", 15, yPos);
        doc.setFont(undefined, "normal");
        doc.setFontSize(11);
        yPos += 10;
  
        const recommendationsText = doc.splitTextToSize(
          report.recommendations,
          pageWidth - 30
        );
        doc.text(recommendationsText, 15, yPos);
        yPos += recommendationsText.length * 7 + 10;
      }
  
      // Add health recommendations section
      if (recommendations && recommendations.length > 0) {
        // Always add a new page for health recommendations
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("Health Recommendations", pageWidth / 2, yPos, { 
          align: "center" 
        });
        doc.setFont(undefined, "normal");
        yPos += 15;
        
        // Create a table for recommendations using manual approach instead of autotable
        const colWidth = [60, pageWidth - 80];
        const startX = 15;
        const rowHeight = 20;
        
        // Draw table header
        doc.setFillColor(50, 50, 50);
        doc.rect(startX, yPos, colWidth[0] + colWidth[1], rowHeight, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, "bold");
        doc.text("Recommendation", startX + 5, yPos + 13);
        doc.text("Description", startX + colWidth[0] + 5, yPos + 13);
        
        // Draw table rows
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "normal");
        yPos += rowHeight;
        
        recommendations.forEach(rec => {
          // Calculate height needed for this row based on text
          const titleLines = doc.splitTextToSize(rec.title, colWidth[0] - 10);
          const descLines = doc.splitTextToSize(rec.description, colWidth[1] - 10);
          const numLines = Math.max(titleLines.length, descLines.length);
          const currentRowHeight = Math.max(rowHeight, numLines * 10);
          
          // Draw cell backgrounds
          doc.setFillColor(255, 255, 255);
          doc.rect(startX, yPos, colWidth[0], currentRowHeight, "FD");
          doc.rect(startX + colWidth[0], yPos, colWidth[1], currentRowHeight, "FD");
          
          // Write text
          doc.text(titleLines, startX + 5, yPos + 10);
          doc.text(descLines, startX + colWidth[0] + 5, yPos + 10);
          
          yPos += currentRowHeight;
          
          // Add new page if needed
          if (yPos > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            yPos = 20;
          }
        });
      }
  
      // Add disclaimer on the last page
      if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = 20;
      }
  
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const disclaimer =
        "DISCLAIMER: This report is generated by an AI system and is for informational purposes only. It does not constitute medical advice, diagnosis, or treatment. Please consult with a qualified healthcare professional for medical advice.";
      const disclaimerText = doc.splitTextToSize(disclaimer, pageWidth - 30);
      doc.text(disclaimerText, 15, doc.internal.pageSize.getHeight() - 20);
  
      // Save the PDF
      doc.save(
        `Medical_Report_${new Date()
          .toLocaleDateString()
          .replace(/\//g, "-")}.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF report. Please try again.");
    }
  };
  

  // Update the handleImageUpload function to show better previews and validation
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 5MB.");
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|gif|bmp|webp)$/i)) {
      alert("Please select a valid image file (JPEG, PNG, GIF, BMP, WEBP).");
      return;
    }

    setSelectedImage(file);
    console.log(
      `Selected image: ${file.name}, size: ${Math.round(file.size / 1024)} KB`
    );

    // Create preview URL with correct orientation
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);

      // Optional: Show image dimensions
      const img = new Image();
      img.onload = () => {
        console.log(`Image dimensions: ${img.width}x${img.height}`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Improve submitMedicalImage to provide better feedback

  // ...existing code...

  // Submit medical image for analysis
  // Update the submitMedicalImage function to use the main doctor-analyze endpoint

  const submitMedicalImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setShowUploadModal(false);

    // Add user message to chat immediately
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: `[Uploading medical image: ${selectedImage.name}] ${
          selectedSymptom || "Please analyze this medical image"
        }`,
        timestamp: new Date(),
      },
    ]);

    try {
      // Convert the file to base64
      const fileReader = new FileReader();

      // Create a promise to handle the FileReader
      const fileToBase64 = new Promise((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = (error) => reject(error);
        fileReader.readAsDataURL(selectedImage);
      });

      // Get the base64 string
      const base64Image = await fileToBase64;

      console.log("Image converted to base64, sending for analysis...");

      // Send the image to the doctor-analyze endpoint (same as webcam frames)
      const response = await axios.post(
        "http://localhost:5000/doctor-analyze",
        {
          userId: userId.current,
          text:
            selectedSymptom ||
            "Please analyze this medical image I'm uploading",
          frameData: base64Image, // Send the image in the same field used for webcam frames
          isUploadedImage: true, // Flag to identify this is an uploaded image, not webcam
        },
        {
          timeout: 60000,
          maxContentLength: 10 * 1024 * 1024,
        }
      );

      if (response.data && response.data.success) {
        // Handle audio response if present
        if (response.data.audio) {
          setAudioUrl(response.data.audio);
        }

        // Get the text response
        setAiResponse(response.data.text || "");

        // Add AI response to chat
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            text: response.data.text || "I've analyzed your medical image.",
            timestamp: new Date(),
          },
        ]);

        // Reset image state
        setSelectedImage(null);
        setImagePreview(null);
        setSelectedSymptom("");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error processing medical image:", error);
      console.error("Response data:", error.response?.data);

      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text:
            error.response?.data?.text ||
            "I'm sorry, I encountered an error analyzing the uploaded image. Please try again with a clearer image or describe your concerns verbally.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] bg-white relative">
      {!doctorSessionStarted ? (
        // Pre-Session Screen - Professional medical interface
        <div className="h-screen w-full bg-white flex flex-col items-center justify-center p-8">
          <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-center mb-8">
                <div className="h-14 w-14 rounded-full bg-black flex items-center justify-center">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-black ml-4">
                  AI Medical Assistant
                </h1>
              </div>

              <p className="text-gray-600 text-center mb-10 text-lg">
                Welcome to your virtual medical consultation. Your AI doctor is
                ready to assist you.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center text-center">
                  <Clock className="h-8 w-8 text-black mb-3" />
                  <h3 className="text-black font-medium text-lg mb-2">
                    24/7 Availability
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Get medical assistance anytime with AI-powered consultation
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center text-center">
                  <MessageCircle className="h-8 w-8 text-black mb-3" />
                  <h3 className="text-black font-medium text-lg mb-2">
                    Real-time Feedback
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Discuss your symptoms and receive instant medical
                    information
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center text-center">
                  <FileText className="h-8 w-8 text-black mb-3" />
                  <h3 className="text-black font-medium text-lg mb-2">
                    Image Analysis
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Upload medical images for AI analysis and feedback
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={startMedicalConsultation}
                  disabled={isLoading}
                  className="flex items-center space-x-3 bg-black hover:bg-gray-800 text-white py-3 px-8 rounded-lg shadow-md transition-all duration-300 text-lg font-medium"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  <span>
                    {isLoading ? "Connecting Doctor..." : "Start Consultation"}
                  </span>
                </button>
              </div>

              <p className="text-gray-400 text-center mt-8 text-sm">
                Make sure your microphone and camera are working properly before
                starting.
              </p>
            </div>

            <div className="bg-gray-50 p-4 flex items-center justify-between">
              <div className="text-gray-500 text-sm">
                <span className="mr-2 text-green-500">●</span> Camera and
                microphone access required
              </div>
              <div className="flex items-center">
                <button
                  onClick={toggleCamera}
                  className={`p-2 rounded-full mr-2 ${
                    isCameraOn ? "bg-gray-100" : "bg-gray-200"
                  }`}
                >
                  {isCameraOn ? (
                    <Video className="w-5 h-5 text-black" />
                  ) : (
                    <VideoOff className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <button className="p-2 rounded-full bg-gray-200">
                  <Settings className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Main Doctor Consultation Interface
        <>
          {/* Main Video Grid */}
          <div className="h-[calc(81vh-5rem)] w-full p-4 grid grid-cols-2 gap-4">
            {/* User Video */}
            <div className="relative rounded-lg overflow-hidden bg-gray-100 shadow-md">
              {isCameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "rotateY(0deg)" }} // Ensure no mirror effect
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-4xl text-gray-600">You</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-white/80 text-gray-800 px-3 py-1 rounded-md text-sm shadow-sm">
                Patient
              </div>
            </div>

            {/* AI Video */}
            <div className="relative rounded-lg overflow-hidden bg-gray-100 shadow-md">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Audio Visualization Rings */}
                  {isPlaying && (
                    <>
                      <div className="absolute inset-0 -m-8">
                        <div className="absolute inset-0 border-4 border-black/10 rounded-full animate-[ping_2s_ease-in-out_infinite]"></div>
                      </div>
                      <div className="absolute inset-0 -m-12">
                        <div className="absolute inset-0 border-4 border-black/8 rounded-full animate-[ping_2s_ease-in-out_infinite_500ms]"></div>
                      </div>
                      <div className="absolute inset-0 -m-16">
                        <div className="absolute inset-0 border-4 border-black/5 rounded-full animate-[ping_2s_ease-in-out_infinite_1000ms]"></div>
                      </div>
                    </>
                  )}
                  <div
                    className={`w-24 h-24 rounded-full bg-black flex items-center justify-center transition-transform duration-300 ${
                      isPlaying ? "scale-110" : "scale-100"
                    }`}
                  >
                    <Brain
                      className={`w-16 h-16 text-white transition-all duration-300 ${
                        isPlaying
                          ? "opacity-100 scale-110"
                          : "opacity-80 scale-100"
                      }`}
                    />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 bg-white/80 text-gray-800 px-3 py-1 rounded-md text-sm shadow-sm">
                AI Doctor
              </div>
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-sm">
            <div className="max-w-screen-xl mx-auto h-full flex items-center justify-between px-8">
              {/* Time */}
              <div className="text-gray-600 text-sm">
                {new Date().toLocaleTimeString()}
              </div>

              {/* Main Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMic}
                  disabled={isLoading || isPlaying}
                  className={`p-4 rounded-full transition-all duration-300 ${
                    isMicOn
                      ? "bg-gray-100 hover:bg-gray-200"
                      : "bg-red-500 hover:bg-red-600"
                  } ${
                    (isLoading || isPlaying) && "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {isMicOn ? (
                    <Mic className="w-6 h-6 text-gray-700" />
                  ) : (
                    <MicOff className="w-6 h-6 text-white" />
                  )}
                </button>

                <button
                  onClick={toggleCamera}
                  disabled={isLoading || isPlaying}
                  className={`p-4 rounded-full transition-all duration-300 ${
                    isCameraOn
                      ? "bg-gray-100 hover:bg-gray-200"
                      : "bg-red-500 hover:bg-red-600"
                  } ${
                    (isLoading || isPlaying) && "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {isCameraOn ? (
                    <Video className="w-6 h-6 text-gray-700" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-white" />
                  )}
                </button>

                <button
                  onClick={setShowUploadModal.bind(null, true)}
                  disabled={isLoading || isPlaying}
                  className={`p-4 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 ${
                    (isLoading || isPlaying) && "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <Upload className="w-6 h-6 text-gray-700" />
                </button>

                <button
                  onClick={handleEndSession}
                  disabled={isLoading}
                  className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </button>

                <button
                  onClick={() => setShowMedicalPanel(!showMedicalPanel)}
                  className="p-3 rounded-full hover:bg-gray-100 transition-all duration-300"
                >
                  <FileText className="w-6 h-6 text-gray-700" />
                </button>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="p-3 rounded-full hover:bg-gray-100 transition-all duration-300"
                >
                  <MessageSquare className="w-6 h-6 text-gray-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          {showChat && (
            <div className="absolute top-0 right-0 bottom-0 w-[360px] bg-white shadow-lg transition-all duration-300 transform translate-x-0 border-l border-gray-200">
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <button
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="text-lg font-medium text-gray-900">
                  Medical Consultation
                </h3>
                <div className="w-8" /> {/* Spacer for alignment */}
              </div>

              {/* Chat Messages */}
              <div
                ref={chatContainerRef}
                className="h-[calc(100vh-9rem)] overflow-y-auto p-4 space-y-4 bg-white"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">
                      Start speaking to begin the consultation
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-lg max-w-[80%] ${
                          message.type === "user"
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs ${
                              message.type === "user"
                                ? "text-gray-300"
                                : "text-gray-500"
                            }`}
                          >
                            {message.type === "user" ? "You" : "Doctor"}
                          </span>
                          <span
                            className={`text-xs ${
                              message.type === "user"
                                ? "text-gray-300"
                                : "text-gray-500"
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                        <p className="text-sm break-words">{message.text}</p>
                      </div>
                    </div>
                  ))
                )}

                {/* Live Transcription */}
                {transcribedText && (
                  <div className="flex justify-end">
                    <div className="p-3 rounded-lg bg-gray-200 text-gray-800 max-w-[80%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-600">You</span>
                        <span className="text-xs text-gray-500">
                          <span className="animate-pulse">●</span> Speaking...
                        </span>
                      </div>
                      <p className="text-sm break-words">{transcribedText}</p>
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-center my-4">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Upload Medical Image
                  </h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="p-6">
                  {imagePreview ? (
                    <div className="mb-4">
                      <div className="relative border rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full object-contain max-h-[300px]"
                        />
                        <button
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white"
                        >
                          <X className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {selectedImage?.name} •{" "}
                        {Math.round(selectedImage?.size / 1024)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 mb-4">
                        Upload a medical image for AI analysis
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Select Image
                      </label>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Add additional context (optional)
                    </label>
                    <input
                      type="text"
                      value={selectedSymptom}
                      onChange={(e) => setSelectedSymptom(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="e.g., 'My CT scan from last week' or 'Rash on my arm'"
                    />
                  </div>

                  <div className="text-sm text-gray-500 mb-6">
                    <p className="font-medium mb-1">
                      Guidelines for best results:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <p>• Ensure medical information is clearly visible</p>
                      <p>• Upload in good lighting and focus</p>
                      <p>• Include only relevant medical content</p>
                      <p>• Maximum file size: 5MB</p>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitMedicalImage}
                      disabled={!selectedImage}
                      className={`px-4 py-2 rounded-lg flex items-center ${
                        selectedImage
                          ? "bg-black text-white hover:bg-gray-800"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Analyze Image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Medical Panel */}
          {showMedicalPanel && (
            <div className="absolute top-0 right-0 bottom-0 w-[360px] bg-white shadow-xl border-l border-gray-200 transition-all duration-300 transform translate-x-0 z-10">
              {/* Medical Panel Header */}
              <div className="p-4 border-b flex items-center justify-between bg-gray-50 sticky top-0 z-10">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Medical Information
                  </h3>
                </div>
                <button
                  onClick={() => setShowMedicalPanel(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Vital Signs */}
              <div className="p-4 border-b">
                <h4 className="text-sm text-gray-500 mb-3">Vital Signs</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="font-medium">{vitalSigns.temperature}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Blood Pressure</p>
                    <p className="font-medium">{vitalSigns.bloodPressure}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Heart Rate</p>
                    <p className="font-medium">{vitalSigns.heartRate}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">O₂ Saturation</p>
                    <p className="font-medium">{vitalSigns.oxygenSaturation}</p>
                  </div>
                </div>
              </div>

              {/* Symptoms Recorder */}
              <div className="p-4">
                <h4 className="text-sm text-gray-500 mb-3">Record Symptoms</h4>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={selectedSymptom}
                    onChange={(e) => setSelectedSymptom(e.target.value)}
                    className="border rounded px-3 py-2 flex-1"
                    placeholder="Enter symptom"
                  />
                  <button
                    onClick={() => {
                      if (selectedSymptom) {
                        setSymptoms([...symptoms, selectedSymptom]);
                        setSelectedSymptom("");
                      }
                    }}
                    className="bg-black text-white px-3 py-2 rounded"
                  >
                    Add
                  </button>
                </div>

                {/* Symptom Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {symptoms.map((symptom, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center"
                    >
                      {symptom}
                      <button
                        onClick={() =>
                          setSymptoms(symptoms.filter((_, i) => i !== index))
                        }
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div className="p-4 border-t mt-4">
                <h4 className="text-sm text-gray-500 mb-2">
                  Consultation Notes
                </h4>
                <textarea
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                  placeholder="Add notes about your symptoms, concerns, or questions for the doctor..."
                />

                <button className="mt-4 w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-all duration-200">
                  Send to Doctor
                </button>
              </div>
              {showMedicalPanel && lastCapturedFrame && (
                <div className="p-4 border-t">
                  <h4 className="text-sm text-gray-500 mb-2">
                    Last Visual Assessment
                  </h4>
                  <div className="relative border rounded-lg overflow-hidden">
                    <img
                      src={lastCapturedFrame}
                      alt="Last captured frame"
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Visual data sent
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {doctorSessionStarted && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm max-w-md text-center z-20">
              <p>
                Please position yourself clearly in the camera view for visual
                assessment.
              </p>
              <p className="text-xs mt-1 text-gray-300">
                Press mic button to speak with the AI doctor
              </p>
            </div>
          )}
        </>
      )}
      {showEndScreen && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-black">
                    Consultation Complete
                  </h1>
                  <p className="text-gray-500">
                    Thank you for using AI Medical Assistant
                  </p>
                </div>
              </div>
            </div>

            {reportGenerating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-xl text-gray-700">
                  Generating your medical report...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This may take a moment
                </p>
              </div>
            ) : (
              <>
                {/* Summary Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                      <ClipboardList className="w-5 h-5 mr-2" />
                      Medical Consultation Summary
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (medicalReport && healthRecommendations.length > 0) {
                            downloadMedicalReport(medicalReport, healthRecommendations);
                          }
                        }}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Download Report</span>
                      </button>
                    </div>
                  </div>

                  {/* Report Card */}
                  <div className="bg-gray-50 rounded-lg p-6 shadow-sm mb-8">
                    {medicalReport ? (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-gray-500 text-sm mb-1">
                            Patient Concerns
                          </h3>
                          <p className="text-gray-800">
                            {medicalReport.patientConcerns ||
                              "No concerns recorded"}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-gray-500 text-sm mb-1">
                            Assessment
                          </h3>
                          <p className="text-gray-800">
                            {medicalReport.assessmentSummary ||
                              "No assessment recorded"}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-gray-500 text-sm mb-1">
                            Recommendations
                          </h3>
                          <p className="text-gray-800">
                            {medicalReport.recommendations ||
                              "No recommendations provided"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p>Unable to generate consultation report.</p>
                    )}
                  </div>
                </div>

                {/* Recommendations Section */}
                <div className="mb-10">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Health Recommendations
                  </h2>

                  {healthRecommendations.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {healthRecommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <h3 className="font-medium text-gray-800 mb-2">
                            {rec.title}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {rec.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      No specific health recommendations available.
                    </p>
                  )}
                </div>

                {/* Footer / Actions */}
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => {
                      setShowEndScreen(false);
                      setDoctorSessionStarted(false);
                      setMessages([]);
                      setAiResponse("");
                      setAudioUrl("");
                      setMedicalReport(null);
                      setHealthRecommendations([]);
                    }}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 font-medium transition-colors"
                  >
                    Start New Consultation
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    This report is for informational purposes only and does not
                    constitute medical advice.
                    <br />
                    Please consult with a qualified healthcare professional for
                    medical advice.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
