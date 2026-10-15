const https = require('node:https');

/**
 * Service xác thực token từ Google hoặc Facebook
 */
class OAuthVerifierService {
  async verify(provider, token) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      const err = new Error('Mã xác thực OAuth (token) không được để trống.');
      err.code = 'INVALID_OAUTH_TOKEN';
      err.statusCode = 400;
      throw err;
    }

    const cleanToken = token.trim();

    // Hỗ trợ mock token cho môi trường test hoặc dev
    if (cleanToken.startsWith('mock_')) {
      const parts = cleanToken.split(':');
      // Format: mock_provider:id:email:name
      return {
        providerId: parts[1] || 'mock_id_123',
        email: parts[2] || `${provider}_user@example.com`,
        name: parts[3] || `User ${provider.toUpperCase()}`,
        avatarUrl: `https://avatar.cotuong.vn/${provider}.png`,
      };
    }

    if (provider === 'google') {
      return await this.verifyGoogle(cleanToken);
    } else if (provider === 'facebook') {
      return await this.verifyFacebook(cleanToken);
    } else {
      const err = new Error(`Nhà cung cấp OAuth không được hỗ trợ: ${provider}`);
      err.code = 'UNSUPPORTED_OAUTH_PROVIDER';
      err.statusCode = 400;
      throw err;
    }
  }

  verifyGoogle(idToken) {
    return new Promise((resolve, reject) => {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const body = JSON.parse(data);
            if (body.error || !body.sub || !body.email) {
              const err = new Error('Google ID Token không hợp lệ hoặc đã hết hạn.');
              err.code = 'INVALID_OAUTH_TOKEN';
              err.statusCode = 401;
              return reject(err);
            }
            resolve({
              providerId: body.sub,
              email: body.email.toLowerCase(),
              name: body.name || body.email.split('@')[0],
              avatarUrl: body.picture || null,
            });
          } catch {
            const err = new Error('Lỗi phản hồi từ máy chủ Google.');
            err.code = 'OAUTH_PROVIDER_ERROR';
            err.statusCode = 502;
            reject(err);
          }
        });
      }).on('error', (e) => {
        const err = new Error(`Không thể kết nối đến máy chủ Google: ${e.message}`);
        err.code = 'NETWORK_ERROR';
        err.statusCode = 502;
        reject(err);
      });
    });
  }

  verifyFacebook(accessToken) {
    return new Promise((resolve, reject) => {
      const url = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const body = JSON.parse(data);
            if (body.error || !body.id) {
              const err = new Error('Facebook Access Token không hợp lệ hoặc đã hết hạn.');
              err.code = 'INVALID_OAUTH_TOKEN';
              err.statusCode = 401;
              return reject(err);
            }
            const email = body.email ? body.email.toLowerCase() : `fb_${body.id}@facebook.local`;
            const avatarUrl = body.picture?.data?.url || null;
            resolve({
              providerId: String(body.id),
              email,
              name: body.name || `FB_${body.id.slice(-4)}`,
              avatarUrl,
            });
          } catch {
            const err = new Error('Lỗi phản hồi từ máy chủ Facebook.');
            err.code = 'OAUTH_PROVIDER_ERROR';
            err.statusCode = 502;
            reject(err);
          }
        });
      }).on('error', (e) => {
        const err = new Error(`Không thể kết nối đến máy chủ Facebook: ${e.message}`);
        err.code = 'NETWORK_ERROR';
        err.statusCode = 502;
        reject(err);
      });
    });
  }
}

module.exports = OAuthVerifierService;
