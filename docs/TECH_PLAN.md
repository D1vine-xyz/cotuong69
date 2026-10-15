# Kế Hoạch Kỹ Thuật — Cờ Tướng Online (QLDACNTT)

> Nguồn yêu cầu chuẩn: **Jira project COT** (5 Epic, 16 Story, 50 Task — đọc ngày 15/10/2026).
> Hai file `.docx` trong `docs/` là bản nháp cũ; chỗ nào mâu thuẫn thì **theo Jira** (khán giả tối đa 10, Bot không có độ khó, không gợi ý nước đi...).

---

## 1. Tech Stack

| Lớp | Lựa chọn | Lý do |
| :--- | :--- | :--- |
| Ngôn ngữ | **TypeScript** toàn bộ (FE + BE + engine) | 1 ngôn ngữ cho 7 người, dùng chung kiểu dữ liệu giữa FE/BE |
| Runtime | **Node.js 22 LTS** | |
| Quản lý repo | **pnpm workspaces** (monorepo) | `apps/*` + `packages/*` |
| Backend HTTP | **Express 5** + cấu trúc module tự quy ước | Nhẹ, ai cũng biết, vào việc ngay |
| Realtime | **Socket.IO 4** | Có sẵn rooms, heartbeat ping/pong, auto-reconnect, ack |
| Database | **PostgreSQL 16** | |
| ORM | **Prisma** | Schema khai báo, migration tự sinh, type-safe |
| Trạng thái live | **RAM của 1 process** + snapshot xuống DB sau mỗi nước đi | Đủ cho đồ án; restart vẫn khôi phục ván từ DB |
| Validation | **Zod** (schema dùng chung FE/BE trong `packages/shared`) | Validate 1 lần, 2 phía khớp nhau |
| Auth | `bcrypt`, `jsonwebtoken`, `google-auth-library`, Facebook Graph API | |
| Email | `nodemailer` (dev dùng **Mailpit** để bắt mail) | |
| Upload avatar | `multer` + kiểm tra magic bytes (`file-type`), lưu disk `uploads/` | ≤ 2MB, JPG/PNG/WebP |
| Rate limit | `express-rate-limit` | Quên mật khẩu: 3 lần/10 phút |
| Logging | `pino` | |
| Frontend | **React 19 + Vite + TS** | |
| Routing | **React Router 7** | |
| State | **Zustand** (session, room, match) + **TanStack Query** (REST) | |
| Form | `react-hook-form` + Zod resolver | |
| Styling | **Tailwind CSS** | |
| Bàn cờ | **Canvas — Konva (`react-konva`)** | Kéo thả chuột + cảm ứng có sẵn, hiệu ứng mượt |
| Âm thanh | `HTMLAudioElement` (hoặc `howler`) | |
| WebRTC | API gốc của trình duyệt (`RTCPeerConnection`), STUN Google, TURN tùy chọn | Signaling đi qua Socket.IO |
| Test | **Vitest** (engine, service, FE), **Supertest** (REST), `socket.io-client` (realtime) | |
| Chất lượng | ESLint + Prettier, `tsc --noEmit` trong CI | |
| Dev env | **Docker Compose**: Postgres + Mailpit | |

> Ghi chú phiên bản: pin version chính xác trong `package.json` ngay lúc khởi tạo project, không dùng `latest`.

---

## 2. Cấu Trúc Monorepo

