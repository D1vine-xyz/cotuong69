const { roomManager: defaultRoomManager } = require('../../../infrastructure/database/repositories/RoomManager');
const PgUserRepository = require('../../../infrastructure/database/repositories/PgUserRepository');

class JoinRoomByLinkUseCase {
  constructor({
    roomManager = defaultRoomManager,
    userRepository = new PgUserRepository(),
  } = {}) {
    this.roomManager = roomManager;
    this.userRepository = userRepository;
  }

  async execute(userId, code, { baseUrl = '' } = {}) {
    if (!userId) {
      const err = new Error('Yêu cầu đăng nhập để tham gia phòng.');
      err.code = 'UNAUTHORIZED';
      err.statusCode = 401;
      throw err;
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      const err = new Error('Mã phòng không hợp lệ.');
      err.code = 'INVALID_ROOM_CODE';
      err.statusCode = 400;
      throw err;
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error('Người dùng không tồn tại.');
      err.code = 'USER_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const result = this.roomManager.joinRoom(code.trim(), user);

    return {
      success: true,
      role: result.role, // 'PLAYER' | 'SPECTATOR'
      side: result.side, // 'RED' | 'BLACK' | null
      isNew: result.isNew,
      room: result.room,
      inviteLink: `${baseUrl}/room/${code.trim().toUpperCase()}`,
      canMove: result.role === 'PLAYER',
    };
  }
}

module.exports = JoinRoomByLinkUseCase;
