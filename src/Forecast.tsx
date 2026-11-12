import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Sunrise, Sunset, Wind, Sun, CloudRain } from "lucide-react";
import type { Weather, Preferences, Day } from "./types";
import { translator, locale } from "./i18n";
import { temp, wind, number, clock, dayLabel, upcoming } from "./time";
import { condition, WeatherIcon } from "./weather";
export default function Forecast({
  weather: w,
  prefs: p,
  day,
  onDay,
  now,
}: {
  weather: Weather;
  prefs: Preferences;
  day: string;
  onDay: (day: string) => void;
  now: number;
}) {
  const t = translator(p.language),
    n = (v: number | null) => number(v, p.language);
  const hours = upcoming(w, now);
  const days = w.days.slice(0, 7);
  const selected: Day = days.find((d) => d.date === day) || days[0];
  const points = hours.map((h) => ({
    ...h,
    temperature: temp(h.temperature, p.temperature),
  }));
  return (
    <>
      <section className="panel hourly">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t("Next 48 hours")}</span>
            <h2>{t("Temperature trend")}</h2>
          </div>
          <span className="subtle">
            °{p.temperature} · {w.timezone}
          </span>
        </div>
        <div className="hour-strip">
          {hours.slice(0, 12).map((h) => (
            <div key={h.time}>
              <small>{clock(h.time, w.timezone, p.language)}</small>
              <WeatherIcon code={h.code} day={h.day} />
              <strong>{n(temp(h.temperature, p.temperature))}°</strong>
              <span className="rain">
                <CloudRain size={12} />
                {n(h.probability)}%
              </span>
              <small>{n(h.rain)} mm</small>
            </div>
          ))}
        </div>
        <div className="chart" aria-label={t("Temperature trend")}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={points}
              margin={{ top: 15, right: 15, bottom: 5, left: -20 }}
              accessibilityLayer
            >
              <defs>
                <linearGradient
                  id="temperature-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#538dd0" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#538dd0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 5"
                vertical={false}
                stroke="var(--line)"
              />
              <XAxis
                dataKey="time"
                tickFormatter={(v) =>
                  new Intl.DateTimeFormat(locale(p.language), {
                    timeZone: w.timezone,
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(Number(v) * 1000)
                }
                minTickGap={60}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
              />
              <YAxis
                tickFormatter={(v) => `${v}°`}
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
              />
              <Tooltip
                labelFormatter={(v) =>
                  clock(Number(v), w.timezone, p.language, true)
                }
                formatter={(v) => [
                  `${n(Number(v))} °${p.temperature}`,
                  t("Temperature"),
                ]}
                contentStyle={{
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  color: "var(--text)",
                }}
              />
              <Area
                type="linear"
                dataKey="temperature"
                stroke="#598dc5"
                strokeWidth={2.5}
                fill="url(#temperature-fill)"
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <details className="hour-table">
          <summary>
            {t("Hourly details")} · {hours.length} h
          </summary>
          <div className="table-scroll">
            <table>
              <caption>
                {w.timezone} · {t("Rain chance")} (%) / {t("Rain amount")} (mm)
              </caption>
              <thead>
                <tr>
                  {[
                    t("Time"),
                    `${t("Temperature")} °${p.temperature}`,
                    `${t("Rain chance")} %`,
                    `${t("Rain amount")} mm`,
                    `${t("Wind")} ${p.wind}`,
                  ].map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h.time}>
                    <th scope="row">
                      {clock(h.time, w.timezone, p.language, true)}
                    </th>
                    <td>{n(temp(h.temperature, p.temperature))}</td>
                    <td>{n(h.probability)}</td>
                    <td>{n(h.rain)}</td>
                    <td>{n(wind(h.wind, p.wind))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="panel week">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t("Select a day for details")}</span>
            <h2>{t("7-day outlook")}</h2>
          </div>
        </div>
        <div className="days">
          {days.map((d) => (
            <button
              className="day"
              key={d.date}
              aria-pressed={selected.date === d.date}
              onClick={() => onDay(d.date)}
            >
              <span>{dayLabel(d.date, p.language)}</span>
              <WeatherIcon code={d.code} />
              <span className="day-condition">{t(condition(d.code))}</span>
              <strong>
                {n(temp(d.max, p.temperature))}°{" "}
                <small>{n(temp(d.min, p.temperature))}°</small>
              </strong>
              <span className="rain">
                {n(d.probability)}% <small>· {n(d.rain)} mm</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel day-detail">
        <div className="section-head">
          <h2>
            {t("Daily detail")}{" "}
            <span>· {dayLabel(selected.date, p.language)}</span>
          </h2>
        </div>
        <div className="detail-grid">
          {[
            {
              icon: Sun,
              label: t("Minimum") + " / " + t("Maximum"),
              value: `${n(temp(selected.min, p.temperature))} / ${n(temp(selected.max, p.temperature))} °${p.temperature}`,
            },
            {
              icon: Wind,
              label: t("Wind") + " · " + t("Maximum"),
              value: `${n(wind(selected.wind, p.wind))} ${p.wind}`,
            },
            {
              icon: Sunrise,
              label: t("Sunrise"),
              value: clock(selected.sunrise, w.timezone, p.language),
            },
            {
              icon: Sunset,
              label: t("Sunset"),
              value: clock(selected.sunset, w.timezone, p.language),
            },
            { icon: Sun, label: t("UV index"), value: n(selected.uv) },
          ].map((v) => (
            <div key={v.label}>
              <v.icon size={21} />
              <small>{v.label}</small>
              <strong>{v.value}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
