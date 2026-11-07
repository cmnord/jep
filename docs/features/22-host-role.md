# Feature 22 — Host role (SIGame "showman")

**Branch:** `feat/host-role`
**Status:** ✅ implemented & tested
**Migration:** none (new room event types only; `room_events` inserts are already
server-only since feature 20, and the event `type` column is free text)
**New dependencies:** none

## Goal

Owner (verbatim): "We need to rework the answer system. Now it needs to have a host role which
will see the answer constantly. So people won't see the right answer when answering incorrect.
It needs to mimic the host role in Vladimir Khil's SIGame game."

SIGame's showman (ведучий) doesn't play, sees the right answer all the time, judges the
players' spoken answers and controls the flow. The owner decided:

- **The host seat is claimed**: in the lobby anyone who is not playing can take the free
  "Host" seat; the site admin can always take it over or give it to someone.
- **Players answer out loud** (voice call / same room); the host taps Right / Wrong.
- **Both modes stay**: host mode while someone holds the host seat, otherwise the current
  self-marking game, unchanged.
- **Multiple choice stays automatic** (the server judges the pick); the host just sees it.

## How to use it

1. Open the room link on the device the host will use. The join dialog offers
   **🎤 Host this game** next to **Just watch** / **Join game** ("The host doesn't play: they
   see the answers, judge what players say out loud and run the game."). Tap it. Players who
   open the link see "🎤 Vic is hosting this game." in their join dialog.
2. Everyone sees the badge **🎤 Host: Vic** next to "Ann has control of the board." (and on the
   TV page). The host's badge says **You're the host** with **Stop hosting** (between
   questions).
3. **The host starts every round** (players see "The host starts the round."). The
   board-control player still picks the questions; the host may tap one for them.
4. While a question is open the host's screen shows the question, a cyan **Answer** box (with
   the answer's pictures / sound / video) the whole time, the buzzes and what happens:
   - a player buzzes in → "Ann is answering" + **✗ Wrong** / **✓ Right**. Right: +value, board
     control, the answer is shown to everyone. Wrong: −value, Ann is locked out, the buzzers
     reopen for the others — **players still don't see the answer**. Nobody left → the answer is
     shown to everyone.
   - cat in the bag / Double Down: the player who answers says it out loud, the host judges.
   - multiple choice: the buzz winner taps an option as before (checked by the server); the
     host sees the right option highlighted and the pick ("The pick is checked
     automatically.").
   - the Final: players type their answers as before; the host sees them arrive live, then
     **Right / Wrong per player**. Players see "The host is judging the answers." and the
     verdicts once all are judged.
   - after the answer: the host's **Back to board** (it moves on by itself after 3 s, like the
     board-control player's did); players see "The host moves on to the next question."
5. Players in host mode have no "Reveal answer" / "Were you right?": "Your turn: say your answer
   out loud. The host will judge." for the answering player, "Ann is answering — the host will
   judge." for the others.
6. **Host controls (🎤 button, bottom right):** the same sheet as the admin's 🛡 (feature 20) —
   skip a question, do a stuck player's step, change scores — plus the **⏱ room timers**
   (header button and round preview) are editable by the host.
7. **The admin** (🛡 sheet) gets a **Host seat** section: who hosts, **🎤 Take the host seat**,
   **Free the host seat**, and **Make <name> host** for each person watching (not playing).
8. **Stop hosting** (or the admin's **Free the host seat**) between questions → the room plays
   the self-marking game again from the next question.

Everything is in English and Ukrainian (Вести гру, Ведучий: Vic, Відповідає Ann — ведучий
оцінить відповідь., Правильно / Неправильно, Керування ведучого, Місце ведучого, …) and
follows the Classic / Dark theme.

Errors the server may answer (EN): "the host judges the answers in this room", "in this room
the host runs the game", "only the host can do this", "players can't host: leave the game
first", "Vic is already hosting", "the host seat can only change between questions", "nobody is
hosting this game", "you're hosting: stop hosting to play", "solo games have no host".

## Design decisions

### State and events

- `State.host: { userId, name, avatar? } | null` — the host is **not a player**: no score,
  can't buzz or answer (the engine ignores the host's buzz / Final answer), not in standings,
  teams or the summary. `State.revealed: Map<"round,i,j", { answer, answerMedia? }>`.
- New events (all inserted by the server after the route's checks; the engine re-validates and
  ignores — never throws on — malformed ones):
  - `claim_host { userId, name, avatar? }` — the free seat, by a visitor who isn't a player,
    **between questions** (no question open), before game over. Decision on "before the game
    only, or any time the seat is free": **any time the seat is free** (between questions), so a
    room whose host left mid-game can get a new one.
  - `release_host { userId, admin? }` — the host (or the admin) frees the seat, between
    questions only.
  - `assign_host { userId, name, avatar?, admin: true }` — admin only. **Replacing** a host
    works any time (even during a question: the mode doesn't change); **filling an empty seat**
    only between questions.
  - `reveal_answer { round, i, j, answer, answerMedia? }` — see "Answers withheld".
- **Seat lock:** while the seat is taken, only the admin can replace the host (claim needs a free
  seat). A disconnect changes nothing (no event). The host can't `join` (engine + 409 in the
  route); a player can't take the seat (engine + 409 "leave the game first"). Someone who left
  the game before it got underway is dropped from `leftPlayers` when they take the seat.
- **The mode only changes between questions.** This keeps everything about an open question
  consistent: who may judge, which answers clients have, and the buzz tiebreak seed.
- **Host leaves mid-game → self-marking** (the simpler of the two options; "wait for a new
  host" would block the game with nobody able to unblock it except the admin). Documented in
  the UI ("Players will mark their own answers again.").

### Host-mode rules (engine; only while `state.host` is set)

- `check` without `host: true` / `admin: true` is ignored, except a player's own **multiple
  choice pick** (with `choice`, not timed out). Timeouts too need the host flag.
- **Multiple choice correctness comes from the payload** in host mode (the check route always
  computed it from the game data; only the server inserts events, and players' clients don't
  have the answer). Self-marking rooms keep re-checking against the game data, so old events
  replay exactly as before.
- `start_round`, `next_clue` (incl. "show the answer" of a Final nobody could wager on) — only
  the host (payload `userId` = the host's id) or an admin/host-tagged event. `choose_clue` — the
  board-control player, or the host (the engine treats the host's choice as the board-control
  player's). `correct_check` (Undo) — host/admin-tagged only; the player Undo buttons are
  hidden in host mode.
- `host: true` on any event is ignored while there is no host (a stale host action can't do
  anything in a self-marking room).
- **Tiebreak seed:** buzz ties were broken with `clue.clue || clue.answer`; a question with no
  text (media only) used its answer, which players don't have in host mode. In host mode the
  seed is `clue.clue || "round,i,j"` (`getStateTiebreakerSeed`), identical on every client.
  Self-marking rooms keep the old seed (old events replay unchanged).
- **Answer timer:** in host mode the **host's device** sends the timeout (`check` with
  `timedOut` + `host: true`) once per turn (same `sentFor` guard as before); players' devices
  send nothing. If the host's device is offline the game waits — the host can still judge.
- Admin-tagged events stay valid in host mode (the admin keeps everything); the admin's panel
  "Start / Back to the board for Ann" works because admin-tagged flow events are accepted.
- Score changes and skips by the host are tagged `host: true`; the toast says "🎤 Host: Ann
  +$300" / "The host skipped a question." and the reveal "The host skipped this question."
  (`ScoreAdjustment.byHost`, `ClueAnswer.skippedByHost`).

### Answers withheld from players

- `withholdAnswers(game, state)` (`app/models/withhold-answers.ts`, shared): `answer` → `""` and
  `answerMedia` dropped for every question not resolved yet (played, skipped or revealed).
  Nothing else identifies the right option of a multiple choice question (`choices` stay;
  `answer` was the only link). Every real answer is non-empty (schema), so `""` means withheld.
- **Room loader** (`/room/:name`): withheld for everyone except the host and the site admin
  (`shouldWithholdAnswers`); **TV loader** (`/room/:name/present`): always withheld in host mode
  (the TV shows the room to everyone, even if the admin opened it). The loaders return
  `answersHidden`. **Summary** (game over): unchanged, everything.
- **Reveal:** when a question is resolved in host mode the server inserts `reveal_answer` with
  the answer (and answer media). `revealResolvedAnswer` runs after the insert of every route
  that can resolve a question — buzz (everyone passed), check, next-clue (Final nobody could
  wager on), admin/host skip — and the room loader heals a missed one. Rooms that never had a
  host return after one events query (no game fetch, no replay). Concurrent calls may insert
  it twice: harmless (the engine keeps the first). Realtime delivers it, late joiners replay it;
  `useGameEngine` overlays revealed answers on the board/clue it exposes
  (`engine/revealed.ts`, cached so components get stable objects). Until it arrives (a moment
  after the verdict) players see "Here comes the answer…".
- **Mode switches:** the page compares "should my answers be hidden" (from the engine's host)
  with the loader's `answersHidden`; on a mismatch it revalidates the loader (once per host
  change). `useGameEngine` rebuilds its state from the known events when `answersHidden` changes,
  so the engine runs on the new game data (e.g. self-marking needs the answers back).
- The engine never needs an answer in host mode (tiebreak seed and multiple choice above), so
  host, players, TV and admin compute the same state from different game data — covered by
  tests that replay the same events with and without answers.
- **Known limit (not in scope):** the pack itself may be readable elsewhere — a public game's
  `/game/:id.json` download, its game page, or the `clues` table (public games are readable with
  the browser key). Withholding protects the room page, its data requests and realtime, which is
  what a player sees while playing. Use private/unlisted packs for serious games.
- Note: players' own pages in **self-marking** rooms still have the answers (unchanged).

### Routes

- `POST /room/:roomId/host` (new) — `intent=claim` (as yourself), `release` (the host as
  themselves, or the admin), `assign` (admin only: 403 before anything else). Mirrors the engine
  checks with 409 + message; solo → 400.
- `authorizeRoomActor` learns `host=true`: the session user must hold the room's host seat
  (403 "only the host can do this"); events get `host: true`. All eight act-for-player routes
  (start, choose-clue, wager, pass-clue, buzz, answer, check, next-clue) pass the room id.
- **check**: in host mode a player's own non-multiple-choice check or timeout → 403 "the host
  judges the answers in this room".
- **start / next-clue**: in host mode only the host (or an admin/host intervention) → 403 "in
  this room the host runs the game" (`requireHostModeFlow`; rooms without host events skip it).
- **admin** (skip, scores) and **settings** (room timers): `host=true` → the room's host instead
  of an admin session (the admin path is unchanged, still 403 before anything else).
- **player** (Join): 409 for the current host.

### UI

- `app/components/host/`: `HostBadge` (room header + TV header), `HostPrompt` (the host's
  question view: `HostAnswer`, `HostAnswering` with Right / Wrong and the host-side timeout,
  `HostFinalAnswers`), reusing the viewer prompt pieces (status line, timers, buzzes, choices).
- `GameComponent`: the host gets the board (to pick for the board-control player), pause, the
  clock, ⏱ timers, the 🎤 sheet (`AdminControls actor="host"`), and `HostPrompt` instead of
  the spectator prompt. The round preview shows the host's **Start round** (and hides the
  player-only parts); players see "The host starts the round.".
- Players' prompt (`prompt.tsx`), Next / Undo (`next-clue-form.tsx`), the choices list (a pick the
  server judged right is the right option even before the reveal) and the viewer status
  ("The host is judging the answers.") follow host mode.
- `AdminPanel` takes an `actor` ("admin" / "host"): the host's requests carry `host=true`; the
  admin's gain the **Host seat** section.
- **Presence:** spectators now also announce `userId` + display name (needed to pick a watcher
  as host; players' ids are visible in room events anyway). The identity is the one from the
  page load: guests get a new random name with every loader run, and re-tracking presence right
  after a data reload closed the realtime channel (found by the E2E test) — presence is now only
  re-announced on a real change.
- Hydration: everything new renders from loader data and the engine state (same on server and
  client); the 🎤 sheet content renders only when opened.

## Files

- Engine: `app/engine/engine.ts` (new action types, host rules, `getStateTiebreakerSeed`),
  `actions.ts` (`isHostAction`, `parseHostSeat`, `parseReleaseHost`, `parseRevealAnswer`, host
  flag on check / settings / skip / score), `state.ts` (`host`, `revealed`, `isHostMode`,
  `byHost` / `skippedByHost`), `revealed.ts` (new), `room-event.ts` (`hasHostSeatEvents`),
  `presence.ts` (`listWatchers`, "host" role), `use-game-engine.ts`, `use-engine-context.ts`,
  `admin.ts`; `app/utils/offline-storage.ts` (solo saves: no host).
- Server: `app/models/withhold-answers.ts` (new), `app/models/room-reveal.server.ts` (new),
  `app/admin/room-actor.server.ts`, routes `room.$roomId.host.tsx` (new), `check`, `buzz`,
  `next-clue`, `start`, `choose-clue`, `wager`, `pass-clue`, `answer`, `admin`, `settings`,
  `player`, `room.$roomName.tsx`, `room.$roomName_.present.tsx`.
- UI: `app/components/host/` (new), `game.tsx`, `preview/preview.tsx`, `prompt/prompt.tsx`,
  `prompt/next-clue-form.tsx`, `prompt/answer-timer.tsx`, `prompt/choices.tsx`,
  `board/board.tsx`, `answer-timer-settings.tsx`, `admin-room/admin-panel.tsx`,
  `admin-room/admin-toasts.tsx`, `watch/viewer-prompt.tsx`, `watch/presenter.tsx`.
- i18n: new area `host` (`app/i18n/{en,uk}/host.ts`), `room.error.host*` /
  `room.error.joinWhileHosting` / `room.error.noHost` in `app/i18n/{en,uk}/room.ts`.
- Tests: `app/engine/engine-host.test.ts`, `app/models/withhold-answers.test.ts`,
  `app/routes/room.host-role.test.ts`, `app/routes/room.host-loaders.test.ts`,
  `app/components/host/host-role.test.tsx`, `app/engine/presence.test.ts`,
  `e2e/host-role-room.spec.ts`, `playwright.config.ts`.

## Verification

- **Engine** (`engine-host.test.ts`, 49 cases): seat — claim in the lobby / before anyone
  joined, a player can't claim, taken seat, the host can't join, not while a question is open,
  a free seat mid-game between questions, release by the host / not by others / by the admin /
  not during a question, assign by the admin (also replacing a host during a question), not
  without the flag, not to a player, not filling an empty seat during a question, nothing after
  game over, avatar, malformed events ignored; flow — only the host (or admin/host-tagged)
  starts, the host may choose, only the host moves on, host-tagged events ignored without a
  host; judging — player's own check ignored, Right, Wrong + rebuzz, Wrong then Right, all wrong
  → reveal, not someone who isn't answering, admin judging, host flag ignored in self-marking,
  timer auto-mark by the host (twice → once), player's own timeout ignored, fallback after the
  host leaves, cat in the bag, Double Down chosen by the host, Undo host/admin only; multiple
  choice — payload trusted, same result with and without answers in the game data, self-marking
  still re-checks, timeout needs the host; Final — host judges each, players can't, show the
  answer of a no-wager Final; `reveal_answer` stored / malformed ignored; tiebreak seed the same
  with and without answers (three-way tie), unchanged in self-marking rooms; old events replay
  unchanged. All existing engine tests pass unchanged.
- **Withholding** (`withhold-answers.test.ts`): who gets answers, unresolved answers and answer
  media dropped (serialized JSON checked), resolved / revealed kept, choices kept, original game
  untouched, which reveal to insert.
- **Routes** (`room.host-role.test.ts`, 21 cases): claim (service role), 403 for someone else,
  409 player / taken / question open, release by the host vs 403, 409 during a question, assign
  admin-only (also during a question), admin frees the seat, 400 solo; 403 player self-check
  and timeout in host mode, 403 for a non-host judging, host judging inserts the verdict **and**
  `reveal_answer` on Right, nothing revealed on Wrong, players still pick multiple choice
  (server verdict); 403 for a player starting / moving on, the host may, rooms without a host
  not replayed; the host skips and changes scores (`host: true`), 403 for others, host changes
  timers / 403 for others; 409 joining while hosting. Loaders (`room.host-loaders.test.ts`): a
  player and a spectator get no answers for unresolved questions (resolved included), the host
  and the admin get all, nothing withheld without a host, a missing reveal is inserted, the TV
  never gets them.
- **Components** (`host-role.test.tsx`, EN + UK): host screen shows the answer and Right / Wrong
  (request checked), Wrong, answer while reading, Final per-player judging; player screens never
  contain the answer nor "Reveal answer", the answering player's text, the answer after the
  reveal, no "Back to board" for players; join dialog "Host this game" (request checked), taken
  seat info, badge for everyone, "Stop hosting" (request checked), only the host starts the
  round.
- **E2E** (`e2e/host-role-room.spec.ts`, `db` project): a visitor claims the seat; two players
  join; only the host starts; Ann opens a question — the host sees the answer; the room data
  (`<room>.data`, React Router's data request with each visitor's cookies) for both players has
  no answer of the open question, the host's has; Ann buzzes, the host marks her Wrong; Bob's
  and Ann's screens don't show the answer, Bob's data still doesn't have it, Bob buzzes; the host
  marks Bob Right → both see the answer and Bob's $200; the players have no "Back to board";
  the host moves on and **Stops hosting** → Bob opens the next question, buzzes and gets
  "Reveal answer" (self-marking again).
- **Visual check:** screenshots of the join dialog, round preview, board, the host reading /
  judging / reveal and the players waiting / answering / reveal at 390 px and 1280 px, Classic
  and Dark (taken with a throwaway Playwright script, not committed).
- `jep-validate` green.

### Manual test script

1. Laptop: open a room link → **🎤 Host this game**. Badge "You're the host".
2. Phones A and B: open the link — the join dialog says "… is hosting this game." — **Join
   game** on both. They see "The host starts the round."; the laptop taps **Start round**.
3. Phone A opens a question. Laptop: the answer is in the cyan box. Phone A buzzes in →
   "Your turn: say your answer out loud…", phone B "A is answering — the host will judge."
   Laptop: **✗ Wrong**. Phone B: no answer anywhere, buzz in. Laptop: **✓ Right** → both phones
   show the answer; the laptop goes back to the board (or waits 3 s).
4. Multiple choice (upload `app/static/mock-choice.jep.json` or any pack with choices): the buzz
   winner taps an option; the laptop sees the right option highlighted.
5. Final: players type; the laptop sees answers arrive, then Right / Wrong per player.
6. Laptop: **🎤** → skip a question / change a score: phones get "🎤 Host: …" toasts. ⏱ → change
   the answer time.
7. Admin device (logged in at `/admin`), **Just watch** → 🛡 → **Host seat**: Make <watcher>
   host / Take the host seat / Free the host seat.
8. Laptop: **Stop hosting** between questions → players get "Reveal answer" again.
9. Switch to УКР and to the Dark theme; try the laptop at phone width.
