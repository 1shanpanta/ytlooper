import { describe, expect, it } from "vitest";
import { formatTime, parseTime, roundTenth } from "./time";

describe("parseTime", () => {
  it("reads plain seconds, m:ss and h:mm:ss", () => {
    expect(parseTime("92")).toBe(92);
    expect(parseTime("1:32")).toBe(92);
    expect(parseTime("1:02:03")).toBe(3723);
  });

  it("reads a decimal on the last part and trims spaces", () => {
    expect(parseTime(" 1:32.5 ")).toBe(92.5);
  });

  it("rejects empty, malformed and out of range input", () => {
    for (const bad of ["", " ", "abc", ":30", "1:", "1:75", "1:2:3:4", "-5", "1.5:30"]) {
      expect(parseTime(bad), bad).toBeNull();
    }
  });
});

describe("formatTime", () => {
  it("pads seconds and shows hours only when needed", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(92)).toBe("1:32");
    expect(formatTime(3723)).toBe("1:02:03");
  });

  it("keeps one decimal only when it is not zero", () => {
    expect(formatTime(92.3)).toBe("1:32.3");
    expect(formatTime(92.04)).toBe("1:32");
  });

  it("round trips through parseTime", () => {
    for (const seconds of [0, 5.5, 59.9, 60, 3599.9, 3600, 7322.4]) {
      expect(parseTime(formatTime(seconds))).toBe(seconds);
    }
  });
});

describe("roundTenth", () => {
  it("removes float noise from nudges", () => {
    expect(roundTenth(0.1 + 0.2)).toBe(0.3);
  });
});
