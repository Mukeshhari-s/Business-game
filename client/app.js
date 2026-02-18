// Connect to the server dynamically (works for localhost and deployed apps)
const socket = io(window.location.origin);
const lobbyData = JSON.parse(sessionStorage.getItem('monopolyLobby') || '{}');
let currentRoomId = lobbyData.roomId || null;
let myPlayerId = lobbyData.playerId || null;
let gameState = null;
let lastDiceRoll = null;
console.log('📦 Loaded session data:', lobbyData);
console.log('🔌 Connecting to:', window.location.origin);
let autoActionSent = false;
let isAnimating = false;
let displayedPositions = {}; // Track visual positions to sync with animations
let isLeavingGame = false; // Flag to prevent reconnection when leaving

// DOM Elements
const nameInput = document.getElementById('nameInput');
const roomInput = document.getElementById('roomInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomStatus = document.getElementById('roomStatus');
const connectionScreen = document.getElementById('connection');
const roomCode = document.getElementById('roomCode');
const playerIdEl = document.getElementById('playerId');
const currentTurnEl = document.getElementById('currentTurn');
const gameStatusEl = document.getElementById('gameStatus');
const playersList = document.getElementById('playersList');
let gameLog = document.getElementById('gameLog');
const rollBtn = document.getElementById('rollBtn');
const buyBtn = document.getElementById('buyBtn');
const endTurnBtnCenter = document.getElementById('endTurnBtnCenter');
const bailCheckbox = document.getElementById('bailCheckbox');
const gameSection = document.getElementById('game');
const die1 = document.getElementById('die1');
const die2 = document.getElementById('die2');
const diceTotal = document.getElementById('diceTotal');
const propertyStatus = document.getElementById('propertyStatus');
const boardGrid = document.getElementById('board-grid');
const bailWrapper = document.getElementById('bailWrapper');
const startGameBtn = document.getElementById('startGameBtn');
const startGameContainer = document.getElementById('startGameContainer');
const houseSupplyEl = document.getElementById('houseSupply');
const hotelSupplyEl = document.getElementById('hotelSupply');
const buildablePropertiesEl = document.getElementById('buildableProperties');
const declareBankruptcyBtn = document.getElementById('declareBankruptcyBtn');
const leaveGameBtn = document.getElementById('leaveGameBtn');
const colorSelectionModal = document.getElementById('colorSelectionModal');
const colorPickerGrid = document.getElementById('colorPickerGrid');
const confirmColorBtn = document.getElementById('confirmColorBtn');
const colorModalError = document.getElementById('colorModalError');

// Debug: Check if color modal elements exist
console.log('🔍 Color modal elements check:', {
  colorSelectionModal: !!colorSelectionModal,
  colorPickerGrid: !!colorPickerGrid,
  confirmColorBtn: !!confirmColorBtn,
  colorModalError: !!colorModalError
});

// Room Settings Elements
const startCashSelect = document.getElementById('startCashSelect');
const maxPlayersSelect = document.getElementById('maxPlayersSelect');
const mapSelect = document.getElementById('mapSelect');
const mortgageToggle = document.getElementById('mortgageToggle');

console.log('🧪 Diagnostic - Element Check:', {
  startCashSelect: !!startCashSelect,
  maxPlayersSelect: !!maxPlayersSelect,
  mapSelect: !!mapSelect,
  mortgageToggle: !!mortgageToggle
});

// Lobby View Elements
const lobbyChoiceView = document.getElementById('lobbyChoiceView');
const lobbyCreateView = document.getElementById('lobbyCreateView');
const lobbyJoinView = document.getElementById('lobbyJoinView');
const showCreateBtn = document.getElementById('showCreateBtn');
const showJoinBtn = document.getElementById('showJoinBtn');
const backToLobbyBtns = document.querySelectorAll('.backToLobbyBtn');
const nameInputJoin = document.getElementById('nameInputJoin');

// Board data themed after richup.io layout (order follows Monopoly indices clockwise starting at GO top-left)
const boardData = [
  { name: 'GO', color: null },
  { name: 'Vaikalmedu', color: 'brazil' },
  { name: 'Pudhaiyal', color: null },
  { name: 'Thopupalayam', color: 'brazil' },
  { name: 'Varumana vari', color: null },
  { name: 'Vettaiyan Airways', color: 'railroad' },
  { name: 'Paramathi', color: 'israel' },
  { name: 'Surprise', color: null },
  { name: 'P Velur', color: 'israel' },
  { name: 'Kabilarmalai', color: 'israel' },
  { name: 'Epistine Island', color: null },
  { name: 'Velarivelli', color: 'italy' },
  { name: 'U K Consultancy', color: 'utility' },
  { name: 'Polampatti', color: 'italy' },
  { name: 'Boat Theeru', color: 'italy' },
  { name: 'Eagle Tractors', color: 'railroad' },
  { name: 'Karur', color: 'germany' },
  { name: 'Pudhaiyal', color: null },
  { name: 'Namakkal main', color: 'germany' },
  { name: 'Erode', color: 'germany' },
  { name: 'Sorgavasal', color: null },
  { name: 'Pollachi', color: 'china' },
  { name: 'Surprise', color: null },
  { name: 'Paladdam', color: 'china' },
  { name: 'Udumalpet', color: 'china' },
  { name: 'Vettaiyan waterways', color: 'railroad' },
  { name: 'Unjalur', color: 'france' },
  { name: 'Noyal', color: 'france' },
  { name: 'Kathirvel vathukadai', color: 'utility' },
  { name: 'Kodumudi', color: 'france' },
  { name: 'Book your tickets', color: null },
  { name: 'Sala Palayam', color: 'uk' },
  { name: 'Govindham Palyam', color: 'uk' },
  { name: 'Pudhaiyal', color: null },
  { name: 'Valaiyal Karan Pudhur', color: 'uk' },
  { name: 'Vettaiyan Roadways', color: 'railroad' },
  { name: 'Surprise', color: null },
  { name: 'Mettur Dam', color: 'usa' },
  { name: 'Aadambara Vari', color: null },
  { name: 'Kolathur Beach', color: 'usa' },
];

const playerColors = [
  { name: 'Red', value: '#e74c3c' },
  { name: 'Blue', value: '#3498db' },
  { name: 'Green', value: '#2ecc71' },
  { name: 'Orange', value: '#f39c12' },
  { name: 'Purple', value: '#9b59b6' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Cyan', value: '#00bcd4' },
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Brown', value: '#795548' },
  { name: 'Black', value: '#2c3e50' }
];

let selectedColor = null; // Player's chosen color
let hasSelectedColor = false; // Track if player has confirmed their color

const HOUSE_COST_RATE = 0.5;
const HOTEL_COST_MULTIPLIER = 1;

// Grid positions for 11x11 board (row/col 0-based). Corners at indices 0,10,20,30.
// Layout follows standard Monopoly order clockwise starting at GO (index 0) top-left.
const cellPositions = [
  { row: 0, col: 0 }, // 0 GO
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 0, col: 6 },
  { row: 0, col: 7 },
  { row: 0, col: 8 },
  { row: 0, col: 9 },
  { row: 0, col: 10 }, // 10 Jail
  { row: 1, col: 10 },
  { row: 2, col: 10 },
  { row: 3, col: 10 },
  { row: 4, col: 10 },
  { row: 5, col: 10 },
  { row: 6, col: 10 },
  { row: 7, col: 10 },
  { row: 8, col: 10 },
  { row: 9, col: 10 },
  { row: 10, col: 10 }, // 20 Free Parking
  { row: 10, col: 9 },
  { row: 10, col: 8 },
  { row: 10, col: 7 },
  { row: 10, col: 6 },
  { row: 10, col: 5 },
  { row: 10, col: 4 },
  { row: 10, col: 3 },
  { row: 10, col: 2 },
  { row: 10, col: 1 },
  { row: 10, col: 0 }, // 30 Go To Jail
  { row: 9, col: 0 },
  { row: 8, col: 0 },
  { row: 7, col: 0 },
  { row: 6, col: 0 },
  { row: 5, col: 0 },
  { row: 4, col: 0 },
  { row: 3, col: 0 },
  { row: 2, col: 0 },
  { row: 1, col: 0 },
];

function getCellGridPosition(index) {
  return cellPositions[index];
}


// Lobby View Toggling
if (showCreateBtn && lobbyChoiceView && lobbyCreateView) {
  showCreateBtn.addEventListener('click', () => {
    lobbyChoiceView.classList.add('hidden');
    lobbyCreateView.classList.remove('hidden');
  });
}

if (showJoinBtn && lobbyChoiceView && lobbyJoinView) {
  showJoinBtn.addEventListener('click', () => {
    lobbyChoiceView.classList.add('hidden');
    lobbyJoinView.classList.remove('hidden');
  });
}

if (backToLobbyBtns) {
  backToLobbyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      lobbyCreateView.classList.add('hidden');
      lobbyJoinView.classList.add('hidden');
      lobbyChoiceView.classList.remove('hidden');
    });
  });
}

// Event Listeners
if (document.getElementById('createBtn')) {
  document.getElementById('createBtn').addEventListener('click', () => {
    const nameEl = document.getElementById('nameInput');
    const cashEl = document.getElementById('startCashSelect');
    const maxPlayersEl = document.getElementById('maxPlayersSelect');
    const mapEl = document.getElementById('mapSelect');
    const mortgageEl = document.getElementById('mortgageToggle');

    const name = nameEl ? nameEl.value.trim() : '';

    if (!name) return showToast('Please enter your name', 'error');

    // Check socket connection
    if (!socket.connected) {
      return showToast('Not connected to server. Please wait...', 'error');
    }

    const settings = {
      startingBalance: cashEl ? parseInt(cashEl.value) : 1500,
      maxPlayers: maxPlayersEl ? parseInt(maxPlayersEl.value) : 4,
      map: mapEl ? mapEl.value : 'world',
      mortgageEnabled: mortgageEl ? mortgageEl.checked : true
    };

    console.log('🎮 Creating room with:', { name, settings });
    socket.emit('create_room', { name, settings });
  });
}

if (joinBtn && nameInputJoin && roomInput) {
  joinBtn.addEventListener('click', () => {
    const name = nameInputJoin.value.trim();
    const roomId = roomInput.value.trim().toUpperCase();
    if (!name || !roomId) {
      showToast('Both name and room code are required', 'error');
      return;
    }

    // Check socket connection
    if (!socket.connected) {
      return showToast('Not connected to server. Please wait...', 'error');
    }

    console.log('🚪 Joining room:', { roomId, name });
    socket.emit('join_room', { roomId, name });
  });
}

// Roll dice button
if (rollBtn) {
  rollBtn.addEventListener('click', () => {
    console.log('🎲 Roll dice button clicked');
    rollBtn.disabled = true; // Prevent double-clicks
    socket.emit('roll_dice', { payBail: bailCheckbox?.checked || false });
  });
  console.log('✅ Roll button event listener attached');
} else {
  console.error('❌ Roll button not found in DOM');
}

// Buy property button
if (buyBtn) {
  buyBtn.addEventListener('click', () => {
    console.log('🏠 Buy property button clicked');
    buyBtn.disabled = true; // Prevent double-clicks
    socket.emit('buy_property');
  });
}

// End turn button
if (endTurnBtnCenter) {
  endTurnBtnCenter.addEventListener('click', () => {
    console.log('⏭ End turn button clicked');
    endTurnBtnCenter.disabled = true; // Prevent double-clicks
    socket.emit('end_turn');
  });
}

