export interface Clip {
  start: number | null;
  end: number | null;
  enabled: boolean;
}

export interface LoopRange {
  start: number;
  end: number;
}

export const EMPTY_CLIP: Clip = { start: null, end: null, enabled: true };

export function hasInvalidRange(clip: Clip): boolean {
  return clip.start !== null && clip.end !== null && clip.end <= clip.start;
}

/** The range the page should loop, or null when the loop must stay off. */
export function loopRange(clip: Clip): LoopRange | null {
  if (!clip.enabled || clip.start === null || clip.end === null) return null;
  return hasInvalidRange(clip) ? null : { start: clip.start, end: clip.end };
}
