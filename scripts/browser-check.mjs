import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
const base =
  process.argv.find((a) => a.startsWith("--url="))?.slice(6) ||
  "http://localhost:3018/";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : existsSync("/usr/bin/google-chrome")
      ? { executablePath: "/usr/bin/google-chrome" }
      : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  locale: "it-IT",
  timezoneId: "Europe/Rome",
  serviceWorkers: "allow",
});
const page = await context.newPage();
const errors = [];
const failures = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) failures.push([r.url(), r.status()]);
});
mkdirSync("docs/screenshots", { recursive: true });
let originalWorker;
const swPath =
  (process.argv.find((a) => a.startsWith("--dist="))?.slice(7) || "dist") +
  "/serviceworker.js";
try {
  await page.goto(base);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.locator(".current h1").waitFor({ timeout: 45000 });
  assert.equal(await page.locator(".current h1").innerText(), "Turin");
  const manifest = await (
    await page.request.get(base + "manifest.webmanifest")
  ).json();
  assert.equal(manifest.scope, new URL(base).pathname);
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
  await page.evaluate(async () => {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(Error("Service worker did not activate")),
          15000,
        ),
      ),
    ]);
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  assert.ok((await page.locator(".hour-strip>div").count()) >= 10);
  assert.equal(await page.locator(".day").count(), 7);
  await page
    .getByRole("button", { name: "Hourly details", exact: false })
    .count();
  await page.locator("summary").click();
  assert.equal(await page.locator("tbody tr").count(), 48);
  await page.locator("summary").click();
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  console.log("PASS live Open-Meteo current, 48h and seven days");
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search city or postcode" })
    .fill("London");
  await page.locator(".search button[type=submit]").click();
  await page
    .locator(".search-results button")
    .first()
    .waitFor({ timeout: 30000 });
  assert.ok((await page.locator(".search-results button").count()) > 1);
  await page
    .getByRole("textbox", { name: "Search city or postcode" })
    .press("ArrowDown");
  assert.equal(
    await page.evaluate(
      () => document.activeElement?.closest(".search-results") !== null,
    ),
    true,
  );
  await page.keyboard.press("Enter");
  await page
    .locator(".current h1")
    .filter({ hasText: "London" })
    .waitFor({ timeout: 45000 });
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await page.getByRole("button", { name: "Tokyo", exact: true }).click();
  await page
    .locator(".current h1")
    .filter({ hasText: "Tokyo" })
    .waitFor({ timeout: 45000 });
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByLabel("Temperature", { exact: true }).selectOption("F");
  await page.getByLabel("Wind unit", { exact: true }).selectOption("mph");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.match(await page.locator(".big-temperature").innerText(), /°F/);
  await page.getByLabel("Theme", { exact: true }).selectOption("light");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("it");
  await page.reload();
  await page.locator(".current").waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "it");
  assert.match(await page.locator(".big-temperature").innerText(), /°F/);
  assert.equal(await page.locator(".saved-place").count(), 3);
  await page
    .getByRole("combobox", { name: "Lingua", exact: true })
    .selectOption("en");
  await page.getByRole("link", { name: "Compare", exact: true }).click();
  await page.locator(".compare-grid article dl").first().waitFor();
  assert.equal(await page.locator(".compare-grid article").count(), 3);
  await page.screenshot({
    path: "docs/screenshots/comparison.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Forecast", exact: true }).click();
  await page.locator(".current").waitFor();
  await page.locator(".day").nth(2).click();
  assert.ok(new URL(page.url()).searchParams.get("day"));
  const shared = page.url();
  await page.reload();
  await page.locator(".current").waitFor();
  assert.equal(page.url(), shared);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    page.url(),
  );
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await page
    .getByText("Location permission denied. Search for a place instead.", {
      exact: true,
    })
    .waitFor();
  await page.locator(".banner button[aria-label=Close]").click();
  console.log(
    "PASS search, keyboard, units, themes, language, favourites, comparison, URL, location denied",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  const ordinaryErrors = [...errors],
    ordinaryFailures = [...failures];
  await context.setOffline(true);
  await page.reload();
  await page.locator(".current").waitFor();
  assert.match(await page.locator("aside").innerText(), /Offline/);
  const previous = await page.evaluate(() =>
    localStorage.getItem("weather-atlas:forecasts"),
  );
  await page.evaluate(() => localStorage.removeItem("weather-atlas:forecasts"));
  await page.reload();
  await page
    .locator(".banner")
    .filter({ hasText: "No saved forecast for this place." })
    .waitFor({ timeout: 25000 });
  await page.evaluate(
    (value) => localStorage.setItem("weather-atlas:forecasts", value),
    previous,
  );
  await page.reload();
  await page.locator(".current").waitFor();
  await page.evaluate(() => {
    const key = "weather-atlas:forecasts";
    const entries = JSON.parse(localStorage.getItem(key));
    for (const entry of entries) entry.fetched -= 3600000;
    localStorage.setItem(key, JSON.stringify(entries));
  });
  await page.reload();
  await page
    .locator(".banner")
    .filter({ hasText: "Provider unavailable. Showing saved data." })
    .waitFor({ timeout: 25000 });
  assert.match(
    await page.locator(".current-meta").innerText(),
    /Expired cache/,
  );
  await context.setOffline(false);
  await page
    .getByText("Live retrieval", { exact: false })
    .first()
    .waitFor({ timeout: 45000 });
  console.log("PASS offline reload, stale data and online recovery");
  await page.evaluate(async () => {
    await caches.open("unrelated-app-cache");
  });
  originalWorker = readFileSync(swPath, "utf8");
  const updated = originalWorker.replace(
    /const CACHE\s*=\s*PREFIX\s*\+\s*["'][^"']+["']/,
    'const CACHE = PREFIX + "browser-update-check"',
  );
  assert.notEqual(updated, originalWorker);
  writeFileSync(swPath, updated);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });
  await page
    .locator(".banner")
    .filter({ hasText: "App update ready" })
    .waitFor({ timeout: 15000 });
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Update now", exact: true }).click(),
  ]);
  await page.locator(".current").waitFor();
  assert.equal(await page.locator(".saved-place").count(), 3);
  assert.match(await page.locator(".big-temperature").innerText(), /°F/);
  assert.ok(
    await page.evaluate(async () =>
      (await caches.keys()).includes("unrelated-app-cache"),
    ),
  );
  console.log("PASS service worker update and preference/cache isolation");
  assert.deepEqual(ordinaryErrors, []);
  assert.deepEqual(ordinaryFailures, []);
  console.log("PASS no ordinary console errors or failed HTTP requests");
} finally {
  if (originalWorker) writeFileSync(swPath, originalWorker);
  await browser.close();
}