const handleStartAction = () => {
  console.log('🚀 Start Game action triggered!');
  console.log('Current context:', {
    myPlayerId,
    currentRoomId,
    hostId: gameState?.hostId,
    isHost: myPlayerId === gameState?.hostId,
    gameStatus: gameState?.gameStatus
  });
  socket.emit('start_game');
  if (startGameBtn) {
    startGameBtn.disabled = true;
    startGameBtn.textContent = 'Starting...';

    // Fallback: Re-enable if no response after 5s
    setTimeout(() => {
      if (gameState && gameState.gameStatus === 'waiting' && startGameBtn.disabled) {
        console.log('⚠️ Start game timed out or failed. Re-enabling button.');
        startGameBtn.disabled = false;
        startGameBtn.textContent = 'START GAME';
      }
    }, 5000);
  }
};

// Expose to window for manual console bypass if needed
window.forceStart = handleStartAction;

// Attach start button listener with delay to ensure DOM is ready
if (startGameBtn) {
  startGameBtn.addEventListener('click', handleStartAction);
  console.log('✅ Start button event listener attached');
} else {
  console.error('❌ Start button not found in DOM');
}

declareBankruptcyBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to declare bankruptcy?\n\nAll your properties will be sold and you will be out of the game. You can watch others playing.\n\nClick OK to proceed or Cancel to continue playing.')) {
    socket.emit('declare_bankruptcy');
  }
});

leaveGameBtn.addEventListener('click', () => {
  console.log('🔴 Leave Game button clicked');
  if (confirm('Are you sure you want to leave this game?\n\nYou will be permanently removed from the room.')) {
    console.log('✅ User confirmed leave');
    leaveGame();
  } else {
    console.log('❌ User cancelled leave');
  }
});

// Initialize UI based on session data
if (lobbyData.roomId && lobbyData.playerId) {
  console.log('🔄 Existing session detected, preparing for reconnection...');
  // Show game section immediately while reconnecting
  connectionScreen?.classList.add('hidden');
  gameSection?.classList.remove('hidden');
  leaveGameBtn?.classList.remove('hidden'); // Show leave button
  if (roomCode) roomCode.textContent = lobbyData.roomId;
  if (playerIdEl) playerIdEl.textContent = lobbyData.playerId.substring(0, 8) + '...';

  // Set a timeout for reconnection - if it fails, return to lobby
  const reconnectTimeout = setTimeout(() => {
    if (!currentRoomId || !myPlayerId) {
      console.log('⏰ Reconnection timeout - returning to lobby');
      showToast('Could not reconnect to previous game. Please create or join a room.', 'warning');
      leaveGame();
    }
  }, 5000); // 5 second timeout

  // Store timeout ID to clear it on successful reconnection
  window.reconnectTimeoutId = reconnectTimeout;
} else {
  // No session - hide leave button and show lobby
  leaveGameBtn?.classList.add('hidden');
}

// Socket Event Handlers
socket.on('room_created', ({ roomId, playerId }) => {
  currentRoomId = roomId;
  myPlayerId = playerId;

  // Clear reconnection timeout if exists
  if (window.reconnectTimeoutId) {
    clearTimeout(window.reconnectTimeoutId);
    window.reconnectTimeoutId = null;
  }

  // Save session for reconnection
  sessionStorage.setItem('monopolyLobby', JSON.stringify({
    roomId,
    playerId,
    name: nameInput.value || lobbyData.name
  }));

  roomStatus && (roomStatus.textContent = `Room created! Share code: ${roomId}`);
  roomCode.textContent = roomId;
  playerIdEl && (playerIdEl.textContent = playerId.substring(0, 8) + '...');
  connectionScreen?.classList.add('hidden');
  gameSection?.classList.remove('hidden');
  leaveGameBtn?.classList.remove('hidden'); // Show leave button
  showToast(`Room ${roomId} created successfully!`, 'success');
  
  // Show color selection modal after creating room
  setTimeout(() => {
    if (!hasSelectedColor && myPlayerId) {
      // Request current game state to ensure we have the latest player list
      socket.emit('get_game_state');
      
      // Show color selection after a short delay to ensure registration
      setTimeout(() => {
        if (!hasSelectedColor) {
          const takenColors = gameState?.players
            ?.filter(p => p.color)
            ?.map(p => p.color) || [];
          console.log('🎨 Showing color selection modal for room creator. Taken colors:', takenColors);
          showColorSelectionModal(takenColors);
        }
      }, 500);
    }
  }, 1500);
});

// Joining players receive their playerId here (host gets it via room_created)
socket.on('room_joined', ({ roomId, playerId }) => {
  console.log('✅ Joined room:', roomId, 'with player ID:', playerId);
  currentRoomId = roomId;
  myPlayerId = playerId;

  // Clear reconnection timeout if exists
  if (window.reconnectTimeoutId) {
    clearTimeout(window.reconnectTimeoutId);
    window.reconnectTimeoutId = null;
  }

  // Save session for reconnection
  sessionStorage.setItem('monopolyLobby', JSON.stringify({
    roomId,
    playerId,
    name: nameInputJoin.value || nameInput.value || lobbyData.name
  }));

  roomStatus && (roomStatus.textContent = `Joined room ${roomId}`);
  roomCode.textContent = roomId;
  playerIdEl && (playerIdEl.textContent = playerId.substring(0, 8) + '...');
  connectionScreen?.classList.add('hidden');
  gameSection?.classList.remove('hidden');
  leaveGameBtn?.classList.remove('hidden'); // Show leave button
  showToast(`Joined room ${roomId}`, 'success');

  // Trigger render in case we missed a state update
  if (typeof gameState !== 'undefined' && gameState) renderState(gameState);
  
  // Show color selection modal after joining
  setTimeout(() => {
    if (!hasSelectedColor && myPlayerId) {
      // Request current game state to ensure we have the latest player list
      socket.emit('get_game_state');
      
      // Show color selection after a short delay to ensure registration
      setTimeout(() => {
        if (!hasSelectedColor) {
          const takenColors = gameState?.players
            ?.filter(p => p.color)
            ?.map(p => p.color) || [];
          console.log('🎨 Showing color selection modal. Taken colors:', takenColors);
          showColorSelectionModal(takenColors);
        }
      }, 500);
    }
  }, 1500);
});

socket.on('player_joined', ({ player }) => {
  showToast(`${player.name} joined the game`, 'info');
});

socket.on('color_selected', ({ color }) => {
  console.log('🎨 RECEIVED color_selected event:', color);
  console.log('🎨 Current selectedColor before:', selectedColor);
  console.log('🎨 Current hasSelectedColor before:', hasSelectedColor);
  
  selectedColor = color;
  hasSelectedColor = true;
  
  console.log('🎨 Updated selectedColor:', selectedColor);
  console.log('🎨 Updated hasSelectedColor:', hasSelectedColor);
  
  hideColorSelectionModal();
  showToast(`Color selected: ${playerColors.find(c => c.value === color)?.name || color}`, 'success');
  
  console.log('🎨 Color selection modal hidden and toast shown');
});

socket.on('reconnected', ({ playerId }) => {
  console.log('✅ Successfully reconnected! Player ID:', playerId);
  myPlayerId = playerId;
  currentRoomId = lobbyData.roomId; // Restore from session
  showToast('Reconnected to game!', 'success');

  // Clear reconnection timeout
  if (window.reconnectTimeoutId) {
    clearTimeout(window.reconnectTimeoutId);
    window.reconnectTimeoutId = null;
  }

  // Make sure UI is updated
  if (roomCode) roomCode.textContent = currentRoomId;
  if (playerIdEl) playerIdEl.textContent = playerId.substring(0, 8) + '...';
  connectionScreen?.classList.add('hidden');
  gameSection?.classList.remove('hidden');

  // Trigger render in case we missed a state update during reconnection
  if (typeof gameState !== 'undefined' && gameState) renderState(gameState);
});

socket.on('player_reconnected', ({ player }) => {
  showToast(`${player.name} reconnected`, 'info');
});

socket.on('player_left', ({ playerName }) => {
  console.log(`👋 ${playerName} left the game - should trigger state update`);
  showToast(`${playerName} left the game`, 'warning');
});

socket.on('reconnect_failed', ({ message }) => {
  console.log('❌ Reconnection failed:', message);
  showToast(`Reconnection failed: ${message}. Returning to lobby...`, 'error');

  // Only remove if it's truly a "not found" error, not just a temporary issue
  if (message.includes('not found')) {
    sessionStorage.removeItem('monopolyLobby');
  }
  // Return to lobby after failed reconnection
  setTimeout(() => {
    leaveGame();
  }, 2000);
});

socket.on('game_started', () => {
  showToast('Game has started! Good luck!', 'success');
  if (startGameContainer) {
    startGameContainer.classList.add('hidden');
  }
});

socket.on('turn_changed', ({ playerId }) => {
  console.log('🔄 Turn changed to player:', playerId, 'My ID:', myPlayerId);
  if (gameState) {
    const player = gameState.players.find(p => p.playerId === playerId);
    if (player) {
      currentTurnEl.textContent = player.name;
      if (playerId === myPlayerId) {
        showToast("It's your turn!", 'info');
        console.log('✅ It\'s my turn now!');
      } else {
        console.log('⏳ Waiting for', player.name, 'to play');
      }
    }
  }
  // Force a state re-render to update button states
  if (gameState) {
    renderState(gameState);
  }
});

socket.on('dice_rolled', ({ playerId, dice }) => {
  lastDiceRoll = dice;
  isAnimating = true;
  renderState(gameState); // Update UI to disable buttons immediately

  // Add premium 3D rolling animation to dice with glow effects
  const diceContainer1 = die1.closest('.dice-container');
  const diceContainer2 = die2.closest('.dice-container');

  // Remove any previous show-X classes
  die1.className = 'dice';
  die2.className = 'dice';

  // Start the rolling animation
  die1.classList.add('rolling');
  die2.classList.add('rolling');
  if (diceContainer1) diceContainer1.classList.add('rolling');
  if (diceContainer2) diceContainer2.classList.add('rolling');

  // Clear the total display
  diceTotal.textContent = '';

  // After animation completes, show the result by rotating to correct face
  setTimeout(() => {
    // Remove rolling class
    die1.classList.remove('rolling');
    die2.classList.remove('rolling');
    if (diceContainer1) diceContainer1.classList.remove('rolling');
    if (diceContainer2) diceContainer2.classList.remove('rolling');

    // Add show-X class to rotate to the correct face with dots
    die1.classList.add(`show-${dice.die1}`);
    die2.classList.add(`show-${dice.die2}`);

    // Show the total
    diceTotal.innerHTML = `<span style="font-size: 1.2em; font-weight: 900;">Total: ${dice.total}</span>`;

    // Clear animation flag after dice and some buffer for movement
    setTimeout(() => {
      // Sync visual position with actual position after dice settle
      if (gameState) {
        const p = gameState.players.find(player => player.playerId === playerId);
        if (p) displayedPositions[playerId] = p.position;
      }
      renderState(gameState);
    }, 300); // Reduced from 500ms
  }, 600); // Reduced from 1000ms

  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  const playerName = player ? player.name : 'Player';

  setTimeout(() => {
    showToast(`🎲 ${playerName} rolled ${dice.die1} + ${dice.die2} = ${dice.total}`, 'info');
  }, 1000); // Reduced from 1500ms
});

