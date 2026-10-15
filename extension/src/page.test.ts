import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runInPage } from "./page";

interface FakeVideo {
  currentTime: number;
  duration: number;
  ended: boolean;
  play: () => Promise<void>;
}

let video: FakeVideo | null;
let adShowing: boolean;

function setUrl(search: string, pathname = "/watch") {
  vi.stubGlobal("location", { search, pathname });
}

beforeEach(() => {
  vi.useFakeTimers();
  video = { currentTime: 0, duration: 100, ended: false, play: vi.fn(async () => {}) };
  adShowing = false;
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    querySelector: (selector: string) => {
      if (selector === "video.html5-main-video") return video;
      if (selector === ".ad-showing") return adShowing ? {} : null;
      return null;
    },
  });
  setUrl("?v=abc");
});

afterEach(() => {
  runInPage({ type: "loop", videoId: "abc", range: null });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const startLoop = (start = 10, end = 20) =>
  runInPage({ type: "loop", videoId: "abc", range: { start, end } });

describe("read", () => {
  it("reports the watch id, the current time and the duration", () => {
    video!.currentTime = 42.5;
    expect(runInPage({ type: "read" })).toEqual({ videoId: "abc", time: 42.5, duration: 100 });
  });

  it("reads the id from a shorts path", () => {
    setUrl("", "/shorts/xyz");
    expect(runInPage({ type: "read" }).videoId).toBe("xyz");
  });

  it("reports nulls when there is no video or id", () => {
    video = null;
    setUrl("", "/");
    expect(runInPage({ type: "read" })).toEqual({ videoId: null, time: null, duration: null });
  });

  it("hides the time and duration while an ad plays", () => {
    adShowing = true;
    video!.currentTime = 7;
    expect(runInPage({ type: "read" })).toEqual({ videoId: "abc", time: null, duration: null });
  });

  it("reports no duration for a live stream", () => {
    video!.duration = Infinity;
    expect(runInPage({ type: "read" }).duration).toBeNull();
  });

  it("reports no duration before the video has loaded", () => {
    video!.duration = NaN;
    expect(runInPage({ type: "read" }).duration).toBeNull();
  });
});

describe("loop", () => {
  it("jumps back to start once the video passes the end", () => {
    startLoop();
    video!.currentTime = 20.05;
    vi.advanceTimersByTime(100);
    expect(video!.currentTime).toBe(10);
  });

  it("pulls a video that sits before the start up to the start", () => {
    startLoop();
    video!.currentTime = 3;
    vi.advanceTimersByTime(100);
    expect(video!.currentTime).toBe(10);
  });

  it("leaves playback alone inside the range", () => {
    startLoop();
    video!.currentTime = 15;
    vi.advanceTimersByTime(500);
    expect(video!.currentTime).toBe(15);
  });

  it("does nothing after the page moves to another video", () => {
    startLoop();
    setUrl("?v=other");
    video!.currentTime = 25;
    vi.advanceTimersByTime(100);
    expect(video!.currentTime).toBe(25);
  });

  it("resumes when the page comes back to the looped video", () => {
    startLoop();
    setUrl("?v=other");
    vi.advanceTimersByTime(300);
    setUrl("?v=abc");
    video!.currentTime = 25;
    vi.advanceTimersByTime(100);
    expect(video!.currentTime).toBe(10);
  });

  it("does not seek while an ad plays", () => {
    startLoop();
    adShowing = true;
    video!.currentTime = 25;
    vi.advanceTimersByTime(100);
    expect(video!.currentTime).toBe(25);
  });

  it("restarts a video that ended before an end time past its length", () => {
    startLoop(10, 500);
    video!.currentTime = 100;
    video!.ended = true;
    vi.advanceTimersByTime(100);
    expect(video!.currentTime).toBe(10);
    expect(video!.play).toHaveBeenCalled();
  });

  it("keeps ticking when the video element is missing", () => {
    startLoop();
    video = null;
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
  });

  it("stops looping when the range is cleared", () => {
    startLoop();
    runInPage({ type: "loop", videoId: "abc", range: null });
    video!.currentTime = 25;
    vi.advanceTimersByTime(500);
    expect(video!.currentTime).toBe(25);
  });

  it("replaces the old loop instead of stacking a second one", () => {
    startLoop(10, 20);
    startLoop(50, 60);
    video!.currentTime = 25;
    vi.advanceTimersByTime(100);
    expect(video!.currentTime).toBe(50);
    expect(vi.getTimerCount()).toBe(1);
  });
});
