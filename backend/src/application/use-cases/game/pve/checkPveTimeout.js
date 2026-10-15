/**
 * COT-636: Người chơi hết 60 giây cho một lượt thì thua (lý do TIMEOUT).
 *
 * Thời điểm bắt đầu lượt lưu trong CSDL (turn_started_at, đặt lại sau mỗi nước đi), nên việc
 * kiểm tra không phụ thuộc bộ hẹn giờ trong bộ nhớ. Tầng realtime (làm sau) có thể gọi
 * checkPveTimeout định kỳ hoặc khi client báo hết giờ; submitPlayerMove cũng tự kiểm tra
 * để không nhận nước đi trễ.
 * Chốt thua kèm điều kiện ply: nếu người chơi vừa kịp đi một nước thì không bị xử thua.
 */
const {
  PVE_MATCH_STATUS,
  PVE_RESULT,
  PVE_END_REASON,
  PLAYER_TURN_LIMIT_MS,
  isPlayerTurnExpired,
} = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');

/**
 * Xử thua do hết giờ nếu lượt người chơi đã quá hạn
 * @returns {Promise<{ timedOut: boolean, match: object }>}
 */
async function finishIfPlayerTimedOut(finishPveMatch, match, now) {
  if (!isPlayerTurnExpired(match, now)) {
    return { timedOut: false, match };
  }
  const { finished, match: current } = await finishPveMatch(match.id, {
    result: PVE_RESULT.LOSS,
    endReason: PVE_END_REASON.TIMEOUT,
    expectedPly: match.ply,
  });
  return { timedOut: finished, match: current };
}

/**
 * @param {{ pveMatchRepository: object, finishPveMatch: Function, clock?: () => Date }} deps
 */
function makeCheckPveTimeout({ pveMatchRepository, finishPveMatch, clock = () => new Date() }) {
  /**
   * @param {number} matchId
   * @param {Date} [now] - Mặc định lấy từ clock
   * @returns {Promise<{ timedOut: boolean, remainingMs: number|null, match: object }>}
   *   timedOut = lần gọi này đã xử thua do hết giờ; remainingMs = thời gian còn lại của lượt
   *   người chơi (null nếu không phải lượt người chơi hoặc trận đã kết thúc)
   */
  return async function checkPveTimeout(matchId, now = clock()) {
    const match = await pveMatchRepository.findById(matchId);
    if (!match) {
      throw new AppError(ERROR_CODES.MATCH_NOT_FOUND, 'Không tìm thấy trận đấu', { matchId });
    }
    const outcome = await finishIfPlayerTimedOut(finishPveMatch, match, now);
    const current = outcome.match;
    const playerClockRunning =
      current.status === PVE_MATCH_STATUS.PLAYING && current.sideToMove === current.playerColor;
    const remainingMs = playerClockRunning
      ? Math.max(0, PLAYER_TURN_LIMIT_MS - (now.getTime() - current.turnStartedAt.getTime()))
      : null;
    return { timedOut: outcome.timedOut, remainingMs, match: current };
  };
}

module.exports = { makeCheckPveTimeout, finishIfPlayerTimedOut };
