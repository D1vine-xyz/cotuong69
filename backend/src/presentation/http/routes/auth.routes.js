const { URL } = require('node:url');
const RegisterUserUseCase = require('../../../application/useCases/registerUser');

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(body));
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        request.destroy();
        reject(new Error('Payload quá lớn.'));
      }
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        const err = new Error('Dữ liệu JSON không hợp lệ.');
        err.code = 'INVALID_JSON';
        reject(err);
      }
    });
    request.on('error', reject);
  });
}

function createAuthHandler({ registerUseCase = new RegisterUserUseCase() } = {}) {
  return async (request, response) => {
    if (request.method === 'OPTIONS') {
      sendJson(response, 204, {});
      return;
    }

    let pathname;
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch {
      sendJson(response, 400, { error: 'URL không hợp lệ.' });
      return;
    }

    if (pathname === '/api/auth/register') {
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'Phương thức không được hỗ trợ. Chỉ chấp nhận POST.' });
        return;
      }

      let payload;
      try {
        payload = await parseJsonBody(request);
      } catch (err) {
        sendJson(response, 400, { error: err.message });
        return;
      }

      try {
        const user = await registerUseCase.execute(payload);
        sendJson(response, 201, {
          success: true,
          message: 'Đăng ký tài khoản thành công.',
          user,
        });
      } catch (err) {
        if (err.code === 'VALIDATION_ERROR') {
          sendJson(response, 400, {
            error: err.message,
            errors: err.errors,
          });
        } else if (err.code === 'USERNAME_EXISTS' || err.code === 'EMAIL_EXISTS') {
          sendJson(response, 409, {
            error: err.message,
            code: err.code,
          });
        } else {
          console.error('Lỗi không xác định khi đăng ký:', err);
          sendJson(response, 500, { error: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.' });
        }
      }
      return;
    }

    sendJson(response, 404, { error: 'Đường dẫn xác thực không tồn tại.' });
  };
}

module.exports = { createAuthHandler };
