const socket = io('http://localhost:3000');
let currentRoomId = null;
let myPlayerId = null;
let gameState = null;
let lastDiceRoll = null;
const lobbyData = JSON.parse(sessionStorage.getItem('monopolyLobby') || '{}');
console.log('📦 Loaded session data:', lobbyData);
let autoActionSent = false;
let isAnimating = false;
let displayedPositions = {}; // Track visual positions to sync with animations

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
const monopolyBoard = document.getElementById('board-grid');
const bailWrapper = document.getElementById('bailWrapper');
const startGameBtn = document.getElementById('startGameBtn');
const startGameContainer = document.getElementById('startGameContainer');
const houseSupplyEl = document.getElementById('houseSupply');
const hotelSupplyEl = document.getElementById('hotelSupply');
const buildablePropertiesEl = document.getElementById('buildableProperties');
const declareBankruptcyBtn = document.getElementById('declareBankruptcyBtn');

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

const playerColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
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


// Event Listeners
if (createBtn && nameInput) {
  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return showToast('Please enter your name', 'error');
    socket.emit('create_room', { name });
  });
}

if (joinBtn && nameInput && roomInput) {
  joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const roomId = roomInput.value.trim().toUpperCase();
    if (!name) return showToast('Please enter your name', 'error');
    if (!roomId) return showToast('Please enter a room code', 'error');
    socket.emit('join_room', { roomId, name });
  });
}

rollBtn.addEventListener('click', () => {
  rollBtn.disabled = true; // Prevent double-clicks
  socket.emit('roll_dice', { payBail: bailCheckbox.checked });
});

buyBtn.addEventListener('click', () => {
  buyBtn.disabled = true; // Prevent double-clicks
  socket.emit('buy_property');
});

endTurnBtnCenter.addEventListener('click', () => {
  endTurnBtnCenter.disabled = true; // Prevent double-clicks
  socket.emit('end_turn');
});

startGameBtn.addEventListener('click', () => {
  socket.emit('start_game');
  startGameBtn.disabled = true;
  startGameBtn.textContent = 'Starting...';
});

declareBankruptcyBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to declare bankruptcy?\n\nAll your properties will be sold and you will be out of the game. You can watch others playing.\n\nClick OK to proceed or Cancel to continue playing.')) {
    socket.emit('declare_bankruptcy');
  }
});

// Initialize UI based on session data
if (lobbyData.roomId && lobbyData.playerId) {
  console.log('🔄 Existing session detected, preparing for reconnection...');
  // Show game section immediately while reconnecting
  connectionScreen?.classList.add('hidden');
  gameSection?.classList.remove('hidden');
  if (roomCode) roomCode.textContent = lobbyData.roomId;
  if (playerIdEl) playerIdEl.textContent = lobbyData.playerId.substring(0, 8) + '...';
}

// Socket Event Handlers
socket.on('room_created', ({ roomId, playerId }) => {
  currentRoomId = roomId;
  myPlayerId = playerId;

  // Save session for reconnection
  sessionStorage.setItem('monopolyLobby', JSON.stringify({
    roomId,
    playerId,
    name: nameInput.value
  }));

  roomStatus && (roomStatus.textContent = `Room created! Share code: ${roomId}`);
  roomCode.textContent = roomId;
  playerIdEl && (playerIdEl.textContent = playerId.substring(0, 8) + '...');
  connectionScreen?.classList.add('hidden');
  gameSection?.classList.remove('hidden');
  showToast(`Room ${roomId} created successfully!`, 'success');
});

// Joining players receive their playerId here (host gets it via room_created)
socket.on('room_joined', ({ roomId, playerId }) => {
  console.log('✅ Joined room:', roomId, 'with player ID:', playerId);
  currentRoomId = roomId;
  myPlayerId = playerId;

  // Save session for reconnection
  sessionStorage.setItem('monopolyLobby', JSON.stringify({
    roomId,
    playerId,
    name: nameInput.value || lobbyData.name
  }));

  roomStatus && (roomStatus.textContent = `Joined room ${roomId}`);
  roomCode.textContent = roomId;
  playerIdEl && (playerIdEl.textContent = playerId.substring(0, 8) + '...');
  connectionScreen?.classList.add('hidden');
  gameSection?.classList.remove('hidden');
  showToast(`Joined room ${roomId}`, 'success');
});

