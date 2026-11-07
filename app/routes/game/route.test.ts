import { RouterContextProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildSiq } from "~/test-fixtures/siq/build";

const mocks = vi.hoisted(() => ({
  getValidAuthSession: vi.fn(),
  createGame: vi.fn(),
  flashFormState:
    vi.fn<
      (
        request: Request,
        formState: { success: boolean; message: string; details?: string[] },
      ) => Promise<Headers>
    >(),
  upload: vi.fn(),
  removeAll: vi.fn(),
}));

vi.mock("varlock/env", () => ({ ENV: { BASE_URL: "https://jep.test" } }));
vi.mock("~/models/auth", () => ({
  getValidAuthSession: mocks.getValidAuthSession,
}));
vi.mock("~/models/game.server", () => ({ createGame: mocks.createGame }));
vi.mock("~/session.server", () => ({
  flashFormState: mocks.flashFormState,
}));
vi.mock("~/models/siq/media-store.server", () => ({
  createGameMediaStore: () => ({
    upload: mocks.upload,
    removeAll: mocks.removeAll,
  }),
}));

import { UPLOAD_PROGRESS_HEADER } from "~/utils/upload-with-progress";

import {
  MAX_JSON_SIZE,
  MAX_SIQ_SIZE,
  uploadKind,
} from "./file-upload-handler.server";
import { action } from "./route";

const JSON_GAME = JSON.stringify({
  title: "T",
  author: "A",
  copyright: "",
  note: "",
  boards: [
    {
      categoryNames: ["C"],
      categories: [
        { name: "C", clues: [{ clue: "Q", answer: "A", value: 1 }] },
      ],
    },
  ],
});

async function upload(file: File, headers?: HeadersInit) {
  const body = new FormData();
  body.append("upload", file);
  const request = new Request("http://localhost/game?redirectTo=/profile", {
    method: "POST",
    body,
    headers,
  });
  const response = await action({
    request,
    url: new URL(request.url),
    pattern: "/game",
    params: {},
    context: new RouterContextProvider(),
  });
  const formState = mocks.flashFormState.mock.calls.at(-1)?.[1];
  if (!(response instanceof Response)) throw new Error("expected a Response");
  return { response, formState };
}

