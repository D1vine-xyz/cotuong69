import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMatch, matchWebSocketUrl } from '../../infrastructure/api/matchApi';

export function useMatch(matchId) {
  const [state, setState] = useState({
    match: null,
    loading: true,
    error: null,
    color: null,
    readOnly: true,
    connected: false,
    movePending: false,
    moveError: null,
    moveResult: null,
  });
  const socketRef = useRef(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!matchId) {
      return undefined;
    }

    let cancelled = false;
    let retryTimeout;
    let retryDelay = 500;
    let controller = new AbortController();
    let socket;

    async function connect() {
      try {
        const match = await fetchMatch(matchId, { signal: controller.signal });
        if (cancelled) return;
        setState((current) => ({ ...current, match, loading: false, error: null }));

        socket = new WebSocket(matchWebSocketUrl(matchId));
        socketRef.current = socket;
        socket.addEventListener('open', () => {
          if (!cancelled) {
            retryDelay = 500;
            setState((current) => ({ ...current, connected: true, error: null }));
          }
        });
        socket.addEventListener('message', (event) => {
          if (cancelled) return;
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'welcome' || message.type === 'state') {
              setState((current) => ({
                ...current,
                match: message.state,
                color: message.color,
                readOnly: message.readOnly,
                loading: false,
                connected: true,
                error: null,
              }));
            } else if (message.type === 'moveResult') {
              pendingRef.current = false;
              setState((current) => ({
                ...current,
                movePending: false,
                moveError: message.accepted ? null : message.error,
                moveResult: message.accepted ? message : null,
                match: message.state || current.match,
              }));
            } else if (message.type === 'error') {
              setState((current) => ({ ...current, moveError: message.error }));
            }
          } catch (error) {
            setState((current) => ({
              ...current,
              error: `Phản hồi máy chủ không hợp lệ: ${error.message}`,
            }));
          }
        });
        socket.addEventListener('close', () => {
          if (cancelled) return;
          socketRef.current = null;
          pendingRef.current = false;
          setState((current) => ({
            ...current,
            connected: false,
            movePending: false,
            error: 'Mất kết nối thời gian thực — đang kết nối lại.',
          }));
          retryTimeout = window.setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 5000);
        });
        socket.addEventListener('error', () => {
          if (!cancelled) {
            setState((current) => ({
              ...current,
              error: 'Không thể kết nối tới máy chủ thời gian thực.',
            }));
          }
        });
      } catch (error) {
        if (!cancelled && error.name !== 'AbortError') {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message || 'Không thể kết nối tới máy chủ trận đấu.',
          }));
          retryTimeout = window.setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 5000);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimeout);
      controller.abort();
      socket?.close();
      socketRef.current = null;
      pendingRef.current = false;
    };
  }, [matchId]);

  const sendMove = useCallback((from, to) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || pendingRef.current) return false;
    pendingRef.current = true;
    setState((current) => ({ ...current, movePending: true, moveError: null, moveResult: null }));
    socket.send(JSON.stringify({ type: 'move', from, to }));
    return true;
  }, []);

  const clearMoveError = useCallback(() => {
    setState((current) => ({ ...current, moveError: null }));
  }, []);

  return { ...state, sendMove, clearMoveError };
}
