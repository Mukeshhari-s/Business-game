import GameRoom from '../game/GameRoom.js';

const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export default class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.socketRoomMap = new Map();
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

  createRoom(hostName, socketId) {
    const roomId = this.generateRoomId();
    const room = new GameRoom(roomId, this.io);
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
      this.rooms.delete(roomId);
    }
  }
}
