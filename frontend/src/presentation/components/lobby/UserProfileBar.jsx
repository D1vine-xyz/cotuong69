import React from 'react';

/**
 * COT-584: Header Sảnh Chờ (Lobby Header)
 * Hiển thị thông tin người dùng:
 * - Tên hiển thị người chơi
 * - Huy hiệu điểm Elo hiện tại (mặc định 1000)
 * - Ảnh đại diện (Avatar)
 * - Nút Đăng xuất
 */
export default function UserProfileBar({
  user = { displayName: 'Kỳ Thủ', username: 'kythu', elo: 1000, avatar: null },
  onLogout,
  onOpenLogin
}) {
  const displayName = user?.displayName || user?.username || 'Kỳ Thủ';
  const elo = Number.isFinite(user?.elo) ? user.elo : 1000;
  const avatarChar = user?.avatar || (displayName ? displayName.charAt(0).toUpperCase() : '棋');

  if (!user || user.isLoggedIn === false) {
    return (
      <div className="user-auth-wrapper">
        <button
          type="button"
          id="openLoginModalBtn"
          className="btn btn-gold btn-sm"
          onClick={onOpenLogin}
        >
          <span>🔑 Đăng Nhập</span>
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile" id="userProfileBar">
      <div className="user-avatar" id="currentUserAvatar" title={displayName}>
        {avatarChar}
      </div>
      <div className="user-details">
        <span className="user-name" id="currentUserName">{displayName}</span>
        <span className="user-elo">
          <span className="elo-badge" id="currentUserEloBadge">
            <span className="elo-star">★</span> Elo: <strong id="currentUserElo">{elo}</strong>
          </span>
        </span>
      </div>
      <button
        type="button"
        id="headerLogoutBtn"
        className="btn-logout"
        title="Đăng xuất khỏi hệ thống"
        onClick={onLogout}
      >
        Đăng xuất
      </button>
      <div className="status-indicator online" title="Đang kết nối Realtime" />
    </div>
  );
}
