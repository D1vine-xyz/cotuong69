/**
 * Clean Architecture - Infrastructure Storage: TokenStorage
 * Quản lý lưu trữ Access Token và Refresh Token cho Frontend SPA (COT-581).
 */

const ACCESS_TOKEN_KEY = 'cotuong_access_token';
const REFRESH_TOKEN_KEY = 'cotuong_refresh_token';
const USER_SESSION_KEY = 'cotuong_user_session';

export class TokenStorage {
  static getAccessToken() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  static setAccessToken(token) {
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  static getRefreshToken() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  static setRefreshToken(token) {
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  static getUser() {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static setUser(user) {
    if (typeof localStorage === 'undefined') return;
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
  }

  static clear() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
  }

  static getAuthHeaders() {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
