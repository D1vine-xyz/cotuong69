/**
 * COT-612: Thuật toán di chuyển và ăn cờ cho quân Mã (kiểm tra cản chân Mã)
 * Mã đi hình chữ L: 1 ô thẳng (dọc/ngang) rồi 1 ô chéo ra ngoài, tối đa 8 hướng.
 * Chân Mã là ô sát Mã theo hướng đi thẳng ban đầu; nếu có quân (ta hoặc địch) ở chân
 * thì Mã không đi được 2 hướng tương ứng.
 */
const { isInsideBoard } = require('./board');

// Mỗi hướng thẳng: ô chân Mã và 2 ô đích chữ L tương ứng
const LEGS = [
  { leg: [-1, 0], targets: [[-2, -1], [-2, 1]] },
  { leg: [1, 0], targets: [[2, -1], [2, 1]] },
  { leg: [0, -1], targets: [[-1, -2], [1, -2]] },
  { leg: [0, 1], targets: [[-1, 2], [1, 2]] },
];

/**
 * Lấy danh sách ô Mã tại (row, col) có thể đi tới
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getHorseMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece || piece.type !== 'H') {
    return [];
  }

  const moves = [];
  for (const { leg, targets } of LEGS) {
    const legRow = row + leg[0];
    const legCol = col + leg[1];
    if (!isInsideBoard(legRow, legCol) || board[legRow][legCol]) {
      continue;
    }

    for (const [dRow, dCol] of targets) {
      const r = row + dRow;
      const c = col + dCol;
      if (!isInsideBoard(r, c)) {
        continue;
      }
      const target = board[r][c];
      if (!target) {
        moves.push({ row: r, col: c, capture: false });
      } else if (target.color !== piece.color) {
        moves.push({ row: r, col: c, capture: true });
      }
    }
  }
  return moves;
}

module.exports = { getHorseMoves };
