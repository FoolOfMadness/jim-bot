//convert temperature scales
export function convertTemperature(value, unit) {
  let celsius, fahrenheit, kelvin, rankine;
  if (!['C', 'F', 'K', 'R'].includes(unit)) unit = 'C';

  switch (unit) {
    case 'C':
      celsius = value;
      fahrenheit = (value * 9) / 5 + 32;
      kelvin = value + 273.15;
      rankine = ((value + 273.15) * 9) / 5;
      break;

    case 'F':
      celsius = ((value - 32) * 5) / 9;
      fahrenheit = value;
      kelvin = celsius + 273.15;
      rankine = value + 459.67;
      break;

    case 'K':
      celsius = value - 273.15;
      fahrenheit = (celsius * 9) / 5 + 32;
      kelvin = value;
      rankine = value * 1.8;
      break;

    case 'R':
      celsius = ((value - 491.67) * 5) / 9;
      fahrenheit = value - 459.67;
      kelvin = value * (5 / 9);
      rankine = value;
      break;

    default:
      //fallback
      celsius = value;
      fahrenheit = value;
      kelvin = value;
      rankine = value;
  }
  return {
    celsius,
    fahrenheit,
    kelvin,
    rankine,
  };
}
