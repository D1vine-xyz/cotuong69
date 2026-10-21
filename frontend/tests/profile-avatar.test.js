/**
 * Unit & Integration Tests cho Task COT-585:
 * Code giao diện Modal/Trang cập nhật thông tin cá nhân và thay đổi Avatar.
 * Nghiệm thu theo đúng 3 Tiêu chí chấp nhận (Acceptance Criteria) trong Jira Task Description.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  validateDisplayName,
  validateAvatarFile,
  UserProfileService,
  TokenStorageService,
  AUTH_ERROR_CODES
} = require('../js/auth.js');

describe('Nghiệm thu Task COT-585: Giao diện cập nhật thông tin cá nhân & thay đổi Avatar', () => {

  // =========================================================================
  // AC 1: Cho phép thay đổi tên hiển thị và chọn ảnh đại diện
  // =========================================================================
  describe('AC 1: Thay đổi tên hiển thị và chọn ảnh đại diện', () => {
    test('Validate tên hiển thị: không được rỗng, tối thiểu 2 ký tự và tối đa 50 ký tự', () => {
      const emptyCheck = validateDisplayName('');
      assert.strictEqual(emptyCheck.isValid, false);
      assert.strictEqual(emptyCheck.code, AUTH_ERROR_CODES.DISPLAY_NAME_EMPTY);

      const shortCheck = validateDisplayName('a');
      assert.strictEqual(shortCheck.isValid, false);
      assert.strictEqual(shortCheck.code, AUTH_ERROR_CODES.DISPLAY_NAME_TOO_SHORT);

      const longCheck = validateDisplayName('a'.repeat(51));
      assert.strictEqual(longCheck.isValid, false);
      assert.strictEqual(longCheck.code, AUTH_ERROR_CODES.DISPLAY_NAME_TOO_LONG);

      const validCheck = validateDisplayName('Đại Sư Kỳ Đạo');
      assert.strictEqual(validCheck.isValid, true);
      assert.strictEqual(validCheck.value, 'Đại Sư Kỳ Đạo');
    });

    test('Chặn chọn file rỗng hoặc không đúng định dạng ảnh', () => {
      const nullCheck = validateAvatarFile(null);
      assert.strictEqual(nullCheck.isValid, false);
      assert.strictEqual(nullCheck.code, AUTH_ERROR_CODES.FILE_EMPTY);

      const invalidTypeFile = {
        name: 'document.pdf',
        size: 500 * 1024,
        type: 'application/pdf'
      };
      const typeCheck = validateAvatarFile(invalidTypeFile);
      assert.strictEqual(typeCheck.isValid, false);
      assert.strictEqual(typeCheck.code, AUTH_ERROR_CODES.FILE_INVALID_TYPE);
    });
  });

  // =========================================================================
  // AC 2: Có xem trước ảnh trước khi bấm lưu & kiểm tra dung lượng <= 2MB
  // =========================================================================
  describe('AC 2: Xem trước ảnh (Preview) và kiểm tra dung lượng <= 2MB trên Client', () => {
    test('Chặn tệp ảnh có dung lượng vượt quá 2MB (2,097,152 bytes)', () => {
      const largeFile = {
        name: 'huge_avatar.jpg',
        size: 2 * 1024 * 1024 + 100, // 2MB + 100 bytes
        type: 'image/jpeg'
      };

      const res = validateAvatarFile(largeFile);
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.code, AUTH_ERROR_CODES.FILE_TOO_LARGE);
      assert.ok(res.error.includes('vượt quá 2MB'));
    });

    test('Chấp nhận tệp ảnh hợp lệ <= 2MB (JPG, PNG, WebP) và hỗ trợ tạo Data URL Preview', () => {
      const validFiles = [
        { name: 'avatar.jpg', size: 1.5 * 1024 * 1024, type: 'image/jpeg' },
        { name: 'avatar.png', size: 800 * 1024, type: 'image/png' },
        { name: 'avatar.webp', size: 300 * 1024, type: 'image/webp' }
      ];

      validFiles.forEach(file => {
        const check = validateAvatarFile(file);
        assert.strictEqual(check.isValid, true, `File ${file.name} phải hợp lệ`);
      });
    });
  });

  // =========================================================================
  // AC 3: Cập nhật thành công đồng bộ ngay lên Header
  // =========================================================================
  describe('AC 3: Đồng bộ thông tin cá nhân và Avatar lên Header ngay lập tức', () => {
    test('Cập nhật Tên hiển thị thành công kích hoạt callback đồng bộ Header', async () => {
      let syncedUser = null;
      const storage = new TokenStorageService();
      storage.saveTokens({
        accessToken: 'token_profile',
        user: { id: 'u1', username: 'kythu_vn', displayName: 'Kỳ Thủ Cũ', elo: 1400, avatar: 'K' }
      });

      const profileService = new UserProfileService({
        tokenStorage: storage,
        onProfileUpdated: (updated) => {
          syncedUser = updated;
        }
      });

      const res = await profileService.updateDisplayName('Kỳ Vương Bắc Ninh');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.user.displayName, 'Kỳ Vương Bắc Ninh');
      assert.strictEqual(syncedUser.displayName, 'Kỳ Vương Bắc Ninh');
      assert.strictEqual(storage.getCurrentUser().displayName, 'Kỳ Vương Bắc Ninh');
    });

    test('Cập nhật Avatar thành công kích hoạt callback đồng bộ Header', async () => {
      let syncedUser = null;
      const storage = new TokenStorageService();
      storage.saveTokens({
        accessToken: 'token_profile',
        user: { id: 'u1', username: 'kythu_vn', displayName: 'Kỳ Thủ', elo: 1400, avatar: 'K' }
      });

      const profileService = new UserProfileService({
        tokenStorage: storage,
        onProfileUpdated: (updated) => {
          syncedUser = updated;
        }
      });

      const mockFile = { name: 'new_face.png', size: 500 * 1024, type: 'image/png' };
      const previewUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

      const res = await profileService.updateAvatar(mockFile, previewUrl);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.avatarUrl, previewUrl);
      assert.strictEqual(syncedUser.avatar, previewUrl);
      assert.strictEqual(storage.getCurrentUser().avatar, previewUrl);
    });
  });
});
