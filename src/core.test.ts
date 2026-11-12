import { describe, it, expect, vi, afterEach } from "vitest";
import fixture from "./__fixtures__/forecast.json";
import cities from "./__fixtures__/search.json";
import {
  normalize,
  forecast,
  search,
  RequestGate,
  json,
  validPlace,
} from "./api";
import { temp, wind, clock, dateKey, upcoming, comparisonTime } from "./time";
import {
  preferences,
  favourites,
  write,
  read,
  saveForecast,
  getCached,
  cacheEntries,
  stale,
  TTL,
  storageAvailable,
} from "./storage";
import { parseURL, serialize, defaultPlace } from "./state";
import { condition } from "./weather";
import { translator, strings } from "./i18n";
import { load } from "./repository";
const clone = () => structuredClone(fixture);
const p = defaultPlace;
function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => map.delete(k),
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("Official response validation", () => {
  it("normalises real forecast responses with explicit units and UTC seconds", () => {
    const w = normalize(fixture, p);
    expect(w.hours).toHaveLength(168);
    expect(w.days).toHaveLength(7);
    expect(w.timezone).toBe("Europe/Rome");
    expect(w.current.time).toBe(fixture.current.time);
  });
  it("preserves null and missing fields, including polar sunrise", () => {
    const raw = clone();
    raw.current.temperature_2m = null as unknown as number;
    raw.daily.sunrise[0] = null as unknown as number;
    const w = normalize(raw, p);
    expect(w.current.temperature).toBeNull();
    expect(w.days[0].sunrise).toBeNull();
  });
  it("rejects malformed units, timestamps, arrays and timezone", () => {
    for (const edit of [
      (r: ReturnType<typeof clone>) => r.hourly.temperature_2m.pop(),
      (r: ReturnType<typeof clone>) => (r.timezone = "bad/zone"),
      (r: ReturnType<typeof clone>) => (r.current_units.temperature_2m = "°F"),
      (r: ReturnType<typeof clone>) => (r.hourly.time[1] = r.hourly.time[0]),
    ]) {
      const r = clone();
      edit(r);
      expect(() => normalize(r, p)).toThrow();
    }
  });
  it("missing optional arrays become null, never zero", () => {
    const r = clone() as unknown as Record<string, unknown>;
    delete (r.hourly as Record<string, unknown>).precipitation;
    expect(normalize(r, p).hours[0].rain).toBeNull();
  });
  it("limits retry to one retry and cancels obsolete requests", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError());
    await expect(
      json("x", new AbortController().signal, fetcher),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const abort = new AbortController();
    abort.abort();
    fetcher.mockClear();
    await expect(json("x", abort.signal, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("never retries a rate limit response", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(
      json("x", new AbortController().signal, fetcher),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("builds canonical-unit forecast requests", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => fixture });
    await forecast(p, new AbortController().signal, fetcher);
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("timeformat")).toBe("unixtime");
    expect(url.searchParams.get("temperature_unit")).toBe("celsius");
  });
  it("search keeps distinct homonymous locations and handles no result", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => cities });
    const results = await search(
      "London",
      "en",
      new AbortController().signal,
      fetcher,
    );
    expect(results.length).toBeGreaterThan(1);
    expect(results[0].region).toBeDefined();
    fetcher.mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(
      await search("zzzz", "en", new AbortController().signal, fetcher),
    ).toEqual([]);
  });
  it("ignores out-of-order results", () => {
    const gate = new RequestGate(),
      first = gate.next(),
      second = gate.next();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });
});
describe("Time, codes and units", () => {
  it("converts canonical values without changing missing data", () => {
    expect(temp(0, "F")).toBe(32);
    expect(temp(null, "C")).toBeNull();
    expect(wind(36, "m/s")).toBe(10);
    expect(wind(16.09344, "mph")).toBeCloseTo(10);
  });
  it("uses the location date, not the device date", () => {
    const time = Date.parse("2026-11-12T02:00:00Z") / 1000;
    expect(dateKey(time, "America/New_York")).toBe("2026-11-11");
    expect(dateKey(time, "Asia/Tokyo")).toBe("2026-11-12");
  });
  it("distinguishes repeated local hours at DST fallback", () => {
    const a = Date.parse("2026-10-25T00:30Z") / 1000,
      b = a + 3600;
    expect(clock(a, "Europe/Rome", "en")).not.toBe(
      clock(b, "Europe/Rome", "en"),
    );
    expect(clock(a, "Europe/Rome", "en")).toContain("02:30");
    expect(clock(b, "Europe/Rome", "en")).toContain("02:30");
  });
  it("keeps provider day labels across DST using its retrieval offset", () => {
    const raw = clone();
    raw.daily.time[0] = Date.parse("2026-10-24T22:00Z") / 1000;
    raw.utc_offset_seconds = 7200;
    expect(normalize(raw, p).days[0].date).toBe("2026-10-25");
  });
  it("selects next 48 hours and compares an exact UTC instant", () => {
    const w = normalize(fixture, p);
    const time = w.hours[10].time * 1000;
    expect(upcoming(w, time)).toHaveLength(48);
    expect(upcoming(w, time)[0].time).toBe(w.hours[10].time);
    expect(comparisonTime(time)).toBe(w.hours[10].time);
    expect(
      w.hours.find((h) => h.time === comparisonTime(time) + 12),
    ).toBeUndefined();
  });
  it("maps WMO codes and translates every weather description", () => {
    for (const code of [
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75,
      77, 80, 81, 82, 85, 86, 95, 96, 99,
    ])
      expect(strings[condition(code)]).toBeTruthy();
    expect(condition(null)).toBe("Unknown conditions");
    expect(translator("en")("Forecast")).toBe("Forecast");
    expect(translator("it")("Forecast")).toBe("Previsioni");
  });
});
describe("Persistence, URL and offline", () => {
  it("defaults to English and persists validated preferences", () => {
    vi.stubGlobal("localStorage", storage());
    expect(preferences().language).toBe("en");
    write("preferences", {
      language: "it",
      theme: "dark",
      temperature: "F",
      wind: "mph",
    });
    expect(preferences()).toEqual({
      language: "it",
      theme: "dark",
      temperature: "F",
      wind: "mph",
    });
    write("preferences", null);
    expect(preferences().language).toBe("en");
  });
  it("retains up to eight cached places and expires after 15 minutes", () => {
    vi.stubGlobal("localStorage", storage());
    const w = normalize(fixture, p, 100);
    for (let i = 0; i < 10; i++)
      saveForecast({ ...w, place: { ...p, latitude: i } });
    expect(cacheEntries()).toHaveLength(8);
    expect(stale(w, 100 + TTL - 1)).toBe(false);
    expect(stale(w, 100 + TTL)).toBe(true);
  });
  it("handles unavailable storage and corrupt values", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw Error();
      },
      setItem() {
        throw Error();
      },
    });
    expect(storageAvailable()).toBe(false);
    expect(write("test", 23)).toBe(false);
    expect(read("test", 0)).toBe(23);
  });
  it("validates favourites and location-only URLs without inventing a city", () => {
    vi.stubGlobal("localStorage", storage());
    write("favourites", [p, {}, null]);
    expect(favourites()).toEqual([p]);
    const s = parseURL("?lat=12&lon=45&view=compare&lang=it");
    expect(s.place.name).toBe("12°, 45°");
    expect(s.view).toBe("compare");
    expect(s.language).toBe("it");
    expect(
      parseURL(serialize(p, "forecast", "2026-11-12", "en")).place,
    ).toEqual({ ...p });
    expect(validPlace({ ...p, latitude: 100 })).toBe(false);
  });
  it("reuses fresh cached data and falls back to stale data on failure", async () => {
    vi.stubGlobal("localStorage", storage());
    const w = normalize(fixture, p);
    saveForecast(w);
    const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(Error());
    expect((await load(p, new AbortController().signal)).status).toBe(
      "Fresh cache",
    );
    expect(fetcher).not.toHaveBeenCalled();
    saveForecast({ ...w, fetched: Date.now() - TTL - 1 });
    expect((await load(p, new AbortController().signal)).status).toBe(
      "Saved data",
    );
    expect(getCached(p)?.current.temperature).toBe(w.current.temperature);
  });
});

it("shares comparison selections without depending on recipient favourites", () => {
  const url = serialize(p, "compare", "", "en", [
    p,
    { ...p, name: "Coordinates", latitude: 12 },
  ]);
  expect(parseURL(url).comparison).toHaveLength(2);
  expect(parseURL(url).comparison[1].latitude).toBe(12);
});
