import "./popup.css";
import { EMPTY_CLIP, hasInvalidRange, loopRange, type Clip } from "./clip";
import { runInPage, type PageCommand, type PlayerState } from "./page";
import { loadClip, saveClip } from "./storage";
import { formatTime, parseTime, roundTenth } from "./time";

type Field = "start" | "end";

const FIELDS: Field[] = ["start", "end"];

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const inputs: Record<Field, HTMLInputElement> = {
  start: byId("start"),
  end: byId("end"),
};
const message = byId<HTMLParagraphElement>("message");
const controls = byId<HTMLDivElement>("controls");
const status = byId<HTMLParagraphElement>("status");
const toggle = byId<HTMLButtonElement>("toggle");
const clearButton = byId<HTMLButtonElement>("clear");

let tabId = 0;
let videoId = "";
let clip: Clip = EMPTY_CLIP;

function isYouTube(url: string | undefined): boolean {
  if (!url) return false;
  const { hostname } = new URL(url);
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}

async function inPage(command: PageCommand): Promise<PlayerState> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: runInPage,
    args: [command],
  });
  return injection.result as PlayerState;
}

function showMessage(text: string) {
  message.textContent = text;
  message.hidden = false;
  controls.hidden = true;
}

function setStatus(text: string, isError = false) {
  status.textContent = text;
  status.classList.toggle("error", isError);
}

function render() {
  for (const field of FIELDS) {
    const value = clip[field];
    if (document.activeElement !== inputs[field]) {
      inputs[field].value = value === null ? "" : formatTime(value);
    }
    inputs[field].removeAttribute("aria-invalid");
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      `[data-nudge="${field}"]`,
    )) {
      button.disabled = value === null;
    }
  }

  const invalid = hasInvalidRange(clip);
  if (invalid) inputs.end.setAttribute("aria-invalid", "true");
  toggle.setAttribute("aria-pressed", String(clip.enabled));
  toggle.textContent = clip.enabled ? "Loop on" : "Loop off";
  clearButton.disabled = clip.start === null && clip.end === null;

  if (invalid) setStatus("End must be after start.", true);
  else if (clip.start === null || clip.end === null) setStatus("Set a start and an end.");
  else if (!clip.enabled) setStatus("Loop is off.");
  else setStatus(`Looping ${formatTime(clip.start)} to ${formatTime(clip.end)}.`);
}

async function commit(next: Clip) {
  clip = next;
  render();
  try {
    await saveClip(videoId, clip);
    await inPage({ type: "loop", videoId, range: loopRange(clip) });
  } catch {
    setStatus("Lost the tab. Reload the video and reopen this popup.", true);
  }
}

async function markCurrent(field: Field) {
  const { time } = await inPage({ type: "read" });
  if (time !== null) await commit({ ...clip, [field]: roundTenth(time) });
}

function applyTypedValue(field: Field) {
  const text = inputs[field].value.trim();
  const parsed = text === "" ? null : parseTime(text);
  if (text !== "" && parsed === null) {
    inputs[field].setAttribute("aria-invalid", "true");
    setStatus("Use 1:32, 92 or 1:02:03.", true);
    return;
  }
  void commit({ ...clip, [field]: parsed }).then(() => {
    const value = clip[field];
    inputs[field].value = value === null ? "" : formatTime(value);
  });
}

function nudge(field: Field, delta: number) {
  const value = clip[field];
  if (value === null) return;
  void commit({ ...clip, [field]: Math.max(0, roundTenth(value + delta)) });
}

function bindEvents() {
  for (const field of FIELDS) {
    inputs[field].addEventListener("change", () => applyTypedValue(field));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mark]")) {
    button.addEventListener("click", () => void markCurrent(button.dataset.mark as Field));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-nudge]")) {
    button.addEventListener("click", () =>
      nudge(button.dataset.nudge as Field, Number(button.dataset.delta)),
    );
  }
  toggle.addEventListener("click", () => void commit({ ...clip, enabled: !clip.enabled }));
  clearButton.addEventListener("click", () => void commit(EMPTY_CLIP));
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined || !isYouTube(tab.url)) {
    showMessage("Open a YouTube video, then open this popup.");
    return;
  }
  tabId = tab.id;

  let player: PlayerState;
  try {
    player = await inPage({ type: "read" });
  } catch {
    showMessage("This tab blocks extensions. Reload the video and try again.");
    return;
  }
  if (!player.videoId || player.time === null) {
    showMessage("No video found on this page.");
    return;
  }

  videoId = player.videoId;
  controls.hidden = false;
  bindEvents();
  await commit(await loadClip(videoId));
}

void init();
