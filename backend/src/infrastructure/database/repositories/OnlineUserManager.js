class OnlineUserManager {
  constructor() {
    this.onlineUsers = new Map(); // userId -> { status: 'ONLINE'|'IN_GAME', lastSeen: Date }
  }

  setOnline(userId, status = 'ONLINE') {
    if (!userId) return;
    this.onlineUsers.set(Number(userId), {
      status,
      lastSeen: new Date(),
    });
  }

  setOffline(userId) {
    if (!userId) return;
    this.onlineUsers.delete(Number(userId));
  }

  isOnline(userId) {
    if (!userId) return false;
    return this.onlineUsers.has(Number(userId));
  }

  getUserStatus(userId) {
    if (!userId) return 'OFFLINE';
    const entry = this.onlineUsers.get(Number(userId));
    return entry ? entry.status : 'OFFLINE';
  }

  clear() {
    this.onlineUsers.clear();
  }
}

const defaultOnlineUserManager = new OnlineUserManager();

module.exports = {
  OnlineUserManager,
  onlineUserManager: defaultOnlineUserManager,
};
