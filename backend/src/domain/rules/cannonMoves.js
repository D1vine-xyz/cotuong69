/**
 * COT-611: Thuật toán di chuyển và ăn cờ cho quân Pháo (cơ chế ngòi Pháo)
 * Pháo đi thẳng theo hàng/cột như Xe khi không ăn quân: đường đi phải hoàn toàn trống.
 * Khi ăn quân, giữa Pháo và quân bị ăn phải có đúng một quân làm "ngòi" (của bên nào cũng được).
 */
const { isInsideBoard } = require('./board');

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Lấy danh sách ô Pháo tại (row, col) có thể đi tới
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getCannonMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece || piece.type !== 'C') {
    return [];
  }

  const moves = [];
  for (const [dRow, dCol] of DIRECTIONS) {
    let r = row + dRow;
    let c = col + dCol;

    // Đi thường: các ô trống liên tiếp cho tới khi gặp quân đầu tiên (ngòi)
    while (isInsideBoard(r, c) && !board[r][c]) {
      moves.push({ row: r, col: c, capture: false });
      r += dRow;
      c += dCol;
    }

    // Bỏ qua ngòi, tìm quân đầu tiên phía sau ngòi
    r += dRow;
    c += dCol;
    while (isInsideBoard(r, c)) {
      const target = board[r][c];
      if (target) {
        if (target.color !== piece.color) {
          moves.push({ row: r, col: c, capture: true });
        }
        break;
      }
      r += dRow;
      c += dCol;
    }
  }
  return moves;
}

module.exports = { getCannonMoves };
