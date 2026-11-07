# Jep! — Project Docs

Working notes for our fork of [Jep!](https://github.com/cmnord/jep) (origin: `saymolet/jep`).
We keep everything here so we can pick up across long sessions without losing context.

## Goal

Add features for playing with friends, evolving Jep! into something that surpasses
SIGame / Своя Игра for our group. Fork-and-extend, not rewrite.

## How we work

- **Git:** one feature branch + PR per feature (PRs target `saymolet/jep`). Ask before any commit/push.
- **Stack:** React Router v7, Tailwind v4, Radix UI, Supabase (Postgres + Realtime), Zod, Vitest + Playwright.
- **Validation:** `pnpm validate` (lint, format, typecheck, unit, e2e). See `AGENTS.md`.

## Index

| Doc                                  | What's in it                                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| `SESSION-STATE.md` _(local only)_    | **Start here** — current state, git status, how to resume          |
| `dev-environment.md` _(local only)_  | How the dev server/hosting is set up + runbook to bring it back up |
| [architecture.md](./architecture.md) | How the app is structured: data model, game engine, rooms/realtime |
| [features/](./features/)             | One doc per feature: plan, decisions, status                       |

_Local only_ docs describe the host machine and are kept out of this public repo
(`.git/info/exclude`).

## Feature backlog

Difficulty estimates from the original planning discussion.

### Core requested features

- [x] Secret question ("Кот в мешке" / cat in the bag) — `secret` on a question; the chooser
      must hand it to another player, who answers it alone (right → +value and board control,
      wrong → −value) — see [features/05-secret-question.md](./features/05-secret-question.md)
      — ⭐ easy
- [x] Upload avatar — emoji from a preset grid or your own photo (cropped and resized to 192×192
      in the browser, sent inline as a data URL — no file hosting), remembered per device and as
      an account default; shown as a large square on the player tiles — see
      [features/07-avatars.md](./features/07-avatars.md) — ⭐ easy
- [x] Audio/video questions — pictures, audio, video and YouTube clips with the question
      (`media`) and with the answer (`answerMedia`); additive, no full `blocks[]` redesign —
      see [features/03-media-questions.md](./features/03-media-questions.md) — ⭐ easy
- [x] Multiple choice questions — optional `choices` (2–6 options) on a question; everyone
      sees them while it's read, the buzz winner taps one and it's checked automatically on the
      server — see [features/04-multiple-choice.md](./features/04-multiple-choice.md) — ⭐ easy
- [x] Pause game (`isPaused` state) — ⭐ very easy — see [features/01-pause-game.md](./features/01-pause-game.md)
- [x] More than 5 categories (dynamic grid) — 1 to 12 categories, categories with different
      numbers of questions; wide boards use big screens and still fit a phone — see
      [features/06-dynamic-board.md](./features/06-dynamic-board.md) — ⭐⭐ medium

### Found while playtesting

- [x] Join race: tapping "Join game" before the realtime channel subscribes can lose the
      player's own join (it is saved, but the client never sees it). Fixed by merging the
      revalidated loader snapshot + correct catch-up — see
      [features/02-join-sync-and-rooms-list.md](./features/02-join-sync-and-rooms-list.md) — ⭐ easy
- [x] "Rooms in progress" list on a game's page (and on "Play with friends" when rooms
      are running), so friends can join without a shared link — see
      [features/02-join-sync-and-rooms-list.md](./features/02-join-sync-and-rooms-list.md) — ⭐ easy

