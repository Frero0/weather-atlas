export function weatherDescription(code) {
  if(code===0)return ['Sereno','☀️'];
  if([1,2].includes(code))return ['Parzialmente nuvoloso','🌤️'];
  if(code===3)return ['Coperto','☁️'];
  if([45,48].includes(code))return ['Nebbia','🌫️'];
  if([51,53,55,56,57].includes(code))return ['Pioviggine','🌦️'];
  if([61,63,65,66,67,80,81,82].includes(code))return ['Pioggia','🌧️'];
  if([71,73,75,77,85,86].includes(code))return ['Neve','🌨️'];
  if([95,96,99].includes(code))return ['Temporali','⛈️'];
  return ['Condizioni non disponibili','🌡️'];
}
async function getJson(url, fetcher) {
  try {
    const response=await fetcher(url,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error();
    const data=await response.json();
    if(data.error)throw new Error();
    return data;
  }catch{throw new Error('Impossibile contattare il servizio meteo. Controlla la connessione e riprova.');}
}
export async function searchCities(query,fetcher=fetch) {
  const name=query.trim();
  if(name.length<2)throw new Error('Inserisci almeno due caratteri per cercare una città.');
  const url=new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search=new URLSearchParams({name,count:'5',language:'it',format:'json'});
  const data=await getJson(url,fetcher);
  if(!data.results?.length)throw new Error('Nessuna città trovata. Prova con un altro nome.');
  return data.results;
}
export async function getForecast(latitude,longitude,fetcher=fetch) {
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('Coordinate della posizione non valide.');
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude,longitude,current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',timezone:'auto',forecast_days:'7',temperature_unit:'celsius',wind_speed_unit:'kmh',precipitation_unit:'mm'});
  const data=await getJson(url,fetcher);
  if(!data.current||!data.daily?.time?.length)throw new Error('Previsioni non disponibili per questa località.');
  return data;
}
