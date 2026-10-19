import { useState, useEffect, useCallback } from 'react';
import { PveApiService, PVE_COLORS } from '../../../js/pve.js';

/**
 * COT-639: Custom Hook quản lý logic tương tác trận đấu với AI (PvE)
 * Đảm bảo:
 * - Khóa bàn cờ (isBoardLocked = true) khi tới lượt máy hoặc máy đang tính
 * - Hiển thị "Máy đang đi..." đúng lúc
 * - Chỉ cập nhật bàn cờ sau khi máy chủ xác nhận nước đi của máy
 * - Giao diện KHÔNG tự ý tính nước đi cho máy
 */
export function usePveGame(initialMatch = null) {
  const [pveApi] = useState(() => new PveApiService());
  const [match, setMatch] = useState(initialMatch);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [movePending, setMovePending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isPlayerTurn = match ? match.status === 'PLAYING' && match.sideToMove === match.playerColor : false;
  const isBoardLocked = !match || match.status !== 'PLAYING' || isBotThinking || movePending || !isPlayerTurn;

  // Xử lý khi bắt đầu ván mới
  const startMatch = useCallback(async ({ playerColor }) => {
    setErrorMessage('');
    const res = await pveApi.createPveMatch({ playerColor });
    if (res.success) {
      setMatch(res.match);
      // Nếu người chơi chọn Đen -> Máy là Đỏ đi trước -> Kích hoạt lượt máy ngay
      if (res.match.playerColor === PVE_COLORS.BLACK && res.match.sideToMove === PVE_COLORS.RED) {
        triggerBotMove(res.match.id);
      }
    }
    return res;
  }, [pveApi]);

  // Kích hoạt lượt máy (chờ phản hồi chính thức từ máy chủ)
  const triggerBotMove = useCallback(async (matchId) => {
    setIsBotThinking(true);
    setErrorMessage('');
    try {
      const res = await pveApi.fetchBotMove(matchId);
      if (res.success) {
        setMatch(res.match);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi khi nhận nước đi từ máy');
    } finally {
      setIsBotThinking(false);
    }
  }, [pveApi]);

  // Người chơi thực hiện nước đi
  const makeMove = useCallback(async ({ from, to }) => {
    if (isBoardLocked) {
      return { accepted: false, error: 'Bàn cờ đang bị khóa hoặc chưa tới lượt của bạn.' };
    }

    setMovePending(true);
    setErrorMessage('');
    try {
      const res = await pveApi.submitMove(match.id, { from, to });
      if (res.success) {
        setMatch(res.match);
        // Sau khi người chơi đi xong, tới lượt máy -> Gọi máy chủ tính nước máy
        if (res.match.status === 'PLAYING' && res.match.sideToMove === res.match.botColor) {
          triggerBotMove(res.match.id);
        }
        return { accepted: true, match: res.match };
      }
      return { accepted: false };
    } catch (err) {
      setErrorMessage(err.message);
      return { accepted: false, error: err.message };
    } finally {
      setMovePending(false);
    }
  }, [isBoardLocked, match, pveApi, triggerBotMove]);

  // Người chơi đầu hàng (COT-640)
  const resign = useCallback(async () => {
    if (!match || match.status !== 'PLAYING') return;
    try {
      const res = await pveApi.resignMatch(match.id);
      if (res.success) {
        setMatch(res.match);
      }
      return res;
    } catch (err) {
      setErrorMessage(err.message);
    }
  }, [match, pveApi]);

  return {
    match,
    isBotThinking,
    movePending,
    isPlayerTurn,
    isBoardLocked,
    errorMessage,
    startMatch,
    makeMove,
    resign,
  };
}
