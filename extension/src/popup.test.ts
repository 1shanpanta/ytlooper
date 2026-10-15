// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import popupHtml from "../popup.html?raw";

interface FakeVideo {
  currentTime: number;
  duration: number;
  ended: boolean;
  play: () => Promise<void>;
}

interface World {
  tab: { id?: number; url?: string } | undefined;
  video: FakeVideo | null;
  ad: boolean;
  location: { search: string; pathname: string };
  store: Record<string, unknown>;
  injectError: boolean;
  storageGetError: boolean;
}

const body = popupHtml
  .match(/<body>([\s\S]*)<\/body>/)![1]
  .replace(/<script[\s\S]*?<\/script>/g, "");

let world: World;
let executeScript: ReturnType<typeof vi.fn>;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const click = (selector: string) =>
  document.querySelector<HTMLElement>(selector)!.click();
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};
const type = async (id: string, text: string) => {
  const input = $<HTMLInputElement>(id);
  input.value = text;
  input.dispatchEvent(new Event("change"));
  await settle();
};
const press = async (selector: string) => {
  click(selector);
  await settle();
};
const tick = (ms = 100) => vi.advanceTimersByTime(ms);

/** Plays the video at `time`, then presses the mark button. */
const mark = async (field: "start" | "end", time: number) => {
  world.video!.currentTime = time;
  await press(`[data-mark="${field}"]`);
};

async function openPopup() {
  vi.resetModules();
  document.body.innerHTML = body;
  await import("./popup");
  await settle();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  world = {
    tab: { id: 1, url: "https://www.youtube.com/watch?v=abc" },
    video: { currentTime: 0, duration: 100, ended: false, play: vi.fn(async () => {}) },
    ad: false,
    location: { search: "?v=abc", pathname: "/watch" },
    store: {},
    injectError: false,
    storageGetError: false,
  };
  executeScript = vi.fn(async ({ func, args }: { func: (...a: unknown[]) => unknown; args: unknown[] }) => {
    if (world.injectError) throw new Error("tab gone");
    return [{ result: func(...args) }];
  });
  vi.stubGlobal("chrome", {
    tabs: { query: vi.fn(async () => (world.tab ? [world.tab] : [])) },
    scripting: { executeScript },
    storage: {
      local: {
        get: vi.fn(async (key: string) => {
          if (world.storageGetError) throw new Error("storage down");
          return { [key]: world.store[key] };
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(world.store, items);
        }),
      },
    },
  });
  vi.stubGlobal("location", world.location);
  const original = document.querySelector.bind(document);
  vi.spyOn(document, "querySelector").mockImplementation(((selector: string) => {
    if (selector === "video.html5-main-video") return world.video;
    if (selector === ".ad-showing") return world.ad ? {} : null;
    return original(selector);
  }) as typeof document.querySelector);
});