socket.on('player_moved', ({ playerId, from, to }) => {
  isAnimating = true;
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    // Wait for dice to stop before moving token (600ms dice + 100ms buffer)
    setTimeout(() => {
      // Animate token movement with 3D effect
      animateTokenMovement(playerId, from, to);

      setTimeout(() => {
        showToast(`${player.name} moved from ${boardData[from].name} to ${boardData[to].name}`, 'info');
        displayedPositions[playerId] = to; // Update visual position after animation
        isAnimating = false;
        renderState(gameState);
      }, 500); // Reduced from 800ms
    }, 700); // Reduced from 1200ms
  }
});

socket.on('property_bought', ({ playerId, propertyIndex, price }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`${player.name} bought ${boardData[propertyIndex].name} for Rs ${price}`, 'success');
  }
});

socket.on('rent_paid', ({ fromPlayerId, toPlayerId, amount, propertyIndex }) => {
  const fromPlayer = gameState ? gameState.players.find(p => p.playerId === fromPlayerId) : null;
  const toPlayer = gameState ? gameState.players.find(p => p.playerId === toPlayerId) : null;
  if (fromPlayer && toPlayer) {
    showToast(`${fromPlayer.name} paid Rs ${amount} rent to ${toPlayer.name}`, 'info');
  }
});

socket.on('house_built', ({ playerId, propertyIndex, houses }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`${player.name} built a house on ${boardData[propertyIndex].name} (${houses} total)`, 'success');
  }
});

socket.on('hotel_built', ({ playerId, propertyIndex }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`${player.name} built a hotel on ${boardData[propertyIndex].name}!`, 'success');
  }
});

socket.on('sent_to_jail', ({ playerId }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`${player.name} was sent to jail!`, 'error');
  }
});

socket.on('doubles_rolled', ({ playerId, count, canRollAgain }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    const doublesEmoji = count === 1 ? '🎲' : count === 2 ? '🎲🎲' : '🎲🎲🎲';
    showToast(`${doublesEmoji} ${player.name} rolled DOUBLES! Gets to roll again! (${count}/3)`, 'success');
  }
});

socket.on('third_double_jail', ({ playerId }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`🚨 ${player.name} rolled THREE DOUBLES and goes to JAIL! 🚔`, 'error');
  }
});

socket.on('card_drawn', ({ playerId, card }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  const playerName = player ? player.name : 'Player';

  // Show enhanced toast with card title and description
  showToast(`${playerName} drew ${card.title}: ${card.text}`, 'info');
});

// ============================================
// PROPERTY POPOVER (Rebuilt)
// ============================================
let selectedPropertyIndex = null;

function openPropertyModal(index) { // Kept name for compatibility with onclick handlers
  console.log('🏠 Opening property modal for index:', index);
  if (!gameState) {
    console.log('❌ No gameState');
    return;
  }
  const cell = gameState.board.cells[index];
  if (!cell || cell.type !== 'property') {
    console.log('❌ Cell is not a property:', cell);
    return;
  }

  selectedPropertyIndex = index;
  console.log('✅ Cell data:', cell);

  // Element References (New IDs)
  const popover = document.getElementById('property-popover');
  const content = document.getElementById('property-popover-content');
  const nameEl = document.getElementById('pp-name');
  const costEl = document.getElementById('pp-cost');
  const colorEl = document.getElementById('pp-color-bar');
  const buildingsEl = document.getElementById('pp-buildings');

  console.log('📦 Popover element:', popover);
  console.log('📦 Content element:', content);

  if (!popover || !content) {
    console.error('❌ Popover elements not found!');
    return;
  }

  // New Button References
  const buildHouseBtn = document.getElementById('pp-btn-build-house');
  const buildHotelBtn = document.getElementById('pp-btn-build-hotel');
  const destroyBtn = document.getElementById('pp-btn-destroy');
  const destroyText = document.getElementById('pp-destroy-text');
  const mortgageBtn = document.getElementById('pp-btn-mortgage');
  const unmortgageBtn = document.getElementById('pp-btn-unmortgage');
  const liquidateBtn = document.getElementById('pp-btn-liquidate');
  const actionHint = document.getElementById('pp-action-hint');

  // 1. Basic Info
  nameEl.textContent = cell.name;
  costEl.textContent = `Rs ${cell.price}`;

  // 2. Color Bar
  const colorClass = cell.group ? `color-${cell.group}` : 'bg-slate-700';
  colorEl.className = `h-4 w-full ${colorClass}`;

  // 3. Buildings Info
  if (cell.hotels > 0) {
    buildingsEl.textContent = "🏨 1 Hotel";
  } else if (cell.houses > 0) {
    buildingsEl.textContent = `🏠 ${cell.houses} House${cell.houses > 1 ? 's' : ''}`;
  } else {
    buildingsEl.textContent = "No buildings";
  }

  // 6. Button States - Show/Hide based on property state
  const isMyProperty = cell.ownerId === myPlayerId;
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const canManage = isMyProperty && isMyTurn;
  const me = gameState.players.find(p => p.playerId === myPlayerId);
  const owner = cell.ownerId ? gameState.players.find(p => p.playerId === cell.ownerId) : null;

  // Debug logging
  console.log('Property Modal Debug:', {
    property: cell.name,
    isMyProperty,
    isMyTurn,
    buildable: cell.buildable,
    houses: cell.houses,
    hotels: cell.hotels,
    mortgaged: cell.isMortgaged,
    myBalance: me ? me.balance : 0,
    ownerId: cell.ownerId,
    myPlayerId,
    ownerName: owner ? owner.name : 'none'
  });

  // Calculate costs
  const houseCost = Math.max(1, Math.ceil(cell.price * HOUSE_COST_RATE));
  const hotelCost = houseCost * HOTEL_COST_MULTIPLIER;

  // Always show all buttons, but control disabled state
  actionHint.className = 'text-[9px] text-slate-500 text-center mt-1';

  // Determine what buttons to show based on property state (not ownership)
  if (cell.isMortgaged) {
    // Mortgaged property - show unmortgage only
    buildHouseBtn.classList.add('hidden');
    buildHotelBtn.classList.add('hidden');
    destroyBtn.classList.add('hidden');
    mortgageBtn.classList.add('hidden');

    unmortgageBtn.classList.remove('hidden');
    liquidateBtn.classList.remove('hidden');

    const unmortgageCost = Math.floor(cell.price / 2 * 1.1);
    unmortgageBtn.disabled = !isMyProperty || !isMyTurn || !me || me.balance < unmortgageCost;
    liquidateBtn.disabled = !isMyProperty || !isMyTurn;

    if (!isMyProperty) {
      actionHint.textContent = owner ? `Owned by ${owner.name} | Mortgaged` : 'Mortgaged property';
      actionHint.className = 'text-[9px] text-amber-400 text-center mt-1';
    } else if (!isMyTurn) {
      actionHint.textContent = '⏳ Wait for your turn to unmortgage';
      actionHint.className = 'text-[9px] text-yellow-400 text-center mt-1';
    } else if (me.balance < unmortgageCost) {
      actionHint.textContent = `💰 Need Rs ${unmortgageCost} to unmortgage`;
      actionHint.className = 'text-[9px] text-rose-400 text-center mt-1';
    } else {
      actionHint.textContent = `💰 Unmortgage cost: Rs ${unmortgageCost}`;
    }
  } else if (cell.hotels > 0) {
    // Has hotel
    buildHouseBtn.classList.add('hidden');
    buildHotelBtn.classList.add('hidden');
    mortgageBtn.classList.add('hidden');
    unmortgageBtn.classList.add('hidden');

    destroyBtn.classList.remove('hidden');
    liquidateBtn.classList.remove('hidden');
    destroyText.textContent = 'Sell Hotel';

    destroyBtn.disabled = !isMyProperty || !isMyTurn;
    liquidateBtn.disabled = !isMyProperty || !isMyTurn;

    const refund = Math.floor(houseCost / 2);
    if (!isMyProperty) {
      actionHint.textContent = owner ? `Owned by ${owner.name} | Has 1 Hotel` : 'Has 1 Hotel';
      actionHint.className = 'text-[9px] text-purple-400 text-center mt-1';
    } else if (!isMyTurn) {
      actionHint.textContent = '⏳ Wait for your turn to manage';
      actionHint.className = 'text-[9px] text-yellow-400 text-center mt-1';
    } else {
      actionHint.textContent = `💵 Sell hotel: +Rs ${refund} (returns to 4 houses)`;
    }
  } else if (cell.houses > 0) {
    // Has houses
    mortgageBtn.classList.add('hidden');
    unmortgageBtn.classList.add('hidden');

    if (cell.buildable) {
      if (cell.houses === 4) {
        buildHotelBtn.classList.remove('hidden');
        buildHotelBtn.disabled = !isMyProperty || !isMyTurn || !me || me.balance < hotelCost || gameState.hotelSupply <= 0;
      } else {
        buildHotelBtn.classList.add('hidden');
      }
      buildHouseBtn.classList.remove('hidden');
      buildHouseBtn.disabled = !isMyProperty || !isMyTurn || !me || me.balance < houseCost || cell.houses >= 4 || gameState.houseSupply <= 0;
    } else {
      buildHouseBtn.classList.add('hidden');
      buildHotelBtn.classList.add('hidden');
    }

    destroyBtn.classList.remove('hidden');
    destroyText.textContent = 'Sell House';
    destroyBtn.disabled = !isMyProperty || !isMyTurn;

    liquidateBtn.classList.remove('hidden');
    liquidateBtn.disabled = !isMyProperty || !isMyTurn;

    const refund = Math.floor(houseCost / 2);
    if (!isMyProperty) {
      actionHint.textContent = owner ? `Owned by ${owner.name} | ${cell.houses} House${cell.houses > 1 ? 's' : ''}` : `${cell.houses} Houses`;
      actionHint.className = 'text-[9px] text-blue-400 text-center mt-1';
    } else if (!isMyTurn) {
      actionHint.textContent = '⏳ Wait for your turn to manage';
      actionHint.className = 'text-[9px] text-yellow-400 text-center mt-1';
    } else {
      actionHint.textContent = cell.houses === 4 ? `🏨 Hotel cost: Rs ${hotelCost}` : `🏠 House cost: Rs ${houseCost}`;
    }
  } else {
    // No buildings
    unmortgageBtn.classList.add('hidden');
    destroyBtn.classList.add('hidden');

    if (cell.buildable) {
      buildHouseBtn.classList.remove('hidden');
      buildHouseBtn.disabled = !isMyProperty || !isMyTurn || !me || me.balance < houseCost || gameState.houseSupply <= 0;
      buildHotelBtn.classList.remove('hidden');
      buildHotelBtn.disabled = true; // Always disabled until 4 houses

      const mortgageAllowed = gameState.settings?.mortgageEnabled !== false;
      if (mortgageAllowed) {
        mortgageBtn.classList.remove('hidden');
        mortgageBtn.disabled = !isMyProperty || !isMyTurn;
      } else {
        mortgageBtn.classList.add('hidden');
      }

      liquidateBtn.classList.remove('hidden');
      liquidateBtn.disabled = !isMyProperty || !isMyTurn;

      const mortgageValue = Math.floor(cell.price / 2);
      if (!isMyProperty) {
        actionHint.textContent = owner ? `Owned by ${owner.name}` : '✨ Available for purchase';
        actionHint.className = owner ? 'text-[9px] text-indigo-400 text-center mt-1' : 'text-[9px] text-emerald-400 text-center mt-1';
      } else if (!isMyTurn) {
        actionHint.textContent = '⏳ Wait for your turn to build';
        actionHint.className = 'text-[9px] text-yellow-400 text-center mt-1';
      } else {
        const hintText = mortgageAllowed ? `🏠 House: Rs ${houseCost} | 🏚️ Mortgage: Rs ${mortgageValue}` : `🏠 House: Rs ${houseCost}`;
        actionHint.textContent = hintText;
      }
    } else {
      // Railroad/Utility - can't build
      buildHouseBtn.classList.add('hidden');
      buildHotelBtn.classList.add('hidden');

      const mortgageAllowed = gameState.settings?.mortgageEnabled !== false;
      if (mortgageAllowed) {
        mortgageBtn.classList.remove('hidden');
        mortgageBtn.disabled = !isMyProperty || !isMyTurn;
      } else {
        mortgageBtn.classList.add('hidden');
      }

      liquidateBtn.classList.remove('hidden');
      liquidateBtn.disabled = !isMyProperty || !isMyTurn;

      const mortgageValue = Math.floor(cell.price / 2);
      if (!isMyProperty) {
        actionHint.textContent = owner ? `Owned by ${owner.name} | Special Property` : '✨ Special Property - Available';
        actionHint.className = owner ? 'text-[9px] text-cyan-400 text-center mt-1' : 'text-[9px] text-emerald-400 text-center mt-1';
      } else if (!isMyTurn) {
        actionHint.textContent = '⏳ Wait for your turn to manage';
        actionHint.className = 'text-[9px] text-yellow-400 text-center mt-1';
      } else {
        const hintText = mortgageAllowed ? `🚆 Special Property | 🏚️ Mortgage: Rs ${mortgageValue}` : `🚆 Special Property`;
        actionHint.textContent = hintText;
      }
    }
  }

  // 7. Positioning Logic
  const cellRect = document.getElementById(`cell-${index}`).getBoundingClientRect();
  const popoverWidth = 300;
  const popoverHeight = 380; // Adjusted for improved layout
  const gap = 12;

  // Reset styles
  content.style.top = '';
  content.style.left = '';
  content.style.bottom = '';
  content.style.right = '';
  content.style.transform = '';
  content.style.transformOrigin = 'center';

  const { row, col } = getCellGridPosition(index);
  let top, left;

  // Decide position based on board side
  if (row === 10) { // Bottom row
    top = cellRect.top - popoverHeight - gap;
    left = cellRect.left + (cellRect.width / 2) - (popoverWidth / 2);
    content.style.transformOrigin = 'bottom center';
  } else if (row === 0) { // Top row
    top = cellRect.bottom + gap;
    left = cellRect.left + (cellRect.width / 2) - (popoverWidth / 2);
    content.style.transformOrigin = 'top center';
  } else if (col === 0) { // Left column
    top = cellRect.top + (cellRect.height / 2) - (popoverHeight / 2);
    left = cellRect.right + gap;
    content.style.transformOrigin = 'center left';
  } else if (col === 10) { // Right column
    top = cellRect.top + (cellRect.height / 2) - (popoverHeight / 2);
    left = cellRect.left - popoverWidth - gap;
    content.style.transformOrigin = 'center right';
  }

  // Viewport Boundary Protection
  const padding = 20;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Horizontal boundaries
  if (left < padding) {
    left = padding;
  }
  if (left + popoverWidth > viewportWidth - padding) {
    left = viewportWidth - popoverWidth - padding;
  }

  // Vertical boundaries
  if (top < padding) {
    top = padding;
  }
  if (top + popoverHeight > viewportHeight - padding) {
    top = viewportHeight - popoverHeight - padding;
  }

  content.style.top = `${top}px`;
  content.style.left = `${left}px`;

  console.log('📍 Positioning popover at:', { top, left, row, col, cellRect });

  // Show
  popover.classList.remove('hidden');
  console.log('✅ Popover shown, classes:', popover.classList);

  // Animation
  requestAnimationFrame(() => {
    content.classList.remove('opacity-0', 'scale-95');
    content.classList.add('opacity-100', 'scale-100');
    console.log('✅ Animation applied');
  });
}

