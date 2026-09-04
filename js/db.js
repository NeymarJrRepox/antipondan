/* ============================================================
   FLOATING DB v1.0
   Database "mengambang" berbasis localStorage — tanpa server.
   Data tersimpan langsung di browser pemain, siap di-deploy
   statis ke Vercel / GitHub Pages.
   ============================================================ */
(function (global) {
  'use strict';

  var PREFIX = 'arcade.fdb.';
  var DB_KEY = PREFIX + 'db';
  var API = '/api/scores';
  var GAME_MODES = { sudoku: 'low' };

  function load() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* korup -> reset */ }
    return { version: 2, scores: {}, plays: 0, players: {}, history: [] };
  }

  function save(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* penuh */ }
  }

  var FDB = {

    /** Ambil seluruh database mentah */
    all: function () { return load(); },

    /** Top-N skor untuk satu game.
     *  mode 'high' = skor besar menang (default),
     *  mode 'low'  = skor kecil menang (mis. waktu sudoku). */
    top: function (gameId, n, mode) {
      var db = load();
      var list = (db.scores[gameId] || []).slice();
      var high = mode !== 'low';
      list.sort(function (a, b) {
        if (high) return b.score - a.score;
        return a.score - b.score;
      });
      return list.slice(0, n || 10);
    },

    /** Simpan skor. return posisi rank (1-based) atau -1 jika tidak masuk top10 */
    submit: function (gameId, username, score, mode) {
      var name = String(username || 'PLAYER').toUpperCase().slice(0, 12);
      if (this.isBlocked(name)) return -1;
      var db = load();
      var entry = { game: gameId, name: name, score: score, date: new Date().toISOString() };
      // CATAT SEMUA: riwayat lengkap tidak pernah dipangkas
      db.history.push(entry);
      db.plays = (db.plays || 0) + 1;
      db.players[name] = (db.players[name] || 0) + 1;
      // leaderboard top 10 per game
      if (!db.scores[gameId]) db.scores[gameId] = [];
      db.scores[gameId].push({ name: name, score: score, date: entry.date.slice(0, 10) });
      var high = mode !== 'low';
      db.scores[gameId].sort(function (a, b) {
        return high ? b.score - a.score : a.score - b.score;
      });
      db.scores[gameId] = db.scores[gameId].slice(0, 10);
      save(db);
      // kirim ke cloud -> leaderboard global antar perangkat
      if (typeof fetch === 'function') {
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: gameId, name: name, score: score, mode: GAME_MODES[gameId] || 'high' })
        }).then(function (r) { return r.ok ? r.json() : null; }).then(function (remote) {
          if (remote && remote.version) { cloudOk = true; save(remote); emit(); }
        }).catch(function () { /* offline -> data aman di localStorage */ });
      }
      // posisi pemain ini
      var top = db.scores[gameId];
      for (var i = 0; i < top.length; i++) {
        if (top[i].name === name && top[i].score === score) return i + 1;
      }
      return -1;
    },

    /** Riwayat lengkap semua entri (terbaru dulu). limit opsional */
    history: function (limit) {
      var db = load();
      var h = (db.history || []).slice().reverse();
      return limit ? h.slice(0, limit) : h;
    },

    /** Semua player + jumlah main. return [{name, plays}] urut terbanyak */
    allPlayers: function () {
      var db = load();
      var out = [];
      for (var n in db.players || {}) out.push({ name: n, plays: db.players[n] });
      out.sort(function (a, b) { return b.plays - a.plays; });
      return out;
    },

    /** Statistik dashboard */
    stats: function () {
      var db = load();
      var players = Object.keys(db.players || {}).length;
      return { plays: db.plays || 0, players: players, entries: (db.history || []).length };
    },

    /** Username terakhir dipakai (biar pemain nggak ngetik ulang) */
    lastName: function () {
      try { return localStorage.getItem(PREFIX + 'name') || ''; } catch (e) { return ''; }
    },
    rememberName: function (name) {
      try { localStorage.setItem(PREFIX + 'name', String(name || '').toUpperCase().slice(0, 12)); } catch (e) {}
    },

    /** Reset seluruh data (dipakai tombol admin) */
    wipe: function () {
      try { localStorage.removeItem(DB_KEY); } catch (e) {}
    }
  };

  global.FDB = FDB;

  /* ---------- CLOUD SYNC (leaderboard global) ----------
     Data utama disimpan di server (Vercel KV via /api/scores).
     localStorage hanya cache offline. Kalau cloud gagal/belum
     disetup, otomatis fallback ke localStorage. */
  var cloudOk = false;
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  function trimTop(game, list) {
    var low = GAME_MODES[game] === 'low';
    return list.slice().sort(function (a, b) {
      return low ? a.score - b.score : b.score - a.score;
    }).slice(0, 10);
  }

  function mergeDb(local, remote) {
    local = local || {}; remote = remote || {};
    var out = {
      version: 3,
      scores: {},
      plays: Math.max(local.plays || 0, remote.plays || 0),
      players: Object.assign({}, local.players || {}, remote.players || {}),
      history: []
    };
    for (var p in out.players) out.players[p] = Math.max((local.players || {})[p] || 0, (remote.players || {})[p] || 0);
    var seen = {};
    (local.history || []).concat(remote.history || []).forEach(function (h) {
      var k = h.game + '|' + h.name + '|' + h.score + '|' + h.date;
      if (!seen[k]) { seen[k] = 1; out.history.push(h); }
    });
    out.history.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var games = {};
    Object.keys(local.scores || {}).concat(Object.keys(remote.scores || {})).forEach(function (g) { games[g] = 1; });
    Object.keys(games).forEach(function (g) {
      out.scores[g] = (local.scores || {})[g] || [];
      (remote.scores[g] || []).forEach(function (e) {
        var dup = out.scores[g].some(function (x) { return x.name === e.name && x.score === e.score && x.date === e.date; });
        if (!dup) out.scores[g].push(e);
      });
      out.scores[g] = trimTop(g, out.scores[g]);
    });
    return out;
  }

  FDB.onSync = function (fn) { listeners.push(fn); };
  FDB.isCloud = function () { return cloudOk; };

  FDB.sync = function () {
    if (typeof fetch !== 'function') return;
    fetch(API).then(function (r) { return r.ok ? r.json() : null; }).then(function (remote) {
      if (!remote || !remote.version) return;
      cloudOk = true;
      save(mergeDb(load(), remote));
      emit();
    }).catch(function () { /* offline -> localStorage saja */ });
  };

  // mulai sync cloud saat script dimuat
  FDB.sync();

  /* ---------- UI: leaderboard + modal username ---------- */

  /** Render tabel leaderboard ke elemen <tbody> atau <table> target */
  FDB.renderBoard = function (gameId, targetId, mode, unit) {
    var el = document.getElementById(targetId);
    if (!el) return;
    var rows = FDB.top(gameId, 10, mode);
    var html = '';
    if (!rows.length) {
      html = '<tr><td colspan="3" class="empty">-- NO RECORD YET --<br>BE THE FIRST CHAMPION!</td></tr>';
    } else {
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var val = (mode === 'low')
          ? r.score + (unit || 's')
          : r.score.toLocaleString('en-US');
        html += '<tr class="r' + (i + 1) + '">' +
          '<td class="rank">' + (i < 3 ? ['#1', '#2', '#3'][i] : (i + 1)) + '</td>' +
          '<td>' + r.name + '</td>' +
          '<td class="score">' + val + '</td></tr>';
      }
    }
    var tbody = el.tagName === 'TABLE' ? el.querySelector('tbody') : el;
    if (tbody) tbody.innerHTML = html;
  };

  var BLOCKED_NAMES = ['MIKE'];

  /** Cek nama dilarang (mis. nama admin). return true jika diblokir */
  FDB.isBlocked = function (name) {
    var n = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return BLOCKED_NAMES.indexOf(n) !== -1;
  };

  /** Modal input username + submit otomatis.
   *  opts = { gameId, mode, unit, score, format, onDone(rank) } */
  FDB.askNameAndSubmit = function (opts) {
    var back = document.getElementById('fdb-modal');
    if (!back) {
      back = document.createElement('div');
      back.id = 'fdb-modal';
      back.className = 'modal-back';
      back.innerHTML =
        '<div class="modal">' +
        '  <h2>&gt; GAME OVER &lt;</h2>' +
        '  <div class="final-score" id="fdb-score"></div>' +
        '  <p>MASUKKAN USERNAME UNTUK LEADERBOARD</p>' +
        '  <input id="fdb-name" maxlength="12" placeholder="USERNAME" autocomplete="off">' +
        '  <p id="fdb-err" style="color:#ff3355;font-size:8px;display:none"></p>' +
        '  <button class="btn" id="fdb-ok">SAVE SCORE</button>' +
        '</div>';
      document.body.appendChild(back);
    }
    document.getElementById('fdb-score').textContent = opts.format
      ? opts.format(opts.score)
      : String(opts.score);
    var input = document.getElementById('fdb-name');
    var err = document.getElementById('fdb-err');
    err.style.display = 'none';
    input.value = FDB.lastName();
    if (FDB.isBlocked(input.value)) input.value = '';
    back.classList.add('show');
    setTimeout(function () { input.focus(); input.select(); }, 30);

    function done() {
      var name = input.value.trim() || 'PLAYER';
      if (FDB.isBlocked(name)) {
        err.textContent = '! NAMA DILARANG DIPAKAI !';
        err.style.display = 'block';
        input.value = '';
        input.focus();
        return;
      }
      FDB.rememberName(name);
      var rank = FDB.submit(opts.gameId, name, opts.score, opts.mode);
      back.classList.remove('show');
      if (opts.onDone) opts.onDone(rank, name);
    }
    document.getElementById('fdb-ok').onclick = done;
    input.onkeydown = function (e) {
      if (e.key === 'Enter') done();
      e.stopPropagation();
    };
  };

})(window);
