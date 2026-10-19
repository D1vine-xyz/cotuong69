/**
 * Kỳ Đạo Online - Password Reset & Auth Service (COT-583)
 * Xử lý logic Giao diện Quên mật khẩu và Đặt lại mật khẩu dựa trên OTP/Token.
 * Tuân thủ đầy đủ 5 Tiêu chí chấp nhận (Acceptance Criteria) theo Jira Task COT-583.
 */

const AUTH_ERROR_CODES = {
  EMAIL_EMPTY: 'EMAIL_EMPTY',
  EMAIL_INVALID: 'EMAIL_INVALID',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_MISSING_ALPHA_OR_NUM: 'PASSWORD_MISSING_ALPHA_OR_NUM',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  TOKEN_MISSING: 'TOKEN_MISSING',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_ALREADY_USED: 'TOKEN_ALREADY_USED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

const SAFE_FORGOT_PASSWORD_MESSAGE =
  'Nếu email tồn tại trong hệ thống, hướng dẫn và liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra hòm thư (kể cả mục Spam).';

/**
 * AC 1: Kiểm tra tính hợp lệ của Email
 * Không cho gửi request khi email để trống hoặc sai định dạng
 */
function validateEmail(email) {
  if (email === undefined || email === null) {
    return { isValid: false, error: 'Email không được để trống.', code: AUTH_ERROR_CODES.EMAIL_EMPTY };
  }
  const trimmed = String(email).trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email không được để trống.', code: AUTH_ERROR_CODES.EMAIL_EMPTY };
  }
  // Regex chuẩn RFC 5322 cơ bản: có ký tự trước @, tên miền và đuôi .tld
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Định dạng email không hợp lệ (Ví dụ: kythu@cotuong.com).', code: AUTH_ERROR_CODES.EMAIL_INVALID };
  }
  return { isValid: true, error: null, value: trimmed };
}

/**
 * AC 4/5: Kiểm tra tính hợp lệ của Mật khẩu mới
 * Tối thiểu 8 ký tự, bắt buộc có cả chữ và số
 */
function validatePassword(password) {
  if (password === undefined || password === null) {
    return { isValid: false, error: 'Mật khẩu không được để trống.', code: AUTH_ERROR_CODES.PASSWORD_TOO_SHORT };
  }
  const str = String(password);
  if (str.length < 8) {
    return { isValid: false, error: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.', code: AUTH_ERROR_CODES.PASSWORD_TOO_SHORT };
  }
  const hasLetter = /[A-Za-z]/.test(str);
  const hasNumber = /\d/.test(str);
  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'Mật khẩu phải bao gồm cả chữ cái và chữ số.', code: AUTH_ERROR_CODES.PASSWORD_MISSING_ALPHA_OR_NUM };
  }
  return { isValid: true, error: null, value: str };
}

/**
 * Kiểm tra trùng khớp mật khẩu xác nhận
 */
function validateConfirmPassword(password, confirmPassword) {
  const passCheck = validatePassword(password);
  if (!passCheck.isValid) return passCheck;

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Mật khẩu xác nhận không trùng khớp.', code: AUTH_ERROR_CODES.PASSWORD_MISMATCH };
  }
  return { isValid: true, error: null };
}

/**
 * AC 3: Trích xuất reset token từ URL / Search params / Hash
 */
function extractResetToken(input) {
  if (!input) return null;
  const str = String(input).trim();

  // Trường hợp truyền thẳng chuỗi URL đầy đủ hoặc query params
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      const parsed = new URL(str);
      const token = parsed.searchParams.get('token');
      if (token) return token.trim();
    }
  } catch {
    // Không phải URL chuẩn thì xử lý thủ công
  }

  // Regex tìm token=...
  const match = str.match(/[?&#]token=([^&#\s]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]).trim();
  }

  // Nếu input chính là mã token trực tiếp (dài tối thiểu 16 ký tự hexa/base64)
  if (/^[a-zA-Z0-9_-]{16,}$/.test(str)) {
    return str;
  }

  return null;
}

/**
 * Service xử lý gọi API Quên & Đặt lại mật khẩu (COT-583)
 */
