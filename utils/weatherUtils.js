//weather utlity
import { EmbedBuilder } from 'discord.js';

//current weather embed
export function buildCurrentWeatherEmbed({
  interaction,
  weather,
  air,
  weatherData,
  unitSymbol,
  convertFromCelsius,
  condition,
  emoji,
  moonPhase,
  treePollen,
  weedPollen,
}) {
  return new EmbedBuilder()
    .setColor('Blue')
    .setTitle(`${emoji} Weather Report (${unitSymbol})`)
    .setDescription(`### Current weather for ${interaction.user}`)
    .addFields(
      {
        name: '🌡 Temperature',
        value: `${convertFromCelsius(weather.temperature_2m).toFixed(1)}${unitSymbol}`,
        inline: true,
      },
      {
        name: `${feelsLikeEmoji(weather.apparent_temperature)} Feels Like`,
        value: `${convertFromCelsius(weather.apparent_temperature).toFixed(1)}${unitSymbol}`,
        inline: true,
      },
      {
        name: '🌤️ Condition',
        value: condition,
        inline: true,
      },
      {
        name: '💨 Wind',
        value: `${Math.round(weather.wind_speed_10m)} km/h`,
        inline: true,
      },
      {
        name: '🌧 Rain',
        value: `${weather.precipitation} mm`,
        inline: true,
      },
      {
        name: '💦 Humidity',
        value: `${weather.relative_humidity_2m}%`,
        inline: true,
      },
      {
        name: '☀️ UV Index',
        value: uvLevel(air.uv_index),
        inline: true,
      },
      {
        name: '📈 Pressure',
        value: `${Math.round(weather.pressure_msl)} hPa`,
        inline: true,
      },
      {
        name: '👀 Visibility',
        value:
          weather.visibility != null
            ? `${(weather.visibility / 1000).toFixed(1)} km`
            : 'N/A',
        inline: true,
      },
      {
        name: '🌅 Sunrise',
        value: formatTime(weatherData.daily?.sunrise?.[0]),
        inline: true,
      },
      {
        name: '🌇 Sunset',
        value: formatTime(weatherData.daily?.sunset?.[0]),
        inline: true,
      },
      {
        name: '🌙 Moon Phase',
        value: moonPhase,
        inline: true,
      },
      {
        name: '🌳 Tree Pollen',
        value: pollenLevel(treePollen),
        inline: true,
      },
      {
        name: '🌾 Grass Pollen',
        value: pollenLevel(air.grass_pollen),
        inline: true,
      },
      {
        name: '🌼 Weed Pollen',
        value: pollenLevel(weedPollen),
        inline: true,
      }
    )
    .setFooter({ text: 'Location hidden for privacy' })
    .setTimestamp();
}

//pollen embed
export function buildPollenEmbed({
  interaction,
  grass,
  ragweed,
  mugwort,
  birch,
  alder,
  olive,
  allergyRisk,
  dominantPollen,
}) {
  return new EmbedBuilder()
    .setColor('Green')
    .setTitle('🌿 Pollen Report')
    .setDescription(`### Current pollen conditions for ${interaction.user}`)
    .addFields(
      {
        name: '🌾 Grass',
        value: `${grass}\n${pollenLevel(grass)}`,
        inline: true,
      },
      {
        name: '🌼 Ragweed',
        value: `${ragweed}\n${pollenLevel(ragweed)}`,
        inline: true,
      },
      {
        name: '🌿 Mugwort',
        value: `${mugwort}\n${pollenLevel(mugwort)}`,
        inline: true,
      },
      {
        name: '🌲 Birch',
        value: `${birch}\n${pollenLevel(birch)}`,
        inline: true,
      },
      {
        name: '🌳 Alder',
        value: `${alder}\n${pollenLevel(alder)}`,
        inline: true,
      },
      {
        name: '🫒 Olive',
        value: `${olive}\n${pollenLevel(olive)}`,
        inline: true,
      },
      {
        name: '🤧 Allergy Risk',
        value: allergyRisk,
        inline: true,
      },
      {
        name: '🌱 Dominant Pollen',
        value: `${dominantPollen.name} (${dominantPollen.value})`,
        inline: true,
      },
      {
        name: '📍 Status',
        value: 'Current',
        inline: true,
      }
    )
    .setFooter({ text: 'Location hidden for privacy' })
    .setTimestamp();
}

//forecast embed
export function buildForecastEmbed({ interaction, forecastLines, unitSymbol }) {
  return new EmbedBuilder()
    .setColor('Blue')
    .setTitle(`🌦️ Weather Forecast (${unitSymbol})`)
    .setDescription(
      `### 10-day forecast for ${interaction.user}\n\n` +
        forecastLines.join('\n\n')
    )
    .setFooter({ text: 'Location hidden for privacy' })
    .setTimestamp();
}

//weather codes to text
export function weatherCodeToText(code) {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };

  return codes[code] || 'Unknown';
}

//emoji for weather codes
export function weatherCodeToEmoji(code) {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌍';
}

//format date for forecast display
export function formatForecastDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

//time formatter
export function formatTime(dateString) {
  if (!dateString) return 'N/A';

  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

//convert pollen level to text
export function pollenLevel(value) {
  if (value == null) return '⚪ N/A';
  if (value < 1) return '🟢 None';
  if (value < 10) return '🟡 Low';
  if (value < 50) return '🟠 Moderate';
  if (value < 100) return '🔴 High';

  return '🟣 Very High';
}

//convert UV level to text
export function uvLevel(uv) {
  if (uv == null) return 'N/A';

  uv = Number(uv.toFixed(1));

  if (uv < 3) return `🟢 Low (${uv})`;
  if (uv < 6) return `🟡 Moderate (${uv})`;
  if (uv < 8) return `🟠 High (${uv})`;
  if (uv < 11) return `🔴 Very High (${uv})`;

  return `🟣 Extreme (${uv})`;
}

//find the feel
export function feelsLikeEmoji(tempC) {
  if (tempC <= -10) return '🧊';
  if (tempC <= 0) return '🥶';
  if (tempC <= 10) return '🧥';
  if (tempC <= 20) return '😊';
  if (tempC <= 25) return '😅';
  if (tempC <= 35) return '🥵';

  return '💀';
}

//moon phase
export function getMoonPhase(date = new Date()) {
  const lp = 2551443;
  const now = date.getTime() / 1000;

  const newMoon = new Date('2000-01-06T18:14:00Z').getTime() / 1000;

  const phase = ((((now - newMoon) % lp) + lp) % lp) / lp;

  if (phase < 0.03 || phase > 0.97) return '🌑 New Moon';
  if (phase < 0.22) return '🌒 Waxing Crescent';
  if (phase < 0.28) return '🌓 First Quarter';
  if (phase < 0.47) return '🌔 Waxing Gibbous';
  if (phase < 0.53) return '🌕 Full Moon';
  if (phase < 0.72) return '🌖 Waning Gibbous';
  if (phase < 0.78) return '🌗 Last Quarter';

  return '🌘 Waning Crescent';
}
