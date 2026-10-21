const crypto = require('node:crypto');
const { URL } = require('node:url');
const { WebSocketServer } = require('ws');
const { verifyAccessToken } = require('../../application/services/tokenService');
const { roomManager: defaultRoomManager } = require('../../infrastructure/database/repositories/RoomManager');

class RoomHub {
  constructor({
    roomManager = defaultRoomManager,
    tokenService = { verifyAccessToken },
  } = {}) {
    this.roomManager = roomManager;
    this.tokenService = tokenService;

    this.wss = new WebSocketServer({ noServer: true });

    // Ánh xạ ConnectionId <-> UserId và Socket metadata
    this.clients = new Map(); // socket -> { connectionId, userId, user, roomCode, role, side }
    this.userSockets = new Map(); // userId -> Set<socket>
    this.connectionUsers = new Map(); // connectionId -> userId

    // Gom nhóm kết nối theo từng phòng chơi (Room Group: Room_{roomCode})
    this.roomGroups = new Map(); // roomCode -> Set<socket>

    this.setupWss();
  }

  setupWss() {
    this.wss.on('connection', (socket, request, user, room) => {
      const connectionId = `conn_${crypto.randomUUID()}`;
      const userId = Number(user.id);

      // Thêm người chơi vào phòng logic (nếu chưa có trong phòng)
      let roleInfo;
      try {
        roleInfo = room.addParticipant(user);
      } catch (err) {
        this.send(socket, { type: 'error', code: err.code || 'ROOM_ERROR', message: err.message });
        socket.close(4001, err.message);
        return;
      }

      // Lưu metadata socket
      const clientMeta = {
        connectionId,
        userId,
        user,
        roomCode: room.code,
        role: roleInfo.role,
        side: roleInfo.side,
        connectedAt: Date.now(),
      };
      this.clients.set(socket, clientMeta);

      // Ánh xạ ConnectionId <-> UserId
      this.connectionUsers.set(connectionId, userId);
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket);

      // Gom nhóm vào Room Group (Room_{roomCode})
      if (!this.roomGroups.has(room.code)) {
        this.roomGroups.set(room.code, new Set());
      }
      this.roomGroups.get(room.code).add(socket);

      // Gửi sự kiện chào mừng cho chính client vừa kết nối
      this.send(socket, {
        type: 'Connected',
        connectionId,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
        },
        role: roleInfo.role,
        side: roleInfo.side,
        room: room.getSummary(),
      });

      // Broadcast sự kiện UserJoined thời gian thực tới toàn bộ nhóm phòng
      this.broadcastToRoom(room.code, {
        type: 'UserJoined',
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
        },
        role: roleInfo.role,
        side: roleInfo.side,
        room: room.getSummary(),
      });

      // Lắng nghe sự kiện từ client
      socket.on('message', (data) => this.handleMessage(socket, data));

