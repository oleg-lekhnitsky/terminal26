# Weather card

City changes overlap instead of waiting for the entire card to disappear. City, temperature, condition, and details use successive `motionSystem.stagger` beats. Entrances use `enter`, exits use `exit`, exit stagger is half a beat, and incoming content starts after half an exit. Text travels `travel` em on entry and half that distance on exit; city and temperature reveal through fixed masks. Both opacity and transforms use the existing Flow curve. Palette transitions use the shared entrance duration. Reduced motion removes transitions and their lifecycle delays. Inspired by Transitions.dev's text reveal and number-transition patterns; no motion tokens or other presets were changed.

Typographic current-weather card powered by Open-Meteo, the same service used by OpenCCTV's camera-page weather widgets. Displays temperature in Celsius, WMO condition, apparent temperature, wind in km/h, humidity, and the provider's local data timestamp.

Rotates Istanbul, Minsk, Tokyo, Seoul, Bangkok, and New York every 24 seconds while visible. Edit `weatherCities` in `app/utils/cityWeather.ts` for the list. The server endpoint `/api/city-weather` fetches all coordinates together, validates required values, and caches for ten minutes. The client refreshes after ten minutes and retries failures on the next rotation. Old readings stay visible with an update-unavailable label and their timestamp; initial errors offer a retry button. No placeholder temperatures are shown.

Uses the selected AB Terminal font, global tracking, and shared Flow transitions. Offscreen or hidden cards stop rotating; reduced-motion disables transitions. Open-Meteo attribution links below the card.

Validation: all four locations returned current weather in their expected timezones; production build passes. Browser visual review remains pending.
