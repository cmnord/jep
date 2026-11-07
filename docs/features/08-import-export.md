# Feature 08 — Import SIGame packs (.siq) and import/export JSON

**Branch:** `feat/siq-import`
**Status:** ✅ implemented & tested
**Migration:** `supabase/migrations/20261025172846_game_media_bucket.sql` (creates the public
Storage bucket `game-media`; additive, `on conflict do nothing`; must be applied to production
before deploying this branch)
**New dependencies:** `fflate` (zip), `fast-xml-parser` (XML)

## Goal

1. Make the existing JSON export/import easy to find: download a game as `.jep.json` from its
   page, edit it, upload it again.
2. Import SIGame / SIQuester packs (`.siq`) directly — text, pictures, sound and video — so the
   group can play the packs they already have.

(In the code a question is called a "clue".)

## How to use it

- **Download JSON:** the game page (`/game/<id>`) has a **Download JSON** link (also still in
  the profile's game menu and the home page offline download). The file is a normal
  `.jep.json` game.
- **Upload / import:** the upload box on the home page and the profile ("Upload or import a
  game") takes a Jep! game (`.jep.json`, up to 1 MB) **or** a SIGame pack (`.siq`, up to
  100 MB). Drag and drop works too. Guests' uploads are public, logged-in users' unlisted (as
  before).
- After a `.siq` import the page shows a summary, e.g. _Imported SIGame pack "Пакет 1": 4
  rounds, 19 categories, 91 questions, 0 media files. 6 questions skipped. 1 warning._ and a
  yellow **Skipped or changed** list (missing files, unsupported content, the final themes that
  were left out, ...). The success message stays until the next upload when there are warnings.
- `/upload-help` documents both.

## SIGame format support

Both `content.xml` layouts are parsed (`app/models/siq/parse.ts`), checked against the
official XSDs and SIQuester sources (github.com/VladimirKhil/SI: `assets/siq_5.xsd`,
`SIPackages/Core/*.cs`) and the sample packs in that repo:

| What             | v4 (`ygpackage3.0`, SIQuester < 6)                                                            | v5 (`siq_5.xsd`)                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| question content | `<scenario><atom type="…">` (`text`, `say`, `image`, `voice`, `video`); file refs are `@name` | `<params><param name="question" type="content"><item type="…" isRef="True">name</item>`                               |
| answer content   | atoms after `<atom type="marker"/>`                                                           | `<param name="answer" type="content">`                                                                                |
| question type    | `<type name="…">` (`cat`, `bagcat`, `auction`, `sponsored`) with `<param>`s (`theme`, `cost`) | `type="…"` attribute (`secret`, `secretPublicPrice`, `stake`, `noRisk`, …) with params `theme`, `price` (`numberSet`) |
| multiple choice  | —                                                                                             | `answerType=select` + `answerOptions` group                                                                           |

Media files are found in the zip by name: names in the zip are URI-escaped
(`Images/red%20dot.png`, Cyrillic names too), folder case is ignored, the folder for the kind
(`Images`, `Audio`, `Video`) is preferred and any folder is the fallback.

## Mapping

| SIGame                                                                           | Jep!                                                                                                           |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| package name / authors / comments                                                | `title` / `author` (", "-joined; "Unknown") / `note`; title falls back to the file name                        |
| round                                                                            | board (more than 12 themes → split into several boards, warning)                                               |
| theme                                                                            | category (blank name → "Theme N", duplicates → "Name (2)")                                                     |
| question price                                                                   | `value`                                                                                                        |
| text (`text`, `say`) items                                                       | `clue` (joined with spaces)                                                                                    |
| image / audio (`voice`) / video items                                            | `media` (uploaded to Storage)                                                                                  |
| content after the marker / `answer` param                                        | `answerMedia` (answer text is not shown, see limitations)                                                      |
| right answers                                                                    | `answer`, alternatives joined with " / " (fallback: answer text; else "(no answer in the pack)" + warning)     |
| `cat`, `bagcat`, `secret`, `secretPublicPrice`, `secretNoQuestion`               | `secret: true`, `secretTopic` = theme param, `secretValue` = price (range → maximum; 0 → keep the cell value)  |
| `auction`, `stake`, `stakeAll`                                                   | `wagerable: true`                                                                                              |
| `noRisk` / `sponsored`, `forYourself`, `forAll`, `simple`, `withButton`, default | normal question (Jep! has no no-risk / for-all mechanics)                                                      |
| unknown type                                                                     | normal question + warning                                                                                      |
| v5 `answerType=select` with 2–6 text options                                     | `choices`, `answer` = the right option's text (otherwise options are dropped with a warning)                   |
| final round (`type="final"`/`themeList`)                                         | one board with **one long-form final question: the first final theme**; the other themes are skipped (warning) |
| HTML items                                                                       | skipped (warning)                                                                                              |
| links (non-ref items)                                                            | used as-is if valid `https:` media; otherwise skipped                                                          |

**Why only the first final theme?** In SIGame players remove final themes until one is left and
everybody wagers on that one question. Jep!'s final is a board with a single long-form question
(the engine relies on exactly that shape: anyone can start/choose it, everyone wagers). Making one
final board per theme would make players wager N times in a row, which isn't how the pack is
meant to be played; the first theme is the closest equivalent to "the one that's left". The
skipped themes' media is never uploaded.

Questions with no text **and** no usable media are dropped with a warning instead of failing the
import. More than 10 media blocks per list are cut to 10 (warning). The finished game is
validated with the existing `GameSchema` before anything is inserted; a pack with no playable
questions is rejected.

## Media storage

- Each referenced file is uploaded once (even if several questions use it) to the public bucket
  **`game-media`** under `siq/<random uuid>/<nnnn>.<ext>` with the service-role client
  (`app/models/siq/media-store.server.ts`, 4 uploads at a time) and referenced by its public URL.
  Content type comes from the extension; allowed: jpg/jpeg/png/gif/webp/avif/bmp,
  mp3/m4a/aac/wav/ogg/oga/opus/flac/weba, mp4/m4v/webm/ogv/mov. The extension decides the media
  type (an "image" item that is an `.mp3` plays as audio). **SVG is not allowed** (scripts).
- Skipped with a warning: files over **50 MB**, unsupported types, refs missing from the zip,
  files whose upload fails.
- On any failure after uploads started (no playable questions, schema error, DB insert error)
  the uploaded files are removed again.
- Bucket (migration): `public = true`, `file_size_limit = 50 MB`, `allowed_mime_types` = the list
  above (a unit test keeps the migration and `media-types.ts` in sync). **No policies** on
  `storage.objects`: anon/authenticated can't upload, overwrite, delete or list (verified with
  curl against the local stack: 403 / empty list); public reads work through
  `/storage/v1/object/public/game-media/…`.
