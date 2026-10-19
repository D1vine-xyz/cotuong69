import React, { useState } from 'react';
import { validateEmail, PasswordResetService, SAFE_FORGOT_PASSWORD_MESSAGE } from '../../../../js/auth.js';

export default function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const service = new PasswordResetService();
      const res = await service.requestForgotPassword(email);
      if (res.success) {
        setSuccessMsg(res.message || SAFE_FORGOT_PASSWORD_MESSAGE);
      } else {
        setError(res.error || 'Có lỗi xảy ra khi gửi yêu cầu.');
      }
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-card-auth">
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <span className="header-icon">🔑</span>
            <h3>Khôi Phục Mật Khẩu</h3>
          </div>
          <button type="button" className="close-btn" aria-label="Đóng" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="modal-body">
            <p className="auth-guide-text">
              Nhập địa chỉ email tài khoản của bạn. Hệ thống sẽ gửi liên kết và mã xác thực để đặt lại mật khẩu mới.
            </p>

            {successMsg && (
              <div className="auth-status-banner auth-status-success" role="status">
                <span className="banner-icon">📩</span>
                <div className="banner-text">
                  <strong>Yêu cầu đã được tiếp nhận:</strong>
                  <p>{successMsg}</p>
                </div>
              </div>
            )}

            {!successMsg && (
              <div className="form-group">
                <label htmlFor="reactForgotEmailInput" className="form-label">
                  Email Tài Khoản <span className="required-star">*</span>
                </label>
                <input
                  type="email"
                  id="reactForgotEmailInput"
                  className={`form-input ${error ? 'input-error' : ''}`}
                  placeholder="kythu@cotuong.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={loading}
                />
                {error && <div className="input-error-msg" style={{ display: 'block' }}>{error}</div>}
              </div>
            )}
          </div>

          <div className="modal-footer auth-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onBackToLogin}>
              ← Quay Lại Đăng Nhập
            </button>
            {!successMsg && (
              <button type="submit" className="btn btn-gold btn-large" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : 'Gửi Yêu Cầu'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
