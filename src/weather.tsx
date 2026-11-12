import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Thermometer,
} from "lucide-react";
import type { Key } from "./i18n";
export function condition(code: number | null): Key {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55].includes(code!)) return "Drizzle";
  if ([56, 57].includes(code!)) return "Freezing drizzle";
  if ([61, 63, 65].includes(code!)) return "Rain";
  if ([66, 67].includes(code!)) return "Freezing rain";
  if ([71, 73, 75].includes(code!)) return "Snow";
  if (code === 77) return "Snow grains";
  if ([80, 81, 82].includes(code!)) return "Rain showers";
  if ([85, 86].includes(code!)) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";
  return "Unknown conditions";
}
export function WeatherIcon({
  code,
  day = 1,
  size = 24,
}: {
  code: number | null;
  day?: number | null;
  size?: number;
}) {
  const name = condition(code);
  const Icon =
    name === "Clear" || name === "Mainly clear"
      ? day === 0
        ? Moon
        : Sun
      : name === "Partly cloudy"
        ? day === 0
          ? CloudMoon
          : CloudSun
        : name === "Overcast"
          ? Cloud
          : name === "Fog"
            ? CloudFog
            : name.includes("drizzle") || name === "Drizzle"
              ? CloudDrizzle
              : name.includes("Snow") || name === "Snow"
                ? CloudSnow
                : name.includes("Thunderstorm")
                  ? CloudLightning
                  : name.toLowerCase().includes("rain")
                    ? CloudRain
                    : Thermometer;
  return <Icon aria-hidden="true" size={size} strokeWidth={1.6} />;
}
