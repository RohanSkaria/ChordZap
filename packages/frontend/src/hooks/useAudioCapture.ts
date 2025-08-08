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
  const accumulatedAudioRef = useRef<number[]>([]);
  const subscribersRef = useRef<Set<(audioData: Float32Array) => void>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const lastLogTimeRef = useRef<number>(0);

  
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
    
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    analyserRef.current.smoothingTimeConstant = 0.85;

    processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processorRef.current.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      
      // Accumulate audio data for longer recordings
      accumulatedAudioRef.current.push(...inputBuffer);
      
      // Keep only last 15 seconds of audio (44100 * 15)
      const maxSamples = 44100 * 15;
      if (accumulatedAudioRef.current.length > maxSamples) {
        accumulatedAudioRef.current = accumulatedAudioRef.current.slice(-maxSamples);
      }
      
      // Update current buffer for real-time processing
      audioBufferRef.current = new Float32Array(inputBuffer);
      
      // Notify subscribers of current frame
      subscribersRef.current.forEach(callback => {
        callback(audioBufferRef.current!);
      });
      
      // Log every 2 seconds instead of every frame
      const now = Date.now();
      if (now - lastLogTimeRef.current > 2000) {
        console.log(`🎙️ [AUDIO] Accumulated ${accumulatedAudioRef.current.length} samples (${(accumulatedAudioRef.current.length / 44100).toFixed(2)}s)`);
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
      const level = (rms / 255) * 100; // Convert to percentage
      
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

      // Clear accumulated audio buffer when starting new recording
      accumulatedAudioRef.current = [];
      console.log('🎙️ [AUDIO] Cleared accumulated audio buffer - starting fresh recording');

      // Initialize audio context
      const audioContext = initializeAudioContext();

      const stream = await getMediaStream(state.selectedDevice);
      mediaStreamRef.current = stream;

      // Create audio source
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
  }, []);

  // Select audio device
  const selectDevice = useCallback(async (deviceId: string) => {
    setState(prev => ({ ...prev, selectedDevice: deviceId }));
    

    if (state.isRecording) {
      stopRecording();
 
      setTimeout(() => startRecording(), 100);
    }
  }, [state.isRecording, stopRecording, startRecording]);


  const getAudioBuffer = useCallback((): Float32Array | null => {
    // Return the accumulated audio buffer instead of just the current frame
    if (accumulatedAudioRef.current.length === 0) {
      console.log('🎙️ [AUDIO] No accumulated audio data available');
      return null;
    }
    
    console.log(`🎙️ [AUDIO] Returning ${accumulatedAudioRef.current.length} samples (${(accumulatedAudioRef.current.length / 44100).toFixed(2)}s) of accumulated audio`);
    return new Float32Array(accumulatedAudioRef.current);
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
  }, [refreshDevices, stopRecording]);


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