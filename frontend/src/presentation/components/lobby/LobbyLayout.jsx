import React from 'react';
import UserProfileBar from './UserProfileBar';
import LobbyNavigation from './LobbyNavigation';

/**
 * COT-584: Layout tổng thể Sảnh Chờ (LobbyLayout)
 * Khung giao diện chuẩn Clean Architecture cho Frontend
 */
export default function LobbyLayout({
  user,
  onLogout,
  onOpenLogin,
  activeTab = 'online',
  onSelectTab,
  onPlayOnline,
  onPlayAi,
  onOpenFriends,
  onCreateRoom,
  onJoinByCode,
  onlineRoomsCount = 0,
  onlineFriendsCount = 0,
  children
}) {
  return (
    <div className="lobby-layout-wrapper">
      {/* Header Sảnh Chờ */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand">
            <div className="brand-logo" aria-hidden="true">象</div>
            <div className="brand-info">
              <h1>Kỳ Đạo Online</h1>
              <span className="sub-brand">Cờ Tướng Đối Kháng & Thi Đấu</span>
            </div>
          </div>

          <UserProfileBar
            user={user}
            onLogout={onLogout}
            onOpenLogin={onOpenLogin}
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        <div className="container">
          {/* Khu vực điều hướng tính năng chính: Chơi Online, Chơi với Máy, Bạn Bè */}
          <LobbyNavigation
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            onPlayOnline={onPlayOnline}
            onPlayAi={onPlayAi}
            onOpenFriends={onOpenFriends}
            onCreateRoom={onCreateRoom}
            onJoinByCode={onJoinByCode}
            onlineRoomsCount={onlineRoomsCount}
            onlineFriendsCount={onlineFriendsCount}
          />

          {/* Nội dung danh sách phòng / chế độ chơi được render bên dưới */}
          <div className="lobby-main-body">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
