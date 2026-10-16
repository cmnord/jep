# Game upload API v1

`POST /api/v1/games` accepts existing Jep game JSON. The API creates **public**
games, without an account owner. Upload tokens confer only permission to upload
and replay their uploader's keys; they are not Supabase keys, account sessions,
SQL credentials, or permission to edit/delete games. Ordinary multipart `/game`
uploads remain anonymous/public or signed-in/unlisted. Both use the same atomic
Postgres creation function, called only by the trusted server.

## Request and response

Send `Authorization: Bearer <token>`, `Content-Type: application/json`, and
`Idempotency-Key: <key>`. Keys are opaque, case-sensitive, 1–200 printable ASCII
characters without spaces. The UTF-8 body limit is **1,000,000 bytes**, enforced
while streaming even without Content-Length. No API cookies are required.

```json
{
  "apiVersion": "1",
  "result": "created",
  "gameId": "6dc32708-caf3-4c5a-9c3a-e66b822e5232",
  "gameUrl": "https://jep.example/game/6dc32708-caf3-4c5a-9c3a-e66b822e5232/play",
  "contentHash": "<64 lowercase SHA-256 hex characters>",
  "idempotencyKey": "example:1"
}
```

New uploads return **201 / created**. An equivalent request for the same uploader
and key returns **200 / replayed**, the original game ID and content hash. Keys
belong to a stable uploader UUID; rotating a token does not change their scope.
Different uploaders have independent namespaces. Requests for the same key
serialize in Postgres; game, categories, clues and receipt commit or roll back
together. Retrying a timeout/500 with the **same key and content** is safe. Clients
must verify HTTP status, version, result, key, hash, UUID and canonical URL before
saving a receipt. The hash attests to normalized content committed at creation
(or verified during operator reconciliation), not the current content after
possible later operator changes. Receipts are retained indefinitely, including
tombstones after game deletion; keys are never recycled.

`gameUrl` uses the server's `BASE_URL` origin and `/game/<gameId>/play`. Configure
clients such as jarchive with `JEP_URL` equal to that canonical origin (no path).
No source IDs, caller-specified UUIDs, SQL, visibility or owner fields are accepted
as control parameters. Extra JSON fields are stripped by the schema.

## Validation and normalization

The authoritative schema is `app/models/convert.server.ts` (`GameSchema`), not
the separately maintained `/game.schema.json`. V1 requires integer clue values
within JavaScript's safe integer range, nonempty trimmed title/author/category
names/clues/answers, nonempty boards/categories/clues, consistent unique
`categoryNames`, valid allowlisted HTTP(S) images, and wagerable long-form clues.
The existing schema supplies the other constraints.

Clients can pin the dependency-light `app/models/game-upload-contract.ts` plus
`convert.server.ts` and Zod 4.3.6. Exports: `normalizeGame`, `canonicalJson`,
`gameContentHash`, `GameSchema`. `docs/fixtures/game-upload-v1.json` pins sample
input, normalized data, exact canonical bytes and hash, including Unicode and
long-form clues. Shared source first published at
`c4ef6ff5099c8b1a61d0b4770eebf21878af787a`.

Normalization parses with GameSchema (including trimming and unknown-field
removal), fills absent category notes with `""`, and absent `wagerable`/`longForm`
with `false`. Absent images remain omitted. Other note/copyright whitespace is
preserved. Object keys sort by JavaScript string order; JSON.stringify supplies
string/number serialization; arrays retain order. SHA-256 hashes the canonical
JSON's UTF-8 bytes, without a trailing newline. Array reordering is a conflict
for normal API retries. A raw-file hash is a different value.

Errors are JSON `{ "apiVersion": "1", "error": { "code": "...", "message": "..." } }`.
Validation also returns `issues` with `path`, `code`, and `message`.

| HTTP | Code                                   | Meaning                                                 |
| ---- | -------------------------------------- | ------------------------------------------------------- |
| 400  | invalid_idempotency_key / invalid_json | Missing/bad key or malformed UTF-8 JSON                 |
| 401  | unauthorized                           | Missing, invalid, revoked token or disabled uploader    |
| 405  | method_not_allowed                     | POST required                                           |
| 409  | idempotency_conflict                   | Key already belongs to different normalized content     |
| 409  | reconciliation_required                | Reserved legacy key has no verified receipt             |
| 409  | game_deleted                           | Receipt exists but its game was deleted                 |
| 413  | payload_too_large                      | Body exceeds limit                                      |
| 415  | unsupported_media_type                 | application/json required                               |
| 422  | invalid_game                           | GameSchema rejected the payload                         |
| 500  | internal_error                         | Retry the same request; no database diagnostics exposed |

Responses use `Cache-Control: no-store`; 401 also includes `WWW-Authenticate:
Bearer`. Credentials are checked before body validation and checked again under
transaction locks. Gateways can independently reject oversized/invalid requests.

## Operator provisioning and rotation

