const defaultDb = require('../../../config/db');

function toDate(val) {
  if (!val) return null;
  return val instanceof Date ? val : new Date(val);
}

function toUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    passwordHash: row.password_hash,
    eloRating: Number(row.elo_rating ?? 1000),
    avatarUrl: row.avatar_url || null,
    status: row.status || 'ACTIVE',
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

class PgUserRepository {
  constructor({ db = defaultDb } = {}) {
    this.db = db;
  }

  async findByUsername(username) {
    if (!username) return null;
    const res = await this.db.query(
      `SELECT id, username, display_name, email, password_hash, elo_rating, avatar_url, status, created_at, updated_at
       FROM users WHERE username = $1 LIMIT 1`,
      [username.trim()]
    );
    return res.rows.length > 0 ? toUser(res.rows[0]) : null;
  }

  async findByEmail(email) {
    if (!email) return null;
    const res = await this.db.query(
      `SELECT id, username, display_name, email, password_hash, elo_rating, avatar_url, status, created_at, updated_at
       FROM users WHERE email = $1 LIMIT 1`,
      [email.trim().toLowerCase()]
    );
    return res.rows.length > 0 ? toUser(res.rows[0]) : null;
  }

  async findById(id) {
    if (!id) return null;
    const res = await this.db.query(
      `SELECT id, username, display_name, email, password_hash, elo_rating, avatar_url, status, created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1`,
      [Number(id)]
    );
    return res.rows.length > 0 ? toUser(res.rows[0]) : null;
  }

  async create({ username, displayName, email, passwordHash, eloRating = 1000, avatarUrl = null, status = 'ACTIVE' }) {
    await this.db.query(
      `INSERT INTO users (username, display_name, email, password_hash, elo_rating, avatar_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [username.trim(), displayName.trim(), email.trim().toLowerCase(), passwordHash, eloRating, avatarUrl, status]
    );
    return await this.findByUsername(username.trim());
  }

  async updatePassword(userId, passwordHash) {
    await this.db.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, Number(userId)]
    );
    return await this.findById(userId);
  }
}

module.exports = PgUserRepository;
