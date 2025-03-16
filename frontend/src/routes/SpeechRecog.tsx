import { useState, useRef, useEffect, useCallback } from "react";

const EnhancedSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const recognitionRef = useRef(null);
  const browserSupportsRecognition = useRef(
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  );

  // Log browser support status once
  useEffect(() => {
    if (!browserSupportsRecognition.current) {
      console.error("Speech recognition is not supported in this browser");
    } else {
      console.log("Speech recognition is supported");
    }
  }, []);

  const startListening = useCallback(() => {
    // Check browser support
    if (!browserSupportsRecognition.current) {
      console.error("Speech recognition not supported in this browser");
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      // Clear previous text
      setTranscribedText("");
      
      // Initialize recognition if needed
      if (!recognitionRef.current) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        // Handle results
        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update transcribed text with both final and interim results
          const fullText = (finalTranscript + interimTranscript).trim();
          console.log("Recognition result:", fullText);
          setTranscribedText(fullText);
        };
        
        // Handle errors
        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === 'no-speech') {
            console.log("No speech detected");
          } else if (event.error === 'audio-capture') {
            alert("No microphone was found or microphone is disabled");
            setIsListening(false);
          } else if (event.error === 'not-allowed') {
            alert("Microphone permission was denied");
            setIsListening(false);
          }
        };
        
        // Handle end of recognition
        recognitionRef.current.onend = () => {
          // Only restart if still listening (not manually stopped)
          if (isListening) {
            console.log("Recognition ended, restarting...");
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
              setIsListening(false);
            }
          } else {
            console.log("Recognition ended (manually stopped)");
          }
        };
      }
      
      // Start recognition
      console.log("Starting speech recognition...");
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      alert("Failed to start speech recognition. Please try again.");
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      console.log("Stopping speech recognition...");
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
    setIsListening(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when cleaning up
        }
      }
    };
  }, []);

  return {
    isListening,
    transcribedText,
    startListening,
    stopListening,
    browserSupported: browserSupportsRecognition.current
  };
};

export default EnhancedSpeechRecognition;