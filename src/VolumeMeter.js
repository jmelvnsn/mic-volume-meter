import React, { useEffect, useRef } from 'react';

const VolumeMeter = ({ analyser }) => {
  // Define dimensions and dB ranges:
  const baseMeterWidth = 300;         // Green meter: -48 dB (left) to 0 dB (right)
  const overflowWidth = 50;           // Extra area for levels above 0 dB (up to +6 dB)
  const meterHeight = 50;             // Height for the volume meter display
  const labelAreaHeight = 20;         // Additional space for ticks and labels
  const totalCanvasWidth = baseMeterWidth + overflowWidth;
  const totalCanvasHeight = meterHeight + labelAreaHeight;
  
  // The amplification factor adjusts the displayed value.
  // Lowering this value reduces the sensitivity of the meter.
  // A value of 1.0 means full-scale input (1.0) maps to 0 dB.
  const amplificationFactor = 1.0;

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!analyser) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const draw = () => {
      // Get time-domain audio data from the analyser node.
      analyser.getFloatTimeDomainData(dataArray);

      // Compute the instantaneous (peak) level by finding the maximum absolute value.
      let peak = 0;
      for (let i = 0; i < bufferLength; i++) {
        const absVal = Math.abs(dataArray[i]);
        if (absVal > peak) {
          peak = absVal;
        }
      }
      
      // Apply amplification so that levels above 0 dB become visible.
      const amplifiedPeak = peak * amplificationFactor;
      // Convert the amplitude into decibels (using a small value to avoid log(0)).
      const db = 20 * Math.log10(Math.max(amplifiedPeak, 1e-8));

      // --- Calculate bar widths for the meter ---
      
      // Base (green) meter: maps from -48 dB (silence) up to 0 dB (full scale).
      let greenFraction;
      if (db <= -48) {
        greenFraction = 0;
      } else if (db >= 0) {
        greenFraction = 1;
      } else {
        greenFraction = (db + 48) / 48;
      }
      const greenBarWidth = greenFraction * baseMeterWidth;
      
      // Red overflow meter: draws extra red if level exceeds 0 dB.
      let redBarWidth = 0;
      if (db > 0) {
        // Map from 0 to +6 dB into the overflow area.
        const overflowFraction = Math.min(db / 6, 1);
        redBarWidth = overflowFraction * overflowWidth;
      }

      // --- Render the meter and ticks on the canvas ---
      ctx.clearRect(0, 0, totalCanvasWidth, totalCanvasHeight);

      // Draw the meter background in the upper area.
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, totalCanvasWidth, meterHeight);

      // Draw the base (green) bar.
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(0, 0, greenBarWidth, meterHeight);

      // Draw the overflow (red) bar if applicable.
      if (redBarWidth > 0) {
        ctx.fillStyle = '#f44336';
        ctx.fillRect(baseMeterWidth, 0, redBarWidth, meterHeight);
      }
      
      // Draw the 0 dB marker as a vertical line in the meter area.
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(baseMeterWidth, 0);
      ctx.lineTo(baseMeterWidth, meterHeight);
      ctx.stroke();

      // --- Draw ticks and labels below the meter ---
      const tickHeight = 5;
      const tickYStart = meterHeight;         
      const tickYEnd = meterHeight + tickHeight;
      
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';

      // Draw tick at -48 dB (left side, x = 0).
      ctx.beginPath();
      ctx.moveTo(0, tickYStart);
      ctx.lineTo(0, tickYEnd);
      ctx.stroke();

      // Draw tick at 0 dB (right side, at x = baseMeterWidth).
      ctx.beginPath();
      ctx.moveTo(baseMeterWidth, tickYStart);
      ctx.lineTo(baseMeterWidth, tickYEnd);
      ctx.stroke();

      // Draw text labels below the ticks.
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      // For the left (-48 dB) label, use left alignment with a small offset.
      ctx.textAlign = 'left';
      ctx.fillText('-48 dB', 2, meterHeight + tickHeight + 2);

      // For the right (0 dB) label, use right alignment with a small offset.
      ctx.textAlign = 'right';
      ctx.fillText('0 dB', baseMeterWidth - 2, meterHeight + tickHeight + 2);

      requestAnimationFrame(draw);
    };
    draw();
  }, [analyser]);

  return (
    <canvas 
      ref={canvasRef} 
      width={totalCanvasWidth} 
      height={totalCanvasHeight} 
      style={{ border: '1px solid #000' }}
    ></canvas>
  );
};

export default VolumeMeter;
