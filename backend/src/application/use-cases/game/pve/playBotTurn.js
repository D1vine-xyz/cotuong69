/**
 * COT-635: Xử lý lượt đi của máy trong trận PvE.
 *
 * - Chỉ chạy khi trận đang PLAYING và đúng lượt máy (không có tham số độ khó).
 * - Lấy mọi nước hợp lệ của máy từ engine (getSafeMoves = generateLegalMoves), chọn NGẪU NHIÊN
 *   bằng nguồn random được inject, rồi áp dụng qua hàm dùng chung applyAndPersistMove
 *   (lưu lịch sử, xét Chiếu Bí / Hết nước cho người chơi và kết thúc trận nếu cần).
 * - Máy không còn nước hợp lệ: máy thua (Chiếu Bí nếu đang bị chiếu, ngược lại Hết nước).
 * - Chống xử lý lặp: mỗi lượt máy chỉ được đi đúng một lần. Nước đi chỉ được lưu khi ply trong
 *   CSDL vẫn bằng ply lúc đọc (UPDATE có điều kiện); lần gọi trùng/đồng thời trả về played=false.
 *   Có thể truyền expectedPly (ply ngay sau nước của người chơi) để bỏ qua yêu cầu đã cũ.
 */
const { getSafeMoves } = require('../../../../domain/rules/botEvaluation');
const { isInCheck } = require('../../../../domain/rules/moveGenerator');
const {
  PVE_MATCH_STATUS,
  PVE_RESULT,
  PVE_END_REASON,
  PVE_ACTOR,
} = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');

const BOT_TURN_SKIP_REASON = Object.freeze({
  MATCH_FINISHED: 'MATCH_FINISHED',
  NOT_BOT_TURN: 'NOT_BOT_TURN',
  ALREADY_PLAYED: 'ALREADY_PLAYED',
  BOT_HAS_NO_MOVES: 'BOT_HAS_NO_MOVES',
});

/**
 * Chọn ngẫu nhiên một phần tử; random() trả về số trong [0, 1)
 */
function pickRandom(items, random) {
  const value = random();
  const index = Number.isFinite(value) ? Math.floor(value * items.length) : 0;
  return items[Math.min(Math.max(index, 0), items.length - 1)];
}

/**
 * @param {{ pveMatchRepository: object, applyAndPersistMove: Function,
 *           finishPveMatch: Function, random?: () => number }} deps
 */
function makePlayBotTurn({ pveMatchRepository, applyAndPersistMove, finishPveMatch, random = Math.random }) {
  /**
   * @param {number} matchId
   * @param {{ expectedPly?: number }} [options]
   * @returns {Promise<{ played: true, match: object, move: object, gameStatus: object }
   *                 | { played: false, reason: string, match: object }>}
   */
  return async function playBotTurn(matchId, { expectedPly } = {}) {
    const match = await pveMatchRepository.findById(matchId);
    if (!match) {
      throw new AppError(ERROR_CODES.MATCH_NOT_FOUND, 'Không tìm thấy trận đấu', { matchId });
    }
    const skip = (reason, current = match) => ({ played: false, reason, match: current });

    if (match.status !== PVE_MATCH_STATUS.PLAYING) {
      return skip(BOT_TURN_SKIP_REASON.MATCH_FINISHED);
    }
    if (expectedPly !== undefined && match.ply !== expectedPly) {
      return skip(BOT_TURN_SKIP_REASON.ALREADY_PLAYED);
    }
    if (match.sideToMove !== match.botColor) {
      return skip(BOT_TURN_SKIP_REASON.NOT_BOT_TURN);
    }

    const candidates = getSafeMoves(match.board, match.botColor);
    if (candidates.length === 0) {
      const { match: finished } = await finishPveMatch(match.id, {
        result: PVE_RESULT.WIN,
        endReason: isInCheck(match.board, match.botColor)
          ? PVE_END_REASON.CHECKMATE
          : PVE_END_REASON.NO_LEGAL_MOVES,
      });
      return skip(BOT_TURN_SKIP_REASON.BOT_HAS_NO_MOVES, finished);
    }

    const chosen = pickRandom(candidates, random);
    try {
      const outcome = await applyAndPersistMove(match, {
        side: match.botColor,
        actor: PVE_ACTOR.BOT,
        move: { from: chosen.from, to: chosen.to },
      });
      return { played: true, ...outcome };
    } catch (err) {
      if (err instanceof AppError && err.code === ERROR_CODES.MOVE_CONFLICT) {
        return skip(BOT_TURN_SKIP_REASON.ALREADY_PLAYED, await pveMatchRepository.findById(matchId));
      }
      if (err instanceof AppError && err.code === ERROR_CODES.MATCH_FINISHED) {
        return skip(BOT_TURN_SKIP_REASON.MATCH_FINISHED, await pveMatchRepository.findById(matchId));
      }
      throw err;
    }
  };
}

module.exports = { makePlayBotTurn, BOT_TURN_SKIP_REASON };
