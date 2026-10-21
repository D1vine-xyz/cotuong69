/**
 * Unit & Integration Tests cho Task COT-602:
 * [2.4] [FE] Tích hợp logic tải lại dữ liệu bàn cờ và vẽ lại trạng thái ván cờ khi Reconnect.
 *
 * Nghiệm thu theo đúng các Tiêu chí chấp nhận (Acceptance Criteria) trong Jira Task Description:
 *  1. Bàn cờ và quân bị ăn dựng đúng theo snapshot từ máy chủ.
 *  2. Đồng hồ lượt đi tiếp tục từ số giây chính thức.
 *  3. Không bị nhảy quân hay mất trạng thái khi tải lại.
 *  4. Nhận diện trạng thái Chiếu và xác định Tướng bị chiếu để kích hoạt viền đỏ cảnh báo.
 *  5. Đóng toàn bộ overlay cảnh báo và mở lại tương tác cho người chơi đang tới lượt.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { BoardSyncManager } = require('../src/domain/game/boardSyncManager.js');
const { ReconnectManager } = require('../src/domain/network/reconnectManager.js');

describe('Nghiệm thu Task COT-602: Tải lại dữ liệu bàn cờ và vẽ lại trạng thái ván cờ khi Reconnect', () => {

  // AC 1: Bàn cờ và quân bị ăn dựng đúng theo snapshot từ máy chủ
  describe('AC 1: Dựng lại bàn cờ và quân bị ăn từ snapshot máy chủ', () => {

    test('AC 1.1: Phục hồi bàn cờ đầy đủ 32 quân từ snapshot ban đầu', () => {
      const initialBoard = [
        { id: 'r_r1', type: 'chariot', color: 'red', position: 'a0' },
        { id: 'r_h1', type: 'horse', color: 'red', position: 'b0' },
        { id: 'r_e1', type: 'elephant', color: 'red', position: 'c0' },
        { id: 'r_a1', type: 'advisor', color: 'red', position: 'd0' },
        { id: 'r_k', type: 'general', color: 'red', position: 'e0' },
        { id: 'r_a2', type: 'advisor', color: 'red', position: 'f0' },
        { id: 'r_e2', type: 'elephant', color: 'red', position: 'g0' },
        { id: 'r_h2', type: 'horse', color: 'red', position: 'h0' },
        { id: 'r_r2', type: 'chariot', color: 'red', position: 'i0' },
        { id: 'r_c1', type: 'cannon', color: 'red', position: 'b2' },
        { id: 'r_c2', type: 'cannon', color: 'red', position: 'h2' },
        { id: 'r_p1', type: 'soldier', color: 'red', position: 'a3' },
        { id: 'r_p2', type: 'soldier', color: 'red', position: 'c3' },
        { id: 'r_p3', type: 'soldier', color: 'red', position: 'e3' },
        { id: 'r_p4', type: 'soldier', color: 'red', position: 'g3' },
        { id: 'r_p5', type: 'soldier', color: 'red', position: 'i3' },

        { id: 'b_r1', type: 'chariot', color: 'black', position: 'a9' },
        { id: 'b_h1', type: 'horse', color: 'black', position: 'b9' },
        { id: 'b_e1', type: 'elephant', color: 'black', position: 'c9' },
        { id: 'b_a1', type: 'advisor', color: 'black', position: 'd9' },
        { id: 'b_k', type: 'general', color: 'black', position: 'e9' },
        { id: 'b_a2', type: 'advisor', color: 'black', position: 'f9' },
        { id: 'b_e2', type: 'elephant', color: 'black', position: 'g9' },
        { id: 'b_h2', type: 'horse', color: 'black', position: 'h9' },
        { id: 'b_r2', type: 'chariot', color: 'black', position: 'i9' },
        { id: 'b_c1', type: 'cannon', color: 'black', position: 'b7' },
        { id: 'b_c2', type: 'cannon', color: 'black', position: 'h7' },
        { id: 'b_p1', type: 'soldier', color: 'black', position: 'a6' },
        { id: 'b_p2', type: 'soldier', color: 'black', position: 'c6' },
        { id: 'b_p3', type: 'soldier', color: 'black', position: 'e6' },
        { id: 'b_p4', type: 'soldier', color: 'black', position: 'g6' },
        { id: 'b_p5', type: 'soldier', color: 'black', position: 'i6' },
      ];

      const snapshot = {
        matchId: 'MATCH-COT-602-1',
        board: initialBoard,
        currentTurn: 'red',
        clocks: { red: 300, black: 300 },
      };

      const restored = BoardSyncManager.restoreFromSnapshot(snapshot);
      assert.ok(restored, 'Phục hồi snapshot thành công');
      assert.strictEqual(restored.board.length, 32, 'Phải có đủ 32 quân');
      assert.strictEqual(restored.capturedPieces.red.length, 0, 'Chưa có quân Đỏ nào bị bắt');
      assert.strictEqual(restored.capturedPieces.black.length, 0, 'Chưa có quân Đen nào bị bắt');
      assert.strictEqual(restored.currentTurn, 'red');
    });

    test('AC 1.2: Dựng lại danh sách quân bị ăn từ snapshot máy chủ có capturedPieces', () => {
      const snapshot = {
        matchId: 'MATCH-COT-602-2',
        board: [
          { id: 'r_k', type: 'general', color: 'red', position: 'e0' },
          { id: 'b_k', type: 'general', color: 'black', position: 'e9' },
        ],
        capturedPieces: {
          red: [{ id: 'cap_r1', type: 'chariot', color: 'red' }],
          black: [{ id: 'cap_b1', type: 'cannon', color: 'black' }, { id: 'cap_b2', type: 'horse', color: 'black' }],
        },
        currentTurn: 'black',
      };

      const restored = BoardSyncManager.restoreFromSnapshot(snapshot);
      assert.strictEqual(restored.board.length, 2);
      assert.strictEqual(restored.capturedPieces.red.length, 1);
      assert.strictEqual(restored.capturedPieces.red[0].type, 'chariot');
      assert.strictEqual(restored.capturedPieces.black.length, 2);
      assert.strictEqual(restored.capturedPieces.black[0].type, 'cannon');
      assert.strictEqual(restored.capturedPieces.black[1].type, 'horse');
    });

    test('AC 1.3: Tự động tính toán quân bị ăn chính xác khi snapshot thiếu trường capturedPieces', () => {
      // Bàn cờ thiếu 1 xe Đỏ ('chariot') và 2 tốt Đen ('soldier')
      const boardWithoutSomePieces = [
        // Red có 1 general, 1 chariot (thiếu 1 chariot)
        { id: 'r_k', type: 'general', color: 'red', position: 'e0' },
        { id: 'r_r1', type: 'chariot', color: 'red', position: 'a0' },
        // Black có 1 general, 3 soldiers (thiếu 2 soldiers)
        { id: 'b_k', type: 'general', color: 'black', position: 'e9' },
        { id: 'b_p1', type: 'soldier', color: 'black', position: 'a6' },
        { id: 'b_p2', type: 'soldier', color: 'black', position: 'c6' },
        { id: 'b_p3', type: 'soldier', color: 'black', position: 'e6' },
      ];

      const snapshot = {
        matchId: 'MATCH-COT-602-3',
        board: boardWithoutSomePieces,
        currentTurn: 'red',
      };

      const restored = BoardSyncManager.restoreFromSnapshot(snapshot);
      assert.strictEqual(restored.capturedPieces.red.some((p) => p.type === 'chariot'), true, 'Phải nhận diện thiếu 1 xe Đỏ');
      const missingBlackSoldiers = restored.capturedPieces.black.filter((p) => p.type === 'soldier');
      assert.strictEqual(missingBlackSoldiers.length, 2, 'Phải nhận diện thiếu 2 tốt Đen');
    });
  });

  // AC 2: Đồng hồ lượt đi tiếp tục từ số giây chính thức do máy chủ cung cấp
  describe('AC 2: Khôi phục đồng hồ lượt đi chính xác từ máy chủ', () => {

    test('AC 2.1: Đồng hồ lượt đi và turnRemainingSeconds tiếp tục từ giây chính thức', () => {
      const snapshot = {
        matchId: 'MATCH-COT-602-4',
        board: [],
        currentTurn: 'black',
        turnRemainingSeconds: 42,
        clocks: { red: 280, black: 245 },
      };

      const restored = BoardSyncManager.restoreFromSnapshot(snapshot);
      assert.strictEqual(restored.turnRemainingSeconds, 42, 'turnRemainingSeconds phải bằng 42');
      assert.strictEqual(restored.clocks.red, 280, 'Đồng hồ Đỏ phải tiếp tục từ 280s');
      assert.strictEqual(restored.clocks.black, 245, 'Đồng hồ Đen phải tiếp tục từ 245s');
      assert.strictEqual(restored.currentTurn, 'black', 'Bên đang tới lượt phải là Đen');
    });

    test('AC 2.2: Đồng bộ remainingClocks nếu snapshot sử dụng cấu trúc remainingClocks', () => {
      const snapshot = {
        matchId: 'MATCH-COT-602-5',
        board: [],
        currentTurn: 'red',
        remainingClocks: { red: 115, black: 190 },
      };

      const restored = BoardSyncManager.restoreFromSnapshot(snapshot);
      assert.strictEqual(restored.clocks.red, 115);
      assert.strictEqual(restored.clocks.black, 190);
    });
  });

  // AC 3: Không bị nhảy quân hay mất trạng thái khi tải lại
  describe('AC 3: Đảm bảo tính toàn vẹn vị trí quân và không mất trạng thái', () => {

    test('AC 3.1: Vị trí và danh tính các quân cờ được bảo toàn tuyệt đối không bị nhảy quân', () => {
      const complexBoard = [
        { id: 'r_k', type: 'general', color: 'red', position: 'd1' },
        { id: 'r_h1', type: 'horse', color: 'red', position: 'e4' },
        { id: 'r_c1', type: 'cannon', color: 'red', position: 'e2' },
        { id: 'b_k', type: 'general', color: 'black', position: 'e8' },
        { id: 'b_r1', type: 'chariot', color: 'black', position: 'd8' },
      ];

      const snapshot = {
        matchId: 'MATCH-COT-602-6',
        board: complexBoard,
        currentTurn: 'red',
        lastMove: { from: 'c3', to: 'e4', piece: 'r_h1', color: 'red', captured: null },
      };

      const restored = BoardSyncManager.restoreFromSnapshot(snapshot);
      assert.deepStrictEqual(restored.board, complexBoard, 'Mảng quân cờ phải trùng khớp 100%');
      assert.strictEqual(restored.lastMove.to, 'e4', 'Nước đi cuối cùng lastMove được lưu giữ');
      assert.strictEqual(restored.pieceCount, 5, 'Số lượng quân cờ là 5');
    });
  });

  // AC 4: Nhận diện trạng thái Chiếu và xác định Tướng bị chiếu
  describe('AC 4: Nhận diện trạng thái Chiếu và vị trí Tướng bị chiếu', () => {

    test('AC 4.1: Kích hoạt viền đỏ cảnh báo khi Tướng Đen bị chiếu', () => {
      const boardWithCheck = [
        { id: 'r_k', type: 'general', color: 'red', position: 'e0' },
        { id: 'r_c1', type: 'cannon', color: 'red', position: 'e5' },
        { id: 'b_k', type: 'general', color: 'black', position: 'e9' },
      ];

      const snapshot = {
        matchId: 'MATCH-COT-602-7',
        board: boardWithCheck,
        currentTurn: 'black',
        inCheck: true,
        checkedColor: 'black',
      };

      const restored = BoardSyncManager.restoreFromSnapshot(snapshot);
      assert.strictEqual(restored.inCheck, true, 'inCheck phải là true');
      assert.strictEqual(restored.checkedColor, 'black', 'Bên bị chiếu là black');
      assert.ok(restored.checkedGeneral, 'Phải tìm thấy quân Tướng bị chiếu');
      assert.strictEqual(restored.checkedGeneral.id, 'b_k', 'Tướng bị chiếu là b_k');
      assert.strictEqual(restored.checkedGeneral.position, 'e9', 'Vị trí Tướng bị chiếu là e9 để gắn viền đỏ');
    });

    test('AC 4.2: Khi không bị chiếu, checkedGeneral là null và không có viền cảnh báo', () => {
      const normalSnapshot = {
        matchId: 'MATCH-COT-602-8',
        board: [
          { id: 'r_k', type: 'general', color: 'red', position: 'e0' },
          { id: 'b_k', type: 'general', color: 'black', position: 'e9' },
        ],
        currentTurn: 'red',
        inCheck: false,
      };

      const restored = BoardSyncManager.restoreFromSnapshot(normalSnapshot);
      assert.strictEqual(restored.inCheck, false);
      assert.strictEqual(restored.checkedColor, null);
      assert.strictEqual(restored.checkedGeneral, null);
    });
  });

  // AC 5: Đóng toàn bộ overlay cảnh báo và mở lại tương tác cho người chơi đang tới lượt
  describe('AC 5: Đóng overlay và phục hồi tương tác người chơi', () => {

    test('AC 5.1: Sau khi Reconnect thành công, đóng overlay cảnh báo và mở khóa nước đi', () => {
      const reconnectMgr = new ReconnectManager();

      // Giả lập đang bị mất mạng (overlay hiển thị, bàn cờ bị khóa)
      reconnectMgr.handleSelfDisconnect('WS_DISCONNECTED');
      assert.strictEqual(reconnectMgr.getState().overlay.visible, true);
      assert.strictEqual(reconnectMgr.canMakeMove(), false);

      // Nhận sự kiện reconnectState -> phục hồi
      reconnectMgr.handleSelfReconnect();

      const finalState = reconnectMgr.getState();
      assert.strictEqual(finalState.selfDisconnected, false, 'Trạng thái mất mạng bản thân đã tắt');
      assert.strictEqual(finalState.overlay.visible, false, 'Overlay cảnh báo đã đóng');
      assert.strictEqual(reconnectMgr.canMakeMove(), true, 'Đã mở lại tương tác đi quân cho người chơi');
      reconnectMgr.destroy();
    });
  });
});
