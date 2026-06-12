'use strict';

const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// rooms: Map<roomId, Set<ws>>
const rooms = new Map();

wss.on('connection', (ws) => {
  ws.roomId  = null;
  ws.playerId = null;
  ws.isHost  = false;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      handleJoin(ws, msg);
    } else {
      relay(ws, msg);
    }
  });

  ws.on('close', () => {
    const { roomId, playerId } = ws;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    room.delete(ws);

    if (room.size === 0) {
      rooms.delete(roomId);
      return;
    }

    // Elect a new host if needed
    if (ws.isHost) {
      const newHost = room.values().next().value;
      newHost.isHost = true;
      safeSend(newHost, { type: 'promoted_to_host' });
    }

    broadcastRoom(roomId, { type: 'player_left', playerId }, null);
  });

  ws.on('error', () => { /* swallow */ });
});

function handleJoin(ws, msg) {
  const { roomId, playerId, name, team, colorIdx } = msg;
  ws.roomId  = roomId;
  ws.playerId = playerId;

  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  const room = rooms.get(roomId);

  const isHost = room.size === 0;
  ws.isHost = isHost;
  room.add(ws);

  safeSend(ws, {
    type: 'joined',
    playerId,
    isHost,
    playerCount: room.size,
  });

  // Tell every existing peer about the new arrival
  broadcastRoom(roomId, {
    type: 'player_joined',
    playerId,
    name,
    team,
    colorIdx,
  }, ws);

  // Ask the current host to send a full state snapshot to the new player
  if (!isHost) {
    const host = [...room].find(c => c.isHost && c !== ws);
    if (host) {
      safeSend(host, { type: 'state_request', targetPlayerId: playerId });
    }
  }
}

function relay(ws, msg) {
  if (!ws.roomId) return;

  const out = { ...msg, from: ws.playerId };

  if (msg.to) {
    // Point-to-point delivery
    const room = rooms.get(ws.roomId);
    if (!room) return;
    for (const client of room) {
      if (client.playerId === msg.to) { safeSend(client, out); break; }
    }
  } else {
    // Broadcast to everyone else in the room
    broadcastRoom(ws.roomId, out, ws);
  }
}

function broadcastRoom(roomId, msg, exclude) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(msg);
  for (const client of room) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function safeSend(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

console.log(`Party Platformer relay server listening on ws://localhost:${PORT}`);