- Local development: the Supabase stack now runs `storage-api` (`scripts/start-local-supabase.sh`
  no longer excludes it; imgproxy etc. stay off). Local storage is plain `http://127.0.0.1:54321`,
  but game media must be `https:`. So `MediaBlockSchema` additionally accepts `http:` URLs that
  are on the configured `SUPABASE_URL` origin **and** under
  `/storage/v1/object/public/game-media/` (`isGameMediaUrl`), and the CSP adds the Supabase
  origin to `img-src`/`media-src`. In production `SUPABASE_URL` is https, so both are no-ops.

## Safety

- Upload size: `parseFormData` `maxFileSize` is 100 MiB (`MAX_SIQ_SIZE`), one file per request;
  JSON is still capped at 1 MB in the handler. Too large → "the file is too large (SIGame packs:
  at most 100 MB, JSON games: at most 1 MB)".
- The file type is decided by name (`.siq` → SIGame, `.json`/`application/json` → JSON; anything
  else → "Unsupported file"), and a `.siq` must start with the zip signature.
- Everything happens in memory (no temp files).
- **Zip bombs:** before decompressing anything, the central directory is checked: at most **5000
  entries**, at most **300 MB** uncompressed in total, `content.xml` at most **20 MB**. fflate
  decompresses each entry into a buffer of exactly its declared size, so a lying header can't
  grow it (unit test with a patched header). Entries are decompressed one at a time, only those
  used by kept questions.
- **XML:** `fast-xml-parser` (no external entity support at all); documents with a `<!DOCTYPE`
  or `<!ENTITY` are rejected outright (billion laughs / XXE tests), the document is validated
  first, `content.xml` must be valid UTF-8.
- The flash message is size-bounded (≤ 8 warnings, ≤ 160 chars each, ≤ 1200 bytes, title ≤ 80
  chars) so the session cookie stays under the browser limit.

## Upload screen (follow-up, `feat/upload-progress`)

Owner's request: "add load screen when uploading packs". While a file uploads, a modal screen
covers the page with the file name and size and two stages:

1. **Uploading…** — a real progress bar with the percentage and "192.0 KB of 402.8 KB", and a
   **Cancel upload** button (aborts the request).
2. **Importing the pack…** (`.siq`) / **Saving the game…** (`.jep.json`) — once every byte is
   sent: an indeterminate animated bar and "Processing media files — large packs can take a
   minute. Please keep this page open."

Then the page shows the summary / error message exactly as before.

Design decisions:

