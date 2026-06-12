# Party Platformer

A browser-based multiplayer party platformer inspired by Ultimate Chicken Horse.  
Two teams race from **START** to **FINISH** while placing obstacles to sabotage each other.

## The key twist

When you **die**, you immediately enter **ghost mode** — fly freely around the level
and press `[E]` to drop an obstacle on the map **while others are still playing**.
No waiting, no spectating, just chaos.

---

## Play online

The client is hosted on GitHub Pages. To play with friends:

1. Deploy the relay server (see below) and note its public URL.
2. Open the GitHub Pages URL in multiple browsers.
3. Enter the server address, pick a room code, and go.

---

## Run locally

### 1. Start the relay server

```bash
cd server
npm install
npm start
# → ws://localhost:8080
```

### 2. Open the client

```bash
# Python 3
cd docs && python3 -m http.server 3000

# Node
cd docs && npx serve .
```

Open `http://localhost:3000` in multiple tabs (or across machines on the same network).

---

## Deploy the relay server

The server is a ~120-line Node.js WebSocket relay with no database or state beyond
in-memory rooms. Any platform that runs Node works.

**Railway**
```bash
# From repo root
railway up --service server
```

**Fly.io**
```bash
cd server
fly launch   # follow prompts, set PORT env var
fly deploy
```

**Self-hosted / VPS**
```bash
cd server && npm install
PORT=8080 node server.js
# expose port 8080, then use ws://<your-ip>:8080 in the client
```

After deploying, players enter `your-domain.com:PORT` (or `wss://` if behind TLS)
in the **Server address** field on the join screen.

---

## GitHub Pages setup

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set source to **Deploy from a branch**, branch `main`, folder `/docs`.
4. The game will be live at `https://<you>.github.io/<repo>/`.

---

## How to play

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
| Ghost fly (when dead/build) | `WASD` or arrow keys |
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

docs/js/game.js    Entire game engine — physics, rendering, net sync.
                   Client-authoritative for the local player.
                   Remote players smoothly interpolate to broadcasted positions.
```

The server never validates game state — it only relays JSON messages between
clients in the same room. The host drives phase transitions (build → play → results).
