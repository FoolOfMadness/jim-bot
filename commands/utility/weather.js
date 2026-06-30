// weather command
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';
import { convertTemperature } from '../../utils/convertTemperature.js';

// slash command
export const data = new SlashCommandBuilder()
  .setName('weather')
  .setDescription('Get weather for your area')
  .addStringOption((option) =>
    option
      .setName('location')
      .setDescription('City, town, or postcode')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('forecast')
      .setDescription('Current or 10-day forecast')
      .setRequired(false)
      .addChoices(
        { name: 'Current weather', value: 'current' },
        { name: '10-day forecast', value: '10day' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('unit')
      .setDescription('Temperature unit')
      .setRequired(false)
      .addChoices(
        { name: 'Celsius', value: 'C' },
        { name: 'Fahrenheit', value: 'F' },
        { name: 'Kelvin', value: 'K' },
        { name: 'Rankine', value: 'R' }
      )
  );

// geocode
async function geocodeLocation(location) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');

  url.searchParams.set('name', location);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

  const data = await res.json();
  if (!data.results?.length) return null;

  return data.results[0];
}

// weather fetch
async function getWeather(lat, lon, type = 'current') {
  const url = new URL('https://api.open-meteo.com/v1/forecast');

  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('timezone', 'auto');

  if (type === '10day') {
    url.searchParams.set(
      'daily',
      [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'wind_speed_10m_max',
      ].join(',')
    );

    url.searchParams.set('forecast_days', '10');
  } else {
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
      ].join(',')
    );
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);

  return res.json();
}

// helpers
function weatherCodeToText(code) {
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

function weatherCodeToEmoji(code) {
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

function formatForecastDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

// execute
export const execute = async (interaction) => {
  try {
    const location = interaction.options.getString('location');
    const forecastType = interaction.options.getString('forecast') || 'current';
    const unit = interaction.options.getString('unit') ?? 'C';

    const unitSymbol =
      unit === 'F' ? '°F' : unit === 'K' ? 'K' : unit === 'R' ? '°R' : '°C';

    const unitKey =
      unit === 'F'
        ? 'fahrenheit'
        : unit === 'K'
          ? 'kelvin'
          : unit === 'R'
            ? 'rankine'
            : 'celsius';

    const convertFromCelsius = (value) => {
      const t = convertTemperature(value, 'C');
      return t[unitKey];
    };

    await interaction.deferReply({ flags: EPHEMERAL_FLAG });

    const geo = await geocodeLocation(location);

    if (!geo) {
      return interaction.editReply({
        content: 'Could not find that location.',
      });
    }

    const privateLocationText = `${geo.name}, ${geo.country}`;

    await interaction.editReply({
      content:
        forecastType === '10day'
          ? `Processing 10-day forecast for **${privateLocationText}**...`
          : `Processing current weather for **${privateLocationText}**...`,
    });

    const weatherData = await getWeather(
      geo.latitude,
      geo.longitude,
      forecastType
    );

    // CURRENT
    if (forecastType === 'current') {
      const weather = weatherData.current;

      const emoji = weatherCodeToEmoji(weather.weather_code);
      const condition = weatherCodeToText(weather.weather_code);

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`${emoji} Weather Report (${unitSymbol})`)
        .setDescription(`### Current weather for ${interaction.user}`)
        .addFields(
          {
            name: 'Temperature',
            value: `${convertFromCelsius(weather.temperature_2m).toFixed(1)}${unitSymbol}`,
            inline: true,
          },
          {
            name: 'Feels Like',
            value: `${convertFromCelsius(weather.apparent_temperature).toFixed(1)}${unitSymbol}`,
            inline: true,
          },
          { name: 'Condition', value: condition, inline: true },
          {
            name: 'Wind',
            value: `${Math.round(weather.wind_speed_10m)} km/h`,
            inline: true,
          },
          {
            name: 'Rain',
            value: `${weather.precipitation} mm`,
            inline: true,
          },
          {
            name: 'Humidity',
            value: `${weather.relative_humidity_2m}%`,
            inline: true,
          }
        )
        .setFooter({ text: 'Location hidden for privacy' })
        .setTimestamp();

      await interaction.editReply({
        content: `Current weather for **${privateLocationText}** posted.`,
      });

      return interaction.followUp({ embeds: [embed] });
    }

    // 10-DAY
    if (forecastType === '10day') {
      const daily = weatherData.daily;

      const forecastLines = daily.time.map((date, index) => {
        const code = daily.weather_code[index];
        const condition = weatherCodeToText(code);

        const high = convertFromCelsius(daily.temperature_2m_max[index]);
        const low = convertFromCelsius(daily.temperature_2m_min[index]);

        return (
          `${weatherCodeToEmoji(code)} **${formatForecastDate(date)}** • ${condition}\n` +
          `🌡️ ${Math.round(high)}${unitSymbol} / ${Math.round(low)}${unitSymbol}` +
          ` • 🌧️ ${daily.precipitation_sum[index].toFixed(1)} mm` +
          ` • 💨 ${Math.round(daily.wind_speed_10m_max[index])} km/h`
        );
      });

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`🌦️ Weather Forecast (${unitSymbol})`)
        .setDescription(
          `### 10-day forecast for ${interaction.user}\n\n` +
            forecastLines.join('\n\n')
        )
        .setFooter({ text: 'Location hidden for privacy' })
        .setTimestamp();

      await interaction.editReply({
        content: `10-day forecast for **${privateLocationText}** posted.`,
      });

      return interaction.followUp({ embeds: [embed] });
    }
  } catch (err) {
    console.error(err);

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        content: 'Something went wrong while getting the weather...',
      });
    }

    return interaction.reply({
      content: 'Something went wrong while getting the weather...',
      flags: EPHEMERAL_FLAG,
    });
  }
};
