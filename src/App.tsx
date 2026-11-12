import { useEffect, useRef, useState } from "react";
import {
  Sun,
  MapPin,
  Search,
  LocateFixed,
  SlidersHorizontal,
  Bookmark,
  Plus,
  RefreshCw,
  Link2,
  Wind,
  Droplets,
  CloudRain,
  ArrowUpRight,
  Download,
  Globe2,
  Check,
  WifiOff,
  X,
} from "lucide-react";
import type { Place, Preferences, Weather, View } from "./types";
import { translator, type Key } from "./i18n";
import {
  preferences,
  favourites,
  write,
  storageAvailable,
  placeKey,
  stale,
} from "./storage";
import { parseURL, serialize } from "./state";
import { load } from "./repository";
import { search, RequestGate } from "./api";
import { clock, temp, wind, number, comparisonTime } from "./time";
import { condition, WeatherIcon } from "./weather";
import Forecast from "./Forecast";
import { registerPWA, activateUpdate } from "./pwa";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
const suggested: Place[] = [
  {
    name: "London",
    region: "England",
    country: "United Kingdom",
    latitude: 51.5085,
    longitude: -0.1257,
  },
  {
    name: "New York",
    region: "New York",
    country: "United States",
    latitude: 40.7143,
    longitude: -74.006,
  },
  { name: "Tokyo", country: "Japan", latitude: 35.6895, longitude: 139.6917 },
];
export default function App() {
  const initial = useRef(parseURL(location.search));
  const [prefs, setPrefs] = useState<Preferences>(() => ({
    ...preferences(),
    ...(initial.current.language ? { language: initial.current.language } : {}),
  }));
  const [place, setPlace] = useState(initial.current.place);
  const [view, setView] = useState<View>(initial.current.view);
  const [day, setDay] = useState(initial.current.day);
  const [saved, setSaved] = useState(favourites);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [status, setStatus] = useState<Key>("Saved data");
  const [error, setError] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState<Key | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<Key | null>(null);
  const [settings, setSettings] = useState(false);
  const [selected, setSelected] = useState<Place[]>(initial.current.comparison);
  const [comparison, setComparison] = useState<Record<string, Weather>>({});
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareError, setCompareError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(!navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  const [memoryOK] = useState(storageAvailable);
  const searchAbort = useRef<AbortController | null>(null);
  const gate = useRef(new RequestGate());
  const searchGate = useRef(new RequestGate());
  const force = useRef(false);
  const t = translator(prefs.language),
    n = (v: number | null) => number(v, prefs.language);
  const isSaved = saved.some((p) => placeKey(p) === placeKey(place));
  useEffect(() => {
    document.documentElement.lang = prefs.language;
    document.documentElement.dataset.theme = prefs.theme;
    write("preferences", prefs);
  }, [prefs]);
  useEffect(() => {
    const pop = () => {
      const s = parseURL(location.search);
      setPlace(s.place);
      setView(s.view);
      setDay(s.day);
      setSelected(s.comparison);
      if (s.language) setPrefs((p) => ({ ...p, language: s.language! }));
    };
    addEventListener("popstate", pop);
    const online = () => {
      setOffline(false);
      setReload((v) => v + 1);
    };
    const off = () => setOffline(true);
    addEventListener("online", online);
    addEventListener("offline", off);
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      removeEventListener("popstate", pop);
      removeEventListener("online", online);
      removeEventListener("offline", off);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const a = new AbortController(),
      current = gate.current.next();
    setBusy(true);
    setError(null);
    setWeather(null);
    const forced = force.current;
    force.current = false;
    load(place, a.signal, forced)
      .then((result) => {
        if (current()) {
          setWeather(result.weather);
          setStatus(result.status);
          if ("error" in result) setError(result.error!);
        }
      })
      .catch(() => {
        if (!a.signal.aborted && current())
          setError("No saved forecast for this place. Connect and retry.");
      })
      .finally(() => {
        if (current()) setBusy(false);
      });
    write("last", place);
    return () => a.abort();
  }, [place, reload]);
  useEffect(() => {
    if (view === "compare")
      history.replaceState(
        null,
        "",
        serialize(place, view, day, prefs.language, selected),
      );
  }, [selected, view, place, day, prefs.language]);
  useEffect(() => {
    if (view !== "compare") return;
    const abort = new AbortController();
    let active = true;
    setCompareBusy(true);
    setCompareError(false);
    setComparison({});
    Promise.all(
      selected.map(async (p) => {
        try {
          const result = await load(p, abort.signal);
          return [placeKey(p), result.weather] as const;
        } catch {
          return null;
        }
      }),
    ).then((list) => {
      if (active) {
        setComparison(Object.fromEntries(list.filter((v) => v !== null)));
        setCompareError(list.some((v) => v === null));
        setCompareBusy(false);
      }
    });
    return () => {
      active = false;
      abort.abort();
    };
  }, [view, selected, reload]);
  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    const installed = () => setInstall(null);
    addEventListener("beforeinstallprompt", onInstall);
    addEventListener("appinstalled", installed);
    registerPWA(setUpdate).catch(() =>
      setNotice("Unable to reach the weather service. Try again."),
    );
    return () => {
      removeEventListener("beforeinstallprompt", onInstall);
      removeEventListener("appinstalled", installed);
    };
  }, []);
  function url(p = place, v = view, d = day, language = prefs.language) {
    history.pushState(null, "", serialize(p, v, d, language, selected));
  }
  function choose(p: Place) {
    setPlace(p);
    setDay("");
    setView("forecast");
    setResults([]);
    setQuery("");
    setSearchError(null);
    url(p, "forecast", "");
  }
  function preference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    setPrefs((p) => ({ ...p, [key]: value }));
    if (key === "language") {
      searchAbort.current?.abort();
      searchGate.current.next();
      setResults([]);
      setSearchBusy(false);
      url(place, view, day, value as Preferences["language"]);
    }
  }
  async function find(e: React.FormEvent) {
    e.preventDefault();
    searchAbort.current?.abort();
    const a = new AbortController();
    searchAbort.current = a;
    const current = searchGate.current.next();
    setResults([]);
    if (query.trim().length < 2) {
      setSearchError("Type at least two characters.");
      return;
    }
    setSearchBusy(true);
    setSearchError(null);
    try {
      const list = await search(query, prefs.language, a.signal);
      if (current()) {
        setResults(list);
        if (!list.length)
          setSearchError("No places found. Try a different name.");
      }
    } catch {
      if (!a.signal.aborted && current())
        setSearchError("Unable to reach the weather service. Try again.");
    } finally {
      if (current()) setSearchBusy(false);
    }
  }
  function geolocate() {
    setNotice(null);
    if (!navigator.geolocation) {
      setNotice("Your position is unavailable. Search for a place.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        choose({
          name: `${p.coords.latitude.toFixed(4)}°, ${p.coords.longitude.toFixed(4)}°`,
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        }),
      (e) =>
        setNotice(
          e.code === 1
            ? "Location permission denied. Search for a place instead."
            : e.code === 3
              ? "Location request timed out. Try again or search."
              : "Your position is unavailable. Search for a place.",
        ),
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
    );
  }
  function favourite() {
    const next = isSaved
      ? saved.filter((p) => placeKey(p) !== placeKey(place))
      : [place, ...saved].slice(0, 12);
    setSaved(next);
    write("favourites", next);
    setSelected((old) =>
      old.filter((p) => next.some((n) => placeKey(n) === placeKey(p))),
    );
  }
  const current = weather?.current;
  const expired = weather ? stale(weather, now) : false;
  const partial =
    weather &&
    (Object.values(weather.current).some((v) => v === null) ||
      weather.hours.some(
        (h) =>
          h.temperature === null || h.rain === null || h.probability === null,
      ));
  const instant = comparisonTime(now);
  return (
    <>
      <a className="skip" href="#main">
        {t("Skip to content")}
      </a>
      <header>
        <div className="header-inner">
          <a
            className="brand"
            href="?"
            onClick={(e) => {
              e.preventDefault();
              setView("forecast");
              url(place, "forecast");
            }}
          >
            <span className="logo">
              <Sun size={24} />
            </span>
            weather<span>atlas</span>
            <small> / </small>
          </a>
          <form className="search" onSubmit={find}>
            <Search size={17} />
            <input
              aria-label={t("Search city or postcode")}
              placeholder={t("Search city or postcode")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                searchAbort.current?.abort();
                searchGate.current.next();
                setSearchBusy(false);
                setResults([]);
                setSearchError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setResults([]);
                  setSearchError(null);
                }
                if (e.key === "ArrowDown" && results.length) {
                  e.preventDefault();
                  document
                    .querySelector<HTMLButtonElement>(".search-results button")
                    ?.focus();
                }
              }}
            />
            <button type="submit" disabled={searchBusy}>
              {searchBusy ? "…" : t("Search")}
            </button>
            {(results.length > 0 || searchError) && (
              <div
                className="search-results"
                aria-label={t("Search")}
                onKeyDown={(e) => {
                  const buttons = [
                    ...e.currentTarget.querySelectorAll("button"),
                  ];
                  const i = buttons.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    buttons[
                      (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                        buttons.length
                    ]?.focus();
                  }
                  if (e.key === "Escape") setResults([]);
                }}
              >
                {searchError ? (
                  <p role="status">{t(searchError)}</p>
                ) : (
                  results.map((p) => (
                    <button
                      type="button"
                      key={placeKey(p)}
                      onClick={() => choose(p)}
                    >
                      <MapPin size={15} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {[p.region, p.country].filter(Boolean).join(" · ")} ·{" "}
                          {p.latitude.toFixed(2)}, {p.longitude.toFixed(2)}
                        </small>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))
                )}
              </div>
            )}
          </form>
          <div className="header-actions">
            <select
              aria-label={t("Language")}
              value={prefs.language}
              onChange={(e) =>
                preference(
                  "language",
                  e.target.value as Preferences["language"],
                )
              }
            >
              <option value="en">English</option>
              <option value="it">Italiano</option>
            </select>
            <button
              className="icon-button"
              aria-label={t("Preferences")}
              aria-expanded={settings}
              onClick={() => setSettings(!settings)}
            >
              <SlidersHorizontal size={19} />
            </button>
          </div>
        </div>
      </header>
      {settings && (
        <section className="settings panel" aria-label={t("Preferences")}>
          <label>
            {t("Temperature")}
            <select
              aria-label={t("Temperature")}
              value={prefs.temperature}
              onChange={(e) =>
                preference(
                  "temperature",
                  e.target.value as Preferences["temperature"],
                )
              }
            >
              <option value="C">Celsius °C</option>
              <option value="F">Fahrenheit °F</option>
            </select>
          </label>
          <label>
            {t("Wind unit")}
            <select
              aria-label={t("Wind unit")}
              value={prefs.wind}
              onChange={(e) =>
                preference("wind", e.target.value as Preferences["wind"])
              }
            >
              {["km/h", "mph", "m/s"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            {t("Theme")}
            <select
              aria-label={t("Theme")}
              value={prefs.theme}
              onChange={(e) =>
                preference("theme", e.target.value as Preferences["theme"])
              }
            >
              {(["system", "light", "dark"] as const).map((s) => (
                <option value={s} key={s}>
                  {t(
                    s === "system"
                      ? "System"
                      : s === "light"
                        ? "Light"
                        : "Dark",
                  )}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setSettings(false)}>{t("Close")}</button>
        </section>
      )}
      <div className="workspace">
        <aside>
          <div className="sidebar-top">
            <span className="eyebrow">
              {t("Your everyday weather, in perspective.")}
            </span>
            <nav aria-label={t("Main navigation")}>
              {(["forecast", "compare", "sources"] as View[]).map((v) => (
                <a
                  href={serialize(place, v, day, prefs.language)}
                  key={v}
                  aria-current={view === v ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setView(v);
                    url(place, v);
                    if (v === "compare" && !selected.length)
                      setSelected(saved.slice(0, 3));
                  }}
                >
                  {v === "forecast" ? (
                    <Sun size={18} />
                  ) : v === "compare" ? (
                    <Globe2 size={18} />
                  ) : (
                    <Bookmark size={18} />
                  )}{" "}
                  {t(
                    v === "forecast"
                      ? "Forecast"
                      : v === "compare"
                        ? "Compare"
                        : "Sources",
                  )}
                </a>
              ))}
            </nav>
            <button className="location-button" onClick={geolocate}>
              <LocateFixed size={16} />
              {t("Use my location")}
            </button>
          </div>
          <section className="favourites">
            <div className="section-head">
              <h2>{t("Your places")}</h2>
              <span>{saved.length}/12</span>
            </div>
            <p>{t("Keep a few places close.")}</p>
            {saved.length ? (
              saved.map((p) => (
                <div className="saved-place" key={placeKey(p)}>
                  <button onClick={() => choose(p)}>
                    <MapPin size={15} />
                    <span>
                      {p.name}
                      <small>
                        {p.country ||
                          `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`}
                      </small>
                    </span>
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`${t("Remove")} ${p.name}`}
                    onClick={() => {
                      const next = saved.filter(
                        (q) => placeKey(q) !== placeKey(p),
                      );
                      setSaved(next);
                      write("favourites", next);
                      setSelected((old) =>
                        old.filter((q) => placeKey(q) !== placeKey(p)),
                      );
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-favourites">
                {t("No favourites yet. Save a place to find it here.")}
              </p>
            )}
          </section>
          <div className="suggestions">
            {suggested.map((p) => (
              <button key={p.name} onClick={() => choose(p)}>
                {p.name}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            {offline ? <WifiOff size={15} /> : <span className="online-dot" />}
            {t(offline ? "Offline" : "Online hint")}
            <small>Open-Meteo · GeoNames</small>
          </div>
        </aside>
        <main id="main">
          <div className="topline">
            <span>
              <MapPin size={13} /> {place.name}{" "}
              <span className="separator">/</span>{" "}
              {t(
                view === "forecast"
                  ? "Forecast"
                  : view === "compare"
                    ? "Compare"
                    : "Sources",
              )}
            </span>
            {install ? (
              <button
                onClick={async () => {
                  await install.prompt();
                  await install.userChoice;
                  setInstall(null);
                }}
              >
                <Download size={14} />
                {t("Install app")}
              </button>
            ) : null}
          </div>
          {notice && (
            <div className="banner" role="status">
              <Check size={16} />
              {t(notice)}
              <button aria-label={t("Close")} onClick={() => setNotice(null)}>
                <X size={14} />
              </button>
            </div>
          )}
          {!memoryOK && (
            <p className="banner">
              {t(
                "Storage unavailable; this session still works, but new data may not survive a reload.",
              )}
            </p>
          )}
          {update && (
            <div className="banner">
              {t("App update ready")}
              <button onClick={() => activateUpdate(update)}>
                {t("Update now")}
              </button>
            </div>
          )}
          {view === "sources" ? (
            <section className="panel sources">
              <span className="eyebrow">Weather Atlas</span>
              <h1>{t("Sources and methodology")}</h1>
              {(
                [
                  "Current conditions are model estimates, not measurements from a nearby station. Current precipitation covers the provider interval; hourly amounts cover the preceding hour. Probability (%) and amount (mm) are distinct.",
                  "Daily boundaries follow the provider’s offset at retrieval; clock labels use the location timezone and account for daylight saving.",
                  "Comparison uses one identical UTC hourly timestamp, never different local hours. Missing observations are not replaced by nearby times.",
                  "Forecast cache expires after 15 minutes. Up to eight visited places are stored locally; stale forecasts remain readable offline. No continuous polling.",
                  "Open-Meteo supplies numerical weather forecasts. Geocoding is based on GeoNames. Data is provided under CC BY 4.0. The free API is for non-commercial use, with limits of 10,000 calls/day, 5,000/hour and 600/minute; availability is not guaranteed. Commercial use requires appropriate provider terms.",
                ] as Key[]
              ).map((k) => (
                <p key={k}>{t(k)}</p>
              ))}
              <p>
                <a
                  href="https://open-meteo.com/en/docs"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open-Meteo ↗
                </a>{" "}
                ·{" "}
                <a href="https://open-meteo.com/en/terms">
                  {t("Terms")} / CC BY 4.0 ↗
                </a>{" "}
                · <a href="https://www.geonames.org/">GeoNames ↗</a>
              </p>
              <h2>{t("Install app")}</h2>
              <p>
                {t(
                  "Install from your browser menu (Install app / Add to Home Screen), where supported. On iOS use Share → Add to Home Screen.",
                )}
              </p>
            </section>
          ) : view === "compare" ? (
            <section className="comparison">
              <span className="eyebrow">Weather Atlas / {t("Compare")}</span>
              <h1>{t("Compare places")}</h1>
              <p>{t("Select up to three favourites.")}</p>
              <div className="compare-select">
                {saved.map((p) => (
                  <label key={placeKey(p)}>
                    <input
                      type="checkbox"
                      checked={selected.some(
                        (q) => placeKey(q) === placeKey(p),
                      )}
                      disabled={
                        selected.length === 3 &&
                        !selected.some((q) => placeKey(q) === placeKey(p))
                      }
                      onChange={() =>
                        setSelected((old) =>
                          old.some((q) => placeKey(q) === placeKey(p))
                            ? old.filter((q) => placeKey(q) !== placeKey(p))
                            : [...old, p],
                        )
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <p className="data-note">
                {t("Same UTC instant")}:{" "}
                {new Date(instant * 1000)
                  .toISOString()
                  .replace("T", " ")
                  .slice(0, 16)}{" "}
                UTC.{" "}
                {t(
                  "Comparison uses one identical UTC hourly timestamp, never different local hours. Missing observations are not replaced by nearby times.",
                )}
              </p>
              {compareBusy && <p role="status">{t("Loading weather…")}</p>}
              {compareError && (
                <p className="banner">
                  {t("Unable to reach the weather service. Try again.")}
                </p>
              )}
              {!saved.length && !selected.length && (
                <p className="empty">
                  {t("Add favourites to compare places.")}
                </p>
              )}
              <div className="compare-grid">
                {selected.map((p) => {
                  const w = comparison[placeKey(p)],
                    h = w?.hours.find((h) => h.time === instant);
                  return (
                    <article className="panel" key={placeKey(p)}>
                      <MapPin size={20} />
                      <h2>{p.name}</h2>
                      <p>{p.country}</p>
                      {w && (
                        <>
                          <small>
                            {t("Local time")}:{" "}
                            {clock(instant, w.timezone, prefs.language, true)}
                          </small>
                          <small>
                            {w.timezone} ·{" "}
                            {t(stale(w, now) ? "Expired cache" : "Saved data")}
                          </small>
                          <small>
                            {t("Retrieved")}:{" "}
                            {clock(
                              w.fetched / 1000,
                              w.timezone,
                              prefs.language,
                              true,
                            )}
                          </small>
                        </>
                      )}
                      {h ? (
                        <dl>
                          <div>
                            <dt>{t("Temperature")}</dt>
                            <dd>
                              {n(temp(h.temperature, prefs.temperature))} °
                              {prefs.temperature}
                            </dd>
                          </div>
                          <div>
                            <dt>{t("Rain amount")}</dt>
                            <dd>{n(h.rain)} mm</dd>
                          </div>
                          <div>
                            <dt>{t("Rain chance")}</dt>
                            <dd>{n(h.probability)}%</dd>
                          </div>
                          <div>
                            <dt>{t("Wind")}</dt>
                            <dd>
                              {n(wind(h.wind, prefs.wind))} {prefs.wind}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p>{t("No forecast for this exact instant.")}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <>
              {busy && (
                <p className="loading" role="status">
                  {t("Loading weather…")}
                </p>
              )}
              {error && (
                <div className="banner" role="status">
                  {t(error)}
                  <button
                    disabled={busy}
                    onClick={() => {
                      force.current = true;
                      setReload((v) => v + 1);
                    }}
                  >
                    {t("Refresh")}
                  </button>
                </div>
              )}
              {weather && current && (
                <>
                  <section
                    className={`current panel ${current.day === 0 ? "night" : ""}`}
                  >
                    <div className="current-heading">
                      <div>
                        <span className="eyebrow">
                          {t("Current conditions")}
                        </span>
                        <h1>{place.name}</h1>
                        <p>
                          <MapPin size={13} />{" "}
                          {[place.region, place.country]
                            .filter(Boolean)
                            .join(" · ")}{" "}
                          <span>{weather.timezone}</span>
                        </p>
                      </div>
                      <div className="current-actions">
                        <button
                          aria-pressed={isSaved}
                          disabled={!isSaved && saved.length >= 12}
                          onClick={favourite}
                        >
                          {isSaved ? (
                            <Bookmark size={16} />
                          ) : (
                            <Plus size={16} />
                          )}{" "}
                          {t(isSaved ? "Saved" : "Save place")}
                        </button>
                        <button
                          aria-label={t("Share")}
                          onClick={async () => {
                            url();
                            try {
                              await navigator.clipboard.writeText(
                                location.href,
                              );
                              setNotice("Link copied.");
                            } catch {
                              setNotice(
                                "Copy the URL from your browser address bar.",
                              );
                            }
                          }}
                        >
                          <Link2 size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="current-main">
                      <div>
                        <span className="big-temperature">
                          {n(temp(current.temperature, prefs.temperature))}
                          <sup>°{prefs.temperature}</sup>
                        </span>
                        <p>
                          {t("Feels like")}{" "}
                          {n(temp(current.feels, prefs.temperature))}° ·{" "}
                          {t(condition(current.code))}
                        </p>
                        <span className="day-label">
                          {t(
                            current.day === null
                              ? "Day / night unavailable"
                              : current.day
                                ? "Daytime"
                                : "Nighttime",
                          )}
                        </span>
                      </div>
                      <div className="weather-art">
                        <WeatherIcon
                          code={current.code}
                          day={current.day}
                          size={132}
                        />
                      </div>
                    </div>
                    <div className="current-meta">
                      <span className="status-dot" />
                      {t(expired ? "Expired cache" : status)}
                      <span>
                        · {t("Valid")}{" "}
                        {clock(
                          current.time,
                          weather.timezone,
                          prefs.language,
                          true,
                        )}
                      </span>
                      <button
                        disabled={busy}
                        onClick={() => {
                          force.current = true;
                          setReload((v) => v + 1);
                        }}
                      >
                        <RefreshCw size={13} />
                        {t(busy ? "Refreshing…" : "Refresh")}
                      </button>
                    </div>
                    <div className="retrieved">
                      {t("Retrieved")}:{" "}
                      {clock(
                        weather.fetched / 1000,
                        weather.timezone,
                        prefs.language,
                        true,
                      )}{" "}
                      · {t("Modelled weather · Open-Meteo")}
                    </div>
                  </section>
                  {weather.hours.at(-1)!.time * 1000 < now && (
                    <p className="banner">
                      {t(
                        "Forecast period has passed. These are archived predictions.",
                      )}
                    </p>
                  )}
                  {partial && (
                    <p className="data-note">
                      {t(
                        "Partial forecast: unavailable values are shown as —.",
                      )}
                    </p>
                  )}
                  <div className="metrics">
                    {[
                      {
                        icon: Wind,
                        label: t("Wind"),
                        value: `${n(wind(current.wind, prefs.wind))} ${prefs.wind}`,
                        detail: `${t("Direction")} ${n(current.direction)}° · ${t("Gusts")} ${n(wind(current.gusts, prefs.wind))} ${prefs.wind}`,
                      },
                      {
                        icon: Droplets,
                        label: t("Humidity"),
                        value: `${n(current.humidity)}%`,
                        detail: t("Current conditions"),
                      },
                      {
                        icon: CloudRain,
                        label: t("Precipitation"),
                        value: `${n(current.rain)} mm`,
                        detail: `${weather.interval / 60} min · ${t("Modelled weather · Open-Meteo")}`,
                      },
                    ].map((m) => (
                      <article className="panel metric" key={m.label}>
                        <div>
                          <m.icon size={20} />
                          <span>{m.label}</span>
                        </div>
                        <strong>{m.value}</strong>
                        <small>{m.detail}</small>
                      </article>
                    ))}
                  </div>
                  <Forecast
                    weather={weather}
                    prefs={prefs}
                    day={day}
                    onDay={(d) => {
                      setDay(d);
                      url(place, view, d);
                    }}
                    now={now}
                  />
                </>
              )}
              {!weather && !busy && !error && (
                <p className="empty">{t("Choose a place to begin")}</p>
              )}
            </>
          )}
          <footer>
            <span>
              <Sun size={15} /> weather atlas{" "}
              <small>{t("Weather for the places that matter.")}</small>
            </span>
            <span>
              {t("A project by Federico Santorsola")} ·{" "}
              <a href="https://open-meteo.com/">Open-Meteo</a> /{" "}
              <a href="https://www.geonames.org/">GeoNames</a>
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}
