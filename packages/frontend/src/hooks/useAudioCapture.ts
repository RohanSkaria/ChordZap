import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioDevice {
  id: string;
  name: string;
  type: 'microphone' | 'system' | 'default';
}

export interface AudioCaptureState {
  isRecording: boolean;
  isLoading: boolean;
  error: string | null;
  devices: AudioDevice[];
  selectedDevice: string | null;
  audioLevel: number;
  hasPermission: boolean | null;
}

export interface AudioCaptureHook {
  state: AudioCaptureState;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  selectDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  getAudioBuffer: () => Float32Array | null;
  getWAVBuffer: () => ArrayBuffer | null;
  subscribe: (callback: (audioData: Float32Array) => void) => () => void;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number = 44100): ArrayBuffer {
  const length = samples.length * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

export const useAudioCapture = (): AudioCaptureHook => {
  const [state, setState] = useState<AudioCaptureState>({
    isRecording: false,
    isLoading: false,
    error: null,
    devices: [],
    selectedDevice: null,
    audioLevel: 0,
    hasPermission: null,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioBufferRef = useRef<Float32Array | null>(null);
  const accumulatedAudioRef = useRef<number[]>([]);
  const subscribersRef = useRef<Set<(audioData: Float32Array) => void>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const lastLogTimeRef = useRef<number>(0);
  const sampleRateRef = useRef<number>(44100);

  const checkBrowserSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser does not support audio recording');
    }
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      throw new Error('Browser does not support Web Audio API');
    }
  }, []);

  const getAudioDevices = useCallback(async (): Promise<AudioDevice[]> => {
    try {
      checkBrowserSupport();
      
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices: AudioDevice[] = [];

      audioDevices.push({
        id: 'default',
        name: 'Default Microphone',
        type: 'default'
      });

      devices
        .filter(device => device.kind === 'audioinput')
        .forEach(device => {
          audioDevices.push({
            id: device.deviceId,
            name: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
            type: 'microphone'
          });
        });

      if ('getDisplayMedia' in navigator.mediaDevices) {
        audioDevices.push({
          id: 'system',
          name: 'System Audio (Screen Capture)',
          type: 'system'
        });
      }

      return audioDevices;
    } catch (error) {
      console.error('Error getting audio devices:', error);
      throw new Error('Failed to access audio devices. Please check permissions.');
    }
  }, [checkBrowserSupport]);

  const refreshDevices = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const devices = await getAudioDevices();
      setState(prev => ({
        ...prev,
        devices,
        selectedDevice: prev.selectedDevice || devices[0]?.id || null,
        isLoading: false,
        hasPermission: true
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isLoading: false,
        hasPermission: false
      }));
    }
  }, [getAudioDevices]);

  const initializeAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    sampleRateRef.current = audioContextRef.current.sampleRate;
    
    console.log(`🎤 [AUDIO] Initialized AudioContext with sample rate: ${sampleRateRef.current}Hz`);
    
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    analyserRef.current.smoothingTimeConstant = 0.85;

    processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processorRef.current.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      
      accumulatedAudioRef.current.push(...inputBuffer);
      
      const maxSamples = sampleRateRef.current * 15;
      if (accumulatedAudioRef.current.length > maxSamples) {
        accumulatedAudioRef.current = accumulatedAudioRef.current.slice(-maxSamples);
      }
      
      audioBufferRef.current = new Float32Array(inputBuffer);
      
      subscribersRef.current.forEach(callback => {
        callback(audioBufferRef.current!);
      });
      
      const now = Date.now();
      if (now - lastLogTimeRef.current > 2000) {
        console.log(`🎤 [AUDIO] Recording... ${(accumulatedAudioRef.current.length / sampleRateRef.current).toFixed(1)}s captured`);
        lastLogTimeRef.current = now;
      }
    };

    return audioContextRef.current;
  }, []);

  const getMediaStream = useCallback(async (deviceId: string): Promise<MediaStream> => {
    if (deviceId === 'system') {
      return await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as any
      });
    } else {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId === 'default' ? undefined : { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        }
      };
      
      return await navigator.mediaDevices.getUserMedia(constraints);
    }
  }, []);

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !state.isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = (rms / 255) * 100;
      
      setState(prev => ({ ...prev, audioLevel: level }));
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, [state.isRecording]);

  const startRecording = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      checkBrowserSupport();

      if (!state.selectedDevice) {
        throw new Error('No audio device selected');
      }

      accumulatedAudioRef.current = [];
      console.log('🎤 [AUDIO] Starting new recording...');

      const audioContext = initializeAudioContext();
      const stream = await getMediaStream(state.selectedDevice);
      mediaStreamRef.current = stream;

      sourceRef.current = audioContext.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current!);
      sourceRef.current.connect(processorRef.current!);
      processorRef.current!.connect(audioContext.destination);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isLoading: false,
        error: null
      }));

      monitorAudioLevel();

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isLoading: false,
        isRecording: false
      }));
    }
  }, [state.selectedDevice, checkBrowserSupport, initializeAudioContext, getMediaStream, monitorAudioLevel]);

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      audioLevel: 0
    }));

    console.log(`🎤 [AUDIO] Recording stopped. Captured ${(accumulatedAudioRef.current.length / sampleRateRef.current).toFixed(1)}s of audio`);
  }, []);

  const selectDevice = useCallback(async (deviceId: string) => {
    setState(prev => ({ ...prev, selectedDevice: deviceId }));
    
    if (state.isRecording) {
      stopRecording();
      setTimeout(() => startRecording(), 100);
    }
  }, [state.isRecording, stopRecording, startRecording]);

  const getAudioBuffer = useCallback((): Float32Array | null => {
    if (accumulatedAudioRef.current.length === 0) {
      console.log('🎤 [AUDIO] No audio data available');
      return null;
    }
    
    console.log(`🎤 [AUDIO] Returning ${(accumulatedAudioRef.current.length / sampleRateRef.current).toFixed(1)}s of audio`);
    return new Float32Array(accumulatedAudioRef.current);
  }, []);

  const getWAVBuffer = useCallback((): ArrayBuffer | null => {
    if (accumulatedAudioRef.current.length === 0) {
      console.log('🎤 [AUDIO] No audio data to convert to WAV');
      return null;
    }
    
    const audioData = new Float32Array(accumulatedAudioRef.current);
    const wavBuffer = encodeWAV(audioData, sampleRateRef.current);
    
    console.log(`🎤 [AUDIO] Created WAV buffer: ${(wavBuffer.byteLength / 1024).toFixed(2)}KB from ${(audioData.length / sampleRateRef.current).toFixed(1)}s of audio`);
    return wavBuffer;
  }, []);

  const subscribe = useCallback((callback: (audioData: Float32Array) => void) => {
    subscribersRef.current.add(callback);
    
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    refreshDevices();
    
    return () => {
      stopRecording();
    };
  }, []);

  useEffect(() => {
    const handleDeviceChange = () => {
      refreshDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  return {
    state,
    startRecording,
    stopRecording,
    selectDevice,
    refreshDevices,
    getAudioBuffer,
    getWAVBuffer,
    subscribe
  };
};