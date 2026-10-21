const crypto = require('node:crypto');
const Room = require('../../../domain/entities/Room');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> Room
  }

  generateCode() {
    let code;
    do {
      code = crypto.randomInt(100000, 1000000).toString(); // Đảm bảo đúng 6 chữ số ngẫu nhiên [100000-999999]
    } while (this.rooms.has(code));
    return code;
  }

  createRoom({ hostUser, name, isPrivate = false, maxSpectators = 10 }) {
    if (!hostUser || !hostUser.id) {
      const err = new Error('Yêu cầu tài khoản hợp lệ để tạo phòng.');
      err.code = 'UNAUTHORIZED';
      err.statusCode = 401;
      throw err;
    }

    const code = this.generateCode();
    const room = new Room({
      code,
      name: name && name.trim() ? name.trim() : `Phòng cờ của ${hostUser.displayName || hostUser.username}`,
      hostId: hostUser.id,
      hostUser,
      isPrivate: Boolean(isPrivate),
      maxSpectators,
    });

    this.rooms.set(code, room);
    return room;
  }

  findByCode(code) {
    if (!code) return null;
    const cleanCode = code.toString().toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room || room.status === 'CLOSED') return null;
    return room;
  }

  joinRoom(code, user) {
    const room = this.findByCode(code);
    if (!room) {
      const err = new Error(`Không tìm thấy phòng cờ với mã '${code}'.`);
      err.code = 'ROOM_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    return room.addParticipant(user);
  }

  listPublicRooms() {
    const result = [];
    for (const room of this.rooms.values()) {
      if (!room.isPrivate && room.status !== 'CLOSED') {
        result.push(room.getSummary());
      }
    }
    return result;
  }

  closeRoom(code, userId) {
    if (!code) return false;
    const cleanCode = code.toString().toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (!room) return false;
    if (userId !== undefined && room.hostId !== null && Number(room.hostId) !== Number(userId)) {
      const err = new Error('Chỉ chủ phòng mới có quyền đóng phòng.');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }
    room.status = 'CLOSED';
    this.rooms.delete(cleanCode);
    return true;
  }

  clear() {
    this.rooms.clear();
  }
}

// Singleton mặc định cho server
const defaultRoomManager = new RoomManager();

module.exports = {
  RoomManager,
  roomManager: defaultRoomManager,
};
