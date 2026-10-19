import React, { useState } from 'react';
import GameModeCard from './GameModeCard';

/**
 * COT-584: Khu vực điều hướng chính Sảnh chờ
 * Bao gồm:
 * - 3 Khối tính năng: Chơi Online, Chơi với Máy (PvE), Danh sách Bạn bè
 * - Nút Tạo Room và Ô nhập mã phòng nhanh
 */
export default function LobbyNavigation({
  activeTab = 'online',
  onSelectTab,
  onPlayOnline,
  onPlayAi,
  onOpenFriends,
  onCreateRoom,
  onJoinByCode,
  onlineRoomsCount = 0,
  onlineFriendsCount = 0
}) {
  const [roomCode, setRoomCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const cleanCode = roomCode.trim();
    if (!cleanCode) {
      setCodeError('Vui lòng nhập mã phòng 6 chữ số.');
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setCodeError('Mã phòng phải gồm đúng 6 chữ số (ví dụ: 102938).');
      return;
    }
    setCodeError('');
    onJoinByCode?.(cleanCode);
  };

  return (
    <section className="lobby-navigation-section" aria-label="Điều hướng tính năng Sảnh chờ">
      {/* 3 Khối tính năng chính */}
      <div className="lobby-mode-cards-grid">
        <GameModeCard
          id="navPlayOnlineCard"
          icon="🌐"
          title="Chơi Online"
          tag="Nhiều người chơi"
          badge={onlineRoomsCount > 0 ? `${onlineRoomsCount} phòng` : null}
          description="Thi đấu cờ Tướng trực tuyến với các kỳ thủ khác qua phòng chơi công khai hoặc riêng tư."
          active={activeTab === 'online'}
          accentColor="gold"
          onClick={() => {
            onSelectTab?.('online');
            onPlayOnline?.();
          }}
        />

        <GameModeCard
          id="navPlayAiCard"
          icon="🤖"
          title="Chơi Với Máy"
          tag="PvE Không Tính Elo"
          description="Luyện tập kỳ nghệ đối đầu AI cờ Tướng thông minh, lựa chọn phe Đỏ/Đen đi trước."
          active={activeTab === 'ai'}
          accentColor="red"
          onClick={() => {
            onSelectTab?.('ai');
            onPlayAi?.();
          }}
        />

        <GameModeCard
          id="navFriendsCard"
          icon="👥"
          title="Danh Sách Bạn Bè"
          tag="Giao hữu"
          badge={onlineFriendsCount > 0 ? `${onlineFriendsCount} online` : null}
          description="Xem danh sách bạn bè đang trực tuyến, kết nối và gửi lời mời giao lưu thi đấu nhanh."
          active={activeTab === 'friends'}
          accentColor="blue"
          onClick={() => {
            onSelectTab?.('friends');
            onOpenFriends?.();
          }}
        />
      </div>

      {/* Thanh tác vụ nhanh: Tạo phòng & Nhập mã phòng 6 số */}
      <div className="lobby-quick-actions-bar">
        <div className="join-code-box">
          <form id="lobbyJoinCodeForm" className="lobby-join-form" onSubmit={handleJoinSubmit} noValidate>
            <div className="input-group">
              <span className="input-icon">🔑</span>
              <input
                type="text"
                id="lobbyRoomCodeInput"
                name="roomCode"
                maxLength={6}
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.replace(/\D/g, ''));
                  if (codeError) setCodeError('');
                }}
                placeholder="Nhập mã phòng 6 số (vd: 102938)"
                autoComplete="off"
                inputMode="numeric"
              />
              <button type="submit" id="lobbyJoinBtn" className="btn btn-primary">
                <span>Vào Phòng</span>
                <span className="arrow">→</span>
              </button>
            </div>
            {codeError && (
              <div id="lobbyCodeError" className="input-error-msg" role="alert">
                {codeError}
              </div>
            )}
          </form>
        </div>

        <div className="create-room-action-box">
          <button
            type="button"
            id="lobbyCreateRoomBtn"
            className="btn btn-gold btn-create-room"
            onClick={onCreateRoom}
          >
            <span className="btn-icon">+</span>
            <span>Tạo Phòng Mới</span>
          </button>
        </div>
      </div>
    </section>
  );
}
