# 🎲 Multiplayer Monopoly (Socket.IO + Express)

A **production-quality, server-authoritative multiplayer Monopoly game** with real-time WebSocket synchronization, complete game logic, and a modern visual interface.

![Monopoly Game](https://img.shields.io/badge/Game-Monopoly-red?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Any modern web browser

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Start the server (from project root)
npm start

# 3. Open in browser
# Navigate to http://localhost:3000
```

The server will start on port 3000 by default. Open multiple browser windows/tabs or share your local IP with devices on the same network to play multiplayer.

## 🎮 How to Play

### Creating/Joining a Game
1. **Create Room**: Enter your name and click "Create New Room" - you'll get a 4-letter room code
2. **Join Room**: Enter your name and the room code, then click "Join Room"
3. **Start Game**: The room **creator (host)** must click "START GAME" when 2+ players are ready

### Game Flow
1. **Your Turn**: Wait for your turn (highlighted player card with animation)
2. **Roll Dice**: Click "🎲 ROLL DICE" to roll
   - Check "Pay $50 bail if in jail" to pay bail and exit jail immediately
3. **Landing**:
   - **Unowned Property**: Click "💰 BUY PROPERTY" to purchase
   - **Owned Property**: Rent is automatically deducted (base rent, with houses/hotels, or 2x for monopoly)
   - **Special Spaces**: GO (+$200), Tax (-$), Go To Jail, Vacation (skip 2 turns)
4. **Build Houses/Hotels**: When you own all properties in a color group (monopoly):
   - Navigate to "🏗️ Build" section in right panel
   - Click "🏠 +House" to add houses evenly across the group (max 4 per property)
   - Click "🏨 Hotel" when a property has 4 houses (upgrades to hotel)
   - Costs: each house costs **50% of that property's price**; upgrading to a hotel costs the same as one house (after 4 houses)
   - Rent increases: Base rent × (1 + houses) or Base rent × 5 for hotels
5. **End Turn**: Click "➡️ END TURN" to pass to next player
6. **Win**: Last player standing (not bankrupt) wins!

### Jail Rules
- Sent to jail via "Go To Jail" space
- Stay max 2 turns
- Options: Pay $50 bail OR wait 2 turns
- Cannot move while in jail

### Vacation Rules
- Landing on "Vacation" space (index 20)
- Skip next 2 turns (relax!)
- Automatically resume after 2 turns

### Bankruptcy
- Balance goes below $0 from rent/tax
- All properties return to bank
- Removed from game
- Game ends when 1 player remains

## ✨ Features

### 🎯 Core Gameplay
- ✅ Full Monopoly board (40 spaces) with all property types
- ✅ 2-4 players per game room
- ✅ Server-authoritative game logic (no client-side cheating)
- ✅ Property buying and rent collection
- ✅ **Country-themed color groups** (Brazil, Israel, Italy, Germany, China, France, UK, USA)
- ✅ **House/Hotel building system** with monopoly requirement
- ✅ **Even building rules** - houses must be built evenly across color groups
- ✅ **Dynamic rent calculation** - base rent, houses (+1×base per house), hotels (5×base), monopoly (2×base)
- ✅ **Limited supply tracking** - 32 houses, 12 hotels per game
- ✅ Jail mechanics with bail option
- ✅ Vacation space (2-turn rest)
- ✅ Bankruptcy handling with property/building reclamation
- ✅ GO salary ($200)
- ✅ Income Tax & Luxury Tax
- ✅ Turn-based gameplay with validation

### 🌐 Multiplayer
- ✅ Real-time WebSocket sync via Socket.IO
- ✅ Multiple simultaneous game rooms
- ✅ 4-character room codes for easy joining
- ✅ Graceful disconnect handling
- ✅ Player reconnection support
- ✅ Full game state synchronization

### 🎨 User Interface
- ✅ **Modern Tailwind CSS design** with gradient backgrounds
- ✅ Visual Monopoly board with all 40 cells
- ✅ Color-coded property groups (8 country themes)
- ✅ **Building indicators** - visual house/hotel markers on properties
- ✅ Animated player tokens
- ✅ Property ownership indicators with color-coded bars
- ✅ **Interactive building panel** - click to build houses/hotels on owned monopolies
- ✅ Real-time game log with auto-scroll
- ✅ Player status cards with live stats
- ✅ **Supply tracker** - live counts of remaining houses/hotels
- ✅ Dice animation
- ✅ Toast notifications with smooth animations
- ✅ **Fully responsive design** - works on desktop, tablet, and mobile
- ✅ Modern gradient UI with card-based layouts
- ✅ Accessibility-friendly color contrasts

### 🔐 Security & Validation
- ✅ Server generates all dice rolls
- ✅ Turn ownership validation
- ✅ Money validation before purchases
- ✅ Action validation (can't act out of turn)
- ✅ Client can only request actions, server decides outcomes

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js (ES6 modules)
- **Server Framework**: Express.js
- **Real-time**: Socket.IO (WebSockets)
- **Frontend**: Vanilla JavaScript + HTML5 + **Tailwind CSS 3.x** (CDN)
- **Styling**: Custom CSS for board + Tailwind utility classes
- **Storage**: In-memory (no database)

### Project Structure
```
monopoly/
├── server/
│   ├── index.js              # Express + Socket.IO server
│   ├── socket.js             # WebSocket event handlers
│   ├── rooms/
│   │   └── RoomManager.js    # Room lifecycle management
│   └── game/
│       ├── GameRoom.js       # Game state & rules engine
│       ├── Player.js         # Player entity
│       ├── Board.js          # Board & cell initialization
│       ├── Cell.js           # Base cell class
│       ├── PropertyCell.js   # Property cell logic
│       └── Dice.js           # Server-side RNG
├── client/
│   ├── index.html            # Game UI with Tailwind CSS
│   ├── app.js                # Client logic & Socket.IO
│   └── style.css             # Custom board styling (complements Tailwind)
├── package.json
└── README.md
```

### Layer Separation
1. **Network Layer** (`socket.js`): Socket.IO event routing
2. **Room Management** (`RoomManager.js`): Multi-room orchestration
3. **Game Engine** (`GameRoom.js`): Rules, turns, state machine
4. **Domain Models**: Player, Board, Cell, PropertyCell, Dice
5. **Client Layer**: UI rendering + event emission only

### WebSocket Events

#### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `create_room` | `{ name }` | Create new game room |
| `join_room` | `{ roomId, name }` | Join existing room |
| `start_game` | - | Start game (host only) |
| `roll_dice` | `{ payBail }` | Roll dice (optional bail payment) |
| `buy_property` | - | Purchase current property |
| `build_house` | `{ propertyIndex }` | Build house on property |
| `build_hotel` | `{ propertyIndex }` | Build hotel on property |
| `end_turn` | - | End current turn |

#### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `room_created` | `{ roomId, playerId }` | Room created successfully |
| `room_joined` | `{ roomId, playerId }` | Successfully joined room |
| `player_joined` | `{ player }` | Player joined room |
| `game_started` | - | Game has started |
| `turn_changed` | `{ playerId }` | New player's turn |
| `dice_rolled` | `{ playerId, dice }` | Dice roll result |
| `player_moved` | `{ playerId, from, to }` | Player moved |
| `property_bought` | `{ playerId, propertyIndex, price }` | Property purchased |
| `house_built` | `{ playerId, propertyIndex, houses }` | House built on property |
| `hotel_built` | `{ playerId, propertyIndex, hotels }` | Hotel built on property |
| `rent_paid` | `{ fromPlayerId, toPlayerId, amount, propertyIndex }` | Rent payment |
| `sent_to_jail` | `{ playerId }` | Player sent to jail |
| `game_state_update` | `{ full game state }` | Complete state sync |
| `game_over` | `{ winnerId, winnerName }` | Game ended |
| `error_message` | `{ message }` | Error notification |

### State Synchronization
- Server broadcasts **full game state** after every major action
- State includes: players, board ownership, current turn, pending actions, game log, **house/hotel counts, supply remaining**
- Clients are **read-only**: they only render received state
- No client-side state mutations allowed
- **Building state** tracked per property: houses (0-4), hotels (0-1)

## 🧪 Testing Multiplayer Locally

### Option 1: Multiple Browser Windows
1. Open `http://localhost:3000` in Chrome
2. Open `http://localhost:3000` in another Chrome window/tab
3. Create room in window 1, join from window 2
4. Host (window 1) clicks "START GAME"

### Option 2: Multiple Devices (Same Network) ⭐ **RECOMMENDED FOR REAL MULTIPLAYER**

**On Computer (Server):**
```powershell
# 1. Find your local IP address
ipconfig

# Look for "IPv4 Address" under WiFi/Ethernet
# Example: 192.168.1.100

# 2. Start the server
npm start

# Server will show: "Monopoly server listening on port 3000"
```

**On Friend's Device (Phone/Tablet/Computer):**
```
1. Connect to SAME WiFi network
2. Open browser
3. Navigate to: http://YOUR_IP:3000
   Example: http://192.168.1.100:3000
4. Enter name and room code
5. Join the game!
```

**Firewall Setup (Windows):**
If friends can't connect:
1. Windows Defender Firewall → Allow an app
2. Find "Node.js" → Check both Private and Public
3. OR manually allow port 3000

### Option 3: Incognito/Private Windows
- Use incognito mode to simulate different users in same browser

## 📈 Scaling to Production

### Horizontal Scaling (Multi-Server)
```bash
npm install socket.io-redis
```

Update [server/index.js](server/index.js):
```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### Database Persistence
Replace in-memory storage with:
- **PostgreSQL/MySQL**: Relational data (players, rooms, game state)
- **Redis**: Hot cache for active games
- **MongoDB**: Document store for game logs/history

Recommended schema:
```sql
-- rooms table
CREATE TABLE rooms (
  room_id VARCHAR(4) PRIMARY KEY,
  status VARCHAR(20),
  created_at TIMESTAMP,
  game_state JSONB
);

-- players table  
CREATE TABLE players (
  player_id UUID PRIMARY KEY,
  room_id VARCHAR(4),
  name VARCHAR(50),
  balance INTEGER,
  position INTEGER,
  properties JSONB,
  in_jail BOOLEAN,
  is_bankrupt BOOLEAN
);
```

### Authentication & Reconnection
1. Add JWT-based auth
2. Store `playerId` → `socketId` mappings in Redis
3. On reconnect, restore session via token
4. Prevent identity theft with signed tokens

### Performance Optimizations
- **Rate limiting**: Prevent spam actions (1 action/100ms per player)
- **Room TTL**: Auto-delete empty rooms after 1 hour
- **State snapshots**: Store full state every N turns to enable replay
- **CDN**: Serve static assets (HTML/CSS/JS) via CDN
- **Load balancer**: NGINX/HAProxy in front of Node.js instances

### Monitoring & Observability
- **Metrics**: Prometheus + Grafana
- **Logging**: Winston → ELK stack
- **Error tracking**: Sentry
- **Analytics**: Track game duration, win rates, property popularity

## 🎯 Future Enhancements

### Game Features
- [ ] Chance & Community Chest cards
- [x] **Property development (houses/hotels)** ✅ IMPLEMENTED
- [ ] Property auctions
- [ ] Trading between players
- [ ] Mortgage system
- [ ] House costs per property group
- [ ] Custom game rules (fast mode, etc.)
- [ ] Spectator mode
- [ ] Game replay/history

### Technical Improvements
- [ ] TypeScript migration
- [ ] Unit tests (Jest)
- [ ] Integration tests (Playwright)
- [ ] CI/CD pipeline
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] GraphQL API for game queries
- [ ] Mobile app (React Native)

## 📝 License

This is an educational project demonstrating multiplayer game architecture. Monopoly is a trademark of Hasbro.

## 🤝 Contributing

This is a demonstration project. Feel free to fork and extend with additional features!

---

**Built with ❤️ as a production-quality multiplayer game engine example**
