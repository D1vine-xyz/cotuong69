const defaultDb = require('../../../config/db');

function toOAuthIdentity(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    provider: row.provider,
    providerId: row.provider_id,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

class PgOAuthRepository {
  constructor({ db = defaultDb } = {}) {
    this.db = db;
  }

  async findByProvider(provider, providerId) {
    if (!provider || !providerId) return null;
    const res = await this.db.query(
      `SELECT id, user_id, provider, provider_id, created_at
       FROM oauth_identities
       WHERE provider = $1 AND provider_id = $2
       LIMIT 1`,
      [provider.toLowerCase(), String(providerId)]
    );
    return res.rows.length > 0 ? toOAuthIdentity(res.rows[0]) : null;
  }

  async findByUserId(userId) {
    if (!userId) return [];
    const res = await this.db.query(
      `SELECT id, user_id, provider, provider_id, created_at
       FROM oauth_identities
       WHERE user_id = $1`,
      [Number(userId)]
    );
    return res.rows.map(toOAuthIdentity);
  }

  async create({ userId, provider, providerId }) {
    await this.db.query(
      `INSERT INTO oauth_identities (user_id, provider, provider_id)
       VALUES ($1, $2, $3)`,
      [Number(userId), provider.toLowerCase(), String(providerId)]
    );
    return await this.findByProvider(provider, providerId);
  }
}

module.exports = PgOAuthRepository;
