const { roomManager: defaultRoomManager } = require('../../../infrastructure/database/repositories/RoomManager');
const PgUserRepository = require('../../../infrastructure/database/repositories/PgUserRepository');

class CreateRoomUseCase {
  constructor({
    roomManager = defaultRoomManager,
    userRepository = new PgUserRepository(),
  } = {}) {
    this.roomManager = roomManager;
    this.userRepository = userRepository;
  }

  async execute(userId, { name, isPrivate = false, maxSpectators = 10, baseUrl = '' } = {}) {
    if (!userId) {
      const err = new Error('Yêu cầu đăng nhập để tạo phòng.');
      err.code = 'UNAUTHORIZED';
      err.statusCode = 401;
      throw err;
    }

    const hostUser = await this.userRepository.findById(userId);
    if (!hostUser) {
      const err = new Error('Người dùng không tồn tại.');
      err.code = 'USER_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const room = this.roomManager.createRoom({
      hostUser,
      name,
      isPrivate,
      maxSpectators,
    });

    return {
      success: true,
      message: 'Tạo phòng cờ thành công.',
      room: room.getSummary(baseUrl),
      inviteLink: room.getDeepLink(baseUrl),
    };
  }
}

module.exports = CreateRoomUseCase;
