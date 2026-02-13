// Handles lobby interactions and hands off to game page without opening a socket here
(function() {
  const nameInput = document.getElementById('nameInput');
  const roomInput = document.getElementById('roomInput');
  const createBtn = document.getElementById('createBtn');
  const joinBtn = document.getElementById('joinBtn');
  const roomStatus = document.getElementById('roomStatus');

  // Restore last typed name for convenience
  const saved = JSON.parse(sessionStorage.getItem('monopolyLobby') || '{}');
  if (saved.name && nameInput) nameInput.value = saved.name;
  if (saved.action === 'join' && saved.roomId && roomInput) roomInput.value = saved.roomId;

  const goToGame = (payload) => {
    sessionStorage.setItem('monopolyLobby', JSON.stringify(payload));
    window.location.href = 'game.html';
  };

  createBtn?.addEventListener('click', () => {
    const name = (nameInput?.value || '').trim();
    if (!name) {
      roomStatus && (roomStatus.textContent = 'Please enter your name');
      return;
    }
    goToGame({ action: 'create', name });
  });

  joinBtn?.addEventListener('click', () => {
    const name = (nameInput?.value || '').trim();
    const roomId = (roomInput?.value || '').trim().toUpperCase();
    if (!name) {
      roomStatus && (roomStatus.textContent = 'Please enter your name');
      return;
    }
    if (!roomId) {
      roomStatus && (roomStatus.textContent = 'Please enter a room code');
      return;
    }
    goToGame({ action: 'join', name, roomId });
  });
})();
