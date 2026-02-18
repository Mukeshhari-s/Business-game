import GameRoom from '../game/GameRoom.js';

const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export default class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.socketRoomMap = new Map();
    this.cleanupTimeouts = new Map(); // Add this to track pending cleanups
  }

  generateRoomId() {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
      code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
    }
    if (this.rooms.has(code)) {
      return this.generateRoomId();
    }
    return code;
  }

  createRoom(hostName, socketId, settings) {
    const roomId = this.generateRoomId();
    const room = new GameRoom(roomId, this.io, settings);
    const { player, error } = room.addPlayer(hostName, socketId);
    if (error) {
      return { error };
    }
    this.rooms.set(roomId, room);
    this.socketRoomMap.set(socketId, roomId);
    return { roomId, player };
  }

  joinRoom(roomId, name, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    const { player, error } = room.addPlayer(name, socketId);
    if (error) return { error };
    this.socketRoomMap.set(socketId, roomId);
    return { room, player };
  }

  reconnectToRoom(roomId, playerId, socketId) {
    const normalizedId = roomId?.toUpperCase();
    console.log(`📡 Reconnection attempt: Room ${normalizedId}, Player ${playerId}`);

    const room = this.rooms.get(normalizedId);
    if (!room) {
      console.log(`❌ Reconnection failed: Room ${normalizedId} not found in active rooms:`, Array.from(this.rooms.keys()));
      return { error: 'Room not found' };
    }

    // Cancel pending cleanup if any
    if (this.cleanupTimeouts.has(normalizedId)) {
      console.log(`🧹 Cancelling cleanup for room ${normalizedId} - player reconnected`);
      clearTimeout(this.cleanupTimeouts.get(normalizedId));
      this.cleanupTimeouts.delete(normalizedId);
    }

    const { player, error } = room.reconnectPlayer(playerId, socketId);
    if (error) {
      console.log(`❌ Reconnection failed for player ${playerId}: ${error}`);
      return { error };
    }

    this.socketRoomMap.set(socketId, normalizedId);
    console.log(`✅ Player ${player.name} reconnected to room ${normalizedId}`);
    return { room, player };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomBySocket(socketId) {
    const roomId = this.socketRoomMap.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  handleDisconnect(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room) return;

    room.removePlayerBySocket(socketId);
    this.socketRoomMap.delete(socketId);
    this.cleanupRoomIfEmpty(room.roomId);
  }

  cleanupRoomIfEmpty(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const hasConnectedPlayers = room.players.some((p) => !p.isBankrupt && p.connected);
    if (!hasConnectedPlayers) {
      // Don't delete immediately, wait 60 seconds
      if (this.cleanupTimeouts.has(roomId)) return;

      console.log(`🧹 Room ${roomId} is empty. Scheduling cleanup in 60s...`);
      const timeout = setTimeout(() => {
        console.log(`🧹 Cleaning up empty room: ${roomId}`);
        this.rooms.delete(roomId);
        this.cleanupTimeouts.delete(roomId);
      }, 60000);

      this.cleanupTimeouts.set(roomId, timeout);
    }
  }
}
