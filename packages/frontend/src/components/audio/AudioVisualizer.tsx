import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '../ui/utils.ts';

interface AudioVisualizerProps {
  audioData?: Float32Array;
  isActive?: boolean;
  type?: 'waveform' | 'frequency' | 'level';
  className?: string;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioData,
  isActive = false,
  type = 'waveform',
  className,
  width = 400,
  height = 100,
  color = '#D97706',
  backgroundColor = 'transparent'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const drawWaveform = useCallback((
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    width: number,
    height: number
  ) => {
    ctx.clearRect(0, 0, width, height);
    
    if (!data || data.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] * 0.5; 
      const y = (v + 1) * height / 2; 

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }, [color]);

  const drawFrequencyBars = useCallback((
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    width: number,
    height: number
  ) => {
    ctx.clearRect(0, 0, width, height);
    
    if (!data || data.length === 0) return;

    const barCount = Math.min(64, data.length); 
    const barWidth = width / barCount;
    const dataStep = Math.floor(data.length / barCount);

    ctx.fillStyle = color;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < dataStep; j++) {
        const index = i * dataStep + j;
        if (index < data.length) {
          sum += Math.abs(data[index]);
        }
      }
      const average = sum / dataStep;
      
      const barHeight = (average * height) * 2; 
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }, [color]);

  const drawLevel = useCallback((
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    width: number,
    height: number
  ) => {
    ctx.clearRect(0, 0, width, height);
    
    if (!data || data.length === 0) return;

    // calculate rms level
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    const level = Math.min(rms * 10, 1); 

   
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, 0, width, height);


    const levelWidth = width * level;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#10B981');
    gradient.addColorStop(0.7, '#D97706');
    gradient.addColorStop(1, '#EF4444');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, levelWidth, height);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: canvasWidth, height: canvasHeight } = canvas;

    if (!isActive || !audioData) {

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      
      if (type === 'waveform') {
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight / 2);
        ctx.lineTo(canvasWidth, canvasHeight / 2);
        ctx.stroke();
      }
      
      return;
    }

    // set background
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }


    switch (type) {
      case 'waveform':
        drawWaveform(ctx, audioData, canvasWidth, canvasHeight);
        break;
      case 'frequency':
        drawFrequencyBars(ctx, audioData, canvasWidth, canvasHeight);
        break;
      case 'level':
        drawLevel(ctx, audioData, canvasWidth, canvasHeight);
        break;
    }
  }, [isActive, audioData, type, backgroundColor, drawWaveform, drawFrequencyBars, drawLevel]);


  useEffect(() => {
    if (isActive) {
      const animate = () => {
        draw();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      draw();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, draw]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;


    canvas.width = width;
    canvas.height = height;


    draw();
  }, [width, height, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'rounded-lg',
        className
      )}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%'
      }}
    />
  );
};


export const WaveformVisualizer: React.FC<Omit<AudioVisualizerProps, 'type'>> = (props) => (
  <AudioVisualizer {...props} type="waveform" />
);

export const FrequencyVisualizer: React.FC<Omit<AudioVisualizerProps, 'type'>> = (props) => (
  <AudioVisualizer {...props} type="frequency" />
);

export const LevelMeter: React.FC<Omit<AudioVisualizerProps, 'type'>> = (props) => (
  <AudioVisualizer {...props} type="level" height={props.height || 20} />
);