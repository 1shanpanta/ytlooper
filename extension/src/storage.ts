import { EMPTY_CLIP, type Clip } from "./clip";

const keyFor = (videoId: string) => `clip:${videoId}`;

export async function loadClip(videoId: string): Promise<Clip> {
  const key = keyFor(videoId);
  const stored = await chrome.storage.local.get(key);
  return { ...EMPTY_CLIP, ...(stored[key] as Partial<Clip> | undefined) };
}

export function saveClip(videoId: string, clip: Clip): Promise<void> {
  return chrome.storage.local.set({ [keyFor(videoId)]: clip });
}
