import React from 'react';

/**
 * COT-640: Nút Xin thua (Đầu hàng) cho trận đấu PvE
 * - Hiển thị trong lúc trận đang diễn ra.
 * - Khi click sẽ kích hoạt hộp xác nhận trước khi gửi yêu cầu lên máy chủ.
 */
export default function PveResignButton({
  onClick,
  disabled = false,
  className = '',
}) {
  return (
    <button
      type="button"
      id="pveResignBtn"
      className={`btn btn-resign-pve ${className}`}
      disabled={disabled}
      onClick={onClick}
      title="Xin thua / Đầu hàng ván cờ với máy"
      data-testid="pve-resign-btn"
    >
      <span className="btn-resign-icon" aria-hidden="true">🏳️</span>
      <span className="btn-resign-text">Xin Thua (Đầu hàng)</span>
    </button>
  );
}
