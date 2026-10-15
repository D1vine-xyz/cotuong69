/**
 * COT-641: Engine nước đi dùng chung và phát hiện trạng thái Chiếu Tướng
 *
 * - Nước GIẢ hợp lệ (pseudo-legal): đúng cách đi của từng quân, chưa xét Tướng mình có bị chiếu.
 * - Nước HỢP LỆ (legal): nước giả hợp lệ mà sau khi đi, Tướng mình không bị chiếu và hai Tướng
 *   không đối mặt. Bước lọc này bao gồm: không đi Tướng vào ô bị khống chế, không làm lộ mặt
 *   Tướng, quân bị ghim không được rời đường, đang bị chiếu thì bắt buộc giải chiếu.
 *
 * Quy ước toạ độ: row 0..9, col 0..8. Đỏ ở hàng 0–4, Đen ở hàng 5–9.
 * Nước đi: { from: { row, col }, to: { row, col } }.
 *
 * Ngoài phạm vi COT-641: phát trạng thái Chiếu tới client qua realtime (chưa có server socket);
 * tầng realtime sau này chỉ cần gọi isInCheck(board, sideToMove) sau mỗi nước đi.
 */
const { ROWS, COLS } = require('./board');
const { getRookMoves } = require('./rookMoves');
const { getCannonMoves } = require('./cannonMoves');
const { getKingMoves, areKingsFacing, findKing } = require('./kingMoves');
const { getAdvisorMoves } = require('./advisorMoves');
const { getElephantMoves } = require('./elephantMoves');
const { getHorseMoves } = require('./horseMoves');
const { getPawnMoves } = require('./pawnMoves');

const MOVE_GENERATORS = {
  K: getKingMoves,
  A: getAdvisorMoves,
  E: getElephantMoves,
  R: getRookMoves,
  C: getCannonMoves,
  H: getHorseMoves,
  P: getPawnMoves,
};

function opponentOf(color) {
  return color === 'red' ? 'black' : 'red';
}

/**
 * Nước giả hợp lệ của quân tại (row, col), dispatch theo loại quân
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getPseudoMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }
  const generate = MOVE_GENERATORS[piece.type];
  return generate ? generate(board, row, col) : [];
}

/**
 * Đi một nước trên bản sao bàn cờ, KHÔNG sửa bàn cờ gốc
 * @param {{ from: { row: number, col: number }, to: { row: number, col: number } }} move
 * @returns {{ board: Array<Array<object|null>>, captured: object|null }}
 */
function applyMove(board, move) {
  const { from, to } = move;
  const piece = board[from.row][from.col];
  if (!piece) {
    throw new Error(`Không có quân tại (${from.row}, ${from.col})`);
  }
  const next = board.map((boardRow) => boardRow.slice());
  const captured = next[to.row][to.col];
  next[to.row][to.col] = piece;
  next[from.row][from.col] = null;
  return { board: next, captured: captured || null };
}

/**
 * Ô (row, col) có bị quân bên `byColor` tấn công (khống chế) hay không.
 * Dùng lại nước giả hợp lệ của từng quân: ô bị tấn công nếu một quân `byColor` có thể ĂN
 * một quân đối phương đặt tại ô đó. Nếu ô đang trống hoặc có quân của `byColor`, đặt tạm
 * một quân đối phương vào ô đó trên bản sao (quân đặt ở chính ô đích không làm thay đổi
 * đường đi tới ô đích, nên không ảnh hưởng ngòi Pháo / chân Mã / mắt Tượng).
 * Không tính luật hai Tướng đối mặt (xem isInCheck).
 */
function isSquareAttacked(board, row, col, byColor) {
  const target = board[row][col];
  let scanBoard = board;
  if (!target || target.color === byColor) {
    scanBoard = board.map((boardRow) => boardRow.slice());
    scanBoard[row][col] = { type: 'P', color: opponentOf(byColor) };
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = scanBoard[r][c];
      if (!piece || piece.color !== byColor) {
        continue;
      }
      const moves = getPseudoMoves(scanBoard, r, c);
      if (moves.some((m) => m.row === row && m.col === col)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Tướng bên `color` có đang bị chiếu không:
 * bị quân địch tấn công HOẶC hai Tướng đối mặt trên cùng cột không có quân cản.
 * Bàn cờ không có Tướng bên `color` thì trả về false.
 */
function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) {
    return false;
  }
  if (areKingsFacing(board)) {
    return true;
  }
  return isSquareAttacked(board, king.row, king.col, opponentOf(color));
}

/**
 * Mọi nước giả hợp lệ của bên `color`
 * @returns {Array<{ from: {row,col}, to: {row,col}, capture: boolean }>}
 */
function generatePseudoMoves(board, color) {
  const moves = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) {
        continue;
      }
      for (const m of getPseudoMoves(board, r, c)) {
        moves.push({ from: { row: r, col: c }, to: { row: m.row, col: m.col }, capture: m.capture });
      }
    }
  }
  return moves;
}

function leavesKingSafe(board, color, move) {
  return !isInCheck(applyMove(board, move).board, color);
}

/**
 * Mọi nước HỢP LỆ của bên `color` (đã lọc nước khiến Tướng mình bị chiếu / lộ mặt Tướng)
 * @returns {Array<{ from: {row,col}, to: {row,col}, capture: boolean }>}
 */
function generateLegalMoves(board, color) {
  return generatePseudoMoves(board, color).filter((move) => leavesKingSafe(board, color, move));
}

/**
 * Nước HỢP LỆ của riêng quân tại (row, col)
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getLegalMovesForPiece(board, row, col) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }
  return getPseudoMoves(board, row, col).filter((m) =>
    leavesKingSafe(board, piece.color, { from: { row, col }, to: { row: m.row, col: m.col } })
  );
}

/**
 * Kiểm tra một nước đi của bên `color` có hợp lệ không
 */
function isLegalMove(board, color, move) {
  if (!move || !move.from || !move.to) {
    return false;
  }
  const { from, to } = move;
  if (!board[from.row] || !board[from.row][from.col]) {
    return false;
  }
  const piece = board[from.row][from.col];
  if (piece.color !== color) {
    return false;
  }
  const isPseudo = getPseudoMoves(board, from.row, from.col).some(
    (m) => m.row === to.row && m.col === to.col
  );
  return isPseudo && leavesKingSafe(board, color, move);
}

module.exports = {
  opponentOf,
  getPseudoMoves,
  findKing,
  applyMove,
  isSquareAttacked,
  isInCheck,
  generatePseudoMoves,
  generateLegalMoves,
  getLegalMovesForPiece,
  isLegalMove,
};
