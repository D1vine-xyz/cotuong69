/**
 * COT-606: Thuật toán di chuyển, ăn cờ và kiểm tra lộ mặt Tướng cho quân Tướng
 * Tướng chỉ đi ngang/dọc đúng 1 giao điểm và luôn nằm trong Cung của mình.
 * Hai Tướng không được nhìn thẳng nhau trên cùng một cột mà không có quân cản.
 *
 * Quy ước toạ độ: row 0..9, col 0..8. Đỏ ở hàng 0–4, Đen ở hàng 5–9.
 * - Cung Đỏ: hàng 0–2, cột 3–5
 * - Cung Đen: hàng 7–9, cột 3–5
 */
const { isInsideBoard, ROWS, COLS } = require('./board');

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const PALACE_COL_MIN = 3;
const PALACE_COL_MAX = 5;
const PALACE_ROWS = {
  red: { min: 0, max: 2 },
  black: { min: 7, max: 9 },
};

/**
 * Kiểm tra ô (row, col) có nằm trong Cung của bên `color` hay không
 * @param {'red' | 'black'} color
 */
function isInPalace(row, col, color) {
  const rows = PALACE_ROWS[color];
  if (!rows) {
    return false;
  }
  return (
    row >= rows.min &&
    row <= rows.max &&
    col >= PALACE_COL_MIN &&
    col <= PALACE_COL_MAX
  );
}

/**
 * Tìm vị trí Tướng của một bên trên bàn cờ
 * @returns {{ row: number, col: number } | null}
 */
function findKing(board, color) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'K' && piece.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Hai Tướng đối mặt (lộ mặt Tướng): cùng cột và giữa chúng không có quân nào
 * @returns {boolean}
 */
function areKingsFacing(board) {
  const red = findKing(board, 'red');
  const black = findKing(board, 'black');
  if (!red || !black || red.col !== black.col) {
    return false;
  }

  const from = Math.min(red.row, black.row) + 1;
  const to = Math.max(red.row, black.row);
  for (let r = from; r < to; r++) {
    if (board[r][red.col]) {
      return false;
    }
  }
  return true;
}

/**
 * Tạo bàn cờ mới sau khi đi quân từ (fromRow, fromCol) tới (toRow, toCol), không sửa bàn gốc
 */
function simulateMove(board, fromRow, fromCol, toRow, toCol) {
  const next = board.map((boardRow) => boardRow.slice());
  next[toRow][toCol] = next[fromRow][fromCol];
  next[fromRow][fromCol] = null;
  return next;
}

/**
 * Lấy danh sách ô Tướng tại (row, col) có thể đi tới (đã loại nước làm hai Tướng đối mặt)
 * @returns {Array<{ row: number, col: number, capture: boolean }>}
 */
function getKingMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece || piece.type !== 'K') {
    return [];
  }

  const moves = [];
  for (const [dRow, dCol] of DIRECTIONS) {
    const r = row + dRow;
    const c = col + dCol;
    if (!isInsideBoard(r, c) || !isInPalace(r, c, piece.color)) {
      continue;
    }

    const target = board[r][c];
    if (target && target.color === piece.color) {
      continue;
    }

    if (areKingsFacing(simulateMove(board, row, col, r, c))) {
      continue;
    }

    moves.push({ row: r, col: c, capture: Boolean(target) });
  }
  return moves;
}

module.exports = { getKingMoves, areKingsFacing, isInPalace, findKing };
