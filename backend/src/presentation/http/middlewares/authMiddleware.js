const { verifyAccessToken } = require('../../../application/services/tokenService');

function authenticateRequest(request, options = {}) {
  const authHeader = request.headers['authorization'] || request.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Vui lòng cung cấp token xác thực qua header Authorization: Bearer <token>');
    err.code = 'UNAUTHORIZED';
    err.statusCode = 401;
    throw err;
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = verifyAccessToken(token, options);
    request.user = decoded;
    return decoded;
  } catch (err) {
    err.statusCode = 401;
    throw err;
  }
}

module.exports = {
  authenticateRequest,
};
