import type { Language, Preferences, Weather } from "./types";
import { locale } from "./i18n";
export const temp = (v: number | null, unit: Preferences["temperature"]) =>
  v === null ? null : unit === "F" ? (v * 9) / 5 + 32 : v;
export const wind = (v: number | null, unit: Preferences["wind"]) =>
  v === null
    ? null
    : unit === "mph"
      ? v / 1.609344
      : unit === "m/s"
        ? v / 3.6
        : v;
export const number = (v: number | null, lang: Language, digits = 1) =>
  v === null
    ? "—"
    : new Intl.NumberFormat(locale(lang), {
        maximumFractionDigits: digits,
      }).format(v);
export function dateKey(time: number, zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(time * 1000);
}
export function clock(
  time: number | null,
  zone: string,
  lang: Language,
  date = false,
) {
  return time === null
    ? "—"
    : new Intl.DateTimeFormat(locale(lang), {
        timeZone: zone,
        ...(date
          ? {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short" as const,
            }
          : {
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short" as const,
            }),
      }).format(time * 1000);
}
export const dayLabel = (date: string, lang: Language) =>
  new Intl.DateTimeFormat(locale(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
export function upcoming(w: Weather, now = Date.now()) {
  const future = w.hours
    .filter((h) => h.time >= Math.floor(now / 3600000) * 3600)
    .slice(0, 48);
  return future.length ? future : w.hours.slice(-48);
}
export const comparisonTime = (now = Date.now()) =>
  Math.ceil(now / 3600000) * 3600;