function closePropertyPopover() {
  const popover = document.getElementById('property-popover');
  const content = document.getElementById('property-popover-content');

  if (content) {
    content.classList.add('opacity-0', 'scale-95');
    content.classList.remove('opacity-100', 'scale-100');
  }

  setTimeout(() => {
    if (popover) popover.classList.add('hidden');
  }, 200);
}

// Redirect old close function if called by older code
function closePropertyModal() {
  closePropertyPopover();
}


// Redefine liquidateFromModal to use the new close function
function liquidateFromModal() {
  liquidatePropertyFromPopover();
}

// New property management functions
function buildHouseFromPopover() {
  if (selectedPropertyIndex === null) return;
  socket.emit('build_house', { propertyIndex: selectedPropertyIndex });
  closePropertyPopover();
}

function buildHotelFromPopover() {
  if (selectedPropertyIndex === null) return;
  socket.emit('build_hotel', { propertyIndex: selectedPropertyIndex });
  closePropertyPopover();
}

function destroyBuildingFromPopover() {
  if (selectedPropertyIndex === null) return;
  if (!gameState) return;

  const cell = gameState.board.cells[selectedPropertyIndex];
  const buildingType = cell.hotels > 0 ? 'hotel' : 'house';
  const message = cell.hotels > 0
    ? 'Sell hotel? It will return to 4 houses and refund 50% of the original house cost.'
    : 'Sell one house for 50% refund?';

  if (confirm(message)) {
    socket.emit('sell_property', { propertyIndex: selectedPropertyIndex });
    closePropertyPopover();
  }
}

function mortgagePropertyFromPopover() {
  if (selectedPropertyIndex === null) return;
  if (!gameState) return;

  const cell = gameState.board.cells[selectedPropertyIndex];
  const refund = Math.floor(cell.price / 2);

  if (confirm(`Mortgage this property for Rs ${refund}? You'll need to pay 10% interest to unmortgage.`)) {
    socket.emit('sell_property', { propertyIndex: selectedPropertyIndex });
    closePropertyPopover();
  }
}

function unmortgagePropertyFromPopover() {
  if (selectedPropertyIndex === null) return;
  if (!gameState) return;

  const cell = gameState.board.cells[selectedPropertyIndex];
  const cost = Math.floor(cell.price / 2 * 1.1);

  if (confirm(`Unmortgage this property for Rs ${cost}?`)) {
    socket.emit('unmortgage_property', { propertyIndex: selectedPropertyIndex });
    closePropertyPopover();
  }
}

function liquidatePropertyFromPopover() {
  if (selectedPropertyIndex === null) return;
  if (confirm('Permanently liquidate this property? It will be sold back to the bank for 50% of its value.')) {
    socket.emit('liquidate_property', { propertyIndex: selectedPropertyIndex });
    closePropertyPopover();
  }
}

// Expose functions to window for onclick handlers
window.openPropertyModal = openPropertyModal;
window.closePropertyModal = closePropertyModal; // mapped to closePropertyPopover
window.closePropertyPopover = closePropertyPopover;
window.liquidateFromModal = liquidateFromModal;
window.buildHouseFromPopover = buildHouseFromPopover;
window.buildHotelFromPopover = buildHotelFromPopover;
window.destroyBuildingFromPopover = destroyBuildingFromPopover;
window.mortgagePropertyFromPopover = mortgagePropertyFromPopover;
window.unmortgagePropertyFromPopover = unmortgagePropertyFromPopover;
window.liquidatePropertyFromPopover = liquidatePropertyFromPopover;

socket.on('paid_bail', ({ playerId }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`💰 ${player.name} paid Rs 50 bail and left jail. Cannot move this turn.`, 'info');
  }
});

socket.on('jail_released', ({ playerId }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`🔓 ${player.name} served time and is released from jail!`, 'success');
  }
});

socket.on('jail_escape_doubles', ({ playerId }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`🎲 ${player.name} rolled DOUBLES and escapes from jail!`, 'success');
  }
});

socket.on('vacation_skip', ({ playerId, turnCount }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`🏖️ ${player.name} is on vacation (turn ${turnCount}/2). Turn skipped.`, 'info');
  }
});

socket.on('vacation_ended', ({ playerId }) => {
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    showToast(`✈️ ${player.name} returns from vacation!`, 'success');
  }
});

socket.on('game_over', ({ winnerName }) => {
  showToast(`🎉 Game Over! Winner: ${winnerName}! 🎉`, 'success');
  sessionStorage.removeItem('monopolyLobby');
});

socket.on('error_message', ({ message }) => {
  showToast(message, 'error');
});

socket.on('left_game', ({ message }) => {
  console.log('✅ Successfully left game:', message);
  showToast('Successfully left the game', 'success');
  
  // Now complete the cleanup
  completeLeaveGame();
});

socket.on('game_state_update', (state) => {
  console.log('📥 Game state updated. Players count:', state.players?.length);
  console.log('📥 Players:', state.players?.map(p => ({ name: p.name, color: p.color, id: p.playerId })).join(', '));
  gameState = state;
  renderState(state);
  
  // Show color modal if player hasn't selected color yet
  if (!hasSelectedColor && myPlayerId) {
    const me = state.players?.find(p => p.playerId === myPlayerId);
    console.log('🔍 Looking for player with ID:', myPlayerId);
    console.log('🔍 Found player:', me ? me.name : 'Not found');
    console.log('🔍 Player color:', me ? me.color : 'None');
    
    if (me && !me.color) {
      const takenColors = state.players
        .filter(p => p.color)
        .map(p => p.color);
      console.log('🎨 Player found without color, showing selection modal. Taken colors:', takenColors);
      showColorSelectionModal(takenColors);
    }
  }
});

// Trade notification listeners
socket.on('trade_created', ({ trade }) => {
  if (!gameState) return;

  const fromPlayer = gameState.players.find((p) => p.playerId === trade.fromPlayerId);
  const toPlayer = gameState.players.find((p) => p.playerId === trade.toPlayerId);

  if (trade.toPlayerId === myPlayerId) {
    showToast(`💼 Trade offer received from ${fromPlayer?.name || 'Unknown'}!`, 'info');
  } else if (trade.fromPlayerId === myPlayerId) {
    showToast(`✅ Trade offer sent to ${toPlayer?.name || 'Unknown'}!`, 'success');
  } else {
    showToast(`💼 Trade created between ${fromPlayer?.name || 'Player'} and ${toPlayer?.name || 'Player'}`, 'info');
  }
});

socket.on('trade_finalized', ({ trade, result }) => {
  if (!gameState) return;

  const outcome = result || trade.status;
  const fromPlayer = gameState.players.find((p) => p.playerId === trade.fromPlayerId);
  const toPlayer = gameState.players.find((p) => p.playerId === trade.toPlayerId);

  switch (outcome) {
    case 'ACCEPTED':
      if (trade.fromPlayerId === myPlayerId) {
        showToast(`✅ ${toPlayer?.name || 'Player'} accepted your trade!`, 'success');
      } else if (trade.toPlayerId === myPlayerId) {
        showToast(`✅ You accepted the trade from ${fromPlayer?.name || 'Player'}!`, 'success');
      } else {
        showToast(`💼 Trade completed between ${fromPlayer?.name || 'Player'} and ${toPlayer?.name || 'Player'}`, 'info');
      }
      break;
    case 'REJECTED':
      if (trade.toPlayerId === myPlayerId) {
        showToast('❌ You rejected the trade.', 'error');
      } else {
        showToast(`❌ Trade rejected by ${toPlayer?.name || 'Player'}`, 'error');
      }
      break;
    case 'COUNTERED':
      showToast(`♻️ ${toPlayer?.name || 'Player'} sent a counter offer`, 'info');
      break;
    default:
      showToast('ℹ️ Trade updated.', 'info');
      break;
  }
});

