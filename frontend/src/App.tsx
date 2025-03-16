import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Me from './components/Me';
import Home from './routes/Home';
import { Sidebar } from './components/Sidebar';
import FloodDetection from './routes/FloodDetection';
import { useEffect } from 'react';
import HeatWaveDetection from './routes/HeatWaveDetection';
import VoiceAnalyser from './routes/VoiceAnalyser';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
    },
  },
});

function App() {
  

  useEffect(() => {
    // Add stylesheets
    const stylesheets = [
      "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      "assets/css/style.css"
    ];

    stylesheets.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });

    // Add scripts
    const scripts = [
      "assets/js/app.js",
    ];

    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      document.body.appendChild(script);
    });

    // Cleanup function to remove added elements when component unmounts
    return () => {
      stylesheets.forEach(href => {
        const link = document.querySelector(`link[href="${href}"]`);
        if (link) link.remove();
      });

      scripts.forEach(src => {
        const script = document.querySelector(`script[src="${src}"]`);
        if (script) script.remove();
      });
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
          <Sidebar />
        <Routes>

          <Route path="/me" element={<Me />} />
          <Route path="/" element={<Home />} />
          <Route path="/heatwave-detection" element={<HeatWaveDetection />} />
          <Route path="/flood-detection" element={<FloodDetection />} />
          <Route path="/voice-analyser" element={<VoiceAnalyser />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;