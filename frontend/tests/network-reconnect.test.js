/**
 * Unit & Integration Tests cho Task COT-601:
 * [2.4] [FE] Giao diện cảnh báo mạng chập chờn và đồng hồ đếm ngược kết nối lại.
 * 
 * Nghiệm thu theo đúng 3 tiêu chí chấp nhận (Acceptance Criteria) trong Jira Task Description:
 *  1. Hiển thị đúng trạng thái mất kết nối và đếm ngược 60 giây.
 *  2. Khóa thao tác đi quân khi đang mất kết nối.
 *  3. Giao diện không tự ý phân định người thắng/thua (kết quả do máy chủ trả về).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { ReconnectManager } = require('../src/domain/network/reconnectManager.js');

describe('Nghiệm thu Task COT-601: Giao diện cảnh báo mạng chập chờn và đồng hồ đếm ngược kết nối lại', () => {

  // AC 1: Hiển thị đúng trạng thái mất kết nối và đếm ngược 60 giây
  describe('AC 1: Hiển thị đúng trạng thái mất kết nối & đồng hồ đếm ngược', () => {

    test('AC 1.1: Khi chính người dùng mất kết nối, hiển thị overlay cảnh báo và khóa bàn cờ', () => {
      const manager = new ReconnectManager();
      assert.strictEqual(manager.getState().selfDisconnected, false);
      assert.strictEqual(manager.getState().overlay.visible, false);

      const overlay = manager.handleSelfDisconnect('NET_OFFLINE');
      const state = manager.getState();

      assert.strictEqual(state.selfDisconnected, true, 'Trạng thái bản thân phải là mất kết nối');
      assert.strictEqual(overlay.visible, true, 'Overlay cảnh báo mạng chập chờn phải hiển thị');
      assert.match(overlay.title, /Mạng chập chờn \/ Đang kết nối lại/i, 'Tiêu đề overlay phải đúng quy định Jira');
      assert.strictEqual(overlay.isLocked, true, 'Trạng thái khóa nước đi phải được kích hoạt');

      // Khi kết nối lại thành công
      manager.handleSelfReconnect();
      assert.strictEqual(manager.getState().selfDisconnected, false);
      assert.strictEqual(manager.getState().overlay.visible, false);
      manager.destroy();
    });

    test('AC 1.2: Khi đối thủ mất kết nối, hiển thị banner cảnh báo với thời gian chờ đếm ngược 60 giây', () => {
      const manager = new ReconnectManager({ maxWaitSeconds: 60 });
      const banner = manager.handleOpponentDisconnect({ player: 'black', countdownSeconds: 60 });
      const state = manager.getState();

      assert.strictEqual(state.opponentDisconnected, true, 'Trạng thái đối thủ phải là mất kết nối');
      assert.strictEqual(banner.visible, true, 'Banner cảnh báo đối thủ mất kết nối phải hiển thị');
      assert.match(banner.title, /Đối thủ đang mất kết nối\. Đang chờ kết nối lại/i, 'Nội dung banner đúng quy định Jira');
      assert.strictEqual(banner.countdown, 60, 'Thời gian đếm ngược ban đầu phải là 60 giây');
      assert.strictEqual(state.normalClockPaused, true, 'Đồng hồ lượt đi thông thường phải được tạm dừng');
      manager.destroy();
    });
  });

  // AC 2: Khóa thao tác đi quân khi đang mất kết nối
  describe('AC 2: Khóa thao tác đi quân khi đang mất kết nối', () => {

    test('AC 2.1: Khóa toàn bộ thao tác đi quân khi chính người dùng mất kết nối', () => {
      const manager = new ReconnectManager();
      assert.strictEqual(manager.canMakeMove(), true, 'Khi kết nối bình thường, được phép đi quân');

      manager.handleSelfDisconnect();
      assert.strictEqual(manager.canMakeMove(), false, 'Phải khóa thao tác đi quân khi bản thân mất kết nối');

      manager.handleSelfReconnect();
      assert.strictEqual(manager.canMakeMove(), true, 'Mở khóa đi quân sau khi kết nối lại');
      manager.destroy();
    });

    test('AC 2.2: Khóa thao tác đi quân khi đối thủ đang mất kết nối (ván đấu đang tạm dừng)', () => {
      const manager = new ReconnectManager();
      manager.handleOpponentDisconnect({ countdownSeconds: 60 });

      assert.strictEqual(manager.canMakeMove(), false, 'Phải khóa thao tác đi quân khi đối thủ đang mất kết nối');
      assert.strictEqual(manager.getState().canMove, false);

      manager.handleOpponentReconnect();
      assert.strictEqual(manager.canMakeMove(), true, 'Mở khóa đi quân khi đối thủ kết nối lại');
      manager.destroy();
    });
  });

  // AC 3: Tạm dừng đồng hồ và Giao diện không tự ý phân định người thắng/thua
  describe('AC 3: Tạm dừng đồng hồ và không tự ý phân định người thắng/thua', () => {

    test('AC 3.1: Tạm dừng hiển thị đồng hồ lượt đi thông thường khi đối thủ mất kết nối', () => {
      const manager = new ReconnectManager();
      manager.handleOpponentDisconnect({ countdownSeconds: 60 });

      assert.strictEqual(manager.getState().normalClockPaused, true, 'normalClockPaused phải là true');

      // Khi đối thủ kết nối lại
      manager.handleOpponentReconnect();
      assert.strictEqual(manager.getState().normalClockPaused, false, 'normalClockPaused phải chuyển về false');
      manager.destroy();
    });

    test('AC 3.2: Khi hết 60 giây, giao diện KHÔNG tự ý phân định người thắng/thua, chuyển sang chờ máy chủ', () => {
      const manager = new ReconnectManager({ maxWaitSeconds: 0 });
      // Giả lập timer chạy hết 60s
      manager.handleOpponentDisconnect({ countdownSeconds: 0 });

      const state = manager.getState();
      // TIÊU CHÍ QUAN TRỌNG: Giao diện KHÔNG tự phân định serverResult
      assert.strictEqual(state.serverResult, null, 'Giao diện không được tự ý gán người thắng/thua');
      assert.strictEqual(state.waitingServerResolution, true, 'Phải chuyển sang trạng thái chờ máy chủ xác nhận');

      const banner = manager.getBannerInfo();
      assert.strictEqual(banner.type, 'WAITING_SERVER');
      assert.match(banner.message, /Đang chờ máy chủ xác nhận kết quả/i);
      manager.destroy();
    });

    test('AC 3.3: Hiển thị đúng kết quả thắng/thua do máy chủ trả về khi máy chủ kết luận', () => {
      const manager = new ReconnectManager();
      manager.handleOpponentDisconnect({ countdownSeconds: 60 });

      // Máy chủ gửi kết quả kết thúc trận với lý do DISCONNECT_TIMEOUT
      const serverPayload = {
        winner: 'red',
        winnerColor: 'red',
        reason: 'DISCONNECT_TIMEOUT',
        message: 'Kỳ thủ bên Đỏ Thắng do đối thủ mất kết nối quá thời gian quy định (60 giây).',
      };

      const result = manager.handleServerMatchResult(serverPayload);
      const state = manager.getState();

      assert.ok(state.serverResult, 'Phải ghi nhận kết quả từ máy chủ');
      assert.strictEqual(state.serverResult.winner, 'red', 'Bên thắng phải đúng với máy chủ gửi về');
      assert.strictEqual(state.serverResult.reason, 'DISCONNECT_TIMEOUT', 'Lý do kết thúc trận đúng với máy chủ');
      assert.match(state.serverResult.message, /do đối thủ mất kết nối quá thời gian quy định/i);
      assert.strictEqual(manager.canMakeMove(), false, 'Ván đã kết thúc, không thể đi quân');
      manager.destroy();
    });

    test('AC 3.4: Khi đối thủ kết nối lại kịp thời trước 60 giây, banner tự tắt và ván đấu tiếp tục', () => {
      const manager = new ReconnectManager();
      manager.handleOpponentDisconnect({ countdownSeconds: 45 });

      assert.strictEqual(manager.getState().banner.visible, true);
      assert.strictEqual(manager.getState().normalClockPaused, true);

      // Đối thủ kết nối lại thành công
      const banner = manager.handleOpponentReconnect();
      assert.strictEqual(banner.visible, false, 'Banner phải tự động đóng khi đối thủ kết nối lại');
      assert.strictEqual(manager.getState().normalClockPaused, false, 'Đồng hồ trận đấu tiếp tục chạy bình thường');
      assert.strictEqual(manager.getState().opponentDisconnected, false);
      assert.strictEqual(manager.canMakeMove(), true, 'Quyền đi quân được khôi phục');
      manager.destroy();
    });
  });
});
