import type { CityWeather } from './cityWeather.ts'

type SkyKind = 'day' | 'night' | 'overcast' | 'rain' | 'snow' | 'fog' | 'storm' | 'sunrise' | 'sunset'
export interface WeatherSky { kind: SkyKind; src: string; brightness: number }
type SkyWeather = Pick<CityWeather, 'code' | 'isDay' | 'time' | 'sunrise' | 'sunset'>

// Both timestamps are local to the same city. Treat them as wall-clock values,
// independent of the browser's timezone, and reject missing/polar sun times.
function nearSunEvent(time: string, event?: string) {
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/
  if (!event || !pattern.test(time) || !pattern.test(event)) return false
  return Math.abs(Date.parse(`${time}Z`) - Date.parse(`${event}Z`)) <= 45 * 60 * 1000
}

export function weatherSky(weather?: SkyWeather): WeatherSky | undefined {
  if (!weather) return undefined
  const { code, isDay, time, sunrise, sunset } = weather
  let kind: SkyKind
  if ([95, 96, 99].includes(code)) kind = 'storm'
  else if ([71, 73, 75, 77, 85, 86].includes(code)) kind = 'snow'
  else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) kind = 'rain'
  else if ([45, 48].includes(code)) kind = 'fog'
  else if (code === 3) kind = 'overcast'
  else if ([0, 1, 2].includes(code) && nearSunEvent(time, sunrise)) kind = 'sunrise'
  else if ([0, 1, 2].includes(code) && nearSunEvent(time, sunset)) kind = 'sunset'
  else kind = isDay ? 'day' : 'night'
  const darken = !isDay && ['rain', 'snow', 'fog', 'overcast', 'storm'].includes(kind)
  return { kind, src: `/images/weather/sky-${kind}-v1.png`, brightness: darken ? .5 : 1 }
}
