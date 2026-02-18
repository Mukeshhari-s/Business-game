import RoomManager from './rooms/RoomManager.js';

export default function initSockets(io) {
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    socket.on('create_room', ({ name, settings }) => {
      console.log(`🎮 Create room request from ${socket.id}, name: ${name}`);
      if (!name) {
        socket.emit('error_message', { message: 'Name is required.' });
        return;
      }

      const result = roomManager.createRoom(name, socket.id, settings);
      if (result.error) {
        console.log(`❌ Failed to create room: ${result.error}`);
        socket.emit('error_message', { message: result.error });
        return;
      }

      const { roomId, player } = result;
      socket.join(roomId);
      console.log(`✅ Room ${roomId} created by ${player.name} (${player.playerId.substring(0, 8)}...)`);
      socket.emit('room_created', { roomId, playerId: player.playerId });
      io.to(roomId).emit('player_joined', { player: player.toPublic() });
      const room = roomManager.getRoom(roomId);
      room.broadcastState();
    });

    socket.on('join_room', ({ roomId, name }) => {
      console.log(`🚪 Join room request: ${roomId}, name: ${name}, socket: ${socket.id}`);
      if (!roomId || !name) {
        socket.emit('error_message', { message: 'Room code and name are required.' });
        return;
      }

      const normalized = roomId.toUpperCase();
      const result = roomManager.joinRoom(normalized, name, socket.id);
      if (result.error) {
        console.log(`❌ Failed to join room ${normalized}: ${result.error}`);
        socket.emit('error_message', { message: result.error });
        return;
      }

      const { room, player } = result;
      socket.join(normalized);
      console.log(`✅ ${player.name} joined room ${normalized}`);
      // Tell the joining player their own ID so their client can enable actions
      socket.emit('room_joined', { roomId: normalized, playerId: player.playerId });
      io.to(normalized).emit('player_joined', { player: player.toPublic() });
      room.broadcastState();
    });

    socket.on('select_color', ({ color }) => {
      console.log(`🎨 Color selection request from ${socket.id}, color: ${color}`);
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        console.log(`❌ Player not in room: ${socket.id}`);
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }

      const player = room.getPlayerBySocketId(socket.id);
      if (!player) {
        console.log(`❌ Player not found for socket: ${socket.id}`);
        socket.emit('error_message', { message: 'Player not found.' });
        return;
      }

      console.log(`🔍 Checking if color ${color} is taken...`);
      console.log(`👥 Room players:`, room.players.map(p => ({ name: p.name, color: p.color, id: p.playerId })));

      // Check if color is already taken
      if (color && room.players.some((p) => p.playerId !== player.playerId && p.color === color)) {
        console.log(`❌ Color ${color} already taken`);
        socket.emit('error_message', { message: 'This color is already taken by another player. Please choose a different color.' });
        return;
      }

      // Assign color to player
      player.color = color;
      console.log(`✅ ${player.name} selected color ${color}`);
      
      // Broadcast updated state
      console.log(`📡 Broadcasting updated state...`);
      room.broadcastState();
      console.log(`📤 Sending color_selected event to client...`);
      socket.emit('color_selected', { color });
      console.log(`✅ Color selection process completed`);
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

    socket.on('trade_cancel', ({ tradeId }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleTradeCancel(socket.id, tradeId);
    });

    socket.on('sell_property', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleSellProperty(socket.id, propertyIndex);
    });

    socket.on('unmortgage_property', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleUnmortgageProperty(socket.id, propertyIndex);
    });

    socket.on('liquidate_property', ({ propertyIndex }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        socket.emit('error_message', { message: 'You are not in a room.' });
        return;
      }
      room.handleLiquidateProperty(socket.id, propertyIndex);
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

    socket.on('leave_game', () => {
      console.log(`🚪 Leave game request from ${socket.id}`);
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

      const playerName = player.name;
      const roomId = room.roomId;

      console.log(`📝 Before removal - Players in room: ${room.players.map(p => p.name).join(', ')}`);

      // Remove player completely from the game (this broadcasts state to room)
      const result = room.removePlayerPermanently(socket.id);
      if (result.error) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      console.log(`📝 After removal - Players in room: ${room.players.map(p => p.name).join(', ')}`);

      // Give a small delay to ensure broadcast reaches all clients before player leaves
      setTimeout(() => {
        // Notify the player they left successfully
        socket.emit('left_game', { message: 'You have left the game.' });

        // Notify other players in the room
        socket.to(roomId).emit('player_left', { playerName });

        // Now leave the socket.io room
        socket.leave(roomId);
        
        // Clear the socket mapping
        roomManager.socketRoomMap.delete(socket.id);
        
        // Cleanup room if empty
        roomManager.cleanupRoomIfEmpty(roomId);

        console.log(`✅ Player ${playerName} has left room ${roomId}`);
      }, 100);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      roomManager.handleDisconnect(socket.id);
    });
  });
}
