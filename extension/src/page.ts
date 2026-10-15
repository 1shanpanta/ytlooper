import type { LoopRange } from "./clip";

export type PageCommand =
  | { type: "read" }
  | { type: "loop"; videoId: string; range: LoopRange | null };

export interface PlayerState {
  videoId: string | null;
  time: number | null;
}

/**
 * Runs inside the YouTube tab through chrome.scripting.executeScript.
 * Chrome serializes this function by source, so it must not reference
 * anything outside its own body (no imports, no module-level helpers).
 */
export function runInPage(command: PageCommand): PlayerState {
  const mainVideo = () =>
    document.querySelector<HTMLVideoElement>("video.html5-main-video");
  const currentVideoId = () => {
    const watchId = new URLSearchParams(location.search).get("v");
    if (watchId) return watchId;
    return location.pathname.startsWith("/shorts/")
      ? location.pathname.split("/")[2] || null
      : null;
  };
  const page = window as unknown as { __ytlooper?: number };

  if (command.type === "loop") {
    if (page.__ytlooper !== undefined) window.clearInterval(page.__ytlooper);
    page.__ytlooper = undefined;
    const { range, videoId } = command;
    if (range) {
      // YouTube reuses one <video> across navigation, so the loop checks the
      // id each tick. Seeking during an ad would break the ad, so it skips them.
      page.__ytlooper = window.setInterval(() => {
        const video = mainVideo();
        if (!video || currentVideoId() !== videoId) return;
        if (document.querySelector(".ad-showing")) return;
        if (video.currentTime >= range.end || video.currentTime < range.start) {
          video.currentTime = range.start;
        }
      }, 100);
    }
  }

  return { videoId: currentVideoId(), time: mainVideo()?.currentTime ?? null };
}
