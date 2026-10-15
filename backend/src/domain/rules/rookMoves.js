/**
 * COT-610: Thuật toán di chuyển và ăn cờ cho quân Xe
 * Xe đi thẳng theo hàng/cột không giới hạn số ô, không được nhảy qua quân khác,
 * dừng lại khi gặp quân: quân địch thì được ăn, quân mình thì dừng trước đó.
 */
const { isInsideBoard } = require('./board');

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Lấy danh sách ô Xe tại (row, col) có thể đi tới
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getRookMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece || piece.type !== 'R') {
    return [];
  }

  const moves = [];
  for (const [dRow, dCol] of DIRECTIONS) {
    let r = row + dRow;
    let c = col + dCol;
    while (isInsideBoard(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push({ row: r, col: c, capture: false });
      } else {
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

module.exports = { getRookMoves };