socket.on('player_joined', ({ player }) => {
  showToast(`${player.name} joined the game`, 'info');
});

socket.on('reconnected', ({ playerId }) => {
  console.log('✅ Successfully reconnected! Player ID:', playerId);
  myPlayerId = playerId;
  currentRoomId = lobbyData.roomId; // Restore from session
  showToast('Reconnected to game!', 'success');
  // Make sure UI is updated
  if (roomCode) roomCode.textContent = currentRoomId;
  if (playerIdEl) playerIdEl.textContent = playerId.substring(0, 8) + '...';
  connectionScreen?.classList.add('hidden');
  gameSection?.classList.remove('hidden');
});

socket.on('player_reconnected', ({ player }) => {
  showToast(`${player.name} reconnected`, 'info');
});

socket.on('reconnect_failed', ({ message }) => {
  showToast(`Reconnection failed: ${message}`, 'error');
  sessionStorage.removeItem('monopolyLobby');
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
      // Note: we don't set isAnimating=false here yet because player_moved is coming
      renderState(gameState);
    }, 500);
  }, 1000);

  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  const playerName = player ? player.name : 'Player';

  setTimeout(() => {
    showToast(`🎲 ${playerName} rolled ${dice.die1} + ${dice.die2} = ${dice.total}`, 'info');
  }, 1500); // Delayed toast to match settlement
});

