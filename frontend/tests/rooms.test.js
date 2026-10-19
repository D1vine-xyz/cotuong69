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

describe('Nghiệm thu Task COT-598: Code Modal Tạo phòng chơi (Công khai / Riêng tư)', () => {

  // AC 1: Form có Tên Room và lựa chọn Công khai/Riêng tư
  test('AC 1.1: Tạo phòng Công khai thành công và tự động hiển thị trên danh sách Public Rooms', async () => {
    const api = new RoomApiService();
    let realtimeEvent = null;

    api.onRealtimeUpdate(event => {
      realtimeEvent = event;
    });

    const res = await api.createRoom({
      name: 'Kỳ Phùng Địch Thủ',
      isPrivate: false
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.room.name, 'Kỳ Phùng Địch Thủ');
    assert.strictEqual(res.room.isPublic, true);
    assert.strictEqual(res.room.isPrivate, false);
    assert.strictEqual(res.room.status, 'WAITING_OPPONENT');
    assert.strictEqual(res.role, 'HOST');

    // Kiểm tra realtime event phát ra
    assert.ok(realtimeEvent, 'Phòng công khai phải phát sự kiện ROOM_CREATED cho sảnh chờ');
    assert.strictEqual(realtimeEvent.type, 'ROOM_CREATED');
    assert.strictEqual(realtimeEvent.room.code, res.room.code);

    // Kiểm tra phòng xuất hiện trong danh sách sảnh chờ
    const publicRooms = await api.getPublicRooms();
    const found = publicRooms.find(r => r.code === res.room.code);
    assert.ok(found, 'Phòng công khai phải có mặt trong getPublicRooms()');
  });

  test('AC 1.2: Tạo phòng Riêng tư thành công, có mật khẩu tùy chọn và ẩn khỏi danh sách Public Rooms', async () => {
    const api = new RoomApiService();

    const res = await api.createRoom({
      name: 'Phòng Thi Đấu Kín',
      isPrivate: true,
      password: 'secret_pin_123'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.room.name, 'Phòng Thi Đấu Kín');
    assert.strictEqual(res.room.isPublic, false);
    assert.strictEqual(res.room.isPrivate, true);
    assert.strictEqual(res.room.password, 'secret_pin_123');
    assert.strictEqual(res.role, 'HOST');

    // Kiểm tra phòng riêng tư KHÔNG xuất hiện trên danh sách public
    const publicRooms = await api.getPublicRooms();
    const found = publicRooms.find(r => r.code === res.room.code);
    assert.strictEqual(found, undefined, 'Phòng riêng tư không được xuất hiện trong danh sách Public Rooms');
  });

  // AC 2: Không gửi request nếu Tên Room để trống hoặc không hợp lệ
  test('AC 2.1: Chặn và từ chối khi Tên Room để trống, null, hoặc toàn khoảng trắng', async () => {
    const api = new RoomApiService();

    // Để trống chuỗi rỗng
    await assert.rejects(
      async () => { await api.createRoom({ name: '' }); },
      { message: 'Tên phòng không được để trống.', code: 'INVALID_NAME' }
    );

    // Toàn khoảng trắng
    await assert.rejects(
      async () => { await api.createRoom({ name: '     ' }); },
      { message: 'Tên phòng không được để trống.', code: 'INVALID_NAME' }
    );

    // Null hoặc undefined
    await assert.rejects(
      async () => { await api.createRoom({ name: null }); },
      { message: 'Tên phòng không được để trống.', code: 'INVALID_NAME' }
    );
    await assert.rejects(
      async () => { await api.createRoom({}); },
      { message: 'Tên phòng không được để trống.', code: 'INVALID_NAME' }
    );
  });

  test('AC 2.2: Chặn và từ chối khi Tên Room có độ dài không hợp lệ (< 3 hoặc > 50 ký tự)', async () => {
    const api = new RoomApiService();

    // Dưới 3 ký tự
    await assert.rejects(
      async () => { await api.createRoom({ name: 'AB' }); },
      { message: 'Tên phòng phải có độ dài từ 3 đến 50 ký tự.', code: 'INVALID_NAME_LENGTH' }
    );

    // Quá 50 ký tự
    const longName = 'A'.repeat(51);
    await assert.rejects(
      async () => { await api.createRoom({ name: longName }); },
      { message: 'Tên phòng phải có độ dài từ 3 đến 50 ký tự.', code: 'INVALID_NAME_LENGTH' }
    );
  });

  test('AC 2.3: Chặn tạo phòng khi người dùng chưa đăng nhập (Chỉ hiển thị/cho phép user đăng nhập)', async () => {
    const api = new RoomApiService();
    // Giả lập người dùng chưa đăng nhập
    api.setCurrentUser(null);

    await assert.rejects(
      async () => { await api.createRoom({ name: 'Phòng Vô Danh' }); },
      { message: 'Yêu cầu đăng nhập để tạo phòng.', code: 'UNAUTHORIZED' }
    );
  });

  // AC 3: Không tạo nhiều phòng do bấm liên tục (Chống duplicate request)
  test('AC 3.1: Đảm bảo mỗi lần tạo phòng thành công sinh ra 1 phòng duy nhất với mã code riêng biệt', async () => {
    const api = new RoomApiService();

    const [roomA, roomB] = await Promise.all([
      api.createRoom({ name: 'Bàn Đấu Alpha' }),
      api.createRoom({ name: 'Bàn Đấu Beta' })
    ]);

    assert.notStrictEqual(roomA.room.code, roomB.room.code, 'Hai phòng tạo ra phải có mã code khác nhau');
    assert.strictEqual(roomA.success, true);
    assert.strictEqual(roomB.success, true);
  });

  // AC 4: Tạo thành công đưa người dùng vào phòng với vai trò Chủ phòng
  test('AC 4.1: Người tạo phòng được gán vai trò Chủ phòng (HOST) và ghế Đối thủ đang trống', async () => {
    const api = new RoomApiService();

    const res = await api.createRoom({ name: 'Giao Lưu Cao Thủ' });

    assert.strictEqual(res.role, 'HOST');
    assert.strictEqual(res.room.status, 'WAITING_OPPONENT');
    assert.strictEqual(res.room.playerCount, 1);
    assert.strictEqual(res.room.maxPlayers, 2);
    assert.strictEqual(res.room.opponentId, null, 'Vị trí đối thủ phải là null (đang trống)');
    assert.strictEqual(res.room.opponentName, null, 'Tên đối thủ phải là null (chưa có người vào)');
  });

  test('AC 4.2: Mã phòng tạo ra phải đúng định dạng 6 chữ số và tìm kiếm/tham gia lại được', async () => {
    const api = new RoomApiService();

    const created = await api.createRoom({ name: 'Kiểm tra mã phòng 6 số' });
    const code = created.room.code;

    // Kiểm tra định dạng 6 chữ số
    assert.match(code, /^\d{6}$/, 'Mã phòng phải gồm đúng 6 chữ số (0-9)');

    // Kiểm tra người thứ 2 tham gia vào phòng vừa tạo bằng mã 6 số
    const joinRes = await api.joinRoomByCode(code);
    assert.strictEqual(joinRes.success, true);
    assert.strictEqual(joinRes.room.code, code);
    assert.strictEqual(joinRes.role, 'PLAYER', 'Người thứ hai tham gia phòng này được gán vai trò PLAYER');
  });
});

describe('Nghiệm thu Task COT-599: Giao diện Danh sách bạn bè và nút Chia sẻ liên kết mời phòng', () => {

  // AC 1: Danh sách bạn bè hiển thị đúng trạng thái Trực tuyến/Ngoại tuyến
  test('AC 1.1: Trả về danh sách bạn bè đầy đủ thông tin kèm trạng thái Trực tuyến/Ngoại tuyến', async () => {
    const api = new RoomApiService();
    const friends = await api.getFriendsList();

    assert.ok(Array.isArray(friends), 'Danh sách bạn bè phải là một mảng');
    assert.ok(friends.length >= 5, 'Phải có ít nhất 5 bạn bè mẫu');

    friends.forEach(friend => {
      assert.ok(friend.id, 'Mỗi bạn bè phải có ID');
      assert.ok(friend.displayName, 'Mỗi bạn bè phải có tên hiển thị');
      assert.ok(typeof friend.isOnline === 'boolean', 'Trạng thái isOnline phải là kiểu boolean');
      assert.ok(typeof friend.elo === 'number', 'Điểm Elo phải là số');
    });
  });

  test('AC 1.2: Phân loại chính xác bạn bè Trực tuyến (Online) và Ngoại tuyến (Offline)', async () => {
    const api = new RoomApiService();
    const friends = await api.getFriendsList();

    const onlineFriends = friends.filter(f => f.isOnline);
    const offlineFriends = friends.filter(f => !f.isOnline);

    assert.ok(onlineFriends.length > 0, 'Phải có bạn bè đang trực tuyến');
    assert.ok(offlineFriends.length > 0, 'Phải có bạn bè đang ngoại tuyến');
    assert.strictEqual(onlineFriends.length + offlineFriends.length, friends.length);
  });

  // AC 2: Gửi lời mời hiển thị đếm ngược 60 giây cho Chủ phòng
  test('AC 2.1: Gửi lời mời thành công tới bạn bè Trực tuyến với thời hạn đếm ngược 60s', async () => {
    const api = new RoomApiService();
    const friends = await api.getFriendsList();
    const onlineFriend = friends.find(f => f.isOnline);
    assert.ok(onlineFriend, 'Cần có ít nhất 1 bạn bè online');

    const res = await api.sendFriendInvitation(onlineFriend.id, '102938');

    assert.strictEqual(res.success, true);
    assert.ok(res.invitation, 'Phải trả về thông tin lời mời');
    assert.strictEqual(res.invitation.friendId, onlineFriend.id);
    assert.strictEqual(res.invitation.roomCode, '102938');
    assert.strictEqual(res.invitation.status, 'PENDING');
    assert.strictEqual(res.invitation.countdown, 60, 'Thời gian đếm ngược ban đầu phải là 60 giây');
    assert.ok(res.invitation.expiresAt > Date.now(), 'Thời điểm hết hạn phải lớn hơn hiện tại');
  });

  test('AC 2.2: Từ chối gửi lời mời khi bạn bè đang Ngoại tuyến (FRIEND_OFFLINE)', async () => {
    const api = new RoomApiService();
    const friends = await api.getFriendsList();
    const offlineFriend = friends.find(f => !f.isOnline);
    assert.ok(offlineFriend, 'Cần có bạn bè offline');

    await assert.rejects(
      async () => { await api.sendFriendInvitation(offlineFriend.id, '102938'); },
      { code: 'FRIEND_OFFLINE' }
    );
  });

  test('AC 2.3: Chủ phòng có thể chủ động hủy lời mời đang chờ', async () => {
    const api = new RoomApiService();
    const friends = await api.getFriendsList();
    const onlineFriend = friends.find(f => f.isOnline);

    const inviteRes = await api.sendFriendInvitation(onlineFriend.id, '102938');
    const invId = inviteRes.invitation.id;

    assert.ok(api.getPendingInvitation(invId), 'Lời mời phải tồn tại trước khi hủy');

    const cancelRes = await api.cancelFriendInvitation(invId);
    assert.strictEqual(cancelRes.success, true);
    assert.strictEqual(api.getPendingInvitation(invId), null, 'Lời mời phải bị xóa sau khi hủy');
  });

  // AC 3: Giao diện KHÔNG được khóa hay giữ trước vị trí Đối thủ
  test('AC 3.1: Sau khi gửi lời mời cho bạn bè, ghế Đối thủ vẫn hoàn toàn trống (không giữ chỗ)', async () => {
    const api = new RoomApiService();

    // Tạo 1 phòng cờ mới
    const created = await api.createRoom({ name: 'Bàn Đấu Mời Bạn' });
    const roomCode = created.room.code;

    // Gửi lời mời tới bạn bè online
    const friends = await api.getFriendsList();
    const onlineFriend = friends.find(f => f.isOnline);
    await api.sendFriendInvitation(onlineFriend.id, roomCode);

    // Kiểm tra thông tin phòng trong kho lưu trữ
    const publicRooms = await api.getPublicRooms();
    const room = publicRooms.find(r => r.code === roomCode);

    assert.ok(room, 'Phòng phải tồn tại');
    assert.strictEqual(room.opponentId, null, 'Vị trí đối thủ KHÔNG được gán trước cho bạn bè');
    assert.strictEqual(room.opponentName, null, 'Tên đối thủ KHÔNG được giữ chỗ');
    assert.strictEqual(room.playerCount, 1, 'Số kỳ thủ trong phòng vẫn là 1 người');

    // Người chơi bất kỳ khác vẫn có thể tham gia vào ghế Đối thủ (PLAYER)
    const strangerJoin = await api.joinRoomByCode(roomCode);
    assert.strictEqual(strangerJoin.success, true);
    assert.strictEqual(strangerJoin.role, 'PLAYER', 'Người khác vẫn vào được ghế PLAYER mà không bị chặn');
  });

  // AC 4: Sao chép link và mã phòng hoạt động tốt
  test('AC 4.1: Sinh mã phòng 6 số và URL mời phòng chuẩn cấu trúc', () => {
    const api = new RoomApiService();
    const share = api.generateShareLinks('102938');

    assert.strictEqual(share.code, '102938');
    assert.ok(share.url.includes('/room/102938'), 'Đường dẫn chia sẻ phải chứa /room/102938');
  });

  test('AC 4.2: Tích hợp đầy đủ các liên kết chia sẻ nhanh cho Facebook, Messenger và Zalo', () => {
    const api = new RoomApiService();
    const share = api.generateShareLinks('654321');

    assert.ok(share.facebookUrl.includes('facebook.com/sharer/sharer.php'), 'Có URL chia sẻ Facebook');
    assert.ok(share.facebookUrl.includes('654321'), 'URL Facebook chứa mã phòng');

    assert.ok(share.messengerUrl.includes('fb-messenger://share'), 'Có URL chia sẻ Messenger');
    assert.ok(share.messengerUrl.includes('654321'), 'URL Messenger chứa mã phòng');

    assert.ok(share.zaloUrl.includes('zalo.me/share'), 'Có URL chia sẻ Zalo');
    assert.ok(share.zaloUrl.includes('654321'), 'URL Zalo chứa mã phòng');
  });
});


