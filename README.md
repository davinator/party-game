# Party Platformer

A browser-based multiplayer party platformer inspired by Ultimate Chicken Horse.  
Two teams race from **START** to **FINISH** while placing obstacles to sabotage each other.

## The key twist

When you **die**, you immediately enter **ghost mode** — fly freely around the level
and press `[E]` to drop an obstacle on the map **while others are still playing**.
No waiting, no spectating, just chaos.

---

## Quick start

### 1. Start the relay server

```bash
cd server
npm install
npm start
# → ws://localhost:8080
```

### 2. Open the client

Serve the `client/` folder with any static file server:

```bash
# Python 3
cd client && python3 -m http.server 3000

# Node (npx)
cd client && npx serve .
```

Then open `http://localhost:3000` in multiple browser tabs (or on different machines on the same network pointing to the host's IP).

### 3. Play

1. Enter a name, room code, and pick a team.
2. Everyone joins the same room code — first joiner is **host**.
3. Host clicks **▶ START GAME**.
4. **Build Phase (30s):** each player places 2 objects.
5. **Race Phase (120s):** reach the FINISH flag.
6. Dead? Fly around with WASD and press `[E]` to drop an obstacle!
7. Host presses `[R]` to start the next round.

---

## Controls

| Action | Key |
|---|---|
| Move | `A / D` or `←/→` |
| Jump | `Space / W / ↑` |
| Ghost fly (when dead) | `WASD` or arrow keys |
| Open placement | `E` |
| Switch object type | `1` Platform · `2` Spike · `3` Spring |
| Cancel placement | `Esc` |
| Next round (host) | `R` |

---

## Scoring

- **+10 pts** for each player on your team who crosses the finish line.

---

## Architecture

```
server/server.js   Pure WebSocket relay — no game logic.
                   Rooms auto-created, first joiner = host.
                   Host sends full state snapshot to late joiners.

client/js/game.js  Entire game engine — physics, rendering, net sync.
                   Client-authoritative for the local player.
                   Remote players smoothly interpolate to broadcasted positions.
```

The server never validates game state — it only relays JSON messages between
clients in the same room. The host drives phase transitions (build → play → results).
