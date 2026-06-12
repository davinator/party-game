# Party Platformer

A browser-based multiplayer party platformer inspired by Ultimate Chicken Horse.  
Two teams race from **START** to **FINISH** while placing obstacles to sabotage each other.

## The key twist

When you **die**, you immediately enter **ghost mode** — fly freely around the level
and press `[E]` to drop an obstacle on the map **while others are still playing**.
No waiting, no spectating, just chaos.

---

## Play

**Client:** https://davinator.github.io/party-game/

The client is a static page — no install needed. You just need a relay server running
somewhere everyone can reach.

---

## Quickstart options

### Option A — Same machine (testing)

```bash
cd server && npm install && npm start
```

Open `https://davinator.github.io/party-game/` in multiple tabs.  
Server address: `localhost:8080`

### Option B — LAN / office party

Run the server on one machine:
```bash
cd server && npm install && npm start
```

Everyone opens the GitHub Pages URL and enters `<host-machine-IP>:8080` as the server address.  
Find your local IP with `ipconfig` (Windows) or `ifconfig` / `ip a` (Mac/Linux).

### Option C — Internet play

Deploy the server to any Node host (see below), then share the server address with players.

---

## Deploy the relay server

The server is a ~120-line Node.js WebSocket relay. No database, no state beyond in-memory rooms.

**Railway** (easiest)
```bash
cd server
railway init
railway up
```
Set the `PORT` env var if needed. Railway provides a public URL — use `wss://` in the client.

**Fly.io**
```bash
cd server
fly launch   # accept defaults, set PORT
fly deploy
```

**VPS / self-hosted**
```bash
cd server && npm install
PORT=8080 node server.js
```
Expose port 8080 (or put it behind nginx with TLS). Use `wss://your-domain` in the client.

---

## How to play

1. Everyone opens the client URL and enters the same **room code**.
2. Enter the **server address** (e.g. `localhost:8080` or `my-server.railway.app`).
3. Pick a name and team, then click **JOIN ROOM**.
4. First person to join is **host** — they click **▶ START GAME**.
5. **Build Phase (30s):** each player ghosts around and places up to 2 objects.
6. **Race Phase (120s):** reach the FINISH flag. Bump other players off ledges.
7. **Dead?** Keep flying with WASD and press `[E]` to drop an obstacle on survivors.
8. Host presses `[R]` to start the next round.

---

## Controls

| Action | Keys |
|---|---|
| Move | `A / D` or `← / →` |
| Jump | `Space`, `W`, or `↑` |
| Ghost fly | `W A S D` or arrow keys |
| Open placement | `E` |
| Switch object | `1` Platform · `2` Spike · `3` Spring |
| Cancel placement | `Esc` |
| Next round (host) | `R` |

---

## Scoring

**+10 pts** per player on your team who crosses the finish line each round.

---

## Architecture

```
server/server.js   Pure WebSocket relay — no game logic.
                   Rooms auto-created; first joiner = host.
                   Host sends full state snapshot to late joiners.

docs/js/game.js    Entire game engine: physics, rendering, net sync.
                   Client-authoritative for the local player.
                   Remote players interpolate to broadcasted positions.
                   Canvas fills the window; camera follows local player.
```

The server never validates game state — it only relays JSON between clients in the same room.
