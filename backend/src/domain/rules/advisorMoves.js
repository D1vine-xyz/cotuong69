/**
 * COT-607: Thuật toán di chuyển và ăn cờ cho quân Sĩ
 * Sĩ đi chéo đúng 1 giao điểm và luôn phải ở trong Cung.
 * Quy ước: Đỏ ở hàng 0–4 (Cung Đỏ: hàng 0–2, cột 3–5),
 *          Đen ở hàng 5–9 (Cung Đen: hàng 7–9, cột 3–5).
 * Sĩ chỉ có 5 vị trí hợp lệ mỗi bên: 4 góc Cung và tâm Cung.
 */
const { isInsideBoard } = require('./board');

const DIAGONALS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const PALACE_ROWS = {
  red: { min: 0, max: 2 },
  black: { min: 7, max: 9 },
};
const PALACE_MIN_COL = 3;
const PALACE_MAX_COL = 5;

function isInsidePalace(color, row, col) {
  const rows = PALACE_ROWS[color];
  if (!rows) {
    return false;
  }
  return (
    row >= rows.min &&
    row <= rows.max &&
    col >= PALACE_MIN_COL &&
    col <= PALACE_MAX_COL
  );
}

/**
 * Lấy danh sách ô Sĩ tại (row, col) có thể đi tới
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getAdvisorMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece || piece.type !== 'A') {
    return [];
  }

  const moves = [];
  for (const [dRow, dCol] of DIAGONALS) {
    const r = row + dRow;
    const c = col + dCol;
    if (!isInsideBoard(r, c) || !isInsidePalace(piece.color, r, c)) {
      continue;
    }
    const target = board[r][c];
    if (!target) {
      moves.push({ row: r, col: c, capture: false });
    } else if (target.color !== piece.color) {
      moves.push({ row: r, col: c, capture: true });
    }
  }
  return moves;
}

module.exports = { getAdvisorMoves };
