/**
 * Bàn cờ Tướng 9 cột x 10 hàng
 * board[row][col] = null | { type, color }
 * - row 0..9 (0 = phía quân Đen, 9 = phía quân Đỏ), col 0..8
 * - type: 'K' Tướng, 'A' Sĩ, 'E' Tượng, 'R' Xe, 'C' Pháo, 'H' Mã, 'P' Tốt
 * - color: 'red' | 'black'
 */
const ROWS = 10;
const COLS = 9;

function isInsideBoard(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

module.exports = { ROWS, COLS, isInsideBoard, createEmptyBoard };
