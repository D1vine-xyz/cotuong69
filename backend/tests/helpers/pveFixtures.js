/**
 * Tiện ích dùng chung cho test PvE
 */
const assert = require('node:assert/strict');

const put = (board, row, col, type, color) => {
  board[row][col] = { type, color };
  return board;
};

const mv = (fromRow, fromCol, toRow, toCol) => ({
  from: { row: fromRow, col: fromCol },
  to: { row: toRow, col: toCol },
});

/**
 * Đồng hồ giả: trả về thời điểm hiện tại có thể tua thủ công
 */
function createFakeClock(startIso = '2026-01-01T00:00:00.000Z') {
  let current = new Date(startIso).getTime();
  const clock = () => new Date(current);
  clock.advance = (ms) => {
    current += ms;
  };
  clock.set = (iso) => {
    current = new Date(iso).getTime();
  };
  return clock;
}

/**
 * Bộ sinh số ngẫu nhiên có seed (mulberry32), trả về số trong [0, 1)
 */
function seededRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Chụp trạng thái trận + lịch sử nước đi để so sánh "không đổi"
 */
async function snapshot(repo, matchId) {
  const match = await repo.findById(matchId);
  const moves = await repo.listMoves(matchId);
  return { match, moves };
}

async function assertUnchanged(repo, matchId, before) {
  const after = await snapshot(repo, matchId);
  assert.deepEqual(after, before, 'Trạng thái trận và lịch sử nước đi không được thay đổi');
}

module.exports = { put, mv, createFakeClock, seededRandom, snapshot, assertUnchanged };
