import { describe, expect, it } from "vitest";
import { EMPTY_CLIP, hasInvalidRange, loopRange } from "./clip";

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
