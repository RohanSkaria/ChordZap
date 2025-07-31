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
  subscribe: (callback: (audioData: Float32Array) => void) => () => void;
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
  const subscribersRef = useRef<Set<(audioData: Float32Array) => void>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  
  const checkBrowserSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser does not support audio recording');
    }
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      throw new Error('Browser does not support Web Audio API');
    }
  }, []);

  // Get available audio devices
  const getAudioDevices = useCallback(async (): Promise<AudioDevice[]> => {
    try {
      checkBrowserSupport();
      
      // Request permission first to get device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices: AudioDevice[] = [];

      // Add default device
      audioDevices.push({
        id: 'default',
        name: 'Default Microphone',
        type: 'default'
      });

      // Add microphone devices
      devices
        .filter(device => device.kind === 'audioinput')
        .forEach(device => {
          audioDevices.push({
            id: device.deviceId,
            name: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
            type: 'microphone'
          });
        });

      // Add system audio option (experimental)
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

  // Refresh available devices
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

  // Initialize audio context and analyser
  const initializeAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    analyserRef.current.smoothingTimeConstant = 0.85;

    // Create script processor for real-time audio data
    processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processorRef.current.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      audioBufferRef.current = new Float32Array(inputBuffer);
      
      // Notify subscribers
      subscribersRef.current.forEach(callback => {
        callback(audioBufferRef.current!);
      });
    };

    return audioContextRef.current;
  }, []);

  // Get media stream based on device type
  const getMediaStream = useCallback(async (deviceId: string): Promise<MediaStream> => {
    if (deviceId === 'system') {
      // System audio capture using screen share
      return await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as any
      });
    } else {
      // Microphone capture
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

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !state.isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = (rms / 255) * 100; // Convert to percentage
      
      setState(prev => ({ ...prev, audioLevel: level }));
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, [state.isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      checkBrowserSupport();

      if (!state.selectedDevice) {
        throw new Error('No audio device selected');
      }

      // Initialize audio context
      const audioContext = initializeAudioContext();

      // Get media stream
      const stream = await getMediaStream(state.selectedDevice);
      mediaStreamRef.current = stream;

      // Create audio source
      sourceRef.current = audioContext.createMediaStreamSource(stream);
      
      // Connect audio nodes
      sourceRef.current.connect(analyserRef.current!);
      sourceRef.current.connect(processorRef.current!);
      processorRef.current!.connect(audioContext.destination);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isLoading: false,
        error: null
      }));

      // Start audio level monitoring
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

  // Stop recording
  const stopRecording = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      audioLevel: 0
    }));
  }, []);

  // Select audio device
  const selectDevice = useCallback(async (deviceId: string) => {
    setState(prev => ({ ...prev, selectedDevice: deviceId }));
    
    // If currently recording, restart with new device
    if (state.isRecording) {
      stopRecording();
      // Small delay to ensure cleanup is complete
      setTimeout(() => startRecording(), 100);
    }
  }, [state.isRecording, stopRecording, startRecording]);

  // Get current audio buffer
  const getAudioBuffer = useCallback((): Float32Array | null => {
    return audioBufferRef.current;
  }, []);

  // Subscribe to audio data updates
  const subscribe = useCallback((callback: (audioData: Float32Array) => void) => {
    subscribersRef.current.add(callback);
    
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  // Initialize devices on mount
  useEffect(() => {
    refreshDevices();
    
    // Cleanup on unmount
    return () => {
      stopRecording();
    };
  }, [refreshDevices, stopRecording]);

  // Handle device changes
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
    subscribe
  };
};