afterEach(() => {
  vi.clearAllTimers();
  delete (globalThis as { __ytlooper?: number }).__ytlooper;
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("happy path", () => {
  it("opens on a fresh video with empty controls", async () => {
    await openPopup();
    expect($("controls").hidden).toBe(false);
    expect($("message").hidden).toBe(true);
    expect($("status").textContent).toBe("Set a start and an end.");
    expect($("toggle").getAttribute("aria-checked")).toBe("true");
    expect($<HTMLButtonElement>("clear").disabled).toBe(true);
    expect($("range").hidden).toBe(false);
    expect($("range-fill").hidden).toBe(true);
    for (const nudge of document.querySelectorAll<HTMLButtonElement>("[data-nudge]")) {
      expect(nudge.disabled).toBe(true);
    }
  });

  it("copies the current time into start and saves it", async () => {
    await openPopup();
    await mark("start", 92.34);
    expect($<HTMLInputElement>("start").value).toBe("1:32.3");
    expect(world.store["clip:abc"]).toMatchObject({ start: 92.3, end: null });
  });

  it("starts looping once both times are set", async () => {
    await openPopup();
    await mark("start", 10);
    await mark("end", 20);
    expect($("status").textContent).toBe("Looping 0:10 to 0:20.");

    world.video!.currentTime = 21;
    tick();
    expect(world.video!.currentTime).toBe(10);
  });

  it("draws the loop segment on the range bar", async () => {
    await openPopup();
    await mark("start", 10);
    await mark("end", 20);
    expect($("range-fill").hidden).toBe(false);
    expect($("range-fill").style.left).toBe("10%");
    expect($("range-fill").style.width).toBe("10%");
  });

  it("accepts typed times", async () => {
    await openPopup();
    await type("start", "1:30");
    await type("end", "2:00");
    expect(world.store["clip:abc"]).toMatchObject({ start: 90, end: 120 });
    expect($<HTMLInputElement>("start").value).toBe("1:30");
  });

  it("nudges a time and never goes below zero", async () => {
    await openPopup();
    await mark("start", 0.5);
    await press('[data-nudge="start"][data-delta="-1"]');
    expect($<HTMLInputElement>("start").value).toBe("0:00");
    await press('[data-nudge="start"][data-delta="0.1"]');
    await press('[data-nudge="start"][data-delta="1"]');
    expect($<HTMLInputElement>("start").value).toBe("0:01.1");
  });

  it("turns the loop off and on with the switch", async () => {
    await openPopup();
    await mark("start", 10);
    await mark("end", 20);

    await press("#toggle");
    expect($("toggle").getAttribute("aria-checked")).toBe("false");
    expect($("status").textContent).toBe("Loop is off.");
    world.video!.currentTime = 25;
    tick();
    expect(world.video!.currentTime).toBe(25);

    await press("#toggle");
    tick();
    expect(world.video!.currentTime).toBe(10);
  });

  it("clears both times and stops the loop", async () => {
    await openPopup();
    await mark("start", 10);
    await mark("end", 20);
    await press("#clear");
    expect($<HTMLInputElement>("start").value).toBe("");
    expect($<HTMLInputElement>("end").value).toBe("");
    world.video!.currentTime = 25;
    tick();
    expect(world.video!.currentTime).toBe(25);
  });

  it("restores a saved clip and restarts the loop on reopen", async () => {
    world.store["clip:abc"] = { start: 10, end: 20, enabled: true };
    await openPopup();
    expect($<HTMLInputElement>("start").value).toBe("0:10");
    expect($<HTMLInputElement>("end").value).toBe("0:20");
    world.video!.currentTime = 30;
    tick();
    expect(world.video!.currentTime).toBe(10);
  });

  it("works on a Shorts page and keys the clip by its id", async () => {
    world.tab = { id: 1, url: "https://www.youtube.com/shorts/xyz" };
    world.location.search = "";
    world.location.pathname = "/shorts/xyz";
    await openPopup();
    await mark("start", 3);
    expect(world.store["clip:xyz"]).toMatchObject({ start: 3 });
  });

  it("accepts YouTube subdomains", async () => {
    world.tab = { id: 1, url: "https://music.youtube.com/watch?v=abc" };
    await openPopup();
    expect($("controls").hidden).toBe(false);
  });

  it("loops a live stream even though it has no duration", async () => {
    world.video!.duration = Infinity;
    await openPopup();
    await mark("start", 10);
    await mark("end", 20);
    expect($("range-fill").hidden).toBe(true);
    world.video!.currentTime = 21;
    tick();
    expect(world.video!.currentTime).toBe(10);
  });
});

describe("bad path", () => {
  const expectMessage = (text: string) => {
    expect($("message").hidden).toBe(false);
    expect($("message").textContent).toContain(text);
    expect($("controls").hidden).toBe(true);
    expect($("toggle").hidden).toBe(true);
  };

  it("refuses a page that is not YouTube and never injects", async () => {
    world.tab = { id: 1, url: "https://example.com/watch?v=abc" };
    await openPopup();
    expectMessage("Open a YouTube video");
    expect(executeScript).not.toHaveBeenCalled();
  });

  it("refuses look-alike hosts", async () => {
    for (const url of ["https://notyoutube.com/watch?v=abc", "https://youtube.com.evil.com/"]) {
      world.tab = { id: 1, url };
      await openPopup();
      expectMessage("Open a YouTube video");
    }
    expect(executeScript).not.toHaveBeenCalled();
  });

  it("refuses a tab with no readable url and a missing tab", async () => {
    world.tab = { id: 1 };
    await openPopup();
    expectMessage("Open a YouTube video");
    world.tab = undefined;
    await openPopup();
    expectMessage("Open a YouTube video");
  });

  it("explains when the tab blocks scripts", async () => {
    world.injectError = true;
    await openPopup();
    expectMessage("blocks extensions");
  });

  it("explains when YouTube shows no video, such as the home page", async () => {
    world.location.search = "";
    world.location.pathname = "/";
    await openPopup();
    expectMessage("No video found");
  });

  it("explains a storage failure instead of staying blank", async () => {
    world.storageGetError = true;
    await openPopup();
    expectMessage("Something went wrong");
  });

  it("flags an end before the start and does not loop", async () => {
    await openPopup();
    await mark("start", 20);
    await mark("end", 10);
    expect($("end").getAttribute("aria-invalid")).toBe("true");
    expect($("status").textContent).toBe("End must be 0.3s or more after start.");
    expect($("range").classList.contains("invalid")).toBe(true);
    world.video!.currentTime = 50;
    tick();
    expect(world.video!.currentTime).toBe(50);
  });

  it("refuses a loop of 0.1 seconds, as seen in the recording", async () => {
    await openPopup();
    await mark("start", 30);
    await mark("end", 30.1);
    expect($("end").getAttribute("aria-invalid")).toBe("true");
    world.video!.currentTime = 50;
    tick();
    expect(world.video!.currentTime).toBe(50);
  });

  it("rejects typed text that is not a time and keeps the old value", async () => {
    await openPopup();
    await mark("start", 10);
    await type("start", "abc");
    expect($("start").getAttribute("aria-invalid")).toBe("true");
    expect($("status").classList.contains("error")).toBe(true);
    expect(world.store["clip:abc"]).toMatchObject({ start: 10 });
  });

  it("rejects out of range typed times", async () => {
    await openPopup();
    await type("start", "1:75");
    expect($("start").getAttribute("aria-invalid")).toBe("true");
    expect(world.store["clip:abc"]).toMatchObject({ start: null });
  });

  it("clears a time when the field is emptied", async () => {
    await openPopup();
    await mark("start", 10);
    await type("start", "");
    expect(world.store["clip:abc"]).toMatchObject({ start: null });
  });

  it("will not take a time while an ad plays", async () => {
    await openPopup();
    world.ad = true;
    await mark("start", 7);
    expect($("status").textContent).toContain("Wait for an ad to end");
    expect($<HTMLInputElement>("start").value).toBe("");
  });

  it("shows a lost tab message when the tab goes away mid session", async () => {
    await openPopup();
    world.injectError = true;
    await mark("start", 10);
    expect($("status").textContent).toContain("Lost the tab");
  });

  it("survives corrupt saved data without showing NaN", async () => {
    world.store["clip:abc"] = { start: "abc", end: NaN, enabled: "maybe" };
    await openPopup();
    expect($<HTMLInputElement>("start").value).toBe("");
    expect($<HTMLInputElement>("end").value).toBe("");
    expect(document.body.textContent).not.toContain("NaN");
  });
});
