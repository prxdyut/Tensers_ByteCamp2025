import React from 'react';

const Webcam = () => {
  return (
    <div>
      <img 
        src="http://localhost:6500/video_feed1"
        alt="Webcam Feed"
        style={{ width: '640px', height: '480px' }}
      />
    </div>
  );
};

 function WebcamFeed() {
    return (
      <div>
        <h1>Webcam Feed</h1>
        <Webcam />
      </div>
    );
  }

export default WebcamFeed;