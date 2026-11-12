# Attribution and terms

## Weather and geocoding data

Weather forecasts: [Open-Meteo](https://open-meteo.com/), incorporating numerical models from the agencies documented by the provider. Location search: Open-Meteo Geocoding API, based on [GeoNames](https://www.geonames.org/). Data is provided under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), subject to provider terms and underlying attribution requirements.

Adaptations in Weather Atlas: selection of forecast variables, normalisation of response fields, localised labels, temperature and wind-unit conversions, filtering of hourly data and comparison at an identical UTC instant. Model values are not presented as measurements from a nearby station.

[Open-Meteo terms](https://open-meteo.com/en/terms) distinguish the free non-commercial API service from the data licence. The free API is limited to fewer than 10,000 calls/day, 5,000/hour and 600/minute. Availability and accuracy are not guaranteed. Commercial use requires appropriate provider arrangements; this project does not promise unrestricted commercial access.

## Code and visual assets

React, Recharts, Lucide and build/test dependencies retain their own package copyright notices and licences. Weather icons use Lucide (ISC); PWA icons were drawn specifically for Weather Atlas using geometric shapes. No external photography or icon fonts are required.

No LICENSE file was present in the starting application. The starting point is retained in the initial local commit. No project-wide open-source licence has been assigned to the application code, and the data licence is not extended to code or third-party components. Provider credits and mandatory dependency notices remain applicable.
