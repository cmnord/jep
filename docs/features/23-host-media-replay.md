# Feature 23 — Host replays audio/video

**Branch:** `feat/host-media-replay`
**Status:** ✅ implemented & tested
**Migration:** none (one new room event type, `replay_media`; inserted by the server only)
**New dependencies:** none

## Goal

Owner (verbatim): "ability to replay video audio question. Only host can do that"

## How to use it

While a question with audio or video is open, the host's screen shows **🔁 Replay for
everyone** (uk: «Повторити для всіх») under the question. Tapping it restarts the clip from
the start on every device in the room: players, spectators and the TV screen. Players never
see the button. It works in every step of the question (reading, buzzing, someone answering,
the answer shown).

## Design

- **Event:** `replay_media` `{ userId, round, i, j, host: true | admin: true }`. The host
  route (`POST /room/:roomId/host`, `intent=replay`) checks that the caller is the host
  (their own session) or the site admin and that the open question has audio/video (409
  otherwise), then inserts it with the service role.
- **Engine:** `state.mediaReplay = { round, i, j, count }`. Each valid event bumps `count`
  for the open question (a new question starts at 1). Events from players, untagged events,
  events for another question and events without a host (`host: true` only) are ignored.
- **Clients:** the engine context exposes `mediaReplayCount` (0 unless it belongs to the open
  question). `ClueText` passes it to `PlayableMedia`; the first clip restarts
  (`currentTime = 0`, then `play()`) when the count goes _up after the clip mounted_, so a
  prompt that remounts between steps never restarts media by itself. YouTube embeds can't
  be told to restart, so the iframe is remounted with autoplay. A muted device (sound
  settings) rewinds but doesn't play. If the browser blocks playback, the usual tap-to-play
  hint shows.
- The admin may also replay through the route, but there is no admin-panel button.

## Files

- `app/engine/engine.ts`, `actions.ts`, `state.ts`, `use-game-engine.ts`,
  `use-engine-context.ts`: the event, its payload and state.
- `app/routes/room.$roomId.host.tsx`: the `replay` intent.
- `app/components/prompt/clue-media.tsx` (`useReplay`), `prompt.tsx` (`ClueText`).
- `app/components/host/host-prompt.tsx` (`ReplayMediaButton`, `data-testid="host-replay-media"`).
- i18n: `host.replayMedia`, `host.replayMediaHelp`, `room.error.noMediaToReplay`.

## Tests

- `app/engine/engine-host.test.ts` — "replay_media (feature 23)".
- `app/routes/room.host-role.test.ts` — "replaying media (feature 23)".
- `app/components/prompt/clue-media.test.tsx` — "host replay (feature 23)".
- `e2e/host-role-room.spec.ts` — "the host replays a question's audio on every device".
