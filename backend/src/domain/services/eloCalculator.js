/**
 * Tiện ích tính toán điểm Elo theo chuẩn FIDE với hệ số K = 32 (COT-595)
 */
function calculateElo(playerRating, opponentRating, score, k = 32) {
  const pRating = Number(playerRating) || 1000;
  const oRating = Number(opponentRating) || 1000;

  // Kỳ vọng điểm số (Expected Score): E = 1 / (1 + 10 ^ ((R_opp - R_player) / 400))
  const expected = 1 / (1 + Math.pow(10, (oRating - pRating) / 400));

  // Điểm thay đổi: ΔR = round(K * (Score - Expected))
  const change = Math.round(k * (score - expected));
  const newRating = Math.max(0, pRating + change);

  return {
    oldRating: pRating,
    newRating,
    change,
    expected,
  };
}

module.exports = {
  calculateElo,
};