```
co_tuong_QLDACNTT/
├─ apps/
│  ├─ api/                          # Backend (Express + Socket.IO)
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  ├─ migrations/
│  │  │  └─ seed.ts
│  │  ├─ src/
│  │  │  ├─ server.ts               # tạo http server + gắn Socket.IO
│  │  │  ├─ app.ts                  # Express app, middleware, mount routes
│  │  │  ├─ config/env.ts           # đọc + validate biến môi trường bằng Zod
│  │  │  ├─ common/
│  │  │  │  ├─ errors.ts            # AppError + mã lỗi chuẩn
│  │  │  │  └─ middlewares/         # requireAuth, validate, errorHandler, rateLimit
│  │  │  ├─ lib/                    # prisma.ts, mailer.ts, logger.ts, storage.ts
│  │  │  ├─ realtime/
│  │  │  │  ├─ io.ts                # khởi tạo Socket.IO, đăng ký handler các module
│  │  │  │  ├─ socketAuth.ts        # xác thực JWT ở handshake
│  │  │  │  └─ presence.ts          # userId <-> socketId, Online/Offline
│  │  │  └─ modules/
│  │  │     ├─ auth/                # đăng ký, đăng nhập, refresh, logout, OAuth, quên/đặt lại MK
│  │  │     ├─ users/               # hồ sơ, avatar
│  │  │     ├─ friends/             # kết bạn, tìm kiếm, danh sách + trạng thái online
│  │  │     ├─ rooms/               # RoomManager (in-memory), phân vai, mời, link mời
│  │  │     ├─ match/               # vòng đời ván PvP: nước đi, đồng hồ, autosave, kết thúc, Elo
│  │  │     ├─ pve/                 # ván với máy, Bot
│  │  │     ├─ chat/                # chat riêng 2 người chơi
│  │  │     ├─ call/                # signaling WebRTC
│  │  │     └─ history/             # lịch sử trận
│  │  └─ tests/
│  └─ web/                          # Frontend (React + Vite)
│     └─ src/
│        ├─ app/                    # router.tsx, providers.tsx, ProtectedRoute
│        ├─ pages/                  # auth/, lobby/, room/, pve/, profile/, history/
│        ├─ features/               # auth, rooms, board, match, chat, call, friends
│        ├─ components/ui/          # Button, Modal, Toast, Input...
│        ├─ lib/                    # api.ts (axios + interceptor), socket.ts
│        ├─ stores/                 # Zustand stores
│        └─ assets/                 # quân cờ, âm thanh
├─ packages/
│  ├─ xiangqi/                      # ENGINE LUẬT CỜ — TS thuần, không I/O, test 100%
│  └─ shared/                       # kiểu sự kiện socket, DTO, Zod schema, hằng số
├─ docker-compose.yml               # postgres + mailpit
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ .github/workflows/               # jira-sync.yml (đã có), ci.yml (mới)
└─ docs/
```

**Quy tắc phụ thuộc** (không được vi phạm):

- `packages/xiangqi` không import gì từ project, không đụng DB/socket → test độc lập.
- `packages/shared` chỉ chứa type, Zod schema, hằng số.
- `apps/api` dùng cả hai package. `apps/web` dùng `shared` và chỉ dùng `xiangqi` cho **thế cờ ban đầu / parse snapshot**, tuyệt đối **không** dùng để sinh nước đi (Jira cấm gợi ý nước đi; server quyết định hợp lệ).
- Trong mỗi module BE: `routes → controller → service → (prisma | RoomManager)`. Socket handler gọi **service**, không tự xử lý nghiệp vụ.

---

## 3. Engine Luật Cờ (`packages/xiangqi`)

**Hệ tọa độ chuẩn** (dùng thống nhất FE ↔ BE ↔ DB):

- Cột `a`–`i` = `x` 0..8, hàng `0`–`9` = `y` 0..9. **Đỏ ở dưới (hàng 0–4)**, Đen ở trên (hàng 5–9).
- Nước đi: `{ from: "h2", to: "e2" }`. Xoay bàn cờ chỉ là việc hiển thị phía FE (Đen nhìn từ dưới lên → lật cả x và y khi vẽ).
- Thế cờ lưu dạng chuỗi kiểu FEN để snapshot/khôi phục.

**API công khai:**

```ts
createInitialPosition(): Position
parseFen(fen: string): Position
toFen(pos: Position): string
generateLegalMoves(pos: Position): Move[]          // của bên đang tới lượt
validateMove(pos: Position, move: Move): { ok: true } | { ok: false; reason: MoveError }
applyMove(pos: Position, move: Move): { position: Position; captured?: Piece }
isInCheck(pos: Position, side: Side): boolean
getStatus(pos: Position): 'ONGOING' | 'CHECK' | 'CHECKMATE' | 'NO_LEGAL_MOVES'
```

**Cách cài đặt:** sinh nước *giả hợp lệ* theo từng quân → lọc bỏ nước làm Tướng mình bị chiếu hoặc hai Tướng đối mặt. Một bước lọc này bao luôn các luật "không đi vào ô bị khống chế", "không lộ mặt Tướng" và "phải giải chiếu" (COT-605/606/641).

