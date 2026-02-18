/** Canonical player color representation is #RRGGBB hex string. */
export type PlayerColor = string;

export const DEFAULT_PLAYER_COLOR: PlayerColor = "#7a8ae0";
export const PLAYER_COLOR_HEX_REGEX = /^#[0-9a-f]{6}$/i;

function normalizeHue(hue: number) {
  const normalized = ((hue % 360) + 360) % 360;
  return normalized === 360 ? 0 : normalized;
}

/** normalizePlayerColor validates and canonicalizes #RRGGBB input. */
export function normalizePlayerColor(color: string): PlayerColor | undefined {
  const normalized = color.trim().toLowerCase();
  if (!PLAYER_COLOR_HEX_REGEX.test(normalized)) {
    return undefined;
  }
  return normalized;
}

const SATURATION = 60;
const LIGHTNESS = 60;

/** hueToHslColor maps hue to an HSL color string using shared sat/light defaults. */
export function hueToHslColor(hue: number) {
  return `hsl(${normalizeHue(hue)}, ${SATURATION}%, ${LIGHTNESS}%)`;
}

/** hueToPlayerColor maps hue to #RRGGBB using shared sat/light defaults. */
export function hueToPlayerColor(hue: number): PlayerColor {
  const h = normalizeHue(hue);
  const s = 0.6;
  const l = 0.6;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** coercePlayerColor accepts only hex colors and returns canonical #RRGGBB. */
export function coercePlayerColor(raw: unknown): PlayerColor | undefined {
  if (typeof raw === "string") {
    return normalizePlayerColor(raw);
  }
  return undefined;
}
