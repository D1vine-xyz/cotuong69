/**
 * Lỗi nghiệp vụ có mã lỗi rõ ràng để tầng presentation (HTTP/socket) map sang phản hồi phù hợp.
 */
const ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_MOVE: 'INVALID_MOVE',
  ILLEGAL_MOVE: 'ILLEGAL_MOVE',
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  NOT_MATCH_OWNER: 'NOT_MATCH_OWNER',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  MATCH_FINISHED: 'MATCH_FINISHED',
  MOVE_CONFLICT: 'MOVE_CONFLICT',
});

class AppError extends Error {
  /**
   * @param {string} code - Một giá trị trong ERROR_CODES
   * @param {string} message - Mô tả lỗi cho người đọc
   * @param {object} [details] - Dữ liệu bổ sung (không chứa thông tin nhạy cảm)
   */
  constructor(code, message, details) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

module.exports = { AppError, ERROR_CODES };
