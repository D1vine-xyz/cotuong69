class Room {
  constructor({
    code,
    name,
    hostId,
    hostUser,
    isPrivate = false,
    maxSpectators = 10,
    status = 'WAITING',
    createdAt = new Date(),
  }) {
    this.code = code.toUpperCase();
    this.name = name || `Phòng cờ #${this.code}`;
    this.hostId = Number(hostId);
    this.isPrivate = Boolean(isPrivate);
    this.maxSpectators = Number(maxSpectators);
    this.status = status; // WAITING, PLAYING, FINISHED, CLOSED
    this.createdAt = createdAt;

    // Người chơi: Red (Host mặc định là Red) và Black
    this.players = {
      red: hostUser ? { id: Number(hostUser.id), username: hostUser.username, displayName: hostUser.displayName, eloRating: hostUser.eloRating, avatarUrl: hostUser.avatarUrl } : null,
      black: null,
    };

    // Khán giả: tối đa 10 người
    this.spectators = [];
  }

  getDeepLink(baseUrl = '') {
    return `${baseUrl}/room/${this.code}`;
  }

  getParticipantRole(userId) {
    const uid = Number(userId);
    if (this.players.red && this.players.red.id === uid) {
      return { role: 'PLAYER', side: 'RED' };
    }
    if (this.players.black && this.players.black.id === uid) {
      return { role: 'PLAYER', side: 'BLACK' };
    }
    const isSpectator = this.spectators.some((s) => s.id === uid);
    if (isSpectator) {
      return { role: 'SPECTATOR', side: null };
    }
    return null;
  }

  canMove(userId) {
    const roleInfo = this.getParticipantRole(userId);
    return roleInfo !== null && roleInfo.role === 'PLAYER';
  }

  addParticipant(user) {
    if (!user || !user.id) {
      const err = new Error('Thông tin người dùng không hợp lệ.');
      err.code = 'INVALID_USER';
      err.statusCode = 400;
      throw err;
    }

    if (this.status === 'CLOSED' || this.status === 'FINISHED') {
      const err = new Error('Phòng cờ đã kết thúc hoặc bị đóng.');
      err.code = 'ROOM_CLOSED';
      err.statusCode = 410;
      throw err;
    }

    const uid = Number(user.id);
    const existingRole = this.getParticipantRole(uid);
    if (existingRole) {
      return {
        ...existingRole,
        isNew: false,
        room: this.getSummary(),
      };
    }

    const userData = {
      id: uid,
      username: user.username,
      displayName: user.displayName || user.username,
      eloRating: user.eloRating ?? 1000,
      avatarUrl: user.avatarUrl || null,
    };

    // 1. Phân vai trò người chơi nếu còn chỗ trống (ưu tiên RED rồi đến BLACK)
    if (!this.players.red) {
      this.players.red = userData;
      return {
        role: 'PLAYER',
        side: 'RED',
        isNew: true,
        room: this.getSummary(),
      };
    }

    if (!this.players.black) {
      this.players.black = userData;
      // Khi đã đủ 2 người, chuyển trạng thái sẵn sàng
      return {
        role: 'PLAYER',
        side: 'BLACK',
        isNew: true,
        room: this.getSummary(),
      };
    }

    // 2. Nếu đã đủ 2 người chơi -> Gán vai trò Khán giả (Spectator)
    if (this.spectators.length >= this.maxSpectators) {
      const err = new Error(`Phòng cờ đã đạt giới hạn tối đa ${this.maxSpectators} khán giả.`);
      err.code = 'ROOM_FULL';
      err.statusCode = 409;
      throw err;
    }

    this.spectators.push({
      ...userData,
      joinedAt: new Date(),
    });

    return {
      role: 'SPECTATOR',
      side: null,
      isNew: true,
      room: this.getSummary(),
    };
  }

  removeParticipant(userId) {
    const uid = Number(userId);
    if (this.players.red && this.players.red.id === uid) {
      this.players.red = null;
    } else if (this.players.black && this.players.black.id === uid) {
      this.players.black = null;
    } else {
      this.spectators = this.spectators.filter((s) => s.id !== uid);
    }
  }

  getSummary(baseUrl = '') {
    return {
      code: this.code,
      name: this.name,
      hostId: this.hostId,
      status: this.status,
      isPrivate: this.isPrivate,
      deepLink: this.getDeepLink(baseUrl),
      players: {
        red: this.players.red,
        black: this.players.black,
      },
      playerCount: (this.players.red ? 1 : 0) + (this.players.black ? 1 : 0),
      spectatorCount: this.spectators.length,
      maxSpectators: this.maxSpectators,
      spectators: this.spectators.map((s) => ({
        id: s.id,
        username: s.username,
        displayName: s.displayName,
      })),
      createdAt: this.createdAt,
    };
  }
}

module.exports = Room;
