import {getForecast} from './meteo';
export async function fetchWeather(city){const forecast=await getForecast(city.latitude,city.longitude);return {location:city,current:forecast.current,savedAt:new Date().toISOString()};}
export const STORAGE_KEY='federico-meteo-pwa-16-last';
export function readSavedWeather(storage){try{const data=JSON.parse(storage.getItem(STORAGE_KEY));return data&&typeof data.location?.name==='string'&&Number.isFinite(data.location.latitude)&&Number.isFinite(data.location.longitude)&&typeof data.current?.temperature_2m==='number'&&typeof data.current.time==='string'&&typeof data.savedAt==='string'&&Number.isFinite(Date.parse(data.savedAt))&&Number.isFinite(Date.parse(data.current.time))?data:null;}catch{return null;}}
export function saveWeather(storage,weather){try{storage.setItem(STORAGE_KEY,JSON.stringify(weather));return true;}catch{return false;}}
