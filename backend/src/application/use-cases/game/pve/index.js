/**
 * Lắp ráp các use-case PvE với dependency được inject (repository, clock).
 * Tầng presentation (HTTP/socket, làm sau) chỉ cần gọi createPveUseCases một lần khi khởi động.
 */
const { makeApplyAndPersistMove } = require('./applyAndPersistMove');
const { makeCreatePveMatch } = require('./createPveMatch');
const { makeSubmitPlayerMove } = require('./submitPlayerMove');

/**
 * @param {{ pveMatchRepository: object, clock?: () => Date }} deps
 */
function createPveUseCases({ pveMatchRepository, clock = () => new Date() }) {
  const applyAndPersistMove = makeApplyAndPersistMove({ pveMatchRepository, clock });
  return {
    applyAndPersistMove,
    createPveMatch: makeCreatePveMatch({ pveMatchRepository, clock }),
    submitPlayerMove: makeSubmitPlayerMove({ pveMatchRepository, applyAndPersistMove }),
  };
}

module.exports = { createPveUseCases };
