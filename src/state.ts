import type { Place, View, Language } from "./types";
import { validPlace } from "./api";
import { read } from "./storage";
export const defaultPlace: Place = {
  name: "Turin",
  region: "Piedmont",
  country: "Italy",
  latitude: 45.0705,
  longitude: 7.6868,
};
export function parseURL(query: string) {
  const q = new URLSearchParams(query),
    lat = q.get("lat"),
    lon = q.get("lon");
  const p = {
    name: q.get("name")?.slice(0, 120) || `${lat}°, ${lon}°`,
    latitude: Number(lat),
    longitude: Number(lon),
    region: q.get("region")?.slice(0, 120) || "",
    country: q.get("country")?.slice(0, 120) || "",
  };
  let comparison: Place[] = [];
  try {
    const values = JSON.parse(q.get("compare") || "[]");
    if (Array.isArray(values))
      comparison = values.filter(validPlace).slice(0, 3);
  } catch {
    /* Invalid shared comparisons are ignored. */
  }
  const saved = read<Place | null>("last", null);
  let legacy: Place | null = null;
  try {
    legacy = JSON.parse(
      localStorage.getItem("federico-meteo-pwa-16-last") || "null",
    )?.location;
  } catch {
    /* Invalid legacy state is ignored. */
  }
  return {
    comparison,
    place:
      lat !== null &&
      lon !== null &&
      lat.trim() !== "" &&
      lon.trim() !== "" &&
      validPlace(p)
        ? p
        : validPlace(saved)
          ? saved
          : validPlace(legacy)
            ? legacy
            : defaultPlace,
    view: (["forecast", "compare", "sources"].includes(q.get("view") || "")
      ? q.get("view")
      : "forecast") as View,
    day: /^\d{4}-\d{2}-\d{2}$/.test(q.get("day") || "") ? q.get("day")! : "",
    language: (q.get("lang") === "en" || q.get("lang") === "it"
      ? q.get("lang")
      : undefined) as Language | undefined,
  };
}
export function serialize(
  place: Place,
  view: View,
  day: string,
  language: Language,
  comparison: Place[] = [],
) {
  return (
    "?" +
    new URLSearchParams({
      lat: String(place.latitude),
      lon: String(place.longitude),
      name: place.name,
      region: place.region || "",
      country: place.country || "",
      view,
      day,
      lang: language,
      ...(view === "compare"
        ? { compare: JSON.stringify(comparison.slice(0, 3)) }
        : {}),
    }).toString()
  );
}
