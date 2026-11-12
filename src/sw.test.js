import { it, expect } from "vitest";
import vm from "node:vm";
import { readFileSync } from "node:fs";
for (const base of ["/", "/weather-atlas/"])
  it(`isolates cache cleanup and navigation at ${base}`, async () => {
    const listeners = {};
    const deleted = [];
    let pending;
    const cache = { addAll: async () => {}, match: async (path) => ({ path }) };
    const prefix = "weather-atlas:" + base + ":";
    const self = {
      registration: { scope: "https://example.test" + base },
      location: { origin: "https://example.test" },
      clients: { claim: async () => {} },
      addEventListener: (name, callback) => {
        listeners[name] = callback;
      },
    };
    const caches = {
      open: async () => cache,
      keys: async () => [
        "other-app",
        prefix + "old",
        prefix + "new",
        "weather-atlas:/elsewhere/:old",
        "fs-meteo16-old",
      ],
      delete: async (key) => {
        deleted.push(key);
      },
    };
    vm.runInNewContext(
      readFileSync("scripts/serviceworker.js", "utf8")
        .replace("__REVISION__", "new")
        .replace("__ASSETS__", JSON.stringify([base + "index.html"])),
      {
        self,
        caches,
        URL,
        fetch: async () => {
          throw Error("offline");
        },
      },
    );
    listeners.activate({
      waitUntil: (p) => {
        pending = p;
      },
    });
    await pending;
    expect(deleted).toEqual(
      base === "/" ? [prefix + "old", "fs-meteo16-old"] : [prefix + "old"],
    );
    listeners.fetch({
      request: {
        url: "https://example.test" + base + "?lat=1",
        method: "GET",
        mode: "navigate",
      },
      respondWith: (p) => {
        pending = p;
      },
    });
    expect((await pending).path).toBe(base + "index.html");
    let handled = false;
    listeners.fetch({
      request: {
        url: "https://api.open-meteo.com/v1/forecast",
        method: "GET",
        mode: "cors",
      },
      respondWith: () => {
        handled = true;
      },
    });
    expect(handled).toBe(false);
  });
