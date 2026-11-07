import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeXhr, installFakeXhr } from "~/test-fixtures/fake-xhr";

import {
  UPLOAD_PROGRESS_HEADER,
  UploadError,
  uploadWithProgress,
} from "./upload-with-progress";

let restore: () => void;
beforeEach(() => {
  restore = installFakeXhr();
});
afterEach(() => restore());

function start() {
  const onProgress = vi.fn();
  const onUploaded = vi.fn();
  const body = new FormData();
  const upload = uploadWithProgress("/game?redirectTo=/", body, {
    onProgress,
    onUploaded,
  });
  return { upload, onProgress, onUploaded, body, xhr: FakeXhr.instances[0] };
}

describe("uploadWithProgress", () => {
  it("posts the body with the progress header", () => {
    const { xhr, body } = start();
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/game?redirectTo=/");
    expect(xhr.body).toBe(body);
    expect(xhr.headers[UPLOAD_PROGRESS_HEADER]).toBe("1");
  });

  it("reports progress, then the end of the upload, then the result", async () => {
    const { xhr, upload, onProgress, onUploaded } = start();
    xhr.progress(25, 100);
    expect(onProgress).toHaveBeenLastCalledWith(25, 100);
    xhr.progress(100, 100);
    expect(onUploaded).not.toHaveBeenCalled();
    xhr.uploaded();
    expect(onUploaded).toHaveBeenCalledTimes(1);
    xhr.respond(200, JSON.stringify({ redirectTo: "/" }));
    await expect(upload.promise).resolves.toEqual({ redirectTo: "/" });
  });

  it("resolves with the redirect for error results the server flashed", async () => {
    const { xhr, upload } = start();
    xhr.respond(400, JSON.stringify({ redirectTo: "/profile" }));
    await expect(upload.promise).resolves.toEqual({ redirectTo: "/profile" });
  });

  it("rejects with a server error when the response is not ours", async () => {
    const { xhr, upload } = start();
    xhr.respond(413, "<html>Request Entity Too Large</html>");
    await expect(upload.promise).rejects.toEqual(
      new UploadError("server", 413),
    );
  });

  it("rejects with a network error", async () => {
    const { xhr, upload } = start();
    xhr.fail();
    await expect(upload.promise).rejects.toEqual(new UploadError("network"));
  });

  it("can be aborted", async () => {
    const { xhr, upload } = start();
    upload.abort();
    expect(xhr.aborted).toBe(true);
    await expect(upload.promise).rejects.toEqual(new UploadError("aborted"));
  });
});