socket.on('trade_cancelled', ({ reason }) => {
  showToast(`❌ Trade cancelled: ${reason}`, 'error');
});

// Build house on property
function buildHouse(propertyIndex) {
  socket.emit('build_house', { propertyIndex });
}

// Build hotel on property
function buildHotel(propertyIndex) {
  socket.emit('build_hotel', { propertyIndex });
}

// Sell house/hotel or mortgage property
function sellProperty(propertyIndex) {
  socket.emit('sell_property', { propertyIndex });
}

// Unmortgage property
function unmortgageProperty(propertyIndex) {
  socket.emit('unmortgage_property', { propertyIndex });
}

// Help calculating building costs
function calcHouseCost(cell) {
  if (!cell || !cell.price) return 0;
  return Math.max(1, Math.ceil(cell.price * HOUSE_COST_RATE));
}

function calcHotelCost(cell) {
  const houseCost = calcHouseCost(cell);
  return houseCost * HOTEL_COST_MULTIPLIER;
}

// Initialize board (once)
function initBoard() {
  const boardGrid = document.getElementById('board-grid');
  if (!boardGrid) return;

  const cells = boardGrid.querySelectorAll('.cell');
  if (cells.length === 40) return; // Already initialized

  boardGrid.innerHTML = '';

  // Create all 40 cells with grid positioning
  for (let i = 0; i < 40; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.id = `cell-${i}`;

    const { row, col } = cellPositions[i];
    cell.style.gridRow = row + 1;
    cell.style.gridColumn = col + 1;

    const cellData = boardData[i];

    // Orientation classes
    if (row === 0) cell.classList.add('top');
    if (row === 10) cell.classList.add('bottom');
    if (col === 10) cell.classList.add('right');
    if (col === 0) cell.classList.add('left');

    if (i === 0 || i === 10 || i === 20 || i === 30) {
      cell.classList.add('corner');
    }

    const nameDiv = document.createElement('div');
    nameDiv.className = 'cell-name';
    nameDiv.textContent = cellData.name;

    if (cellData.color) {
      const colorDiv = document.createElement('div');
      colorDiv.className = `cell-color color-${cellData.color}`;
      cell.appendChild(colorDiv);
    }

    cell.appendChild(nameDiv);
    boardGrid.appendChild(cell);
  }
}

// Render buildable properties UI
function renderBuildableProperties(state) {
  if (!buildablePropertiesEl || !state || !gameState) return;

  const me = state.players.find(p => p.playerId === myPlayerId);
  if (!me || me.isBankrupt) {
    buildablePropertiesEl.innerHTML = '<p class="text-xs text-slate-500 italic">Not available</p>';
    return;
  }

  const myProperties = state.board.cells.filter(cell =>
    cell.type === 'property' && cell.ownerId === myPlayerId
  );

  if (myProperties.length === 0) {
    buildablePropertiesEl.innerHTML = '<p class="text-xs text-slate-500 italic">You don\'t own any buildable properties</p>';
    return;
  }

  buildablePropertiesEl.innerHTML = '';

  myProperties.forEach(cell => {
    const propertyDiv = document.createElement('div');
    propertyDiv.className = `p-2 flex justify-between items-center bg-gradient-to-r ${cell.isMortgaged ? 'from-slate-900 to-black opacity-60' : 'from-slate-800 to-slate-900'} rounded-lg border ${cell.isMortgaged ? 'border-amber-900/50' : 'border-slate-700'} cursor-pointer hover:border-slate-500 transition-all`;
    propertyDiv.onclick = () => openPropertyModal(cell.index);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'font-bold text-xs text-white flex items-center gap-2';
    nameDiv.innerHTML = `${cell.name} ${cell.isMortgaged ? '<span class="text-[9px] bg-amber-900/80 text-amber-400 px-1 rounded">MORTGAGED</span>' : ''}`;

    const priceDiv = document.createElement('div');
    priceDiv.className = 'text-[10px] font-bold text-yellow-500';
    priceDiv.textContent = `Rs ${cell.price}`;

    propertyDiv.appendChild(nameDiv);
    propertyDiv.appendChild(priceDiv);
    buildablePropertiesEl.appendChild(propertyDiv);
  });
}


