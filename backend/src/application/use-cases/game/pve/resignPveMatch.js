/**
 * COT-636: Người chơi đầu hàng trận PvE (được phép ở cả lượt mình lẫn lượt máy).
 */
const { PVE_MATCH_STATUS, PVE_RESULT, PVE_END_REASON } = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');
const { loadOwnedMatch } = require('./loadOwnedMatch');

/**
 * @param {{ pveMatchRepository: object, finishPveMatch: Function }} deps
 */
function makeResignPveMatch({ pveMatchRepository, finishPveMatch }) {
  /**
   * @returns {Promise<object>} Trận sau khi đã chốt thua do đầu hàng
   */
  return async function resignPveMatch(matchId, userId) {
    const match = await loadOwnedMatch(pveMatchRepository, matchId, userId);
    if (match.status !== PVE_MATCH_STATUS.PLAYING) {
      throw new AppError(ERROR_CODES.MATCH_FINISHED, 'Trận đấu đã kết thúc', {
        matchId,
        endReason: match.endReason,
      });
    }
    const { finished, match: current } = await finishPveMatch(match.id, {
      result: PVE_RESULT.LOSS,
      endReason: PVE_END_REASON.RESIGN,
    });
    if (!finished) {
      throw new AppError(ERROR_CODES.MATCH_FINISHED, 'Trận đấu đã kết thúc', {
        matchId,
        endReason: current.endReason,
      });
    }
    return current;
  };
}

module.exports = { makeResignPveMatch };
