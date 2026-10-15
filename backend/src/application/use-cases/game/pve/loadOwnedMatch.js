/**
 * Đọc trận PvE và xác nhận người gọi là chủ trận (dùng chung cho các use-case của người chơi)
 */
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');

/**
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

module.exports = { loadOwnedMatch };
