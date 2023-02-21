// http://www.thephonicspage.org/On%20Reading/Resources/NonsenseWordsByType.pdf
const gameWords =
  "troff glon yomp bruss jank fress masp smub zint jeft vusk hipt splect sunt phrist dimp bosp zoft yact spluff drid criff jing strod vept luft splob fesp kemp cesk flact thrund clud nund fect swug ust phropt ceft drast fleff scrim omp drap gleck jift jund chand smed noct pron snid vonk trag nept yuft sclack plusk snaff zamp skob glemp besp fress vosk frep jang unt joct thrag plig hect nund sphob blen jisk yasp bisk glaff treb threck plash thrump prash glap thren gaft vesk yeft thrun thomp ont sask trunt blit jemp phrint namp glap prash".split(
    " "
  );

export function getRandomWord() {
  return gameWords[Math.floor(Math.random() * gameWords.length)];
}

export function generateGrid<T>(n: number, m: number, defaultFill: T) {
  return Array.from({ length: n }, () =>
    Array.from({ length: m }, () => defaultFill)
  );
}
