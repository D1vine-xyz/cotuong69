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
  const modalRoomName = document.getElementById('modalRoomName');
  const modalHostName = document.getElementById('modalHostName');
  const modalOpponentName = document.getElementById('modalOpponentName');
  const modalRoomStatus = document.getElementById('modalRoomStatus');
  const modalUserRole = document.getElementById('modalUserRole');
  const modalRoleNotice = document.getElementById('modalRoleNotice');
  const enterRoomBtn = document.getElementById('enterRoomBtn');

  // COT-598: Create Room Modal Elements
  const createRoomModalBtn = document.getElementById('createRoomModalBtn');
  const emptyCreateBtn = document.getElementById('emptyCreateBtn');
  const createRoomModal = document.getElementById('createRoomModal');
  const closeCreateRoomModalBtn = document.getElementById('closeCreateRoomModalBtn');
  const cancelCreateRoomBtn = document.getElementById('cancelCreateRoomBtn');
  const createRoomForm = document.getElementById('createRoomForm');
  const roomNameInput = document.getElementById('roomNameInput');
  const roomNameError = document.getElementById('roomNameError');
  const optPublic = document.getElementById('optPublic');
  const optPrivate = document.getElementById('optPrivate');
  const optPublicLabel = document.getElementById('optPublicLabel');
  const optPrivateLabel = document.getElementById('optPrivateLabel');
  const roomPasswordGroup = document.getElementById('roomPasswordGroup');
  const roomPasswordInput = document.getElementById('roomPasswordInput');
  const submitCreateRoomBtn = document.getElementById('submitCreateRoomBtn');
  const createRoomSpinner = document.getElementById('createRoomSpinner');
  const createRoomBtnText = document.getElementById('createRoomBtnText');

  // Lock flag chống duplicate submission khi tạo phòng (AC 3)
  let isCreatingRoom = false;

  // COT-599: Quản lý chia sẻ phòng & Mời bạn bè
  let currentActiveRoomCode = '';
  let friendsList = [];
  let friendSearchKeyword = '';
  const activeInvitationTimers = new Map(); // friendId -> { timerId, remainingSec, invitationId }

  // COT-599: Share & Friend Invite DOM Elements
  const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
  const copyRoomLinkBtn = document.getElementById('copyRoomLinkBtn');
  const shareFbBtn = document.getElementById('shareFbBtn');
  const shareMessengerBtn = document.getElementById('shareMessengerBtn');
  const shareZaloBtn = document.getElementById('shareZaloBtn');
  const openFriendInviteModalBtn = document.getElementById('openFriendInviteModalBtn');
  const friendInviteModal = document.getElementById('friendInviteModal');
  const closeFriendInviteModalBtn = document.getElementById('closeFriendInviteModalBtn');
  const closeFriendModalFooterBtn = document.getElementById('closeFriendModalFooterBtn');
  const onlineFriendsCountEl = document.getElementById('onlineFriendsCount');
  const totalFriendsCountEl = document.getElementById('totalFriendsCount');
  const friendSearchInput = document.getElementById('friendSearchInput');
  const friendsListContainer = document.getElementById('friendsListContainer');

  // COT-603: Login Modal & Auth State DOM Elements
  const userProfileBar = document.getElementById('userProfileBar');
  const headerLogoutBtn = document.getElementById('headerLogoutBtn');
  const openLoginModalBtn = document.getElementById('openLoginModalBtn');
  const loginModal = document.getElementById('loginModal');
  const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
  const cancelLoginBtn = document.getElementById('cancelLoginBtn');
  const loginForm = document.getElementById('loginForm');
  const loginUsernameInput = document.getElementById('loginUsernameInput');
  const loginPasswordInput = document.getElementById('loginPasswordInput');
  const loginUsernameError = document.getElementById('loginUsernameError');
  const loginPasswordError = document.getElementById('loginPasswordError');
  const submitLoginBtn = document.getElementById('submitLoginBtn');
  const loginSpinner = document.getElementById('loginSpinner');
  const loginBtnText = document.getElementById('loginBtnText');
  const loginPendingRoomBanner = document.getElementById('loginPendingRoomBanner');
  const pendingRoomCodeDisplay = document.getElementById('pendingRoomCodeDisplay');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // COT-630: Chat DOM Elements & State
  const roomChatSection = document.getElementById('roomChatSection');
  const roomModalChatMessages = document.getElementById('roomModalChatMessages');
  const roomModalChatForm = document.getElementById('roomModalChatForm');
  const roomChatInput = document.getElementById('roomChatInput');
  const roomChatSendBtn = document.getElementById('roomChatSendBtn');
  const roomChatCharCounter = document.getElementById('roomChatCharCounter');
  const roomChatErrorTooltip = document.getElementById('roomChatErrorTooltip');

  const floatingChatWidget = document.getElementById('floatingChatWidget');
  const floatingOpenChatBtn = document.getElementById('floatingOpenChatBtn');
  const floatingChatPanel = document.getElementById('floatingChatPanel');
  const floatingCloseChatBtn = document.getElementById('floatingCloseChatBtn');
  const floatingChatMessages = document.getElementById('floatingChatMessages');
  const floatingChatForm = document.getElementById('floatingChatForm');
  const floatingChatInput = document.getElementById('floatingChatInput');
  const floatingChatSendBtn = document.getElementById('floatingChatSendBtn');
  const floatingCharCounter = document.getElementById('floatingCharCounter');
  const floatingChatError = document.getElementById('floatingChatError');
  const floatingChatUnread = document.getElementById('floatingChatUnread');
  const floatingChatRoomTitle = document.getElementById('floatingChatRoomTitle');

  let activeChatService = null;

  /**
   * Khởi tạo ứng dụng
   */
  async function init() {
    setupEventListeners();
    updateUserAuthUi();
    await loadRooms();
    setupRealtimeSubscription();
    await checkAndHandleInviteLinkOnLoad();
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

    // COT-598: Mở Modal Tạo phòng chơi
    if (createRoomModalBtn) {
      createRoomModalBtn.addEventListener('click', openCreateRoomModal);
    }
    if (emptyCreateBtn) {
      emptyCreateBtn.addEventListener('click', openCreateRoomModal);
    }

    // Đóng Modal Tạo phòng
    if (closeCreateRoomModalBtn) {
      closeCreateRoomModalBtn.addEventListener('click', closeCreateRoomModal);
    }
    if (cancelCreateRoomBtn) {
      cancelCreateRoomBtn.addEventListener('click', closeCreateRoomModal);
    }
    if (createRoomModal) {
      createRoomModal.addEventListener('click', (e) => {
        if (e.target === createRoomModal) closeCreateRoomModal();
      });
    }

    // Toggle lựa chọn Công khai / Riêng tư
    if (optPublic && optPrivate) {
      optPublic.addEventListener('change', () => {
        if (optPublic.checked) {
          optPublicLabel?.classList.add('selected');
          optPrivateLabel?.classList.remove('selected');
          if (roomPasswordGroup) roomPasswordGroup.style.display = 'none';
        }
      });

      optPrivate.addEventListener('change', () => {
        if (optPrivate.checked) {
          optPrivateLabel?.classList.add('selected');
          optPublicLabel?.classList.remove('selected');
          if (roomPasswordGroup) roomPasswordGroup.style.display = 'flex';
        }
      });
    }

    // Realtime clear lỗi khi gõ tên phòng
    if (roomNameInput) {
      roomNameInput.addEventListener('input', clearCreateRoomError);
    }

    // Submit Form Tạo phòng chơi (COT-598)
    if (createRoomForm) {
      createRoomForm.addEventListener('submit', handleCreateRoomSubmit);
    }

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

    // Đóng Modal Xem phòng / Vào phòng
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

    // COT-599: Nút sao chép mã và link mời phòng
    if (copyRoomCodeBtn) {
      copyRoomCodeBtn.addEventListener('click', handleCopyRoomCode);
    }
    if (copyRoomLinkBtn) {
      copyRoomLinkBtn.addEventListener('click', handleCopyRoomLink);
    }

    // COT-599: Mở và đóng Modal Mời bạn bè
    if (openFriendInviteModalBtn) {
      openFriendInviteModalBtn.addEventListener('click', openFriendInviteModal);
    }
    if (closeFriendInviteModalBtn) {
      closeFriendInviteModalBtn.addEventListener('click', closeFriendInviteModal);
    }
    if (closeFriendModalFooterBtn) {
      closeFriendModalFooterBtn.addEventListener('click', closeFriendInviteModal);
    }
    if (friendInviteModal) {
      friendInviteModal.addEventListener('click', (e) => {
        if (e.target === friendInviteModal) closeFriendInviteModal();
      });
    }

    // COT-630: Chat Event Listeners
    if (floatingOpenChatBtn) {
      floatingOpenChatBtn.addEventListener('click', toggleFloatingChat);
    }
    if (floatingCloseChatBtn) {
      floatingCloseChatBtn.addEventListener('click', toggleFloatingChat);
    }
    if (roomModalChatForm) {
      roomModalChatForm.addEventListener('submit', handleRoomChatSubmit);
    }
    if (floatingChatForm) {
      floatingChatForm.addEventListener('submit', handleFloatingChatSubmit);
    }
    if (roomChatInput) {
      roomChatInput.addEventListener('input', (e) => {
        const len = e.target.value.length;
        if (roomChatCharCounter) roomChatCharCounter.textContent = `${len}/255`;
        if (roomChatErrorTooltip) roomChatErrorTooltip.style.display = 'none';
      });
    }
    if (floatingChatInput) {
      floatingChatInput.addEventListener('input', (e) => {
        const len = e.target.value.length;
        if (floatingCharCounter) floatingCharCounter.textContent = `${len}/255`;
        if (floatingChatError) floatingChatError.style.display = 'none';
      });
    }

    // COT-599: Tìm kiếm bạn bè trong danh sách
    if (friendSearchInput) {
      friendSearchInput.addEventListener('input', (e) => {
        friendSearchKeyword = e.target.value.trim().toLowerCase();
        renderFriendsList();
      });
    }

    // COT-599: Event delegation cho nút Mời đấu và Hủy mời trong danh sách bạn bè
    if (friendsListContainer) {
      friendsListContainer.addEventListener('click', async (e) => {
        const inviteBtn = e.target.closest('.btn-invite-friend');
        if (inviteBtn && !inviteBtn.disabled) {
          const friendId = inviteBtn.getAttribute('data-friend-id');
          await handleInviteFriend(friendId);
          return;
        }

        const cancelBtn = e.target.closest('.btn-cancel-invite');
        if (cancelBtn) {
          const friendId = cancelBtn.getAttribute('data-friend-id');
          const invId = cancelBtn.getAttribute('data-inv-id');
          await handleCancelInvitation(friendId, invId);
          return;
        }
      });
    }

    // COT-603: Auth & Login Modal Events
    if (headerLogoutBtn) {
      headerLogoutBtn.addEventListener('click', handleLogout);
    }
    if (openLoginModalBtn) {
      openLoginModalBtn.addEventListener('click', () => openLoginModal());
    }
    if (closeLoginModalBtn) {
      closeLoginModalBtn.addEventListener('click', closeLoginModal);
    }
    if (cancelLoginBtn) {
      cancelLoginBtn.addEventListener('click', closeLoginModal);
    }
    if (loginModal) {
      loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) closeLoginModal();
      });
    }
    if (loginForm) {
      loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // COT-584: Điều hướng các khối tính năng Sảnh chờ
    const navPlayOnlineCard = document.getElementById('navPlayOnlineCard');
    const navPlayAiCard = document.getElementById('navPlayAiCard');
    const navFriendsCard = document.getElementById('navFriendsCard');

    if (navPlayOnlineCard) {
      navPlayOnlineCard.addEventListener('click', () => {
        document.querySelectorAll('.lobby-mode-card').forEach(c => c.classList.remove('is-active'));
        navPlayOnlineCard.classList.add('is-active');
        const roomsContainer = document.querySelector('.rooms-container');
        if (roomsContainer) {
          roomsContainer.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    if (navPlayAiCard) {
      navPlayAiCard.addEventListener('click', () => {
        document.querySelectorAll('.lobby-mode-card').forEach(c => c.classList.remove('is-active'));
        navPlayAiCard.classList.add('is-active');
        // Kích hoạt mở modal Bắt đầu trận PvE
        if (typeof window.openPveModal === 'function') {
          window.openPveModal();
        } else {
          const openPveEvent = new CustomEvent('cotuong:open-pve');
          window.dispatchEvent(openPveEvent);
        }
      });
    }

    if (navFriendsCard) {
      navFriendsCard.addEventListener('click', () => {
        document.querySelectorAll('.lobby-mode-card').forEach(c => c.classList.remove('is-active'));
        navFriendsCard.classList.add('is-active');
        if (typeof openFriendInviteModal === 'function') {
          openFriendInviteModal();
        }
      });
    }
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
   * Tiêu chí chấp nhận 4 (COT-598): Tạo thành công đưa người dùng vào phòng với vai trò Chủ phòng, hiển thị vị trí Đối thủ đang trống và mã 6 số.
   */
  function openRoomModal(room, role, roleMessage) {
    const statusMeta = window.ROOM_STATUS[room.status] || { label: room.status, className: '' };

    if (modalRoomCode) modalRoomCode.textContent = `#${room.code}`;
    if (modalRoomName) modalRoomName.textContent = room.name || 'Phòng cờ';
    if (modalHostName) modalHostName.textContent = room.hostName || 'Chủ phòng';
    
    // Hiển thị vị trí Đối thủ (COT-598)
    if (modalOpponentName) {
      if (room.opponentName) {
        modalOpponentName.textContent = room.opponentName;
        modalOpponentName.className = 'opponent-badge';
      } else {
        modalOpponentName.textContent = 'Đang trống (Chờ kỳ thủ ghép trận)';
        modalOpponentName.className = 'opponent-badge empty-slot';
      }
    }

    if (modalRoomStatus) {
      modalRoomStatus.textContent = statusMeta.label;
      modalRoomStatus.className = `status-badge ${statusMeta.className}`;
    }

    if (modalUserRole) {
      if (role === 'HOST') {
        modalUserRole.textContent = 'CHỦ PHÒNG (HOST - QUÂN ĐỎ)';
        modalUserRole.className = 'role-badge role-player';
      } else if (role === 'PLAYER') {
        modalUserRole.textContent = 'KỲ THỦ (NGƯỜI CHƠI 2 - QUÂN ĐEN)';
        modalUserRole.className = 'role-badge role-player';
      } else {
        modalUserRole.textContent = 'KHÁN GIẢ (QUAN SÁT VIÊN)';
        modalUserRole.className = 'role-badge role-spectator';
      }
    }

    if (modalRoleNotice) modalRoleNotice.textContent = roleMessage;

    // COT-599: Cập nhật mã phòng đang mở và đường dẫn chia sẻ mạng xã hội
    currentActiveRoomCode = room.code;
    const shareLinks = apiService.generateShareLinks(room.code);
    if (shareFbBtn) shareFbBtn.href = shareLinks.facebookUrl;
    if (shareMessengerBtn) shareMessengerBtn.href = shareLinks.messengerUrl;
    if (shareZaloBtn) shareZaloBtn.href = shareLinks.zaloUrl;

    roomModal.style.display = 'flex';

    // COT-630: Khởi tạo khung chat và kiểm tra phân quyền hiển thị (AC 2 & AC 3)
    setupRoomChat(room, role);
  }

  function closeModal() {
    roomModal.style.display = 'none';
    if (floatingChatWidget && (!activeChatService || !activeChatService.isChatAllowed())) {
      floatingChatWidget.style.display = 'none';
    }
  }

  /**
   * ===================================================================
   * COT-599: Giao diện Danh sách bạn bè và nút Chia sẻ liên kết mời phòng
   * ===================================================================
   */

  /**
   * Sao chép mã phòng 6 chữ số
   * Tiêu chí chấp nhận 4: Nút "Sao chép mã phòng" kèm toast thông báo thành công.
   */
  async function handleCopyRoomCode() {
    if (!currentActiveRoomCode) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentActiveRoomCode);
      }
      showToast(`Đã sao chép mã phòng [#${currentActiveRoomCode}] vào bộ nhớ tạm!`, 'success');
    } catch {
      showToast(`Mã phòng của bạn: ${currentActiveRoomCode}`, 'info');
    }
  }

  /**
   * Sao chép liên kết mời phòng
   * Tiêu chí chấp nhận 4: Nút "Sao chép link mời" kèm toast thông báo thành công.
   */
  async function handleCopyRoomLink() {
    if (!currentActiveRoomCode) return;
    const shareInfo = apiService.generateShareLinks(currentActiveRoomCode);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareInfo.url);
      }
      showToast(`Đã sao chép link mời [${shareInfo.url}] vào bộ nhớ tạm!`, 'success');
    } catch {
      showToast(`Link mời: ${shareInfo.url}`, 'info');
    }
  }

  /**
   * Mở Modal Danh sách bạn bè để mời vào phòng
   * Tiêu chí chấp nhận 1: Mở danh sách bạn bè kèm trạng thái Trực tuyến/Ngoại tuyến.
   */
  async function openFriendInviteModal() {
    try {
      friendsList = await apiService.getFriendsList();
      friendSearchKeyword = '';
      if (friendSearchInput) friendSearchInput.value = '';
      renderFriendsList();
      if (friendInviteModal) friendInviteModal.style.display = 'flex';
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function closeFriendInviteModal() {
    if (friendInviteModal) {
      friendInviteModal.style.display = 'none';
    }
  }

  /**
   * Render danh sách bạn bè (Trực tuyến / Ngoại tuyến)
   * Tiêu chí chấp nhận 1: Hiển thị đúng trạng thái Trực tuyến/Ngoại tuyến.
   * Tiêu chí chấp nhận 2: Gửi lời mời hiển thị đếm ngược 60 giây cho Chủ phòng.
   * Tiêu chí chấp nhận 3: Giao diện KHÔNG được khóa hay giữ trước vị trí Đối thủ.
   */
  function renderFriendsList() {
    if (!friendsListContainer) return;

    let filtered = [...friendsList];
    if (friendSearchKeyword) {
      filtered = filtered.filter(f => 
        (f.displayName && f.displayName.toLowerCase().includes(friendSearchKeyword)) ||
        (f.username && f.username.toLowerCase().includes(friendSearchKeyword))
      );
    }

    // Sắp xếp: Trực tuyến lên trước, sau đó đến Ngoại tuyến
    filtered.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

    // Thống kê số lượng
    const onlineCount = friendsList.filter(f => f.isOnline).length;
    if (onlineFriendsCountEl) onlineFriendsCountEl.textContent = onlineCount;
    if (totalFriendsCountEl) totalFriendsCountEl.textContent = friendsList.length;

    if (filtered.length === 0) {
      friendsListContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
          Không tìm thấy bạn bè nào phù hợp.
        </div>
      `;
      return;
    }

    friendsListContainer.innerHTML = filtered.map(friend => {
      const isOnline = Boolean(friend.isOnline);
      const initial = (friend.displayName || friend.username || 'K').charAt(0).toUpperCase();
      const inviteInfo = activeInvitationTimers.get(friend.id);

      let actionHtml = '';
      if (inviteInfo) {
        // Đang có lời mời chờ phản hồi (đếm ngược 60 giây)
        actionHtml = `
          <div class="waiting-invite-box">
            <span class="waiting-countdown">⏳ <strong id="cd-${friend.id}">${inviteInfo.remainingSec}s</strong></span>
            <button class="btn-cancel-invite" data-friend-id="${escapeHtml(friend.id)}" data-inv-id="${escapeHtml(inviteInfo.invitationId)}">
              Hủy mời
            </button>
          </div>
        `;
      } else if (isOnline) {
        actionHtml = `
          <button class="btn btn-gold btn-invite-friend" data-friend-id="${escapeHtml(friend.id)}">
            Mời đấu
          </button>
        `;
      } else {
        actionHtml = `
          <button class="btn btn-secondary btn-invite-friend" disabled title="Kỳ thủ hiện đang ngoại tuyến">
            Ngoại tuyến
          </button>
        `;
      }

      return `
        <div class="friend-item" data-id="${escapeHtml(friend.id)}">
          <div class="friend-profile-wrap">
            <div class="friend-avatar-wrap">
              <div class="friend-avatar">${escapeHtml(initial)}</div>
              <span class="friend-status-dot ${isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="friend-details">
              <span class="friend-name">${escapeHtml(friend.displayName || friend.username)}</span>
              <div class="friend-meta">
                <span>Elo: <strong>${friend.elo || 1200}</strong></span>
                <span>•</span>
                <span class="friend-status-text ${isOnline ? 'online' : 'offline'}">
                  ${isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                </span>
              </div>
            </div>
          </div>
          <div class="friend-action-box">
            ${actionHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Xử lý gửi lời mời tới bạn bè đang Trực tuyến
   * Tiêu chí chấp nhận 2: Gửi lời mời hiển thị đếm ngược 60 giây cho Chủ phòng.
   * Tiêu chí chấp nhận 3: Giao diện KHÔNG được khóa hay giữ trước vị trí Đối thủ.
   */
  async function handleInviteFriend(friendId) {
    if (!currentActiveRoomCode) {
      showToast('Không xác định được phòng cờ để mời.', 'error');
      return;
    }

    try {
      const res = await apiService.sendFriendInvitation(friendId, currentActiveRoomCode);

      if (res.success) {
        showToast(res.message + ' (Đang chờ phản hồi 60s)', 'success');

        let remainingSec = 60;
        const invId = res.invitation.id;

        const timerId = setInterval(() => {
          remainingSec--;
          const item = activeInvitationTimers.get(friendId);
          if (item) {
            item.remainingSec = remainingSec;
          }

          const countdownEl = document.getElementById(`cd-${friendId}`);
          if (countdownEl) {
            countdownEl.textContent = `${remainingSec}s`;
          }

          if (remainingSec <= 0) {
            clearInterval(timerId);
            activeInvitationTimers.delete(friendId);
            renderFriendsList();
            showToast(`Lời mời gửi tới "${res.invitation.friendName}" đã hết hạn phản hồi (60s).`, 'info');
          }
        }, 1000);

        activeInvitationTimers.set(friendId, {
          timerId,
          remainingSec,
          invitationId: invId
        });

        renderFriendsList();
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  /**
   * Xử lý hủy lời mời khi đang chờ phản hồi
   */
  async function handleCancelInvitation(friendId, invitationId) {
    const timerInfo = activeInvitationTimers.get(friendId);
    if (timerInfo && timerInfo.timerId) {
      clearInterval(timerInfo.timerId);
    }
    activeInvitationTimers.delete(friendId);

    try {
      if (invitationId) {
        await apiService.cancelFriendInvitation(invitationId);
      }
      showToast('Đã hủy lời mời thi đấu thành công.', 'info');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      renderFriendsList();
    }
  }

  /**
   * ===================================================================
   * COT-598: Code Modal Tạo phòng chơi (Công khai / Riêng tư)
   * ===================================================================
   */

  /**
   * Mở Modal Tạo phòng chơi
   * Phạm vi: Chỉ hiển thị/cho phép thao tác khi người dùng đã đăng nhập.
   */
  function openCreateRoomModal() {
    const currentUser = apiService.getCurrentUser();
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để tạo phòng chơi.', 'error');
      return;
    }

    // Reset Form
    if (roomNameInput) {
      roomNameInput.value = '';
    }
    clearCreateRoomError();

    if (optPublic) optPublic.checked = true;
    optPublicLabel?.classList.add('selected');
    optPrivateLabel?.classList.remove('selected');

    if (roomPasswordGroup) roomPasswordGroup.style.display = 'none';
    if (roomPasswordInput) roomPasswordInput.value = '';

    if (createRoomModal) {
      createRoomModal.style.display = 'flex';
      setTimeout(() => roomNameInput?.focus(), 60);
    }
  }

  /**
   * Đóng Modal Tạo phòng chơi
   */
  function closeCreateRoomModal() {
    if (createRoomModal) {
      createRoomModal.style.display = 'none';
    }
    clearCreateRoomError();
  }

  /**
   * Xử lý gửi Form Tạo phòng chơi
   * Tiêu chí chấp nhận 1: Form có Tên Room và lựa chọn Công khai/Riêng tư.
   * Tiêu chí chấp nhận 2: Không gửi request nếu Tên Room để trống hoặc không hợp lệ.
   * Tiêu chí chấp nhận 3: Không tạo nhiều phòng do bấm liên tục (Lock button / Spinner).
   * Tiêu chí chấp nhận 4: Tạo thành công đưa người dùng vào phòng với vai trò Chủ phòng.
   */
  async function handleCreateRoomSubmit(e) {
    e.preventDefault();
    clearCreateRoomError();

    // Tiêu chí 3: Chặn tạo nhiều phòng do bấm liên tục (Double submit lock)
    if (isCreatingRoom) {
      return;
    }

    const rawName = roomNameInput ? roomNameInput.value.trim() : '';

    // Tiêu chí 2: Không gửi request nếu Tên Room để trống
    if (!rawName) {
      showCreateRoomError('Tên phòng không được để trống.');
      roomNameInput?.focus();
      return;
    }

    if (rawName.length < 3 || rawName.length > 50) {
      showCreateRoomError('Tên phòng phải có độ dài từ 3 đến 50 ký tự.');
      roomNameInput?.focus();
      return;
    }

    const isPrivate = optPrivate ? optPrivate.checked : false;
    const password = (isPrivate && roomPasswordInput) ? roomPasswordInput.value.trim() : null;

    // Bắt đầu gửi yêu cầu: Khóa nút và hiển thị trạng thái đang xử lý
    isCreatingRoom = true;
    if (submitCreateRoomBtn) submitCreateRoomBtn.disabled = true;
    if (createRoomSpinner) createRoomSpinner.style.display = 'inline-block';
    if (createRoomBtnText) createRoomBtnText.textContent = 'Đang tạo phòng...';

    try {
      const response = await apiService.createRoom({
        name: rawName,
        isPrivate,
        password
      });

      if (response.success) {
        closeCreateRoomModal();
        await loadRooms();
        showToast(`Tạo phòng cờ "${response.room.name}" thành công!`, 'success');

        // Tiêu chí 4: Điều hướng người tạo vào Room với vai trò Chủ phòng
        openRoomModal(response.room, response.role, response.roleMessage);
      }
    } catch (error) {
      showCreateRoomError(error.message);
      showToast(error.message, 'error');
    } finally {
      isCreatingRoom = false;
      if (submitCreateRoomBtn) submitCreateRoomBtn.disabled = false;
      if (createRoomSpinner) createRoomSpinner.style.display = 'none';
      if (createRoomBtnText) createRoomBtnText.textContent = '+ Tạo Phòng Ngay';
    }
  }

  function showCreateRoomError(message) {
    if (roomNameError) {
      roomNameError.textContent = message;
      roomNameError.style.display = 'block';
    }
    if (roomNameInput) {
      roomNameInput.classList.add('input-error');
    }
  }

  function clearCreateRoomError() {
    if (roomNameError) {
      roomNameError.textContent = '';
      roomNameError.style.display = 'none';
    }
    if (roomNameInput) {
      roomNameInput.classList.remove('input-error');
    }
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

  /**
   * ===================================================================
   * COT-603: Xử lý luồng mở link mời phòng & Đăng nhập chuyển hướng
   * ===================================================================
   */

  function updateUserAuthUi() {
    const user = apiService.getCurrentUser();
    if (user) {
      if (userProfileBar) userProfileBar.style.display = 'flex';
      if (openLoginModalBtn) openLoginModalBtn.style.display = 'none';
      const nameEl = document.getElementById('currentUserName');
      const eloEl = document.getElementById('currentUserElo');
      const avatarEl = document.getElementById('currentUserAvatar');
      if (nameEl) nameEl.textContent = user.displayName || user.username || 'Kỳ Thủ';
      if (eloEl) eloEl.textContent = Number.isFinite(user.elo) ? user.elo : 1000;
      if (avatarEl) avatarEl.textContent = user.avatar || (user.displayName ? user.displayName.charAt(0).toUpperCase() : '桑');
    } else {
      if (userProfileBar) userProfileBar.style.display = 'none';
      if (openLoginModalBtn) openLoginModalBtn.style.display = 'inline-flex';
    }
  }

  function handleLogout() {
    apiService.setCurrentUser(null);
    updateUserAuthUi();
    showToast('Đã đăng xuất tài khoản. Bạn đang ở chế độ khách.', 'info');
  }

  function openLoginModal(pendingRoomCode = null) {
    if (!loginModal) return;
    if (pendingRoomCode) {
      if (loginPendingRoomBanner) loginPendingRoomBanner.style.display = 'flex';
      if (pendingRoomCodeDisplay) pendingRoomCodeDisplay.textContent = pendingRoomCode;
    } else {
      const storedPending = apiService.getPendingRoomInvite();
      if (storedPending && loginPendingRoomBanner) {
        loginPendingRoomBanner.style.display = 'flex';
        if (pendingRoomCodeDisplay) pendingRoomCodeDisplay.textContent = storedPending;
      } else if (loginPendingRoomBanner) {
        loginPendingRoomBanner.style.display = 'none';
      }
    }
    clearLoginErrors();
    loginModal.style.display = 'flex';
  }

  function closeLoginModal() {
    if (loginModal) loginModal.style.display = 'none';
    clearLoginErrors();
  }

  function clearLoginErrors() {
    if (loginUsernameError) {
      loginUsernameError.textContent = '';
      loginUsernameError.style.display = 'none';
    }
    if (loginPasswordError) {
      loginPasswordError.textContent = '';
      loginPasswordError.style.display = 'none';
    }
    loginUsernameInput?.classList.remove('input-error');
    loginPasswordInput?.classList.remove('input-error');
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    clearLoginErrors();

    const username = loginUsernameInput ? loginUsernameInput.value.trim() : '';
    const password = loginPasswordInput ? loginPasswordInput.value.trim() : '';

    if (!username) {
      if (loginUsernameError) {
        loginUsernameError.textContent = 'Vui lòng nhập tên đăng nhập hoặc email.';
        loginUsernameError.style.display = 'block';
      }
      loginUsernameInput?.classList.add('input-error');
      loginUsernameInput?.focus();
      return;
    }

    if (!password) {
      if (loginPasswordError) {
        loginPasswordError.textContent = 'Vui lòng nhập mật khẩu.';
        loginPasswordError.style.display = 'block';
      }
      loginPasswordInput?.classList.add('input-error');
      loginPasswordInput?.focus();
      return;
    }

    // Hiển thị trạng thái đang xử lý
    if (submitLoginBtn) submitLoginBtn.disabled = true;
    if (loginSpinner) loginSpinner.style.display = 'inline-block';
    if (loginBtnText) loginBtnText.textContent = 'Đang xử lý...';

    try {
      // Giả lập xác thực đăng nhập thành công
      apiService.setCurrentUser({
        id: 'user-sang-01',
        username: username,
        displayName: 'Nguyễn Tấn Sang',
        elo: 1000,
        avatar: '桑',
        isLoggedIn: true
      });

      updateUserAuthUi();
      closeLoginModal();

      // COT-603 AC 2: Sau khi đăng nhập thành công, kiểm tra thông tin phòng đã lưu trong phiên
      const redirectResult = await apiService.handlePostLoginRoomRedirect();

      if (redirectResult.hasPending) {
        if (redirectResult.success && redirectResult.room) {
          // Phòng còn hợp lệ: Đưa người dùng vào phòng chơi
          openRoomModal(redirectResult.room, redirectResult.role, redirectResult.roleMessage);
          showToast(redirectResult.roleMessage || 'Đã vào phòng từ liên kết mời thành công!', 'success');
        } else {
          // AC 3: Phòng đã đóng hoặc không khả dụng -> Hiển thị "Room không còn khả dụng"
          showToast(redirectResult.error || 'Room không còn khả dụng.', 'error');
        }
      } else {
        showToast('Đăng nhập thành công!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Đăng nhập thất bại.', 'error');
    } finally {
      if (submitLoginBtn) submitLoginBtn.disabled = false;
      if (loginSpinner) loginSpinner.style.display = 'none';
      if (loginBtnText) loginBtnText.textContent = 'Đang Nhập & Vào Phòng';
    }
  }

  /**
   * COT-603 AC 1 & AC 3: Kiểm tra và xử lý khi người dùng mở trang qua link mời phòng
   */
  async function checkAndHandleInviteLinkOnLoad() {
    if (typeof window === 'undefined' || !window.location) return;

    const currentUrl = window.location.href;
    const roomCode = apiService.extractRoomCodeFromUrl(currentUrl);

    if (!roomCode) {
      // Kiểm tra xem có phòng đang chờ trong session từ lần trước không
      const pendingCode = apiService.getPendingRoomInvite();
      if (pendingCode && apiService.getCurrentUser()) {
        const postLoginResult = await apiService.handlePostLoginRoomRedirect();
        if (postLoginResult.hasPending) {
          if (postLoginResult.success && postLoginResult.room) {
            openRoomModal(postLoginResult.room, postLoginResult.role, postLoginResult.roleMessage);
            showToast(postLoginResult.roleMessage || 'Đã kết nối vào phòng từ phiên trước!', 'success');
          } else {
            showToast(postLoginResult.error || 'Room không còn khả dụng.', 'error');
          }
        }
      }
      return;
    }

    try {
      const result = await apiService.handleOpenRoomLink(currentUrl);

      if (result.action === 'REDIRECT_LOGIN') {
        // AC 1: Chưa đăng nhập -> Chuyển hướng tới màn hình Đăng nhập & lưu phiên
        openLoginModal(result.pendingRoomCode);
        showToast(`Vui lòng đăng nhập để tham gia phòng [#${result.pendingRoomCode}]!`, 'info');
      } else if (result.action === 'JOIN_SUCCESS' && result.room) {
        // Đã đăng nhập -> Đưa vào phòng
        openRoomModal(result.room, result.role, result.roleMessage);
        showToast(result.roleMessage, 'success');
      }
    } catch (err) {
      // AC 3: Báo lỗi "Room không còn khả dụng"
      showToast(err.message || 'Room không còn khả dụng.', 'error');
    }
  }

  /**
   * ===================================================================
   * COT-630: Code giao diện Khung chat text và phân quyền hiển thị
   * ===================================================================
   */

  function setupRoomChat(room, role) {
    const roleUpper = String(role || '').toUpperCase();
    const isPlayerOrHost = roleUpper === 'HOST' || roleUpper === 'PLAYER';

    // AC 3: Khán giả hoàn toàn bị ẩn khung chat và không can thiệp được
    if (!isPlayerOrHost) {
      if (roomChatSection) roomChatSection.style.display = 'none';
      if (floatingChatWidget) floatingChatWidget.style.display = 'none';
      if (activeChatService) {
        activeChatService.setRole('SPECTATOR');
      }
      return;
    }

    // Hiển thị khung chat cho Chủ phòng & Đối thủ (AC 2)
    if (roomChatSection) roomChatSection.style.display = 'block';
    if (floatingChatWidget) floatingChatWidget.style.display = 'block';
    if (floatingChatRoomTitle) floatingChatRoomTitle.textContent = `Chat · #${room.code}`;

    const currentUser = (apiService && apiService.getCurrentUser ? apiService.getCurrentUser() : null) || {
      id: 'usr_sang',
      name: 'Nguyễn Tấn Sang',
      avatar: '桑',
      role: roleUpper
    };

    currentUser.role = roleUpper;

    if (!activeChatService || activeChatService.roomId !== room.code) {
      if (typeof window.ChatService === 'function') {
        activeChatService = new window.ChatService({
          roomId: room.code,
          currentUser: currentUser
        });
      }
    } else {
      activeChatService.setRole(roleUpper);
    }

    if (activeChatService) {
      activeChatService.onChatEvent((event) => {
        if (event.type === 'MESSAGE_ADDED' || event.type === 'MESSAGE_RECEIVED' || event.type === 'MESSAGE_STATUS_UPDATED') {
          renderChatMessages();
        } else if (event.type === 'CHAT_TOGGLED') {
          updateFloatingChatState();
        }
      });
      renderChatMessages();
    }
  }

  function renderChatMessages() {
    if (!activeChatService) return;
    const messages = activeChatService.getMessages();

    const renderList = (container) => {
      if (!container) return;
      container.innerHTML = messages.map(msg => {
        if (msg.isSystem) {
          return `
            <div class="chat-bubble-system">
              <span class="system-pill">${escapeHtml(msg.text)}</span>
            </div>
          `;
        }

        const isSelf = msg.isSelf;
        const statusHtml = isSelf ? `
          <div class="chat-bubble-status">
            ${msg.status === 'SENDING' ? '<span class="status-sending">⏳ Đang gửi</span>' : ''}
            ${msg.status === 'SENT' ? '<span class="status-sent">✓ Đã gửi</span>' : ''}
            ${msg.status === 'FAILED' ? '<span class="status-failed">⚠️ Thất bại</span>' : ''}
          </div>
        ` : '';

        return `
          <div class="chat-message-row ${isSelf ? 'message-self' : 'message-opponent'}">
            <div class="chat-bubble-avatar ${isSelf ? 'avatar-self' : 'avatar-opponent'}">
              ${msg.senderAvatar || (msg.senderName ? msg.senderName.slice(0, 1) : '?')}
            </div>
            <div class="chat-bubble-content">
              <div class="chat-bubble-meta">
                <span class="chat-sender-name">${escapeHtml(msg.senderName)}</span>
                <span class="chat-timestamp">${msg.timestamp}</span>
              </div>
              <div class="chat-bubble-bubble">
                <p class="chat-bubble-text">${escapeHtml(msg.text)}</p>
              </div>
              ${statusHtml}
            </div>
          </div>
        `;
      }).join('');

      // AC 1: Tự động cuộn xuống dưới cùng
      container.scrollTop = container.scrollHeight;
    };

    renderList(roomModalChatMessages);
    renderList(floatingChatMessages);
  }

  function toggleFloatingChat() {
    if (!activeChatService || !activeChatService.isChatAllowed()) return;
    activeChatService.toggleChat();
    updateFloatingChatState();
  }

  function updateFloatingChatState() {
    if (!activeChatService) return;
    const isOpen = activeChatService.isOpen;
    if (floatingOpenChatBtn) floatingOpenChatBtn.style.display = isOpen ? 'none' : 'flex';
    if (floatingChatPanel) {
      floatingChatPanel.style.display = isOpen ? 'flex' : 'none';
      if (isOpen) {
        if (floatingChatInput) floatingChatInput.focus();
        if (floatingChatMessages) floatingChatMessages.scrollTop = floatingChatMessages.scrollHeight;
      }
    }
  }

  async function handleRoomChatSubmit(e) {
    if (e) e.preventDefault();
    if (!activeChatService) return;
    const text = roomChatInput ? roomChatInput.value : '';

    try {
      if (roomChatErrorTooltip) roomChatErrorTooltip.style.display = 'none';
      await activeChatService.sendMessage(text);
      if (roomChatInput) roomChatInput.value = '';
      if (roomChatCharCounter) roomChatCharCounter.textContent = '0/255';
    } catch (err) {
      if (roomChatErrorTooltip) {
        roomChatErrorTooltip.textContent = `⚠️ ${err.message}`;
        roomChatErrorTooltip.style.display = 'block';
      }
    }
  }

  async function handleFloatingChatSubmit(e) {
    if (e) e.preventDefault();
    if (!activeChatService) return;
    const text = floatingChatInput ? floatingChatInput.value : '';

    try {
      if (floatingChatError) floatingChatError.style.display = 'none';
      await activeChatService.sendMessage(text);
      if (floatingChatInput) floatingChatInput.value = '';
      if (floatingCharCounter) floatingCharCounter.textContent = '0/255';
    } catch (err) {
      if (floatingChatError) {
        floatingChatError.textContent = `⚠️ ${err.message}`;
        floatingChatError.style.display = 'block';
      }
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Khởi chạy
  init();
});
