export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  region?: string;
  country?: string;
}
export type Language = "en" | "it";
export interface Preferences {
  language: Language;
  temperature: "C" | "F";
  wind: "km/h" | "mph" | "m/s";
  theme: "system" | "light" | "dark";
}
export interface Hour {
  time: number;
  day: number | null;
  temperature: number | null;
  rain: number | null;
  probability: number | null;
  wind: number | null;
  code: number | null;
}
export interface Day {
  time: number;
  date: string;
  min: number | null;
  max: number | null;
  rain: number | null;
  probability: number | null;
  wind: number | null;
  sunrise: number | null;
  sunset: number | null;
  uv: number | null;
  code: number | null;
}
export interface Weather {
  place: Place;
  fetched: number;
  timezone: string;
  interval: number;
  current: {
    time: number;
    temperature: number | null;
    feels: number | null;
    humidity: number | null;
    wind: number | null;
    direction: number | null;
    gusts: number | null;
    rain: number | null;
    day: number | null;
    code: number | null;
  };
  hours: Hour[];
  days: Day[];
}
export type View = "forecast" | "compare" | "sources";
