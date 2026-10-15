import { readFile } from "node:fs/promises";

const ZIP_PATH = "ytlooper-extension.zip";
const API = "https://chromewebstore.googleapis.com";
const REQUIRED = ["CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN", "PUBLISHER_ID", "EXTENSION_ID"];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, PUBLISHER_ID, EXTENSION_ID } = process.env;
const item = `publishers/${PUBLISHER_ID}/items/${EXTENSION_ID}`;

async function accessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Token refresh failed: ${JSON.stringify(body)}`);
  return body.access_token;
}

async function call(url, init = {}) {
  const token = await accessToken();
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  console.log(`${response.status} ${response.statusText}\n${text}`);
  if (!response.ok) process.exit(1);
}

const commands = {
  upload: async () =>
    call(`${API}/upload/v2/${item}:upload`, { method: "POST", body: await readFile(ZIP_PATH) }),
  status: () => call(`${API}/v2/${item}:fetchStatus`),
  publish: () => call(`${API}/v2/${item}:publish`, { method: "POST" }),
};

const command = commands[process.argv[2]];
if (!command) {
  console.error(`Usage: webstore.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
await command();
