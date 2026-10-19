import React from 'react';

/**
 * COT-639: Banner hiển thị trạng thái "Máy đang đi..." trong trận PvE
 * Tiêu chí:
 * - Hiển thị rõ ràng thông báo "Máy đang đi..." khi tới lượt máy
 * - Khóa toàn bộ thao tác đi quân của người chơi
 * - Chỉ mở lại thao tác cho người chơi sau khi máy chủ xác nhận nước đi của máy
 */
export default function PveBotStatusBanner({
  isBotThinking = false,
  isPlayerTurn = false,
  botColor = 'black',
  playerColor = 'red'
}) {
  if (!isBotThinking && isPlayerTurn) {
    return (
      <div id="pvePlayerTurnBanner" className="pve-status-banner player-turn" role="status" aria-live="polite">
        <span className="banner-icon">🎯</span>
        <span className="banner-text">
          Đến lượt của bạn (Quân {playerColor === 'red' ? 'Đỏ' : 'Đen'}) - Hãy chọn quân và ô đến
        </span>
      </div>
    );
  }

  if (isBotThinking || !isPlayerTurn) {
    return (
      <div id="pveBotStatusBanner" className="pve-status-banner bot-thinking" role="alert" aria-live="assertive">
        <div className="bot-pulse-icon">
          <span className="bot-emoji">🤖</span>
          <span className="pulse-ring" />
        </div>
        <div className="bot-status-content">
          <strong className="bot-status-title">Máy đang đi...</strong>
          <span className="bot-status-desc">
            Máy chủ AI đang phân tích thế cờ và thực hiện nước đi. Bàn cờ tạm thời được khóa.
          </span>
        </div>
        <div className="bot-loading-indicator">
          <span className="dot dot-1" />
          <span className="dot dot-2" />
          <span className="dot dot-3" />
        </div>
      </div>
    );
  }

  return null;
}
