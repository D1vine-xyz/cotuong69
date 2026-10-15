/**
 * Hằng số nghiệp vụ của trận PvE (người chơi đấu với máy).
 *
 * Đối tượng trận (match) mà repository trả về:
 * {
 *   id, userId,
 *   playerColor: 'red'|'black', botColor: 'red'|'black',
 *   board: Array<Array<null|{ type, color }>>,  // bàn cờ hiện tại
 *   sideToMove: 'red'|'black',
 *   status: 'PLAYING'|'FINISHED',
 *   result: null|'WIN'|'LOSS',                   // theo góc nhìn người chơi
 *   endReason: null|string,
 *   ply: number,                                 // số nước đã đi
 *   createdAt: Date, updatedAt: Date, finishedAt: Date|null
 * }
 */
const PVE_MATCH_STATUS = Object.freeze({
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED',
});

const PVE_RESULT = Object.freeze({
  WIN: 'WIN',
  LOSS: 'LOSS',
});

const PVE_END_REASON = Object.freeze({
  CHECKMATE: 'CHECKMATE',
  NO_LEGAL_MOVES: 'NO_LEGAL_MOVES',
  TIMEOUT: 'TIMEOUT',
  RESIGN: 'RESIGN',
});

const PVE_ACTOR = Object.freeze({
  PLAYER: 'PLAYER',
  BOT: 'BOT',
});

const COLORS = Object.freeze(['red', 'black']);

module.exports = { PVE_MATCH_STATUS, PVE_RESULT, PVE_END_REASON, PVE_ACTOR, COLORS };
