import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import App,{WeatherCard} from './src/App';
import {readSavedWeather,saveWeather} from './src/api/fetchWeather';
import {weatherDescription,searchCities} from './src/api/meteo';
(async()=>{
 const weather={location:{name:'Roma',latitude:41.9,longitude:12.5,country:'Italia'},current:{temperature_2m:20,apparent_temperature:19,weather_code:0,time:'2026-11-05T12:00',relative_humidity_2m:50,wind_speed_10m:5},savedAt:'2026-11-05T12:05:00Z'};
 let content=null;const storage={getItem:()=>content,setItem:(key,value)=>content=value};
 assert.equal(readSavedWeather(storage),null);assert.equal(saveWeather(storage,weather),true);assert.equal(readSavedWeather(storage).location.name,'Roma');
 content='invalid';assert.equal(readSavedWeather(storage),null);content='{}';assert.equal(readSavedWeather(storage),null);
 assert.equal(saveWeather({setItem(){throw Error();}},weather),false);
 const saved=renderToStaticMarkup(<WeatherCard weather={weather} saved online={false} busy={false}/>);assert.match(saved,/Ultime informazioni salvate/);assert.match(saved,/disabled/);assert.match(saved,/Sereno/);assert.match(saved,/20/);
 const live=renderToStaticMarkup(<WeatherCard weather={weather} saved={false} online busy={false}/>);assert.match(live,/Dati appena recuperati/);assert.match(live,/Aggiorna il meteo/);
 assert.equal(weatherDescription(95)[0],'Temporali');await assert.rejects(()=>searchCities('a'),/due caratteri/);
 const page=renderToStaticMarkup(<App/>);assert.match(page,/Federico Santorsola/);assert.match(page,/Cerca una città/);
 console.log('Verificati: dati salvati, memoria non disponibile, modalità offline, etichette italiane e pagina iniziale.');
})();
