//weather command
import { SlashCommandBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';
import { convertTemperature } from '#utils/convertTemperature';
import { sendModAlert } from '#utils/modAlerts';
import {
  weatherCodeToText,
  weatherCodeToEmoji,
  formatForecastDate,
  pollenLevel,
  getMoonPhase,
  buildCurrentWeatherEmbed,
  buildPollenEmbed,
  buildForecastEmbed,
} from '#utils/weatherUtils';

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
      .setDescription('Current weather, pollen report, or 10-day forecast')
      .setRequired(false)
      .addChoices(
        { name: 'Current weather', value: 'current' },
        { name: '10-day forecast', value: '10day' },
        { name: 'Pollen report', value: 'pollen' }
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

//geocode api
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

//weather api
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

//air quality api
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
          : forecastType === 'pollen'
            ? `Processing pollen report for **${privateLocationText}**...`
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
    } else if (forecastType === 'pollen') {
      airData = await getAirQuality(geo.latitude, geo.longitude);
    } else {
      weatherData = await getWeather(geo.latitude, geo.longitude, forecastType);
    }
    //alert
    await sendModAlert(interaction.client, {
      type: 'weather.request',
      user: interaction.user,
      meta: {
        input: location,
        resolvedLocation: privateLocationText,
        unit,
        forecastType,
      },
    });

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

      //current weather embed message
      const embed = buildCurrentWeatherEmbed({
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
      });
      //finish hidden interaction first, with location visible only to the user
      await interaction.editReply({
        content: `Current weather for **${privateLocationText}** posted.`,
      });
      return interaction.followUp({ embeds: [embed] });
    }

    //pollen forecast
    if (forecastType === 'pollen') {
      const air = airData?.current ?? {};

      const grass = air.grass_pollen ?? 0;
      const ragweed = air.ragweed_pollen ?? 0;
      const mugwort = air.mugwort_pollen ?? 0;
      const birch = air.birch_pollen ?? 0;
      const alder = air.alder_pollen ?? 0;
      const olive = air.olive_pollen ?? 0;

      const pollenTypes = [
        { name: 'Grass', value: grass },
        { name: 'Ragweed', value: ragweed },
        { name: 'Mugwort', value: mugwort },
        { name: 'Birch', value: birch },
        { name: 'Alder', value: alder },
        { name: 'Olive', value: olive },
      ];

      const dominantPollen = pollenTypes.find((p) => p.value > 0)
        ? pollenTypes.reduce((highest, current) =>
            current.value > highest.value ? current : highest
          )
        : { name: 'None', value: 0 };

      const allergyRisk = pollenLevel(dominantPollen.value);

      //pollen embed message
      const embed = buildPollenEmbed({
        interaction,
        grass,
        ragweed,
        mugwort,
        birch,
        alder,
        olive,
        allergyRisk,
        dominantPollen,
      });
      //finish hidden interaction first, with location visible only to the user
      await interaction.editReply({
        content: `Pollen report for **${privateLocationText}** posted.`,
      });
      //send pollen report
      return interaction.followUp({
        embeds: [embed],
      });
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
      const embed = buildForecastEmbed({
        interaction,
        forecastLines,
        unitSymbol,
      });
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
