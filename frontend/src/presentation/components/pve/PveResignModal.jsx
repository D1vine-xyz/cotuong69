import React from 'react';

/**
 * COT-640: Modal xác nhận Đầu hàng (Xin thua) trong trận PvE
 * Phạm vi:
 * - Người chơi có thể chọn Đầu hàng trong lúc trận đang diễn ra.
 * - Hiển thị hộp xác nhận trước khi gửi yêu cầu đầu hàng tới máy chủ.
 */
export default function PveResignModal({
  isOpen = false,
  onClose,
  onConfirm,
  loading = false,
  errorMessage = ''
}) {
  if (!isOpen) return null;

  return (
    <div
      id="pveResignConfirmModal"
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pveResignHeading"
      data-testid="pve-resign-modal"
      onClick={(e) => {
        if (e.target.id === 'pveResignConfirmModal' && !loading) {
          onClose?.();
        }
      }}
    >
      <div className="modal-card modal-card-resign">
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <span className="header-icon warning-icon">🏳️</span>
            <h3 id="pveResignHeading">Xác Nhận Đầu Hàng</h3>
          </div>
          <button
            type="button"
            id="closePveResignModalBtn"
            className="close-btn"
            aria-label="Đóng"
            disabled={loading}
            onClick={onClose}
            data-testid="close-pve-resign-btn"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="resign-warning-box">
            <p className="resign-prompt-text">
              Bạn có chắc chắn muốn <strong>đầu hàng (xin thua)</strong> ván cờ này không?
            </p>
            <p className="resign-sub-text">
              Sau khi xác nhận, ván đấu sẽ lập tức kết thúc với kết quả <strong>Thất Bại (Thua)</strong> và bàn cờ sẽ được khóa lại.
            </p>
          </div>

          {errorMessage && (
            <div id="pveResignError" className="input-error-msg" role="alert" style={{ display: 'block', marginTop: '12px' }}>
              {errorMessage}
            </div>
          )}

          <div className="pve-rules-notice">
            <span className="notice-icon">ℹ️</span>
            <span className="notice-text">Trận đấu luyện tập với Máy không tính điểm xếp hạng Elo.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            id="pveCancelResignBtn"
            className="btn btn-secondary"
            disabled={loading}
            onClick={onClose}
            data-testid="cancel-resign-btn"
          >
            Hủy Bỏ (Tiếp tục chơi)
          </button>
          <button
            type="button"
            id="pveConfirmResignBtn"
            className="btn btn-danger"
            disabled={loading}
            onClick={onConfirm}
            data-testid="confirm-resign-btn"
          >
            {loading ? (
              <>
                <span className="btn-spinner" style={{ display: 'inline-block' }}></span>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>🏳️ Xác Nhận Đầu Hàng</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
