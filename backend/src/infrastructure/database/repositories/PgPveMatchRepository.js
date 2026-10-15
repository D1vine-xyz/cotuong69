/**
 * Hiện thực IPveMatchRepository trên PostgreSQL (qua config/db.js, chạy được cả lớp SQLite khi test).
 *
 * Lưu ý tương thích lớp SQLite của db.js: tham số $n được đổi thành `?` theo thứ tự xuất hiện,
 * nên mỗi câu SQL dùng mỗi tham số đúng một lần và theo thứ tự tăng dần.
 */
const defaultDb = require('../../../config/db');

const MATCH_COLUMNS = `id, user_id, player_color, bot_color, board_state, side_to_move, status,
  result, end_reason, ply, created_at, updated_at, finished_at`;

function toDate(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function toMatch(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    playerColor: row.player_color,
    botColor: row.bot_color,
    board: JSON.parse(row.board_state),
    sideToMove: row.side_to_move,
    status: row.status,
    result: row.result || null,
    endReason: row.end_reason || null,
    ply: Number(row.ply),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    finishedAt: toDate(row.finished_at),
  };
}

function toMoveRecord(row) {
  return {
    ply: Number(row.ply),
    side: row.side,
    actor: row.actor,
    pieceType: row.piece_type,
    from: { row: Number(row.from_row), col: Number(row.from_col) },
    to: { row: Number(row.to_row), col: Number(row.to_col) },
    capturedType: row.captured_type || null,
    createdAt: toDate(row.created_at),
  };
}

class PgPveMatchRepository {
  /**
   * @param {{ db?: { query: Function, getClient: Function } }} [deps]
   */
  constructor({ db = defaultDb } = {}) {
    this.db = db;
  }

  async create({ userId, playerColor, botColor, board, sideToMove, now }) {
    const res = await this.db.query(
      `INSERT INTO pve_matches
         (user_id, player_color, bot_color, board_state, side_to_move, status, ply, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'PLAYING', 0, $6, $7)
       RETURNING id`,
      [userId, playerColor, botColor, JSON.stringify(board), sideToMove, now, now]
    );
    const id = res.rows && res.rows[0] ? res.rows[0].id : res.lastInsertRowid;
    return this.findById(Number(id));
  }

  async findById(matchId) {
    const res = await this.db.query(`SELECT ${MATCH_COLUMNS} FROM pve_matches WHERE id = $1`, [
      matchId,
    ]);
    return res.rows.length > 0 ? toMatch(res.rows[0]) : null;
  }

  async saveMove({ matchId, expectedPly, board, sideToMove, move, now }) {
    return this.withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE pve_matches
         SET board_state = $1, side_to_move = $2, ply = ply + 1, updated_at = $3
         WHERE id = $4 AND ply = $5 AND status = 'PLAYING'`,
        [JSON.stringify(board), sideToMove, now, matchId, expectedPly]
      );
      if (updated.rowCount !== 1) {
        return false;
      }
      await client.query(
        `INSERT INTO pve_moves
           (match_id, ply, side, actor, piece_type, from_row, from_col, to_row, to_col, captured_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          matchId,
          expectedPly + 1,
          move.side,
          move.actor,
          move.pieceType,
          move.from.row,
          move.from.col,
          move.to.row,
          move.to.col,
          move.capturedType || null,
          now,
        ]
      );
      return true;
    });
  }

  async listMoves(matchId) {
    const res = await this.db.query(
      `SELECT ply, side, actor, piece_type, from_row, from_col, to_row, to_col, captured_type, created_at
       FROM pve_moves WHERE match_id = $1 ORDER BY ply ASC`,
      [matchId]
    );
    return res.rows.map(toMoveRecord);
  }

  async finish({ matchId, result, endReason, now }) {
    const res = await this.db.query(
      `UPDATE pve_matches
       SET status = 'FINISHED', result = $1, end_reason = $2, finished_at = $3, updated_at = $4
       WHERE id = $5 AND status = 'PLAYING'`,
      [result, endReason, now, now, matchId]
    );
    return res.rowCount === 1;
  }

  async withTransaction(work) {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = { PgPveMatchRepository };
