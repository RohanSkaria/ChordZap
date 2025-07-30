import React from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Headphones, 
  Mic, 
  Monitor, 
  RefreshCw, 
  Volume2, 
  AlertTriangle,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { cn } from '../ui/utils';
import { AudioDevice, AudioCaptureState } from './useAudioCapture';
import { LevelMeter } from './AudioVisualizer';

interface AudioDeviceSelectorProps {
  state: AudioCaptureState;
  onDeviceSelect: (deviceId: string) => void;
  onRefreshDevices: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  audioData?: Float32Array;
  className?: string;
  showVisualizer?: boolean;
  showControls?: boolean;
}

const getDeviceIcon = (type: AudioDevice['type']) => {
  switch (type) {
    case 'microphone':
      return <Mic className="w-4 h-4" />;
    case 'system':
      return <Monitor className="w-4 h-4" />;
    case 'default':
      return <Headphones className="w-4 h-4" />;
    default:
      return <Volume2 className="w-4 h-4" />;
  }
};

const getDeviceTypeLabel = (type: AudioDevice['type']) => {
  switch (type) {
    case 'microphone':
      return 'Microphone';
    case 'system':
      return 'System Audio';
    case 'default':
      return 'Default';
    default:
      return 'Audio Device';
  }
};

const PermissionStatus: React.FC<{ hasPermission: boolean | null }> = ({ hasPermission }) => {
  if (hasPermission === null) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Settings className="w-4 h-4" />
        <span>Checking permissions...</span>
      </div>
    );
  }

  if (hasPermission) {
    return (
      <div className="flex items-center gap-2 text-accent">
        <CheckCircle2 className="w-4 h-4" />
        <span>Audio access granted</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-destructive">
      <AlertTriangle className="w-4 h-4" />
      <span>Audio access required</span>
    </div>
  );
};

export const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({
  state,
  onDeviceSelect,
  onRefreshDevices,
  onStartRecording,
  onStopRecording,
  audioData,
  className,
  showVisualizer = true,
  showControls = true
}) => {
  const { 
    devices, 
    selectedDevice, 
    isRecording, 
    isLoading, 
    error, 
    audioLevel, 
    hasPermission 
  } = state;

  const selectedDeviceInfo = devices.find(d => d.id === selectedDevice);

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-primary" />
            Audio Settings
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshDevices}
            disabled={isLoading}
            className="rounded-2xl border-2"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        <PermissionStatus hasPermission={hasPermission} />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert className="border-2 border-destructive/20 bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-lg">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Device Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium block">Select Audio Input</label>
          <Select 
            value={selectedDevice || ''} 
            onValueChange={onDeviceSelect}
            disabled={isLoading || devices.length === 0}
          >
            <SelectTrigger className="rounded-2xl border-2">
              <SelectValue placeholder="Choose audio input..." />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device.type)}
                    <div className="flex-1">
                      <div className="font-medium">{device.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {getDeviceTypeLabel(device.type)}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selected Device Info */}
          {selectedDeviceInfo && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
              {getDeviceIcon(selectedDeviceInfo.type)}
              <div className="flex-1">
                <div className="font-medium">{selectedDeviceInfo.name}</div>
                <div className="text-sm text-muted-foreground">
                  {getDeviceTypeLabel(selectedDeviceInfo.type)}
                </div>
              </div>
              <Badge variant="secondary" className="rounded-xl">
                {selectedDeviceInfo.type === 'system' ? 'Experimental' : 'Supported'}
              </Badge>
            </div>
          )}
        </div>

        {/* Audio Level Monitor */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Audio Level</label>
              <span className="text-sm text-muted-foreground">
                {Math.round(audioLevel)}%
              </span>
            </div>
            {showVisualizer && (
              <LevelMeter
                audioData={audioData}
                isActive={isRecording}
                width={400}
                height={24}
                className="w-full"
              />
            )}
          </div>
        )}

        {/* Waveform Visualizer */}
        {showVisualizer && isRecording && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Audio Waveform</label>
            <div className="p-4 bg-muted rounded-xl">
              <canvas
                className="w-full h-16 rounded-lg bg-background"
                style={{
                  background: `repeating-linear-gradient(
                    to right,
                    transparent,
                    transparent 10px,
                    #E5E7EB 10px,
                    #E5E7EB 11px
                  )`
                }}
              />
            </div>
          </div>
        )}

        {/* Control Buttons */}
        {showControls && (
          <div className="flex gap-3">
            {!isRecording ? (
              <Button
                onClick={onStartRecording}
                disabled={!selectedDevice || isLoading || !hasPermission}
                className="flex-1 rounded-2xl"
                size="lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={onStopRecording}
                variant="destructive"
                className="flex-1 rounded-2xl"
                size="lg"
              >
                <Volume2 className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            )}
          </div>
        )}

        {/* Device Information */}
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span>Microphone devices capture direct audio input</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span>System audio captures computer playback (experimental)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span>Audio is processed locally and not stored</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};