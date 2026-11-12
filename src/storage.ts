import type { Place, Preferences, Weather } from "./types";
import { validPlace } from "./api";
export const TTL = 15 * 60 * 1000,
  MAX_CACHE = 8;
export const placeKey = (p: Place) =>
  `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
const memory = new Map<string, unknown>();
export function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem("weather-atlas:" + key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return (memory.get(key) as T) ?? fallback;
  }
}
export function write(key: string, value: unknown): boolean {
  memory.set(key, value);
  try {
    localStorage.setItem("weather-atlas:" + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function storageAvailable() {
  try {
    localStorage.setItem("weather-atlas:probe", "1");
    localStorage.removeItem("weather-atlas:probe");
    return true;
  } catch {
    return false;
  }
}
export function preferences(): Preferences {
  const p = read<Partial<Preferences>>("preferences", {});
  return {
    language: p?.language === "it" ? "it" : "en",
    temperature: p?.temperature === "F" ? "F" : "C",
    wind: p?.wind === "mph" || p?.wind === "m/s" ? p.wind : "km/h",
    theme: p?.theme === "light" || p?.theme === "dark" ? p.theme : "system",
  };
}
export function favourites(): Place[] {
  const list = read<unknown>("favourites", []);
  return Array.isArray(list) ? list.filter(validPlace).slice(0, 12) : [];
}
export function cachedValid(v: unknown): v is Weather {
  try {
    const w = v as Weather;
    if (
      !validPlace(w.place) ||
      !Number.isFinite(w.fetched) ||
      !Number.isFinite(w.current.time) ||
      !Array.isArray(w.hours) ||
      !w.hours.length ||
      !Array.isArray(w.days) ||
      !w.days.length
    )
      return false;
    new Intl.DateTimeFormat("en", { timeZone: w.timezone });
    if (
      ![
        "temperature",
        "feels",
        "humidity",
        "wind",
        "direction",
        "gusts",
        "rain",
        "day",
        "code",
      ].every((k) => {
        const v = w.current[k as keyof typeof w.current];
        return v === null || (typeof v === "number" && Number.isFinite(v));
      })
    )
      return false;
    return (
      w.hours.every(
        (h) =>
          Number.isFinite(h.time) &&
          Object.values(h).every(
            (v) => v === null || (typeof v === "number" && Number.isFinite(v)),
          ),
      ) && w.days.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    );
  } catch {
    return false;
  }
}
export function cacheEntries(): Weather[] {
  const entries = read<unknown>("forecasts", []);
  return Array.isArray(entries)
    ? entries.filter(cachedValid).slice(0, MAX_CACHE)
    : [];
}
export function getCached(place: Place) {
  return cacheEntries().find((w) => placeKey(w.place) === placeKey(place));
}
export function saveForecast(w: Weather) {
  return write(
    "forecasts",
    [
      w,
      ...cacheEntries().filter(
        (old) => placeKey(old.place) !== placeKey(w.place),
      ),
    ].slice(0, MAX_CACHE),
  );
}
export const stale = (w: Weather, now = Date.now()) =>
  now - w.fetched >= TTL || w.fetched > now + 60000;