      // Lắng nghe đóng kết nối
      socket.on('close', () => this.handleDisconnect(socket));
    });
  }

  handleUpgrade(request, socket, head) {
    let urlObj;
    try {
      urlObj = new URL(request.url, 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }

    // Trích xuất roomCode và token
    let roomCode = urlObj.searchParams.get('roomCode');
    if (!roomCode) {
      const match = urlObj.pathname.match(/^\/ws\/room\/([^/]+)$/);
      if (match) roomCode = decodeURIComponent(match[1]);
    }

    let token = urlObj.searchParams.get('token');
    if (!token) {
      const authHeader = request.headers['authorization'] || request.headers['Authorization'] || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      }
    }

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    let decodedUser;
    try {
      decodedUser = this.tokenService.verifyAccessToken(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (!roomCode) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const room = this.roomManager.findByCode(roomCode);
    if (!room) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request, decodedUser, room);
    });
  }

  handleMessage(socket, rawMessage) {
    const meta = this.clients.get(socket);
    if (!meta) return;

    let payload;
    try {
      payload = JSON.parse(rawMessage.toString());
    } catch {
      this.send(socket, { type: 'error', code: 'INVALID_JSON', message: 'Dữ liệu tin nhắn JSON không hợp lệ.' });
      return;
    }

    const room = this.roomManager.findByCode(meta.roomCode);
    if (!room) {
      this.send(socket, { type: 'error', code: 'ROOM_NOT_FOUND', message: 'Phòng chơi không tồn tại hoặc đã đóng.' });
      return;
    }

    const type = payload.type;

    // 1. Phân quyền Socket nghiêm ngặt: Chặn 100% mọi yêu cầu thi đấu hoặc can thiệp ván cờ gửi từ Khán giả
    const roleInfo = room.getParticipantRole(meta.userId);
    const isSpectator = !roleInfo || roleInfo.role === 'SPECTATOR';

    if (isSpectator && ['ready', 'start', 'demote', 'kick', 'move'].includes(type)) {
      this.send(socket, {
        type: 'error',
        code: 'FORBIDDEN',
        message: 'Khán giả chỉ có quyền xem, máy chủ chặn 100% mọi yêu cầu thi đấu hoặc can thiệp ván cờ.',
      });
      return;
    }

    // 2. Chuyển đổi trạng thái Sẵn sàng (ready)
    if (type === 'ready') {
      try {
        const isReady = payload.isReady !== undefined ? Boolean(payload.isReady) : !room.isReady(meta.userId);
        const readyResult = room.setReady(meta.userId, isReady);

        this.broadcastToRoom(room.code, {
          type: 'ReadyStateChanged',
          userId: meta.userId,
          isReady: readyResult.isReady,
          allReady: readyResult.allReady,
          room: room.getSummary(),
        });
      } catch (err) {
        this.send(socket, { type: 'error', code: err.code || 'READY_ERROR', message: err.message });
      }
      return;
    }

    // 3. Bắt đầu trận đấu (start)
    if (type === 'start') {
      try {
        const startResult = room.startGame(meta.userId);
        this.broadcastToRoom(room.code, {
          type: 'GameStarted',
          matchId: startResult.matchId,
          startedAt: startResult.startedAt,
          room: room.getSummary(),
        });
      } catch (err) {
        this.send(socket, { type: 'error', code: err.code || 'START_ERROR', message: err.message });
      }
      return;
    }

    // 4. Chủ phòng chuyển đổi Đối thủ xuống Khán giả (demote)
    if (type === 'demote') {
      try {
        const demoteResult = room.demoteOpponent(meta.userId);

        // Cập nhật lại role trong socket meta của đối thủ bị hạ quyền
        const demotedSockets = this.userSockets.get(Number(demoteResult.demotedUser.id));
        if (demotedSockets) {
          for (const s of demotedSockets) {
            const m = this.clients.get(s);
            if (m && m.roomCode === room.code) {
              m.role = 'SPECTATOR';
              m.side = null;
            }
          }
        }

        this.broadcastToRoom(room.code, {
          type: 'RoleChanged',
          action: 'DEMOTE',
          demotedUserId: demoteResult.demotedUser.id,
          room: room.getSummary(),
        });
      } catch (err) {
        this.send(socket, { type: 'error', code: err.code || 'DEMOTE_ERROR', message: err.message });
      }
      return;
    }

    // 5. Chủ phòng loại (Kick) thành viên ra khỏi phòng
    if (type === 'kick') {
      try {
        const targetUserId = Number(payload.targetUserId);
        const kickResult = room.kickParticipant(meta.userId, targetUserId);

        this.broadcastToRoom(room.code, {
          type: 'UserKicked',
          kickedUserId: targetUserId,
          room: room.getSummary(),
        });

        // Đóng socket của người bị kick
        const targetSockets = this.userSockets.get(targetUserId);
        if (targetSockets) {
          for (const s of Array.from(targetSockets)) {
            const m = this.clients.get(s);
            if (m && m.roomCode === room.code) {
              this.send(s, { type: 'Kicked', message: 'Bạn đã bị chủ phòng loại khỏi phòng chơi.' });
              s.close(4003, 'Kicked by host');
            }
          }
        }
      } catch (err) {
        this.send(socket, { type: 'error', code: err.code || 'KICK_ERROR', message: err.message });
      }
      return;
    }

    // 6. Chat riêng giữa hai người chơi (COT-625)
    if (type === 'chat' || type === 'chat:send') {
      if (isSpectator) {
        this.send(socket, {
          type: 'error',
          code: 'FORBIDDEN',
          message: 'Chỉ hai người chơi đang thi đấu mới được sử dụng Chat riêng. Khán giả không có quyền truy cập.',
        });
        return;
      }

      const text = payload.text || payload.message || '';
      if (typeof text !== 'string' || !text.trim()) {
        this.send(socket, {
          type: 'error',
          code: 'EMPTY_MESSAGE',
          message: 'Không thể gửi tin nhắn rỗng hoặc chỉ chứa khoảng trắng.',
        });
        return;
      }

      const chatMsg = {
        type: 'ChatMessage',
        id: `msg_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        roomCode: room.code,
        senderId: meta.userId,
        senderName: meta.user.displayName || meta.user.username,
        side: roleInfo.side,
        text: text.trim(),
        timestamp: Date.now(),
      };

      this.broadcastToPlayers(room, chatMsg);
      return;
    }

    // 7. Rời phòng (leave)
    if (type === 'leave') {
      socket.close(1000, 'User left');
      return;
    }
  }

  handleDisconnect(socket) {
    const meta = this.clients.get(socket);
    if (!meta) return;

    this.clients.delete(socket);

    // Xóa khỏi userSockets
    if (this.userSockets.has(meta.userId)) {
      const set = this.userSockets.get(meta.userId);
      set.delete(socket);
      if (set.size === 0) this.userSockets.delete(meta.userId);
    }
    this.connectionUsers.delete(meta.connectionId);

    // Xóa khỏi room group
    if (this.roomGroups.has(meta.roomCode)) {
      const grp = this.roomGroups.get(meta.roomCode);
      grp.delete(socket);
      if (grp.size === 0) this.roomGroups.delete(meta.roomCode);
    }

    const room = this.roomManager.findByCode(meta.roomCode);
    if (!room) return;

    try {
      // Nếu người rời đi là Chủ phòng và ván chưa bắt đầu: Tự động chuyển quyền Chủ phòng
      if (Number(room.hostId) === meta.userId && room.status !== 'PLAYING') {
        const transferResult = room.transferHost();

        if (transferResult.newHostId) {
          // Cập nhật lại role metadata của người trở thành Host mới
          const newHostSockets = this.userSockets.get(transferResult.newHostId);
          if (newHostSockets) {
            for (const s of newHostSockets) {
              const m = this.clients.get(s);
              if (m && m.roomCode === room.code) {
                m.role = 'PLAYER';
                m.side = 'RED';
              }
            }
          }

          this.broadcastToRoom(room.code, {
            type: 'HostTransferred',
            previousHostId: transferResult.oldHostId,
            newHostId: transferResult.newHostId,
            newHost: transferResult.newHost,
            room: room.getSummary(),
          });
        } else {
          // Phòng không còn ai -> đóng phòng
          this.roomManager.closeRoom(room.code, meta.userId);
        }
      } else {
        // Người rời đi là Đối thủ hoặc Khán giả
        room.removeParticipant(meta.userId);
      }

      // Broadcast sự kiện UserLeft
      this.broadcastToRoom(room.code, {
        type: 'UserLeft',
        userId: meta.userId,
        room: room.getSummary(),
      });
    } catch {
      // Bỏ qua lỗi dọn dẹp khi socket ngắt kết nối
    }
  }

  broadcastToRoom(roomCode, message) {
    const group = this.roomGroups.get(roomCode);
    if (!group) return;

    const raw = JSON.stringify(message);
    for (const client of group) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(raw);
      }
    }
  }

  broadcastToPlayers(room, message) {
    const raw = JSON.stringify(message);
    const playerIds = new Set();
    if (room.players.red) playerIds.add(Number(room.players.red.id));
    if (room.players.black) playerIds.add(Number(room.players.black.id));

    const group = this.roomGroups.get(room.code);
    if (!group) return;

    for (const client of group) {
      const meta = this.clients.get(client);
      if (meta && playerIds.has(meta.userId) && meta.role === 'PLAYER') {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(raw);
        }
      }
    }
  }

  send(socket, message) {
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  }

  close() {
    for (const socket of Array.from(this.clients.keys())) {
      try {
        socket.terminate();
      } catch {}
    }
    this.clients.clear();
    this.roomGroups.clear();
    this.userSockets.clear();
    this.connectionUsers.clear();
    try {
      this.wss.close();
    } catch {}
  }
}

// Singleton mặc định
const defaultRoomHub = new RoomHub();

module.exports = {
  RoomHub,
  roomHub: defaultRoomHub,
};
