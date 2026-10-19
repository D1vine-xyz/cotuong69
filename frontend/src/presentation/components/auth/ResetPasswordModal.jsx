import React, { useState, useEffect } from 'react';
import {
  validatePassword,
  validateConfirmPassword,
  extractResetToken,
  PasswordResetService
} from '../../../../js/auth.js';

export default function ResetPasswordModal({ isOpen, onClose, onBackToLogin, initialToken = '' }) {
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialToken) {
      const extracted = extractResetToken(initialToken);
      if (!extracted) {
        setTokenError('Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu mã xác thực.');
      } else {
        setToken(extracted);
        setTokenError('');
      }
    }
  }, [initialToken]);

  if (!isOpen) return null;

  const isLenValid = newPassword.length >= 8;
  const isAlphaNumValid = /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword);
  const isMatchValid = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const tokenVal = extractResetToken(token);
    if (!tokenVal) {
      setTokenError('Liên kết đặt lại mật khẩu không hợp lệ hoặc mã xác thực đã bị thiếu.');
      return;
    }

    const passCheck = validateConfirmPassword(newPassword, confirmPassword);
    if (!passCheck.isValid) {
      setError(passCheck.error);
      return;
    }

    setLoading(true);
    try {
      const service = new PasswordResetService();
      const res = await service.resetPassword({
        token: tokenVal,
        newPassword,
        confirmPassword
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        if (['TOKEN_EXPIRED', 'TOKEN_ALREADY_USED', 'INVALID_TOKEN'].includes(res.code)) {
          setTokenError(res.error);
        } else {
          setError(res.error);
        }
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
            <span className="header-icon">🛡️</span>
            <h3>Đặt Lại Mật Khẩu Mới</h3>
          </div>
          <button type="button" className="close-btn" aria-label="Đóng" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="modal-body">
            {tokenError && (
              <div className="auth-status-banner auth-status-error" role="alert">
                <span className="banner-icon">⚠️</span>
                <div className="banner-text">
                  <strong>Không thể tiếp tục:</strong>
                  <p>{tokenError}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="auth-status-banner auth-status-success" role="status">
                <span className="banner-icon">✅</span>
                <div className="banner-text">
                  <strong>Thành công!</strong>
                  <p>{successMsg}</p>
                </div>
              </div>
            )}

            {!tokenError && !successMsg && (
              <div id="resetInputsArea">
                <div className="form-group">
                  <label htmlFor="reactNewPasswordInput" className="form-label">
                    Mật Khẩu Mới <span className="required-star">*</span>
                  </label>
                  <input
                    type="password"
                    id="reactNewPasswordInput"
                    className="form-input"
                    placeholder="Nhập mật khẩu mới..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reactConfirmPasswordInput" className="form-label">
                    Xác Nhận Mật Khẩu <span className="required-star">*</span>
                  </label>
                  <input
                    type="password"
                    id="reactConfirmPasswordInput"
                    className="form-input"
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  {error && <div className="input-error-msg" style={{ display: 'block' }}>{error}</div>}
                </div>

                <div className="password-checklist">
                  <div className={`checklist-item ${isLenValid ? 'valid' : ''}`}>
                    <span className="chk-icon">{isLenValid ? '✓' : '○'}</span> Tối thiểu 8 ký tự
                  </div>
                  <div className={`checklist-item ${isAlphaNumValid ? 'valid' : ''}`}>
                    <span className="chk-icon">{isAlphaNumValid ? '✓' : '○'}</span> Chứa cả chữ cái và chữ số
                  </div>
                  <div className={`checklist-item ${isMatchValid ? 'valid' : ''}`}>
                    <span className="chk-icon">{isMatchValid ? '✓' : '○'}</span> Mật khẩu xác nhận trùng khớp
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer auth-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onBackToLogin}>
              Đăng Nhập
            </button>
            {!tokenError && !successMsg && (
              <button type="submit" className="btn btn-gold btn-large" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : 'Xác Nhận Đổi Mật Khẩu'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
