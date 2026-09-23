import { weatherCities, weatherCondition, type CityWeather } from '../../app/utils/cityWeather'

export default defineCachedEventHandler(async (): Promise<CityWeather[]> => {
  try {
    const result = await $fetch<{ current: Record<string, unknown>; daily?: { sunrise?: (string | null)[]; sunset?: (string | null)[] } }[]>('https://api.open-meteo.com/v1/forecast', {
      query: {
        latitude: weatherCities.map(city => city.latitude).join(','),
        longitude: weatherCities.map(city => city.longitude).join(','),
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
        daily: 'sunrise,sunset',
        temperature_unit: 'celsius', wind_speed_unit: 'kmh', timezone: 'auto', forecast_days: 1,
      }, timeout: 10000, retry: 1,
    })
    if (!Array.isArray(result) || result.length !== weatherCities.length) throw new Error('Invalid forecast')
    return result.map((forecast, index) => {
      const current = forecast.current
      const number = (key: string) => {
        const value = current?.[key]
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Missing weather value')
        return Math.round(value)
      }
      if (typeof current?.time !== 'string') throw new Error('Missing weather time')
      return {
        city: weatherCities[index]!.name, temperature: number('temperature_2m'),
        code: number('weather_code'), isDay: number('is_day') === 1,
        feelsLike: number('apparent_temperature'), humidity: number('relative_humidity_2m'),
        wind: number('wind_speed_10m'), condition: weatherCondition(number('weather_code')), time: current.time,
        sunrise: forecast.daily?.sunrise?.[0] ?? undefined,
        sunset: forecast.daily?.sunset?.[0] ?? undefined,
      }
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Weather is temporarily unavailable' })
  }
}, { maxAge: 600, name: 'city-weather-v5-sun-times' })
