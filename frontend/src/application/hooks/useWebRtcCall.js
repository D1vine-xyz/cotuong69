import { useCallback, useEffect, useRef, useState } from 'react';
import { MediaStreamManager } from '../../domain/media/mediaStreamManager';
import { WebRtcPeerConnection } from '../../domain/media/webRtcPeerConnection';

export function useWebRtcCall({
  socket = null,
  sendSignaling = null,
  isSpectator = false,
  userName = 'Bạn',
  opponentName = 'Đối thủ',
} = {}) {
  const [callStatus, setCallStatus] = useState('IDLE'); // 'IDLE' | 'CALLING' | 'INCOMING' | 'CONNECTED' | 'ENDED'
  const [callId, setCallId] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isRemoteCamOff, setIsRemoteCamOff] = useState(false);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const send = useCallback((payload) => {
    if (typeof sendSignaling === 'function') {
      return sendSignaling(payload);
    }
    const currentSocket = socket?.current || socket;
    if (currentSocket && currentSocket.readyState === (typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1)) {
      currentSocket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, [sendSignaling, socket]);

  const isConnected = useCallback(() => {
    if (typeof sendSignaling === 'function') return true;
    const currentSocket = socket?.current || socket;
    return Boolean(currentSocket && currentSocket.readyState === (typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1));
  }, [sendSignaling, socket]);

  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      MediaStreamManager.stopStream(localStreamRef.current);
      localStreamRef.current = null;
    }
    setCallStatus('IDLE');
    setCallId(null);
    setIncomingCall(null);
    setRemoteStream(null);
    setLocalStream(null);
    setIsMicMuted(false);
    setIsCamOff(false);
    setIsRemoteCamOff(false);
  }, []);

  // 1. Khởi tạo cuộc gọi (Caller)
  const startCall = useCallback(async () => {
    if (isSpectator) return;
    if (!isConnected()) {
      setError('Chưa kết nối máy chủ.');
      return;
    }

    // Xin quyền media cục bộ
    const mediaResult = await MediaStreamManager.requestLocalMedia({ video: true, audio: true });
    if (!mediaResult.stream) {
      setError(mediaResult.error || 'Không thể truy cập thiết bị truyền thông.');
      return;
    }

    localStreamRef.current = mediaResult.stream;
    setLocalStream(mediaResult.stream);
    setIsCamOff(mediaResult.audioOnly);
    setCallStatus('CALLING');
    setError(null);

    // Gửi yêu cầu cuộc gọi lên server
    send({ type: 'call:request' });
  }, [isConnected, isSpectator, send]);

  // 2. Chấp nhận cuộc gọi (Callee)
  const acceptCall = useCallback(async () => {
    if (isSpectator || !incomingCall) return;
    if (!isConnected()) return;

    // Xin quyền media cục bộ
    const mediaResult = await MediaStreamManager.requestLocalMedia({ video: true, audio: true });
    if (!mediaResult.stream) {
      setError(mediaResult.error || 'Không thể truy cập thiết bị truyền thông.');
      return;
    }

    localStreamRef.current = mediaResult.stream;
    setLocalStream(mediaResult.stream);
    setIsCamOff(mediaResult.audioOnly);

    // Tạo PeerConnection
    const peer = new WebRtcPeerConnection();
    pcRef.current = peer;
    peer.attachLocalStream(mediaResult.stream);

    peer.onRemoteStream((rStream) => {
      setRemoteStream(rStream);
    });

    peer.onIceCandidate((candidate) => {
      send({
        type: 'call:candidate',
        callId: incomingCall.callId,
        candidate,
      });
    });

    setCallStatus('CONNECTED');
    setIncomingCall(null);

    // Gửi chấp nhận lên server
    send({
      type: 'call:accept',
      callId: incomingCall.callId,
    });
  }, [incomingCall, isConnected, isSpectator, send]);

  // 3. Từ chối cuộc gọi (Callee)
  const rejectCall = useCallback((reason = 'REJECTED') => {
    if (isSpectator || !incomingCall) return;
    send({
      type: 'call:reject',
      callId: incomingCall.callId,
      reason,
    });
    setIncomingCall(null);
    setCallStatus('IDLE');
  }, [incomingCall, isSpectator, send]);

  // 4. Rời cuộc gọi chủ động (Chỉ đóng WebRTC, tuyệt đối không rời ván cờ)
  const endCall = useCallback((reason = 'USER_HANGUP') => {
    if (callId) {
      send({
        type: 'call:leave',
        callId,
        reason,
      });
    }
    cleanupCall();
  }, [callId, cleanupCall, send]);

  // 5. Điều khiển Microphone và Camera
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return false;
    const isNowEnabled = MediaStreamManager.toggleTrack(localStreamRef.current, 'audio');
    setIsMicMuted(!isNowEnabled);
    return isNowEnabled;
  }, []);

  const toggleCam = useCallback(() => {
    if (!localStreamRef.current) return false;
    const isNowEnabled = MediaStreamManager.toggleTrack(localStreamRef.current, 'video');
    setIsCamOff(!isNowEnabled);
    return isNowEnabled;
  }, []);

  // Lắng nghe và phân phối các gói tin WebSocket Signaling
  const handleSignalingMessage = useCallback(async (message) => {
    if (isSpectator) return;

    // Gói tin cuộc gọi đến
    if (message.type === 'CallIncoming') {
      setCallId(message.callId);
      setIncomingCall(message);
      setCallStatus('INCOMING');
    }

    // Caller nhận thông báo cuộc gọi đã bắt đầu đổ chuông
    if (message.type === 'CallInitiated') {
      setCallId(message.callId);
    }

    // Cuộc gọi được chấp nhận -> Caller bắt đầu tạo SDP Offer
    if (message.type === 'CallAccepted') {
      setCallStatus('CONNECTED');
      setIncomingCall(null);

      if (!pcRef.current && localStreamRef.current) {
        const peer = new WebRtcPeerConnection();
        pcRef.current = peer;
        peer.attachLocalStream(localStreamRef.current);

        peer.onRemoteStream((rStream) => {
          setRemoteStream(rStream);
        });

        peer.onIceCandidate((candidate) => {
          send({
            type: 'call:candidate',
            callId: message.callId,
            candidate,
          });
        });

        const sdpOffer = await peer.createOffer();
        send({
          type: 'call:offer',
          callId: message.callId,
          sdp: sdpOffer,
        });
      }
    }

    // Callee nhận SDP Offer -> Tạo SDP Answer gửi lại
    if (message.type === 'CallOffer' && pcRef.current) {
      const sdpAnswer = await pcRef.current.setRemoteOfferAndCreateAnswer(message.sdp);
      send({
        type: 'call:answer',
        callId: message.callId,
        sdp: sdpAnswer,
      });
    }

    // Caller nhận SDP Answer
    if (message.type === 'CallAnswer' && pcRef.current) {
      await pcRef.current.setRemoteAnswer(message.sdp);
    }

    // Nhận ICE Candidate
    if (message.type === 'CallCandidate' && pcRef.current) {
      await pcRef.current.addIceCandidate(message.candidate);
    }

    // Cuộc gọi bị từ chối / hết hạn / kết thúc
    if (['CallRejected', 'CallTimeout', 'CallEnded'].includes(message.type)) {
      cleanupCall();
    }
  }, [cleanupCall, isSpectator, send]);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    callStatus,
    callId,
    incomingCall,
    remoteStream,
    localStream,
    isMicMuted,
    isCamOff,
    isRemoteCamOff,
    error,
    isSpectator,
    userName,
    opponentName,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
    handleSignalingMessage,
  };
}

export default useWebRtcCall;