// Render game state
function renderState(state) {
  if (!state) return;

  gameSection.classList.remove('hidden');
  connectionScreen?.classList.add('hidden');

  currentRoomId = state.roomId;
  roomCode.textContent = state.roomId;
  if (gameStatusEl) gameStatusEl.textContent = state.gameStatus.toUpperCase();

  // Update supplies
  if (houseSupplyEl) houseSupplyEl.textContent = state.houseSupply || 32;
  if (hotelSupplyEl) hotelSupplyEl.textContent = state.hotelSupply || 12;

  // Show/hide start button for host in waiting state
  if (state.gameStatus === 'waiting' && state.hostId === myPlayerId) {
    if (startGameContainer.classList.contains('hidden')) {
      console.log('👑 Host detected! Showing START GAME button.');
    }
    startGameContainer.classList.remove('hidden');
    const minPlayers = 2; // Richup style minimum
    const playersCount = state.players.filter(p => !p.isBankrupt).length;
    const canStart = playersCount >= minPlayers;

    console.log(`📊 Start condition check: ${playersCount}/${minPlayers} players. canStart=${canStart}`);

    // Ensure the container itself is clickable and high enough
    if (startGameContainer) {
      startGameContainer.style.pointerEvents = 'auto';
      startGameContainer.style.zIndex = '9999';
    }

    if (startGameBtn) {
      startGameBtn.disabled = !canStart;
      startGameBtn.style.zIndex = '10000';
      startGameBtn.style.position = 'relative';

      // Update button visual state
      if (!canStart) {
        startGameBtn.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale-[0.5]');
        startGameBtn.classList.remove('animate-pulse', 'hover:scale-105', 'cursor-pointer');
        startGameBtn.title = `Need at least ${minPlayers} players to start (Currently: ${playersCount})`;
        console.log('⛔ Button disabled: Not enough players');
      } else {
        startGameBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale-[0.5]');
        startGameBtn.classList.add('animate-pulse', 'hover:scale-105', 'cursor-pointer');
        startGameBtn.title = 'Click to start the game';
        console.log('✅ Button enabled: Ready to start!');
      }
    }
  } else {
    if (state.gameStatus === 'waiting') {
      console.log('⏳ Not the host. Host is:', state.hostId, 'My ID:', myPlayerId);
    }
    startGameContainer.classList.add('hidden');
  }

  const currentPlayer = state.players.find(p => p.playerId === state.currentTurnPlayerId);
  if (currentPlayer) {
    currentTurnEl.textContent = currentPlayer.name;
  } else {
    if (state.gameStatus === 'waiting') {
      currentTurnEl.innerHTML = '<span class="waiting-indicator text-orange-500 font-bold">Waiting for host to start...</span>';
    } else {
      currentTurnEl.textContent = 'Waiting...';
    }
  }

  // Update board state without full rebuild
  state.board.cells.forEach((cell, index) => {
    const cellEl = document.getElementById(`cell-${index}`);
    if (!cellEl) return;

    // Update click listeners if not set
    if (cell.type === 'property' && !cellEl.onclick) {
      cellEl.classList.add('cursor-pointer', 'hover:bg-white/5', 'transition-colors');
      cellEl.onclick = () => openPropertyModal(index);

      // Add price info if not exists
      if (!cellEl.querySelector('.cell-info')) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cell-info';
        infoDiv.innerHTML = `<div class="cell-price">Rs ${cell.price}</div>`;
        cellEl.appendChild(infoDiv);
      }
    }

    // Owner and indicators
    const playerIndex = cell.ownerId ? state.players.findIndex(p => p.playerId === cell.ownerId) : -1;
    if (playerIndex !== -1) {
      cellEl.classList.add('has-owner');

      let ownerBar = cellEl.querySelector('.owner-bar');
      if (!ownerBar) {
        ownerBar = document.createElement('div');
        ownerBar.className = 'owner-bar';
        cellEl.appendChild(ownerBar);
      }
      // Use player's chosen color
      const ownerPlayer = state.players[playerIndex];
      ownerBar.style.background = ownerPlayer?.color || playerColors[playerIndex % playerColors.length].value;

      // Buildings
      if (cell.buildable && (cell.houses > 0 || cell.hotels > 0)) {
        let buildingIndicator = cellEl.querySelector('.building-indicator');
        if (!buildingIndicator) {
          buildingIndicator = document.createElement('div');
          buildingIndicator.className = 'building-indicator';
          cellEl.appendChild(buildingIndicator);
        }

        // Only update if count changed
        const currentBuildingCount = buildingIndicator.children.length;
        const targetBuildingCount = cell.hotels > 0 ? 1 : cell.houses;
        const isHotel = cell.hotels > 0;

        if (currentBuildingCount !== targetBuildingCount || (isHotel && !buildingIndicator.querySelector('.hotel-icon'))) {
          buildingIndicator.innerHTML = '';
          if (isHotel) {
            const hotelIcon = document.createElement('div');
            hotelIcon.className = 'hotel-icon';
            hotelIcon.textContent = 'H';
            buildingIndicator.appendChild(hotelIcon);
          } else {
            for (let i = 0; i < cell.houses; i++) {
              const houseIcon = document.createElement('div');
              houseIcon.className = 'house-icon';
              buildingIndicator.appendChild(houseIcon);
            }
          }
        }
      } else {
        const bInd = cellEl.querySelector('.building-indicator');
        if (bInd) bInd.remove();
      }
    } else {
      cellEl.classList.remove('has-owner', 'is-mortgaged');
      const bar = cellEl.querySelector('.owner-bar');
      if (bar) bar.remove();
      const bInd = cellEl.querySelector('.building-indicator');
      if (bInd) bInd.remove();
    }

    // Mortgage indicator
    if (cell.isMortgaged) {
      cellEl.classList.add('is-mortgaged');
      if (!cellEl.querySelector('.mortgage-badge')) {
        const badge = document.createElement('div');
        badge.className = 'mortgage-badge';
        badge.textContent = 'M';
        cellEl.appendChild(badge);
      }
    } else {
      cellEl.classList.remove('is-mortgaged');
      const badge = cellEl.querySelector('.mortgage-badge');
      if (badge) badge.remove();
    }
  });

  // Efficient token updates
  state.players.forEach((player, index) => {
    if (player.isBankrupt) {
      const oldToken = document.getElementById(`token-${player.playerId}`);
      if (oldToken) oldToken.remove();
      return;
    }

    const visualPos = (displayedPositions[player.playerId] !== undefined)
      ? displayedPositions[player.playerId]
      : player.position;

    if (!isAnimating) {
      displayedPositions[player.playerId] = player.position;
    }

    let token = document.getElementById(`token-${player.playerId}`);
    if (!token) {
      token = document.createElement('div');
      token.id = `token-${player.playerId}`;
      token.className = 'player-token';
      // Use player's chosen color
      token.style.background = player.color || playerColors[index % playerColors.length].value;
      token.title = player.name;
    }

    const cellEl = document.getElementById(`cell-${visualPos}`);
    if (cellEl && token.parentElement !== cellEl) {
      // Reposition within cell
      const offset = index * 18; // Slightly smaller offset
      const { row, col } = getCellGridPosition(visualPos);

      token.style.left = 'auto'; token.style.right = 'auto';
      token.style.top = 'auto'; token.style.bottom = 'auto';

      if (row === 0) { token.style.left = `${5 + offset}px`; token.style.bottom = `5px`; }
      else if (row === 10) { token.style.left = `${5 + offset}px`; token.style.top = `5px`; }
      else if (col === 0) { token.style.left = `5px`; token.style.top = `${5 + offset}px`; }
      else if (col === 10) { token.style.right = `5px`; token.style.top = `${5 + offset}px`; }

      cellEl.appendChild(token);
    }
  });

  // Update players list - Minimalist Design
  playersList.innerHTML = '';
  state.players.forEach((player, index) => {
    const card = document.createElement('div');
    card.className = 'relative py-1.5 px-2 transition-all duration-300 border-b border-white/5 last:border-0 group';

    if (player.playerId === state.currentTurnPlayerId) {
      // Simple highlight with a color for the current player
      card.classList.add('bg-indigo-500/20', 'rounded-lg');
    } else if (player.isBankrupt) {
      card.classList.add('opacity-40', 'grayscale');
    }

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center gap-2 relative z-10';

    const tokenColor = document.createElement('div');
    tokenColor.className = 'w-6 h-6 rounded-lg border-2 border-white/20 shadow-sm flex items-center justify-center font-black text-white text-[9px]';
    // Use player's chosen color
    const baseColor = player.color || playerColors[index % playerColors.length].value;
    tokenColor.style.background = `linear-gradient(135deg, ${baseColor}, ${adjustBrightness(baseColor, -20)})`;
    tokenColor.textContent = player.name[0].toUpperCase();

    const nameSpan = document.createElement('span');
    nameSpan.className = 'font-bold text-white text-xs flex-1 ml-2 truncate';
    nameSpan.textContent = player.name;
    if (player.playerId === myPlayerId) {
      const youBadge = document.createElement('span');
      youBadge.className = 'ml-1 px-1 py-0.5 bg-indigo-500/80 text-white text-[7px] font-bold rounded-md';
      youBadge.textContent = 'YOU';
      nameSpan.appendChild(youBadge);
    }

    const balanceAmount = document.createElement('div');
    balanceAmount.className = 'text-sm font-black text-yellow-400 text-right drop-shadow-[0_0_10px_rgba(250,204,21,0.3)] shrink-0';
    balanceAmount.textContent = `$${player.balance}`;

    const nameContainer = document.createElement('div');
    nameContainer.className = 'flex items-center flex-1 min-w-0';
    nameContainer.appendChild(tokenColor);
    nameContainer.appendChild(nameSpan);

    // Dynamic Trade Button for other players
    if (player.playerId !== myPlayerId && !player.isBankrupt && state.gameStatus === 'active') {
      const quickTradeBtn = document.createElement('button');
      quickTradeBtn.className = 'ml-auto mr-2 p-1.5 bg-purple-500/10 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all opacity-0 group-hover:opacity-100';
      quickTradeBtn.title = `Trade with ${player.name}`;
      quickTradeBtn.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      `;
      quickTradeBtn.onclick = (e) => {
        e.stopPropagation();
        openTradeModal({ toPlayerId: player.playerId });
      };
      header.appendChild(quickTradeBtn);
    }

    header.appendChild(nameContainer);
    header.appendChild(balanceAmount);

    const statusDiv = document.createElement('div');
    statusDiv.className = 'text-[9px] font-medium mt-0.5 relative z-10';
    const statusText = player.isBankrupt ? 'Bankrupt' : 'Active';
    const statusColor = player.isBankrupt ? 'text-rose-400' : 'text-cyan-300';
    statusDiv.className += ` ${statusColor}`;
    statusDiv.textContent = statusText;

    card.appendChild(header);
    card.appendChild(statusDiv);
    playersList.appendChild(card);
  });

  // Ensure board is initialized
  initBoard();

  // Refresh gameLog reference in case it was modified
  if (!gameLog) gameLog = document.getElementById('gameLog');

  // Update game log
  if (gameLog) {
    gameLog.innerHTML = '';
    state.gameLog.slice(-20).forEach(msg => {
      const msgEl = document.createElement('div');
      msgEl.className = 'log-message';
      msgEl.textContent = msg;
      gameLog.appendChild(msgEl);
    });
    gameLog.scrollTop = gameLog.scrollHeight;
  }

  // Update property status
  if (state.pendingPropertyIndex !== null) {
    const cell = state.board.cells[state.pendingPropertyIndex];
    propertyStatus.innerHTML = `
      <div class="font-bold text-white mb-1 text-xs">🏠 ${cell.name}</div>
      <div class="text-[10px] text-slate-300 mb-1.5">Price: Rs ${cell.price} | Rent: Rs ${cell.rent}</div>
      <div class="text-[10px] text-emerald-400 font-semibold">Click "Buy Property" to purchase!</div>
    `;
    propertyStatus.className = 'p-2.5 bg-emerald-900/30 border-2 border-emerald-500/50 rounded-lg text-[10px]';
  } else {
    propertyStatus.innerHTML = 'No property action pending';
    propertyStatus.className = 'p-2.5 bg-slate-800/50 rounded-lg text-[10px] text-slate-400 font-medium';
  }

  // Update buildable properties
  renderBuildableProperties(state);

  // Update button states
  const isMyTurn = state.currentTurnPlayerId === myPlayerId;
  const me = state.players.find(p => p.playerId === myPlayerId);
  const gameActive = state.gameStatus === 'active';
  const canAct = isMyTurn && gameActive && me && !me.isBankrupt;
  const hasRolled = state.turnHasRolled && isMyTurn;
  const canRollAgain = state.canRollAgain && isMyTurn;

  // Set disabled states
  const isInDebt = me && me.balance < 0;
  if (rollBtn) rollBtn.disabled = isAnimating || !canAct || (hasRolled && !canRollAgain) || isInDebt;
  if (buyBtn) buyBtn.disabled = isAnimating || !canAct || state.pendingPropertyIndex === null || isInDebt;
  if (endTurnBtnCenter) endTurnBtnCenter.disabled = isAnimating || !canAct || !hasRolled || canRollAgain || isInDebt;

  // Update button visibility and text based on state
  console.log('[DEBUG] Button visibility logic:', { gameActive, isMyTurn, hasRolled, canRollAgain, pendingPropertyIndex: state.pendingPropertyIndex });

  // Show Bankruptcy button always during active game (unless already bankrupt)
  if (declareBankruptcyBtn) {
    declareBankruptcyBtn.style.display = (gameActive && me && !me.isBankrupt) ? 'block' : 'none';
  }

  if (!gameActive || !isMyTurn) {
    // Hide all buttons when not your turn or game not started
    if (rollBtn) rollBtn.style.display = 'none';
    if (buyBtn) buyBtn.style.display = 'none';
    if (endTurnBtnCenter) endTurnBtnCenter.style.display = 'none';
    if (bailWrapper) bailWrapper.style.display = 'none';
  } else {
    // It's my turn and game is active

    // Roll Button logic
    if (!hasRolled || canRollAgain) {
      if (rollBtn) {
        rollBtn.style.display = 'block';
        rollBtn.style.pointerEvents = 'auto';
        rollBtn.style.position = 'relative';
        rollBtn.style.zIndex = '10000';
        const label = canRollAgain ? '🎲 ROLL AGAIN (DOUBLES!)' : '🎲 ROLL';
        const btnClass = canRollAgain
          ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600'
          : 'bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800';

        rollBtn.className = `premium-btn w-full py-2.5 ${btnClass} text-white font-bold text-xs rounded-xl shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group/btn cursor-pointer`;
        rollBtn.textContent = label;
      }
    } else {
      if (rollBtn) rollBtn.style.display = 'none';
    }

    // Bail Checkbox logic
    if (bailWrapper) {
      bailWrapper.style.display = (!hasRolled && me?.inJail) ? 'block' : 'none';
    }

    // Action Buttons logic (shown after rolling)
    if (hasRolled || canRollAgain) {
      // Buy Property button - Show if landed on buyable property, even on doubles
      if (state.pendingPropertyIndex !== null) {
        if (buyBtn) {
          buyBtn.style.display = 'block';
          buyBtn.style.pointerEvents = 'auto';
          buyBtn.style.position = 'relative';
          buyBtn.style.zIndex = '10000';
          buyBtn.textContent = '🏠 BUY';
        }
      } else {
        if (buyBtn) buyBtn.style.display = 'none';
      }

      // End Turn button (only show if NOT able to roll again)
      if (hasRolled && !canRollAgain) {
        if (endTurnBtnCenter) {
          endTurnBtnCenter.style.display = 'block';
          endTurnBtnCenter.style.pointerEvents = 'auto';
          endTurnBtnCenter.style.position = 'relative';
          endTurnBtnCenter.style.zIndex = '10000';
          endTurnBtnCenter.textContent = '⏭ NEXT TURN';
        }
      } else {
        if (endTurnBtnCenter) endTurnBtnCenter.style.display = 'none';
      }
    } else {
      // Haven't rolled yet
      if (buyBtn) buyBtn.style.display = 'none';
      if (endTurnBtnCenter) endTurnBtnCenter.style.display = 'none';
    }
  }

  // Keep trade dropdown options in sync with current players while the modal is open
  if (!tradeModal.classList.contains('hidden')) {
    populatePlayerDropdown();
  }

  renderTrades(state);

  // Refresh property modal if open
  if (selectedPropertyIndex !== null && !document.getElementById('propertyModal').classList.contains('hidden')) {
    openPropertyModal(selectedPropertyIndex);
  }
}

// ============================================
// PREMIUM TRADE MODAL SYSTEM
// ============================================

const tradeModal = document.getElementById('tradeModal');
const openTradeBtn = document.getElementById('openTradeBtn');
const submitTradeBtn = document.getElementById('submitTradeBtn');
const tradePlayerSelect = document.getElementById('tradePlayerSelect');
const offerMoney = document.getElementById('offerMoney');
const requestMoney = document.getElementById('requestMoney');
const offerJailCards = document.getElementById('offerJailCards');
const requestJailCards = document.getElementById('requestJailCards');
const offerProperties = document.getElementById('offerProperties');
const requestProperties = document.getElementById('requestProperties');
const tradeInboxList = document.getElementById('tradeInboxList');
const myTradeBalance = document.getElementById('myTradeBalance');
const theirTradeBalance = document.getElementById('theirTradeBalance');

let lockedTradeTarget = null; // When countering, target is fixed to the original sender

let selectedOfferProperties = new Set();
let selectedRequestProperties = new Set();

function openTradeModal(prefill = null) {
  if (!gameState) return;

  lockedTradeTarget = prefill?.toPlayerId || null;
  selectedOfferProperties = new Set(prefill?.offered?.properties || []);
  selectedRequestProperties = new Set(prefill?.requested?.properties || []);
  offerMoney.value = prefill?.offered?.money ?? 0;
  requestMoney.value = prefill?.requested?.money ?? 0;
  offerJailCards.value = prefill?.offered?.jailCards ?? 0;
  requestJailCards.value = prefill?.requested?.jailCards ?? 0;

  populatePlayerDropdown();
  tradePlayerSelect.value = lockedTradeTarget || prefill?.toPlayerId || '';

  // Update balances
  const myPlayer = gameState.players.find(p => p.playerId === myPlayerId);
  if (myPlayer && myTradeBalance) myTradeBalance.textContent = `Rs ${myPlayer.balance}`;

  updateTargetTradeBalance(tradePlayerSelect.value);

  populateOfferProperties();
  populateRequestProperties(tradePlayerSelect.value);

  // Lock the dropdown when countering so negotiation stays with original sender
  tradePlayerSelect.disabled = !!lockedTradeTarget;

  tradeModal.classList.remove('hidden');
  setTimeout(() => {
    tradeModal.querySelector('.relative.bg-slate-900').style.animation = 'slideIn 0.3s ease-out';
  }, 10);
}

openTradeBtn.addEventListener('click', () => openTradeModal());

function closeTradeModal() {
  lockedTradeTarget = null;
  tradePlayerSelect.disabled = false;
  tradeModal.classList.add('hidden');
}

window.closeTradeModal = closeTradeModal;

// Populate player dropdown
function populatePlayerDropdown() {
  if (!gameState) return;

  tradePlayerSelect.innerHTML = '<option value="">Select a player...</option>';

  gameState.players.forEach(player => {
    if (player.playerId === myPlayerId) return;
    if (player.isBankrupt) return;
    if (lockedTradeTarget && player.playerId !== lockedTradeTarget) return;
    const option = document.createElement('option');
    option.value = player.playerId;
    option.textContent = `${player.name} (Rs ${player.balance})`;
    tradePlayerSelect.appendChild(option);
  });
}

function updateTargetTradeBalance(targetId) {
  if (!gameState || !theirTradeBalance) return;
  const targetPlayer = gameState.players.find(p => p.playerId === targetId);
  if (targetPlayer) {
    theirTradeBalance.textContent = `Rs ${targetPlayer.balance}`;
  } else {
    theirTradeBalance.textContent = 'Rs 0';
  }
}

// Populate offer properties (your properties)
function populateOfferProperties() {
  if (!gameState) return;

  const myPlayer = gameState.players.find(p => p.playerId === myPlayerId);
  if (!myPlayer) return;

  const myProperties = gameState.board.cells
    .filter(cell => cell.type === 'property' && cell.ownerId === myPlayerId && cell.price)
    .map(cell => ({ ...cell, index: cell.index }));

  // Update jail cards max
  offerJailCards.max = myPlayer.jailCards || 0;

  if (myProperties.length === 0) {
    offerProperties.innerHTML = '<p class="text-sm text-slate-500 italic p-4 bg-slate-800/50 rounded-xl">No properties available</p>';
    return;
  }

  offerProperties.innerHTML = '';
  myProperties.forEach(prop => {
    const div = document.createElement('div');
    div.className = 'property-checkbox-item';
    const colorClass = prop.group ? `color-${prop.group}` : 'bg-gray-200';

    div.innerHTML = `
      <label class="flex items-center gap-2 p-2 bg-slate-900/50 border border-slate-700/50 rounded-lg cursor-pointer hover:border-purple-500/50 transition-all group">
        <input type="checkbox" class="w-4 h-4 rounded border-slate-600 bg-slate-900 text-purple-600 focus:ring-purple-500" 
          data-property-index="${prop.index}" />
        <div class="w-2.5 h-6 rounded-sm ${colorClass} shadow-sm"></div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-white text-[11px] truncate">${prop.name}</div>
          <div class="text-[9px] text-slate-500 font-bold">Rs ${prop.price}</div>
        </div>
      </label>
    `;

    const checkbox = div.querySelector('input[type="checkbox"]');
    if (selectedOfferProperties.has(prop.index)) {
      checkbox.checked = true;
      div.querySelector('label').classList.add('border-purple-500', 'bg-purple-50');
    }
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedOfferProperties.add(parseInt(e.target.dataset.propertyIndex));
        div.querySelector('label').classList.add('border-purple-500', 'bg-purple-900/30');
      } else {
        selectedOfferProperties.delete(parseInt(e.target.dataset.propertyIndex));
        div.querySelector('label').classList.remove('border-purple-500', 'bg-purple-900/30');
      }
    });

    offerProperties.appendChild(div);
  });
}

// Populate request properties (other player's properties)
function populateRequestProperties(targetPlayerId) {
  if (!gameState || !targetPlayerId) {
    requestProperties.innerHTML = '<p class="text-sm text-slate-500 italic p-4 bg-slate-800/50 rounded-xl">Select a player first</p>';
    return;
  }

  const targetPlayer = gameState.players.find(p => p.playerId === targetPlayerId);
  if (!targetPlayer) return;

  const theirProperties = gameState.board.cells
    .filter(cell => cell.type === 'property' && cell.ownerId === targetPlayerId && cell.price)
    .map(cell => ({ ...cell, index: cell.index }));

  // Update jail cards max
  requestJailCards.max = targetPlayer.jailCards || 0;

  if (theirProperties.length === 0) {
    requestProperties.innerHTML = '<p class="text-sm text-slate-500 italic p-4 bg-slate-800/50 rounded-xl">Player has no properties</p>';
    return;
  }

  requestProperties.innerHTML = '';
  theirProperties.forEach(prop => {
    const div = document.createElement('div');
    div.className = 'property-checkbox-item';
    const colorClass = prop.group ? `color-${prop.group}` : 'bg-gray-200';

    div.innerHTML = `
      <label class="flex items-center gap-2 p-2 bg-slate-900/50 border border-slate-700/50 rounded-lg cursor-pointer hover:border-pink-500/50 transition-all group">
        <input type="checkbox" class="w-4 h-4 rounded border-slate-600 bg-slate-900 text-pink-600 focus:ring-pink-500" 
          data-property-index="${prop.index}" />
        <div class="w-2.5 h-6 rounded-sm ${colorClass} shadow-sm"></div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-white text-[11px] truncate">${prop.name}</div>
          <div class="text-[9px] text-slate-500 font-bold">Rs ${prop.price}</div>
        </div>
      </label>
    `;

    const checkbox = div.querySelector('input[type="checkbox"]');
    if (selectedRequestProperties.has(prop.index)) {
      checkbox.checked = true;
      div.querySelector('label').classList.add('border-pink-500', 'bg-pink-50');
    }
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedRequestProperties.add(parseInt(e.target.dataset.propertyIndex));
        div.querySelector('label').classList.add('border-pink-500', 'bg-pink-900/30');
      } else {
        selectedRequestProperties.delete(parseInt(e.target.dataset.propertyIndex));
        div.querySelector('label').classList.remove('border-pink-500', 'bg-pink-900/30');
      }
    });

    requestProperties.appendChild(div);
  });
}

// Listen to player selection change
tradePlayerSelect.addEventListener('change', (e) => {
  selectedRequestProperties.clear();
  updateTargetTradeBalance(e.target.value);
  populateRequestProperties(e.target.value);
});

// Submit Trade
submitTradeBtn.addEventListener('click', () => {
  const targetPlayerId = lockedTradeTarget || tradePlayerSelect.value;
  if (!targetPlayerId) {
    showToast('Please select a player to trade with', 'error');
    return;
  }

  const offerMoneyVal = parseInt(offerMoney.value) || 0;
  const requestMoneyVal = parseInt(requestMoney.value) || 0;
  const offerJailCardsVal = parseInt(offerJailCards.value) || 0;
  const requestJailCardsVal = parseInt(requestJailCards.value) || 0;

  const normalizedOfferMoney = Math.max(0, offerMoneyVal);
  const normalizedRequestMoney = Math.max(0, requestMoneyVal);
  const normalizedOfferJail = Math.max(0, offerJailCardsVal);
  const normalizedRequestJail = Math.max(0, requestJailCardsVal);

  // Check if trade has any substance
  if (selectedOfferProperties.size === 0 && selectedRequestProperties.size === 0 &&
    normalizedOfferMoney === 0 && normalizedRequestMoney === 0 &&
    normalizedOfferJail === 0 && normalizedRequestJail === 0) {
    showToast('Trade must include at least one item', 'error');
    return;
  }

  const tradeData = {
    toPlayerId: targetPlayerId,
    offered: {
      properties: Array.from(selectedOfferProperties),
      money: normalizedOfferMoney,
      jailCards: normalizedOfferJail,
    },
    requested: {
      properties: Array.from(selectedRequestProperties),
      money: normalizedRequestMoney,
      jailCards: normalizedRequestJail,
    },
  };

  socket.emit('trade_create', tradeData);
  showToast('Trade offer sent!', 'success');
  closeTradeModal();
});

// Render incoming trades
function renderTrades(state) {
  if (!tradeInboxList) return;

  // Show ALL pending trades (Transparency)
  const allPending = (state.pendingTrades || []).filter(
    (t) => t.status === 'PENDING'
  );

  if (allPending.length === 0) {
    tradeInboxList.innerHTML = '<p class="text-[10px] text-slate-500 italic text-center py-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">No active negotiations</p>';
    return;
  }

  tradeInboxList.innerHTML = '';
  allPending.forEach((trade) => {
    const from = state.players.find((p) => p.playerId === trade.fromPlayerId);
    const to = state.players.find((p) => p.playerId === trade.toPlayerId);
    const isMeInvolved = trade.fromPlayerId === myPlayerId || trade.toPlayerId === myPlayerId;
    const isTargetMe = trade.toPlayerId === myPlayerId;

    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border ${isMeInvolved ? 'border-purple-500/50 bg-purple-900/10' : 'border-slate-700 bg-slate-800/50'} shadow-lg space-y-3 transition-all hover:scale-[1.01]`;

    const header = document.createElement('div');
    header.className = 'flex justify-between items-start';
    header.innerHTML = `
      <div class="space-y-0.5">
        <div class="flex items-center gap-1.5">
           <span class="font-black text-white text-[11px] uppercase tracking-wider">${from ? from.name : 'Unknown'}</span>
           <span class="text-slate-500 text-[10px]">➜</span>
           <span class="font-black text-white text-[11px] uppercase tracking-wider">${to ? to.name : 'Unknown'}</span>
        </div>
        <div class="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Pending Negotiation
        </div>
      </div>
      ${isMeInvolved ? '<span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-purple-500 text-white uppercase">Your Deal</span>' : ''}
    `;
    card.appendChild(header);

    const detail = document.createElement('div');
    detail.className = 'grid grid-cols-2 gap-2 text-[10px]';

    const getPropertyBadges = (propIndices) => {
      if (!propIndices || !propIndices.length) return '<span class="text-slate-600 italic">None</span>';
      return propIndices.map(idx => {
        const prop = boardData[idx];
        const colorClass = prop?.color ? `color-${prop.color}` : 'bg-slate-700';
        return `
          <div class="flex items-center gap-1 mb-1">
            <div class="w-1.5 h-3 rounded-sm ${colorClass}"></div>
            <span class="truncate text-slate-200">${prop?.name || 'Property'}</span>
          </div>
        `;
      }).join('');
    };

    const offeredItems = [];
    if (trade.offered?.money) offeredItems.push(`<div class="text-emerald-400 font-black mb-1">Rs ${trade.offered.money}</div>`);
    if (trade.offered?.jailCards) offeredItems.push(`<div class="text-blue-400 font-bold mb-1">🎫 ${trade.offered.jailCards} Jail Card</div>`);
    offeredItems.push(getPropertyBadges(trade.offered?.properties));

    const requestedItems = [];
    if (trade.requested?.money) requestedItems.push(`<div class="text-emerald-400 font-black mb-1">Rs ${trade.requested.money}</div>`);
    if (trade.requested?.jailCards) requestedItems.push(`<div class="text-blue-400 font-bold mb-1">🎫 ${trade.requested.jailCards} Jail Card</div>`);
    requestedItems.push(getPropertyBadges(trade.requested?.properties));

    detail.innerHTML = `
      <div class="p-2.5 bg-slate-900/60 rounded-lg border border-white/5">
        <div class="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">${from?.name || 'Player'} Offers</div>
        <div class="max-h-[80px] overflow-y-auto custom-scrollbar">${offeredItems.join('')}</div>
      </div>
      <div class="p-2.5 bg-slate-900/60 rounded-lg border border-white/5">
        <div class="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">${to?.name || 'Player'} Gives</div>
        <div class="max-h-[80px] overflow-y-auto custom-scrollbar">${requestedItems.join('')}</div>
      </div>
    `;
    card.appendChild(detail);

    // Only show controls if target is me or I'm the sender (cancel option)
    const actions = document.createElement('div');
    actions.className = 'flex gap-2 pt-1';

    if (isTargetMe) {
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg shadow-lg hover:shadow-emerald-900/20 transition-all active:scale-95';
      acceptBtn.textContent = 'Accept';
      acceptBtn.onclick = () => socket.emit('trade_accept', { tradeId: trade.tradeId });

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase rounded-lg shadow-lg hover:shadow-rose-900/20 transition-all active:scale-95';
      rejectBtn.textContent = 'Reject';
      rejectBtn.onclick = () => socket.emit('trade_reject', { tradeId: trade.tradeId });

      const counterBtn = document.createElement('button');
      counterBtn.className = 'flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black uppercase rounded-lg shadow-lg hover:shadow-amber-900/20 transition-all active:scale-95';
      counterBtn.textContent = 'Counter';
      counterBtn.onclick = () => {
        const counterDraft = {
          toPlayerId: trade.fromPlayerId,
          offered: { ...trade.requested },
          requested: { ...trade.offered },
        };
        openTradeModal(counterDraft);
      };

      actions.appendChild(acceptBtn);
      actions.appendChild(rejectBtn);
      actions.appendChild(counterBtn);
      card.appendChild(actions);
    } else if (trade.fromPlayerId === myPlayerId) {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black uppercase rounded-lg transition-all';
      cancelBtn.textContent = 'Withdraw Offer';
      cancelBtn.onclick = () => socket.emit('trade_cancel', { tradeId: trade.tradeId });
      actions.appendChild(cancelBtn);
      card.appendChild(actions);
    }

    tradeInboxList.appendChild(card);
  });
}

