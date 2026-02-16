import RoomManager from './rooms/RoomManager.js';

export default function initSockets(io) {
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('create_room', ({ name }) => {
      if (!name) {
        socket.emit('error_message', { message: 'Name is required.' });
        return;
      }

      const result = roomManager.createRoom(name, socket.id);
      if (result.error) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      const { roomId, player } = result;
      socket.join(roomId);
      socket.emit('room_created', { roomId, playerId: player.playerId });
      io.to(roomId).emit('player_joined', { player: player.toPublic() });
      const room = roomManager.getRoom(roomId);
      room.broadcastState();
    });

    socket.on('join_room', ({ roomId, name }) => {
      if (!roomId || !name) {
        socket.emit('error_message', { message: 'Room code and name are required.' });
        return;
      }

      const normalized = roomId.toUpperCase();
      const result = roomManager.joinRoom(normalized, name, socket.id);
      if (result.error) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      const { room, player } = result;
      socket.join(normalized);
      // Tell the joining player their own ID so their client can enable actions
      socket.emit('room_joined', { roomId: normalized, playerId: player.playerId });
      io.to(normalized).emit('player_joined', { player: player.toPublic() });
      room.broadcastState();
    });

    socket.on('reconnect_room', ({ roomId, playerId }) => {
      if (!roomId || !playerId) {
        socket.emit('reconnect_failed', { message: 'Room ID and Player ID are required for reconnection.' });
        return;
      }

      const result = roomManager.reconnectToRoom(roomId, playerId, socket.id);
      if (result.error) {
        socket.emit('reconnect_failed', { message: result.error });
        return;
      }

      const { room, player } = result;
      socket.join(roomId);

      // Re-initialize for the reconnected player
      socket.emit('room_joined', { roomId, playerId: player.playerId });
      socket.emit('reconnected', { playerId: player.playerId });

      // Notify others and broadcast state
      io.to(roomId).emit('player_reconnected', { player: player.toPublic() });
      room.broadcastState();
    });

    socket.on('start_game', () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      const player = room.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('error_message', { message: 'Player not found.' });
        return;
      }
      const result = room.startGame(player.playerId);
      if (result.error) {
        socket.emit('error_message', { message: result.error });
      }
    });

    socket.on('roll_dice', ({ payBail = false } = {}) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleRollDice(socket.id, payBail);
    });

    socket.on('buy_property', () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleBuyProperty(socket.id);
    });

    socket.on('build_house', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleBuildHouse(socket.id, propertyIndex);
    });

    socket.on('build_hotel', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleBuildHotel(socket.id, propertyIndex);
    });

    socket.on('trade_create', (draft) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleTradeCreate(socket.id, draft || {});
    });

    socket.on('trade_accept', ({ tradeId }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleTradeAccept(socket.id, tradeId);
    });

    socket.on('trade_reject', ({ tradeId }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleTradeReject(socket.id, tradeId);
    });

    socket.on('trade_counter', ({ tradeId, draft }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleTradeCounter(socket.id, tradeId, draft || {});
    });

    socket.on('sell_property', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleSellProperty(socket.id, propertyIndex);
    });

    socket.on('declare_bankruptcy', () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleDeclareBankruptcy(socket.id);
    });

    socket.on('end_turn', () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.endTurn(socket.id);
    });

    socket.on('disconnect', () => {
      roomManager.handleDisconnect(socket.id);
    });
  });
}
