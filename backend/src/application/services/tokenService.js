const jwt = require('jsonwebtoken');

const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || 'cotuong69-jwt-secret-key-2026';
const DEFAULT_EXPIRES_IN = '1h';

/**
 * Cấp phát JWT Access Token
 * @param {object} payload 
 * @param {object} options 
 * @returns {string}
 */
function generateAccessToken(payload, { expiresIn = DEFAULT_EXPIRES_IN, secret = DEFAULT_JWT_SECRET } = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload token không hợp lệ.');
  }
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Xác thực và giải mã JWT Access Token
 * @param {string} token 
 * @param {object} options 
 * @returns {object}
 */
function verifyAccessToken(token, { secret = DEFAULT_JWT_SECRET } = {}) {
  if (!token || typeof token !== 'string') {
    const err = new Error('Token không được cung cấp.');
    err.code = 'NO_TOKEN';
    throw err;
  }
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const expErr = new Error('Token đã hết hạn.');
      expErr.code = 'TOKEN_EXPIRED';
      throw expErr;
    }
    const invErr = new Error('Token không hợp lệ hoặc chữ ký sai.');
    invErr.code = 'INVALID_TOKEN';
    throw invErr;
  }
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