Run commands from a trusted Jep checkout with the existing server-side
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` loaded by varlock. Never put those
values in a jarchive client workspace. `pnpm upload:admin --help` lists commands.
Only the operator uses this tool. No migration is applied by these commands.

```sh
pnpm upload:admin create 'archive uploader'  # prints stable UUID; disabled
pnpm upload:admin reserve <uploader-uuid> /path/reservations.json
pnpm upload:admin token <uploader-uuid> /private/new-upload-token
pnpm upload:admin enable <uploader-uuid>
```

`token` generates 32 random bytes, writes `jep_upload_<base64url>` to a new file
with mode 0600, and prints only its SHA-256 identifier. The DB stores only that
hash. Store the token as `JEP_UPLOAD_TOKEN` in the client's gitignored `.env.local`
or a workspace secret. Do not commit it, paste it into transcripts or put it in
command arguments. In an ephemeral Conductor cloud workspace, provision a new
token for the **same uploader UUID** if the old file is unavailable. Keep that
UUID and nonsecret token hashes in the operator's handoff. Rotation: issue a new
token, update client storage, then `pnpm upload:admin revoke <old-token-hash>`.
`disable <uuid>` revokes effective access for all its tokens. Browser-upload
availability does not depend on this credential system.

## Migration and reconciliation

An empty ledger cannot identify legacy data. Before issuing/enabling a token for
an existing importer, **reserve its entire potentially imported key inventory**.
Reservations are uploader-scoped, survive activation, and prevent creation on a
ledger miss. `reserve` requires a disabled uploader and accepts a JSON array of
key strings, in resumable idempotent batches. Do not enable until all batches
succeed. A new importer with no previous uploads can start without reservations.
Changing uploader UUIDs or key conventions requires migrating the inventory;
never create a fresh identity as a retry workaround.

For jarchive the coordinated client is [cmnord/jarchive PR #1](https://github.com/cmnord/jarchive/pull/1).
Its local exporter writes `reservations.json` with **all `jarchive:1` through
`jarchive:9556`**, and `recent-mappings.json` with 185 receipt-backed mappings after
checking each raw file SHA-256. Reserve the entire range, including missing local
files and deferred games, before enabling. The inspected recovery metadata has a
9348 watermark, 9341 historical upload markers and 9342 corrected parsed files;
the release `legacy-through-9348` has SHA-256
`de8e1ac7179078222c2d153ac090bfd800a014133eb108b816d05abbeb56848e`.
Recent 9349–9556 imports include 23 incomplete pages. Historical mapping is
separate operator work; do not rescrape or treat local absence as proof of no
production game. Source archive IDs are not show numbers or dates.

```sh
pnpm upload:admin reconcile <uuid> /path/recent-mappings.json
pnpm upload:admin reconcile <uuid> /path/recent-mappings.json --write
```

Mappings are an array of `{ "idempotencyKey": "jarchive:9555", "gameId":
"9e1e156c-af3c-5e68-a6b2-960784a0c3d6", "game": <original game JSON> }`.
Use explicit verified UUIDs from receipts/source evidence. Recent UUID5 IDs use
the URL namespace and `https://j-archive.com/showgame.php?game_id=<ID>`, but never
assume historical IDs use that convention. A title alone is not identity.

Preview reads and checks content; `--write` attaches each verified mapping in its
own transaction and is safe to rerun after partial completion. The operator
compares every normalized metadata field and the full category/clue multisets
within each round (including duplicate multiplicity). Only legacy reconciliation
ignores category/clue ordering, which old storage may have lost. The RPC locks
all game components and checks the exact inspected snapshot again to prevent a
read/write race. It requires a public game, rejects changed/missing games and
conflicting receipts, never overwrites existing games, and preserves reservations.
A subsequent POST replays the supplied payload/hash against the existing UUID.
Reconciliation does not alter ownership or visibility of the existing game.

Unknown/conflicting historical keys stay blocked. Only after independent evidence
proves a key was **never imported**, disable the uploader and explicitly release
that single reservation:

```sh
pnpm upload:admin release <uuid> jarchive:9556 --write --reason 'verified evidence reference'
```

Retain the command's JSON output/evidence in the migration review, then re-enable.
A missing receipt, an incomplete scrape, or a changed title is insufficient
proof. Future keys outside the reserved inventory can create normally. Preserve
and back up uploader identities, reservations and receipts with the game tables;
restoring only the games can lose duplicate protection.

## Deployment handoff (not performed by this PR)

1. Review and apply the migration to the target Supabase project, then deploy Jep
   with existing server credentials and correct canonical BASE_URL. The updated
   browser path also requires the migration; deploy in that order.
2. Export/inspect jarchive's migration inventory; create a disabled uploader,
   reserve all 9556 keys, and verify the inventory before activation.
3. Preview and apply verified mappings. Resolve historical UUIDs separately;
   leave unknowns blocked. Release only proven-never-imported keys explicitly.
4. Provision an upload-only token, set client JEP_URL/JEP_UPLOAD_TOKEN, enable the
   uploader, and run client preview then a deliberate write. Keep raw receipts
   and recovery archives; never fall back to management SQL.
5. After successful cutover, revoke/remove the old management PAT from importer
   environments as a separately authorized credential operation.

Local checks: `pnpm db:start`, then `pnpm validate` with local environment values.
The upload API e2e tests cover RPC permissions, atomic rollback, concurrency,
isolation, rotation/revocation, normalized replay, conflicts, reserved keys,
operator reconciliation and tombstones. Existing browser tests cover anonymous
public and authenticated unlisted uploads.
