# Game upload API v1

`POST /api/v1/games` creates a public game from existing Jep game JSON.
Browser `/game` uploads remain anonymous/public or signed-in/unlisted.
Both use the transactional `create_game` database function.

## Client contract

Send `Authorization: Bearer <API token>`, `Content-Type: application/json`, and
`Idempotency-Key: <key>`. The token needs the `games:upload` scope. Keys are
case-sensitive, 1–200 printable ASCII characters without spaces; the UTF-8 body
limit is 1,000,000 bytes, including streamed bodies.

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

New uploads return **201 / created**; the same client identity, key and normalized
content returns **200 / replayed** with the original ID/hash. Different content
conflicts. Token rotation keeps the same client UUID and idempotency namespace.
Concurrent requests serialize; game, categories, clues and receipt commit or roll
back together. Retry timeouts/500 with the same key and content. Deleted games
leave receipt tombstones; keys are not recycled.

Before saving a receipt, verify status, version, result, key, hash, UUID and URL.
`gameUrl` uses the server's `BASE_URL` origin plus `/game/<UUID>/play`; jarchive's
`JEP_URL` must equal that origin. Hashes attest to committed/verified upload
content, not later operator edits. Caller-supplied IDs, owners and visibility
have no effect.

`GameSchema` in `app/models/convert.server.ts` is authoritative. Pin that file
and `app/models/game-upload-contract.ts` with Zod 4.3.6 for client validation and
hashing. The [fixture](fixtures/game-upload-v1.json) includes exact normalized
content, canonical bytes and hash. Shared source was first published at
`c4ef6ff5099c8b1a61d0b4770eebf21878af787a`; the client can retain that compatible pin.
Normalization strips unknown fields, applies schema trimming, fills absent
category notes with `""` and booleans with `false`. Images remain optional.
Canonical JSON sorts object keys, preserves array order and uses JSON.stringify
serialization. SHA-256 covers its UTF-8 bytes without a newline; raw-file hashes
are different. `/game.schema.json` alone does not define this behavior.

Errors: `{ "apiVersion": "1", "error": { "code": "...", "message": "..." } }`.
Validation adds `issues` containing `path`, `code`, and `message`. Responses use
`Cache-Control: no-store`.

| HTTP | Code                                   | Meaning                                                          |
| ---- | -------------------------------------- | ---------------------------------------------------------------- |
| 400  | invalid_idempotency_key / invalid_json | Invalid key or UTF-8 JSON                                        |
| 401  | unauthorized                           | Missing/invalid/revoked token, missing scope, or disabled client |
| 405  | method_not_allowed                     | POST required                                                    |
| 409  | idempotency_conflict                   | Key belongs to different content                                 |
| 409  | reconciliation_required                | Reserved key has no verified receipt                             |
| 409  | game_deleted                           | Previously uploaded game was deleted                             |
| 413  | payload_too_large                      | Body exceeds limit                                               |
| 415  | unsupported_media_type                 | application/json required                                        |
| 422  | invalid_game                           | GameSchema validation failed                                     |
| 500  | internal_error                         | Retry the same key and content                                   |

## Provisioning and existing-game cutover

Apply the Supabase migration **before deploying Jep**. `api_clients` holds stable
identities; `api_tokens` holds SHA-256 hashes, revocation state and explicit scopes
(default: none). The upload CLI issues only `games:upload`, never SQL/admin/delete
permissions. Both the API helper and upload transaction enforce that scope.

Run the operator CLI in a trusted Jep checkout with server-side `SUPABASE_URL`
and `SUPABASE_SERVICE_ROLE_KEY` loaded by varlock. Client workspaces receive only
`JEP_URL` and `JEP_UPLOAD_TOKEN` in gitignored `.env.local` or workspace secrets.

```sh
pnpm upload:admin create 'archive client'  # returns UUID; disabled initially
pnpm upload:admin reserve <uuid> /path/reservations.json
pnpm upload:admin reconcile <uuid> /path/mappings.json          # read-only preview
pnpm upload:admin reconcile <uuid> /path/mappings.json --write
pnpm upload:admin token <uuid> /private/new-api-token           # new 0600 file
pnpm upload:admin enable <uuid>
```

For a new client with no prior imports, skip reserve/reconcile. For jarchive,
use [the client migration exporter](https://github.com/cmnord/jarchive/pull/1):
reserve **all `jarchive:1` through `jarchive:9556`**, including absent/deferred
files, before enabling. It exports 185 verified recent mappings; historical
UUID mapping remains operator work. Keep unknown keys reserved. Empty ledgers or
missing local receipts must not cause duplicate imports.

Reservations are a JSON array of strings. Mappings are an array of
`{idempotencyKey, gameId, game}` with explicit UUID evidence and original JSON.
Reconciliation checks complete normalized content against the public existing
game; only this legacy comparison ignores category/clue ordering within rounds.
It rechecks the snapshot under database locks, refuses conflicts, never rewrites
games and keeps reservations. Each mapping commits independently; reruns are safe.
Never identify games by title alone. A confirmed never-imported key can be released
while the client is disabled using `release <uuid> <key> --write --reason <evidence>`.

Tokens use `jep_api_<32 random bytes in base64url>`; only their hashes are stored.
Rotate by issuing another token for the **same UUID**, replacing the client secret,
and running `pnpm upload:admin revoke <old-token-hash>`. `disable <uuid>` disables
all that client's tokens. Preserve client identities, reservations and receipts
alongside game backups. After verified cutover, remove/revoke the old importer
management PAT separately. No production changes are performed by this PR.
