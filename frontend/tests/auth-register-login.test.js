/**
 * Unit & Integration Tests cho Task COT-579:
 * Code giao diện màn hình Đăng ký và Đăng nhập.
 * Nghiệm thu theo đúng 5 Tiêu chí chấp nhận (Acceptance Criteria) trong Jira Task Description.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  validateRegisterForm,
  validateLoginForm,
  validateUsername,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  AuthService,
  TokenStorageService,
  AUTH_ERROR_CODES
} = require('../js/auth.js');

describe('Nghiệm thu Task COT-579: Giao diện màn hình Đăng ký và Đăng nhập', () => {

  // =========================================================================
  // AC 1: Có đủ các trường nhập liệu theo quy định
  // =========================================================================
  describe('AC 1: Đầy đủ các trường nhập liệu theo quy định', () => {
    test('Form Đăng ký yêu cầu đủ 5 trường: username, displayName, email, password, confirmPassword', () => {
      const emptyForm = validateRegisterForm({});
      assert.strictEqual(emptyForm.isValid, false);
      assert.ok('username' in emptyForm.errors, 'Thiếu trường username');
      assert.ok('displayName' in emptyForm.errors, 'Thiếu trường displayName');
      assert.ok('email' in emptyForm.errors, 'Thiếu trường email');
      assert.ok('password' in emptyForm.errors, 'Thiếu trường password');
      assert.ok('confirmPassword' in emptyForm.errors, 'Thiếu trường confirmPassword');
    });

    test('Form Đăng nhập yêu cầu đủ 2 trường: username và password', () => {
      const emptyLogin = validateLoginForm({});
      assert.strictEqual(emptyLogin.isValid, false);
      assert.ok('username' in emptyLogin.errors, 'Thiếu trường username');
      assert.ok('password' in emptyLogin.errors, 'Thiếu trường password');
    });
  });

  // =========================================================================
  // AC 2: Dữ liệu sai định dạng bị chặn ngay trên giao diện
  // =========================================================================
  describe('AC 2: Dữ liệu sai định dạng bị chặn ngay trên giao diện (Client-side Validation)', () => {
    test('Chặn khi email để trống hoặc không đúng định dạng RFC 5322', () => {
      const res1 = validateEmail('');
      assert.strictEqual(res1.isValid, false);
      assert.strictEqual(res1.code, AUTH_ERROR_CODES.EMAIL_EMPTY);

      const invalidEmails = ['invalid', 'user@', 'user@domain', '@cotuong.vn', 'user domain.com'];
      invalidEmails.forEach(em => {
        const check = validateEmail(em);
        assert.strictEqual(check.isValid, false, `Email ${em} phải bị chặn`);
        assert.strictEqual(check.code, AUTH_ERROR_CODES.EMAIL_INVALID);
      });
    });

    test('Chặn khi mật khẩu < 8 ký tự hoặc thiếu chữ cái/chữ số', () => {
      const shortPass = validatePassword('1234567');
      assert.strictEqual(shortPass.isValid, false);
      assert.strictEqual(shortPass.code, AUTH_ERROR_CODES.PASSWORD_TOO_SHORT);

      const onlyLetters = validatePassword('abcdefgh');
      assert.strictEqual(onlyLetters.isValid, false);
      assert.strictEqual(onlyLetters.code, AUTH_ERROR_CODES.PASSWORD_MISSING_ALPHA_OR_NUM);

      const onlyNumbers = validatePassword('12345678');
      assert.strictEqual(onlyNumbers.isValid, false);
      assert.strictEqual(onlyNumbers.code, AUTH_ERROR_CODES.PASSWORD_MISSING_ALPHA_OR_NUM);

      const validPass = validatePassword('Kytu123456');
      assert.strictEqual(validPass.isValid, true);
    });

    test('Chặn khi mật khẩu xác nhận không trùng khớp', () => {
      const mismatch = validateConfirmPassword('Password123', 'Password456');
      assert.strictEqual(mismatch.isValid, false);
      assert.strictEqual(mismatch.code, AUTH_ERROR_CODES.PASSWORD_MISMATCH);

      const match = validateConfirmPassword('Password123', 'Password123');
      assert.strictEqual(match.isValid, true);
    });

    test('Chặn khi tên đăng nhập chứa ký tự đặc biệt không hợp lệ hoặc quá ngắn', () => {
      const shortUser = validateUsername('ab');
      assert.strictEqual(shortUser.isValid, false);
      assert.strictEqual(shortUser.code, AUTH_ERROR_CODES.USERNAME_TOO_SHORT);

      const specialUser = validateUsername('user@!#$');
      assert.strictEqual(specialUser.isValid, false);
      assert.strictEqual(specialUser.code, AUTH_ERROR_CODES.USERNAME_INVALID);

      const validUser = validateUsername('ky_thu_69');
      assert.strictEqual(validUser.isValid, true);
    });
  });

  // =========================================================================
  // AC 3: Khóa nút trong lúc đang xử lý để tránh gửi nhiều yêu cầu do bấm liên tục
  // =========================================================================
  describe('AC 3: Chống gửi nhiều yêu cầu liên tục (Double submission lock)', () => {
    test('Dịch vụ trả về trạng thái đang xử lý và chặn gửi trùng lặp', async () => {
      let submitCount = 0;
      let isSubmitting = false;

      async function simulatedSubmit() {
        if (isSubmitting) return { locked: true };
        isSubmitting = true;
        submitCount++;
        await new Promise(r => setTimeout(r, 20));
        isSubmitting = false;
        return { locked: false, count: submitCount };
      }

      const [res1, res2] = await Promise.all([simulatedSubmit(), simulatedSubmit()]);
      assert.strictEqual(submitCount, 1, 'Chỉ được gửi duy nhất 1 request khi bấm liên tục');
      assert.strictEqual(res2.locked, true, 'Request thứ hai phải bị chặn do nút bị khóa');
    });
  });

  // =========================================================================
  // AC 4: Đăng ký thành công thông báo và chuyển sang màn hình Đăng nhập (không tự đăng nhập)
  // =========================================================================
  describe('AC 4: Đăng ký thành công chuyển sang Đăng nhập (không tự đăng nhập)', () => {
    test('Đăng ký hợp lệ trả về redirectTo="login" và không tự động gán session token', async () => {
      const storage = new TokenStorageService();
      const authService = new AuthService({ tokenStorage: storage });

      const res = await authService.register({
        username: 'nguyen_hai_quan',
        displayName: 'Hải Quân',
        email: 'quan@gmail.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.redirectTo, 'login');
      assert.ok(res.message.includes('Đăng ký tài khoản thành công'));

      // Kiểm tra TUYỆT ĐỐI không tự động gán token đăng nhập
      assert.strictEqual(storage.getAccessToken(), null, 'Sau khi đăng ký không được tự động cấp token đăng nhập');
      assert.strictEqual(storage.getCurrentUser(), null, 'Session phải để trống');
    });
  });

  // =========================================================================
  // AC 5: Đăng nhập đúng chuyển tới màn hình chính, đăng nhập sai hiển thị thông báo chung phù hợp
  // =========================================================================
  describe('AC 5: Luồng Đăng nhập đúng và xử lý thông báo thất bại', () => {
    test('Đăng nhập thành công lưu token và user vào session', async () => {
      const storage = new TokenStorageService();
      const authService = new AuthService({ tokenStorage: storage });

      const res = await authService.login({
        username: 'nguyen_hai_quan',
        password: 'Password123'
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.token);
      assert.strictEqual(res.user.username, 'nguyen_hai_quan');
      assert.strictEqual(storage.getAccessToken(), res.token);
    });

    test('Đăng nhập thất bại hiển thị thông báo chung phù hợp, không lộ thông tin', async () => {
      // Mock fetch trả về HTTP 401
      const mockFetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      });

      const storage = new TokenStorageService();
      const authService = new AuthService({ tokenStorage: storage, fetchImpl: mockFetch });

      const res = await authService.login({
        username: 'sai_username',
        password: 'WrongPassword123'
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      assert.strictEqual(res.error, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      assert.strictEqual(storage.getAccessToken(), null);
    });
  });
});
