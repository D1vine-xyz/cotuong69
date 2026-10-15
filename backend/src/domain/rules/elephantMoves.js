/**
 * COT-607: Thuật toán di chuyển và ăn cờ cho quân Tượng (cản mắt Tượng)
 * Tượng đi chéo đúng 2 giao điểm (hình chữ Điền).
 * Nếu ô chéo ở giữa ("mắt Tượng") có quân của bất kỳ bên nào thì không đi được hướng đó.
 * Tượng không được qua sông: Tượng Đỏ chỉ ở hàng 0–4, Tượng Đen chỉ ở hàng 5–9.
 */
const { isInsideBoard } = require('./board');

const DIAGONALS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const OWN_SIDE_ROWS = {
  red: { min: 0, max: 4 },
  black: { min: 5, max: 9 },
};

function isOnOwnSide(color, row) {
  const rows = OWN_SIDE_ROWS[color];
  return Boolean(rows) && row >= rows.min && row <= rows.max;
}

/**
 * Lấy danh sách ô Tượng tại (row, col) có thể đi tới
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getElephantMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece || piece.type !== 'E') {
    return [];
  }

  const moves = [];
  for (const [dRow, dCol] of DIAGONALS) {
    const r = row + 2 * dRow;
    const c = col + 2 * dCol;
    if (!isInsideBoard(r, c) || !isOnOwnSide(piece.color, r)) {
      continue;
    }
    // Mắt Tượng bị cản thì không đi được hướng này
    if (board[row + dRow][col + dCol]) {
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

module.exports = { getElephantMoves };
