/**
 * COT-642: Phát hiện Chiếu Bí và Hết nước đi để kết thúc ván cờ
 *
 * Xét bên đang tới lượt đi (`sideToMove`):
 * - Còn ít nhất 1 nước hợp lệ: ván cờ chưa kết thúc ('CHECK' nếu đang bị chiếu, ngược lại 'ONGOING').
 * - Đang bị chiếu và không còn nước hợp lệ: Chiếu Bí ('CHECKMATE'), bên đó thua.
 * - Không bị chiếu nhưng không còn nước hợp lệ: Hết nước ('NO_LEGAL_MOVES'), theo luật Cờ Tướng
 *   bên hết nước cũng thua (khác cờ vua, không tính hoà).
 */
const { ROWS, COLS } = require('./board');
const { getPseudoMoves, applyMove, isInCheck, opponentOf } = require('./moveGenerator');

const GAME_STATUS = Object.freeze({
  ONGOING: 'ONGOING',
  CHECK: 'CHECK',
  CHECKMATE: 'CHECKMATE',
  NO_LEGAL_MOVES: 'NO_LEGAL_MOVES',
});

const COLORS = ['red', 'black'];

/**
 * Bên `color` còn ít nhất một nước hợp lệ không (dừng ngay khi tìm thấy nước đầu tiên)
 */
function hasAnyLegalMove(board, color) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) {
        continue;
      }
      for (const m of getPseudoMoves(board, r, c)) {
        const move = { from: { row: r, col: c }, to: { row: m.row, col: m.col } };
        if (!isInCheck(applyMove(board, move).board, color)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Trạng thái ván cờ khi tới lượt bên `sideToMove`
 * @param {'red' | 'black'} sideToMove
 * @returns {{ status: 'ONGOING' | 'CHECK' | 'CHECKMATE' | 'NO_LEGAL_MOVES',
 *             loser?: 'red' | 'black', winner?: 'red' | 'black' }}
 */
function getGameStatus(board, sideToMove) {
  if (!COLORS.includes(sideToMove)) {
    throw new Error(`Bên đi không hợp lệ: ${sideToMove}`);
  }

  const inCheck = isInCheck(board, sideToMove);
  if (hasAnyLegalMove(board, sideToMove)) {
    return { status: inCheck ? GAME_STATUS.CHECK : GAME_STATUS.ONGOING };
  }

  return {
    status: inCheck ? GAME_STATUS.CHECKMATE : GAME_STATUS.NO_LEGAL_MOVES,
    loser: sideToMove,
    winner: opponentOf(sideToMove),
  };
}

module.exports = { GAME_STATUS, getGameStatus, hasAnyLegalMove };
