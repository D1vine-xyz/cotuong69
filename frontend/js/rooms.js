/**
 * Kỳ Đạo Online - Room Controller & UI Logic (COT-597)
 * Điều khiển hiển thị danh sách phòng, validation form tìm kiếm 6 số, và điều hướng.
 */

document.addEventListener('DOMContentLoaded', () => {
  const apiService = new window.RoomApiService();

  // State quản lý phòng ở Client
  let currentRooms = [];
  let activeFilter = 'ALL';
  let searchQuery = '';

  // DOM Elements
  const roomsGrid = document.getElementById('roomsGrid');
  const roomsLoading = document.getElementById('roomsLoading');
  const roomsEmpty = document.getElementById('roomsEmpty');
  const totalRoomsCountEl = document.getElementById('totalRoomsCount');
  const waitingRoomsCountEl = document.getElementById('waitingRoomsCount');
  const refreshRoomsBtn = document.getElementById('refreshRoomsBtn');
  const filterSearchInput = document.getElementById('filterSearchInput');
  const filterTabsContainer = document.getElementById('statusFilterTabs');
  
  // Join by code elements
  const joinCodeForm = document.getElementById('joinCodeForm');
  const roomCodeInput = document.getElementById('roomCodeInput');
  const joinBtn = document.getElementById('joinBtn');
  const codeErrorMessage = document.getElementById('codeErrorMessage');

  // Counts Elements
  const countAllEl = document.getElementById('countAll');
  const countWaitingEl = document.getElementById('countWaiting');
  const countFullEl = document.getElementById('countFull');
  const countPlayingEl = document.getElementById('countPlaying');
  const countRematchEl = document.getElementById('countRematch');

  // Modal Elements
  const roomModal = document.getElementById('roomModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalRoomCode = document.getElementById('modalRoomCode');
  const modalHostName = document.getElementById('modalHostName');
  const modalRoomStatus = document.getElementById('modalRoomStatus');
  const modalUserRole = document.getElementById('modalUserRole');
  const modalRoleNotice = document.getElementById('modalRoleNotice');
  const enterRoomBtn = document.getElementById('enterRoomBtn');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  /**
   * Khởi tạo ứng dụng
   */
  async function init() {
    setupEventListeners();
    await loadRooms();
    setupRealtimeSubscription();
  }

  /**
   * Đăng ký các sự kiện người dùng
   */
  function setupEventListeners() {
    // Form tham gia bằng mã 6 số
    joinCodeForm.addEventListener('submit', handleJoinByCodeSubmit);

    // Validate realtime khi người dùng nhập mã phòng
    roomCodeInput.addEventListener('input', (e) => {
      // Chỉ cho phép nhập ký tự số
      e.target.value = e.target.value.replace(/\D/g, '');
      clearInputError();
    });

    // Nút làm mới danh sách
    refreshRoomsBtn.addEventListener('click', async () => {
      refreshRoomsBtn.classList.add('rotating');
      await loadRooms();
      showToast('Đã làm mới danh sách phòng chơi!', 'success');
      setTimeout(() => refreshRoomsBtn.classList.remove('rotating'), 600);
    });

    // Lọc theo từ khóa tìm kiếm
    filterSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderRooms();
    });

    // Bộ lọc theo trạng thái phòng
    filterTabsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.filter-tab');
      if (!tab) return;

      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      activeFilter = tab.getAttribute('data-filter');
      renderRooms();
    });

    // Đóng Modal
    closeModalBtn.addEventListener('click', closeModal);
    roomModal.addEventListener('click', (e) => {
      if (e.target === roomModal) closeModal();
    });

    enterRoomBtn.addEventListener('click', () => {
      showToast('Đang chuyển hướng vào bàn cờ...', 'success');
      setTimeout(() => {
        closeModal();
      }, 1000);
    });
  }

  /**
   * Tải danh sách phòng từ API Service
   * Tiêu chí chấp nhận 1: Danh sách hiển thị đúng các Room Public và trạng thái.
   */
  async function loadRooms() {
    setLoading(true);
    try {
      currentRooms = await apiService.getPublicRooms();
      updateBadgeCounts();
      renderRooms();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện Realtime từ Server
   * Tiêu chí chấp nhận 2: Khi trạng thái thay đổi, giao diện cập nhật theo Backend.
   * Phạm vi: Room đang diễn ra vẫn hiển thị; Room đóng tự biến mất.
   */
  function setupRealtimeSubscription() {
    apiService.onRealtimeUpdate((event) => {
      if (event.type === 'ROOM_CLOSED') {
        // Tự động xóa phòng đã đóng khỏi danh sách
        currentRooms = currentRooms.filter(r => r.code !== event.roomCode);
        showToast(`Phòng [${event.roomCode}] đã đóng và được gỡ khỏi danh sách.`, 'info');
      } else if (event.type === 'ROOM_UPDATED') {
        const index = currentRooms.findIndex(r => r.code === event.room.code);
        if (index !== -1) {
          currentRooms[index] = event.room;
        } else if (event.room.isPublic && event.room.status !== 'CLOSED') {
          currentRooms.unshift(event.room);
        }
        showToast(`Trạng thái phòng [${event.room.code}] đã được cập nhật: ${window.ROOM_STATUS[event.room.status]?.label || event.room.status}`, 'info');
      }

      updateBadgeCounts();
      renderRooms();
    });
  }

  /**
   * Xử lý gửi Form tham gia phòng bằng mã 6 số
   * Tiêu chí chấp nhận 3: Nhập đúng mã 6 số tham gia phòng thành công.
   * Tiêu chí chấp nhận 4: Hiển thị lỗi rõ ràng khi phòng không tồn tại hoặc đã đóng.
   * Quy tắc phạm vi: Không gửi request khi mã trống hoặc sai định dạng.
   */
  async function handleJoinByCodeSubmit(e) {
    e.preventDefault();
    clearInputError();

    const rawCode = roomCodeInput.value.trim();

    // Validate 1: Kiểm tra mã trống
    if (!rawCode) {
      showInputError('Vui lòng nhập mã phòng gồm 6 chữ số.');
      return;
    }

    // Validate 2: Kiểm tra định dạng 6 chữ số
    if (!/^\d{6}$/.test(rawCode)) {
      showInputError('Mã phòng không hợp lệ! Vui lòng nhập đúng 6 chữ số (ví dụ: 102938).');
      return;
    }

    // Sau khi validate hợp lệ, gửi request lên Backend
    joinBtn.disabled = true;
    joinBtn.classList.add('loading');

    try {
      const response = await apiService.joinRoomByCode(rawCode);

      if (response.success) {
        // Điều hướng vào đúng phòng và hiển thị vai trò theo response từ máy chủ
        openRoomModal(response.room, response.role, response.roleMessage);
        roomCodeInput.value = '';
      }
    } catch (error) {
      // Hiển thị lỗi rõ ràng khi phòng không tồn tại hoặc đã đóng
      showInputError(error.message);
      showToast(error.message, 'error');
    } finally {
      joinBtn.disabled = false;
      joinBtn.classList.remove('loading');
    }
  }

  /**
   * Hiển thị lỗi ngay dưới ô nhập mã
   */
  function showInputError(msg) {
    codeErrorMessage.textContent = msg;
    roomCodeInput.classList.add('is-invalid');
    roomCodeInput.focus();
  }

  /**
   * Xóa thông báo lỗi ô nhập mã
   */
  function clearInputError() {
    codeErrorMessage.textContent = '';
    roomCodeInput.classList.remove('is-invalid');
  }

  /**
   * Render danh sách phòng theo bộ lọc và tìm kiếm
   */
  function renderRooms() {
    let filtered = currentRooms.filter(room => {
      // Lọc theo trạng thái tab
      if (activeFilter !== 'ALL' && room.status !== activeFilter) {
        return false;
      }

      // Lọc theo từ khóa tìm kiếm (tên phòng hoặc tên chủ phòng hoặc mã phòng)
      if (searchQuery) {
        const matchName = room.name.toLowerCase().includes(searchQuery);
        const matchHost = room.hostName.toLowerCase().includes(searchQuery);
        const matchCode = room.code.includes(searchQuery);
        return matchName || matchHost || matchCode;
      }

      return true;
    });

    // Cập nhật trạng thái hiển thị
    if (filtered.length === 0) {
      roomsGrid.innerHTML = '';
      roomsEmpty.style.display = 'block';
      return;
    }

    roomsEmpty.style.display = 'none';

    // Tạo HTML cho từng thẻ phòng
    roomsGrid.innerHTML = filtered.map(room => {
      const statusMeta = window.ROOM_STATUS[room.status] || {
        label: room.status,
        className: 'status-waiting',
        icon: 'ℹ️'
      };

      const isFullOrPlaying = ['FULL_PLAYERS', 'PLAYING'].includes(room.status);
      const actionText = isFullOrPlaying ? 'Vào Xem (Khán Giả)' : 'Tham Gia Ngay';
      const btnClass = isFullOrPlaying ? 'btn-secondary' : 'btn-primary';

      return `
        <article class="room-card" data-room-code="${room.code}">
          <div>
            <div class="room-card-header">
              <span class="room-code-tag">#${escapeHtml(room.code)}</span>
              <span class="status-badge ${statusMeta.className}">
                <span>${statusMeta.icon}</span>
                <span>${statusMeta.label}</span>
              </span>
            </div>

            <h3 class="room-title" title="${escapeHtml(room.name)}">${escapeHtml(room.name)}</h3>
            
            <div class="room-host">
              <span>Chủ phòng:</span>
              <strong>${escapeHtml(room.hostName)}</strong>
              <span class="user-elo">(${room.hostElo} Elo)</span>
            </div>

            <div class="room-meta-info">
              <div class="meta-item" title="Người chơi trong phòng">
                <span>👤</span>
                <span>${room.playerCount}/${room.maxPlayers} Kỳ thủ</span>
              </div>
              <div class="meta-item" title="Khán giả đang theo dõi">
                <span>👁️</span>
                <span>${room.spectatorCount} Khán giả</span>
              </div>
              <div class="meta-item" title="Thời gian ván đấu">
                <span>⏱️</span>
                <span>${escapeHtml(room.timeLimit)}</span>
              </div>
            </div>
          </div>

          <div class="room-card-footer">
            <button class="btn ${btnClass} join-room-btn" data-code="${escapeHtml(room.code)}">
              <span>${actionText}</span>
              <span>→</span>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Gắn sự kiện click trực tiếp vào nút Tham Gia trên thẻ phòng
    document.querySelectorAll('.join-room-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const code = e.currentTarget.getAttribute('data-code');
        await directJoinRoom(code);
      });
    });
  }

  /**
   * Tham gia phòng trực tiếp từ nút trên thẻ phòng
   */
  async function directJoinRoom(code) {
    try {
      const response = await apiService.joinRoomByCode(code);
      if (response.success) {
        openRoomModal(response.room, response.role, response.roleMessage);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  /**
   * Mở Modal điều hướng vào phòng
   * Tiêu chí chấp nhận 3: Điều hướng vào đúng phòng và hiển thị vai trò theo response từ máy chủ.
   */
  function openRoomModal(room, role, roleMessage) {
    const statusMeta = window.ROOM_STATUS[room.status] || { label: room.status, className: '' };

    modalRoomCode.textContent = `#${room.code}`;
    modalHostName.textContent = room.hostName;
    modalRoomStatus.textContent = statusMeta.label;
    modalRoomStatus.className = `status-badge ${statusMeta.className}`;
    modalUserRole.textContent = role === 'PLAYER' ? 'KỲ THỦ (NGƯỜI CHƠI 2)' : 'KHÁN GIẢ (QUAN SÁT VIÊN)';
    modalRoleNotice.textContent = roleMessage;

    roomModal.style.display = 'flex';
  }

  function closeModal() {
    roomModal.style.display = 'none';
  }

  /**
   * Cập nhật các con số thống kê trên thanh lọc
   */
  function updateBadgeCounts() {
    const total = currentRooms.length;
    const waiting = currentRooms.filter(r => r.status === 'WAITING_OPPONENT').length;
    const full = currentRooms.filter(r => r.status === 'FULL_PLAYERS').length;
    const playing = currentRooms.filter(r => r.status === 'PLAYING').length;
    const rematch = currentRooms.filter(r => r.status === 'WAITING_NEW_GAME').length;

    totalRoomsCountEl.textContent = total;
    waitingRoomsCountEl.textContent = waiting;

    countAllEl.textContent = total;
    countWaitingEl.textContent = waiting;
    countFullEl.textContent = full;
    countPlayingEl.textContent = playing;
    countRematchEl.textContent = rematch;
  }

  function setLoading(isLoading) {
    roomsLoading.style.display = isLoading ? 'block' : 'none';
    if (isLoading) roomsEmpty.style.display = 'none';
  }

  /**
   * Hiển thị thông báo Toast
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(string) {
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Khởi chạy
  init();
});