**`MoveError`** (FE dùng để hiện cảnh báo ở COT-616): `NOT_YOUR_TURN`, `NOT_YOUR_PIECE`, `INVALID_PATTERN`, `BLOCKED` (cản Xe), `HORSE_LEG_BLOCKED`, `ELEPHANT_EYE_BLOCKED`, `ELEPHANT_CROSS_RIVER`, `CANNON_NO_SCREEN`, `OUT_OF_PALACE`, `PAWN_BACKWARD`, `SELF_CHECK`, `FLYING_GENERAL`, `GAME_OVER`.

**Bot** (Epic 5): `pickRandom(generateLegalMoves(pos))`. Nếu danh sách rỗng thì Bot thua. Không có độ khó.

**Test:** unit test cho từng quân và từng tình huống cản; **perft** (đếm số nước ở độ sâu 1–3 từ thế đầu và vài thế mẫu) để bắt lỗi sinh nước.

---

## 4. Thiết Kế Realtime (Socket.IO)

**Kết nối:** client gửi `auth: { token }` ở handshake → `socketAuth` xác thực JWT, gắn `socket.data.userId`. Một user có thể có nhiều socket (nhiều tab).

**Kênh (Socket.IO rooms):**

| Kênh | Thành viên | Dùng cho |
| :--- | :--- | :--- |
| `user:{userId}` | mọi socket của user | lời mời phòng, lời mời kết bạn, thông báo riêng |
| `lobby` | người đang ở sảnh | cập nhật danh sách phòng công khai |
| `room:{code}` | Chủ phòng + Đối thủ + Khán giả | trạng thái phòng, nước đi, chiếu, kết quả |
| `room:{code}:players` | chỉ Chủ phòng + Đối thủ | **chat, video call** (khán giả không bao giờ được join) |

Khi vai trò đổi, server phải `join`/`leave` lại `room:{code}:players` ngay lập tức (COT-625: mất vai trò là mất quyền chat ngay).

**Server là nguồn sự thật:** mọi lệnh client → server dùng **ack** `{ ok, data?, error? }`. Server kiểm tra quyền theo vai trò **trước** mọi xử lý. Khán giả gửi lệnh thi đấu sẽ bị chặn 100%.

**Danh sách sự kiện** (định nghĩa type trong `packages/shared/src/events.ts`):

- Client → Server: `room:join`, `room:leave`, `room:ready`, `room:start`, `room:kick`, `room:demote`, `room:invite`, `room:inviteRespond`, `match:move`, `match:resign`, `match:drawOffer`, `match:drawRespond`, `chat:send`, `call:request`, `call:respond`, `call:signal`, `call:hangup`, `pve:move`, `pve:resign`.
- Server → Client: `room:state`, `lobby:rooms`, `match:started`, `match:moved`, `match:check`, `match:ended`, `match:snapshot`, `match:opponentDisconnected`, `match:opponentReconnected`, `invite:received`, `invite:updated`, `chat:message`, `call:incoming`, `call:signal`, `call:ended`, `presence:changed`.

**Heartbeat và mất kết nối** (COT-593/594/595):

- Cấu hình Socket.IO `pingInterval: 5000`, `pingTimeout: 10000` → phát hiện rớt mạng trong 10–15 giây, đúng yêu cầu Jira.
- `disconnect` khi đang có ván: đánh dấu người chơi mất kết nối, **dừng đồng hồ lượt** (lưu số ms còn lại), hẹn `setTimeout` 60 giây, phát `match:opponentDisconnected` cho cả phòng.
- Kết nối lại trong 60 giây (cùng `userId`): hủy timer, join lại các kênh, gửi `match:snapshot`, chạy tiếp đồng hồ.
- Hết 60 giây: kết thúc ván với lý do `DISCONNECT_TIMEOUT`, tính Elo, phòng về `WAITING_NEXT`.

**Đồng hồ lượt:** server giữ `turnDeadline` (timestamp). Client chỉ hiển thị đếm ngược theo thời điểm server gửi, không tự quyết thắng/thua.

**Chống bấm trùng / idempotency:**

- `room:start`: khóa theo phòng.
- Tạo phòng: client gửi kèm `requestId`.
- `match:move`: kiểm tra `ply` mong đợi; nước đi đã xử lý rồi thì bỏ qua.
- Chốt kết quả: chỉ chạy khi `status = PLAYING` → chốt đúng 1 lần.

**Trạng thái phòng trong RAM (`RoomManager`):**

