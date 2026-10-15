const BANNED_WORDS = [
  'admin', 'administrator', 'root', 'moderator', 'hack', 'hacker',
  'cheat', 'cheater', 'fuck', 'dm', 'dcm', 'clgt', 'vl'
];

function validateDisplayName(displayName) {
  if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
    return { isValid: false, error: 'Tên hiển thị không được để trống.' };
  }

  const trimmed = displayName.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { isValid: false, error: 'Tên hiển thị phải có độ dài từ 2 đến 50 ký tự.' };
  }

  const lower = trimmed.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      return { isValid: false, error: 'Tên hiển thị chứa từ ngữ không phù hợp hoặc bị cấm.' };
    }
  }

  return { isValid: true, cleanName: trimmed };
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function validateAvatarFile({ buffer, mimeType, filename }) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    return { isValid: false, error: 'Tệp ảnh không hợp lệ hoặc rỗng.' };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return { isValid: false, error: 'Dung lượng tệp vượt quá giới hạn tối đa cho phép (tối đa 2MB).' };
  }

  const lowerMime = (mimeType || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(lowerMime)) {
    return { isValid: false, error: 'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận JPG, PNG hoặc WebP.' };
  }

  const extMatch = (filename || '').match(/\.(jpe?g|png|webp)$/i);
  if (!extMatch) {
    return { isValid: false, error: 'Phần mở rộng tệp không hợp lệ. Chỉ chấp nhận .jpg, .jpeg, .png, .webp.' };
  }

  return { isValid: true, extension: extMatch[1].toLowerCase() };
}

module.exports = {
  validateDisplayName,
  validateAvatarFile,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
};
