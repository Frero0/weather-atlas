import type { Place, Weather, Language } from "./types";
export const CURRENT =
  "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
export const HOURLY =
  "is_day,temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m";
export const DAILY =
  "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max";
export function validPlace(p: unknown): p is Place {
  if (!p || typeof p !== "object") return false;
  const q = p as Place;
  return (
    (q.region === undefined || typeof q.region === "string") &&
    (q.country === undefined || typeof q.country === "string") &&
    typeof q.name === "string" &&
    q.name.length < 200 &&
    Number.isFinite(q.latitude) &&
    Math.abs(q.latitude) <= 90 &&
    Number.isFinite(q.longitude) &&
    Math.abs(q.longitude) <= 180
  );
}
const obj = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("Invalid weather response.");
  return v as Record<string, unknown>;
};
const numeric = (v: unknown) => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isFinite(v))
    throw Error("Invalid weather response.");
  return v;
};
export function normalize(
  raw: unknown,
  place: Place,
  now = Date.now(),
): Weather {
  const d = obj(raw),
    c = obj(d.current),
    h = obj(d.hourly),
    a = obj(d.daily),
    cu = obj(d.current_units),
    hu = obj(d.hourly_units),
    du = obj(d.daily_units);
  if (
    !validPlace(place) ||
    typeof d.timezone !== "string" ||
    numeric(c.time) === null ||
    cu.temperature_2m !== "°C" ||
    hu.temperature_2m !== "°C" ||
    hu.precipitation !== "mm" ||
    hu.precipitation_probability !== "%" ||
    hu.wind_speed_10m !== "km/h" ||
    du.precipitation_sum !== "mm"
  )
    throw Error("Invalid weather response.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: d.timezone });
  } catch {
    throw Error("Invalid weather response.");
  }
  const times = (group: Record<string, unknown>) => {
    if (
      !Array.isArray(group.time) ||
      !group.time.length ||
      group.time.some(
        (v, i, arr) =>
          typeof v !== "number" ||
          !Number.isFinite(v) ||
          (i > 0 && v <= arr[i - 1]),
      )
    )
      throw Error("Invalid weather response.");
    return group.time as number[];
  };
  const ht = times(h),
    dt = times(a);
  const at = (g: Record<string, unknown>, key: string, i: number) => {
    const field = g[key];
    if (field === undefined) return null;
    if (!Array.isArray(field) || field.length !== (g.time as unknown[]).length)
      throw Error("Invalid weather response.");
    return numeric(field[i]);
  };
  // Provider daily boundaries use its fixed retrieval offset, even across DST. Preserve that date label.
  const offset = numeric(d.utc_offset_seconds) ?? 0;
  return {
    place,
    fetched: now,
    timezone: d.timezone,
    interval: numeric(c.interval) ?? 900,
    current: {
      time: c.time as number,
      temperature: numeric(c.temperature_2m),
      feels: numeric(c.apparent_temperature),
      humidity: numeric(c.relative_humidity_2m),
      wind: numeric(c.wind_speed_10m),
      direction: numeric(c.wind_direction_10m),
      gusts: numeric(c.wind_gusts_10m),
      rain: numeric(c.precipitation),
      day: numeric(c.is_day),
      code: numeric(c.weather_code),
    },
    hours: ht.map((time, i) => ({
      time,
      day: at(h, "is_day", i),
      temperature: at(h, "temperature_2m", i),
      rain: at(h, "precipitation", i),
      probability: at(h, "precipitation_probability", i),
      wind: at(h, "wind_speed_10m", i),
      code: at(h, "weather_code", i),
    })),
    days: dt.map((time, i) => ({
      time,
      date: new Date((time + offset) * 1000).toISOString().slice(0, 10),
      min: at(a, "temperature_2m_min", i),
      max: at(a, "temperature_2m_max", i),
      rain: at(a, "precipitation_sum", i),
      probability: at(a, "precipitation_probability_max", i),
      wind: at(a, "wind_speed_10m_max", i),
      sunrise: at(a, "sunrise", i),
      sunset: at(a, "sunset", i),
      uv: at(a, "uv_index_max", i),
      code: at(a, "weather_code", i),
    })),
  };
}
export async function json(url: string, signal: AbortSignal, fetcher = fetch) {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      });
      if (!response.ok) {
        if (response.status < 500)
          throw new RangeError(
            "Unable to reach the weather service. Try again.",
          );
        throw Error("Service unavailable");
      }
      return await response.json();
    } catch (e) {
      last = e;
      if (signal.aborted) throw e;
      if (e instanceof RangeError) throw e;
    }
  }
  throw last;
}
export async function forecast(
  place: Place,
  signal: AbortSignal,
  fetcher = fetch,
) {
  if (!validPlace(place)) throw Error("Invalid weather response.");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: CURRENT,
    hourly: HOURLY,
    daily: DAILY,
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "7",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  }).toString();
  return normalize(await json(url.href, signal, fetcher), place);
}
export async function search(
  query: string,
  language: Language,
  signal: AbortSignal,
  fetcher = fetch,
): Promise<Place[]> {
  if (query.trim().length < 2) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query.trim(),
    language,
    count: "8",
    format: "json",
  }).toString();
  const d = obj(await json(url.href, signal, fetcher));
  if (d.results === undefined) return [];
  if (!Array.isArray(d.results)) throw Error("Invalid weather response.");
  return d.results
    .map((v) => {
      const p = obj(v);
      return {
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        region: p.admin1,
        country: p.country,
      };
    })
    .filter(validPlace) as Place[];
}
export class RequestGate {
  private version = 0;
  next() {
    const version = ++this.version;
    return () => version === this.version;
  }
}
