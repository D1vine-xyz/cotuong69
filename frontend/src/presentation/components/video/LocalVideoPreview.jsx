import { useEffect, useRef } from 'react';
import './VideoCall.css';

export default function LocalVideoPreview({
  stream = null,
  audioOnly = false,
  isCamOff = false,
  isMicMuted = false,
  permissionStatus = 'IDLE',
  error = null,
  instructions = null,
  onRetry = null,
  userName = 'Bạn',
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream && !audioOnly && !isCamOff) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, audioOnly, isCamOff]);

  // Trạng thái bị từ chối hoặc lỗi thiết bị
  if (permissionStatus === 'DENIED' || error) {
    return (
      <div className="local-media-error-card" role="alert" aria-live="assertive">
        <div className="media-error-icon" aria-hidden="true">🚫</div>
        <div className="media-error-content">
          <strong className="media-error-title">{error || 'Chưa được cấp quyền Camera/Microphone'}</strong>
          <p className="media-error-instructions">
            {instructions || 'Vui lòng nhấn vào biểu tượng ổ khóa trên thanh địa chỉ để cấp quyền.'}
          </p>
          {onRetry && (
            <button
              type="button"
              className="btn btn-primary btn-retry-media"
              onClick={onRetry}
            >
              🔄 Thử cấp quyền lại
            </button>
          )}
        </div>
      </div>
    );
  }

  // Đang xin quyền
  if (permissionStatus === 'REQUESTING') {
    return (
      <div className="local-video-pip requesting-media" aria-label="Đang xin quyền thiết bị">
        <div className="pip-spinner" />
        <span>Đang kết nối Camera & Mic…</span>
      </div>
    );
  }

  return (
    <div
      className={`local-video-pip ${audioOnly ? 'is-audio-only' : ''} ${isCamOff ? 'is-cam-off' : ''}`}
      aria-label="Khung hình thu nhỏ của bạn (Local Stream)"
    >
      {!audioOnly && !isCamOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="local-video-element"
          aria-label="Luồng video cục bộ"
        />
      ) : (
        <div className="pip-avatar-fallback">
          <div className={`pip-avatar-circle ${!isMicMuted ? 'avatar-pulse' : ''}`}>
            {userName ? userName.slice(0, 1).toUpperCase() : 'B'}
          </div>
          <span className="pip-avatar-tag">
            {audioOnly ? 'Chỉ âm thanh' : 'Camera tắt'}
          </span>
        </div>
      )}

      <div className="pip-badges">
        <span className="pip-badge-user">{userName} (Bạn)</span>
        {isMicMuted && (
          <span className="pip-badge-muted" title="Microphone đang tắt" aria-label="Microphone tắt">
            🔇
          </span>
        )}
      </div>
    </div>
  );
}
