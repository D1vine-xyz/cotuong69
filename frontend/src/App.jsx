import { useEffect, useRef, useState } from 'react';
import XiangqiBoard from './presentation/components/board/XiangqiBoard';
import { useMatch } from './application/hooks/useMatch';
import './styles.css';

function formatClock(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function PlayerCard({ player, color, active, time }) {
  const isRed = color === 'red';
  const clockIsLow = time <= 30;

  return (
    <section className={`player-card ${active ? 'is-active' : ''}`}>
      <div className={`player-avatar ${isRed ? 'red' : 'black'}`}>
        {player.name.slice(0, 1)}
      </div>
      <div className="player-details">
        <span className="player-side">
          <span className={`side-dot ${isRed ? 'red' : 'black'}`} />
          {isRed ? 'QUÂN ĐỎ' : 'QUÂN ĐEN'}
          {active && <span className="turn-chip">ĐANG ĐI</span>}
        </span>
        <strong>{player.name}</strong>
        <span className="player-rating">{player.rating} ELO</span>
      </div>
      <div className={`player-clock ${active ? 'clock-active' : ''} ${clockIsLow ? 'clock-low' : ''}`} aria-label={`Thời gian ${formatClock(time)}`}>
        <span className="clock-icon" aria-hidden="true">◷</span>
        {formatClock(time)}
      </div>
    </section>
  );
}

const CAPTURED_PIECE_NAMES = {
  general: 'Tướng',
  advisor: 'Sĩ',
  elephant: 'Tượng',
  horse: 'Mã',
  chariot: 'Xe',
  cannon: 'Pháo',
  soldier: 'Chốt',
};

const CAPTURED_PIECE_MARKS = {
  general: 'T',
  advisor: 'S',
  elephant: 'T',
  horse: 'M',
  chariot: 'X',
  cannon: 'P',
  soldier: 'C',
};

function CapturedTray({ color, pieces }) {
  return (
    <div className={`captured-tray captured-tray-${color}`} aria-label={`Quân ${color === 'red' ? 'Đỏ' : 'Đen'} đã bị bắt`}>
      <span className="captured-tray-label">{color === 'red' ? 'ĐỎ MẤT' : 'ĐEN MẤT'}</span>
      <div className="captured-tray-pieces">
        {pieces.length ? pieces.map((piece, index) => (
          <span
            key={`${piece.id}-${index}`}
            className={`captured-token ${piece.color}`}
            title={`${CAPTURED_PIECE_NAMES[piece.type]} ${color === 'red' ? 'Đỏ' : 'Đen'} đã bị bắt`}
            aria-label={`${CAPTURED_PIECE_NAMES[piece.type]} đã bị bắt`}
          >
            {CAPTURED_PIECE_MARKS[piece.type]}
          </span>
        )) : <span className="captured-tray-empty">Chưa mất quân</span>}
      </div>
      <strong>{pieces.length}</strong>
    </div>
  );
}

function playMoveSound(captured) {
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return;

  const audio = new AudioContextType();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = captured ? 520 : 660;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.17);
  oscillator.addEventListener('ended', () => audio.close());
}