```ts
Room {
  code: string              // 6 chữ số, duy nhất trong số phòng đang hoạt động
  name: string
  visibility: 'PUBLIC' | 'PRIVATE'
  hostId: string
  opponentId: string | null
  spectators: { userId: string; joinedAt: number }[]   // tối đa 10, theo thứ tự vào
  ready: Set<string>
  kicked: Set<string>
  status: 'WAITING_OPPONENT' | 'FULL' | 'PLAYING' | 'WAITING_NEXT'
  matchId: string | null
  pendingInvite: { toUserId: string; expiresAt: number } | null   // TTL 60s, không giữ chỗ
}
```

Chuyển quyền Chủ phòng: ưu tiên Đối thủ, sau đó Khán giả vào sớm nhất; đồng thời reset `ready` và hủy lời mời đang chờ.

**WebRTC:** P2P 1-1, server chỉ chuyển tiếp SDP/ICE qua `room:{code}:players`. Dùng STUN `stun:stun.l.google.com:19302`. Nếu demo qua mạng 4G/NAT khó thì cần thêm TURN (coturn tự dựng hoặc gói free của dịch vụ TURN). `getUserMedia` **bắt buộc chạy trên HTTPS** (localhost được miễn).

---

## 5. Mô Hình Dữ Liệu (Prisma — bản phác)

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  displayName  String
  email        String   @unique
  passwordHash String?              // null nếu chỉ dùng OAuth
  eloRating    Int      @default(1000)
  avatarUrl    String?
  status       UserStatus @default(ACTIVE)
  role         UserRole   @default(PLAYER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model OAuthIdentity       { id, userId, provider (GOOGLE|FACEBOOK), providerId, @@unique([provider, providerId]) }
model RefreshToken        { id, userId, tokenHash, expiresAt, revokedAt?, createdAt }
model PasswordResetToken  { id, userId, tokenHash, expiresAt, usedAt?, createdAt }
model Friendship          { id, requesterId, addresseeId, status (PENDING|ACCEPTED), createdAt, @@unique([requesterId, addresseeId]) }

model Match {
  id, type (PVP|PVE), status (PLAYING|FINISHED|ABORTED)
  redUserId?, blackUserId?          // null = Máy (PvE)
  currentFen, sideToMove, ply
  turnRemainingMs, inCheck          // snapshot Auto Save sau mỗi nước
  result? (RED_WIN|BLACK_WIN|DRAW), endReason? (CHECKMATE|NO_LEGAL_MOVES|RESIGN|TIMEOUT|DISCONNECT_TIMEOUT|DRAW_AGREED|ABORTED)
  redEloBefore?, redEloAfter?, blackEloBefore?, blackEloAfter?   // chỉ PvP
  startedAt, endedAt?
}

model MatchMove { id, matchId, ply, from, to, piece, captured?, fenAfter, createdAt, @@unique([matchId, ply]) }
```

- **Phòng và chat không lưu DB.** Phòng chỉ tồn tại trong RAM. Jira không yêu cầu lưu lịch sử chat, và người mới vào không được xem tin cũ.
- **Elo** (chỉ PvP, K = 32): `E_a = 1 / (1 + 10^((R_b − R_a)/400))`, `R_a' = round(R_a + 32·(S_a − E_a))`. Ghi kết quả trận và cập nhật Elo **trong cùng 1 transaction**.
- **Hủy ván do sự cố server** (cả hai cùng rớt): `ABORTED`, không đổi Elo (COT-595).

---

## 6. REST API (bản phác)

| Method | Path | Ghi chú |
| :--- | :--- | :--- |
| POST | `/api/auth/register` | Không tự đăng nhập sau khi đăng ký |
| POST | `/api/auth/login` | Trả access token + set cookie refresh token |
| POST | `/api/auth/refresh` | Xoay vòng refresh token |
| POST | `/api/auth/logout` | Thu hồi refresh token |
| POST | `/api/auth/google` · `/api/auth/facebook` | Nhận credential từ FE, xác minh phía server |
| POST | `/api/auth/forgot-password` | Luôn trả thông báo chung; giới hạn 3 lần/10 phút |
| POST | `/api/auth/reset-password` | Token 15 phút, dùng 1 lần; thu hồi mọi phiên cũ |
| GET/PATCH | `/api/users/me` | |
| POST | `/api/users/me/avatar` | multipart, ≤ 2MB |
| GET | `/api/users/search?q=` | Tìm bạn theo username/tên hiển thị |
| GET/POST/PATCH/DELETE | `/api/friends...` | Gửi / chấp nhận / từ chối / hủy lời mời / hủy kết bạn |
| GET | `/api/rooms` | Danh sách phòng công khai (cập nhật realtime qua `lobby`) |
| POST | `/api/rooms` | Tạo phòng |
| GET | `/api/rooms/:code` | Kiểm tra phòng còn hoạt động (dùng cho link mời) |
| POST | `/api/pve` | Tạo ván với máy (chọn Đỏ/Đen) |
| GET | `/api/pve/current` | Ván PvE đang dở (F5 vẫn chơi tiếp) |
| GET | `/api/matches/history` | Lịch sử có phân trang |

Format lỗi thống nhất: `{ "error": { "code": "EMAIL_TAKEN", "message": "..." } }`.

**Phiên đăng nhập:** access token JWT sống 15 phút, giữ **trong bộ nhớ** FE. Refresh token sống 7 ngày, nằm trong **cookie httpOnly**, DB chỉ lưu hash → đăng xuất / đổi mật khẩu thu hồi được (COT-572, 576, 581). Axios interceptor tự gọi `/refresh` khi nhận 401.

---

## 7. Frontend

- **Routes:** `/login`, `/register`, `/forgot-password`, `/reset-password?token=`, `/` (Sảnh chờ), `/profile`, `/friends`, `/room/:code`, `/pve`, `/history`.
- `ProtectedRoute` lưu đường dẫn đích (vd. `/room/123456`) trước khi chuyển sang `/login` → đăng nhập xong quay lại đúng phòng (COT-603).
- **Bàn cờ Konva:**
  - `Stage` co giãn theo container (`ResizeObserver`), các tầng: lưới bàn cờ → quân → hiệu ứng (viền đỏ khi bị chiếu, highlight quân đang chọn).
  - Xoay góc nhìn bằng **hàm đổi tọa độ** `toScreen(x, y, perspective)`, không xoay cả Canvas (để chữ trên quân luôn đứng thẳng).
  - Kéo thả: `draggable` cho quân của mình khi tới lượt. Khi thả, đổi về tọa độ chuẩn, gửi `match:move`, khóa thao tác tới khi có ack. Server từ chối thì tween quân về chỗ cũ và hiện cảnh báo theo `MoveError`.
  - **Không vẽ gợi ý ô đến.**
- **Socket:** một instance `socket.io-client` trong `lib/socket.ts`, kết nối sau khi đăng nhập, cập nhật token khi refresh. Store `match` chỉ thay đổi khi nhận sự kiện từ server.

---

## 8. Quy Trình Làm Việc

- **Branch / commit / PR:** theo `docs/JIRA_GITHUB_AUTOMATION_GUIDE.md` (`feature/COT-xxx-...`, `feat(COT-xxx): ...`).
- **CI mới (`ci.yml`):** chạy trên mọi PR gồm `pnpm install`, `lint`, `typecheck`, `test`. PR chỉ được merge khi CI xanh và có **1 approve**.
- **Định nghĩa giao tiếp trước:** thêm sự kiện socket hoặc API mới thì PR sửa `packages/shared` **trước**, FE và BE mới code song song theo type đó.
- **Phân vùng sở hữu code** (gợi ý `CODEOWNERS`):
  - `packages/xiangqi`, `modules/pve`: Hiệp.
  - `modules/auth|users|friends`: Thành Tài.
  - `modules/rooms|match|chat|call`, `realtime/`: Đức Tài.
  - `apps/web`: chia theo `features/` cho Quan, Hưng, Sang, Trường.
- **Chạy local:**
  ```bash
  docker compose up -d          # Postgres :5432, Mailpit UI :8025
  pnpm install
  pnpm --filter api db:migrate
  pnpm dev                      # api :5000 + web :5173
  ```

---

## 9. Lỗ Hổng Backlog (chưa có task trên Jira)

| # | Hạng mục còn thiếu | Phía | Ghi chú |
| :--- | :--- | :--- | :--- |
| 1 | Khởi tạo monorepo, `shared`, Docker Compose, CI, layout FE + client API/socket | BE + FE | **Phải xong đầu tiên**, mọi task khác phụ thuộc. Chuyển code COT-570 đang ở `backend/` (JS + `pg`) sang `apps/api` (TS + Prisma) |
| 2 | Nhận `match:move` → validate bằng engine → broadcast → Auto Save | BE | **Lõi PvP**, chưa ai được giao |
| 3 | FE nhận `match:moved` / `match:snapshot` và cập nhật bàn cờ cho người chơi + khán giả | FE | COT-616 mới có phần gửi đi |
| 4 | Đồng hồ lượt 60 giây (PvP + PvE) và xử thua khi hết giờ | BE + FE | Epic 5 có nêu, COT-593 có nhắc tạm dừng |
| 5 | Tính Elo K=32 + màn hình kết quả PvP | BE + FE | Mới được nhắc trong COT-595 |
| 6 | Đầu hàng / Cầu hòa cho PvP | BE + FE | Có trong scope Epic 3 |
| 7 | Chức năng bạn bè (tìm, gửi/nhận/từ chối/hủy, Online/Offline) | BE + FE | Thuộc scope Epic 1, COT-590/599 cần nó |
| 8 | Giao diện phòng chờ: ghế, Sẵn sàng, Bắt đầu, kick/hạ Đối thủ, danh sách khán giả | FE | Story 2.3 chỉ có task BE |
| 9 | API + giao diện Lịch sử trận | BE + FE | COT-636 chỉ lưu, chưa có chỗ xem |
| 10 | Deploy HTTPS (bắt buộc cho camera/mic và Facebook OAuth) | DevOps | |

---

## 10. Rủi Ro Lịch & Đề Xuất Thứ Tự

**Vấn đề lịch hiện tại trên Jira:**

- Luật các quân Tướng/Sĩ/Tượng/Mã/Tốt (COT-606/607/612/613) hạn **03–07/11**. Nhưng PvE áp dụng nước đi (COT-634, hạn 01/11), kéo thả FE (COT-616, hạn 03/11) và chiếu/chiếu bí (COT-641/642) đều cần chúng → **dồn hết vào tuần cuối**.
- Story 3.4 hạn 25/10 nhưng 2 task BE của nó hạn 07/11. Nhiều Story có hạn (12/10) sớm hơn task con.
- COT-570 (Schema DB) nằm ở Sp2 trong khi các task Sp1 đều cần nó.

**Đề xuất thứ tự** (engine là đường găng):

| Tuần | BE | FE |
| :--- | :--- | :--- |
| 15–21/10 | Khởi tạo monorepo + CI + Prisma schema; Auth (đăng ký/đăng nhập/JWT/quên MK); **engine: đủ 7 quân + self-check** | Layout, router, client API/socket; màn Auth; bàn cờ Konva tĩnh |
| 22–28/10 | Rooms + phân vai + Ready/Start; `match:move` + Auto Save; chiếu/chiếu bí; OAuth | Sảnh chờ, danh sách phòng, phòng chờ; kéo thả + nhận nước đi |
| 29/10–04/11 | Heartbeat/reconnect/timer; Elo + kết thúc ván; PvE + Bot; chat; bạn bè + mời | Overlay mất kết nối, kết quả trận, PvE, chat, bạn bè |
| 05–08/11 | Video call; lịch sử; sửa lỗi; deploy | Video call UI, hiệu ứng/âm thanh, hồ sơ; test tổng |

**Rủi ro khác:**

- **Facebook OAuth** cần app ở chế độ Live + HTTPS → nếu kẹt thì làm Google trước, Facebook để cuối.
- **WebRTC qua NAT** khi demo → chuẩn bị TURN dự phòng.
- **Một process giữ state trong RAM** → không scale ngang được (chấp nhận được với đồ án). Khi restart, ván đang chơi khôi phục từ snapshot DB, còn phòng chờ sẽ mất.

---

## 11. Câu Hỏi Còn Mở

1. Phòng Riêng tư có **mật khẩu** không? COT-598 ghi "mật khẩu tùy chọn", các task BE không nhắc tới.
2. Đồng hồ **60 giây/lượt** có áp dụng cho PvP không? Jira chỉ nêu rõ cho PvE.
3. Giữ **Facebook OAuth** hay chỉ làm Google (bản docx 7 người đã đề xuất bỏ)?
4. Luật lặp nước (trường chiếu / trường bắt) có nằm trong phạm vi không? Hiện Jira không đề cập → mặc định **không làm**.
