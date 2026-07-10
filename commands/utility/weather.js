//weather command
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';
import { convertTemperature } from '#utils/convertTemperature';

//name of slash command & description
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

//geocode api function
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

//getWeather api function
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
        'pressure_msl',
        'visibility',
      ].join(',')
    );
    url.searchParams.set('daily', ['sunrise', 'sunset'].join(','));
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);

  return res.json();
}

//weather codes to text
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

//emoji for weather codes
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

//format date for forecast display
function formatForecastDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

//time formatter
function formatTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

//air quality
async function getAirQuality(lat, lon) {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');

  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('timezone', 'auto');

  url.searchParams.set(
    'current',
    [
      'uv_index',
      'grass_pollen',
      'ragweed_pollen',
      'mugwort_pollen',
      'birch_pollen',
      'alder_pollen',
      'olive_pollen',
    ].join(',')
  );
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Air quality fetch failed: ${res.status}`);
  }
  return res.json();
}

//convert pollen level to text
function pollenLevel(value) {
  if (value == null) return 'N/A';
  if (value < 1) return 'None';
  if (value < 10) return 'Low';
  if (value < 50) return 'Moderate';
  if (value < 100) return 'High';
  return 'Very High';
}

//convert UV level to text
function uvLevel(uv) {
  if (uv == null) return 'N/A';
  uv = Number(uv.toFixed(1));

  if (uv < 3) return `🟢 Low (${uv})`;
  if (uv < 6) return `🟡 Moderate (${uv})`;
  if (uv < 8) return `🟠 High (${uv})`;
  if (uv < 11) return `🔴 Very High (${uv})`;
  return `🟣 Extreme (${uv})`;
}

//find the feel
function feelsLikeEmoji(tempC) {
  if (tempC <= -10) return '🧊';
  if (tempC <= 0) return '🥶';
  if (tempC <= 10) return '🧥';
  if (tempC <= 20) return '😊';
  if (tempC <= 25) return '😅';
  if (tempC <= 35) return '🥵';
  return '💀';
}

//moon phase
function getMoonPhase(date = new Date()) {
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

//get the weather
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

    //initial reply is hidden
    await interaction.deferReply({ flags: EPHEMERAL_FLAG });

    const geo = await geocodeLocation(location);

    //if unable to parse location
    if (!geo) {
      return interaction.editReply({
        content: 'Could not find that location.',
      });
    }

    //resolved location shown only in the ephemeral reply
    const privateLocationText = `${geo.name}, ${geo.country}`;

    await interaction.editReply({
      content:
        forecastType === '10day'
          ? `Processing 10-day forecast for **${privateLocationText}**...`
          : `Processing current weather for **${privateLocationText}**...`,
    });

    //weather objects
    let weatherData;
    let airData = null;

    if (forecastType === 'current') {
      [weatherData, airData] = await Promise.all([
        getWeather(geo.latitude, geo.longitude, forecastType),
        getAirQuality(geo.latitude, geo.longitude),
      ]);
    } else {
      weatherData = await getWeather(geo.latitude, geo.longitude, forecastType);
    }

    //current weather result
    if (forecastType === 'current') {
      const weather = weatherData.current;
      const air = airData?.current ?? {};

      //pollen combos
      const treePollen = Math.max(
        air.alder_pollen ?? 0,
        air.birch_pollen ?? 0,
        air.olive_pollen ?? 0
      );
      const weedPollen = Math.max(
        air.ragweed_pollen ?? 0,
        air.mugwort_pollen ?? 0
      );

      const moonPhase = getMoonPhase();
      const emoji = weatherCodeToEmoji(weather.weather_code);
      const condition = weatherCodeToText(weather.weather_code);

      //public embed message
      const embed = new EmbedBuilder()
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
          { name: '🌤️ Condition', value: condition, inline: true },
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

      await interaction.editReply({
        content: `Current weather for **${privateLocationText}** posted.`,
      });
      return interaction.followUp({ embeds: [embed] });
    }

    //10-day forecast result
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

      //forecast embed message
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`🌦️ Weather Forecast (${unitSymbol})`)
        .setDescription(
          `### 10-day forecast for ${interaction.user}\n\n` +
            forecastLines.join('\n\n')
        )
        .setFooter({ text: 'Location hidden for privacy' })
        .setTimestamp();

      //finish hidden interaction first, with location visible only to the user
      await interaction.editReply({
        content: `10-day forecast for **${privateLocationText}** posted.`,
      });
      //send full forecast publicly
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
    });
  }
};
