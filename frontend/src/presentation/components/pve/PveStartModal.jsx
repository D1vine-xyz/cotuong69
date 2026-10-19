import React, { useState } from 'react';

/**
 * COT-638: Modal Bắt đầu trận đấu PvE (Chơi với máy)
 * Ràng buộc quan trọng:
 * - TUYỆT ĐỐI KHÔNG hiển thị độ khó Dễ, Trung bình, Khó hoặc bất kỳ cấp độ máy nào.
 * - Chỉ cho phép lựa chọn: Bên Đỏ (đi trước) hoặc Bên Đen (máy đi trước).
 * - Khóa nút khi đang tạo trận để tránh bấm liên tục.
 */
export default function PveStartModal({
  isOpen = false,
  onClose,
  onStartMatch,
  loading = false,
  errorMessage = ''
}) {
  const [selectedColor, setSelectedColor] = useState('red');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    onStartMatch?.({ playerColor: selectedColor });
  };

  return (
    <div
      id="pveStartModal"
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pveModalHeading"
      onClick={(e) => {
        if (e.target.id === 'pveStartModal' && !loading) {
          onClose?.();
        }
      }}
    >
      <div className="modal-card modal-card-pve">
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <span className="header-icon">🤖</span>
            <h3 id="pveModalHeading">Bắt Đầu Trận Đấu Với Máy</h3>
          </div>
          <button
            type="button"
            id="closePveStartModalBtn"
            className="close-btn"
            aria-label="Đóng"
            disabled={loading}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <form id="pveStartForm" onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <p className="pve-guide-text">
              Lựa chọn phe của bạn để bắt đầu ván cờ. Luật cờ chuẩn quốc tế quy định phe <strong>Đỏ luôn đi trước</strong>.
            </p>

            {errorMessage && (
              <div id="pveStartError" className="input-error-msg" role="alert" style={{ display: 'block', marginBottom: '14px' }}>
                {errorMessage}
              </div>
            )}

            {/* Lựa chọn phe Đỏ / Đen (TUYỆT ĐỐI KHÔNG CÓ ĐỘ KHÓ) */}
            <div className="pve-color-selection-group">
              <label className="selection-label">Chọn Phe Xuất Quân:</label>
              <div className="color-cards-grid">
                {/* Phe Đỏ */}
                <label
                  id="pveSelectRedLabel"
                  className={`color-choice-card color-red ${selectedColor === 'red' ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="pvePlayerColor"
                    id="pveSelectRed"
                    value="red"
                    checked={selectedColor === 'red'}
                    disabled={loading}
                    onChange={() => setSelectedColor('red')}
                  />
                  <div className="choice-card-inner">
                    <div className="chess-piece-symbol red">帥</div>
                    <div className="choice-info">
                      <strong className="choice-title">Bên Đỏ (Bạn đi trước)</strong>
                      <span className="choice-desc">Cầm quân Đỏ, quyền chủ động đi nước đầu tiên</span>
                    </div>
                    <span className="choice-check">✓</span>
                  </div>
                </label>

                {/* Phe Đen */}
                <label
                  id="pveSelectBlackLabel"
                  className={`color-choice-card color-black ${selectedColor === 'black' ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="pvePlayerColor"
                    id="pveSelectBlack"
                    value="black"
                    checked={selectedColor === 'black'}
                    disabled={loading}
                    onChange={() => setSelectedColor('black')}
                  />
                  <div className="choice-card-inner">
                    <div className="chess-piece-symbol black">將</div>
                    <div className="choice-info">
                      <strong className="choice-title">Bên Đen (Máy đi trước)</strong>
                      <span className="choice-desc">Cầm quân Đen, phòng thủ phản kích sau nước đi của máy</span>
                    </div>
                    <span className="choice-check">✓</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pve-rules-notice">
              <span className="notice-icon">ℹ️</span>
              <span className="notice-text">Trận đấu luyện tập với máy không tính điểm xếp hạng Elo.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              id="cancelPveStartBtn"
              className="btn btn-secondary"
              disabled={loading}
              onClick={onClose}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              id="submitStartPveBtn"
              className="btn btn-gold btn-large"
              disabled={loading}
            >
              {loading && <span className="btn-spinner" id="pveStartSpinner" />}
              <span id="pveStartBtnText">
                {loading ? 'Đang Khởi Tạo Trận...' : '⚔️ Bắt Đầu Ván Đấu'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