// ============================================
// END TRADE MODAL SYSTEM
// ============================================

// Toast notification system
function leaveGame() {
  // Set flag to prevent reconnection
  isLeavingGame = true;

  console.log('🚪 Leaving game...');
  
  // Emit leave_game event to server to remove player permanently
  if (socket.connected && currentRoomId && myPlayerId) {
    console.log(`📤 Emitting leave_game for room ${currentRoomId}, player ${myPlayerId}`);
    socket.emit('leave_game');
    
    // Wait for server to process before clearing everything
    // The 'left_game' event handler will complete the cleanup
    return;
  }

  // If not connected or no room/player, just clear and show lobby
  completeLeaveGame();
}

function completeLeaveGame() {
  console.log('🧹 Completing leave game cleanup...');
  
  // Clear session FIRST to prevent auto-rejoin
  sessionStorage.removeItem('monopolyLobby');
  
  currentRoomId = null;
  myPlayerId = null;
  gameState = null;
  autoActionSent = false;
  hasSelectedColor = false; // Reset color selection flag

  // Show lobby, hide game
  gameSection?.classList.add('hidden');
  connectionScreen?.classList.remove('hidden');
  leaveGameBtn?.classList.add('hidden');

  // Clear any reconnection timeout
  if (window.reconnectTimeoutId) {
    clearTimeout(window.reconnectTimeoutId);
    window.reconnectTimeoutId = null;
  }

  // Reset flag after cleanup
  setTimeout(() => {
    isLeavingGame = false;
  }, 500);
}

