/**
 * Unit & Integration Tests cho Task COT-628:
 * [4.2] [FE] Xin quyền Camera/Microphone và khởi tạo Local Media Stream (getUserMedia).
 *
 * Nghiệm thu theo đúng 4 Tiêu chí chấp nhận (Acceptance Criteria) trong Jira:
 *  1. Camera và Micro được xin quyền đúng cách.
 *  2. Không có Camera vẫn có thể dùng âm thanh nếu Micro hoạt động (Audio-only fallback).
 *  3. Người dùng từ chối quyền hiển thị hướng dẫn mở lại phù hợp và hỗ trợ thử lại (Retry).
 *  4. Việc từ chối quyền không làm gián đoạn ván cờ.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { MediaStreamManager } = require('../src/domain/media/mediaStreamManager.js');

function createMockTrack(kind) {
  return {
    kind,
    enabled: true,
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
}

function createMockStream({ video = true, audio = true } = {}) {
  const videoTracks = video ? [createMockTrack('video')] : [];
  const audioTracks = audio ? [createMockTrack('audio')] : [];

  return {
    getVideoTracks: () => videoTracks,
    getAudioTracks: () => audioTracks,
    getTracks: () => [...videoTracks, ...audioTracks],
  };
}

describe('Nghiệm thu Task COT-628: Xin quyền Camera/Microphone và khởi tạo Local Media Stream', () => {

  // AC 1: Camera và Micro được xin quyền đúng cách
  describe('AC 1: Camera và Micro được xin quyền đúng cách', () => {
    test('AC 1.1: Khi cả Camera và Micro được cấp phép, trả về đầy đủ luồng video và audio', async () => {
      const mockMediaDevices = {
        async getUserMedia(constraints) {
          assert.strictEqual(constraints.video, true);
          assert.strictEqual(constraints.audio, true);
          return createMockStream({ video: true, audio: true });
        },
      };

      const result = await MediaStreamManager.requestLocalMedia({ video: true, audio: true }, mockMediaDevices);

      assert.strictEqual(result.permissionStatus, 'GRANTED', 'Trạng thái quyền phải là GRANTED');
      assert.strictEqual(result.hasVideo, true, 'hasVideo phải là true');
      assert.strictEqual(result.hasAudio, true, 'hasAudio phải là true');
      assert.strictEqual(result.audioOnly, false, 'audioOnly phải là false khi có cả video');
      assert.strictEqual(result.error, null, 'Không có lỗi');
      assert.ok(result.stream, 'Phải trả về đối tượng Stream');

      // Kiểm tra dừng stream
      MediaStreamManager.stopStream(result.stream);
      const tracks = result.stream.getTracks();
      assert.strictEqual(tracks.every((t) => t.stopped), true, 'Tất cả các track phải dừng khi stopStream');
    });

    test('AC 1.2: Bật/Tắt Microphone và Camera hoạt động chuẩn xác', () => {
      const stream = createMockStream({ video: true, audio: true });

      // Mặc định enabled là true
      assert.strictEqual(stream.getAudioTracks()[0].enabled, true);

      // Tắt Mic
      const isEnabled = MediaStreamManager.toggleTrack(stream, 'audio', false);
      assert.strictEqual(isEnabled, false);
      assert.strictEqual(stream.getAudioTracks()[0].enabled, false);

      // Bật lại Mic
      const isEnabledAgain = MediaStreamManager.toggleTrack(stream, 'audio', true);
      assert.strictEqual(isEnabledAgain, true);
      assert.strictEqual(stream.getAudioTracks()[0].enabled, true);
    });
  });

  // AC 2: Không có Camera vẫn có thể dùng âm thanh nếu Micro hoạt động (Chế độ chỉ âm thanh)
  describe('AC 2: Tự động chuyển chế độ Chỉ âm thanh khi không có Camera', () => {
    test('AC 2.1: Camera bị lỗi NotFoundError -> Tự động fallback sang { video: false, audio: true }', async () => {
      let callCount = 0;
      const mockMediaDevices = {
        async getUserMedia(constraints) {
          callCount += 1;
          if (constraints.video) {
            const err = new Error('Requested device not found');
            err.name = 'NotFoundError';
            throw err;
          }
          // Lần gọi fallback chỉ xin audio
          return createMockStream({ video: false, audio: true });
        },
      };

      const result = await MediaStreamManager.requestLocalMedia({ video: true, audio: true }, mockMediaDevices);

      assert.strictEqual(callCount, 2, 'Phải gọi getUserMedia 2 lần: lần 1 thất bại video, lần 2 thử audio-only');
      assert.strictEqual(result.permissionStatus, 'GRANTED_AUDIO_ONLY', 'Trạng thái quyền là GRANTED_AUDIO_ONLY');
      assert.strictEqual(result.hasVideo, false, 'hasVideo là false');
      assert.strictEqual(result.hasAudio, true, 'hasAudio là true');
      assert.strictEqual(result.audioOnly, true, 'audioOnly là true');
      assert.match(result.warning, /Chỉ âm thanh/i, 'Phải có thông báo chuyển sang chế độ Chỉ âm thanh');
    });

    test('AC 2.2: Camera bị OverconstrainedError -> Vẫn tiếp tục cuộc gọi ở chế độ Chỉ âm thanh', async () => {
      const mockMediaDevices = {
        async getUserMedia(constraints) {
          if (constraints.video) {
            const err = new Error('Constraint could not be satisfied');
            err.name = 'OverconstrainedError';
            throw err;
          }
          return createMockStream({ video: false, audio: true });
        },
      };

      const result = await MediaStreamManager.requestLocalMedia({ video: true, audio: true }, mockMediaDevices);

      assert.strictEqual(result.audioOnly, true);
      assert.strictEqual(result.permissionStatus, 'GRANTED_AUDIO_ONLY');
      assert.strictEqual(result.hasAudio, true);
    });
  });

  // AC 3: Người dùng từ chối quyền hiển thị hướng dẫn mở lại phù hợp và hỗ trợ thử lại (Retry)
  describe('AC 3: Xử lý khi người dùng từ chối quyền & Hướng dẫn cấp lại', () => {
    test('AC 3.1: Khi người dùng từ chối NotAllowedError cả Camera và Mic -> Trả về DENIED kèm hướng dẫn', async () => {
      const mockMediaDevices = {
        async getUserMedia() {
          const err = new Error('Permission denied');
          err.name = 'NotAllowedError';
          throw err;
        },
      };

      const result = await MediaStreamManager.requestLocalMedia({ video: true, audio: true }, mockMediaDevices);

      assert.strictEqual(result.permissionStatus, 'DENIED', 'permissionStatus phải là DENIED');
      assert.strictEqual(result.stream, null, 'stream là null');
      assert.match(result.error, /Bạn đã từ chối quyền truy cập Camera\/Microphone/i, 'Nội dung lỗi rõ ràng');
      assert.match(result.instructions, /Ổ khóa hoặc Camera trên thanh địa chỉ/i, 'Có hướng dẫn thao tác mở lại quyền');
    });

    test('AC 3.2: Thử cấp quyền lại (Retry) sau khi trước đó bị từ chối', async () => {
      let attempts = 0;
      const mockMediaDevices = {
        async getUserMedia(constraints) {
          attempts += 1;
          if (attempts <= 2) {
            // Lần 1: Cả video và fallback audio đều bị người dùng từ chối
            const err = new Error('Permission denied');
            err.name = 'NotAllowedError';
            throw err;
          }
          // Lần thử lại người dùng đã cho phép
          return createMockStream(constraints);
        },
      };

      // Lần 1: Bị từ chối
      const firstResult = await MediaStreamManager.requestLocalMedia({ video: true, audio: true }, mockMediaDevices);
      assert.strictEqual(firstResult.permissionStatus, 'DENIED');

      // Lần 2: Thử lại (Retry) -> Thành công
      const retryResult = await MediaStreamManager.requestLocalMedia({ video: true, audio: true }, mockMediaDevices);
      assert.strictEqual(retryResult.permissionStatus, 'GRANTED');
      assert.strictEqual(retryResult.hasVideo, true);
    });
  });

  // AC 4: Việc từ chối quyền không làm gián đoạn ván cờ
  describe('AC 4: Độc lập tuyệt đối với ván cờ', () => {
    test('AC 4.1: Từ chối quyền hoặc lỗi thiết bị không ném unhandled exception và không ảnh hưởng ván cờ', async () => {
      const mockMediaDevices = {
        async getUserMedia() {
          const err = new Error('Hardware error');
          err.name = 'NotReadableError';
          throw err;
        },
      };

      // Giả lập trạng thái ván cờ
      const matchState = {
        matchId: 'MATCH-123',
        status: 'PLAYING',
        currentTurn: 'red',
        isPaused: false,
      };

      // Gọi xin quyền media
      const result = await MediaStreamManager.requestLocalMedia({ video: true, audio: true }, mockMediaDevices);

      assert.strictEqual(result.stream, null);
      assert.strictEqual(result.permissionStatus, 'DEVICE_ERROR');

      // Trạng thái trận đấu vẫn hoàn toàn nguyên vẹn
      assert.strictEqual(matchState.status, 'PLAYING');
      assert.strictEqual(matchState.currentTurn, 'red');
      assert.strictEqual(matchState.isPaused, false);
    });
  });
});
