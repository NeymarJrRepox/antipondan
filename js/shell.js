/* ============================================================
   GAME SHELL — kerangka halaman game retro + leaderboard
   Dipakai semua game. Game logic tinggal panggil:
     var shell = GameShell.start({ id, title, icon, mode, unit, width, height, keys, controls });
   shell.canvas / shell.ctx / shell.setHud(obj) / shell.gameOver(score, fmt)
   ============================================================ */
(function (global) {
  'use strict';

  function start(opts) {
    var mode = opts.mode || 'high';
    var unit = opts.unit || '';

    document.title = opts.title + ' — RETRO ARCADE';

    var wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.innerHTML =
      '<header class="topbar" style="border:none;background:transparent;padding:0;margin-bottom:12px">' +
      '  <div class="wrap" style="padding:0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;max-width:100%">' +
      '    <div class="logo" style="font-size:13px">' + opts.icon + ' ' + opts.title + '</div>' +
      '    <nav class="topnav"><a href="../index.html">◄ LOBBY</a></nav>' +
      '  </div>' +
      '</header>' +
      '<div class="game-layout">' +
      '  <div>' +
      '    <div class="panel" style="margin-bottom:12px">' +
      '      <div class="hud" id="gs-hud"></div>' +
      '      <canvas id="gs-canvas" class="screen" width="' + (opts.width || 480) + '" height="' + (opts.height || 480) + '"></canvas>' +
      '      <div class="touchpad" id="gs-touch"></div>' +
      '      <div style="text-align:center;margin-top:12px">' +
      '        <button class="btn" id="gs-restart">RESTART [R]</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div>' +
      '    <div class="panel">' +
      '      <div class="panel-title">🏆 TOP 10 — ' + opts.title.toUpperCase() + '</div>' +
      '      <table class="lb" id="gs-lb"><thead><tr><th>#</th><th>PLAYER</th><th style="text-align:right">SCORE</th></tr></thead><tbody></tbody></table>' +
      '    </div>' +
      '    <div class="panel">' +
      '      <div class="panel-title">🎮 CONTROLS</div>' +
      '      <div style="font-size:9px;line-height:2.2;color:var(--dim)" id="gs-controls"></div>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(wrap);

    var canvas = document.getElementById('gs-canvas');
    var ctx = canvas.getContext('2d');

    // controls text
    var ctext = '';
    (opts.controls || []).forEach(function (c) { ctext += '&gt; ' + c + '<br>'; });
    ctext += '&gt; R = RESTART';
    document.getElementById('gs-controls').innerHTML = ctext;

    // touchpad
    var touchHost = document.getElementById('gs-touch');
    (opts.keys || ['left', 'right', 'up', 'act']).forEach(function (k) {
      var b = document.createElement('button');
      b.textContent = { left: '◀', right: '▶', up: '▲', down: '▼', act: '●' }[k] || k.toUpperCase();
      b.dataset.dir = k;
      touchHost.appendChild(b);
    });

    var touchHandlers = {};
    function fire(dir, down) {
      if (touchHandlers[dir]) touchHandlers[dir](down);
    }
    touchHost.addEventListener('touchstart', function (e) {
      var d = e.target.dataset && e.target.dataset.dir;
      if (d) { fire(d, true); e.preventDefault(); }
    }, { passive: false });
    touchHost.addEventListener('touchend', function (e) {
      var d = e.target.dataset && e.target.dataset.dir;
      if (d) { fire(d, false); e.preventDefault(); }
    }, { passive: false });
    touchHost.addEventListener('mousedown', function (e) {
      var d = e.target.dataset && e.target.dataset.dir;
      if (d) fire(d, true);
    });
    touchHost.addEventListener('mouseup', function (e) {
      var d = e.target.dataset && e.target.dataset.dir;
      if (d) fire(d, false);
    });

    // keyboard
    var keyMap = {
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      Space: 'act', Enter: 'act'
    };
    var keyHandlers = {};
    document.addEventListener('keydown', function (e) {
      if (e.code === 'KeyR') { global.location.reload(); return; }
      var d = keyMap[e.code];
      if (d) {
        if (keyHandlers[d]) keyHandlers[d](true);
        if (opts.keys && opts.keys.indexOf(d) === -1) return;
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', function (e) {
      var d = keyMap[e.code];
      if (d && keyHandlers[d]) { keyHandlers[d](false); e.preventDefault(); }
    });

    var hudHost = document.getElementById('gs-hud');
    var hud = {};

    var shell = {
      canvas: canvas,
      ctx: ctx,
      on: function (dir, fn) { keyHandlers[dir] = fn; touchHandlers[dir] = fn; },
      setHud: function (obj) {
        hud = obj;
        var html = '';
        for (var k in obj) html += '<div>' + k + ': <b id="hud-' + k + '">' + obj[k] + '</b></div>';
        hudHost.innerHTML = html;
      },
      updateHud: function (k, v) {
        hud[k] = v;
        var el = document.getElementById('hud-' + k);
        if (el) el.textContent = v;
      },
      gameOver: function (score, fmt) {
        global.FDB.askNameAndSubmit({
          gameId: opts.id,
          mode: mode,
          unit: unit,
          score: score,
          format: fmt,
          onDone: function (rank) {
            shell.refreshBoard();
            if (rank > 0) {
              var t = document.getElementById('gs-restart');
              var old = t.textContent;
              t.textContent = 'RANK #' + rank + '! RESTART [R]';
              t.style.color = '#ffb000';
              setTimeout(function () { t.textContent = old; t.style.color = ''; }, 4000);
            }
          }
        });
      },
      refreshBoard: function () {
        global.FDB.renderBoard(opts.id, 'gs-lb', mode, unit);
      }
    };

    global.FDB.renderBoard(opts.id, 'gs-lb', mode, unit);
    return shell;
  }

  global.GameShell = { start: start };
})(window);
