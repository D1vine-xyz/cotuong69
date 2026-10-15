/**
 * Unit & Integration Tests cho Task COT-597
 * Nghiệm thu theo đúng 4 tiêu chí chấp nhận (Acceptance Criteria) trong Jira Task Description
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { RoomApiService, ROOM_STATUS } = require('../js/api.js');

describe('Nghiệm thu Task COT-597: Giao diện Danh sách phòng và Tìm kiếm bằng mã 6 số', () => {

  // AC 1: Danh sách hiển thị đúng các Room Public và trạng thái
  test('AC 1.1: Trả về đầy đủ danh sách các Room Public khi khởi tạo', async () => {
    const api = new RoomApiService();
    const rooms = await api.getPublicRooms();

    assert.ok(Array.isArray(rooms), 'Danh sách phòng phải là một mảng');
    assert.strictEqual(rooms.length, 5, 'Phải có 5 phòng mẫu công khai ban đầu');

    // Kiểm tra các thuộc tính bắt buộc của mỗi room
    rooms.forEach(room => {
      assert.ok(room.code, 'Mỗi phòng phải có mã định danh code');
      assert.ok(room.name, 'Mỗi phòng phải có tên phòng');
      assert.ok(room.hostName, 'Mỗi phòng phải có tên chủ phòng');
      assert.ok(room.status in ROOM_STATUS, `Trạng thái [${room.status}] phải thuộc ROOM_STATUS`);
      assert.strictEqual(room.isPublic, true, 'Tất cả các phòng trong danh sách phải là Public');
    });
  });

  test('AC 1.2: Định nghĩa đầy đủ 4 trạng thái phòng theo đúng mô tả Jira', () => {
    assert.ok(ROOM_STATUS.WAITING_OPPONENT, 'Có trạng thái Đang chờ Đối thủ');
    assert.ok(ROOM_STATUS.FULL_PLAYERS, 'Có trạng thái Đã đủ hai người');
    assert.ok(ROOM_STATUS.PLAYING, 'Có trạng thái Đang diễn ra');
    assert.ok(ROOM_STATUS.WAITING_NEW_GAME, 'Có trạng thái Chờ ván mới');
    assert.ok(ROOM_STATUS.CLOSED, 'Có trạng thái Đã đóng');
  });

  // AC 2: Khi trạng thái thay đổi, giao diện/state cập nhật theo Backend
  test('AC 2.1: Khi phòng chuyển trạng thái PLAYING, phòng vẫn hiển thị trong danh sách', async () => {
    const api = new RoomApiService();
    let updatedEvent = null;

    api.onRealtimeUpdate(event => {
      updatedEvent = event;
    });

    // Giả lập backend cập nhật phòng 102938 từ WAITING_OPPONENT sang PLAYING
    api.emitRoomStateChange('102938', 'PLAYING', { playerCount: 2 });

    assert.ok(updatedEvent, 'Phải kích hoạt sự kiện realtime');
    assert.strictEqual(updatedEvent.type, 'ROOM_UPDATED');
    assert.strictEqual(updatedEvent.room.status, 'PLAYING');
    assert.strictEqual(updatedEvent.room.playerCount, 2);

    const publicRooms = await api.getPublicRooms();
    const updatedRoom = publicRooms.find(r => r.code === '102938');
    assert.ok(updatedRoom, 'Room đang diễn ra vẫn hiển thị nếu còn hoạt động');
    assert.strictEqual(updatedRoom.status, 'PLAYING');
  });

  test('AC 2.2: Khi phòng bị đóng (CLOSED), phòng tự động biến mất khỏi danh sách', async () => {
    const api = new RoomApiService();
    let closedEvent = null;

    api.onRealtimeUpdate(event => {
      closedEvent = event;
    });

    // Giả lập backend đóng phòng 334455
    api.emitRoomStateChange('334455', 'CLOSED');

    assert.ok(closedEvent, 'Phải kích hoạt sự kiện realtime khi phòng đóng');
    assert.strictEqual(closedEvent.type, 'ROOM_CLOSED');
    assert.strictEqual(closedEvent.roomCode, '334455');

    const publicRooms = await api.getPublicRooms();
    const room = publicRooms.find(r => r.code === '334455');
    assert.strictEqual(room, undefined, 'Room đóng phải tự biến mất khỏi danh sách');
  });

  // AC 3: Nhập đúng mã 6 số tham gia phòng thành công
  test('AC 3.1: Nhập đúng mã 6 số tham gia phòng thành công với vai trò PLAYER khi còn ghế', async () => {
    const api = new RoomApiService();
    const result = await api.joinRoomByCode('102938');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.room.code, '102938');
    assert.strictEqual(result.role, 'PLAYER', 'Phải được phân vai trò PLAYER khi phòng đang chờ đối thủ');
  });

  test('AC 3.2: Nhập đúng mã 6 số tham gia phòng thành công với vai trò SPECTATOR khi phòng đã đủ 2 người', async () => {
    const api = new RoomApiService();
    const result = await api.joinRoomByCode('654321');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.room.code, '654321');
    assert.strictEqual(result.role, 'SPECTATOR', 'Phải được phân vai trò SPECTATOR khi phòng đã đủ 2 người');
  });

  // AC 4: Hiển thị lỗi rõ ràng khi mã trống, sai định dạng, phòng không tồn tại hoặc đã đóng
  test('AC 4.1: Chặn và báo lỗi khi mã phòng để trống', async () => {
    const api = new RoomApiService();

    await assert.rejects(
      async () => { await api.joinRoomByCode(''); },
      { message: 'Mã phòng không được để trống.' }
    );
  });

  test('AC 4.2: Chặn và báo lỗi khi mã phòng sai định dạng (không đủ 6 số hoặc chứa chữ cái)', async () => {
    const api = new RoomApiService();

    // Dưới 6 số
    await assert.rejects(
      async () => { await api.joinRoomByCode('12345'); },
      { message: 'Mã phòng phải bao gồm đúng 6 chữ số (0-9).' }
    );

    // Chứa chữ cái
    await assert.rejects(
      async () => { await api.joinRoomByCode('12345A'); },
      { message: 'Mã phòng phải bao gồm đúng 6 chữ số (0-9).' }
    );

    // Quá 6 số
    await assert.rejects(
      async () => { await api.joinRoomByCode('1234567'); },
      { message: 'Mã phòng phải bao gồm đúng 6 chữ số (0-9).' }
    );
  });

  test('AC 4.3: Báo lỗi rõ ràng khi phòng không tồn tại trên hệ thống', async () => {
    const api = new RoomApiService();

    await assert.rejects(
      async () => { await api.joinRoomByCode('999999'); },
      { message: 'Phòng mang mã [999999] không tồn tại trên hệ thống.' }
    );
  });

  test('AC 4.4: Báo lỗi rõ ràng khi phòng đã đóng hoặc bị hủy', async () => {
    const api = new RoomApiService();
    // Đóng phòng 102938
    api.emitRoomStateChange('102938', 'CLOSED');

    await assert.rejects(
      async () => { await api.joinRoomByCode('102938'); },
      { message: 'Phòng [102938] đã đóng hoặc đã bị hủy.' }
    );
  });
});
