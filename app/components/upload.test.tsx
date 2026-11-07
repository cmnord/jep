import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createRoutesStub, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider, type Locale } from "~/i18n";
import { FakeXhr, installFakeXhr } from "~/test-fixtures/fake-xhr";

import Upload from "./upload";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;
let restoreXhr: () => void;
let onUploadStart: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  restoreXhr = installFakeXhr();
  onUploadStart = vi.fn<() => void>();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  restoreXhr();
});

function Page({ loggedIn }: { loggedIn: boolean }) {
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const location = useLocation();
  return (
    <>
      <p data-testid="location">{location.pathname + location.search}</p>
      <Upload
        formRef={formRef}
        loggedIn={loggedIn}
        redirectTo="/"
        onUploadStart={onUploadStart}
      />
    </>
  );
}

function render({
  loggedIn = true,
  locale = "en",
}: { loggedIn?: boolean; locale?: Locale } = {}) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <I18nProvider locale={locale}>
          <Page loggedIn={loggedIn} />
        </I18nProvider>
      ),
    },
  ]);
  act(() => root.render(<Stub initialEntries={["/?q=old"]} />));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** wait lets timers (the overlay's show delay) and promises run. */
async function wait(ms = 0) {
  await act(async () => {
    await sleep(ms);
  });
}

function chooseFile(name = "pack.siq", size = 2 * 1024 * 1024) {
  const input = container.querySelector<HTMLInputElement>("#upload")!;
  const file = new File([new Uint8Array(size)], name);
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  return file;
}

function sentFile(xhr: FakeXhr) {
  if (!(xhr.body instanceof FormData)) throw new Error("expected FormData");
  return xhr.body.get("upload");
}

const overlay = () => document.querySelector('[role="dialog"]');
const progressbar = () =>
  document.querySelector<HTMLElement>('[role="progressbar"]');
const status = () => container.querySelector('[role="status"]')?.textContent;
const alertText = () => container.querySelector('[role="alert"]')?.textContent;
const location = () =>
  container.querySelector('[data-testid="location"]')?.textContent;
function button(name: RegExp) {
  return Array.from(document.querySelectorAll("button")).find((b) =>
    name.test(b.textContent ?? ""),
  );
}

describe("Upload progress", () => {
  it("uploads with progress, then shows the importing stage, then navigates", async () => {
    render();
    const file = chooseFile();
    expect(onUploadStart).toHaveBeenCalledTimes(1);
    expect(FakeXhr.instances).toHaveLength(1);
    const xhr = FakeXhr.instances[0];
    expect(xhr.url).toBe("/game?redirectTo=/");
    expect(sentFile(xhr)).toEqual(file);
    expect(status()).toBe("Uploading pack.siq…");

    // The overlay waits a moment so quick uploads don't flash.
    expect(overlay()).toBeNull();
    await wait(350);
    expect(overlay()?.textContent).toContain("pack.siq");
    expect(overlay()?.textContent).toContain("2.0 MB");
    expect(progressbar()?.getAttribute("aria-valuenow")).toBe("0");

    act(() => xhr.progress(512 * 1024, 2 * 1024 * 1024));
    expect(progressbar()?.getAttribute("aria-valuenow")).toBe("25");
    expect(overlay()?.textContent).toContain("25%");
    expect(overlay()?.textContent).toContain("512.0 KB of 2.0 MB");
    expect(button(/cancel upload/i)).toBeDefined();

    act(() => {
      xhr.progress(2 * 1024 * 1024, 2 * 1024 * 1024);
      xhr.uploaded();
    });
    expect(overlay()?.textContent).toContain("Importing the pack…");
    expect(overlay()?.textContent).toMatch(/large packs can take a minute/);
    expect(progressbar()?.hasAttribute("aria-valuenow")).toBe(false);
    expect(button(/cancel upload/i)).toBeUndefined();
    expect(status()).toBe("Upload complete. Importing the pack…");

    // Another file can't be submitted meanwhile.
    expect(container.querySelector<HTMLInputElement>("#upload")?.disabled).toBe(
      true,
    );

    act(() => xhr.respond(200, JSON.stringify({ redirectTo: "/" })));
    await wait(600);
    expect(location()).toBe("/");
    expect(overlay()).toBeNull();
    expect(container.querySelector<HTMLInputElement>("#upload")?.disabled).toBe(
      false,
    );
  });

  it("skips the overlay for quick uploads", async () => {
    render();
    chooseFile("game.jep.json", 1000);
    const xhr = FakeXhr.instances[0];
    act(() => {
      xhr.uploaded();
      xhr.respond(200, JSON.stringify({ redirectTo: "/" }));
    });
    await wait(400);
    expect(overlay()).toBeNull();
    expect(location()).toBe("/");
  });

  it("says Saving the game for JSON games", async () => {
    render();
    chooseFile("game.jep.json", 1000);
    act(() => FakeXhr.instances[0].uploaded());
    await wait(350);
    expect(overlay()?.textContent).toContain("Saving the game…");
  });

  it("can be canceled during the upload", async () => {
    render();
    chooseFile();
    await wait(350);
    act(() => button(/cancel upload/i)?.click());
    expect(FakeXhr.instances[0].aborted).toBe(true);
    await wait();
    expect(overlay()).toBeNull();
    expect(alertText()).toBeUndefined();
    expect(status()).toBe("Upload canceled.");
  });

  it("shows a network error and retries the same file", async () => {
    render();
    const file = chooseFile();
    await wait(350);
    act(() => FakeXhr.instances[0].fail());
    await wait();
    expect(overlay()).toBeNull();
    expect(alertText()).toMatch(/connection was lost/);
    expect(location()).toBe("/?q=old");

    act(() => button(/try again/i)?.click());
    expect(FakeXhr.instances).toHaveLength(2);
    expect(sentFile(FakeXhr.instances[1])).toEqual(file);
    expect(alertText()).toBeUndefined();
  });

  it("shows the status of an unexpected server answer", async () => {
    render();
    chooseFile();
    act(() => FakeXhr.instances[0].respond(502, "<html>Bad gateway</html>"));
    await wait();
    expect(alertText()).toMatch(/error 502/);
  });

  it("asks guests first and uploads only after they confirm", async () => {
    render({ loggedIn: false });
    chooseFile();
    expect(FakeXhr.instances).toHaveLength(0);
    act(() => button(/upload publicly/i)?.click());
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it("is in Ukrainian", async () => {
    render({ locale: "uk" });
    chooseFile();
    await wait(350);
    expect(overlay()?.textContent).toContain("Завантажуємо…");
    act(() => FakeXhr.instances[0].uploaded());
    expect(overlay()?.textContent).toContain("Імпортуємо пакет…");
  });
});
