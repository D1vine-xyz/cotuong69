/**
 * Kỳ Đạo Online - Room API Service (COT-597)
 * Xử lý giao tiếp API phòng chơi, kiểm tra mã phòng và đồng bộ thời gian thực.
 */

const ROOM_STATUS = {
  WAITING_OPPONENT: {
    key: 'WAITING_OPPONENT',
    label: 'Đang chờ đối thủ',
    className: 'status-waiting',
    icon: '⏳'
  },
  FULL_PLAYERS: {
    key: 'FULL_PLAYERS',
    label: 'Đã đủ hai người',
    className: 'status-full',
    icon: '👥'
  },
  PLAYING: {
    key: 'PLAYING',
    label: 'Đang diễn ra',
    className: 'status-playing',
    icon: '⚔️'
  },
  WAITING_NEW_GAME: {
    key: 'WAITING_NEW_GAME',
    label: 'Chờ ván mới',
    className: 'status-rematch',
    icon: '🔄'
  },
  CLOSED: {
    key: 'CLOSED',
    label: 'Đã đóng',
    className: 'status-closed',
    icon: '🚫'
  }
};

// Dữ liệu mock ban đầu mô phỏng danh sách Public Rooms từ Backend
const INITIAL_PUBLIC_ROOMS = [
  {
    id: 1,
    code: '102938',
    name: 'Kỳ Viện Thăng Long - Đấu tập giao hữu',
    hostName: 'Trần Đại Nghĩa',
    hostAvatar: '陳',
    hostElo: 1350,
    status: 'WAITING_OPPONENT',
    isPublic: true,
    playerCount: 1,
    maxPlayers: 2,
    spectatorCount: 0,
    timeLimit: '15 phút + 10s',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    code: '654321',
    name: 'Quán Thư Họa - Thuận Pháo đối Bình Phong Mã',
    hostName: 'Lê Văn Tám',
    hostAvatar: '黎',
    hostElo: 1420,
    status: 'FULL_PLAYERS',
    isPublic: true,
    playerCount: 2,
    maxPlayers: 2,
    spectatorCount: 1,
    timeLimit: '20 phút',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    code: '789102',
    name: 'Giải Đấu Mùa Thu - Chung kết Bảng A',
    hostName: 'Nguyễn Tấn Sang',
    hostAvatar: '桑',
    hostElo: 1510,
    status: 'PLAYING',
    isPublic: true,
    playerCount: 2,
    maxPlayers: 2,
    spectatorCount: 5,
    timeLimit: '25 phút + 30s',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    code: '456789',
    name: 'Bàn Đấu Tái Hiện Ván Cờ Thế',
    hostName: 'Phạm Hồng Thái',
    hostAvatar: '范',
    hostElo: 1200,
    status: 'WAITING_NEW_GAME',
    isPublic: true,
    playerCount: 2,
    maxPlayers: 2,
    spectatorCount: 2,
    timeLimit: '10 phút',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    code: '334455',
    name: 'Giao Lưu Cao Thủ Cờ Tướng Sài Gòn',
    hostName: 'Vũ Trọng Phụng',
    hostAvatar: '武',
    hostElo: 1600,
    status: 'WAITING_OPPONENT',
    isPublic: true,
    playerCount: 1,
    maxPlayers: 2,
    spectatorCount: 0,
    timeLimit: '15 phút',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  }
];

class RoomApiService {
  constructor() {
    this.baseUrl = '/api/rooms';
    // Sử dụng in-memory mock store
    this.roomsStore = JSON.parse(JSON.stringify(INITIAL_PUBLIC_ROOMS));
    this.realtimeListeners = [];
    // Thông tin người dùng hiện tại (mặc định đã đăng nhập theo session)
    this.currentUser = {
      id: 'user-sang-01',
      username: 'nguyen_tan_sang',
      displayName: 'Nguyễn Tấn Sang',
      elo: 1250,
      isLoggedIn: true
    };
  }

  /**
   * Lấy thông tin người dùng đang đăng nhập
   */
  getCurrentUser() {
    return this.currentUser && this.currentUser.isLoggedIn ? this.currentUser : null;
  }

  /**
   * Thiết lập thông tin người dùng (cho việc test / mock session)
   */
  setCurrentUser(user) {
    this.currentUser = user;
  }

