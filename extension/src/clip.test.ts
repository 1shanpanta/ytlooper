import { describe, expect, it } from "vitest";
import { EMPTY_CLIP, hasInvalidRange, loopRange, sanitizeClip } from "./clip";

describe("sanitizeClip", () => {
  it("keeps a valid clip", () => {
    expect(sanitizeClip({ start: 5, end: 9.5, enabled: false })).toEqual({
      start: 5,
      end: 9.5,
      enabled: false,
    });
  });

  it("falls back to an empty clip for non-objects", () => {
    for (const raw of [undefined, null, "x", 42, []]) {
      expect(sanitizeClip(raw), String(raw)).toEqual(EMPTY_CLIP);
    }
  });

  it("drops times that are not finite, non-negative numbers", () => {
    const clip = sanitizeClip({ start: "abc", end: -3, enabled: true });
    expect(clip.start).toBeNull();
    expect(clip.end).toBeNull();
    for (const bad of [NaN, Infinity, null, "5"]) {
      expect(sanitizeClip({ start: bad }).start, String(bad)).toBeNull();
    }
  });

  it("turns a non-boolean enabled flag back on", () => {
    expect(sanitizeClip({ start: 1, end: 2, enabled: "no" }).enabled).toBe(true);
  });
});

describe("loopRange", () => {
  it("returns the range when both ends are set and the loop is on", () => {
    expect(loopRange({ start: 10, end: 20, enabled: true })).toEqual({ start: 10, end: 20 });
  });

  it("returns null when the loop is off", () => {
    expect(loopRange({ start: 10, end: 20, enabled: false })).toBeNull();
  });

  it("returns null while a bound is missing", () => {
    expect(loopRange({ ...EMPTY_CLIP, start: 10 })).toBeNull();
    expect(loopRange({ ...EMPTY_CLIP, end: 20 })).toBeNull();
  });

  it("returns null when end is at or before start", () => {
    expect(loopRange({ start: 20, end: 20, enabled: true })).toBeNull();
    expect(loopRange({ start: 20, end: 10, enabled: true })).toBeNull();
  });
});

describe("hasInvalidRange", () => {
  it("is false until both bounds exist", () => {
    expect(hasInvalidRange({ ...EMPTY_CLIP, start: 20 })).toBe(false);
  });

  it("flags end at or before start even when the loop is off", () => {
    expect(hasInvalidRange({ start: 20, end: 10, enabled: false })).toBe(true);
  });
});
