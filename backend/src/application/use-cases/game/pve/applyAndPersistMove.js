/**
 * COT-634: Hàm áp dụng nước đi DÙNG CHUNG cho người chơi và máy trong trận PvE.
 *
 * - Kiểm tra trận đang PLAYING và đúng lượt của `side`.
 * - Kiểm tra hợp lệ bằng engine luật dùng chung (isLegalMove đã bao gồm không tự để Tướng bị chiếu).
 * - Áp dụng nước bằng applyMove của engine, lưu bàn cờ + lịch sử nước đi, tăng ply, chuyển lượt.
 * Nước không hợp lệ ném AppError và KHÔNG ghi gì xuống CSDL.
 */
const { ROWS, COLS } = require('../../../../domain/rules/board');
const { isLegalMove, applyMove, opponentOf } = require('../../../../domain/rules/moveGenerator');
const { PVE_MATCH_STATUS } = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');

function isSquare(square, rows, cols) {
  return (
    square !== null &&
    typeof square === 'object' &&
    Number.isInteger(square.row) &&
    Number.isInteger(square.col) &&
    square.row >= 0 &&
    square.row < rows &&
    square.col >= 0 &&
    square.col < cols
  );
}

/**
 * Chuẩn hoá nước đi đầu vào về dạng { from: {row,col}, to: {row,col} }, bỏ các trường thừa.
 * @throws {AppError} INVALID_MOVE nếu sai định dạng hoặc ngoài bàn cờ
 */
function normalizeMove(move) {
  if (!move || typeof move !== 'object' || !isSquare(move.from, ROWS, COLS) || !isSquare(move.to, ROWS, COLS)) {
    throw new AppError(
      ERROR_CODES.INVALID_MOVE,
      'Nước đi phải có dạng { from: { row, col }, to: { row, col } } nằm trong bàn cờ 10x9'
    );
  }
  return {
    from: { row: move.from.row, col: move.from.col },
    to: { row: move.to.row, col: move.to.col },
  };
}

/**
 * @param {{ pveMatchRepository: object, clock?: () => Date }} deps
 */
function makeApplyAndPersistMove({ pveMatchRepository, clock = () => new Date() }) {
  /**
   * @param {object} match - Trận hiện tại (đọc từ repository)
   * @param {{ side: 'red'|'black', actor: 'PLAYER'|'BOT', move: object }} input
   * @returns {Promise<{ match: object, move: object }>} Trận sau nước đi và bản ghi nước đi
   */
  return async function applyAndPersistMove(match, { side, actor, move }) {
    if (match.status !== PVE_MATCH_STATUS.PLAYING) {
      throw new AppError(ERROR_CODES.MATCH_FINISHED, 'Trận đấu đã kết thúc', { matchId: match.id });
    }
    if (match.sideToMove !== side) {
      throw new AppError(ERROR_CODES.NOT_YOUR_TURN, 'Chưa tới lượt đi của bên này', {
        sideToMove: match.sideToMove,
      });
    }

    const normalized = normalizeMove(move);
    if (!isLegalMove(match.board, side, normalized)) {
      throw new AppError(ERROR_CODES.ILLEGAL_MOVE, 'Nước đi không hợp lệ theo luật cờ', {
        move: normalized,
      });
    }

    const piece = match.board[normalized.from.row][normalized.from.col];
    const { board: nextBoard, captured } = applyMove(match.board, normalized);
    const nextSide = opponentOf(side);
    const now = clock();
    const moveRecord = {
      ply: match.ply + 1,
      side,
      actor,
      pieceType: piece.type,
      from: normalized.from,
      to: normalized.to,
      capturedType: captured ? captured.type : null,
    };

    const saved = await pveMatchRepository.saveMove({
      matchId: match.id,
      expectedPly: match.ply,
      board: nextBoard,
      sideToMove: nextSide,
      move: moveRecord,
      now: now.toISOString(),
    });
    if (!saved) {
      throw new AppError(
        ERROR_CODES.MOVE_CONFLICT,
        'Trạng thái trận đã thay đổi trước khi lưu nước đi, vui lòng tải lại trận',
        { matchId: match.id, expectedPly: match.ply }
      );
    }

    return {
      match: {
        ...match,
        board: nextBoard,
        sideToMove: nextSide,
        ply: match.ply + 1,
        updatedAt: now,
      },
      move: { ...moveRecord, createdAt: now },
    };
  };
}

module.exports = { makeApplyAndPersistMove, normalizeMove };
