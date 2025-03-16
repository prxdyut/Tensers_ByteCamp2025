import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  Clock,
  MessageCircle,
  Check,
  Play,
  Video,
  VideoOff,
  Settings,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Users,
  ChevronRight,
  Upload,
  Code,
  FileText,
  X,
  Maximize2,
  Minimize2,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import MonacoEditor from "@monaco-editor/react";
import EnhancedSpeechRecognition from "./SpeechRecog";

export const Viva = () => {
  const [audioUrl, setAudioUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [messages, setMessages] = useState([]);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vivaSessionId, setVivaSessionId] = useState(null);
  const [vivaStarted, setVivaStarted] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskType, setTaskType] = useState(null); // "coding" or "normal"
  const [taskDescription, setTaskDescription] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const [isTaskFullscreen, setIsTaskFullscreen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editorTheme, setEditorTheme] = useState("vs-dark");

  const [videoUrl, setVideoUrl] = useState("");
  const [teacherId, setTeacherId] = useState("default_teacher");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoStream, setVideoStream] = useState(null);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const userId = "user123";
  const chatContainerRef = useRef(null);
  const [interviewResults, setInterviewResults] = useState(null);

  const { isListening, transcribedText, startListening, stopListening } =
    EnhancedSpeechRecognition();

  useEffect(() => {
    // Auto-scroll chat to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchAndStoreConversation = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/get-conversation/${userId}`
      );
      const data = await response.json();

      if (data.success) {
        // Store in localStorage
        localStorage.setItem(
          "interviewConversation",
          JSON.stringify({
            conversation: data.conversation,
            timestamp: new Date().toISOString(),
          })
        );

        // Update state if needed
        setMessages(data.conversation);
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  const startVivaSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/start-viva", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const audioData = Uint8Array.from(atob(data.audio), (c) =>
          c.charCodeAt(0)
        );

        const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
        const url = URL.createObjectURL(audioBlob);

        setAudioUrl(url);
        setAiResponse(data.text);
        setVivaSessionId(data.sessionId);
        setVivaStarted(true);

        setMessages([{ type: "ai", text: data.text, timestamp: new Date() }]);

        setIsPlaying(true);
        // Change editor theme when AI starts speaking
        setEditorTheme("vs-dark");

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          setEditorTheme("vs-light"); // Reset theme when AI stops speaking
          URL.revokeObjectURL(url);
        };

        await audio.play();
      }
    } catch (error) {
      console.error("Error starting viva:", error);
      alert("Failed to start viva session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateVoiceWithImage = async (formData) => {
    try {
      setIsLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(
        "http://localhost:5000/generate-voice-with-image",
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("AI Response:", data);

      // Process response same as before
      const audioData = Uint8Array.from(atob(data.audio), (c) =>
        c.charCodeAt(0)
      );
      const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
      const url = URL.createObjectURL(audioBlob);

      setAudioUrl(url);
      setAiResponse(data.text);
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: data.text, timestamp: new Date() },
      ]);
      setIsPlaying(true);
      setEditorTheme("vs-dark");

      if (data.isTask) {
        handleNewTask(data.task, data.taskType);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setEditorTheme("vs-light");
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (error) {
      console.error("Error generating voice with image:", error);
      setIsPlaying(false);
      setEditorTheme("vs-light");
      alert("Failed to generate response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoneSpeaking = async () => {
    stopListening();

    if (transcribedText) {
      // Add user message to chat
      setMessages((prev) => [
        ...prev,
        { type: "user", text: transcribedText, timestamp: new Date() },
      ]);

      try {
        // Capture the current video frame
        const frameBlob = await captureFrame();

        // Create FormData to send both text and image
        const formData = new FormData();
        formData.append("text", transcribedText);

        if (frameBlob) {
          formData.append("image", frameBlob, "frame.jpg");
        }

        // Generate AI response with both text and image
        await generateVoiceWithImage(formData);
      } catch (error) {
        console.error("Error processing frame:", error);
        // Fallback to text-only if frame capture fails
        await generateVoice(transcribedText);
      }
    }
  };

  const generateVoice = async (text) => {
    if (!text?.trim()) return;

    try {
      setIsLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("http://localhost:5000/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("AI Response:", data);
      const audioData = Uint8Array.from(atob(data.audio), (c) =>
        c.charCodeAt(0)
      );
      const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
      const url = URL.createObjectURL(audioBlob);

      setAudioUrl(url);
      setAiResponse(data.text);
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: data.text, timestamp: new Date() },
      ]);
      setIsPlaying(true);
      // Change editor theme when AI starts speaking
      setEditorTheme("vs-dark");

      //   give alert if data.isTask is true
      if (data.isTask) {
        handleNewTask(data.task, data.taskType);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setEditorTheme("vs-light"); // Reset theme when AI stops speaking
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (error) {
      console.error("Error generating voice:", error);
      setIsPlaying(false);
      setEditorTheme("vs-light"); // Reset theme in case of error
      alert("Failed to generate voice response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndInterview = async () => {
    try {
      // Fetch and store conversation first
      await fetchAndStoreConversation();

      // End the viva session if it's active
      if (vivaStarted) {
        await fetch("http://localhost:5000/end-viva", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        });
      }

      const response = await fetch("http://localhost:6500/api/end-interview");
      const results = await response.json();

      // Store results in localStorage
      localStorage.setItem(
        "lastInterviewResults",
        JSON.stringify({
          ...results,
          timestamp: new Date().toISOString(),
        })
      );

      setInterviewResults(results);

      // Stop any ongoing recording
      if (isListening) {
        handleDoneSpeaking();
      }

      // Reset viva state
      setVivaStarted(false);
      setVivaSessionId(null);
    } catch (error) {
      console.error("Error ending interview:", error);
    }
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  // Initialize video capture when component mounts
  useEffect(() => {
    const setupVideoCapture = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setVideoStream(stream);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    setupVideoCapture();

    // Cleanup function
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      });
    }
    return null;
  };

  const toggleMic = () => {
    if (!isMicOn) {
      startListening();
    } else {
      handleDoneSpeaking();
    }
    setIsMicOn(!isMicOn);
  };

  const handleNewTask = (taskDesc, type) => {
    setTaskDescription(taskDesc);
    setTaskType(type);
    setTaskOpen(true);

    // Set initial content based on task type
    if (type === "coding") {
      setTaskContent(`// Write your solution here\n\n`);
    } else {
      setTaskContent("");
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitTask = async () => {
    // Show loading state
    setIsLoading(true);

    try {
      // Add task submission to messages
      const messageText = `I have performed the given task: ${taskContent.substring(
        0,
        50
      )}${taskContent.length > 50 ? "..." : ""}`;

      setMessages((prev) => [
        ...prev,
        {
          type: "user",
          text: messageText,
          timestamp: new Date(),
        },
      ]);

      // Send the task content to generate-voice endpoint
      await generateVoice(`I have performed the given task: ${taskContent}`);

      // Close task panel
      setTaskOpen(false);

      // Reset states
      setTaskContent("");
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error submitting task:", error);
      alert("Failed to submit task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Extract text from uploaded image
  const extractTextFromImage = async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const response = await fetch("http://localhost:5000/api/extract-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("Error extracting text from image:", error);
      throw error;
    }
  };

  // Submit image for the task
  const submitImageTask = async () => {
    if (!selectedImage) return;

    setIsLoading(true);

    try {
      // Extract text from the image
      const extractedText = await extractTextFromImage(selectedImage);

      // Add image submission to messages
      const messageText = `I've submitted a handwritten solution for the task: "${taskDescription}"`;

      setMessages((prev) => [
        ...prev,
        {
          type: "user",
          text: messageText,
          timestamp: new Date(),
        },
      ]);

      // Send the extracted text to generate-voice endpoint
      await generateVoice(
        `I have performed the given task with a handwritten solution: ${extractedText}`
      );

      // Close modals
      setShowUploadModal(false);
      setTaskOpen(false);

      // Reset states
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error submitting image task:", error);
      alert("Failed to process handwritten solution. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] bg-white relative">
      {!vivaStarted ? (
        // Pre-Viva Screen - Redesigned to be more minimalist and professional
        <div className="h-screen w-full bg-white flex flex-col items-center justify-center p-8">
          <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-center mb-8">
                <div className="h-14 w-14 rounded-full bg-black flex items-center justify-center">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-black ml-4">
                  AI Doctor
                </h1>
              </div>

              <p className="text-gray-600 text-center mb-10 text-lg">
                Welcome to your virtual medical consultation. Your AI doctor is ready to assist you.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center text-center">
                  <Clock className="h-8 w-8 text-black mb-3" />
                  <h3 className="text-black font-medium text-lg mb-2">
                    24/7 Availability
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Access medical consultations anytime, anywhere with AI assistance
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center text-center">
                  <MessageCircle className="h-8 w-8 text-black mb-3" />
                  <h3 className="text-black font-medium text-lg mb-2">
                    Real-time Feedback
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Get feedback on your answers and academic communication
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center text-center">
                  <Check className="h-8 w-8 text-black mb-3" />
                  <h3 className="text-black font-medium text-lg mb-2">
                    Improve Your Skills
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Refine your examination technique with each practice session
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={startVivaSession}
                  disabled={isLoading}
                  className="flex items-center space-x-3 bg-black hover:bg-gray-800 text-white py-3 px-8 rounded-lg shadow-md transition-all duration-300 text-lg font-medium"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  <span>
                    {isLoading ? "Preparing Session..." : "Start Consultation"}
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
        // Viva Screen with new task panels
        <>
          {/* Main Video Grid */}
          <div
            className={`h-[calc(81vh-5rem)] ${
              taskOpen && !isTaskFullscreen
                ? "w-[calc(100vh)]"
                : "w-[calc(150vh)]"
            } p-4 grid grid-cols-2 gap-4`}
          >
            {/* User Video */}
            <div className="relative rounded-lg overflow-hidden bg-gray-100 shadow-md ">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isCameraOn && "hidden"}`}
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-4xl text-gray-600">You</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-white/80 text-gray-800 px-3 py-1 rounded-md text-sm shadow-sm">
                You
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
                      {/* Circular Wave Animation */}
                      <div className="absolute inset-0 -m-6">
                        <div className="absolute inset-0 border-2 border-black/15 rounded-full animate-[wave_2s_ease-in-out_infinite]"></div>
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
          <div className="absolute bottom-12 left-0 right-0 h-16 bg-white border-t-2 border-gray-800 shadow-sm">
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
                  onClick={handleEndInterview}
                  disabled={isLoading}
                  className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
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
                <button className="p-3 rounded-full hover:bg-gray-100 transition-all duration-300">
                  <Users className="w-6 h-6 text-gray-700" />
                </button>
                <button className="p-3 rounded-full hover:bg-gray-100 transition-all duration-300">
                  <Settings className="w-6 h-6 text-gray-700" />
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
                  Examination Conversation
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
                      Start speaking to begin the examination
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
                            {message.type === "user" ? "You" : "Examiner"}
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

          {/* Task Panel */}
          {taskOpen && !isTaskFullscreen && (
            <div className="absolute top-0 right-0 bottom-0 w-[50%] bg-white shadow-xl border-l border-gray-200 transition-all duration-300 transform translate-x-0 z-10">
              {/* Task Header */}
              <div className="p-4 border-b flex items-center justify-between bg-gray-50 sticky top-0 z-10">
                <div className="flex items-center">
                  {taskType === "coding" ? (
                    <Code className="w-5 h-5 text-gray-600 mr-2" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-600 mr-2" />
                  )}
                  <h3 className="text-lg font-medium text-gray-900">
                    {taskType === "coding" ? "Medical Questionnaire" : "Health Information"}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTaskFullscreen(!isTaskFullscreen)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200"
                  >
                    <Maximize2 className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setTaskOpen(false)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Task Description */}
              <div className="p-4 border-b bg-gray-50">
                <h4 className="text-sm text-gray-500 mb-1">
                  Task Description:
                </h4>
                <p className="text-gray-800">{taskDescription}</p>
              </div>

              {/* Editor Area */}
              <div className="h-[calc(100vh-16rem)]">
                {taskType === "coding" ? (
                  <MonacoEditor
                    height="100%"
                    language="javascript"
                    theme={editorTheme}
                    value={taskContent}
                    onChange={setTaskContent}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div
                    className={`h-full p-4 ${
                      isPlaying ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <textarea
                      className={`w-full h-full p-4 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                        isPlaying
                          ? "bg-gray-700 text-white focus:ring-gray-500"
                          : "bg-white text-black focus:ring-black"
                      }`}
                      placeholder="Type your answer here..."
                      value={taskContent}
                      onChange={(e) => setTaskContent(e.target.value)}
                      disabled={isPlaying}
                    ></textarea>
                  </div>
                )}
              </div>

              {/* Task Controls */}
              <div className="p-4 border-t bg-gray-50 sticky bottom-0">
                <div className="flex justify-between">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    disabled={isPlaying}
                    className={`flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition-all duration-200 ${
                      isPlaying && "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Handwritten</span>
                  </button>
                  <button
                    onClick={submitTask}
                    disabled={isPlaying}
                    className={`flex items-center space-x-2 bg-black hover:bg-gray-800 text-white py-2 px-6 rounded transition-all duration-200 ${
                      isPlaying && "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Submit</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Task Panel */}
          {taskOpen && isTaskFullscreen && (
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
              {/* Fullscreen Header */}
              <div className="p-4 border-b flex items-center justify-between bg-gray-50 sticky top-0">
                <div className="flex items-center">
                  {taskType === "coding" ? (
                    <Code className="w-5 h-5 text-gray-600 mr-2" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-600 mr-2" />
                  )}
                  <h3 className="text-lg font-medium text-gray-900">
                    {taskType === "coding" ? "Medical Questionnaire" : "Health Information"}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTaskFullscreen(false)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200"
                  >
                    <Minimize2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Task Description */}
              <div className="p-4 border-b bg-gray-50">
                <h4 className="text-sm text-gray-500 mb-1">
                  Task Description:
                </h4>
                <p className="text-gray-800">{taskDescription}</p>
              </div>

              {/* Editor Area - Fullscreen */}
              <div className="flex-grow">
                {taskType === "coding" ? (
                  <MonacoEditor
                    height="100%"
                    language="javascript"
                    theme={editorTheme}
                    value={taskContent}
                    onChange={setTaskContent}
                    options={{
                      minimap: { enabled: true },
                      fontSize: 14,
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div
                    className={`h-full p-4 ${
                      isPlaying ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <textarea
                      className={`w-full h-full p-4 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                        isPlaying
                          ? "bg-gray-700 text-white focus:ring-gray-500"
                          : "bg-white text-black focus:ring-black"
                      }`}
                      placeholder="Type your answer here..."
                      value={taskContent}
                      onChange={(e) => setTaskContent(e.target.value)}
                      disabled={isPlaying}
                    ></textarea>
                  </div>
                )}
              </div>

              {/* Task Controls - Fullscreen */}
              <div className="p-4 border-t bg-gray-50 sticky bottom-0">
                <div className="flex justify-between">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    disabled={isPlaying}
                    className={`flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition-all duration-200 ${
                      isPlaying && "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Handwritten</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsTaskFullscreen(false)}
                      disabled={isPlaying}
                      className={`flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-all duration-200 ${
                        isPlaying && "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <Minimize2 className="w-4 h-4" />
                      <span>Exit Fullscreen</span>
                    </button>
                    <button
                      onClick={submitTask}
                      disabled={isPlaying}
                      className={`flex items-center space-x-2 bg-black hover:bg-gray-800 text-white py-2 px-6 rounded transition-all duration-200 ${
                        isPlaying && "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>Submit</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Upload Solution
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
                    </div>
                  ) : (
                    <div className="mb-6 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 mb-4">
                        Upload an image of your handwritten solution
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

                  <div className="text-sm text-gray-500 mb-6">
                    <p>• Ensure your handwriting is clearly visible</p>
                    <p>• Make sure all content fits within the frame</p>
                    <p>• JPEG, PNG formats accepted only</p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitImageTask}
                      disabled={!selectedImage}
                      className={`px-4 py-2 rounded-lg flex items-center ${
                        selectedImage
                          ? "bg-black text-white hover:bg-gray-800"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Submit Image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interview Results Modal */}
          {interviewResults && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="text-xl font-medium text-gray-900">
                    Consultation Summary
                  </h3>
                  <button
                    onClick={() => setInterviewResults(null)}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2 text-gray-800">
                      Summary
                    </h4>
                    <p className="text-gray-700">{interviewResults.summary}</p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2 text-gray-800">
                      Strengths
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {interviewResults.strengths.map((strength, index) => (
                        <li key={index} className="text-gray-700">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2 text-gray-800">
                      Areas for Improvement
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {interviewResults.improvements.map(
                        (improvement, index) => (
                          <li key={index} className="text-gray-700">
                            {improvement}
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2 text-gray-800">
                      Score
                    </h4>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="h-4 rounded-full bg-black"
                          style={{ width: `${interviewResults.score}%` }}
                        ></div>
                      </div>
                      <span className="ml-3 font-semibold text-lg">
                        {interviewResults.score}%
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2 text-gray-800">
                      Technical Accuracy
                    </h4>
                    <p className="text-gray-700">
                      {interviewResults.technicalAccuracy}
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2 text-gray-800">
                      Communication Skills
                    </h4>
                    <p className="text-gray-700">
                      {interviewResults.communicationSkills}
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                  <button
                    onClick={() => setInterviewResults(null)}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* Hidden canvas for frame capture */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
      />
    </div>
  );
};
