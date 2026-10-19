/**
 * Unit & Integration Tests cho Task COT-583:
 * Code giao diện trang Quên mật khẩu và Form nhập OTP đặt lại mật khẩu.
 * Nghiệm thu theo đúng 5 Tiêu chí chấp nhận (Acceptance Criteria) trong Jira Task Description.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  extractResetToken,
  PasswordResetService,
  AUTH_ERROR_CODES,
  SAFE_FORGOT_PASSWORD_MESSAGE
} = require('../js/auth.js');

describe('Nghiệm thu Task COT-583: Giao diện Quên mật khẩu & Đặt lại mật khẩu qua Token', () => {

  // =========================================================================
  // AC 1: Không gửi request khi Email để trống hoặc sai định dạng
  // =========================================================================
  describe('AC 1: Kiểm tra tính hợp lệ của Email (Validation phía Client)', () => {
    test('Từ chối khi email để trống hoặc null', () => {
      const res1 = validateEmail('');
      assert.strictEqual(res1.isValid, false);
      assert.strictEqual(res1.code, AUTH_ERROR_CODES.EMAIL_EMPTY);

      const res2 = validateEmail('   ');
      assert.strictEqual(res2.isValid, false);
      assert.strictEqual(res2.code, AUTH_ERROR_CODES.EMAIL_EMPTY);

      const res3 = validateEmail(null);
      assert.strictEqual(res3.isValid, false);
      assert.strictEqual(res3.code, AUTH_ERROR_CODES.EMAIL_EMPTY);
    });

    test('Từ chối khi email sai định dạng (thiếu @, thiếu domain, có khoảng trắng)', () => {
      const invalidEmails = [
        'nguyenquochung',
        'hung@',
        'hung@gmail',
        '@gmail.com',
        'hung gmail.com',
        'hung@.com'
      ];

      invalidEmails.forEach(email => {
        const res = validateEmail(email);
        assert.strictEqual(res.isValid, false, `Email [${email}] phải bị coi là không hợp lệ`);
        assert.strictEqual(res.code, AUTH_ERROR_CODES.EMAIL_INVALID);
        assert.ok(res.error.length > 0, 'Phải có thông báo lỗi hiển thị cho người dùng');
      });
    });

    test('Chấp nhận email đúng định dạng và loại bỏ khoảng trắng thừa', () => {
      const validEmails = [
        'hunghung144543@gmail.com',
        '  kythu@cotuong69.vn  ',
        'user.name+tag@domain.co'
      ];

      validEmails.forEach(email => {
        const res = validateEmail(email);
        assert.strictEqual(res.isValid, true, `Email [${email}] phải hợp lệ`);
        assert.strictEqual(res.error, null);
        assert.strictEqual(res.value, email.trim());
      });
    });

    test('Chặn gửi request API khi email không hợp lệ (không kích hoạt fetch)', async () => {
      let fetchCalled = false;
      const mockFetch = async () => {
        fetchCalled = true;
        return { ok: true, json: async () => ({}) };
      };

      const service = new PasswordResetService({ fetchImpl: mockFetch });
      const result = await service.requestForgotPassword('invalid-email');

      assert.strictEqual(fetchCalled, false, 'Không được gọi API mạng khi email sai');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.code, AUTH_ERROR_CODES.EMAIL_INVALID);
    });
  });

  // =========================================================================
  // AC 2: Sau khi gửi hiển thị thông báo chung an toàn, không tiết lộ email
  // =========================================================================
  describe('AC 2: Thông báo an toàn khi gửi yêu cầu Quên mật khẩu', () => {
    test('Luôn hiển thị thông báo chung an toàn khi request thành công', async () => {
      const mockFetch = async (url, options) => {
        assert.ok(url.includes('/auth/forgot-password'));
        assert.strictEqual(options.method, 'POST');
        const body = JSON.parse(options.body);
        assert.strictEqual(body.email, 'hunghung144543@gmail.com');

        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            message: 'Nếu email tồn tại, một mã/token đặt lại mật khẩu đã được gửi đến email của bạn.'
          })
        };
      };

      const service = new PasswordResetService({ fetchImpl: mockFetch });
      const result = await service.requestForgotPassword('hunghung144543@gmail.com');

      assert.strictEqual(result.success, true);
      assert.ok(result.message, 'Phải có thông báo phản hồi');
      // Thông báo không khẳng định email có tồn tại hay không
      assert.ok(result.message.toLowerCase().includes('nếu email tồn tại') || result.message.toLowerCase().includes('hộp thư'));
    });

    test('Xử lý đúng mã lỗi giới hạn tần suất (Rate Limit 429)', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 10 phút.',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      });

      const service = new PasswordResetService({ fetchImpl: mockFetch });
      const result = await service.requestForgotPassword('spam@cotuong.com');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.code, AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED);
      assert.ok(result.error.includes('quá nhiều lần'));
    });
  });

  // =========================================================================
  // AC 3: Token hợp lệ mở được màn hình đặt lại mật khẩu
  // =========================================================================
  describe('AC 3: Trích xuất và xác thực Token từ liên kết Email', () => {
    test('Trích xuất đúng token từ query parameter URL (?token=...)', () => {
      const tokenSample = '9f21e6ec-ce7e-4ceb-9adc-b9da1173fd74';
      const url1 = `https://cotuong69.vn/reset-password?token=${tokenSample}`;
      const url2 = `http://localhost:3000/?token=${tokenSample}&source=email`;
      const queryOnly = `?token=${tokenSample}`;

      assert.strictEqual(extractResetToken(url1), tokenSample);
      assert.strictEqual(extractResetToken(url2), tokenSample);
      assert.strictEqual(extractResetToken(queryOnly), tokenSample);
    });

    test('Trích xuất đúng token từ hash URL (#reset-password?token=...)', () => {
      const tokenSample = 'a1b2c3d4e5f6789012345678';
      const hashUrl = `http://localhost:3000/#reset-password?token=${tokenSample}`;

      assert.strictEqual(extractResetToken(hashUrl), tokenSample);
    });

    test('Từ chối khi liên kết không chứa token hợp lệ', () => {
      assert.strictEqual(extractResetToken(''), null);
      assert.strictEqual(extractResetToken('http://localhost:3000/reset-password'), null);
      assert.strictEqual(extractResetToken('?token='), null);
    });
  });

  // =========================================================================
  // AC 4: Token hết hạn/đã dùng không thể tiếp tục
  // =========================================================================
  describe('AC 4: Xử lý lỗi Token hết hạn, đã dùng hoặc không hợp lệ', () => {
    test('Từ chối khi Token đã hết hạn (TOKEN_EXPIRED - quá 15 phút)', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Mã đặt lại mật khẩu đã hết hạn (chỉ có hiệu lực trong 15 phút).',
          code: 'TOKEN_EXPIRED'
        })
      });

      const service = new PasswordResetService({ fetchImpl: mockFetch });
      const result = await service.resetPassword({
        token: 'token-expired-12345678',
        newPassword: 'Password123',
        confirmPassword: 'Password123'
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.code, 'TOKEN_EXPIRED');
      assert.ok(result.error.includes('hết hạn'));
    });

    test('Từ chối khi Token đã từng được sử dụng (TOKEN_ALREADY_USED)', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Mã đặt lại mật khẩu này đã được sử dụng. Mỗi mã chỉ được dùng một lần.',
          code: 'TOKEN_ALREADY_USED'
        })
      });

      const service = new PasswordResetService({ fetchImpl: mockFetch });
      const result = await service.resetPassword({
        token: 'token-used-1234567890',
        newPassword: 'Password123',
        confirmPassword: 'Password123'
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.code, 'TOKEN_ALREADY_USED');
      assert.ok(result.error.includes('đã được sử dụng'));
    });

    test('Từ chối khi Token không tồn tại hoặc sai định dạng (INVALID_TOKEN)', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Mã đặt lại mật khẩu không hợp lệ.',
          code: 'INVALID_TOKEN'
        })
      });

      const service = new PasswordResetService({ fetchImpl: mockFetch });
      const result = await service.resetPassword({
        token: 'fake-invalid-token-123456',
        newPassword: 'Password123',
        confirmPassword: 'Password123'
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.code, 'INVALID_TOKEN');
      assert.ok(result.error.includes('không hợp lệ'));
    });
  });

  // =========================================================================
  // AC 5: Đặt lại thành công chuyển về Đăng nhập & Validate mật khẩu mới
  // =========================================================================
  describe('AC 5: Quy tắc mật khẩu mới & Đặt lại mật khẩu thành công', () => {
    test('Mật khẩu mới phải có tối thiểu 8 ký tự', () => {
      const res = validatePassword('Pass12');
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.code, AUTH_ERROR_CODES.PASSWORD_TOO_SHORT);
    });

    test('Mật khẩu mới bắt buộc phải chứa cả chữ và số', () => {
      const resOnlyLetters = validatePassword('PasswordWord');
      assert.strictEqual(resOnlyLetters.isValid, false);
      assert.strictEqual(resOnlyLetters.code, AUTH_ERROR_CODES.PASSWORD_MISSING_ALPHA_OR_NUM);

      const resOnlyNumbers = validatePassword('1234567890');
      assert.strictEqual(resOnlyNumbers.isValid, false);
      assert.strictEqual(resOnlyNumbers.code, AUTH_ERROR_CODES.PASSWORD_MISSING_ALPHA_OR_NUM);

      const resValid = validatePassword('KyThu2026');
      assert.strictEqual(resValid.isValid, true);
    });

    test('Báo lỗi khi mật khẩu xác nhận không trùng khớp', () => {
      const res = validateConfirmPassword('Password123', 'Password999');
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.code, AUTH_ERROR_CODES.PASSWORD_MISMATCH);
    });

    test('Đặt lại mật khẩu thành công khi dữ liệu hợp lệ', async () => {
      let apiCalledWith = null;
      const mockFetch = async (url, options) => {
        apiCalledWith = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.'
          })
        };
      };

      const service = new PasswordResetService({ fetchImpl: mockFetch });
      const result = await service.resetPassword({
        token: 'valid-reset-token-12345678',
        newPassword: 'NewSecretPassword888',
        confirmPassword: 'NewSecretPassword888'
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.message.includes('thành công'));
      assert.strictEqual(apiCalledWith.token, 'valid-reset-token-12345678');
      assert.strictEqual(apiCalledWith.newPassword, 'NewSecretPassword888');
    });
  });

});
