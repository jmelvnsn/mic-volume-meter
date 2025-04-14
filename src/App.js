import React, { useEffect, useState, useRef } from 'react';
import VolumeMeter from './VolumeMeter';
import './App.css'

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const streamRef = useRef(null);

  // Request initial microphone access and list available input devices
  useEffect(() => {
    async function getInitialStream() {
      try {
        // Request microphone permission (this will trigger the browser prompt)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        // List all audio devices and filter for inputs
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
    getInitialStream();
  }, []);

  // Setup the AudioContext and processing chain when a mic is selected
  useEffect(() => {
    if (!selectedDeviceId) return;
    
    async function setupAudio() {
      // Clean up any previous audio context
      if (audioContext) {
        audioContext.close();
      }
      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: selectedDeviceId } }
        });
        streamRef.current = stream;
        const source = newAudioContext.createMediaStreamSource(stream);
        
        // --- K-weighting filters approximation ---
        // High-pass filter: approximates the pre-filter (cutoff near 60 Hz)
        const highPassFilter = newAudioContext.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.value = 60;
        
        // High-shelf filter: approximates the high-frequency weighting (centered near 1000 Hz)
        const highShelfFilter = newAudioContext.createBiquadFilter();
        highShelfFilter.type = 'highshelf';
        highShelfFilter.frequency.value = 1000;
        highShelfFilter.gain.value = 4;
        
        // Create an analyser node for measuring the audio level
        const newAnalyser = newAudioContext.createAnalyser();
        newAnalyser.fftSize = 1024;

        // Connect the nodes: source -> highPass -> highShelf -> analyser
        source.connect(highPassFilter);
        highPassFilter.connect(highShelfFilter);
        highShelfFilter.connect(newAnalyser);

        // We do not connect to newAudioContext.destination in order to avoid feedback

        setAudioContext(newAudioContext);
        setAnalyser(newAnalyser);
      } catch (err) {
        console.error('Error setting up audio:', err);
      }
    }
    
    setupAudio();

    // Cleanup on component unmount or device change
    return () => {
      if (audioContext) {
        audioContext.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Microphone Volume Meter</h1>
      <div>
        <label htmlFor="mic-select">Select Microphone: </label>
        <select
          id="mic-select"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
        >
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId}`}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: '20px' }}>
        {analyser ? <VolumeMeter analyser={analyser} /> : <p>Loading audio...</p>}
        <div className="parentIframeContainer">
          <iframe style={{
            border: 'none',
            overflow: 'hidden',
            width: '100%',
            height: '360px'
          }}
          src="https://www.metercustom.net/plugin"
          title="Meter Custom Plugin"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default App;
