//random math function to choose an option with probability
const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const chooseWithProbabilities = (array, intervals) => {
  const r = getRandomInt(1, 100);

  for (let i = 0; i < array.length; i++) {
    if (r >= intervals[i][0] && r <= intervals[i][1]) {
      return array[i];
    }
  }
};
