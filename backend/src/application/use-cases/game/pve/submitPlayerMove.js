/**
 * COT-634: Người chơi gửi một nước đi trong trận PvE.
 * Kiểm tra đúng trận, đúng chủ trận, trận chưa kết thúc, đúng lượt; sau đó dùng hàm áp dụng
 * nước dùng chung (applyAndPersistMove) để kiểm tra luật và lưu.
 * COT-636: nước đi tới khi lượt đã đủ 60 giây thì không được nhận, trận bị xử thua do hết giờ.
 */
const { PVE_MATCH_STATUS, PVE_ACTOR } = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');
const { loadOwnedMatch } = require('./loadOwnedMatch');
const { finishIfPlayerTimedOut } = require('./checkPveTimeout');

/**
 * @param {{ pveMatchRepository: object, applyAndPersistMove: Function,
 *           finishPveMatch: Function, clock?: () => Date }} deps
 */
function makeSubmitPlayerMove({
  pveMatchRepository,
  applyAndPersistMove,
  finishPveMatch,
  clock = () => new Date(),
}) {
  /**
   * @returns {Promise<{ match: object, move: object, gameStatus: object }>}
   */
  return async function submitPlayerMove(matchId, userId, move) {
    const match = await loadOwnedMatch(pveMatchRepository, matchId, userId);
    if (match.status !== PVE_MATCH_STATUS.PLAYING) {
      throw new AppError(ERROR_CODES.MATCH_FINISHED, 'Trận đấu đã kết thúc', {
        matchId,
        endReason: match.endReason,
      });
    }
    if (match.sideToMove !== match.playerColor) {
      throw new AppError(ERROR_CODES.NOT_YOUR_TURN, 'Chưa tới lượt của bạn', {
        sideToMove: match.sideToMove,
      });
    }

    const timeout = await finishIfPlayerTimedOut(finishPveMatch, match, clock());
    if (timeout.match.status !== PVE_MATCH_STATUS.PLAYING) {
      throw new AppError(ERROR_CODES.MATCH_FINISHED, 'Trận đấu đã kết thúc do hết thời gian lượt đi', {
        matchId,
        endReason: timeout.match.endReason,
      });
    }

    return applyAndPersistMove(match, {
      side: match.playerColor,
      actor: PVE_ACTOR.PLAYER,
      move,
    });
  };
}

module.exports = { makeSubmitPlayerMove };