function App() {
  const matchId = new URLSearchParams(window.location.search).get('matchId');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [perspectiveEnabled, setPerspectiveEnabled] = useState(false);
  const [captureEffect, setCaptureEffect] = useState(null);
  const [capturedPieces, setCapturedPieces] = useState({ red: [], black: [] });
  const previousMoveRef = useRef(undefined);
  const previousBoardRef = useRef(null);
  const captureEffectTimeoutRef = useRef(null);
  const {
    match,
    loading,
    error,
    color,
    readOnly,
    connected,
    movePending,
    moveError,
    sendMove,
    clearMoveError,
  } = useMatch(matchId);

  useEffect(() => {
    document.body.classList.toggle('match-view', Boolean(matchId));
    return () => document.body.classList.remove('match-view');
  }, [matchId]);

  const lastMove = match?.lastMove;
  const lastMoveKey = lastMove
    ? `${lastMove.color}:${lastMove.from}:${lastMove.to}:${Boolean(lastMove.captured)}`
    : null;

  useEffect(() => {
    if (!match) return;
    if (previousMoveRef.current === undefined) {
      previousMoveRef.current = lastMoveKey;
      previousBoardRef.current = match.board;
      return;
    }
    if (lastMoveKey && previousMoveRef.current !== lastMoveKey) {
      if (soundEnabled) playMoveSound(Boolean(lastMove.captured));
      if (lastMove.captured) {
        const capturedPiece = previousBoardRef.current?.find(
          (piece) => piece.position === lastMove.to && piece.color !== lastMove.color,
        );
        setCaptureEffect({ key: lastMoveKey, position: lastMove.to, capturedPiece });
        if (capturedPiece) {
          setCapturedPieces((current) => ({
            ...current,
            [capturedPiece.color]: [...current[capturedPiece.color], capturedPiece],
          }));
        }
        window.clearTimeout(captureEffectTimeoutRef.current);
        captureEffectTimeoutRef.current = window.setTimeout(() => {
          setCaptureEffect(null);
        }, 750);
      }
    }
    previousMoveRef.current = lastMoveKey;
    previousBoardRef.current = match.board;
  }, [lastMove, lastMoveKey, match, soundEnabled]);

  useEffect(() => () => window.clearTimeout(captureEffectTimeoutRef.current), []);

  useEffect(() => {
    if (!moveError) return undefined;
    const timeout = window.setTimeout(clearMoveError, 4000);
    return () => window.clearTimeout(timeout);
  }, [moveError, clearMoveError]);

  if (!matchId) {
    return null;
  }

  if (loading && !match) {
    return <main className="request-state" role="status">Đang tải trạng thái trận đấu…</main>;
  }

  if (!match) {
    return (
      <main className="request-state request-error" role="alert">
        <strong>Không tải được trận đấu {matchId}</strong>
        <span>{error || 'Máy chủ chưa trả về trạng thái Match.'}</span>
        <span>Hãy kiểm tra backend đang chạy tại địa chỉ trong `VITE_API_URL`.</span>
      </main>
    );
  }

  const isStarting = match.status === 'starting';
  const countdown = isStarting ? match.countdownSeconds : null;
  const currentTurn = isStarting ? null : match.currentTurn;
  const activePlayer = currentTurn === 'red' || currentTurn === 'black' ? currentTurn : null;
  const checkedColor = match.checkedColor ||
    (match.check === true || match.inCheck === true ? match.currentTurn : null);
  const checkedGeneral = checkedColor
    ? match.board.find((piece) => piece.type === 'general' && piece.color === checkedColor)
    : null;

  return (
    <main className="game-page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Cờ Tướng Online - Trang chủ">
          <span className="brand-mark" aria-hidden="true">棋</span>
          <span className="brand-name">Kỳ <b>Thủ</b></span>
        </a>
        <div className="topbar-divider" />
        <div className="room-label">
          <span className="breadcrumb-muted">Phòng đấu</span>
          <span className="breadcrumb-chevron">/</span>
          <strong>{match.roomName}</strong>
        </div>
        <div className="topbar-right">
          <span className="demo-indicator"><i /> BẢN XEM TRƯỚC</span>
          <span className="viewer-pill"><span aria-hidden="true">◉</span> {readOnly ? 'Khán giả' : `Quân ${color === 'red' ? 'Đỏ' : 'Đen'}`}</span>
          <details className="match-settings">
            <summary className="icon-button" aria-label="Cài đặt trận đấu" title="Cài đặt trận đấu">•••</summary>
            <div className="match-settings-panel">
              <label>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(event) => setSoundEnabled(event.target.checked)}
                />
                <span>
                  <strong>Âm thanh</strong>
                  <small>{soundEnabled ? 'Bật âm đi và ăn quân' : 'Đã tắt âm thanh'}</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={perspectiveEnabled}
                  onChange={(event) => setPerspectiveEnabled(event.target.checked)}
                />
                <span>
                  <strong>Góc nhìn phối cảnh</strong>
                  <small>{perspectiveEnabled ? 'Đang nghiêng nhẹ bàn cờ' : 'Đang nhìn thẳng'}</small>
                </span>
              </label>
            </div>
          </details>
        </div>
      </header>

      <div className="game-layout">
        <section className="match-column" aria-label="Trận đấu cờ tướng">
          <div className="match-heading">
            <div>
              <div className="eyebrow">TRẬN ĐẤU · {match.matchCode}</div>
              <h1>{match.title}</h1>
              <p>Trạng thái trận đấu được cập nhật từ máy chủ</p>
            </div>
            <div className={`match-status ${isStarting ? 'status-starting' : ''}`}>
              <span className="status-dot" />
              {isStarting ? 'SẮP BẮT ĐẦU' : match.status === 'active' ? 'ĐANG DIỄN RA' : match.status}
            </div>
          </div>

          {checkedColor && (
            <div className={`check-alert check-alert-${checkedColor}`} role="alert" aria-live="assertive">
              <span aria-hidden="true">!</span>
              <strong>Chiếu Tướng!</strong>
              <span>Tướng {checkedColor === 'red' ? 'Đỏ' : 'Đen'} đang bị chiếu.</span>
            </div>
          )}

          <div className={`board-shell ${perspectiveEnabled ? 'perspective-enabled' : ''}`}>
            <PlayerCard
              player={match.players.black}
              color="black"
              active={activePlayer === 'black'}
              time={match.clocks.black}
            />
            <XiangqiBoard
              pieces={match.board}
              countdown={countdown}
              readOnly={readOnly}
              playerColor={color}
              interactive={!readOnly && !isStarting && currentTurn === color && !movePending}
              movePending={movePending}
              orientation={color === 'black' ? 'black' : 'red'}
              checkedColor={checkedGeneral ? checkedColor : null}
              captureEffect={captureEffect}
              onMove={sendMove}
            />
            <PlayerCard
              player={match.players.red}
              color="red"
              active={activePlayer === 'red'}
              time={match.clocks.red}
            />
            <div className="captured-trays" aria-live="polite">
              <CapturedTray color="black" pieces={capturedPieces.black} />
              <CapturedTray color="red" pieces={capturedPieces.red} />
            </div>
          </div>

          {readOnly ? (
            <div className="spectator-note">
              <span className="spectator-icon" aria-hidden="true">◉</span>
              <span><strong>Bạn đang ở chế độ khán giả</strong><br />Bạn có thể xem toàn bộ bàn cờ nhưng không thể điều khiển quân.</span>
              <span className="spectator-lock" aria-hidden="true">⌑</span>
            </div>
          ) : (
            <div className="spectator-note player-instructions">
              <span className="spectator-icon" aria-hidden="true">♟</span>
              <span><strong>Bạn đang chơi bên {color === 'red' ? 'Đỏ' : 'Đen'}</strong><br />Chọn quân rồi chạm ô đích, hoặc kéo quân đến ô muốn đi.</span>
              <span className="spectator-lock" aria-hidden="true">{movePending ? 'Đang gửi nước đi…' : 'Không hiển thị gợi ý nước đi'}</span>
            </div>
          )}
          {moveError && <div className="move-alert" role="alert">{moveError}</div>}
        </section>

        <aside className="info-column">
          <section className="info-card turn-card">
            <div className="card-heading">
              <span className="heading-icon turn-icon" aria-hidden="true">↗</span>
              <h2>Lượt hiện tại</h2>
            </div>
            <div className={`turn-banner ${currentTurn === 'red' ? 'turn-red' : currentTurn === 'black' ? 'turn-black' : ''}`}>
              <span className={`turn-piece ${currentTurn === 'black' ? 'piece-black' : ''}`}>
                {currentTurn === 'black' ? '將' : '帥'}
              </span>
              <div>
                <strong>{isStarting ? 'Chuẩn bị khai cuộc' : currentTurn === 'red' ? 'Đỏ đi trước' : 'Đen đang đi'}</strong>
                <span>{isStarting ? 'Hai bên đã sẵn sàng' : `Lượt ${match.moveNumber}`}</span>
              </div>
              <span className="turn-pulse" />
            </div>
            <div className="turn-fact">
              <span>Bên đi trước</span><strong><i className="fact-red-dot" /> Đỏ</strong>
            </div>
            <div className="turn-fact">
            <span>Thời gian mỗi bên</span><strong>{formatClock(match.timeControlSeconds)}</strong>
            </div>
          </section>

          <section className="info-card match-info-card">
            <div className="card-heading">
              <span className="heading-icon detail-icon" aria-hidden="true">▤</span>
              <h2>Thông tin trận</h2>
            </div>
            <dl className="match-details">
              <div><dt>Chế độ</dt><dd><span className="mode-icon">♟</span> Đấu xếp hạng</dd></div>
              <div><dt>Thời gian</dt><dd>{formatClock(match.timeControlSeconds)} / bên</dd></div>
              <div><dt>Khán giả</dt><dd><span className="viewer-count">◉</span> {match.viewerCount} người</dd></div>
              <div><dt>Trạng thái</dt><dd><span className="detail-live-dot" /> {isStarting ? 'Đếm ngược' : 'Đỏ đi trước'}</dd></div>
            </dl>
          </section>

          <section className="info-card guide-card">
            <div className="card-heading">
              <span className="heading-icon guide-icon" aria-hidden="true">✦</span>
              <h2>Luật bàn cờ</h2>
            </div>
            <p>Bàn cờ gồm <strong>9 cột × 10 hàng</strong>. Hai bên bắt đầu với 16 quân và Đỏ luôn đi trước.</p>
            <div className="river-legend"><span /> <span>Sông phân cách hai chiến tuyến</span></div>
          </section>

          <div className={`connection-state ${error ? 'connection-error' : ''}`}>
            <span className={`connection-dot ${error ? 'error-dot' : ''}`} />
            {error ? 'Mất kết nối — đang thử lại' : connected ? 'Đã kết nối thời gian thực' : 'Đang kết nối thời gian thực'}
          </div>
        </aside>
      </div>
      <footer className="page-footer">
        <span>♟ &nbsp; KỲ THỦ ONLINE</span>
        <span>CHÚC CÁC KỲ THỦ CÓ MỘT VÁN CỜ HAY</span>
      </footer>
      {error && <div className="connection-banner" role="alert">Không thể cập nhật trận đấu: {error}</div>}
    </main>
  );
}

export default App;
