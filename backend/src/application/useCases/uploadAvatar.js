const fs = require('node:fs');
const path = require('node:path');
const { validateAvatarFile } = require('../../domain/validators/profileValidator');
const PgUserRepository = require('../../infrastructure/database/repositories/PgUserRepository');

class UploadAvatarUseCase {
  constructor({
    userRepository = new PgUserRepository(),
    uploadDir = path.resolve(__dirname, '../../../uploads/avatars'),
  } = {}) {
    this.userRepository = userRepository;
    this.uploadDir = uploadDir;
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async execute(userId, { buffer, mimeType, filename }) {
    if (!userId) {
      const err = new Error('Yêu cầu xác thực tài khoản.');
      err.code = 'UNAUTHORIZED';
      err.statusCode = 401;
      throw err;
    }

    const validation = validateAvatarFile({ buffer, mimeType, filename });
    if (!validation.isValid) {
      const err = new Error(validation.error);
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const ext = validation.extension === 'jpeg' ? 'jpg' : validation.extension;
    const saveFilename = `avatar_${userId}_${Date.now()}.${ext}`;
    const savePath = path.join(this.uploadDir, saveFilename);

    // Lưu tệp an toàn vào ổ cứng
    fs.writeFileSync(savePath, buffer);

    const avatarUrl = `/uploads/avatars/${saveFilename}`;
    const updatedUser = await this.userRepository.updateProfile(userId, { avatarUrl });

    return {
      success: true,
      message: 'Tải lên ảnh đại diện thành công.',
      avatarUrl,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        eloRating: updatedUser.eloRating,
        avatarUrl: updatedUser.avatarUrl,
        status: updatedUser.status,
      },
    };
  }
}

module.exports = UploadAvatarUseCase;
