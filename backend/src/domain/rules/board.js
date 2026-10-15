/**
 * Bàn cờ Tướng 9 cột x 10 hàng
 * board[row][col] = null | { type, color }
 * - row 0..9, col 0..8
 * - Đỏ ở hàng 0–4 (hàng 0 là hàng cuối của Đỏ), Đen ở hàng 5–9 (hàng 9 là hàng cuối của Đen)
 * - Sông nằm giữa hàng 4 và hàng 5; Cung là cột 3–5 (Đỏ: hàng 0–2, Đen: hàng 7–9)
 * - type: 'K' Tướng, 'A' Sĩ, 'E' Tượng, 'R' Xe, 'C' Pháo, 'H' Mã, 'P' Tốt
 * - color: 'red' | 'black'
 */
const ROWS = 10;
const COLS = 9;

const BACK_RANK = ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R'];
const CANNON_COLS = [1, 7];
const PAWN_COLS = [0, 2, 4, 6, 8];

// Hàng xuất phát của từng nhóm quân theo bên (Đỏ hàng 0–4, Đen hàng 5–9)
const INITIAL_ROWS = {
  red: { back: 0, cannon: 2, pawn: 3 },
  black: { back: 9, cannon: 7, pawn: 6 },
};

function isInsideBoard(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/**
 * Tạo bàn cờ ở thế ban đầu theo quy ước Đỏ ở hàng 0–4, Đen ở hàng 5–9
 */
function createInitialBoard() {
  const board = createEmptyBoard();
  for (const color of ['red', 'black']) {
    const rows = INITIAL_ROWS[color];
    BACK_RANK.forEach((type, col) => {
      board[rows.back][col] = { type, color };
    });
    for (const col of CANNON_COLS) {
      board[rows.cannon][col] = { type: 'C', color };
    }
    for (const col of PAWN_COLS) {
      board[rows.pawn][col] = { type: 'P', color };
    }
  }
  return board;
}

module.exports = { ROWS, COLS, isInsideBoard, createEmptyBoard, createInitialBoard };
