/**
 * Lắp ráp các use-case PvE với dependency được inject (repository, clock, nguồn random).
 * Tầng presentation (HTTP/socket, làm sau) chỉ cần gọi createPveUseCases một lần khi khởi động.
 */
const { makeApplyAndPersistMove } = require('./applyAndPersistMove');
const { makeCreatePveMatch } = require('./createPveMatch');
const { makeSubmitPlayerMove } = require('./submitPlayerMove');
const { makeFinishPveMatch } = require('./finishPveMatch');
const { makePlayBotTurn } = require('./playBotTurn');

/**
 * @param {{ pveMatchRepository: object, clock?: () => Date, random?: () => number }} deps
 */
function createPveUseCases({ pveMatchRepository, clock = () => new Date(), random = Math.random }) {
  const finishPveMatch = makeFinishPveMatch({ pveMatchRepository, clock });
  const applyAndPersistMove = makeApplyAndPersistMove({ pveMatchRepository, clock, finishPveMatch });
  return {
    applyAndPersistMove,
    finishPveMatch,
    createPveMatch: makeCreatePveMatch({ pveMatchRepository, clock }),
    submitPlayerMove: makeSubmitPlayerMove({ pveMatchRepository, applyAndPersistMove }),
    playBotTurn: makePlayBotTurn({ pveMatchRepository, applyAndPersistMove, finishPveMatch, random }),
  };
}

module.exports = { createPveUseCases };
