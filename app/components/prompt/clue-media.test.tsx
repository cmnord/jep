import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaBlock } from "~/utils/media";

import { AudioPlayer, PlayableMedia, VideoPlayer } from "./clue-media";
import { ClueText } from "./prompt";

// React only enables act() warnings handling when this flag is set.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const AUDIO: MediaBlock = { type: "audio", src: "https://a.example/s.mp3" };
const VIDEO: MediaBlock = { type: "video", src: "https://a.example/v.mp4" };
const YOUTUBE: MediaBlock = {
  type: "video",
  src: "https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=1m",
};
const IMAGE: MediaBlock = {
  type: "image",
  src: "https://a.example/p.png",
  alt: "A picture",
};

let container: HTMLDivElement;
let root: Root;
let play: Mock<() => Promise<void>>;
let pause: Mock<() => void>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  pause = vi.fn<() => void>();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render(ui: React.ReactNode) {
  act(() => root.render(ui));
}

describe("AudioPlayer", () => {
  it("renders a big play button and the audio element", () => {
    render(<AudioPlayer block={AUDIO} autoPlay={false} />);
    const audio = container.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe(AUDIO.src);
    expect(audio?.hasAttribute("controls")).toBe(false);
    expect(
      container.querySelector('button[aria-label="Play audio"]'),
    ).not.toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it("autoplays once and never again on re-render", () => {
    render(<AudioPlayer block={AUDIO} autoPlay />);
    render(<AudioPlayer block={AUDIO} autoPlay />);
    render(<AudioPlayer block={AUDIO} autoPlay />);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("stops playback when it unmounts (the clue closes)", () => {
    render(<AudioPlayer block={AUDIO} autoPlay />);
    expect(pause).not.toHaveBeenCalled();
    render(null);
    expect(pause).toHaveBeenCalled();
  });

  it("falls back to tap-to-play when the browser blocks autoplay", async () => {
    play.mockImplementation(() =>
      Promise.reject(new DOMException("blocked", "NotAllowedError")),
    );
    render(<AudioPlayer block={AUDIO} autoPlay />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Tap to play audio");
  });

  it("plays when the button is tapped", () => {
    render(<AudioPlayer block={AUDIO} autoPlay={false} />);
    const button = container.querySelector("button");
    act(() => button?.click());
    expect(play).toHaveBeenCalledTimes(1);
  });
});

describe("VideoPlayer", () => {
  it("renders an inline video with controls", () => {
    render(<VideoPlayer block={VIDEO} autoPlay={false} />);
    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toBe(VIDEO.src);
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(video?.hasAttribute("playsinline")).toBe(true);
  });
});

describe("PlayableMedia", () => {
  it("renders YouTube links as a privacy-enhanced embed", () => {
    // happy-dom logs that it skipped loading the iframe (see vitest config).
    render(<PlayableMedia blocks={[YOUTUBE]} autoPlay={false} />);
    const iframe = container.querySelector("iframe");
    const src = new URL(iframe?.getAttribute("src") ?? "");
    expect(src.origin).toBe("https://www.youtube-nocookie.com");
    expect(src.pathname).toBe("/embed/aqz-KE-bpKQ");
    expect(src.searchParams.get("start")).toBe("60");
    expect(src.searchParams.has("autoplay")).toBe(false);
  });

  it("skips images and autoplays only the first clip", () => {
    render(<PlayableMedia blocks={[IMAGE, AUDIO, VIDEO]} autoPlay />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("audio")).not.toBeNull();
    expect(container.querySelector("video")).not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
  });
});

describe("ClueText", () => {
  it("puts pictures inside the buzz button and players outside it", () => {
    render(
      <ClueText
        answer="Answer"
        canBuzz
        clue=""
        focusOnBuzz={false}
        onBuzz={() => null}
        showAnswer={false}
        media={[IMAGE, AUDIO]}
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(IMAGE.src);
    expect(img?.getAttribute("alt")).toBe("A picture");
    expect(img?.closest("button")).not.toBeNull();

    const audio = container.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe(AUDIO.src);
    // The play button must not be nested in (or trigger) the buzz button.
    const playButton = container.querySelector(
      'button[aria-label="Play audio"]',
    );
    expect(playButton?.parentElement?.closest("button")).toBeNull();
  });

  it("renders a text clue without media as before", () => {
    render(
      <ClueText
        answer="Answer"
        canBuzz
        clue="Some clue"
        focusOnBuzz={false}
        onBuzz={() => null}
        showAnswer={false}
      />,
    );
    expect(container.textContent).toContain("Some clue");
    expect(container.querySelector("[data-testid=clue-media]")).toBeNull();
  });
});

describe("host replay (feature 23)", () => {
  it("restarts the first clip when the replay count goes up, not at mount", () => {
    render(
      <PlayableMedia
        blocks={[AUDIO, VIDEO]}
        autoPlay={false}
        replayNonce={2}
      />,
    );
    expect(play).not.toHaveBeenCalled();
    const [audio, video] =
      container.querySelectorAll<HTMLMediaElement>("audio, video");
    audio.currentTime = 12;
    video.currentTime = 7;

    render(
      <PlayableMedia
        blocks={[AUDIO, VIDEO]}
        autoPlay={false}
        replayNonce={3}
      />,
    );
    expect(play).toHaveBeenCalledTimes(1);
    expect(play.mock.contexts[0]).toBe(audio);
    expect(audio.currentTime).toBe(0);
    expect(video.currentTime).toBe(7);

    // Re-rendering with the same count doesn't replay again.
    render(
      <PlayableMedia
        blocks={[AUDIO, VIDEO]}
        autoPlay={false}
        replayNonce={3}
      />,
    );
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("restarts a video clip", () => {
    render(<VideoPlayer block={VIDEO} autoPlay={false} replayNonce={0} />);
    render(<VideoPlayer block={VIDEO} autoPlay={false} replayNonce={1} />);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("reloads a YouTube player with autoplay", () => {
    render(
      <PlayableMedia blocks={[YOUTUBE]} autoPlay={false} replayNonce={0} />,
    );
    const before = container.querySelector("iframe")?.getAttribute("src");
    expect(before).not.toContain("autoplay=1");
    render(
      <PlayableMedia blocks={[YOUTUBE]} autoPlay={false} replayNonce={1} />,
    );
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain(
      "autoplay=1",
    );
  });
});