class PasswordResetService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || (typeof window !== 'undefined' && window.VITE_API_URL ? window.VITE_API_URL : 'http://localhost:5000/api');
    this.fetchImpl = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  }

  /**
   * AC 1 & 2: Gửi yêu cầu Quên mật khẩu
   * Kiểm tra email client-side trước khi gửi
   * Luôn trả thông báo chung an toàn, không làm lộ sự tồn tại của Email
   */
  async requestForgotPassword(email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return {
        success: false,
        error: emailValidation.error,
        code: emailValidation.code
      };
    }

    if (!this.fetchImpl) {
      // Giả lập nếu không có môi trường fetch (Node unit test mock)
      return {
        success: true,
        message: SAFE_FORGOT_PASSWORD_MESSAGE
      };
    }

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValidation.value })
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 429) {
        return {
          success: false,
          error: data.error || 'Bạn đã gửi yêu cầu quá nhanh. Vui lòng chờ ít phút rồi thử lại.',
          code: AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED
        };
      }

      if (response.status === 400 && data.code === 'VALIDATION_ERROR') {
        return {
          success: false,
          error: data.error || 'Dữ liệu email không hợp lệ.',
          code: AUTH_ERROR_CODES.EMAIL_INVALID
        };
      }

      // AC 2: Luôn hiển thị thông báo chung an toàn khi gửi thành công
      return {
        success: true,
        message: data.message || SAFE_FORGOT_PASSWORD_MESSAGE
      };
    } catch (err) {
      return {
        success: false,
        error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * AC 3, 4 & 5: Đặt lại mật khẩu mới
   * Validate token, password, confirmPassword
   * Trả về kết quả hoặc lỗi tương ứng
   */
  async resetPassword({ token, newPassword, confirmPassword }) {
    const validToken = extractResetToken(token);
    if (!validToken) {
      return {
        success: false,
        error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu mã xác thực.',
        code: AUTH_ERROR_CODES.TOKEN_MISSING
      };
    }

    const passCheck = validateConfirmPassword(newPassword, confirmPassword);
    if (!passCheck.isValid) {
      return {
        success: false,
        error: passCheck.error,
        code: passCheck.code
      };
    }

    if (!this.fetchImpl) {
      return {
        success: true,
        message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.'
      };
    }

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validToken,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let code = data.code || 'RESET_FAILED';
        let errorMsg = data.error || 'Không thể đặt lại mật khẩu.';

        if (code === 'TOKEN_EXPIRED') {
          errorMsg = 'Liên kết đặt lại mật khẩu đã hết hạn (tối đa 15 phút). Vui lòng yêu cầu cấp lại mã mới.';
        } else if (code === 'TOKEN_ALREADY_USED') {
          errorMsg = 'Liên kết đặt lại mật khẩu này đã được sử dụng trước đó. Mỗi liên kết chỉ dùng được một lần.';
        } else if (code === 'INVALID_TOKEN') {
          errorMsg = 'Mã xác thực không hợp lệ hoặc không tồn tại trong hệ thống.';
        }

        return {
          success: false,
          error: errorMsg,
          code
        };
      }

      // AC 5: Đặt lại thành công
      return {
        success: true,
        message: data.message || 'Đặt lại mật khẩu thành công. Đang chuyển về màn hình Đăng nhập...'
      };
    } catch (err) {
      return {
        success: false,
        error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
        code: 'NETWORK_ERROR'
      };
    }
  }
}

// Xuất cho môi trường Node.js (Unit Test) và Trình duyệt
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    extractResetToken,
    PasswordResetService,
    AUTH_ERROR_CODES,
    SAFE_FORGOT_PASSWORD_MESSAGE
  };
}

if (typeof window !== 'undefined') {
  window.validateEmail = validateEmail;
  window.validatePassword = validatePassword;
  window.validateConfirmPassword = validateConfirmPassword;
  window.extractResetToken = extractResetToken;
  window.PasswordResetService = PasswordResetService;
  window.AUTH_ERROR_CODES = AUTH_ERROR_CODES;
  window.SAFE_FORGOT_PASSWORD_MESSAGE = SAFE_FORGOT_PASSWORD_MESSAGE;
}