  /**
   * Tạo phòng chơi mới (Công khai hoặc Riêng tư) - COT-598
   * Tiêu chí chấp nhận 1: Form có Tên Room và lựa chọn Công khai/Riêng tư.
   * Tiêu chí chấp nhận 2: Không gửi request nếu Tên Room để trống hoặc không hợp lệ.
   * Tiêu chí chấp nhận 3: Không tạo nhiều phòng do bấm liên tục.
   * Tiêu chí chấp nhận 4: Tạo thành công đưa người dùng vào phòng với vai trò Chủ phòng.
   */
  async createRoom({ name, isPrivate = false, password = null, maxSpectators = 10 } = {}) {
    // 1. Chỉ cho phép người dùng đã đăng nhập tạo phòng
    const user = this.getCurrentUser();
    if (!user) {
      const err = new Error('Yêu cầu đăng nhập để tạo phòng.');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // 2. Kiểm tra Tên Room (bắt buộc, không để trống, kiểm tra độ dài 3-50 ký tự)
    if (name === undefined || name === null || typeof name !== 'string') {
      const err = new Error('Tên phòng không được để trống.');
      err.code = 'INVALID_NAME';
      throw err;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      const err = new Error('Tên phòng không được để trống.');
      err.code = 'INVALID_NAME';
      throw err;
    }

    if (trimmedName.length < 3 || trimmedName.length > 50) {
      const err = new Error('Tên phòng phải có độ dài từ 3 đến 50 ký tự.');
      err.code = 'INVALID_NAME_LENGTH';
      throw err;
    }

    // 3. Sinh mã phòng 6 chữ số duy nhất
    let code;
    let attempts = 0;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
    } while (this.roomsStore.some(r => r.code === code) && attempts < 100);

    const isPublic = !Boolean(isPrivate);
    const newRoom = {
      code,
      name: trimmedName,
      hostId: user.id || 'user-host',
      hostName: user.displayName || user.username || 'Chủ phòng',
      hostElo: user.elo || 1200,
      opponentId: null,
      opponentName: null,
      status: 'WAITING_OPPONENT',
      playerCount: 1,
      maxPlayers: 2,
      spectatorCount: 0,
      maxSpectators,
      timeControl: '15m + 10s',
      isPublic,
      isPrivate: Boolean(isPrivate),
      password: password && String(password).trim() ? String(password).trim() : null,
      createdAt: new Date().toISOString()
    };

    this.roomsStore.unshift(newRoom);

    // Phát sự kiện realtime cho sảnh chờ nếu là phòng công khai
    if (isPublic) {
      const eventPayload = {
        type: 'ROOM_CREATED',
        room: newRoom,
        roomCode: code
      };
      this.realtimeListeners.forEach(listener => {
        try { listener(eventPayload); } catch (e) { console.error(e); }
      });
    }

    return {
      success: true,
      message: 'Tạo phòng cờ thành công.',
      room: newRoom,
      role: 'HOST',
      roleMessage: 'Bạn là Chủ phòng! Vị trí Đối thủ đang trống, hãy mời kỳ thủ vào thi đấu.'
    };
  }

  /**
   * Lấy danh sách các Room Công khai (Public Rooms)
   * Tiêu chí chấp nhận 1: Danh sách hiển thị đúng các Room Public và trạng thái.
   * Lọc bỏ room đã đóng (CLOSED).
   */
  async getPublicRooms() {
    try {
      // Giả lập độ trễ mạng nhẹ nếu cần
      return this.roomsStore.filter(room => room.isPublic && room.status !== 'CLOSED');
    } catch (error) {
      console.error('Lỗi khi tải danh sách phòng:', error);
      throw new Error('Không thể tải danh sách phòng từ máy chủ.');
    }
  }

  /**
   * Tham gia phòng bằng mã 6 chữ số
   * Tiêu chí chấp nhận 3: Nhập đúng mã 6 số tham gia phòng thành công.
   * Tiêu chí chấp nhận 4: Hiển thị lỗi rõ ràng khi phòng không tồn tại hoặc đã đóng.
   * @param {string} roomCode - Mã phòng 6 ký tự số
   */
  async joinRoomByCode(roomCode) {
    if (!roomCode || typeof roomCode !== 'string') {
      throw new Error('Mã phòng không được để trống.');
    }

    const trimmedCode = roomCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      throw new Error('Mã phòng phải bao gồm đúng 6 chữ số (0-9).');
    }

    // Tìm phòng trong store
    const room = this.roomsStore.find(r => r.code === trimmedCode);

    if (!room) {
      throw new Error(`Phòng mang mã [${trimmedCode}] không tồn tại trên hệ thống.`);
    }

    if (room.status === 'CLOSED') {
      throw new Error(`Phòng [${trimmedCode}] đã đóng hoặc đã bị hủy.`);
    }

    // Phân vai trò dựa theo trạng thái phòng
    let assignedRole = 'PLAYER';
    let roleMessage = 'Bạn được phân vào ghế Người Chơi 2 để thi đấu!';

    if (room.status === 'WAITING_OPPONENT') {
      assignedRole = 'PLAYER';
      roleMessage = 'Bạn đã sẵn sàng ở vị trí Người Chơi 2!';
    } else if (['FULL_PLAYERS', 'PLAYING', 'WAITING_NEW_GAME'].includes(room.status)) {
      assignedRole = 'SPECTATOR';
      roleMessage = 'Phòng đã đủ 2 kỳ thủ. Bạn tham gia với vai trò Khán Giả theo dõi!';
    }

    return {
      success: true,
      room,
      role: assignedRole,
      roleMessage
    };
  }

  /**
   * Đăng ký callback khi trạng thái phòng thay đổi theo thời gian thực
   * Tiêu chí chấp nhận 2: Khi trạng thái thay đổi, giao diện cập nhật theo Backend.
   */
  onRealtimeUpdate(callback) {
    if (typeof callback === 'function') {
      this.realtimeListeners.push(callback);
    }
  }

  /**
   * Giả lập sự kiện Backend phát tín hiệu đổi trạng thái phòng (Realtime Event)
   * Dùng cho test và demonstration
   */
  emitRoomStateChange(roomCode, newStatus, additionalData = {}) {
    const roomIndex = this.roomsStore.findIndex(r => r.code === roomCode);
    if (roomIndex !== -1) {
      this.roomsStore[roomIndex].status = newStatus;
      Object.assign(this.roomsStore[roomIndex], additionalData);

      const eventPayload = {
        type: newStatus === 'CLOSED' ? 'ROOM_CLOSED' : 'ROOM_UPDATED',
        room: this.roomsStore[roomIndex],
        roomCode
      };

      this.realtimeListeners.forEach(listener => listener(eventPayload));
    }
  }
}

// Xuất service cho browser hoặc Node.js test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RoomApiService, ROOM_STATUS, INITIAL_PUBLIC_ROOMS };
} else {
  window.RoomApiService = RoomApiService;
  window.ROOM_STATUS = ROOM_STATUS;
}
