const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Băm mật khẩu bằng Bcrypt
 * @param {string} plainPassword 
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Mật khẩu không hợp lệ để băm');
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Kiểm tra mật khẩu khớp với Bcrypt hash
 * @param {string} plainPassword 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword,
};
