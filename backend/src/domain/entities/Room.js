class Room {
  constructor({
    code,
    name,
    hostId,
    hostUser,
    isPrivate = false,
    maxSpectators = 10,
    status = 'WAITING_OPPONENT',
    createdAt = new Date(),
  }) {
    this.code = code.toString().toUpperCase();
    this.name = name || `Phòng cờ #${this.code}`;
    this.hostId = Number(hostId);
    this.isPrivate = Boolean(isPrivate);
    this.maxSpectators = Number(maxSpectators);
    this.status = status; // WAITING_OPPONENT, FULL_PLAYERS, PLAYING, FINISHED, CLOSED
    this.createdAt = createdAt;

    // Người chơi: Red (Host mặc định là Red) và Black
    this.players = {
      red: hostUser ? { id: Number(hostUser.id), username: hostUser.username, displayName: hostUser.displayName, eloRating: hostUser.eloRating, avatarUrl: hostUser.avatarUrl } : null,
      black: null,
    };

    // Khán giả: tối đa 10 người
    this.spectators = [];

    // Trạng thái sẵn sàng và thành viên bị kick (COT-592)
    this.readyStates = new Set();
    this.kickedUsers = new Set();
    this.matchId = null;
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
    if (this.kickedUsers.has(uid)) {
      const err = new Error('Bạn đã bị chủ phòng loại khỏi phòng này.');
      err.code = 'USER_KICKED';
      err.statusCode = 403;
      throw err;
    }

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
      ready: {
        red: this.players.red ? this.readyStates.has(this.players.red.id) : false,
        black: this.players.black ? this.readyStates.has(this.players.black.id) : false,
      },
      readyStates: Array.from(this.readyStates),
      matchId: this.matchId,
      createdAt: this.createdAt,
    };
  }

  setReady(userId, isReady = true) {
    const uid = Number(userId);
    const roleInfo = this.getParticipantRole(uid);
    if (!roleInfo || roleInfo.role !== 'PLAYER') {
      const err = new Error('Khán giả chỉ có quyền xem, không thể đặt trạng thái sẵn sàng.');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    if (isReady) {
      this.readyStates.add(uid);
    } else {
      this.readyStates.delete(uid);
    }

    return {
      userId: uid,
      isReady: this.readyStates.has(uid),
      allReady: this.canStartGame(),
    };
  }

  isReady(userId) {
    return this.readyStates.has(Number(userId));
  }

  canStartGame() {
    if (!this.players.red || !this.players.black) return false;
    if (this.status === 'PLAYING' || this.status === 'CLOSED') return false;
    return this.readyStates.has(this.players.red.id) && this.readyStates.has(this.players.black.id);
  }

  startGame(hostId) {
    if (hostId && Number(hostId) !== Number(this.hostId)) {
      const err = new Error('Chỉ chủ phòng mới có quyền bắt đầu trận đấu.');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    if (this.status === 'PLAYING') {
      return {
        alreadyStarted: true,
        matchId: this.matchId,
        status: this.status,
      };
    }

    if (!this.canStartGame()) {
      const err = new Error('Cả hai người chơi phải ở trạng thái sẵn sàng mới được bắt đầu trận.');
      err.code = 'NOT_ALL_READY';
      err.statusCode = 400;
      throw err;
    }

    this.status = 'PLAYING';
    this.matchId = `MATCH_${this.code}_${Date.now()}`;
    return {
      alreadyStarted: false,
      matchId: this.matchId,
      status: this.status,
      startedAt: new Date(),
    };
  }

  demoteOpponent(hostId) {
    if (Number(hostId) !== Number(this.hostId)) {
      const err = new Error('Chỉ chủ phòng mới có quyền hạ đối thủ xuống khán giả.');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    if (!this.players.black) {
      const err = new Error('Không có đối thủ trong phòng để hạ quyền.');
      err.code = 'NO_OPPONENT';
      err.statusCode = 400;
      throw err;
    }

    if (this.status === 'PLAYING') {
      const err = new Error('Không thể thay đổi vai trò khi trận đấu đang diễn ra.');
      err.code = 'GAME_IN_PROGRESS';
      err.statusCode = 400;
      throw err;
    }

    if (this.spectators.length >= this.maxSpectators) {
      const err = new Error(`Phòng cờ đã đạt giới hạn tối đa ${this.maxSpectators} khán giả.`);
      err.code = 'ROOM_FULL';
      err.statusCode = 409;
      throw err;
    }

    const demoted = this.players.black;
    this.players.black = null;
    this.readyStates.delete(demoted.id);

    this.spectators.push({
      ...demoted,
      joinedAt: new Date(),
    });

    this.status = 'WAITING_OPPONENT';
    return {
      demotedUser: demoted,
      room: this.getSummary(),
    };
  }

  kickParticipant(hostId, targetUserId) {
    const hid = Number(hostId);
    const tid = Number(targetUserId);

    if (hid !== Number(this.hostId)) {
      const err = new Error('Chỉ chủ phòng mới có quyền loại thành viên ra khỏi phòng.');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    if (hid === tid) {
      const err = new Error('Chủ phòng không thể tự loại chính mình.');
      err.code = 'CANNOT_KICK_HOST';
      err.statusCode = 400;
      throw err;
    }

    if (this.status === 'PLAYING') {
      const err = new Error('Không thể loại thành viên khi trận đấu đang diễn ra.');
      err.code = 'GAME_IN_PROGRESS';
      err.statusCode = 400;
      throw err;
    }

    let kickedUser = null;
    if (this.players.black && this.players.black.id === tid) {
      kickedUser = this.players.black;
      this.players.black = null;
      this.status = 'WAITING_OPPONENT';
    } else {
      const idx = this.spectators.findIndex((s) => s.id === tid);
      if (idx !== -1) {
        kickedUser = this.spectators[idx];
        this.spectators.splice(idx, 1);
      }
    }

    if (!kickedUser) {
      const err = new Error('Không tìm thấy người dùng này trong phòng.');
      err.code = 'USER_NOT_IN_ROOM';
      err.statusCode = 404;
      throw err;
    }

    this.readyStates.delete(tid);
    this.kickedUsers.add(tid);

    return {
      kickedUser,
      room: this.getSummary(),
    };
  }

  transferHost() {
    const oldHostId = this.hostId;
    let newHost = null;

    // Ưu tiên 1: Đối thủ trở thành Chủ phòng
    if (this.players.black) {
      newHost = this.players.black;
      this.players.red = newHost;
      this.players.black = null;
      this.hostId = newHost.id;
      this.status = 'WAITING_OPPONENT';
    }
    // Ưu tiên 2: Khán giả vào sớm nhất trở thành Chủ phòng
    else if (this.spectators.length > 0) {
      newHost = this.spectators.shift();
      this.players.red = {
        id: newHost.id,
        username: newHost.username,
        displayName: newHost.displayName,
        eloRating: newHost.eloRating ?? 1000,
        avatarUrl: newHost.avatarUrl || null,
      };
      this.hostId = newHost.id;
      this.status = 'WAITING_OPPONENT';
    } else {
      this.players.red = null;
      this.hostId = null;
    }

    // Reset toàn bộ trạng thái sẵn sàng khi có chuyển giao quyền
    this.readyStates.clear();

    return {
      oldHostId,
      newHostId: this.hostId,
      newHost,
      room: this.getSummary(),
    };
  }
}

module.exports = Room;