- **XMLHttpRequest instead of the fetcher.** `fetch` can't report upload progress (streaming
  request bodies need HTTP/2 + `duplex`), so the box posts the same multipart body with an XHR
  (`app/utils/upload-with-progress.ts`). An XHR follows redirects itself, which would make the
  redirect target's loader consume the flashed result before the page could show it, so the
  request carries `X-Jep-Upload: 1` and `POST /game` then answers `{ "redirectTo": "/" }` as
  JSON (status 200, or 400 for errors) with the same flash cookie; the box then
  `navigate()`s there (replace, no scroll reset) — the same navigation the fetcher's redirect
  did, so the success summary, the skipped/changed list and the error messages work unchanged.
  Without the header the action redirects as before.
- **No flash for quick uploads:** the screen appears only after 300 ms (`.jep.json` uploads
  usually finish before), and once shown it stays at least 500 ms. Meanwhile the upload box shows
  its spinner.
- **One upload at a time:** the input is disabled and a second start is ignored while busy.
- **Errors the server didn't flash** (connection lost; a proxy error page such as 413/502) show
  a message under the box with a **Try again** button (re-sends the same file, no new dialog).
  Canceling just resets the box. Leaving the page aborts the upload.
- **Accessibility:** Radix dialog (focus kept inside, can't be dismissed by Escape/outside
  click), `role="progressbar"` with `aria-valuenow` (upload) or without it (processing), and a
  polite `role="status"` live region announcing "Uploading x.siq…", "Upload complete.
  Importing the pack…", "Upload canceled.". The live region renders empty on the server — no
  hydration mismatch.
- Looks like the existing confirm dialog (navy card, gold bar) in Classic and Dark; works at
  phone width. EN + UK strings (`upload.progress.*`, `upload.retry`, `upload.error.network`,
  `upload.error.server`).

Files: `app/components/upload.tsx` (+ `upload.test.tsx`), `app/components/upload-progress.tsx`,
`app/utils/upload-with-progress.ts` (+ test), `app/test-fixtures/fake-xhr.ts`,
`app/routes/game/route.tsx` (+ test), `app/routes/_index/route.tsx`,
`app/routes/profile/route.tsx` (`onUploadStart` replaces the fetcher), `app/styles.css`
(`animate-upload-indeterminate`), `app/i18n/{en,uk}/upload.ts`, `e2e/siq-import.spec.ts`.

Verification: component tests with a fake XHR (progress %, bytes, stage switch, live region,
disabled input, navigation to the flashed result, quick uploads skip the screen, JSON "Saving
the game…", cancel, network error + retry, unexpected status, guest confirm first, Ukrainian);
route tests for the JSON answer (200/400, no `Location`, flash headers kept); e2e "SIGame pack
upload screen" throttles the upload via CDP (`Network.emulateNetworkConditions`) and holds the
response at the response stage (`Fetch.enable`, `requestStage: "Response"` — `page.route` pauses
before the body is sent, so the browser reports no progress), then asserts **Uploading…** with
an `aria-valuenow` progress bar, **Importing the pack…** with the processing bar, and finally
the import summary.

## Not done / limitations

- **Deleting a game doesn't delete its imported media** (files stay in the bucket under their
  `siq/<uuid>/` prefix). Cleaning up would need a prefix column or a URL scan on delete.
- Answer text after the marker / in the `answer` param is not shown (Jep! has no answer note);
  it is only used as the answer when the pack has no right answers.
- Round names are lost (Jep! boards have no names).
- SIGame specifics without a Jep! equivalent play as normal questions: no-risk (no penalty),
  for-all, "give it to yourself" secret selection modes, price choice for secret ranges (Jep!
  uses the maximum), `secretNoQuestion` (dropped when it has no content).
- Media timing (placement, duration, background audio) is ignored; files are shown/played as in
  feature 03.
- Large imports run within one request: a 100 MB pack with many files can take a while (the
  upload screen shows "Importing the pack…", see below). Behind nginx the proxy timeouts must
  allow that.
- A guest can import up to 100 MB of media publicly (same rules as JSON uploads: public,
  community guidelines).
- The tiny fixture video is placeholder bytes (not playable); it's only used for mapping tests.

## Files

- `app/models/siq/parse.ts` (+ test) — v4/v5 `content.xml` parser.
- `app/models/siq/archive.ts` (+ test) — in-memory zip access, limits, file lookup.
- `app/models/siq/convert.ts` — package → game mapping (tested through the importer).
- `app/models/siq/import.server.ts` (+ test) — orchestration, media resolution/upload, schema
  validation, cleanup.
- `app/models/siq/media-store.server.ts` — Supabase Storage uploads (service role).
- `app/models/siq/media-types.ts` (+ test, incl. migration allow-list check), `errors.ts`,
  `summary.ts` (+ test).