describe("POST /game", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getValidAuthSession.mockResolvedValue(null);
    mocks.createGame.mockResolvedValue("game-1");
    mocks.flashFormState.mockResolvedValue(new Headers());
    mocks.upload.mockImplementation(
      async (name: string) => `https://storage.test/game-media/siq/x/${name}`,
    );
    mocks.removeAll.mockResolvedValue(undefined);
  });

  it("uploads a JSON game", async () => {
    const { response, formState } = await upload(
      new File([JSON_GAME], "game.jep.json", { type: "application/json" }),
    );
    expect(response.status).toBe(302);
    expect(mocks.createGame).toHaveBeenCalledWith(
      expect.objectContaining({ title: "T" }),
      "PUBLIC",
      undefined,
      undefined,
    );
    expect(formState).toEqual({
      success: true,
      message:
        "Created new public game. You may now view your game on the home page.",
    });
  });

  it("rejects JSON games over 1 MB", async () => {
    const big = JSON_GAME.replace(
      '"note":""',
      `"note":"${"x".repeat(MAX_JSON_SIZE)}"`,
    );
    const { response, formState } = await upload(
      new File([big], "game.jep.json", { type: "application/json" }),
    );
    expect(response.status).toBe(400);
    expect(formState?.message).toBe(
      "Error uploading game: JSON games must be at most 1 MB.",
    );
    expect(mocks.createGame).not.toHaveBeenCalled();
  });

  it("imports a SIGame pack and summarizes it", async () => {
    mocks.getValidAuthSession.mockResolvedValue({
      userId: "user-1",
      accessToken: "token",
    });
    const { response, formState } = await upload(
      new File([buildSiq("v5")], "test.siq", { type: "" }),
    );
    expect(response.status).toBe(302);
    expect(mocks.upload).toHaveBeenCalledTimes(5);
    const [game, visibility, userId] = mocks.createGame.mock.calls[0];
    expect(game.title).toBe("Test pack v5");
    expect(game.boards[0].categories[0].clues[0].media).toEqual([
      { type: "image", src: "https://storage.test/game-media/siq/x/0001.png" },
    ]);
    expect([visibility, userId]).toEqual(["UNLISTED", "user-1"]);
    expect(formState?.success).toBe(true);
    expect(formState?.message).toBe(
      'Imported SIGame pack "Test pack v5": 2 rounds, 4 categories, 10 questions, 5 media files. 2 questions skipped. 5 warnings. Created new unlisted game. You may now visit the link https://jep.test/game/game-1/play to play the new game.',
    );
    expect(formState?.details).toHaveLength(5);
    expect(mocks.removeAll).not.toHaveBeenCalled();
  });

  it("removes uploaded media when the game can't be saved", async () => {
    mocks.createGame.mockRejectedValue(new Error("database is down"));
    const { response, formState } = await upload(
      new File([buildSiq("v4")], "test.siq", { type: "application/zip" }),
    );
    expect(response.status).toBe(400);
    expect(formState?.message).toBe("Error uploading game: database is down");
    expect(mocks.removeAll).toHaveBeenCalled();
  });

  it("reports a broken pack", async () => {
    const { response, formState } = await upload(
      new File(["not a zip"], "broken.siq"),
    );
    expect(response.status).toBe(400);
    expect(formState?.message).toBe(
      "Error uploading game: The file is not a SIGame pack (not a zip).",
    );
  });

  it("answers in Ukrainian", async () => {
    const created = await upload(
      new File([JSON_GAME], "game.jep.json", { type: "application/json" }),
      { "Accept-Language": "uk" },
    );
    expect(created.formState?.message).toBe(
      "Нову публічну гру створено. Її вже видно на головній сторінці.",
    );

    const broken = await upload(new File(["not a zip"], "broken.siq"), {
      "Accept-Language": "uk",
    });
    expect(broken.formState?.message).toBe(
      "Не вдалося завантажити гру: Цей файл не є пакетом SIGame (це не zip-архів).",
    );

    const pack = await upload(
      new File([buildSiq("v5")], "test.siq", { type: "" }),
      { "Accept-Language": "uk-UA,uk;q=0.9" },
    );
    expect(pack.formState?.message).toMatch(
      /^Імпортовано пакет SIGame «Test pack v5»: 2 раунди, 4 категорії, 10 питань, 5 медіафайлів\./,
    );
    expect(pack.formState?.details?.[0]).toMatch(
      /файлу «missing.png» немає в пакеті\.$/,
    );
  });

  it("rejects other file types", async () => {
    const { response, formState } = await upload(
      new File(["x"], "notes.txt", { type: "text/plain" }),
    );
    expect(response.status).toBe(400);
    expect(formState?.message).toMatch(/Unsupported file/);
  });

  it("rejects files over the size limit", async () => {
    const { response, formState } = await upload(
      new File([new Uint8Array(MAX_SIQ_SIZE + 1)], "huge.siq"),
    );
    expect(response.status).toBe(400);
    expect(formState?.message).toMatch(/too large/);
  });
});

describe("POST /game from the progress upload", () => {
  const headers = { [UPLOAD_PROGRESS_HEADER]: "1" };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getValidAuthSession.mockResolvedValue(null);
    mocks.createGame.mockResolvedValue("game-1");
    mocks.flashFormState.mockResolvedValue(
      // (happy-dom hides Set-Cookie, so a stand-in header.)
      new Headers({ "X-Flash": "flash" }),
    );
  });

  it("answers with JSON instead of a redirect and still flashes the result", async () => {
    const { response, formState } = await upload(
      new File([JSON_GAME], "game.jep.json", { type: "application/json" }),
      headers,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
    expect(response.headers.get("X-Flash")).toBe("flash");
    expect(await response.json()).toEqual({ redirectTo: "/profile" });
    expect(formState?.success).toBe(true);
  });

  it("answers errors with JSON and status 400", async () => {
    const { response, formState } = await upload(
      new File(["not a zip"], "broken.siq"),
      headers,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ redirectTo: "/profile" });
    expect(formState?.message).toMatch(/not a SIGame pack/);
  });
});

describe("uploadKind", () => {
  it.each([
    [{ name: "a.siq", type: "" }, "siq"],
    [{ name: "A.SIQ", type: "application/octet-stream" }, "siq"],
    [{ name: "a.siq", type: "application/zip" }, "siq"],
    [{ name: "a.jep.json", type: "application/json" }, "json"],
    [{ name: "a.json", type: "" }, "json"],
    [{ name: "blob", type: "application/json" }, "json"],
    [{ name: "a.zip", type: "application/zip" }, undefined],
    [{ name: "a.txt", type: "text/plain" }, undefined],
  ])("%j -> %s", (file, kind) => {
    expect(uploadKind(file)).toBe(kind);
  });
});
