/**
 * COT-636: Lịch sử đấu PvE của người chơi và xem lại một trận.
 * Trận PvE luôn bắt đầu từ thế cờ chuẩn (createInitialBoard), nên client dựng lại từng
 * thế cờ bằng cách áp dụng lần lượt các nước trong `moves`.
 */
const { PVE_MATCH_STATUS } = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');
const { loadOwnedMatch } = require('./loadOwnedMatch');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toPageNumber(value, fallback, max) {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < 0 || (max !== undefined && value > max)) {
    throw new AppError(ERROR_CODES.INVALID_INPUT, 'Tham số phân trang không hợp lệ', { value });
  }
  return value;
}

/**
 * @param {{ pveMatchRepository: object }} deps
 */
function makeListPlayerPveHistory({ pveMatchRepository }) {
  /**
   * Các trận PvE ĐÃ KẾT THÚC của người chơi, mới nhất trước (không kèm bàn cờ).
   * @param {number} userId
   * @param {{ limit?: number, offset?: number }} [options]
   */
  return async function listPlayerPveHistory(userId, { limit, offset } = {}) {
    if (userId === undefined || userId === null) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'Thiếu userId');
    }
    return pveMatchRepository.listByUser(userId, {
      status: PVE_MATCH_STATUS.FINISHED,
      limit: toPageNumber(limit, DEFAULT_LIMIT, MAX_LIMIT),
      offset: toPageNumber(offset, 0),
    });
  };
}

/**
 * @param {{ pveMatchRepository: object }} deps
 */
function makeGetPveMatchReplay({ pveMatchRepository }) {
  /**
   * Dữ liệu xem lại trận: thông tin trận (kể cả bàn cờ cuối) và toàn bộ nước đi theo thứ tự.
   * Chỉ chủ trận được xem.
   * @returns {Promise<{ match: object, moves: object[] }>}
   */
  return async function getPveMatchReplay(matchId, userId) {
    const match = await loadOwnedMatch(pveMatchRepository, matchId, userId);
    const moves = await pveMatchRepository.listMoves(match.id);
    return { match, moves };
  };
}

module.exports = { makeListPlayerPveHistory, makeGetPveMatchReplay };
