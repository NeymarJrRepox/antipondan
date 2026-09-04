# RETRO ARCADE — 7 Game Klasik + Leaderboard

Situs arcade retro (CRT/console vibes) untuk lomba game klasik.
100% statis — siap deploy ke **Vercel** (antipondan.vercel.app) via GitHub.

## Games
| Game | Skor |
|---|---|
| 🐍 Snake | Tertinggi |
| 🧱 Tetris | Tertinggi |
| 🐤 Flappy Bird | Tertinggi |
| 🔢 Sudoku | Waktu tercepat |
| 🔴 Bounce | Tertinggi |
| 🍄 Super Mario Run | Tertinggi |
| 🏓 Pong | Tertinggi |

Tiap game punya **dashboard rank Top 10 sendiri**, pemain wajib memasukkan
username saat game over (username diingat otomatis untuk ronde berikutnya).

## Floating DB
Semua data (skor, username, statistik dashboard) disimpan lewat **Floating DB**
(`js/db.js`) — database mengambang berbasis `localStorage`, tanpa backend:

- `FDB.top(gameId, 10)` — ambil Top 10
- `FDB.submit(gameId, username, score)` — simpan skor (otomatis auto-trim Top 10)
- `FDB.stats()` — statistik dashboard (players, plays, records)
- **Reset data (admin):** klik logo `► RETROARCADE_` di dashboard **5x** — tidak terlihat pemain
- Nama terlarang diblokir otomatis (daftar `BLOCKED_NAMES` di `js/db.js`, mis. nama admin "MIKE")

> Catatan: localStorage per-browser/per-perangkat. Untuk lomba di satu tempat,
> gunakan satu perangkat yang sama (mis. laptop display panitia). Jika nanti
> butuh leaderboard global antar-perangkat, struktur FDB sudah siap disambungkan
> ke Vercel KV / Supabase.

## Struktur
```
├── index.html        ← dashboard (stats, grid game, hall of fame)
├── css/retro.css     ← tema retro CRT
├── js/db.js          ← Floating DB
├── js/shell.js       ← kerangka halaman game (HUD, leaderboard, touch)
└── games/            ← snake, tetris, flappy, sudoku, bounce, mario, pong
```

## Deploy ke Vercel
1. Push folder ini ke repo GitHub.
2. Di [vercel.com](https://vercel.com) → **Add New Project** → import repo.
3. Framework preset: **Other** (tidak perlu build command, root `./`).
4. Deploy → domain `antipondan.vercel.app` aktif otomatis.

## Kontrol
Keyboard: Arrow/WASD, Space. Mobile: tombol touch otomatis muncul.
`R` = restart kapan saja.
