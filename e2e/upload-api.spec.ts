import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../app/models/database.types";
import {
  normalizeGame,
  gameContentHash,
} from "../app/models/game-upload-contract";
import fixture from "../docs/fixtures/game-upload-v1.json" with { type: "json" };

const admin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const anon = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);
const token = () => `jep_api_${randomBytes(32).toString("base64url")}`;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
let uploader: string;
let credential: string;
const game = normalizeGame(fixture.input);
const headers = (key: string, secret = credential) => ({
  Authorization: `Bearer ${secret}`,
  "Idempotency-Key": key,
});

async function provision(existing?: string, scopes = ["games:upload"]) {
  let id = existing;
  if (!id) {
    const result = await admin
      .from("api_clients")
      .insert({ name: "E2E uploader", enabled: true })
      .select("id")
      .single();
    expect(result.error).toBeNull();
    id = result.data!.id;
  }
  const secret = token();
  expect(
    (
      await admin
        .from("api_tokens")
        .insert({ client_id: id, token_hash: hash(secret), scopes })
    ).error,
  ).toBeNull();
  return { id, secret };
}

test.beforeAll(async () => {
  const provisioned = await provision();
  uploader = provisioned.id;
  credential = provisioned.secret;
});

test("operator help and invalid arguments work without credentials or writes", () => {
  const env = {
    ...process.env,
    SUPABASE_URL: "invalid",
    SUPABASE_SERVICE_ROLE_KEY: "",
  };
  for (const args of [["-h"], ["token", "--help"], ["help", "release"]]) {
    const result = spawnSync("pnpm", ["upload:admin", ...args], {
      env,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: pnpm upload:admin");
  }
  for (const args of [
    ["create", "example", "--typo"],
    ["create", "example", "unexpected"],
    ["create", "example", "--write"],
    ["release", uploader, "reserved-key", "--reason", "unverified"],
  ]) {
    const result = spawnSync("pnpm", ["upload:admin", ...args], {
      env,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Run pnpm upload:admin --help for usage.");
    expect(result.stderr).not.toContain("SUPABASE");
  }
});

test("new upload, normalized replay, conflict, and token rotation", async ({
  request,
}) => {
  const key = randomUUID();
  const first = await request.post("/api/v1/games", {
    headers: headers(key),
    data: fixture.input,
  });
  expect(first.status()).toBe(201);
  const result = await first.json();
  expect(result).toEqual({
    apiVersion: "1",
    result: "created",
    gameId: expect.any(String),
    contentHash: fixture.contentHash,
    idempotencyKey: key,
    gameUrl: `${process.env.BASE_URL}/game/${result.gameId}/play`,
  });
  const replay = await request.post("/api/v1/games", {
    headers: headers(key),
    data: game,
  });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toEqual({ ...result, result: "replayed" });
  const conflict = await request.post("/api/v1/games", {
    headers: headers(key),
    data: { ...game, title: "Changed" },
  });
  expect(conflict.status()).toBe(409);
  expect((await conflict.json()).error.code).toBe("idempotency_conflict");
  const rotated = await provision(uploader);
  const rotatedReplay = await request.post("/api/v1/games", {
    headers: headers(key, rotated.secret),
    data: game,
  });
  expect(rotatedReplay.status()).toBe(200);
  expect((await rotatedReplay.json()).gameId).toBe(result.gameId);
  await admin
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hash(rotated.secret));
  expect(
    (
      await request.post("/api/v1/games", {
        headers: headers(key, rotated.secret),
        data: game,
      })
    ).status(),
  ).toBe(401);
  const other = await provision();
  const isolated = await request.post("/api/v1/games", {
    headers: headers(key, other.secret),
    data: game,
  });
  expect(isolated.status()).toBe(201);
  expect((await isolated.json()).gameId).not.toBe(result.gameId);
});

test("operator revoke and release report success only for matching rows", async ({
  request,
}) => {
  const target = await provision();
  const run = (...args: string[]) =>
    spawnSync(
      "node_modules/.bin/tsx",
      ["scripts/game-upload-admin.ts", ...args],
      { env: process.env, encoding: "utf8" },
    );
  const missingToken = run("revoke", hash(token()));
  expect(missingToken.status).not.toBe(0);
  expect(missingToken.stdout).not.toContain("Token revoked");
  const post = () =>
    request.post("/api/v1/games", {
      headers: headers(randomUUID(), target.secret),
      data: game,
    });
  expect((await post()).status()).toBe(201);
  const revoked = run("revoke", hash(target.secret));
  expect(revoked.status).toBe(0);
  expect(revoked.stdout).toContain("Token revoked");
  expect((await post()).status()).toBe(401);
  expect(run("revoke", hash(target.secret)).status).toBe(0);

  const ownKey = randomUUID();
  const otherKey = randomUUID();
  expect(
    (
      await admin.from("game_upload_reservations").insert([
        { uploader_id: target.id, key: ownKey },
        { uploader_id: uploader, key: otherKey },
      ])
    ).error,
  ).toBeNull();
  expect(
    (
      await admin
        .from("api_clients")
        .update({ enabled: false })
        .eq("id", target.id)
    ).error,
  ).toBeNull();
  const release = (key: string) =>
    run(
      "release",
      target.id!,
      key,
      "--write",
      "--reason",
      "Disposable test reservation",
    );
  for (const key of [randomUUID(), otherKey]) {
    const missing = release(key);
    expect(missing.status).not.toBe(0);
    expect(missing.stdout).not.toContain('"released"');
  }
  const released = release(ownKey);
  expect(released.status).toBe(0);
  expect(JSON.parse(released.stdout).released).toBe(ownKey);
  expect(release(ownKey).status).not.toBe(0);
  const remaining = await admin
    .from("game_upload_reservations")
    .select("uploader_id,key")
    .in("key", [ownKey, otherKey]);
  expect(remaining.error).toBeNull();
  expect(remaining.data).toEqual([{ uploader_id: uploader, key: otherKey }]);
});

test("API token scopes are checked before both new uploads and replays", async ({
  request,
}) => {
  const secret = token();
  const tokenHash = hash(secret);
  const key = randomUUID();
  // No implicit permissions: a generic API token defaults to no scopes.
  expect(
    (
      await admin
        .from("api_tokens")
        .insert({ client_id: uploader, token_hash: tokenHash })
    ).error,
  ).toBeNull();
  const post = () =>
    request.post("/api/v1/games", {
      headers: headers(key, secret),
      data: game,
    });
  expect((await post()).status()).toBe(401);
  await admin
    .from("api_tokens")
    .update({ scopes: ["future:read"] })
    .eq("token_hash", tokenHash);
  expect((await post()).status()).toBe(401);
  const denied = await admin.rpc("upload_game", {
    p_token_hash: tokenHash,
    p_key: key,
    p_game: game,
    p_content_hash: fixture.contentHash,
  });
  expect(denied.error).toBeNull();
  expect(denied.data).toEqual({ error: "unauthorized" });
  expect(
    (
      await admin
        .from("game_upload_receipts")
        .select("key")
        .eq("uploader_id", uploader)
        .eq("key", key)
    ).data,
  ).toEqual([]);
  await admin
    .from("api_tokens")
    .update({ scopes: ["games:upload"] })
    .eq("token_hash", tokenHash);
  expect((await post()).status()).toBe(201);
  await admin
    .from("api_tokens")
    .update({ scopes: [] })
    .eq("token_hash", tokenHash);
  expect((await post()).status()).toBe(401);
  const deniedReplay = await admin.rpc("upload_game", {
    p_token_hash: tokenHash,
    p_key: key,
    p_game: game,
    p_content_hash: fixture.contentHash,
  });
  expect(deniedReplay.data).toEqual({ error: "unauthorized" });
});

test("concurrent first requests create exactly one complete game", async ({
  request,
}) => {
  const key = randomUUID();
  const responses = await Promise.all(
    Array.from({ length: 12 }, () =>
      request.post("/api/v1/games", { headers: headers(key), data: game }),
    ),
  );
  expect(
    responses.filter((response) => response.status() === 201),
  ).toHaveLength(1);
  expect(
    responses.filter((response) => response.status() === 200),
  ).toHaveLength(11);
  const bodies = await Promise.all(
    responses.map((response) => response.json()),
  );
  expect(new Set(bodies.map((body) => body.gameId)).size).toBe(1);
  const snapshot = await admin.rpc("game_upload_snapshot", {
    p_game_id: bodies[0].gameId,
  });
  expect(snapshot.error).toBeNull();
  expect(normalizeGame(snapshot.data)).toEqual(game);
  const conflictKey = randomUUID();
  const conflicting = await Promise.all(
    [game, { ...game, title: "Concurrent conflict" }].map((data) =>
      request.post("/api/v1/games", { headers: headers(conflictKey), data }),
    ),
  );
  expect(conflicting.map((response) => response.status()).sort()).toEqual([
    201, 409,
  ]);
});

test("a late clue insert failure rolls back game, categories, clues and receipt", async ({
  request,
}) => {
  const key = randomUUID();
  const title = `Rollback ${randomUUID()}`;
  const invalid = structuredClone(game);
  invalid.title = title;
  // Deliberately bypass HTTP validation to force a database failure after a
  // valid clue has already been inserted by the shared transaction function.
  const broken = JSON.parse(JSON.stringify(invalid));
  broken.boards[0].categories[0].clues[1].answer = null;
  const counts = await Promise.all(
    ["games", "categories", "clues"].map((table) =>
      admin.from(table as "games").select("id", { count: "exact", head: true }),
    ),
  );
  const failed = await admin.rpc("upload_game", {
    p_token_hash: hash(credential),
    p_key: key,
    p_game: broken,
    p_content_hash: gameContentHash(invalid),
  });
  expect(failed.error).not.toBeNull();
  const after = await Promise.all(
    ["games", "categories", "clues"].map((table) =>
      admin.from(table as "games").select("id", { count: "exact", head: true }),
    ),
  );
  expect(after.map((entry) => entry.count)).toEqual(
    counts.map((entry) => entry.count),
  );
  const receipts = await admin
    .from("game_upload_receipts")
    .select("key")
    .eq("uploader_id", uploader)
    .eq("key", key);
  expect(receipts.data).toEqual([]);
  const fixed = await request.post("/api/v1/games", {
    headers: headers(key),
    data: invalid,
  });
  expect(fixed.status()).toBe(201);
});

test("reserved keys fail closed and operator reconciliation only attaches equivalent content", async ({
  request,
}) => {
  const key = randomUUID();
  await admin
    .from("game_upload_reservations")
    .insert({ uploader_id: uploader, key });
  const blocked = await request.post("/api/v1/games", {
    headers: headers(key),
    data: game,
  });
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).error.code).toBe("reconciliation_required");
  const legacy = structuredClone(game);
  legacy.boards[0].categories[0].clues.reverse();
  const existing = await admin.rpc("create_game", {
    p_game: legacy,
    p_visibility: "PUBLIC",
  });
  expect(existing.error).toBeNull();
  const dir = mkdtempSync(join(tmpdir(), "jep-reconcile-"));
  const file = join(dir, "mappings.json");
  const run = (...args: string[]) =>
    execFileSync(
      "node_modules/.bin/tsx",
      ["scripts/game-upload-admin.ts", "reconcile", uploader, file, ...args],
      { env: process.env, encoding: "utf8", stdio: "pipe" },
    );
  try {
    const unreservedKey = randomUUID();
    writeFileSync(
      file,
      JSON.stringify([
        { idempotencyKey: unreservedKey, gameId: existing.data, game },
      ]),
    );
    expect(() => run()).toThrow(/Key is not reserved/);
    expect(() => run("--write")).toThrow(/Key is not reserved/);
    const snapshot = await admin.rpc("game_upload_snapshot", {
      p_game_id: existing.data!,
    });
    expect(snapshot.error).toBeNull();
    const other = await provision();
    for (const [clientId, candidateKey] of [
      [uploader, unreservedKey],
      [other.id!, key],
    ]) {
      const unreserved = await admin.rpc("reconcile_game_upload", {
        p_uploader: clientId,
        p_key: candidateKey,
        p_game_id: existing.data!,
        p_expected_snapshot: snapshot.data!,
        p_game: game,
        p_content_hash: fixture.contentHash,
      });
      expect(unreserved.error?.message).toContain("Key is not reserved");
      const receipts = await admin
        .from("game_upload_receipts")
        .select("key")
        .eq("uploader_id", clientId)
        .eq("key", candidateKey);
      expect(receipts.error).toBeNull();
      expect(receipts.data).toEqual([]);
    }
    writeFileSync(
      file,
      JSON.stringify([
        {
          idempotencyKey: key,
          gameId: existing.data,
          game: { ...game, title: "Conflicting existing content" },
        },
      ]),
    );
    expect(() => run("--write")).toThrow();
    expect(
      (
        await admin
          .from("game_upload_receipts")
          .select("key")
          .eq("uploader_id", uploader)
          .eq("key", key)
      ).data,
    ).toEqual([]);
    writeFileSync(
      file,
      JSON.stringify([{ idempotencyKey: key, gameId: existing.data, game }]),
    );
    expect(run()).toContain("verified_preview");
    expect(
      (
        await request.post("/api/v1/games", {
          headers: headers(key),
          data: game,
        })
      ).status(),
    ).toBe(409);
    expect(run("--write")).toContain("reconciled");
    const replay = await request.post("/api/v1/games", {
      headers: headers(key),
      data: game,
    });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).gameId).toBe(existing.data);
    expect(run("--write")).toContain("reconciled");
    const stale = await admin.rpc("reconcile_game_upload", {
      p_uploader: uploader,
      p_key: key,
      p_game_id: existing.data!,
      p_expected_snapshot: game,
      p_game: game,
      p_content_hash: fixture.contentHash,
    });
    expect(stale.error?.message).toContain("Existing game changed");
    await admin.from("games").delete().eq("id", existing.data!);
    const deleted = await request.post("/api/v1/games", {
      headers: headers(key),
      data: game,
    });
    expect(deleted.status()).toBe(409);
    expect((await deleted.json()).error.code).toBe("game_deleted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("database-invalid text returns 422 without consuming an upload key", async ({
  request,
}) => {
  const key = randomUUID();
  for (const text of ["\0", "\uD800", "\uDFFF"]) {
    const invalid = structuredClone(game);
    invalid.boards[0].categories[0].clues[0].answer = `Invalid ${text}`;
    const response = await request.post("/api/v1/games", {
      headers: headers(key),
      data: invalid,
    });
    expect(response.status()).toBe(422);
    expect((await response.json()).error).toMatchObject({
      code: "invalid_game",
      issues: [
        expect.objectContaining({
          path: ["boards", 0, "categories", 0, "clues", 0, "answer"],
        }),
      ],
    });
  }
  const receipts = await admin
    .from("game_upload_receipts")
    .select("key")
    .eq("uploader_id", uploader)
    .eq("key", key);
  expect(receipts.error).toBeNull();
  expect(receipts.data).toEqual([]);
  const valid = { ...game, note: "Café 中文 🎉" };
  const response = await request.post("/api/v1/games", {
    headers: headers(key),
    data: valid,
  });
  expect(response.status()).toBe(201);
  const snapshot = await admin.rpc("game_upload_snapshot", {
    p_game_id: (await response.json()).gameId,
  });
  expect(snapshot.error).toBeNull();
  expect(normalizeGame(snapshot.data)).toEqual(valid);
});

