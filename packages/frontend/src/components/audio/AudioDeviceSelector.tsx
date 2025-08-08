import React from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronDown } from 'lucide-react';
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
import { AudioDevice, AudioCaptureState } from '../../hooks/useAudioCapture';
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

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // handle clicking outside dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDeviceInfo = devices.find(d => d.id === selectedDevice);

  return (
    <Card className={cn('w-full max-w-3xl mx-auto', className)}>
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
        {/* error messages */}
        {error && (
          <Alert className="border-2 border-destructive/20 bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-lg">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* pick audio device */}
        <div className="space-y-3">
          <label className="text-sm font-medium block">Select Audio Input</label>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isLoading || devices.length === 0}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border-2 border-input bg-background hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectedDeviceInfo ? (
                  <>
                    {getDeviceIcon(selectedDeviceInfo.type)}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium truncate">{selectedDeviceInfo.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {getDeviceTypeLabel(selectedDeviceInfo.type)}
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">Choose audio input...</span>
                )}
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isDropdownOpen && "rotate-180")} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-card border border-border rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => {
                      onDeviceSelect(device.id);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl text-left"
                  >
                    {getDeviceIcon(device.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{device.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {getDeviceTypeLabel(device.type)}
                      </div>
                    </div>
                    {selectedDevice === device.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* current device */}
          {selectedDeviceInfo && (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
              {getDeviceIcon(selectedDeviceInfo.type)}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate pr-2">{selectedDeviceInfo.name}</div>
                <div className="text-sm text-muted-foreground">
                  {getDeviceTypeLabel(selectedDeviceInfo.type)}
                </div>
              </div>
              <Badge variant="secondary" className="rounded-xl shrink-0">
                {selectedDeviceInfo.type === 'system' ? 'Experimental' : 'Supported'}
              </Badge>
            </div>
          )}
        </div>

        {/* volume meter */}
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

        {/* audio wave */}
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

        {/* start/stop buttons */}
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
                Start Jamming
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

        {/* help info */}
        <div className="text-sm text-muted-foreground space-y-3 p-4 bg-muted/50 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 shrink-0"></div>
            <span className="leading-relaxed">Microphone devices capture direct audio input from your microphone</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 shrink-0"></div>
            <span className="leading-relaxed">System audio captures computer playback (experimental feature)</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 shrink-0"></div>
            <span className="leading-relaxed">All audio is processed locally and never stored or transmitted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};