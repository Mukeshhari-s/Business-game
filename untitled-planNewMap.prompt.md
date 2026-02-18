## Plan: Add Selectable Second Map

TL;DR—Create a second board dataset (names/groups/prices/rents) on both server and client, wire map selection from lobby through room settings, have the server build the correct board per map, send the chosen map to clients, and render with matching labels/colors. Keep color group keys aligned and add CSS for any new groups.

**Steps**
1) Server board data: In server/game/Board.js, refactor to accept a `mapKey` and load cells from a map registry (e.g., `{ world, newMap }`). Add a new map definition (names, groups, costs, rents) with the same 40 indices.
2) GameRoom plumbing: In server/game/GameRoom.js, pass `settings.map` into Board construction. Ensure `settings.map` defaults to `world` and is included in `getPublicState` for clients.
3) Client map metadata: In client/app.js, convert static `boardData` into a per-map registry and select the dataset using `gameState.settings.map` (or lobby selection fallback).
4) Board render source: In the board init/render path (client/app.js), use the selected map’s `boardData` for labels/colors. Keep index alignment with server cells.
5) Lobby selection: Add options to `mapSelect` in client/index.html (e.g., “World”, “New Map”) and ensure the chosen value is saved in session and sent in create-room.
6) Color groups: For any new group keys, add CSS swatches in client/style.css. Reuse existing groups when possible to minimize CSS changes.
7) State flow & reconnection: Ensure reconnection defaults preserve `settings.map` in session handling (client/app.js) so clients render the correct map after reconnect.
8) Consistency check: Verify server map data and client `boardData` share identical ordering/group keys; adjust existing drift if present before adding the new map.

**Verification**
- Create a room selecting the new map; confirm board labels/groups match the new dataset on both clients.
- Start a game, buy properties across the board; owner bars and tokens use chosen player colors and correct cells.
- Reconnect a player and confirm the map renders unchanged.
- If any new group colors were added, visually confirm CSS styling on those cells.

**Decisions**
- Single source of truth per map (server registry + client registry) with shared keys; fallback remains `world`.
