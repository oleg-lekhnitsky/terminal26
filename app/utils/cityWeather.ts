export const weatherCities = [
  { name: 'Istanbul', latitude: 41.0082, longitude: 28.9784 },
  { name: 'Minsk', latitude: 53.9006, longitude: 27.5590 },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Seoul', latitude: 37.5665, longitude: 126.978 },
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018 },
  { name: 'New York', latitude: 40.7128, longitude: -74.006 },
] as const

export interface CityWeather {
  city: string
  temperature: number
  code: number
  isDay: boolean
  feelsLike: number
  wind: number
  humidity: number
  condition: string
  time: string
  sunrise?: string
  sunset?: string
}

// Paired background/ink tokens for each sky state, with a darker night variant.
export const weatherPalettes = {
  clear: { day: ['#daf759', '#473414'], night: ['#202044', '#ded5ff'] },
  cloud: { day: ['#b9cbd5', '#263b48'], night: ['#303d50', '#d7e4ec'] },
  fog: { day: ['#d1d6cd', '#38433a'], night: ['#3c4845', '#e0e7dd'] },
  rain: { day: ['#8eb5c9', '#153d53'], night: ['#162f46', '#bce0f2'] },
  snow: { day: ['#e0ecee', '#304c60'], night: ['#334763', '#edf6fc'] },
  storm: { day: ['#8d80ae', '#231638'], night: ['#292038', '#e6d1fa'] },
} as const

export function weatherPalette(weather?: Pick<CityWeather, 'code' | 'isDay'>) {
  if (!weather || typeof weather.isDay !== 'boolean') return { background: '#daf759', color: '#473414' }
  const code = weather.code
  const group = [95, 96, 99].includes(code) ? 'storm'
    : [71, 73, 75, 77, 85, 86].includes(code) ? 'snow'
    : [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code) ? 'rain'
    : [45, 48].includes(code) ? 'fog'
    : [0, 1].includes(code) ? 'clear' : 'cloud'
  const [background, color] = weatherPalettes[group][weather.isDay ? 'day' : 'night']
  return { background, color }
}
export function weatherCondition(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if ([45, 48].includes(code)) return 'Fog'
  if ([51, 53, 55].includes(code)) return 'Drizzle'
  if ([56, 57].includes(code)) return 'Freezing drizzle'
  if ([61, 63, 65].includes(code)) return 'Rain'
  if ([66, 67].includes(code)) return 'Freezing rain'
  if ([71, 73, 75, 77].includes(code)) return 'Snow'
  if ([80, 81, 82].includes(code)) return 'Rain showers'
  if ([85, 86].includes(code)) return 'Snow showers'
  if ([95, 96, 99].includes(code)) return 'Thunderstorms'
  return 'Conditions unavailable'
}
