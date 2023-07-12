export const GITHUB_URL = "https://github.com/cmnord/jep";

// http://www.thephonicspage.org/On%20Reading/Resources/NonsenseWordsByType.pdf
const gameWords =
  "troff glon yomp bruss jank fress masp smub zint jeft vusk hipt splect sunt phrist dimp bosp zoft yact spluff drid criff jing strod vept luft splob fesp kemp cesk flact thrund clud nund fect swug ust phropt ceft drast fleff scrim omp drap gleck jift jund chand smed noct pron snid vonk trag nept yuft sclack plusk snaff zamp skob glemp besp fress vosk frep jang unt joct thrag plig hect nund sphob blen jisk yasp bisk glaff treb threck plash thrump prash glap thren gaft vesk yeft thrun thomp ont sask trunt blit jemp phrint namp glap prash".split(
    " ",
  );

const SATURATION = 60;
const LIGHTNESS = 85;

const formatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0, // Round to whole dollars.
});

const signFormatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0, // Round to whole dollars.
  signDisplay: "always", // Show +/- for positive and negative values.
});

export function getRandomWord() {
  return gameWords[Math.floor(Math.random() * gameWords.length)];
}

export function generateGrid<T>(n: number, m: number, defaultFill: T) {
  return Array.from({ length: n }, () =>
    Array.from({ length: m }, () => defaultFill),
  );
}

export function formatDollars(dollars: number) {
  return formatter.format(dollars);
}

/** formatDollarsWithSign formats a number as a currency string with a +/- sign. */
export function formatDollarsWithSign(dollars: number) {
  return signFormatter.format(dollars);
}

const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/** stringToHslColor generates a deterministic hue from the input str and then
 * adds saturation and lightness to make an HSL color string. */
export function stringToHslColor(str: string) {
  const hash = cyrb53(str, 123);
  const h = hash % 360;
  return `hsl(${h}, ${SATURATION}%, ${LIGHTNESS}%)`;
}
