import { randomUUID } from 'crypto';
import Board from './Board.js';
import Dice from './Dice.js';
import Player from './Player.js';

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const GO_SALARY = 200;
const BAIL_AMOUNT = 50;
const JAIL_STAY_TURNS = 2; // player skips 2 turns, moves on 3rd
const VACATION_STAY_TURNS = 2; // player skips 2 turns, moves on 3rd
const HOUSE_COST_RATE = 0.5; // houses cost 50% of the property's price
const HOTEL_COST_MULTIPLIER = 1; // hotel upgrade costs the same as a single house build

export default class GameRoom {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.players = [];
    this.board = new Board();
    this.currentTurnIndex = 0;
    this.gameStatus = 'waiting';
    this.gameLog = [];
    this.lastAction = '';
    this.pendingPropertyIndex = null;
    this.hostId = null;
    this.houseSupply = 32;
    this.hotelSupply = 12;
    this.pendingTrades = new Map();
    this.tradeHistory = [];
    this.tradeLock = false;

    this.treasureCards = [];
    this.surpriseCards = [];
    this.initDecks();
  }

  initDecks() {
    const treasure = [
      { id: 't1', type: 'treasure', title: 'Pardon Card', text: 'Get out of jail free. This card may be kept until needed.', action: 'jail_card' },
      { id: 't2', type: 'treasure', title: 'Tax Refund', text: 'Income tax refund. Collect Rs 200.', action: 'simple_gain', amount: 200 },
      { id: 't3', type: 'treasure', title: 'Dividends', text: 'Receive Rs 50 dividends.', action: 'simple_gain', amount: 50 },
      { id: 't4', type: 'treasure', title: 'Birthday Bash', text: 'It is your birthday! Collect Rs 10 from every player.', action: 'collect_from_all', amount: 10 },
      { id: 't5', type: 'treasure', title: 'Consultancy Fee', text: 'Receive Rs 25 for services rendered.', action: 'simple_gain', amount: 25 },
      { id: 't6', type: 'treasure', title: 'Inheritance', text: 'You inherit Rs 100.', action: 'simple_gain', amount: 100 },
      { id: 't7', type: 'treasure', title: 'Hospital Bill', text: 'Pay Rs 50.', action: 'simple_loss', amount: 50 },
      { id: 't8', type: 'treasure', title: 'School fees', text: 'Pay Rs 50.', action: 'simple_loss', amount: 50 },
    ];

    const surprise = [
      { id: 's1', type: 'surprise', title: 'Advance to Start', text: 'Advance to GO (Collect Rs 200).', action: 'move_to', target: 0 },
      { id: 's2', type: 'surprise', title: 'Next Airport', text: 'Advance to the next Airport. If unowned, you may buy it. If owned, pay double rent.', action: 'move_to_next_group', group: 'railroad', doubleRent: true },
      { id: 's3', type: 'surprise', title: 'Next Company', text: 'Advance to the next Company (Utility). If unowned, you may buy it. If owned, pay double rent.', action: 'move_to_next_group', group: 'utility', doubleRent: true },
      { id: 's4', type: 'surprise', title: 'Go to Jail', text: 'Go directly to Jail. Do not pass GO, do not collect Rs 200.', action: 'go_to_jail' },
      { id: 's5', type: 'surprise', title: 'Forward March', text: 'Move forward a few steps to see what awaits.', action: 'relative_move', min: 3, max: 6, direction: 1 },
      { id: 's6', type: 'surprise', title: 'Tactical Retreat', text: 'Step back and reconsider your strategy. Move backward 3-6 steps.', action: 'relative_move', min: 3, max: 6, direction: -1 },
    ];

    this.treasureCards = this.shuffle([...treasure]);
    this.surpriseCards = this.shuffle([...surprise]);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  log(message) {
    this.lastAction = message;
    this.gameLog.push(message);
    if (this.gameLog.length > 100) {
      this.gameLog.shift();
    }
  }

  addPlayer(name, socketId) {
    if (this.players.length >= MAX_PLAYERS) {
      return { error: 'Room is full' };
    }
    if (this.gameStatus !== 'waiting') {
      return { error: 'Game already started' };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { error: 'Name is required' };
    }
    if (this.players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { error: 'Name already taken in this room' };
    }

    const player = new Player(trimmedName, socketId);
    this.players.push(player);

    // First player is the host
    if (this.players.length === 1) {
      this.hostId = player.playerId;
    }

    this.log(`${player.name} joined room ${this.roomId}.`);
    return { player };
  }

  removePlayerBySocket(socketId) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) return;

    player.connected = false;
    this.log(`${player.name} disconnected.`);
    this.cancelTradesForPlayer(player.playerId, 'Player disconnected');

    // If the game is active, we DON'T treat disconnect as bankruptcy immediately.
    // We allow them to reconnect.
    if (this.gameStatus !== 'active') {
      // Waiting lobby: remove entirely.
      this.players = this.players.filter((p) => p.socketId !== socketId);
    }

    this.ensureTurnIsValid();
    this.checkGameOver();
    this.broadcastState();
  }

  getPlayerBySocketId(socketId) {
    return this.players.find((p) => p.socketId === socketId);
  }

  getCurrentPlayer() {
    if (!this.players.length) return null;
    const player = this.players[this.currentTurnIndex];
    if (player && !player.isBankrupt) return player;
    return this.findNextActivePlayerFrom(this.currentTurnIndex);
  }

  getActivePlayers() {
    return this.players.filter((p) => !p.isBankrupt);
  }

  getPlayerById(playerId) {
    return this.players.find((p) => p.playerId === playerId) || null;
  }

  reconnectPlayer(playerId, socketId) {
    const player = this.getPlayerById(playerId);
    if (!player) return { error: 'Player not found' };

    player.socketId = socketId;
    player.connected = true;
    this.log(`${player.name} reconnected.`);
    return { player };
  }

  isActivePlayer(player) {
    return !!(player && !player.isBankrupt && player.connected);
  }

  ownsAllProperties(playerId, propertyIds = []) {
    return propertyIds.every((pid) => {
      const cell = this.board.getCell(pid);
      return cell && cell.type === 'property' && cell.ownerId === playerId;
    });
  }

  hasMoney(player, amount) {
    return typeof amount === 'number' && amount >= 0 && player.balance >= amount;
  }

  hasJailCards(player, count) {
    const value = typeof count === 'number' ? count : 0;
    return value >= 0 && (player.jailCards || 0) >= value;
  }

  propertyTransferable(cell) {
    if (!cell || cell.type !== 'property') return false;
    if (cell.lockedForAuction || cell.pendingMortgage) return false;
    return true;
  }

  sanitizeTrade(trade) {
    return {
      tradeId: trade.tradeId,
      fromPlayerId: trade.fromPlayerId,
      toPlayerId: trade.toPlayerId,
      offered: {
        properties: [...(trade.offered?.properties || [])],
        money: trade.offered?.money || 0,
        jailCards: trade.offered?.jailCards || 0,
      },
      requested: {
        properties: [...(trade.requested?.properties || [])],
        money: trade.requested?.money || 0,
        jailCards: trade.requested?.jailCards || 0,
      },
      status: trade.status,
      createdAt: trade.createdAt,
      expiresAt: trade.expiresAt || null,
      lastUpdatedAt: trade.lastUpdatedAt,
    };
  }

  validateTradeCreation(draft) {
    const from = this.getPlayerById(draft.fromPlayerId);
    const to = this.getPlayerById(draft.toPlayerId);

    if (!this.isActivePlayer(from) || !this.isActivePlayer(to)) {
      return { error: 'Both players must be active and not bankrupt.' };
    }
    if (this.tradeLock) {
      return { error: 'Trading is temporarily locked.' };
    }

    const offeredProps = draft.offered?.properties || [];
    const requestedProps = draft.requested?.properties || [];
    const offeredMoney = Number.isFinite(draft.offered?.money) ? draft.offered.money : 0;
    const requestedMoney = Number.isFinite(draft.requested?.money) ? draft.requested.money : 0;
    const offeredJail = Number.isFinite(draft.offered?.jailCards) ? draft.offered.jailCards : 0;
    const requestedJail = Number.isFinite(draft.requested?.jailCards) ? draft.requested.jailCards : 0;

    if (offeredMoney < 0 || requestedMoney < 0) {
      return { error: 'Money amounts must be non-negative.' };
    }
    if (offeredJail < 0 || requestedJail < 0) {
      return { error: 'Jail card counts must be non-negative.' };
    }

    if (!this.ownsAllProperties(from.playerId, offeredProps)) {
      return { error: 'You do not own all offered properties.' };
    }
    if (!this.hasMoney(from, offeredMoney)) {
      return { error: 'Insufficient funds to offer.' };
    }
    if (!this.hasJailCards(from, offeredJail)) {
      return { error: 'Not enough Get Out of Jail cards to offer.' };
    }

    const allProps = [...offeredProps, ...requestedProps];
    for (const pid of allProps) {
      const cell = this.board.getCell(pid);
      if (!this.propertyTransferable(cell)) {
        return { error: 'One or more properties are not transferable right now.' };
      }
    }

    const duplicate = Array.from(this.pendingTrades.values()).find(
      (t) => t.status === 'PENDING' && t.fromPlayerId === draft.fromPlayerId && t.toPlayerId === draft.toPlayerId,
    );
    if (duplicate) {
      return { error: 'You already have a pending trade with this player.' };
    }

    return { ok: true };
  }

  validateTradeBeforeAccept(trade) {
    const from = this.getPlayerById(trade.fromPlayerId);
    const to = this.getPlayerById(trade.toPlayerId);
    if (!this.isActivePlayer(from) || !this.isActivePlayer(to)) {
      return { error: 'One of the players is no longer active.' };
    }

    const offeredProps = trade.offered?.properties || [];
    const requestedProps = trade.requested?.properties || [];
    const offeredMoney = trade.offered?.money || 0;
    const requestedMoney = trade.requested?.money || 0;
    const offeredJail = trade.offered?.jailCards || 0;
    const requestedJail = trade.requested?.jailCards || 0;

    if (!this.ownsAllProperties(from.playerId, offeredProps)) {
      return { error: 'Offering player no longer owns offered properties.' };
    }
    if (!this.ownsAllProperties(to.playerId, requestedProps)) {
      return { error: 'Receiving player no longer owns requested properties.' };
    }
    if (!this.hasMoney(from, offeredMoney) || !this.hasMoney(to, requestedMoney)) {
      return { error: 'Insufficient funds to complete trade.' };
    }
    if (!this.hasJailCards(from, offeredJail) || !this.hasJailCards(to, requestedJail)) {
      return { error: 'Not enough jail cards to complete trade.' };
    }

    const allProps = [...offeredProps, ...requestedProps];
    for (const pid of allProps) {
      const cell = this.board.getCell(pid);
      if (!this.propertyTransferable(cell)) {
        return { error: 'A property is currently locked and cannot be traded.' };
      }
    }

    return { ok: true };
  }

  cancelTrade(trade, reason = 'Cancelled') {
    if (!trade) return;
    trade.status = 'CANCELLED';
    trade.lastUpdatedAt = Date.now();
    this.pendingTrades.delete(trade.tradeId);
    this.tradeHistory.push(this.sanitizeTrade(trade));
    if (this.tradeHistory.length > 100) {
      this.tradeHistory.shift();
    }
    this.io.to(this.roomId).emit('trade_cancelled', { tradeId: trade.tradeId, reason });
  }

  cancelTradesForPlayer(playerId, reason) {
    const trades = Array.from(this.pendingTrades.values()).filter(
      (t) => t.fromPlayerId === playerId || t.toPlayerId === playerId,
    );
    trades.forEach((t) => this.cancelTrade(t, reason));
  }

  revalidatePendingTrades(reason = 'Trade invalidated') {
    const trades = Array.from(this.pendingTrades.values());
    trades.forEach((t) => {
      const validation = this.validateTradeBeforeAccept(t);
      if (validation.error) {
        this.cancelTrade(t, `${reason}: ${validation.error}`);
      }
    });
  }

  moveProperties(propertyIds, fromPlayerId, toPlayerId) {
    const from = this.getPlayerById(fromPlayerId);
    const to = this.getPlayerById(toPlayerId);
    propertyIds.forEach((pid) => {
      const cell = this.board.getCell(pid);
      if (!cell || cell.type !== 'property') return;
      if (cell.ownerId === fromPlayerId) {
        cell.ownerId = toPlayerId;
      }
      if (from) {
        from.properties = from.properties.filter((p) => p !== pid);
      }
      if (to && !to.properties.includes(pid)) {
        to.properties.push(pid);
      }
    });
  }

  getPropertyCellsByOwner(playerId) {
    return this.board.cells.filter((cell) => cell.type === 'property' && cell.ownerId === playerId);
  }

  getGroupPropertyCells(group) {
    return this.board.cells.filter((cell) => cell.type === 'property' && cell.group === group);
  }

  playerOwnsGroup(playerId, group) {
    if (!group) return false;
    const groupCells = this.getGroupPropertyCells(group);
    if (!groupCells.length) return false;
    return groupCells.every((cell) => cell.ownerId === playerId);
  }

  getRentForProperty(cell) {
    if (cell.hotels > 0) {
      return cell.rent * 5;
    }

    if (cell.houses > 0) {
      return cell.rent * (1 + cell.houses);
    }

    if (cell.buildable && this.playerOwnsGroup(cell.ownerId, cell.group)) {
      return cell.rent * 2;
    }

    return cell.rent;
  }

  findNextActivePlayerFrom(startIndex) {
    if (!this.players.length) return null;
    const length = this.players.length;
    for (let i = 1; i <= length; i += 1) {
      const idx = (startIndex + i) % length;
      const candidate = this.players[idx];
      if (candidate && !candidate.isBankrupt) {
        return candidate;
      }
    }
    return null;
  }

  ensureTurnIsValid() {
    if (!this.players.length) return;
    const current = this.players[this.currentTurnIndex];
    if (!current || current.isBankrupt) {
      const next = this.findNextActivePlayerFrom(this.currentTurnIndex);
      if (next) {
        this.currentTurnIndex = this.players.indexOf(next);
      }
    }
  }

  startGame(requesterId) {
    if (this.gameStatus !== 'waiting') {
      return { error: 'Game already started' };
    }
    if (requesterId !== this.hostId) {
      return { error: 'Only the host can start the game' };
    }
    if (this.getActivePlayers().length < MIN_PLAYERS) {
      return { error: `Need at least ${MIN_PLAYERS} players to start` };
    }

    this.gameStatus = 'active';
    this.turnHasRolled = false;
    this.ensureTurnIsValid();
    const current = this.getCurrentPlayer();
    this.log('Game started.');
    this.io.to(this.roomId).emit('game_started', {
      roomId: this.roomId,
      players: this.players.map((p) => p.toPublic()),
    });
    if (current) {
      this.io.to(this.roomId).emit('turn_changed', { playerId: current.playerId });
    }
    this.broadcastState();
    return { success: true };
  }

  handleRollDice(socketId, payBail = false) {
    if (this.gameStatus !== 'active') {
      this.sendError(socketId, 'Game is not active.');
      return;
    }
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }
    const current = this.getCurrentPlayer();
    if (!current || current.playerId !== player.playerId) {
      this.sendError(socketId, 'Not your turn.');
      return;
    }
    if (player.isBankrupt) {
      this.sendError(socketId, 'You are bankrupt.');
      return;
    }
    if (player.turnHasRolled && !player.canRollAgain) {
      this.sendError(socketId, 'You already rolled this turn.');
      return;
    }

    // Handle jail release BEFORE rolling
    if (player.inJail && payBail) {
      if (player.jailCards > 0) {
        player.jailCards -= 1;
        player.inJail = false;
        player.jailTurns = 0;
        player.turnHasRolled = true;
        this.log(`${player.name} used a Get Out of Jail Free card and left jail. Cannot move this turn.`);
        this.io.to(this.roomId).emit('paid_bail', { playerId: player.playerId, method: 'card' });
        this.broadcastState();
        return; // Turn ends - player can't move after using card
      } else if (player.balance >= BAIL_AMOUNT) {
        player.balance -= BAIL_AMOUNT;
        player.inJail = false;
        player.jailTurns = 0;
        player.turnHasRolled = true;
        this.log(`${player.name} paid Rs ${BAIL_AMOUNT} bail and left jail. Cannot move this turn.`);
        this.io.to(this.roomId).emit('paid_bail', { playerId: player.playerId, method: 'cash' });
        this.broadcastState();
        return; // Turn ends - player can't move after paying bail
      } else {
        this.sendError(socketId, `You need Rs ${BAIL_AMOUNT} to pay bail.`);
        return;
      }
    }

    // Handle vacation BEFORE rolling - player can't roll while on vacation
    if (player.inVacation) {
      player.vacationTurns += 1;
      player.turnHasRolled = true;

      // Turn 3 on vacation - automatic release
      if (player.vacationTurns >= VACATION_STAY_TURNS) {
        player.inVacation = false;
        player.vacationTurns = 0;
        this.log(`${player.name} returns from vacation and can play next turn!`);
        this.io.to(this.roomId).emit('vacation_ended', { playerId: player.playerId });
        this.broadcastState();
        return; // Turn ends - player can move NEXT turn
      }

      // Still on vacation - skip turn
      this.log(`${player.name} is on vacation (turn ${player.vacationTurns}/${VACATION_STAY_TURNS}). Turn skipped.`);
      this.io.to(this.roomId).emit('vacation_skip', { playerId: player.playerId, turnCount: player.vacationTurns });
      this.broadcastState();
      return; // Turn ends - no roll, no movement
    }

    const dice = Dice.roll();
    const isDoubles = dice.die1 === dice.die2;

    // Emit dice roll event immediately
    this.io.to(this.roomId).emit('dice_rolled', { playerId: player.playerId, dice, isDoubles });

    // Check for doubles FIRST before setting turnHasRolled
    if (isDoubles) {
      player.consecutiveDoubles += 1;

      // Third consecutive double - go to jail!
      if (player.consecutiveDoubles === 3) {
        this.log(`${player.name} rolled doubles for the THIRD time and goes to jail!`);
        this.io.to(this.roomId).emit('third_double_jail', { playerId: player.playerId });

        this.sendPlayerToJail(player);
        player.consecutiveDoubles = 0;
        player.canRollAgain = false;
        player.turnHasRolled = true;
        this.broadcastState();
        return;
      }

      // First or second double - extra turn!
      this.log(`${player.name} rolled doubles (${dice.die1}-${dice.die1})! Gets to roll again. (${player.consecutiveDoubles}/3)`);
      player.canRollAgain = true;
      player.turnHasRolled = false; // Allow rolling again
      this.io.to(this.roomId).emit('doubles_rolled', {
        playerId: player.playerId,
        count: player.consecutiveDoubles,
        canRollAgain: true
      });

      if (player.inJail) {
        const canMove = this.handleJailRoll(player, dice, isDoubles);
        if (canMove) {
          this.movePlayer(player, dice.total);
        }
      } else {
        this.movePlayer(player, dice.total);
      }
      this.broadcastState();
    } else {
      // Not doubles - normal turn flow
      player.consecutiveDoubles = 0;
      player.turnHasRolled = true;
      player.canRollAgain = false;

      if (player.inJail) {
        const canMove = this.handleJailRoll(player, dice, isDoubles);
        if (canMove) {
          this.movePlayer(player, dice.total);
        }
        this.broadcastState();
        return;
      }

      this.movePlayer(player, dice.total);
      this.broadcastState();
    }
  }

  handleJailRoll(player, dice, isDoubles) {
    // Increment jail turn counter
    player.jailTurns += 1;

    // Turn 3 - automatic release
    if (player.jailTurns >= 3) {
      player.inJail = false;
      player.jailTurns = 0;
      this.log(`${player.name} served time and is released from jail on turn 3!`);
      this.io.to(this.roomId).emit('jail_released', { playerId: player.playerId });
      return true; // Can move
    }

    // If rolled doubles, escape and move!
    if (isDoubles) {
      player.inJail = false;
      player.jailTurns = 0;
      // DON'T reset consecutiveDoubles here - let it continue for the extra roll
      this.log(`${player.name} rolled doubles (${dice.die1}-${dice.die1}) and escapes from jail!`);
      this.io.to(this.roomId).emit('jail_escape_doubles', { playerId: player.playerId });
      return true; // Can move
    }

    // Didn't roll doubles - stay in jail
    this.log(`${player.name} rolled ${dice.die1}-${dice.die2} but remains in jail (turn ${player.jailTurns}/2).`);
    return false; // Can't move
  }

  handleVacationRoll(player) {
    if (player.vacationTurns >= VACATION_STAY_TURNS) {
      player.inVacation = false;
      player.vacationTurns = 0;
      this.log(`${player.name} returns from vacation and can move this turn.`);
      return true;
    }

    player.vacationTurns += 1;
    this.log(`${player.name} is on vacation (turn ${player.vacationTurns}/${VACATION_STAY_TURNS}).`);
    return false;
  }

  movePlayer(player, steps) {
    const start = player.position;
    const newPos = (player.position + steps) % this.board.cells.length;
    const passedGo = player.position + steps >= this.board.cells.length;
    if (passedGo) {
      player.balance += GO_SALARY;
      this.log(`${player.name} passed GO and collected $${GO_SALARY}.`);
    }

    player.position = newPos;
    this.io.to(this.roomId).emit('player_moved', {
      playerId: player.playerId,
      from: start,
      to: newPos,
    });

    const cell = this.board.getCell(newPos);
    this.resolveLanding(cell, player);
  }

  resolveLanding(cell, player) {
    if (cell.type === 'neutral') {
      if (cell.name.toLowerCase().includes('pudhaiyal')) {
        this.drawCard(player, 'treasure');
        return;
      } else if (cell.name.toLowerCase().includes('surprise')) {
        this.drawCard(player, 'surprise');
        return;
      }
    }

    switch (cell.type) {
      case 'property':
        cell.onLand(player, this);
        break;
      case 'tax':
        this.handleTax(cell, player);
        break;
      case 'go-to-jail':
        this.sendPlayerToJail(player);
        break;
      case 'jail':
        this.log(`${player.name} is just visiting jail.`);
        break;
      case 'vacation':
        player.inVacation = true;
        player.vacationTurns = 0;
        this.log(`${player.name} is taking a vacation and will miss the next two turns.`);
        break;
      case 'go':
        this.log(`${player.name} landed on GO.`);
        break;
      default:
        this.log(`${player.name} landed on ${cell.name}.`);
        break;
    }
  }

  drawCard(player, type) {
    const deck = type === 'treasure' ? this.treasureCards : this.surpriseCards;
    if (deck.length === 0) this.initDecks();

    const card = deck.pop();
    this.log(`${player.name} drew ${type === 'treasure' ? 'Treasure' : 'Surprise'} card: ${card.title}`);

    // Push back to bottom unless it's a jail card
    if (card.action !== 'jail_card') {
      deck.unshift(card);
    }

    this.executeCardAction(player, card);

    this.io.to(this.roomId).emit('card_drawn', {
      playerId: player.playerId,
      card
    });
    this.broadcastState();
  }

  executeCardAction(player, card) {
    switch (card.action) {
      case 'jail_card':
        player.jailCards += 1;
        break;
      case 'simple_gain':
        player.balance += card.amount;
        break;
      case 'simple_loss':
        player.balance -= card.amount;
        break;
      case 'collect_from_all':
        this.players.forEach(p => {
          if (p.playerId !== player.playerId && !p.isBankrupt) {
            p.balance -= card.amount;
            player.balance += card.amount;
          }
        });
        break;
      case 'pay_to_all':
        this.players.forEach(p => {
          if (p.playerId !== player.playerId && !p.isBankrupt) {
            p.balance += card.amount;
            player.balance -= card.amount;
          }
        });
        break;
      case 'move_to':
        const moveSteps = (card.target - player.position + this.board.cells.length) % this.board.cells.length;
        this.movePlayer(player, moveSteps);
        break;
      case 'move_to_next_group':
        let currentPos = player.position;
        let found = false;
        for (let i = 1; i < this.board.cells.length; i++) {
          const nextIdx = (currentPos + i) % this.board.cells.length;
          const cell = this.board.cells[nextIdx];
          if (cell.type === 'property' && cell.group === card.group) {
            this.movePlayer(player, i);
            found = true;
            break;
          }
        }
        break;
      case 'relative_move':
        const steps = Math.floor(Math.random() * (card.max - card.min + 1)) + card.min;
        const actualSteps = steps * card.direction;
        // movePlayer normally handles forward movement; for backward we handle carefully
        if (actualSteps > 0) {
          this.movePlayer(player, actualSteps);
        } else {
          // Absolute position logic for backward movement
          const newPos = (player.position + actualSteps + this.board.cells.length) % this.board.cells.length;
          const from = player.position;
          player.position = newPos;
          this.io.to(this.roomId).emit('player_moved', {
            playerId: player.playerId,
            from,
            to: newPos
          });
          this.resolveLanding(this.board.cells[newPos], player);
        }
        break;
    }
  }

  handlePropertyLanding(cell, player) {
    if (cell.ownerId === null) {
      this.pendingPropertyIndex = cell.index;
      return;
    }

    if (cell.ownerId === player.playerId) {
      this.log(`${player.name} landed on their own property ${cell.name}.`);
      return;
    }

    const owner = this.players.find((p) => p.playerId === cell.ownerId && !p.isBankrupt);
    if (!owner) {
      if (cell.houses > 0) {
        this.houseSupply += cell.houses;
      }
      if (cell.hotels > 0) {
        this.hotelSupply += cell.hotels;
      }
      cell.ownerId = null;
      cell.houses = 0;
      cell.hotels = 0;
      this.pendingPropertyIndex = cell.index;
      this.log(`${cell.name} returned to the bank (previous owner unavailable).`);
      this.revalidatePendingTrades('Property returned to bank');
      return;
    }

    const rent = this.getRentForProperty(cell);
    owner.balance += rent;
    player.balance -= rent;
    this.io.to(this.roomId).emit('rent_paid', {
      fromPlayerId: player.playerId,
      toPlayerId: owner.playerId,
      amount: rent,
      propertyIndex: cell.index,
    });
    this.log(`${player.name} paid $${rent} rent to ${owner.name} for ${cell.name}.`);
  }

  handleTax(cell, player) {
    player.balance -= cell.amount;
    this.log(`${player.name} paid $${cell.amount} in taxes.`);
  }

  sendPlayerToJail(player) {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    player.inVacation = false;
    player.vacationTurns = 0;
    this.pendingPropertyIndex = null;
    player.canRollAgain = false; // Turn ends if sent to jail
    this.log(`${player.name} was sent directly to jail.`);
    this.io.to(this.roomId).emit('sent_to_jail', { playerId: player.playerId });
  }

  handleBuyProperty(socketId) {
    if (this.gameStatus !== 'active') {
      this.sendError(socketId, 'Game is not active.');
      return;
    }
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }
    const current = this.getCurrentPlayer();
    if (!current || current.playerId !== player.playerId) {
      this.sendError(socketId, 'Not your turn.');
      return;
    }
    if (player.isBankrupt) {
      this.sendError(socketId, 'You are bankrupt.');
      return;
    }
    if (this.pendingPropertyIndex === null) {
      this.sendError(socketId, 'No property available to buy.');
      return;
    }

    const cell = this.board.getCell(this.pendingPropertyIndex);
    if (cell.ownerId !== null) {
      this.sendError(socketId, 'Property already owned.');
      this.pendingPropertyIndex = null;
      return;
    }

    if (player.balance < cell.price) {
      this.sendError(socketId, 'Insufficient funds.');
      return;
    }

    player.balance -= cell.price;
    cell.ownerId = player.playerId;
    player.properties.push(cell.index);
    this.pendingPropertyIndex = null;
    this.log(`${player.name} bought ${cell.name} for $${cell.price}.`);
    this.io.to(this.roomId).emit('property_bought', {
      playerId: player.playerId,
      propertyIndex: cell.index,
      price: cell.price,
    });
    this.revalidatePendingTrades('Property ownership changed');
    this.broadcastState();
  }

  handleBuildHouse(socketId, propertyIndex) {
    if (this.gameStatus !== 'active') {
      this.sendError(socketId, 'Game is not active.');
      return;
    }
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }
    const current = this.getCurrentPlayer();
    if (!current || current.playerId !== player.playerId) {
      this.sendError(socketId, 'Not your turn.');
      return;
    }
    if (player.isBankrupt) {
      this.sendError(socketId, 'You are bankrupt.');
      return;
    }

    const result = this.buildHouse(player, propertyIndex);
    if (result.error) {
      this.sendError(socketId, result.error);
      return;
    }

    this.io.to(this.roomId).emit('house_built', {
      playerId: player.playerId,
      propertyIndex,
      houses: result.cell.houses,
    });
    this.broadcastState();
  }

  handleBuildHotel(socketId, propertyIndex) {
    if (this.gameStatus !== 'active') {
      this.sendError(socketId, 'Game is not active.');
      return;
    }
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }
    const current = this.getCurrentPlayer();
    if (!current || current.playerId !== player.playerId) {
      this.sendError(socketId, 'Not your turn.');
      return;
    }
    if (player.isBankrupt) {
      this.sendError(socketId, 'You are bankrupt.');
      return;
    }

    const result = this.buildHotel(player, propertyIndex);
    if (result.error) {
      this.sendError(socketId, result.error);
      return;
    }

    this.io.to(this.roomId).emit('hotel_built', {
      playerId: player.playerId,
      propertyIndex,
      hotels: result.cell.hotels,
    });
    this.broadcastState();
  }

  handleTradeCreate(socketId, draft) {
    if (this.gameStatus !== 'active') {
      this.sendError(socketId, 'Game is not active.');
      return;
    }
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }

    const normalizedDraft = {
      ...draft,
      fromPlayerId: player.playerId,
      toPlayerId: draft.toPlayerId,
      offered: {
        properties: draft?.offered?.properties || [],
        money: Number.isFinite(draft?.offered?.money) ? draft.offered.money : 0,
        jailCards: Number.isFinite(draft?.offered?.jailCards) ? draft.offered.jailCards : 0,
      },
      requested: {
        properties: draft?.requested?.properties || [],
        money: Number.isFinite(draft?.requested?.money) ? draft.requested.money : 0,
        jailCards: Number.isFinite(draft?.requested?.jailCards) ? draft.requested.jailCards : 0,
      },
    };

    const validation = this.validateTradeCreation(normalizedDraft);
    if (validation.error) {
      this.sendError(socketId, validation.error);
      return;
    }

    const trade = {
      tradeId: randomUUID(),
      ...normalizedDraft,
      status: 'PENDING',
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      expiresAt: draft?.expiresAt || null,
    };

    this.pendingTrades.set(trade.tradeId, trade);
    const toPlayer = this.getPlayerById(trade.toPlayerId);
    this.log(`${player.name} proposed a trade to ${toPlayer ? toPlayer.name : 'another player'}.`);
    this.io.to(this.roomId).emit('trade_created', { trade: this.sanitizeTrade(trade) });
    this.broadcastState();
  }

  handleTradeAccept(socketId, tradeId) {
    if (this.gameStatus !== 'active') {
      this.sendError(socketId, 'Game is not active.');
      return;
    }
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }

    const trade = this.pendingTrades.get(tradeId);
    if (!trade) {
      this.sendError(socketId, 'Trade not found.');
      return;
    }
    if (player.playerId !== trade.toPlayerId) {
      this.sendError(socketId, 'Only the receiving player can accept this trade.');
      return;
    }

    const validation = this.validateTradeBeforeAccept(trade);
    if (validation.error) {
      this.cancelTrade(trade, validation.error);
      this.sendError(socketId, validation.error);
      this.broadcastState();
      return;
    }

    const from = this.getPlayerById(trade.fromPlayerId);
    const to = this.getPlayerById(trade.toPlayerId);
    if (!from || !to) {
      this.cancelTrade(trade, 'Players no longer available');
      this.sendError(socketId, 'Players no longer available');
      return;
    }

    const offeredMoney = trade.offered.money || 0;
    const requestedMoney = trade.requested.money || 0;
    const offeredJail = trade.offered.jailCards || 0;
    const requestedJail = trade.requested.jailCards || 0;

    this.moveProperties(trade.offered.properties || [], from.playerId, to.playerId);
    this.moveProperties(trade.requested.properties || [], to.playerId, from.playerId);

    from.balance -= offeredMoney;
    to.balance += offeredMoney;
    to.balance -= requestedMoney;
    from.balance += requestedMoney;

    from.jailCards = (from.jailCards || 0) - offeredJail + requestedJail;
    to.jailCards = (to.jailCards || 0) + offeredJail - requestedJail;

    trade.status = 'ACCEPTED';
    trade.lastUpdatedAt = Date.now();
    this.pendingTrades.delete(tradeId);
    this.tradeHistory.push(this.sanitizeTrade(trade));
    if (this.tradeHistory.length > 100) {
      this.tradeHistory.shift();
    }

    this.log(`${from.name} and ${to.name} completed a trade.`);
    this.io.to(this.roomId).emit('trade_finalized', { trade: this.sanitizeTrade(trade), result: 'ACCEPTED' });
    this.revalidatePendingTrades('Property ownership changed');
    this.broadcastState();
  }

  handleTradeReject(socketId, tradeId) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }

    const trade = this.pendingTrades.get(tradeId);
    if (!trade) {
      this.sendError(socketId, 'Trade not found.');
      return;
    }
    if (player.playerId !== trade.toPlayerId) {
      this.sendError(socketId, 'Only the receiving player can reject this trade.');
      return;
    }

    trade.status = 'REJECTED';
    trade.lastUpdatedAt = Date.now();
    this.pendingTrades.delete(tradeId);
    this.tradeHistory.push(this.sanitizeTrade(trade));
    if (this.tradeHistory.length > 100) {
      this.tradeHistory.shift();
    }

    const from = this.getPlayerById(trade.fromPlayerId);
    this.log(`${player.name} rejected a trade from ${from ? from.name : 'another player'}.`);
    this.io.to(this.roomId).emit('trade_finalized', { trade: this.sanitizeTrade(trade), result: 'REJECTED' });
    this.broadcastState();
  }

  handleTradeCounter(socketId, tradeId, draft) {
    if (this.gameStatus !== 'active') {
      this.sendError(socketId, 'Game is not active.');
      return;
    }
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }

    const existing = this.pendingTrades.get(tradeId);
    if (!existing) {
      this.sendError(socketId, 'Trade not found.');
      return;
    }
    if (player.playerId !== existing.toPlayerId) {
      this.sendError(socketId, 'Only the receiving player can counter this trade.');
      return;
    }

    existing.status = 'COUNTERED';
    existing.lastUpdatedAt = Date.now();
    this.pendingTrades.delete(tradeId);
    this.tradeHistory.push(this.sanitizeTrade(existing));
    if (this.tradeHistory.length > 100) {
      this.tradeHistory.shift();
    }
    this.io.to(this.roomId).emit('trade_finalized', { trade: this.sanitizeTrade(existing), result: 'COUNTERED' });

    const counterDraft = {
      ...draft,
      fromPlayerId: player.playerId,
      toPlayerId: existing.fromPlayerId,
      offered: {
        properties: draft?.offered?.properties || [],
        money: Number.isFinite(draft?.offered?.money) ? draft.offered.money : 0,
        jailCards: Number.isFinite(draft?.offered?.jailCards) ? draft.offered.jailCards : 0,
      },
      requested: {
        properties: draft?.requested?.properties || [],
        money: Number.isFinite(draft?.requested?.money) ? draft.requested.money : 0,
        jailCards: Number.isFinite(draft?.requested?.jailCards) ? draft.requested.jailCards : 0,
      },
    };

    const validation = this.validateTradeCreation(counterDraft);
    if (validation.error) {
      this.sendError(socketId, validation.error);
      this.broadcastState();
      return;
    }

    const newTrade = {
      tradeId: randomUUID(),
      ...counterDraft,
      status: 'PENDING',
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      expiresAt: draft?.expiresAt || null,
    };

    this.pendingTrades.set(newTrade.tradeId, newTrade);
    const toPlayer = this.getPlayerById(newTrade.toPlayerId);
    this.log(`${player.name} countered a trade to ${toPlayer ? toPlayer.name : 'another player'}.`);
    this.io.to(this.roomId).emit('trade_created', { trade: this.sanitizeTrade(newTrade) });
    this.broadcastState();
  }

  buildHouse(player, propertyIndex) {
    const cell = this.board.getCell(propertyIndex);
    if (!cell || cell.type !== 'property') {
      return { error: 'Invalid property.' };
    }
    if (cell.ownerId !== player.playerId) {
      return { error: 'You do not own this property.' };
    }
    if (!cell.buildable) {
      return { error: 'Houses cannot be built on this property.' };
    }
    if (cell.hotels > 0) {
      return { error: 'Cannot build houses on a hotel property.' };
    }
    if (cell.houses >= 4) {
      return { error: 'Property already has 4 houses.' };
    }
    if (!this.playerOwnsGroup(player.playerId, cell.group)) {
      return { error: 'You must own all properties in this country group.' };
    }
    const groupCells = this.getGroupPropertyCells(cell.group);
    if (groupCells.some((groupCell) => groupCell.hotels > 0)) {
      return { error: 'Cannot build houses while a hotel exists in this group.' };
    }
    const minHouses = Math.min(...groupCells.map((groupCell) => groupCell.houses));
    if (cell.houses > minHouses) {
      return { error: 'Houses must be built evenly across the group.' };
    }
    if (this.houseSupply <= 0) {
      return { error: 'No houses left in the bank.' };
    }

    const houseCost = Math.max(1, Math.ceil(cell.price * HOUSE_COST_RATE));
    if (player.balance < houseCost) {
      return { error: `You need $${houseCost} to build a house here.` };
    }

    player.balance -= houseCost;
    cell.houses += 1;
    this.houseSupply -= 1;
    this.log(`${player.name} built a house on ${cell.name} for $${houseCost}.`);
    return { cell };
  }

  buildHotel(player, propertyIndex) {
    const cell = this.board.getCell(propertyIndex);
    if (!cell || cell.type !== 'property') {
      return { error: 'Invalid property.' };
    }
    if (cell.ownerId !== player.playerId) {
      return { error: 'You do not own this property.' };
    }
    if (!cell.buildable) {
      return { error: 'Hotels cannot be built on this property.' };
    }
    if (cell.hotels >= 1) {
      return { error: 'Property already has a hotel.' };
    }
    if (cell.houses !== 4) {
      return { error: 'Property must have 4 houses before building a hotel.' };
    }
    if (!this.playerOwnsGroup(player.playerId, cell.group)) {
      return { error: 'You must own all properties in this country group.' };
    }
    const groupCells = this.getGroupPropertyCells(cell.group);
    const allReady = groupCells.every((groupCell) => groupCell.houses === 4 || groupCell.hotels === 1);
    if (!allReady) {
      return { error: 'All properties in the group must be fully developed.' };
    }
    if (this.hotelSupply <= 0) {
      return { error: 'No hotels left in the bank.' };
    }

    const houseCost = Math.max(1, Math.ceil(cell.price * HOUSE_COST_RATE));
    const hotelCost = houseCost * HOTEL_COST_MULTIPLIER;
    if (player.balance < hotelCost) {
      return { error: `You need $${hotelCost} to build a hotel here.` };
    }

    player.balance -= hotelCost;
    cell.houses = 0;
    cell.hotels = 1;
    this.houseSupply += 4;
    this.hotelSupply -= 1;
    this.log(`${player.name} built a hotel on ${cell.name} for $${hotelCost}.`);
    return { cell };
  }

  endTurn(socketId) {
    if (this.gameStatus !== 'active') {
      this.sendError(socketId, 'Game is not active.');
      return;
    }
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      this.sendError(socketId, 'Player not found in room.');
      return;
    }
    const current = this.getCurrentPlayer();
    if (!current || current.playerId !== player.playerId) {
      this.sendError(socketId, 'Not your turn.');
      return;
    }
    if (!player.turnHasRolled) {
      this.sendError(socketId, 'You must roll before ending your turn.');
      return;
    }
    // Prevent ending turn if player is in debt
    if (player.balance < 0) {
      this.sendError(socketId, 'You are in debt! Sell properties or houses to get your balance back to at least Rs 0.');
      return;
    }

    // Prevent ending turn if player can roll again (doubles)
    if (player.canRollAgain) {
      this.sendError(socketId, 'You must roll again after getting doubles!');
      return;
    }

    this.log(`${player.name} ended their turn.`);
    this.pendingPropertyIndex = null;
    player.turnHasRolled = false;
    player.canRollAgain = false;
    player.consecutiveDoubles = 0; // Reset doubles counter at end of turn
    this.advanceTurn();
  }

  advanceTurn() {
    if (this.checkGameOver()) return;
    if (!this.players.length) return;

    const length = this.players.length;
    for (let i = 1; i <= length; i += 1) {
      const idx = (this.currentTurnIndex + i) % length;
      const candidate = this.players[idx];
      if (candidate && !candidate.isBankrupt) {
        this.currentTurnIndex = idx;
        candidate.turnHasRolled = false;
        candidate.canRollAgain = false;
        candidate.consecutiveDoubles = 0; // Reset doubles counter for new turn
        this.pendingPropertyIndex = null;
        this.io.to(this.roomId).emit('turn_changed', { playerId: candidate.playerId });
        this.broadcastState();
        return;
      }
    }
  }

  handleBankruptcy(player, fromDisconnect = false, manual = false) {
    player.isBankrupt = true;
    player.inJail = false;
    player.jailTurns = 0;
    this.cancelTradesForPlayer(player.playerId, 'Player bankrupt');

    // Release properties back to bank.
    this.board.cells.forEach((cell) => {
      if (cell.type === 'property' && cell.ownerId === player.playerId) {
        if (cell.houses > 0) {
          this.houseSupply += cell.houses;
        }
        if (cell.hotels > 0) {
          this.hotelSupply += cell.hotels;
        }
        cell.ownerId = null;
        cell.houses = 0;
        cell.hotels = 0;
      }
    });
    player.properties = [];

    const reason = fromDisconnect ? 'disconnected' : (manual ? 'declared bankruptcy' : 'went bankrupt');
    this.log(`${player.name} ${reason} and left the game.`);

    // If it was their turn, advance it
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer && currentPlayer.playerId === player.playerId) {
      this.advanceTurn();
    } else if (this.checkGameOver()) {
      return;
    }
    this.broadcastState();
  }

  handleDeclareBankruptcy(socketId) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) return;
    if (player.balance >= 0) {
      this.sendError(socketId, 'You can only declare bankruptcy if you are in debt.');
      return;
    }
    this.handleBankruptcy(player, false, true);
  }

  handleSellProperty(socketId, propertyIndex) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) return;

    const cell = this.board.cells[propertyIndex];
    if (!cell || cell.type !== 'property' || cell.ownerId !== player.playerId) {
      this.sendError(socketId, 'You do not own this property.');
      return;
    }

    // Rule: Must sell hotels first, then houses
    if (cell.hotels > 0) {
      const houseCost = Math.max(1, Math.ceil(cell.price * HOUSE_COST_RATE));
      const refund = Math.floor(houseCost / 2);
      cell.hotels -= 1;
      this.hotelSupply += 1;
      player.balance += refund;
      this.log(`${player.name} sold a hotel on ${cell.name} for Rs ${refund}.`);
    } else if (cell.houses > 0) {
      const houseCost = Math.max(1, Math.ceil(cell.price * HOUSE_COST_RATE));
      const refund = Math.floor(houseCost / 2);
      cell.houses -= 1;
      this.houseSupply += 1;
      player.balance += refund;
      this.log(`${player.name} sold a house on ${cell.name} for Rs ${refund}.`);
    } else {
      // Sell the property itself back to bank for 50% of cost
      const refund = Math.floor(cell.price / 2);
      cell.ownerId = null;
      // Sync player's properties array
      player.properties = player.properties.filter(pIdx => pIdx !== cell.index);
      player.balance += refund;
      this.log(`${player.name} sold ${cell.name} back to the bank for Rs ${refund}.`);
      this.revalidatePendingTrades('Property sold back to bank');
    }
    this.broadcastState();
  }

  checkGameOver() {
    const alive = this.players.filter((p) => !p.isBankrupt);
    if (alive.length <= 1 && this.players.length > 0) {
      const winner = alive[0] || null;
      this.finishGame(winner);
      return true;
    }
    return false;
  }

  finishGame(winner) {
    this.gameStatus = 'finished';
    const winnerId = winner ? winner.playerId : null;
    const winnerName = winner ? winner.name : 'No one';
    this.log(`Game over. Winner: ${winnerName}.`);
    this.io.to(this.roomId).emit('game_over', {
      roomId: this.roomId,
      winnerId,
      winnerName,
    });
  }

  broadcastState() {
    const state = this.getPublicState();
    this.io.to(this.roomId).emit('game_state_update', state);
  }

  getPublicState() {
    const currentPlayer = this.getCurrentPlayer();
    return {
      roomId: this.roomId,
      gameStatus: this.gameStatus,
      currentTurnPlayerId: currentPlayer ? currentPlayer.playerId : null,
      hostId: this.hostId,
      players: this.players.map((p) => p.toPublic()),
      board: {
        cells: this.board.getState(),
      },
      pendingPropertyIndex: this.pendingPropertyIndex,
      lastAction: this.lastAction,
      gameLog: [...this.gameLog],
      turnHasRolled: currentPlayer ? currentPlayer.turnHasRolled : false,
      canRollAgain: currentPlayer ? currentPlayer.canRollAgain : false,
      houseSupply: this.houseSupply,
      hotelSupply: this.hotelSupply,
      pendingTrades: Array.from(this.pendingTrades.values()).map((t) => this.sanitizeTrade(t)),
      tradeHistory: this.tradeHistory.slice(-20),
    };
  }

  sendError(socketId, message) {
    this.io.to(socketId).emit('error_message', { message });
  }
}
