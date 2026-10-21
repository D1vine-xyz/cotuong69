import { useCallback, useEffect, useRef, useState } from 'react';
import { MediaStreamManager } from '../../domain/media/mediaStreamManager';

export function useLocalMedia({ autoRequest = false } = {}) {
  const [stream, setStream] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('IDLE');
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [error, setError] = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [warning, setWarning] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const streamRef = useRef(null);

  const requestMedia = useCallback(async (options = { video: true, audio: true }, customMediaDevices = null) => {
    setPermissionStatus('REQUESTING');
    setError(null);
    setInstructions(null);
    setWarning(null);

    const result = await MediaStreamManager.requestLocalMedia(options, customMediaDevices);

    if (result.stream) {
      if (streamRef.current) {
        MediaStreamManager.stopStream(streamRef.current);
      }
      streamRef.current = result.stream;
      setStream(result.stream);
      setHasVideo(result.hasVideo);
      setHasAudio(result.hasAudio);
      setAudioOnly(result.audioOnly);
      setPermissionStatus(result.permissionStatus);
      setWarning(result.warning || null);
      setIsMicMuted(false);
      setIsCamOff(!result.hasVideo);
      return result;
    }

    setStream(null);
    streamRef.current = null;
    setHasVideo(false);
    setHasAudio(false);
    setAudioOnly(false);
    setPermissionStatus(result.permissionStatus);
    setError(result.error);
    setInstructions(result.instructions);
    return result;
  }, []);

  const retryMedia = useCallback(async () => {
    return requestMedia({ video: true, audio: true });
  }, [requestMedia]);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      MediaStreamManager.stopStream(streamRef.current);
      streamRef.current = null;
    }
    setStream(null);
    setHasVideo(false);
    setHasAudio(false);
    setAudioOnly(false);
    setPermissionStatus('IDLE');
    setError(null);
    setInstructions(null);
    setWarning(null);
  }, []);

  const toggleMic = useCallback(() => {
    if (!streamRef.current) return false;
    const isNowEnabled = MediaStreamManager.toggleTrack(streamRef.current, 'audio');
    setIsMicMuted(!isNowEnabled);
    return isNowEnabled;
  }, []);

  const toggleCam = useCallback(() => {
    if (!streamRef.current || audioOnly) return false;
    const isNowEnabled = MediaStreamManager.toggleTrack(streamRef.current, 'video');
    setIsCamOff(!isNowEnabled);
    return isNowEnabled;
  }, [audioOnly]);

  useEffect(() => {
    if (autoRequest) {
      requestMedia();
    }
    return () => {
      if (streamRef.current) {
        MediaStreamManager.stopStream(streamRef.current);
      }
    };
  }, [autoRequest, requestMedia]);

  return {
    stream,
    permissionStatus,
    hasVideo,
    hasAudio,
    audioOnly,
    error,
    instructions,
    warning,
    isMicMuted,
    isCamOff,
    requestMedia,
    retryMedia,
    stopMedia,
    toggleMic,
    toggleCam,
  };
}

export default useLocalMedia;
