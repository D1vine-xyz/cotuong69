/**
 * COT-613: Thuật toán di chuyển và ăn cờ cho quân Tốt
 * Quy ước toạ độ: Đỏ ở hàng 0–4 (tiến về hàng lớn hơn), Đen ở hàng 5–9 (tiến về hàng nhỏ hơn).
 * - Trước khi qua sông: chỉ tiến thẳng 1 bước.
 * - Sau khi qua sông: tiến thẳng 1 bước hoặc đi ngang trái/phải 1 bước.
 * - Không bao giờ lùi, không đi chéo. Ăn quân theo đúng hướng đi hợp lệ, không dừng trên quân mình.
 */
const { isInsideBoard } = require('./board');

/**
 * Tốt đã qua sông chưa
 * Đỏ qua sông khi ở hàng >= 5, Đen qua sông khi ở hàng <= 4
 */
function hasCrossedRiver(color, row) {
  return color === 'red' ? row >= 5 : row <= 4;
}

/**
 * Lấy danh sách ô Tốt tại (row, col) có thể đi tới
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getPawnMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece || piece.type !== 'P') {
    return [];
  }

  const forward = piece.color === 'red' ? 1 : -1;
  const directions = [[forward, 0]];
  if (hasCrossedRiver(piece.color, row)) {
    directions.push([0, -1], [0, 1]);
  }

  const moves = [];
  for (const [dRow, dCol] of directions) {
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
  return moves;
}

module.exports = { getPawnMoves };
