// ============================================================
// API LEADERBOARD GLOBAL — Vercel Serverless Function
// Endpoint: /api/scores  (GET = ambil semua, POST = simpan skor)
// Butuh: Vercel KV (Upstash Redis) terhubung ke project.
// ============================================================
const { kv } = require('@vercel/kv');

const KEY = 'arcade:db';
const BLOCKED = ['MIKE'];
const GAMES = ['snake', 'tetris', 'flappy', 'sudoku', 'bounce', 'mario', 'pong'];
const EMPTY = { version: 3, scores: {}, plays: 0, players: {}, history: [] };

function normalize(db) {
  db = db && typeof db === 'object' ? db : {};
  return {
    version: 3,
    scores: db.scores || {},
    plays: db.plays || 0,
    players: db.players || {},
    history: Array.isArray(db.history) ? db.history.slice(-1000) : []
  };
}

function topFor(db, game, mode) {
  const list = (db.scores[game] || []).slice();
  list.sort((a, b) => (mode === 'low' ? a.score - b.score : b.score - a.score));
  db.scores[game] = list.slice(0, 10);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const db = normalize(await kv.get(KEY));
      return res.status(200).json(db);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const game = String(body.game || '');
      const name = String(body.name || 'PLAYER').toUpperCase().replace(/[^A-Z0-9_ ]/g, '').slice(0, 12) || 'PLAYER';
      const score = Number(body.score);
      const mode = body.mode === 'low' ? 'low' : 'high';

      if (GAMES.indexOf(game) === -1) return res.status(400).json({ error: 'game tidak valid' });
      if (!isFinite(score)) return res.status(400).json({ error: 'skor tidak valid' });
      if (BLOCKED.indexOf(name) !== -1) return res.status(403).json({ error: 'nama dilarang' });

      const db = normalize(await kv.get(KEY));
      const date = new Date().toISOString();

      db.history.push({ game, name, score, date });
      if (db.history.length > 1000) db.history = db.history.slice(-1000);
      db.plays += 1;
      db.players[name] = (db.players[name] || 0) + 1;
      if (!db.scores[game]) db.scores[game] = [];
      db.scores[game].push({ name, score, date: date.slice(0, 10) });
      topFor(db, game, mode);

      await kv.set(KEY, db);
      return res.status(200).json(db);
    }

    return res.status(405).json({ error: 'method tidak didukung' });
  } catch (e) {
    // KV belum terpasang / error -> client otomatis fallback ke localStorage
    return res.status(500).json({ error: 'cloud belum siap', detail: String(e && e.message) });
  }
};
