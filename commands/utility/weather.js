//weather command
import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlagsBitField,
} from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('weather')
  .setDescription('Get weather for your area')
  .addStringOption((option) =>
    option
      .setName('location')
      .setDescription(
        "City, town, or postcode, this will be hidden so you can't dox."
      )
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('forecast')
      .setDescription('Choose current weather or a 10-day forecast')
      .setRequired(false)
      .addChoices(
        { name: 'Current weather', value: 'current' },
        { name: '10-day forecast', value: '10day' }
      )
  );

//geocode api function
async function geocodeLocation(location) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');

  url.searchParams.set('name', location);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0];
}

//getWeather api function
async function getWeather(latitude, longitude, forecastType = 'current') {
  const url = new URL('https://api.open-meteo.com/v1/forecast');

  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('timezone', 'auto');

  if (forecastType === '10day') {
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

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather fetch failed: ${response.status}`);
  }

  return await response.json();
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

//get the weather
export const execute = async (interaction) => {
  try {
    const location = interaction.options.getString('location');
    const forecastType = interaction.options.getString('forecast') || 'current';

    //initial reply is hidden
    await interaction.deferReply({
      flags: MessageFlagsBitField.Ephemeral,
    });

    const geo = await geocodeLocation(location);

    //if unable to parse location
    if (!geo) {
      return interaction.editReply({
        content:
          'Could not find that location. Try a nearby city/town or postcode.',
      });
    }

    //resolved location shown only in the hidden/ephemeral reply
    const privateLocationText = `${geo.name}, ${geo.country}`;

    if (forecastType === '10day') {
      await interaction.editReply({
        content: `Processing 10-day forecast for **${privateLocationText}**...`,
      });
    } else {
      await interaction.editReply({
        content: `Processing current weather for **${privateLocationText}**...`,
      });
    }

    //weather object
    const weatherData = await getWeather(
      geo.latitude,
      geo.longitude,
      forecastType
    );

    //current weather result
    if (forecastType === 'current') {
      const weather = weatherData.current;

      const condition = weatherCodeToText(weather.weather_code);
      const emoji = weatherCodeToEmoji(weather.weather_code);

      //public embed message
      const weatherEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`${emoji} ${interaction.user.username}'s Weather`)
        .setDescription(`Current weather for ${interaction.user}`)
        .addFields(
          {
            name: 'Temperature',
            value: `${weather.temperature_2m}°C`,
            inline: true,
          },
          {
            name: 'Feels Like',
            value: `${weather.apparent_temperature}°C`,
            inline: true,
          },
          {
            name: 'Condition',
            value: condition,
            inline: true,
          },
          {
            name: 'Wind',
            value: `${weather.wind_speed_10m} km/h`,
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
        .setFooter({
          text: 'Location hidden for privacy',
        })
        .setTimestamp();

      //finish hidden interaction first, with location visible only to the user
      await interaction.editReply({
        content: `Current weather for **${privateLocationText}** posted publicly without showing your location.`,
      });

      //send full weather result publicly
      return interaction.followUp({
        embeds: [weatherEmbed],
      });
    }

    //10-day forecast result
    if (forecastType === '10day') {
      const daily = weatherData.daily;

      const forecastFields = daily.time.map((date, index) => {
        const code = daily.weather_code[index];
        const emoji = weatherCodeToEmoji(code);
        const condition = weatherCodeToText(code);

        return {
          name: `${emoji} ${formatForecastDate(date)}`,
          value:
            `**${condition}**\n` +
            `High: ${daily.temperature_2m_max[index]}°C | ` +
            `Low: ${daily.temperature_2m_min[index]}°C\n` +
            `Rain: ${daily.precipitation_sum[index]} mm | ` +
            `Wind: ${daily.wind_speed_10m_max[index]} km/h`,
          inline: false,
        };
      });

      //forecast embed message
      const forecastEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`🌦️ ${interaction.user.username}'s 10-Day Weather Forecast`)
        .setDescription(`10-day forecast for ${interaction.user}`)
        .addFields(forecastFields)
        .setFooter({
          text: 'Location hidden for privacy',
        })
        .setTimestamp();

      //finish hidden interaction first, with location visible only to the user
      await interaction.editReply({
        content: `10-day forecast for **${privateLocationText}** posted publicly without showing your location.`,
      });

      //send full forecast publicly
      return interaction.followUp({
        embeds: [forecastEmbed],
      });
    }
  } catch (error) {
    console.error('Weather command failed:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: 'Something went wrong while getting the weather...',
      });
    } else {
      await interaction.reply({
        content: 'Something went wrong while getting the weather...',
        flags: MessageFlagsBitField.Ephemeral,
      });
    }
  }
};
