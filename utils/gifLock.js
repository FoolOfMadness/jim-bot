//global gif lock utility
let activeGifJob = null;

//if making a gif, lock on
export function lockGif(jobId) {
  if (activeGifJob !== null) return false;

  activeGifJob = jobId;
  return true;
}

//when finished, lock off
export function unlockGif(jobId) {
  if (activeGifJob === jobId) {
    activeGifJob = null;
  }
}

//check if active
export function isGifLocked() {
  return activeGifJob !== null;
}