// ============================================
// COLOR SELECTION MODAL
// ============================================

function showColorSelectionModal(takenColors = []) {
  if (!colorSelectionModal) {
    console.error('❌ Color selection modal element not found!');
    return;
  }
  
  if (hasSelectedColor) {
    console.log('✅ Player already selected color, skipping modal');
    return;
  }
  
  console.log('🎨 Showing color selection modal. Taken colors:', takenColors);
  console.log('🎨 Modal element exists:', !!colorSelectionModal);
  console.log('🎨 hasSelectedColor:', hasSelectedColor);
  
  // Clear previous colors
  colorPickerGrid.innerHTML = '';
  selectedColor = null;
  
  // Create color buttons
  playerColors.forEach((color) => {
    const isTaken = takenColors.includes(color.value);
    
    const colorBtn = document.createElement('button');
    colorBtn.type = 'button';
    colorBtn.className = `w-full aspect-square rounded-xl border-4 transition-all duration-200 shadow-lg relative ${
      isTaken 
        ? 'border-gray-600 opacity-40 cursor-not-allowed' 
        : 'border-transparent hover:border-white hover:scale-110 cursor-pointer'
    }`;
    colorBtn.style.backgroundColor = color.value;
    colorBtn.title = isTaken ? `${color.name} (Taken)` : color.name;
    colorBtn.dataset.color = color.value;
    colorBtn.dataset.colorName = color.name;
    colorBtn.disabled = isTaken;
    
    // Add checkmark for selected color
    const checkmark = document.createElement('div');
    checkmark.className = 'absolute inset-0 flex items-center justify-center opacity-0 transition-opacity';
    checkmark.innerHTML = '<svg class="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
    colorBtn.appendChild(checkmark);
    
    // Add "X" for taken colors
    if (isTaken) {
      const xMark = document.createElement('div');
      xMark.className = 'absolute inset-0 flex items-center justify-center';
      xMark.innerHTML = '<svg class="w-8 h-8 text-red-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>';
      colorBtn.appendChild(xMark);
    }

    if (!isTaken) {
      colorBtn.addEventListener('click', () => {
        // Remove selection from all colors
        colorPickerGrid.querySelectorAll('button').forEach(btn => {
          btn.classList.remove('border-white', 'ring-4', 'ring-white/50');
          const check = btn.querySelector('div');
          if (check) check.classList.add('opacity-0');
        });
        
        // Mark this color as selected
        colorBtn.classList.add('border-white', 'ring-4', 'ring-white/50');
        checkmark.classList.remove('opacity-0');
        selectedColor = color.value;
        colorModalError.classList.add('hidden');
      });
    }

    colorPickerGrid.appendChild(colorBtn);
  });
  
  // Show modal
  colorSelectionModal.classList.remove('hidden');
}

function hideColorSelectionModal() {
  if (colorSelectionModal) {
    colorSelectionModal.classList.add('hidden');
  }
}

// Confirm color button
if (confirmColorBtn) {
  confirmColorBtn.addEventListener('click', () => {
    console.log('🎨 Confirm button clicked');
    console.log('🎨 selectedColor:', selectedColor);
    console.log('🎨 hasSelectedColor:', hasSelectedColor);
    
    if (!selectedColor) {
      colorModalError.classList.remove('hidden');
      console.log('❌ No color selected');
      return;
    }
    
    console.log('✅ Color confirmed:', selectedColor);
    console.log('🎨 Sending color to server...');
    
    // Send color to server
    socket.emit('select_color', { color: selectedColor });
    
    // Don't set hasSelectedColor here - wait for server confirmation
    // hasSelectedColor = true;
    // hideColorSelectionModal();
  });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type} font-semibold`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Helper function to adjust color brightness
function adjustBrightness(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

// 3D Token Movement Animation
function animateTokenMovement(playerId, fromIndex, toIndex) {
  if (!gameState) return;

  const playerIndex = gameState.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) return;

  const fromCell = document.getElementById(`cell-${fromIndex}`);
  const toCell = document.getElementById(`cell-${toIndex}`);
  if (!fromCell || !toCell) return;

  // Find the token
  const tokens = fromCell.querySelectorAll('.player-token');
  let token = null;
  tokens.forEach(t => {
    if (t.style.background && t.style.background.includes(playerColors[playerIndex % playerColors.length])) {
      token = t;
    }
  });

  if (token) {
    // Add moving class for 3D animation
    token.classList.add('moving');

    // Create trail effect
    createTokenTrail(fromCell, playerColors[playerIndex % playerColors.length]);

    // Remove moving class after animation
    setTimeout(() => {
      token.classList.remove('moving');
    }, 800);
  }
}

// Create particle trail effect for token movement
function createTokenTrail(cell, color) {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const trail = document.createElement('div');
      trail.className = 'token-trail';
      trail.style.borderColor = color;
      trail.style.boxShadow = `0 0 10px ${color}`;
      cell.appendChild(trail);

      // Remove trail after animation
      setTimeout(() => {
        trail.remove();
      }, 600);
    }, i * 100);
  }
}

// Initialize
initBoard();

// Connection status logging
socket.on('connect', () => {
  console.log('✅ Connected to server. Socket ID:', socket.id);
  showToast('Connected to server!', 'success');

  // Don't auto-reconnect if user just left the game
  if (isLeavingGame) {
    console.log('🚫 Skipping auto-reconnect - user left game');
    return;
  }

  // Re-check sessionStorage to get fresh data (not the cached lobbyData)
  const currentSessionData = JSON.parse(sessionStorage.getItem('monopolyLobby') || '{}');

  // If session data is empty (user left game), don't try to reconnect
  if (!currentSessionData || Object.keys(currentSessionData).length === 0) {
    console.log('📭 No session data found, staying in lobby');
    return;
  }

  if (!autoActionSent && Object.keys(currentSessionData).length > 0) {
    const { action, name, roomId, playerId } = currentSessionData;

    // Priority 1: Persistent session reconnection
    if (action === 'reconnect' || (roomId && playerId)) {
      console.log('🔄 Session detected. Room:', roomId, 'Player:', playerId);
      console.log('🔄 Attempting session reconnection...');
      socket.emit('reconnect_room', { roomId, playerId });
      autoActionSent = true;
      return;
    }

    // Priority 2: One-time lobby actions (create/join)
    if (action === 'create' && name) {
      const settings = currentSessionData.settings || {
        startingBalance: 1500,
        maxPlayers: 4,
        map: 'world',
        mortgageEnabled: true
      };
      console.log('🎮 Auto-creating room from lobby data...');
      socket.emit('create_room', { name, settings });
      autoActionSent = true;
      // Don't remove sessionStorage - it will be updated with roomId/playerId after success
    } else if (action === 'join' && name && roomId) {
      console.log('🚪 Auto-joining room from lobby data...');
      socket.emit('join_room', { roomId, name });
      autoActionSent = true;
      // Don't remove sessionStorage - it will be updated with roomId/playerId after success
    }
  }
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
  showToast('Connection lost. Reconnecting...', 'error');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
  showToast('Failed to connect to server. Check your connection.', 'error');
});

socket.on('reconnect', () => {
  console.log('🔄 Reconnected to server');
  showToast('Reconnected successfully!', 'success');
});
