/**
 * COT-635: Luồng kết thúc trận PvE (điểm vào duy nhất để chốt kết quả).
 * Chốt kết quả đúng một lần nhờ repository.finish (UPDATE có điều kiện status = 'PLAYING');
 * gọi lại khi trận đã kết thúc không ghi đè kết quả cũ.
 * Trận PvE KHÔNG ảnh hưởng điểm Elo: luồng này không đọc/ghi users.elo_rating.
 */
const { PVE_RESULT, PVE_END_REASON } = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');

const RESULTS = Object.values(PVE_RESULT);
const END_REASONS = Object.values(PVE_END_REASON);

/**
 * @param {{ pveMatchRepository: object, clock?: () => Date }} deps
 */
function makeFinishPveMatch({ pveMatchRepository, clock = () => new Date() }) {
  /**
   * @param {number} matchId
   * @param {{ result: 'WIN'|'LOSS', endReason: string, expectedPly?: number }} outcome
   *   Kết quả theo góc nhìn người chơi; expectedPly để chỉ chốt khi chưa có nước đi mới
   * @returns {Promise<{ finished: boolean, match: object }>} finished = lần gọi này đã chốt kết quả
   */
  return async function finishPveMatch(matchId, { result, endReason, expectedPly }) {
    if (!RESULTS.includes(result) || !END_REASONS.includes(endReason)) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'Kết quả hoặc lý do kết thúc không hợp lệ', {
        result,
        endReason,
      });
    }
    const finished = await pveMatchRepository.finish({
      matchId,
      result,
      endReason,
      now: clock().toISOString(),
      expectedPly,
    });
    const match = await pveMatchRepository.findById(matchId);
    if (!match) {
      throw new AppError(ERROR_CODES.MATCH_NOT_FOUND, 'Không tìm thấy trận đấu', { matchId });
    }
    return { finished, match };
  };
}

module.exports = { makeFinishPveMatch };
