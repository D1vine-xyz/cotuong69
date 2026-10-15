/**
 * COT-633: Bộ đánh giá trạng thái an toàn bàn cờ cho Bot
 *
 * Chỉ đọc bàn cờ, không thay đổi bàn cờ đầu vào và không tự viết lại luật đi quân:
 * mọi kiểm tra tấn công / nước hợp lệ đều dùng lại engine trong moveGenerator.js.
 * Bot hiện tại chọn nước ngẫu nhiên trong getSafeMoves (chưa có độ khó, chưa tìm kiếm minimax);
 * evaluate() là hàm chấm điểm vật chất đơn giản để dùng cho các mức độ khó sau này.
 *
 * Quy ước toạ độ: row 0..9, col 0..8. Đỏ ở hàng 0–4, Đen ở hàng 5–9.
 */
const { ROWS, COLS } = require('./board');
const {
  opponentOf,
  findKing,
  isInCheck,
  isSquareAttacked,
  generateLegalMoves,
} = require('./moveGenerator');

// Giá trị quân (đơn vị: 1 Tốt chưa qua sông = 100). Tướng không tính vì luôn có mặt trên bàn.
const PIECE_VALUES = Object.freeze({
  K: 0,
  R: 900,
  C: 450,
  H: 400,
  A: 200,
  E: 200,
  P: 100,
});
const CROSSED_PAWN_VALUE = 200;

/**
 * Danh sách quân còn sống trên bàn cờ
 * @returns {Array<{ type: string, color: 'red'|'black', row: number, col: number }>}
 */
function getAlivePieces(board) {
  const pieces = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (piece) {
        pieces.push({ type: piece.type, color: piece.color, row: r, col: c });
      }
    }
  }
  return pieces;
}

/**
 * Trích xuất trạng thái bàn cờ từ góc nhìn của Bot
 * @param {'red'|'black'} botColor
 */
function extractBoardState(board, botColor) {
  const opponentColor = opponentOf(botColor);
  return {
    botColor,
    opponentColor,
    pieces: getAlivePieces(board),
    botKing: findKing(board, botColor),
    opponentKing: findKing(board, opponentColor),
    botInCheck: isInCheck(board, botColor),
  };
}

/**
 * Các giao điểm đang bị bên `byColor` đe doạ (khống chế): ô mà một quân `byColor` có thể ăn
 * nếu ở đó có quân đối phương. Gồm cả ô trống, ô có quân đối phương và ô có quân của chính
 * `byColor` (tức là quân đó đang được bảo vệ). Không tính luật hai Tướng đối mặt.
 * @returns {Array<{ row: number, col: number }>}
 */
function getThreatenedSquares(board, byColor) {
  const squares = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (isSquareAttacked(board, r, c, byColor)) {
        squares.push({ row: r, col: c });
      }
    }
  }
  return squares;
}

/**
 * Các quân của bên `color` đang bị đối phương đe doạ ăn
 * @returns {Array<{ type: string, color: string, row: number, col: number }>}
 */
function getThreatenedPieces(board, color) {
  const attacker = opponentOf(color);
  return getAlivePieces(board).filter(
    (p) => p.color === color && isSquareAttacked(board, p.row, p.col, attacker)
  );
}

/**
 * Các nước an toàn của Bot: sau khi đi Tướng của Bot không bị chiếu và không lộ mặt Tướng.
 * Chính là danh sách nước hợp lệ của engine luật.
 * @returns {Array<{ from: {row,col}, to: {row,col}, capture: boolean }>}
 */
function getSafeMoves(board, botColor) {
  return generateLegalMoves(board, botColor);
}

function pieceValue(piece, row) {
  if (piece.type === 'P') {
    const crossed = piece.color === 'red' ? row >= 5 : row <= 4;
    return crossed ? CROSSED_PAWN_VALUE : PIECE_VALUES.P;
  }
  return PIECE_VALUES[piece.type] || 0;
}

/**
 * Điểm vật chất từ góc nhìn bên `color`: tổng giá trị quân mình trừ tổng giá trị quân địch.
 * Dương là `color` đang hơn quân.
 */
function evaluate(board, color) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (!piece) {
        continue;
      }
      const value = pieceValue(piece, r);
      score += piece.color === color ? value : -value;
    }
  }
  return score;
}

module.exports = {
  PIECE_VALUES,
  CROSSED_PAWN_VALUE,
  getAlivePieces,
  extractBoardState,
  getThreatenedSquares,
  getThreatenedPieces,
  getSafeMoves,
  evaluate,
};
