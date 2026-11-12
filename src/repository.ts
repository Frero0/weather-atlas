import type { Place } from "./types";
import { forecast } from "./api";
import { getCached, saveForecast, stale } from "./storage";
export async function load(place: Place, signal: AbortSignal, force = false) {
  const saved = getCached(place);
  if (saved && !stale(saved) && !force)
    return { weather: { ...saved, place }, status: "Fresh cache" as const };
  try {
    const weather = await forecast(place, signal);
    saveForecast(weather);
    return { weather, status: "Live retrieval" as const };
  } catch (e) {
    if (signal.aborted) throw e;
    if (saved)
      return {
        weather: { ...saved, place },
        status: "Saved data" as const,
        error: "Provider unavailable. Showing saved data." as const,
      };
    throw Error("No saved forecast for this place. Connect and retry.", {
      cause: e,
    });
  }
}