- `app/routes/game/route.tsx`, `file-upload-handler.server.ts` (+ `route.test.ts`) — `.siq`
  handling, size caps, summary flash.
- `app/session.server.ts` — flash form state gets optional `details`.
- `app/components/form-state-message.tsx` (new), `app/routes/_index/route.tsx`,
  `app/routes/profile/route.tsx` — summary + details list.
- `app/components/upload.tsx` — accepts `.siq`, label and hint, "Importing SIGame pack…".
- `app/routes/game_.$gameId_.tsx` — **Download JSON** link.
- `app/models/convert.server.ts` (+ `convert-game-media.server.test.ts`) — `isGameMediaUrl`.
- `app/entry.server.tsx` — CSP `img-src`/`media-src` include the Supabase origin.
- `app/routes/upload-help.tsx` — docs.
- `supabase/migrations/20261025172846_game_media_bucket.sql`.
- `scripts/start-local-supabase.sh` — keep `storage-api`.
- `app/test-fixtures/siq/` — `v4.content.xml`, `v5.content.xml`, `media/` (8×8 PNGs, a 0.05 s
  WAV, placeholder MP4) and `build.ts` (zips them in memory with SIQuester-style escaped names).
- `e2e/siq-import.spec.ts`, `playwright.config.ts` (db project).

## Verification

- Unit (parser): v4 + v5 fixtures — package info, rounds/themes, text, image, audio (`voice`),
  video, `say`, marker split, answer media, several right answers, secret (fixed price, range,
  text price), stake, noRisk, html, options, XML entities, BOM, empty question; malformed XML,
  no `<package>`, DOCTYPE/entity bomb/XXE rejected; `parsePriceRange` table.
- Unit (archive): escaped and Cyrillic names, folder case, kind preference and fallback, not a
  zip, truncated zip, no content.xml, non-UTF-8, entry-count cap, total-size cap (20 MB of zeros
  in a < 100 KB zip), content.xml cap, lying size header can't inflate past the declared size.
- Unit (import/mapping): both fixtures pass `GameSchema`; every mapping rule above; missing file
  (question kept with text / dropped without), unsupported/too-large files, extension decides
  type, ≤ 10 blocks, https links kept / http + YouTube-as-audio skipped, unknown type, missing
  answer, answer-text fallback, invalid options, secret price 0, theme split + duplicate names,
  nameless package/theme, skipped final themes upload nothing, failed upload skipped, no playable
  questions → error + cleanup, schema failure → error + cleanup, archive limits. Also real
  sample packs from the SI repo (`1.siq`, `Package4_1.siq`, `Package5_1.siq`) imported cleanly in
  a scratch run (91 questions each, secret/stake mapped; not committed).
- Unit (route): JSON upload, JSON > 1 MB, `.siq` import with summary/details and visibility,
  cleanup when the DB insert fails, broken pack, unsupported file, over 100 MiB; `uploadKind`.
- E2E (`db` project, local Supabase with Storage): a guest uploads a generated v5 `.siq`
  (unique title) → summary and warnings shown → game listed on the home page → game page has
  **Download JSON**, the export has storage media and the secret flag → solo play, the first
  question shows the `<img>` served from local Storage (`naturalWidth` 8). A broken `.siq` shows
  the error.
- `jep-validate`: format, lint (0 errors, 2 pre-existing warnings), typecheck, 5836 unit tests,
  76 e2e tests — all pass.

### Manual test script

1. Build the test packs (or use any real `.siq` from SIGame):
   `node -e "import('./app/test-fixtures/siq/build.ts').then(m=>{const fs=require('fs');fs.writeFileSync('/tmp/v5.siq',m.buildSiq('v5'));fs.writeFileSync('/tmp/v4.siq',m.buildSiq('v4'))})"`.
   Home page as a guest: tap **Upload or import a game** → pick `/tmp/v5.siq` → **Upload
   publicly**.
2. See "Imported SIGame pack …" with counts and the yellow list (missing picture, HTML skipped,
   final theme skipped).
3. Open the game from the home page → **Play solo**: Pictures $100 shows a red dot; Pictures
   $200 shows a picture with no text and a blue picture after the answer; Sounds $100 plays a
   short beep; Pictures $300 is a cat in the bag ("Famous cats", $500); Sounds $200 asks for a
   wager; Options $100 shows Mars / Jupiter / Venus; the final round is "Final A".
4. On the game page tap **Download JSON**: a `.jep.json` downloads; upload it again → a copy of
   the game (media still from storage).
5. Phone: the upload box and the summary list fit the screen; a 100+ MB file is refused with
   "the file is too large".
6. Logged in (profile): import a pack → unlisted game with its link in the message.