socket.on('player_moved', ({ playerId, from, to }) => {
  isAnimating = true;
  const player = gameState ? gameState.players.find(p => p.playerId === playerId) : null;
  if (player) {
    // Wait for dice to stop before moving token (1000ms dice + 200ms buffer)
    setTimeout(() => {
      // Animate token movement with 3D effect
      animateTokenMovement(playerId, from, to);

      setTimeout(() => {
        showToast(`${player.name} moved from ${boardData[from].name} to ${boardData[to].name}`, 'info');
        displayedPositions[playerId] = to; // Update visual position after animation
        isAnimating = false;
        renderState(gameState);
      }, 800);
    }, 1200);
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

      mortgageBtn.classList.remove('hidden');
      mortgageBtn.disabled = !isMyProperty || !isMyTurn;

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
        actionHint.textContent = `🏠 House: Rs ${houseCost} | 🏚️ Mortgage: Rs ${mortgageValue}`;
      }
    } else {
      // Railroad/Utility - can't build
      buildHouseBtn.classList.add('hidden');
      buildHotelBtn.classList.add('hidden');

      mortgageBtn.classList.remove('hidden');
      mortgageBtn.disabled = !isMyProperty || !isMyTurn;

      liquidateBtn.classList.remove('hidden');
      liquidateBtn.disabled = !isMyProperty || !isMyTurn;

      if (!isMyProperty) {
        actionHint.textContent = owner ? `Owned by ${owner.name} | Special Property` : '✨ Special Property - Available';
        actionHint.className = owner ? 'text-[9px] text-cyan-400 text-center mt-1' : 'text-[9px] text-emerald-400 text-center mt-1';
      } else if (!isMyTurn) {
        actionHint.textContent = '⏳ Wait for your turn to manage';
        actionHint.className = 'text-[9px] text-yellow-400 text-center mt-1';
      } else {
        const mortgageValue = Math.floor(cell.price / 2);
        actionHint.textContent = `🏚️ Mortgage value: Rs ${mortgageValue}`;
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


// function sellPropertyFromPopover - bridge for the new button
function sellPropertyFromPopover() {
  liquidateFromModal();
}

// Redefine liquidateFromModal to use the new close function
function liquidateFromModal() {
  if (selectedPropertyIndex === null) return;
  if (confirm('Are you sure you want to permanently sell this property for 50% of its value?')) {
    socket.emit('sell_property', { propertyIndex: selectedPropertyIndex });
    closePropertyPopover();
  }
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
window.sellPropertyFromPopover = sellPropertyFromPopover;
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

socket.on('game_state_update', (state) => {
  console.log('Game state updated:', state);
  gameState = state;
  renderState(state);
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

// Initialize board
function initBoard() {
  monopolyBoard.innerHTML = '';

  // Center branding (already in HTML, just update reference)
  const center = monopolyBoard.querySelector('.board-center');
  if (center) {
    gameLog = center.querySelector('#gameLog');
  }

  // Create all 40 cells with grid positioning
  for (let i = 0; i < 40; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.id = `cell-${i}`;

    const { row, col } = cellPositions[i];
    cell.style.gridRow = row + 1; // grid is 1-based
    cell.style.gridColumn = col + 1;

    const cellData = boardData[i];
    const stateCell = gameState && gameState.board ? gameState.board.cells[i] : null;

    // Orientation classes for label direction
    if (row === 0) cell.classList.add('top');
    if (row === 10) cell.classList.add('bottom');
    if (col === 10) cell.classList.add('right');
    if (col === 0) cell.classList.add('left');

    // Corner highlighting
    if (i === 0 || i === 10 || i === 20 || i === 30) {
      cell.classList.add('corner');
    }

    // Add cell content
    const nameDiv = document.createElement('div');
    nameDiv.className = 'cell-name';
    nameDiv.textContent = cellData.name;

    if (stateCell && stateCell.type === 'neutral' && !cellData.color) {
      cell.classList.add('neutral-cell');
    }

    if (cellData.color) {
      const colorDiv = document.createElement('div');
      colorDiv.className = `cell-color color-${cellData.color}`;
      cell.appendChild(colorDiv);

      if (stateCell && stateCell.type === 'property') {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cell-info';
        infoDiv.innerHTML = `<div class="cell-price">Rs ${stateCell.price}</div>`;
        cell.appendChild(infoDiv);
      }
    }

    cell.appendChild(nameDiv);

    // Add click listener for property management
    // Check if it's a property cell (has color = buildable property)
    if (stateCell && stateCell.type === 'property') {
      cell.classList.add('cursor-pointer', 'hover:bg-white/5', 'transition-colors');
      cell.onclick = () => {
        console.log('🖱️ Clicked cell:', i, cellData.name);
        openPropertyModal(i);
      };
    }

    monopolyBoard.appendChild(cell);
  }
}

// Render buildable properties UI
function renderBuildableProperties(state) {
  if (!buildablePropertiesEl || !state || !gameState) return;

  const me = state.players.find(p => p.playerId === myPlayerId);
  if (!me || me.isBankrupt) {
    buildablePropertiesEl.innerHTML = '<p class="text-sm text-slate-500 italic">Not available</p>';
    return;
  }

  const myProperties = state.board.cells.filter(cell =>
    cell.type === 'property' && cell.ownerId === myPlayerId
  );

  if (myProperties.length === 0) {
    buildablePropertiesEl.innerHTML = '<p class="text-sm text-slate-500 italic">You don\'t own any buildable properties</p>';
    return;
  }

  buildablePropertiesEl.innerHTML = '';

  myProperties.forEach(cell => {
    const propertyDiv = document.createElement('div');
    propertyDiv.className = `p-3 flex justify-between items-center bg-gradient-to-r ${cell.isMortgaged ? 'from-slate-900 to-black opacity-60' : 'from-slate-800 to-slate-900'} rounded-lg border ${cell.isMortgaged ? 'border-amber-900/50' : 'border-slate-700'} cursor-pointer hover:border-slate-500 transition-all`;
    propertyDiv.onclick = () => openPropertyModal(cell.index);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'font-bold text-sm text-white flex items-center gap-2';
    nameDiv.innerHTML = `${cell.name} ${cell.isMortgaged ? '<span class="text-[10px] bg-amber-900/80 text-amber-400 px-1 rounded">MORTGAGED</span>' : ''}`;

    const priceDiv = document.createElement('div');
    priceDiv.className = 'text-xs font-bold text-yellow-500';
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
    startGameContainer.classList.remove('hidden');
    const minPlayers = 2;
    const canStart = state.players.filter(p => !p.isBankrupt).length >= minPlayers;
    startGameBtn.disabled = !canStart;

    // Update button title/tooltip to show why it's disabled
    if (!canStart) {
      startGameBtn.title = `Need ${minPlayers} players to start (${state.players.filter(p => !p.isBankrupt).length}/${minPlayers})`;
    } else {
      startGameBtn.title = 'Click to start the game';
    }
  } else {
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

  // Rebuild board each state update so cell colors reflect country groups
  initBoard();

  // Update ownership indicators
  state.board.cells.forEach((cell, index) => {
    const cellEl = document.getElementById(`cell-${index}`);
    if (!cellEl) return;

    // Remove old owner indicator
    const oldIndicator = cellEl.querySelector('.owner-indicator');
    if (oldIndicator) oldIndicator.remove();

    // Add owner indicator for owned properties
    if (cell.type === 'property' && cell.ownerId) {
      const playerIndex = state.players.findIndex(p => p.playerId === cell.ownerId);
      if (playerIndex !== -1) {
        // Add has-owner class for pulse animation
        cellEl.classList.add('has-owner');

        const indicator = document.createElement('div');
        indicator.className = 'owner-indicator';
        indicator.style.background = playerColors[playerIndex % playerColors.length];
        cellEl.appendChild(indicator);

        // Owner bar below name for clearer ownership
        const nameDiv = cellEl.querySelector('.cell-name');
        let ownerBar = cellEl.querySelector('.owner-bar');
        if (!ownerBar) {
          ownerBar = document.createElement('div');
          ownerBar.className = 'owner-bar';
          cellEl.appendChild(ownerBar);
        }
        ownerBar.style.background = playerColors[playerIndex % playerColors.length];

        // Add house/hotel indicators
        if (cell.buildable && (cell.houses > 0 || cell.hotels > 0)) {
          let buildingIndicator = cellEl.querySelector('.building-indicator');
          if (!buildingIndicator) {
            buildingIndicator = document.createElement('div');
            buildingIndicator.className = 'building-indicator';
            cellEl.appendChild(buildingIndicator);
          }
          buildingIndicator.innerHTML = '';

          if (cell.hotels > 0) {
            const hotelIcon = document.createElement('div');
            hotelIcon.className = 'hotel-icon';
            hotelIcon.textContent = 'H';
            buildingIndicator.appendChild(hotelIcon);
          } else if (cell.houses > 0) {
            for (let i = 0; i < cell.houses; i++) {
              const houseIcon = document.createElement('div');
              houseIcon.className = 'house-icon';
              buildingIndicator.appendChild(houseIcon);
            }
          }
        }
      }
    } else {
      // Remove has-owner class if no owner
      cellEl.classList.remove('has-owner', 'is-mortgaged');
      const bar = cellEl.querySelector('.owner-bar');
      if (bar) bar.remove();
      const buildingInd = cellEl.querySelector('.building-indicator');
      if (buildingInd) buildingInd.remove();
    }

    // Add mortgage visual indicator
    if (cell.isMortgaged) {
      cellEl.classList.add('is-mortgaged');
      let mortgageBadge = cellEl.querySelector('.mortgage-badge');
      if (!mortgageBadge) {
        mortgageBadge = document.createElement('div');
        mortgageBadge.className = 'mortgage-badge';
        mortgageBadge.textContent = 'M';
        cellEl.appendChild(mortgageBadge);
      }
    } else {
      cellEl.classList.remove('is-mortgaged');
      const badge = cellEl.querySelector('.mortgage-badge');
      if (badge) badge.remove();
    }
  });

  // Update player tokens
  document.querySelectorAll('.player-token').forEach(token => token.remove());

  state.players.forEach((player, index) => {
    if (player.isBankrupt) return;

    // Use displayedPosition if available, otherwise fallback to actual position
    const visualPos = (displayedPositions[player.playerId] !== undefined)
      ? displayedPositions[player.playerId]
      : player.position;

    // If it's a new state but not animating, sync displayed position
    if (!isAnimating) {
      displayedPositions[player.playerId] = player.position;
    }

    const cellEl = document.getElementById(`cell-${visualPos}`);
    if (cellEl) {
      const token = document.createElement('div');
      token.className = 'player-token';
      token.style.background = playerColors[index % playerColors.length];
      token.title = player.name;

      // Position token based on which side of the board
      const { row, col } = getCellGridPosition(visualPos);
      const offset = index * 20;

      // Determine positioning based on board side
      if (row === 0) {
        // Top row: align horizontally at bottom of cell
        token.style.left = `${5 + offset}px`;
        token.style.bottom = `5px`;
        token.style.top = 'auto';
        token.style.right = 'auto';
      } else if (row === 10) {
        // Bottom row: align horizontally at top of cell
        token.style.left = `${5 + offset}px`;
        token.style.top = `5px`;
        token.style.bottom = 'auto';
        token.style.right = 'auto';
      } else if (col === 0) {
        // Left column: align vertically on LEFT side of cell
        token.style.left = `5px`;
        token.style.top = `${5 + offset}px`;
        token.style.right = 'auto';
        token.style.bottom = 'auto';
      } else if (col === 10) {
        // Right column: align vertically on RIGHT side of cell
        token.style.right = `5px`;
        token.style.top = `${5 + offset}px`;
        token.style.left = 'auto';
        token.style.bottom = 'auto';
      }

      cellEl.appendChild(token);
    }
  });

  // Update players list - Minimalist Design
  playersList.innerHTML = '';
  state.players.forEach((player, index) => {
    const card = document.createElement('div');
    card.className = 'relative py-1.5 px-1 transition-all duration-300 border-b border-white/5 last:border-0 group';

    if (player.playerId === state.currentTurnPlayerId) {
      // Simple highlight with a color for the current player
      card.classList.add('bg-indigo-500/20', 'rounded-lg');
    } else if (player.isBankrupt) {
      card.classList.add('opacity-40', 'grayscale');
    }

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center relative z-10';

    const tokenColor = document.createElement('div');
    tokenColor.className = 'w-7 h-7 rounded-lg border-2 border-white/20 shadow-sm flex items-center justify-center font-black text-white text-[10px]';
    tokenColor.style.background = `linear-gradient(135deg, ${playerColors[index % playerColors.length]}, ${adjustBrightness(playerColors[index % playerColors.length], -20)})`;
    tokenColor.textContent = player.name[0].toUpperCase();

    const nameSpan = document.createElement('span');
    nameSpan.className = 'font-bold text-white text-sm flex-1 ml-2';
    nameSpan.textContent = player.name;
    if (player.playerId === myPlayerId) {
      const youBadge = document.createElement('span');
      youBadge.className = 'ml-1.5 px-1.5 py-0.5 bg-indigo-500/80 text-white text-[8px] font-bold rounded-md';
      youBadge.textContent = 'YOU';
      nameSpan.appendChild(youBadge);
    }

    const balanceAmount = document.createElement('div');
    balanceAmount.className = 'text-2xl font-black text-yellow-400 text-right drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]';
    balanceAmount.textContent = `$${player.balance}`;

    const nameContainer = document.createElement('div');
    nameContainer.className = 'flex items-center flex-1';
    nameContainer.appendChild(tokenColor);
    nameContainer.appendChild(nameSpan);

    header.appendChild(nameContainer);
    header.appendChild(balanceAmount);

    const statusDiv = document.createElement('div');
    statusDiv.className = 'text-[10px] font-medium mt-0.5 relative z-10';
    const statusText = player.isBankrupt ? 'Bankrupt' : 'Active';
    const statusColor = player.isBankrupt ? 'text-rose-400' : 'text-cyan-300';
    statusDiv.className += ` ${statusColor}`;
    statusDiv.textContent = statusText;

    card.appendChild(header);
    card.appendChild(statusDiv);
    playersList.appendChild(card);
  });

  // Update game log
  if (gameLog) {
    gameLog.innerHTML = '';
    state.gameLog.slice(-15).forEach(msg => {
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
      <div class="font-bold text-white mb-1">🏠 ${cell.name}</div>
      <div class="text-sm text-slate-300 mb-2">Price: Rs ${cell.price} | Rent: Rs ${cell.rent}</div>
      <div class="text-sm text-emerald-400 font-semibold">Click "Buy Property" to purchase!</div>
    `;
    propertyStatus.className = 'p-4 bg-emerald-900/30 border-2 border-emerald-500/50 rounded-lg text-sm';
  } else {
    propertyStatus.innerHTML = 'No property action pending';
    propertyStatus.className = 'p-4 bg-slate-800/50 rounded-lg text-sm text-slate-400 font-medium';
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
  rollBtn.disabled = isAnimating || !canAct || (hasRolled && !canRollAgain) || isInDebt;
  buyBtn.disabled = isAnimating || !canAct || state.pendingPropertyIndex === null || isInDebt;
  endTurnBtnCenter.disabled = isAnimating || !canAct || !hasRolled || canRollAgain || isInDebt;

  // Update button visibility and text based on state
  console.log('[DEBUG] Button visibility logic:', { gameActive, isMyTurn, hasRolled, canRollAgain, pendingPropertyIndex: state.pendingPropertyIndex });

  // Show Bankruptcy button always during active game (unless already bankrupt)
  if (declareBankruptcyBtn) {
    declareBankruptcyBtn.style.display = (gameActive && me && !me.isBankrupt) ? 'block' : 'none';
  }

  if (!gameActive || !isMyTurn) {
    // Hide all buttons when not your turn or game not started
    rollBtn.style.display = 'none';
    buyBtn.style.display = 'none';
    endTurnBtnCenter.style.display = 'none';
    if (bailWrapper) bailWrapper.style.display = 'none';
  } else {
    // It's my turn and game is active

    // Roll Button logic
    if (!hasRolled || canRollAgain) {
      rollBtn.style.display = 'block';
      const label = canRollAgain ? '🎲 ROLL AGAIN (DOUBLES!)' : 'ROLL DICE';
      const btnClass = canRollAgain
        ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600'
        : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700';

      rollBtn.className = `premium-btn w-full py-2 ${btnClass} text-white font-bold text-xs rounded-lg shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group/btn`;
      rollBtn.innerHTML = `
        <span class="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-20 transition-opacity duration-300"></span>
        <span class="relative flex items-center justify-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4">
            </path>
          </svg>
          ${label}
        </span>
      `;
    } else {
      rollBtn.style.display = 'none';
    }

    // Bail Checkbox logic
    if (bailWrapper) {
      bailWrapper.style.display = (!hasRolled && me?.inJail) ? 'block' : 'none';
    }

    // Action Buttons logic (shown after rolling)
    if (hasRolled || canRollAgain) {
      // Buy Property button - Show if landed on buyable property, even on doubles
      if (state.pendingPropertyIndex !== null) {
        buyBtn.style.display = 'block';
        buyBtn.innerHTML = `
          <span class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
          <span class="relative flex items-center justify-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
              </path>
            </svg>
            BUY PROPERTY
          </span>
        `;
      } else {
        buyBtn.style.display = 'none';
      }

      // End Turn button (only show if NOT able to roll again)
      if (hasRolled && !canRollAgain) {
        endTurnBtnCenter.style.display = 'block';
        endTurnBtnCenter.innerHTML = `
          <span class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
          <span class="relative flex items-center justify-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            END TURN
          </span>
        `;
      } else {
        endTurnBtnCenter.style.display = 'none';
      }
    } else {
      // Haven't rolled yet
      buyBtn.style.display = 'none';
      endTurnBtnCenter.style.display = 'none';
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
  const incoming = (state.pendingTrades || []).filter(
    (t) => t.status === 'PENDING' && t.toPlayerId === myPlayerId,
  );

  if (incoming.length === 0) {
    tradeInboxList.innerHTML = '<p class="text-sm text-slate-500 italic">No pending trades</p>';
    return;
  }

  tradeInboxList.innerHTML = '';
  incoming.forEach((trade) => {
    const from = state.players.find((p) => p.playerId === trade.fromPlayerId);

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-700 bg-slate-800 shadow-sm space-y-3';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center';
    header.innerHTML = `
      <div>
        <div class="text-xs text-slate-500">From</div>
        <div class="font-bold text-white">${from ? from.name : 'Player'}</div>
      </div>
      <span class="text-xs font-bold px-2 py-1 rounded-full bg-amber-900/50 text-amber-400">Pending</span>
    `;
    card.appendChild(header);

    const detail = document.createElement('div');
    detail.className = 'text-xs text-slate-300 grid grid-cols-2 gap-2';
    const offeredList = [];
    if ((trade.offered?.properties || []).length) offeredList.push(`Properties: ${trade.offered.properties.length}`);
    if (trade.offered?.money) offeredList.push(`Money: $${trade.offered.money}`);
    if (trade.offered?.jailCards) offeredList.push(`Jail Cards: ${trade.offered.jailCards}`);

    const requestedList = [];
    if ((trade.requested?.properties || []).length) requestedList.push(`Properties: ${trade.requested.properties.length}`);
    if (trade.requested?.money) requestedList.push(`Money: $${trade.requested.money}`);
    if (trade.requested?.jailCards) requestedList.push(`Jail Cards: ${trade.requested.jailCards}`);

    detail.innerHTML = `
      <div class="p-3 bg-slate-900/50 rounded-lg">
        <div class="font-bold text-white mb-1">They Offer</div>
        <div>${offeredList.join('<br>') || '<span class="text-slate-500">Nothing</span>'}</div>
      </div>
      <div class="p-3 bg-slate-900/50 rounded-lg">
        <div class="font-bold text-white mb-1">You Give</div>
        <div>${requestedList.join('<br>') || '<span class="text-slate-500">Nothing</span>'}</div>
      </div>
    `;
    card.appendChild(detail);

    const actions = document.createElement('div');
    actions.className = 'flex gap-2';

    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg';
    acceptBtn.textContent = 'Accept';
    acceptBtn.onclick = () => socket.emit('trade_accept', { tradeId: trade.tradeId });

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg';
    rejectBtn.textContent = 'Reject';
    rejectBtn.onclick = () => socket.emit('trade_reject', { tradeId: trade.tradeId });

    const counterBtn = document.createElement('button');
    counterBtn.className = 'flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg';
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

    tradeInboxList.appendChild(card);
  });
}

// ============================================
// END TRADE MODAL SYSTEM
// ============================================

// Toast notification system
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
  if (!autoActionSent && lobbyData) {
    const { action, name, roomId, playerId } = lobbyData;

    // Priority 1: Persistent session reconnection
    if (roomId && playerId) {
      console.log('🔄 Attempting session reconnection...');
      socket.emit('reconnect_room', { roomId, playerId });
      autoActionSent = true;
      return;
    }

    // Priority 2: One-time lobby actions (create/join)
    if (action === 'create' && name) {
      socket.emit('create_room', { name });
      autoActionSent = true;
      // Don't remove sessionStorage - it will be updated with roomId/playerId after success
    } else if (action === 'join' && name && roomId) {
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

socket.on('reconnect', () => {
  console.log('🔄 Reconnected to server');
  showToast('Reconnected successfully!', 'success');
});
