/** Parses "92", "1:32", "1:02:03" or "1:32.5" into seconds. Returns null for anything else. */
export function parseTime(input: string): number | null {
  const parts = input.trim().split(":");
  if (parts.length > 3) return null;
  const last = parts.length - 1;
  let total = 0;
  for (let i = 0; i < parts.length; i++) {
    const pattern = i === last ? /^\d+(\.\d+)?$/ : /^\d+$/;
    if (!pattern.test(parts[i])) return null;
    const value = Number(parts[i]);
    if (i > 0 && value >= 60) return null;
    total = total * 60 + value;
  }
  return total;
}

export function roundTenth(seconds: number): number {
  return Math.round(seconds * 10) / 10;
}

/** Formats seconds as m:ss or h:mm:ss, with one decimal only when needed. */
export function formatTime(seconds: number): string {
  const rounded = roundTenth(seconds);
  const whole = Math.floor(rounded);
  const tenth = Math.round((rounded - whole) * 10);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, "0");
  const base = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  return tenth === 0 ? base : `${base}.${tenth}`;
}
