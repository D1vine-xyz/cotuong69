/**
 * COT-634: Người chơi gửi một nước đi trong trận PvE.
 * Kiểm tra đúng trận, đúng chủ trận, trận chưa kết thúc, đúng lượt; sau đó dùng hàm áp dụng
 * nước dùng chung (applyAndPersistMove) để kiểm tra luật và lưu.
 */
const { PVE_MATCH_STATUS, PVE_ACTOR } = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');

/**
 * Đọc trận và xác nhận người gọi là chủ trận
 * @throws {AppError} MATCH_NOT_FOUND | NOT_MATCH_OWNER
 */
async function loadOwnedMatch(pveMatchRepository, matchId, userId) {
  const match = await pveMatchRepository.findById(matchId);
  if (!match) {
    throw new AppError(ERROR_CODES.MATCH_NOT_FOUND, 'Không tìm thấy trận đấu', { matchId });
  }
  if (String(match.userId) !== String(userId)) {
    throw new AppError(ERROR_CODES.NOT_MATCH_OWNER, 'Bạn không phải người chơi của trận này', {
      matchId,
    });
  }
  return match;
}

/**
 * @param {{ pveMatchRepository: object, applyAndPersistMove: Function }} deps
 */
function makeSubmitPlayerMove({ pveMatchRepository, applyAndPersistMove }) {
  /**
   * @returns {Promise<{ match: object, move: object }>}
   */
  return async function submitPlayerMove(matchId, userId, move) {
    const match = await loadOwnedMatch(pveMatchRepository, matchId, userId);
    if (match.status !== PVE_MATCH_STATUS.PLAYING) {
      throw new AppError(ERROR_CODES.MATCH_FINISHED, 'Trận đấu đã kết thúc', { matchId });
    }
    if (match.sideToMove !== match.playerColor) {
      throw new AppError(ERROR_CODES.NOT_YOUR_TURN, 'Chưa tới lượt của bạn', {
        sideToMove: match.sideToMove,
      });
    }
    return applyAndPersistMove(match, {
      side: match.playerColor,
      actor: PVE_ACTOR.PLAYER,
      move,
    });
  };
}

module.exports = { makeSubmitPlayerMove, loadOwnedMatch };
