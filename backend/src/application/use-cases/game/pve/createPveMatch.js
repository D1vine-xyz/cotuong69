/**
 * COT-634: Tạo trận PvE mới.
 * Người chơi chọn Đỏ hoặc Đen; Đỏ luôn đi trước, nên nếu người chơi chọn Đen thì
 * side_to_move ban đầu là lượt của máy (việc cho máy đi nằm ở use-case lượt máy).
 */
const { createInitialBoard } = require('../../../../domain/rules/board');
const { opponentOf } = require('../../../../domain/rules/moveGenerator');
const { COLORS } = require('../../../../domain/entities/PveMatch');
const { AppError, ERROR_CODES } = require('../../../../core/errors/AppError');

const FIRST_SIDE = 'red';

/**
 * @param {{ pveMatchRepository: object, clock?: () => Date }} deps
 */
function makeCreatePveMatch({ pveMatchRepository, clock = () => new Date() }) {
  /**
   * @param {{ userId: number, playerColor: 'red'|'black' }} input
   */
  return async function createPveMatch({ userId, playerColor }) {
    if (userId === undefined || userId === null) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'Thiếu userId');
    }
    if (!COLORS.includes(playerColor)) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, "Màu quân phải là 'red' hoặc 'black'");
    }

    return pveMatchRepository.create({
      userId,
      playerColor,
      botColor: opponentOf(playerColor),
      board: createInitialBoard(),
      sideToMove: FIRST_SIDE,
      now: clock().toISOString(),
    });
  };
}

module.exports = { makeCreatePveMatch };
