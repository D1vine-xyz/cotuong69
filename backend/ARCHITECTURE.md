# KIẾN TRÚC CLEAN ARCHITECTURE - BACKEND CỜ TƯỚNG ONLINE & MẠNG XÃ HỘI

Hệ thống Backend được thiết kế theo chuẩn **Clean Architecture**, tách biệt rõ ràng các mối quan tâm (Separation of Concerns), độc lập với framework, cơ sở dữ liệu và giao diện.

---

## 🏛️ Sơ Đồ Cấu Trúc Thư Mục

```text
backend/src/
├── core/                               # Tiện ích chung, mã lỗi hệ thống
│   └── errors/                         # AppError, ValidationError, NotFoundError...
│
├── domain/                             # TẦNG 1: DOMAIN (Nghiệp vụ cốt lõi, không phụ thuộc ngoài)
│   ├── entities/                       # Thực thể: User, Room, Match, Move, Friend, OTP, Role...
│   ├── value-objects/                  # Đối tượng giá trị: EloRating, RoomRole, MoveCoordinate...
│   └── repositories/                   # Interfaces: IUserRepository, IRoomRepository, IFriendRepository...
│
├── application/                        # TẦNG 2: APPLICATION (Use Cases & Điều phối nghiệp vụ)
│   ├── use-cases/
│   │   ├── auth/                       # Đăng ký (Bcrypt), Đăng nhập (JWT), OAuth2, Quên mật khẩu...
│   │   ├── user/                       # Hồ sơ cá nhân, Đổi tên hiển thị, Upload Avatar...
│   │   ├── friends/                    # Kết bạn, Bạn bè Online, Mời bạn bè (TTL 60s)...
│   │   ├── room/                       # Tạo phòng, Vào phòng qua Deep link, Phân vai trò Khán giả/Đối thủ...
│   │   └── game/                       # Đi quân cờ, Thẩm định nước đi, Chiếu/Bí, Tính điểm Elo...
│   └── ports/                          # Interfaces dịch vụ: ITokenService, IHasher, IEmailService, ISocketNotifier
│
├── infrastructure/                     # TẦNG 3: INFRASTRUCTURE (Hiện thực hóa & Thư viện bên ngoài)
│   ├── database/                       # Kết nối CSDL, Migration, Seed & Repository Implementations
│   │   └── repositories/               # PgUserRepository, PgRoomRepository, PgFriendRepository...
│   ├── security/                       # BcryptHasher, JwtTokenService
│   ├── realtime/                       # WebSocket Server (đồng bộ bàn cờ, thông báo realtime)
│   ├── mailer/                         # Dịch vụ gửi Email (OTP, Reset link)
│   └── oauth/                          # Tích hợp Google & Facebook OAuth2
│
└── presentation/                       # TẦNG 4: PRESENTATION (Giao tiếp bên ngoài / Adapters)
    ├── http/
    │   ├── controllers/                # AuthController, UserController, RoomController, FriendController...
    │   ├── routes/                     # auth.routes.js, user.routes.js, room.routes.js...
    │   └── middlewares/                # auth.middleware.js, validate.middleware.js, error.middleware.js
    └── websocket/
        ├── handlers/                   # game.handler.js, room.handler.js, chat.handler.js
        └── middlewares/                # socketAuth.middleware.js
```

---

## 🔄 Luồng Hoạt Động Của Một Request (Ví dụ: Đăng Ký Tài Khoản COT-571)
1. **Client** gửi `POST /api/auth/register` (Username, Email, Password).
2. **Presentation (`auth.routes.js` ➔ `AuthController`)**: Tiếp nhận request, gọi middleware kiểm tra định dạng đầu vào.
3. **Application (`RegisterUseCase`)**: 
   - Kiểm tra trùng lặp email/username qua `IUserRepository`.
   - Băm mật khẩu qua `IHasher` (Bcrypt).
   - Khởi tạo Entity `User` với `EloRating = 1000`.
   - Lưu vào CSDL qua `IUserRepository.create()`.
4. **Infrastructure (`PgUserRepository`)**: Thực thi câu lệnh SQL INSERT vào PostgreSQL.
5. **Presentation (`AuthController`)**: Trả mã HTTP `201 Created` về cho Client.

---

## Match API và nước đi realtime cho COT-615 / COT-616

Chạy `npm start` để khởi động HTTP/WebSocket server tại cổng 5000 (có thể đổi bằng biến môi trường `PORT`). `GET /api/matches/COT-615` trả Match hiện tại. Kết nối `ws(s)://<host>/api/matches/COT-615/ws` nhận vai trò, snapshot và đồng hồ mỗi giây; client gửi `{ "type": "move", "from": "e3", "to": "e4" }`. Server xác thực bên được cấp, lượt, tọa độ, luật của từng quân, nước chiếu và trạng thái Tướng trước khi cập nhật; nước sai trả lỗi mà không đổi bàn cờ, lượt hoặc mốc đồng hồ.

Đây vẫn là Match mẫu trong bộ nhớ, khởi tạo khi request đầu tiên tới sau khi server khởi động; đồng hồ mỗi bên là 2 phút và Match reset khi server restart. Hai kết nối đầu tiên được cấp lần lượt Đỏ/Đen; kết nối khác là khán giả. Việc cấp phe này không xác thực người dùng, chưa nối vào room lifecycle hoặc database, nên chỉ dùng cho phát triển/kiểm thử, không dùng làm backend production.
