import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runInPage } from "./page";

interface FakeVideo {
  currentTime: number;
}

let video: FakeVideo | null;
let adShowing: boolean;

function setUrl(search: string, pathname = "/watch") {
  vi.stubGlobal("location", { search, pathname });
}

beforeEach(() => {
  vi.useFakeTimers();
  video = { currentTime: 0 };
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
  it("reports the watch id and the current time", () => {
    video!.currentTime = 42.5;
    expect(runInPage({ type: "read" })).toEqual({ videoId: "abc", time: 42.5 });
  });

  it("reads the id from a shorts path", () => {
    setUrl("", "/shorts/xyz");
    expect(runInPage({ type: "read" }).videoId).toBe("xyz");
  });

  it("reports nulls when there is no video or id", () => {
    video = null;
    setUrl("", "/");
    expect(runInPage({ type: "read" })).toEqual({ videoId: null, time: null });
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

  it("does not seek while an ad plays", () => {
    startLoop();
    adShowing = true;
    video!.currentTime = 25;
    vi.advanceTimersByTime(100);
    expect(video!.currentTime).toBe(25);
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
