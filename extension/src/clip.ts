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

const asTime = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

/** Rebuilds a clip from untrusted storage data so the UI never shows NaN. */
export function sanitizeClip(raw: unknown): Clip {
  if (typeof raw !== "object" || raw === null) return EMPTY_CLIP;
  const data = raw as Record<string, unknown>;
  return {
    start: asTime(data.start),
    end: asTime(data.end),
    enabled: typeof data.enabled === "boolean" ? data.enabled : true,
  };
}

export function hasInvalidRange(clip: Clip): boolean {
  return clip.start !== null && clip.end !== null && clip.end <= clip.start;
}

/** The range the page should loop, or null when the loop must stay off. */
export function loopRange(clip: Clip): LoopRange | null {
  if (!clip.enabled || clip.start === null || clip.end === null) return null;
  return hasInvalidRange(clip) ? null : { start: clip.start, end: clip.end };
}
