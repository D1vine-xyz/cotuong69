import React from 'react';

/**
 * COT-640: Popup thông báo kết quả ván đấu PvE
 * Tiêu chí chấp nhận:
 * 1. Hiển thị đúng kết quả máy chủ trả về (Thắng / Thua / Hòa).
 * 2. Hiển thị đúng lý do kết thúc (Chiếu bí, Hết nước đi, Hết thời gian, Đầu hàng).
 * 3. Khóa bàn cờ sau khi trận kết thúc.
 * 4. TUYỆT ĐỐI KHÔNG hiển thị thay đổi Elo cho trận với máy.
 */

export const RESULT_CONFIG = Object.freeze({
  WIN: {
    title: 'Chiến Thắng',
    subtitle: 'Chúc mừng bạn đã xuất sắc đánh bại máy chủ AI!',
    icon: '🏆',
    badgeClass: 'result-win',
    cardTheme: 'theme-win',
  },
  LOSS: {
    title: 'Thất Bại',
    subtitle: 'Bạn đã để thua ván cờ này trước máy chủ AI.',
    icon: '⚔️',
    badgeClass: 'result-loss',
    cardTheme: 'theme-loss',
  },
  DRAW: {
    title: 'Hòa Cờ',
    subtitle: 'Ván đấu bất phân thắng bại giữa bạn và máy chủ AI.',
    icon: '🤝',
    badgeClass: 'result-draw',
    cardTheme: 'theme-draw',
  },
});

export const END_REASON_LABELS = Object.freeze({
  CHECKMATE: 'Chiếu bí',
  NO_LEGAL_MOVES: 'Hết nước đi',
  STALEMATE: 'Hết nước đi',
  TIMEOUT: 'Hết thời gian',
  RESIGN: 'Đầu hàng',
});

export default function PveResultModal({
  isOpen = false,
  result = 'LOSS',
  endReason = 'RESIGN',
  playerColor = 'red',
  onNewGame,
  onBackToLobby,
  onClose,
}) {
  if (!isOpen) return null;

  const normalizedResult = (result || 'LOSS').toUpperCase();
  const config = RESULT_CONFIG[normalizedResult] || RESULT_CONFIG.LOSS;

  const normalizedReasonKey = (endReason || 'RESIGN').toUpperCase();
  const reasonText = END_REASON_LABELS[normalizedReasonKey] || 'Kết thúc trận đấu';

  return (
    <div
      id="pveMatchResultModal"
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pveResultHeading"
      data-testid="pve-result-modal"
      onClick={(e) => {
        if (e.target.id === 'pveMatchResultModal') {
          onClose?.();
        }
      }}
    >
      <div className={`modal-card modal-card-result ${config.cardTheme}`}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <span className="header-icon">{config.icon}</span>
            <h3 id="pveResultHeading">Kết Quả Ván Đấu</h3>
          </div>
          <button
            type="button"
            id="closePveResultModalBtn"
            className="close-btn"
            aria-label="Đóng"
            onClick={onClose}
            data-testid="close-pve-result-btn"
          >
            &times;
          </button>
        </div>

        <div className="modal-body pve-result-body">
          {/* Huy hiệu và tiêu đề kết quả */}
          <div className="result-hero-box">
            <div className={`result-outcome-badge ${config.badgeClass}`} data-testid="pve-result-title">
              <span className="outcome-icon" aria-hidden="true">{config.icon}</span>
              <span className="outcome-text">{config.title}</span>
            </div>
            <p className="result-hero-subtitle">{config.subtitle}</p>
          </div>

          {/* Chi tiết trận đấu: Phe đã chọn & Lý do kết thúc */}
          <div className="result-details-card">
            <div className="detail-row">
              <span className="detail-label">Lý do kết thúc:</span>
              <span className="detail-value reason-tag" data-testid="pve-result-reason">
                {reasonText}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phe người chơi:</span>
              <span className="detail-value player-side-tag">
                {playerColor === 'red' ? '🔴 Bên Đỏ' : '⚫ Bên Đen'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Trạng thái bàn cờ:</span>
              <span className="detail-value board-locked-tag">
                🔒 Bàn cờ đã khóa (Trận đấu đã kết thúc)
              </span>
            </div>
          </div>

          {/* RÀNG BUỘC ELO: TUYỆT ĐỐI KHÔNG HIỂN THỊ THAY ĐỔI ELO CHO TRẬN VỚI MÁY */}
          <div className="pve-no-elo-badge" data-testid="pve-result-no-elo">
            <span className="notice-icon" aria-hidden="true">🛡️</span>
            <span className="notice-text">
              Trận đấu luyện tập với Máy không tính điểm xếp hạng Elo.
            </span>
          </div>
        </div>

        <div className="modal-footer result-modal-footer">
          <button
            type="button"
            id="pveResultBackToLobbyBtn"
            className="btn btn-secondary"
            onClick={onBackToLobby}
            data-testid="pve-back-to-lobby-btn"
          >
            <span>🏠 Trở Về Sảnh</span>
          </button>
          <button
            type="button"
            id="pveResultNewGameBtn"
            className="btn btn-gold btn-large"
            onClick={onNewGame}
            data-testid="pve-new-game-btn"
          >
            <span>⚔️ Chơi Ván Mới</span>
          </button>
        </div>
      </div>
    </div>
  );
}
