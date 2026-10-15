# KIẾN TRÚC CLEAN ARCHITECTURE - FRONTEND (REACT + VITE)

Dự án Frontend được xây dựng bằng **React (SPA)** theo chuẩn **Clean Architecture**, phân tách độc lập giữa giao diện người dùng (UI), logic nghiệp vụ (Use Cases), mô hình miền (Domain Entities) và các dịch vụ bên ngoài (API, WebSocket, WebRTC).

---

## 🏛️ Sơ Đồ Cấu Trúc Thư Mục Frontend

```text
frontend/src/
├── core/                               # Cấu hình chung, constants, helpers
│   ├── config/                         # env config, API base URL, WebSocket URL
│   ├── constants/                      # BoardCoordinates, PieceTypes, SocketEvents, SoundKeys
│   └── utils/                          # FormatElo, DateTime, SoundPlayer
│
├── domain/                             # [TẦNG 1] DOMAIN: Nghiệp vụ cốt lõi & Luật cờ
│   ├── entities/                       # User, Room, Match, Move, Piece, Board, Friend, Message
│   ├── value-objects/                  # GameStatus, PlayerColor, Coordinate, Timer, RoomRole
│   └── repositories/                   # Giao diện: IAuthRepository, IRoomRepository, IGameGateway, IFriendRepository
│
├── application/                        # [TẦNG 2] APPLICATION: Use Cases & Custom Hooks kết nối UI
│   ├── use-cases/
│   │   ├── auth/                       # LoginUseCase, RegisterUseCase, ResetPasswordUseCase
│   │   ├── room/                       # CreateRoomUseCase, JoinRoomByLinkUseCase, LeaveRoomUseCase
│   │   ├── game/                       # MakeMoveUseCase, CalculateLegalMovesUseCase, SurrenderUseCase
│   │   └── friends/                    # InviteFriendUseCase, AcceptInviteUseCase
│   └── hooks/                          # useAuth, useGame, useLobby, useFriends, useSocket, useWebRTC
│
├── infrastructure/                     # [TẦNG 3] INFRASTRUCTURE: Hiện thực hóa kỹ thuật & Driver ngoài
│   ├── api/                            # Gọi REST API (Fetch/Axios): AuthApi, UserApi, RoomApi, FriendApi
│   ├── realtime/                       # SocketClient (WebSocket/Socket.io), WebRtcClient (Video Call)
│   ├── storage/                        # LocalStorageService (Token, Session)
│   └── sound/                          # Trình phát âm thanh nước cờ, ăn quân, chiếu tướng
│
└── presentation/                       # [TẦNG 4] PRESENTATION: Giao diện React
    ├── components/                     # UI Components chia theo tính năng
    │   ├── common/                     # Button, Input, Modal, Toast, Avatar, Badge, Spinner
    │   ├── board/                      # ChessBoard, PieceView, BoardCoordinates, MoveHistory
    │   ├── room/                       # RoomCard, PlayerSlot, SpectatorList, InviteModal
    │   ├── lobby/                      # RoomList, UserProfileBar, GameModeSelector
    │   └── chat/                       # ChatBox, MessageItem, EmojiPicker
    ├── layouts/                        # MainLayout, GameLayout, AuthLayout
    ├── pages/                          # LoginPage, RegisterPage, ForgotPasswordPage, LobbyPage, RoomPage, GamePage, ProfilePage
    ├── contexts/                       # AuthContext, SocketContext, NotificationContext
    └── routes/                         # AppRoutes, ProtectedRoute (chặn truy cập khi chưa đăng nhập)
```

---

## 💡 Ưu Điểm Khi Áp Dụng Clean Architecture Cho Frontend
1. **Dễ Kiểm Thử (Testability)**: Thuật toán kiểm tra nước đi hợp lệ của Tướng/Mã/Pháo (Domain) có thể test độc lập 100% bằng Jest/Node mà không cần render UI React.
2. **Độc Lập UI Framework**: Nếu sau này đổi thư viện UI (từ CSS thuần sang Tailwind hoặc chuyển sang React Native), toàn bộ logic Use Cases và Domain được giữ nguyên 100%.
3. **Phân Công Song Song (Nhóm 7 người)**:
   - Thành viên làm giao diện (FE UI) tập trung ở `presentation/components` và `presentation/pages`.
   - Thành viên làm luật cờ/realtime tập trung ở `domain/entities` và `application/use-cases/game`.
