const { directInvitationManager: defaultInvitationManager } = require('../../../infrastructure/database/repositories/DirectInvitationManager');
const { roomManager: defaultRoomManager } = require('../../../infrastructure/database/repositories/RoomManager');
const PgUserRepository = require('../../../infrastructure/database/repositories/PgUserRepository');

class RespondDirectInvitationUseCase {
  constructor({
    invitationManager = defaultInvitationManager,
    roomManager = defaultRoomManager,
    userRepository = new PgUserRepository(),
  } = {}) {
    this.invitationManager = invitationManager;
    this.roomManager = roomManager;
    this.userRepository = userRepository;
  }

  async execute(userId, invitationId, { action }) {
    if (!userId) {
      const err = new Error('Yêu cầu đăng nhập.');
      err.code = 'UNAUTHORIZED';
      err.statusCode = 401;
      throw err;
    }

    const updatedInv = this.invitationManager.respond(invitationId, userId, action);

    let joinResult = null;
    // Nếu đồng ý tham gia: Thực hiện vào phòng (không giữ chỗ trước)
    if (updatedInv.status === 'ACCEPTED') {
      const user = await this.userRepository.findById(userId);
      const room = this.roomManager.findByCode(updatedInv.roomCode);
      if (!room || room.status === 'CLOSED' || room.status === 'FINISHED') {
        const err = new Error('Phòng cờ đã kết thúc hoặc không còn khả dụng.');
        err.code = 'ROOM_CLOSED';
        err.statusCode = 410;
        throw err;
      }

      // Vào phòng: nếu người khác vào trước thì tự động gán khán giả hoặc thông báo
      joinResult = room.addParticipant(user);
    }

    return {
      success: true,
      invitation: updatedInv,
      joinResult,
      message: updatedInv.status === 'ACCEPTED' ? 'Đã chấp nhận lời mời và tham gia phòng.' : 'Đã từ chối lời mời.',
    };
  }
}

module.exports = RespondDirectInvitationUseCase;