test("structured HTTP errors and privileged RPC/table isolation", async ({
  request,
}) => {
  expect((await request.get("/api/v1/games")).status()).toBe(405);
  expect((await request.post("/api/v1/games", { data: game })).status()).toBe(
    401,
  );
  expect(
    (
      await request.post("/api/v1/games", {
        headers: headers(randomUUID(), token()),
        data: game,
      })
    ).status(),
  ).toBe(401);
  const missingKey = await request.post("/api/v1/games", {
    headers: { Authorization: `Bearer ${credential}` },
    data: game,
  });
  expect(missingKey.status()).toBe(400);
  const malformed = await request.post("/api/v1/games", {
    headers: { ...headers(randomUUID()), "Content-Type": "application/json" },
    data: Buffer.from("{"),
  });
  expect((await malformed.json()).error.code).toBe("invalid_json");
  const invalid = await request.post("/api/v1/games", {
    headers: headers(randomUUID()),
    data: { ...game, boards: [] },
  });
  expect(invalid.status()).toBe(422);
  expect((await invalid.json()).error.issues.length).toBeGreaterThan(0);
  expect(
    (
      await request.post("/api/v1/games", {
        headers: headers(randomUUID()),
        data: "text",
      })
    ).status(),
  ).toBe(415);
  const huge = await request.post("/api/v1/games", {
    headers: headers(randomUUID()),
    data: { ...game, note: "x".repeat(1_000_001) },
  });
  expect(huge.status()).toBe(413);
  const streamedStatus = await new Promise<number>((resolve, reject) => {
    const upload = httpRequest(
      new URL("/api/v1/games", process.env.BASE_URL!),
      {
        method: "POST",
        headers: {
          ...headers(randomUUID()),
          "Content-Type": "application/json",
          "Transfer-Encoding": "chunked",
        },
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode!));
      },
    );
    upload.on("error", reject);
    upload.end(JSON.stringify({ ...game, note: "x".repeat(1_000_001) }));
  });
  expect(streamedStatus).toBe(413);
  expect(
    (
      await anon.rpc("create_game", {
        p_game: game,
        p_visibility: "PUBLIC",
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await anon.rpc("upload_game", {
        p_game: game,
        p_key: "x",
        p_token_hash: hash(credential),
        p_content_hash: fixture.contentHash,
      })
    ).error,
  ).not.toBeNull();
  expect((await anon.from("api_tokens").select()).error).not.toBeNull();
  await admin.from("api_clients").update({ enabled: false }).eq("id", uploader);
  expect(
    (
      await request.post("/api/v1/games", {
        headers: headers(randomUUID()),
        data: game,
      })
    ).status(),
  ).toBe(401);
  await admin.from("api_clients").update({ enabled: true }).eq("id", uploader);
});