- [x] Hydration error #418 on game pages: React discarded the server HTML and re-rendered on
      the client (slower start on phones, e2e timing flakes). Three mismatches fixed and an
      e2e regression test added — see [architecture.md](./architecture.md#hydration-server-render--client)
      — ⭐ easy

### Nice-to-haves (while touching the code)

- [x] Import/export JSON + import SIQ packs — **Download JSON** on the game page; the upload box
      takes `.jep.json` and SIGame `.siq` packs (v4 and v5, up to 100 MB; media uploaded to the
      public Storage bucket `game-media`, zip bomb / XXE guarded, summary of skipped items;
      upload screen with progress bar + "Importing the pack…" stage) — see
      [features/08-import-export.md](./features/08-import-export.md) — ⭐⭐⭐ large

- [x] Ukrainian translation — whole UI in English and Ukrainian (EN / УКР switcher, cookie +
      account setting + Accept-Language, typed dictionaries, plurals); game content is never
      translated — see [features/09-ukrainian.md](./features/09-ukrainian.md) — ⭐⭐ medium

- [x] Random board generator — mix random categories (≥ 3 questions, unique names) of
      **public** games into a new unlisted game, 3–8 categories × 1–2 rounds, optional final;
      straight into a new room or solo — see
      [features/10-random-board.md](./features/10-random-board.md) — ⭐⭐ medium

- [x] Spectator mode + TV (presenter) mode — **Just watch** in the join dialog (read-only room
      view, Watching badge, join later; spectators counted with Realtime presence) and
      `/room/:roomName/present` for a TV: big board/question/media/answer, players and scores,
      what is happening, QR code to join, fullscreen + screen wake lock — see
      [features/11-spectator-presenter.md](./features/11-spectator-presenter.md) — ⭐⭐ medium

- [x] Mobile-first buzzer — big BUZZ button pinned to the bottom on phones (CSS-only
      detection), state by colour + text (wait / BUZZ! / too early / locked out / someone was
      faster / your turn), `pointerdown` with tap guards, haptics, touch taps on the question
      no longer buzz — see [features/12-mobile-buzzer.md](./features/12-mobile-buzzer.md) — ⭐ small

- [x] Team mode — optional teams (Red / Blue / Green / Yellow, renamable by members) picked in
      the join dialog or from your tile; scoreboard grouped by team with totals, team totals
      on the TV, winning team on the summary; scoring stays per player — see
      [features/13-teams.md](./features/13-teams.md) — ⭐⭐ medium

- [x] Answer timer (per-question timer, F12a) — optional room setting Off / 10–60 s +
      "mark wrong when time runs out"; countdown for everyone from the event that gave the
      player their turn (server clock estimate), "Time's up!" + sound; only the answering
      player's own device marks the answer wrong; finals excluded; in rooms **only the site
      admin** may change it (read-only for players, enforced by the route and RLS) — see
      [features/14-answer-timer.md](./features/14-answer-timer.md) — ⭐⭐ medium

- [x] Soundboard (F12b) — players tap reaction sounds (applause, drumroll, ta-da, wrong,
      air horn, ha-ha, ooh, crickets, ding; real CC0 recordings, Web Audio synth as fallback) that play
      on every device in the room with a "🎺 Ann" toast; ephemeral Realtime broadcast on the
      room channel (not stored), 1 sound / 2 s, spectators and the TV only listen, per-device
      "Mute soundboard" — see [features/15-soundboard.md](./features/15-soundboard.md) — ⭐⭐ medium
- [x] Themes (F12c) — Classic (unchanged), Dark and System (follows the device) picked with
      an icon menu in the header or in Settings; `theme` cookie → account setting → Classic,
      rendered server-side as `<html data-theme>` (no flash, System is pure CSS); theme tokens
      in `app/styles.css` — see [features/16-themes.md](./features/16-themes.md) — ⭐⭐ medium
- [x] Live standings + resume my games (F12d) — 🏆 **Standings** drawer in rooms (ranked
      players and teams, ties share a place, change on the previous question `+$400` /
      `−$200`, who picks next; changes flash on the TV) and **Your games in progress** on the
      home page (unfinished rooms you play in, last 7 days, one tap back in; guest rooms
      still found after logging in) — see
      [features/17-standings-resume.md](./features/17-standings-resume.md) — ⭐⭐ medium

- [x] Admin panel (F12e) — `/admin` (🛡 button in the header since the follow-up, `noindex`), gated by its own
      `ADMIN_PASSWORD` (server env; unset = 404), constant-time check, per-IP lockout, 12 h
      admin session + CSRF token in the session cookie; dashboard (counts, Storage and DB
      usage of the free plan), games (search, visibility, delete with the media no other
      game uses), rooms, reports, unused Storage files cleanup — see
      [features/18-admin.md](./features/18-admin.md) — ⭐⭐ medium

- [x] Seat lock + inactive room cleanup — seats keyed by the session userId are locked once
      the first question is opened (only the site admin may kick, between questions; a
      returning player gets their seat, score, color, avatar and team back; kick / leave /
      transfer only via the server, enforced by RLS); rooms with no activity for 5 h are
      deleted (hourly job `scripts/cleanup-inactive-rooms.mjs` + admin Rooms button) — see
      [features/19-seat-lock-cleanup.md](./features/19-seat-lock-cleanup.md) — ⭐⭐ medium

- [x] Admin controls & interventions (owner's request) — the site admin (playing or just
      watching) opens 🛡 in a room: **skip** the open question (or a question on the board),
      do the step the game waits for **for a stuck player** ("вибрати замість когось": start
      the round, choose a question, wager, hand over the cat in the bag, buzz in / pass, Final
      answer, mark right / wrong, pick an option, back to the board) and **change scores** any
      time (+/− / exact; toast for everyone, counted in the standings delta and team totals).
      Security: every room event is now inserted by the server (RLS rejects all browser
      inserts) — see [features/20-admin-interventions.md](./features/20-admin-interventions.md)
      — ⭐⭐ medium

- [x] Room timers (owner's request) — the site admin sets a room's **reading time** (Auto or
      0–60 s), **buzz window** (3–20 s, default 5), **answer time**, **Final answer time**
      (No limit / 15–120 s, default 30, enforced: the player's device sends what was typed) and
      **wager time** (Off / 15–60 s; the player's device wagers the minimum) — in a "new room"
      step when the admin creates a room (last-used values remembered), in the round preview
      and the ⏱ sheet; players see them read-only. SIGame packs carry no such timers; their
      per-question display times (v4 `atom time`, v5 `item duration`) become the question's
      `readTimeSec`, used by "Auto" — see [features/21-room-timers.md](./features/21-room-timers.md)
      — ⭐⭐ medium

- [x] Host role (owner's request, SIGame's showman / ведучий) — a visitor who doesn't play
      takes the **🎤 Host** seat from the join dialog (the admin can give, take or free it); the
      host sees the answer all the time, players answer out loud and the host taps **Right /
      Wrong** (Final: per player; multiple choice stays automatic), starts rounds and moves on,
      and gets the admin's room controls and the room timers. Players never get the answer of an
      open question — the room/TV loaders withhold unresolved answers and the server reveals
      each one (`reveal_answer`) when the question is resolved. Without a host the room plays
      the self-marking game as before — see [features/22-host-role.md](./features/22-host-role.md)
      — ⭐⭐⭐ large

Question search · Discord login · keyboard shortcuts ·
OBS/browser-source mode ·
auto-reconnect · host controls from phone ·
"Своя Игра" theme (Classic and Dark are done, see above).

## Status log

- **2026-07-10** — Dev environment brought up (Docker, Supabase, dev server).
- **2026-07-11** — Feature 01 (Pause) implemented & tested.
- **2026-10-25** — Fork synced to upstream (28 commits: pnpm, Varlock env, undo); Pause re-applied
  on `feat/pause-and-public-hosting`. Self-hosted: production build behind nginx/TLS with
  hosted Supabase; first multiplayer playtest (phone + desktop) works.
- **2026-10-25** — Feature 02 on `feat/join-sync-and-rooms-list`: join race fixed (client
  converges via loader snapshots + correct catch-up; reconnect escalation fixes) and
  "Rooms in progress" list on the game page / Play chooser. No migration.
- **2026-10-25** — Feature 03 on `feat/media-questions`: questions with pictures, audio, video
  and YouTube (`media` / `answerMedia`), any https host, sample game `/mock?game=media`.
  Migration `20261025124624_clues_media.sql` (additive jsonb columns on `clues`).
- **2026-10-25** — Feature 04 on `feat/multiple-choice`: multiple choice questions (`choices`),
  auto-checked picks decided server-side and re-derived by the engine, sample game
  `/mock?game=choice`. Migration `20261025131747_clues_choices.sql` (additive jsonb column on
  `clues`).
- **2026-10-25** — Feature 05 on `feat/secret-question`: secret questions ("cat in the bag",
  `secret` / `secretTopic` / `secretValue`), handed over with the new `pass_clue` action and
  answered by the receiver alone; sample game `/mock?game=secret`. Migration
  `20261025135101_clues_secret.sql` (additive nullable columns on `clues`).
- **2026-10-25** — Feature 06 on `feat/dynamic-board`: boards with 1–12 categories and uneven
  categories (engine grid sized by the longest category — fixes the crash), wide-board layout for
  phones and TVs, stable category/clue order from the DB, sample games `/mock?game=8x5` and
  `/mock?game=ragged`. No migration.
- **2026-10-25** — Feature 07 on `feat/avatars`: player avatars (emoji or photo resized in the
  browser to a ≤24 KB data URL in the Join/ChangeName payload), validated in the route and
  ignored on replay when invalid; remembered in localStorage and `gameDefaults.playerAvatar`.
  No migration.
- **2026-10-25** — Fix on `fix/hydration`: React hydration mismatches removed (solo connection
  indicator read `navigator.onLine` during SSR, `/howto` timestamp, profile dates in the
  server's time zone); `<html data-hydrated>` marker + e2e `goto()`/`reload()` helpers that
  wait for it; `e2e/hydration*.spec.ts` regression tests. No migration.
- **2026-10-25** — Feature 08 on `feat/siq-import`: SIGame pack import (`.siq` v4/v5 →
  rounds/categories/questions with media, secret, wager, final, multiple choice) with media in the
  new public Storage bucket `game-media`, and a **Download JSON** link on the game page. Local
  Supabase now runs Storage. Migration `20261025172846_game_media_bucket.sql`; new deps `fflate`,
  `fast-xml-parser`.
- **2026-10-25** — Feature 07 follow-up on `feat/big-avatars`: avatars are large rounded squares
  (72 px on phones, 96 px on desktop) on redesigned player tiles (2 per row on phones, 3 on wide
  screens; your own tile spans two), in the join dialog and on the summary; small squares in the
  rooms list and replay chips. Photos now 192×192, cap raised to 48 KB (old 96×96 avatars still
  valid). No migration.
- **2026-10-25** — Feature 09 on `feat/i18n-uk`: English + Ukrainian UI (`app/i18n`, typed
  dictionaries, `Intl.PluralRules`), language from the `lang` cookie → account setting
  (`accounts.settings.language`) → Accept-Language, EN / УКР switcher in the header and
  settings. No migration, no new dependencies.
- **2026-10-25** — Feature 10 on `feat/random-board`: random board generator (`/random-board`,
  button on the home page) — categories of PUBLIC games only, sampled in SQL; new unlisted game
  opens in a new room or solo. Migration `20261025194229_random_board_candidates.sql` (two new
  read-only SQL functions). No new dependencies.
- **2026-10-25** — Feature 11 on `feat/spectate-present`: spectators ("Just watch", read-only
  room, Watching badge, watcher count via Realtime presence) and the TV / presenter page
  `/room/:roomName/present` (QR code to join, fullscreen, wake lock, every game state). No
  migration; new dependency `uqr`.
- **2026-10-25** — Feature 12 on `feat/mobile-buzzer`: mobile-first buzzer (sticky BUZZ button
  on touch/narrow screens via a `buzzbar` CSS variant, `pointerdown` buzz with arm/double-fire
  guards, Vibration API haptics following the mute setting, question taps by finger no longer
  buzz while the button is shown). Buzz timing unchanged. No migration.
- **2026-10-26** — Feature 13 on `feat/teams`: team mode (`set_team` / `rename_team` room
  events, team in the Join payload, `Player.team`, `State.teamNames`); grouped scoreboard,
  team picker in the join dialog and your tile, team totals on the TV, team standings and
  winning team on the summary and in the rooms list. No migration, no new dependencies.
- **2026-10-26** — Feature 14 on `feat/answer-timer`: answer timer (`set_settings` room event,
  `/room/:roomId/settings`, `answerTimeSec` / `autoWrongOnTimeout` / `answerStartedAt` /
  `answerTimedOut` in state, `timedOut` on Check for multiple choice); countdown on players,
  spectators and the TV, auto-mark by the answering player's device. No migration, no new
  dependencies.
- **2026-10-26** — Feature 15 on `feat/soundboard`: soundboard (nine Web Audio–synthesized
  reaction sounds, loudness-balanced) sent as ephemeral Realtime broadcasts (`soundboard`)
  on the room channel; floating 🎺 button for players, toasts for players, spectators and
  the TV, send/receive cooldowns and overlap cap, per-device "Mute soundboard", ducking
  during questions with audio/video. No migration, no new dependencies.
- **2026-10-26** — Board fill now starts before paint (no flash of the full board, no taps on cells about to hide); the board sets `aria-busy` while hidden or filling, and e2e helpers wait for it.
- **2026-10-26** — Feature 16 on `feat/themes`: themes Classic / Dark / System (`theme` cookie →
  `accounts.settings.theme` → Classic; `<html data-theme>` from the root loader, System via
  `prefers-color-scheme` in CSS), theme tokens (`page`, `paper`, `ink-*`, `accent`, `header`,
  game colors) in `app/styles.css`, switcher in the header and Settings. No migration, no new
  dependencies.
- **2026-10-26** — Feature 17 on `feat/standings-resume`: live standings (`engine/standings.ts`:
  ranking + score change on the previous question, `scoreChanges` in the engine context;
  🏆 drawer in rooms, change chips on the TV) and "Your games in progress" on the home page
  (account + guest cookie ids, replayed rooms, max 6 from the last 7 days). Migration
  `20261026021235_user_rooms_in_progress.sql` (partial index on `join` events' userId + SQL
  function `user_rooms_in_progress`). No new dependencies.
- **2026-10-26** — Feature 18 on `feat/admin`: admin panel (`/admin`, `ADMIN_PASSWORD` env var,
  `requireAdmin` on every admin loader/action, login lockout, dashboard, games / rooms /
  reports moderation, game delete removes its unshared media, orphaned media cleanup).
  Migration `20261026033929_admin_panel.sql` (three service-role-only SQL functions:
  `admin_stats`, `admin_media_objects`, `admin_recent_rooms`). No new dependencies.
- **2026-10-26** — Feature 14 follow-up on `feat/admin-timer`: only the site admin (admin
  session from `/admin`) may change a room's answer timer — playing or not; players see the
  value read-only ("Only the admin can change this"), solo play unchanged. The settings route
  answers 403 to everyone else and inserts `set_settings` with the service role; the engine
  accepts the server's `admin: true` events (old player events stay valid). Migration
  `20261026123109_room_events_settings_admin_only.sql` (room_events insert policy rejects
  `set_settings` from anon/authenticated). No new dependencies.
- **2026-10-26** — Feature 15 follow-up on `feat/real-sounds`: the soundboard plays real
  recordings — nine CC0 MP3s (BigSoundBank / Freesound, mono 112 kbps, ≤ 3 s, ≈ −16 LUFS,
  ~273 KB in all) in `public/sounds/soundboard/` with `CREDITS.md`. Fetched and decoded once
  when the audio context is created (first tap), played through the same limiter / volume /
  mute / ducking / overlap path; a sample that fails to load falls back to the Web Audio
  synth. No migration, no new dependencies.
- **2026-10-26** — Feature 19 on `feat/seat-lock-cleanup`: seat lock (`isGameUnderway`;
  players kick only before the first question, the site admin any time between questions with
  `admin: true` events; a Join never resets a seat and restores a left player's seat; kick /
  leave / transfer_player inserted by the server only) and inactive room cleanup (5 h,
  `cleanup_inactive_rooms` SQL function, hourly `varlock run -- node
scripts/cleanup-inactive-rooms.mjs`, admin Rooms button; 7-day dashboard tile removed).
  Migrations `20261026172752_room_events_seats_server_only.sql` (insert policy) and
  `20261026173001_cleanup_inactive_rooms.sql` (`rooms.created_at` + function). No new
  dependencies.
- **2026-10-26** — Feature 20 on `feat/admin-interventions`: admin interventions in rooms
  (🛡 sheet: skip a question — `skip_clue`; act for a stuck player — the player's own action
  tagged `admin: true` through its own route; change a score — `adjust_score`; toasts for
  everyone, standings delta and the summary chart account for score changes) and every room
  event inserted by the server only (all routes use `createRoomEventAsServer`; the wager route
  now checks the wager range). Migration `20261026180715_room_events_server_only.sql` (the
  room_events insert policy rejects every insert from the browser key). No new dependencies.
- **2026-10-26** — Feature 21 on `feat/room-timers`: room timers set by the admin (reading
  time, buzz window, Final answer time, wager time, plus the answer time) — optional
  `set_settings` fields replayed deterministically (old events keep today's values), every
  device reads the room's buzz window and reading time, wager and Final answer countdowns with
  auto-submit by the player's own device, the admin's "new room" step, and `readTimeSec` on
  questions (game JSON + SIQ display-time hints). Migration
  `20261026192800_clues_read_time_sec.sql` (additive nullable `clues.read_time_sec`, 0–60). No
  new dependencies.
- **2026-10-27** — Follow-up on `feat/header-admin-hide-login` (owner's request): 🛡 admin
  button in the site header (links to `/admin`; filled "Admin panel" with a valid admin
  session; hidden when `ADMIN_PASSWORD` is unset; root loader exposes two booleans only) and
  account login hidden from the UI (header Log in button and the guest upload dialog's Log in
  button/hint removed; `/login` & co. still work by URL; an existing account session keeps
  its profile menu) — see [features/18-admin.md](./features/18-admin.md). No migration, no new
  dependencies.
- **2026-11-07** — Fixed a crash ("Failed to execute 'removeChild' on 'Node'") caused by browser machine translation rewriting the page: every document now sets `translate="no"` and `<meta name="google" content="notranslate">` (the site has its own Ukrainian UI).
- **2026-11-07** — Follow-up on `feat/upload-progress` (owner's request "add load screen when uploading packs"): upload screen with a real progress bar (XHR upload events, cancel), then "Importing the pack…" while the server processes it; `POST /game` answers XHR uploads with JSON + the same flash cookie, the box navigates like the old redirect; network/proxy errors get a retry button — see [features/08-import-export.md](./features/08-import-export.md#upload-screen-follow-up-featupload-progress). No migration, no new dependencies.
- **2026-11-07** — `feat/host-role` (owner's request "rework the answer system… a host role
  which will see the answer constantly… mimic the host role in SIGame"): host seat
  (`claim_host` / `release_host` / `assign_host`), host-mode judging and flow in the engine,
  `POST /room/:id/host`, `host=true` on the act-for-player / admin / settings routes, answers of
  unresolved questions withheld from players and the TV with server-inserted `reveal_answer`,
  host and player screens (EN/UK, Classic/Dark, phones) — see
  [features/22-host-role.md](./features/22-host-role.md). No migration, no new dependencies.
