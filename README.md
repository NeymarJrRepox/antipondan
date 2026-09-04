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

## Floating DB + Cloud Sync (Leaderboard Global)
Leaderboard kini **terpusat di server** — semua perangkat (PC, HP, laptop peserta)
melihat & mengisi papan rank yang sama lewat endpoint `/api/scores`
(Vercel Serverless Function + Vercel KV). localStorage hanya cache offline:
kalau cloud gagal/belum disetup, situs otomatis fallback ke mode per-perangkat.

- `FDB.top(gameId, 10)` — ambil Top 10 (dari server/cache)
- `FDB.submit(gameId, username, score)` — simpan skor ke server + catat riwayat
- `FDB.history(n)` / `FDB.allPlayers()` — riwayat lengkap & semua player
- `FDB.isCloud()` — true kalau koneksi cloud aktif
- **Reset data (admin):** klik logo `► RETROARCADE_` di dashboard **5x**
  (menghapus cache lokal; hapus data server lewat Vercel KV dashboard / key `arcade:db`)
- Nama terlarang diblokir di client **dan** server (`BLOCKED_NAMES`, mis. "MIKE")

## WAJIB: Setup Vercel KV (sekali saja)
Tanpa langkah ini leaderboard tetap jalan tapi hanya per-perangkat.

1. Push semua file (termasuk folder `api/` dan `package.json`) ke GitHub → Vercel deploy otomatis.
2. Buka project di Vercel → tab **Storage** → **Create Database** → pilih **Upstash Redis** (plan Hobby gratis) → Create.
3. Klik **Connect Project** → pilih project ini → Connect. (Semua env var `KV_*` terisi otomatis.)
4. **Redeploy** project (Deployments → ⋯ → Redeploy) supaya function membaca env var.
5. Selesai — buka situs, main, isi nama. Skor langsung tersimpan global di `arcade:db`.

Cek cepat: buka `https://antipondan.vercel.app/api/scores` — kalau muncul JSON
`{"version":3,...}` berarti cloud aktif.

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
