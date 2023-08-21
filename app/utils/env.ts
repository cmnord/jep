import { isBrowser } from "./is-browser";

declare global {
  interface Window {
    env: {
      GA_TRACKING_ID: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }

  namespace NodeJS {
    interface ProcessEnv {
      BASE_URL: string;
      GA_TRACKING_ID: string;
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      SUPABASE_ANON_KEY: string;
      SESSION_SECRET: string;
    }
  }
}

type EnvOptions = {
  isSecret?: boolean;
  isRequired?: boolean;
};
function getEnv(
  name: string,
  { isRequired, isSecret }: EnvOptions = { isSecret: true, isRequired: true },
) {
  if (isBrowser && isSecret) return "";

  const source = (isBrowser ? window.env : process.env) ?? {};

  const value = source[name as keyof typeof source];

  if (!value && isRequired) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

/**
 * Server env
 */
export const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
export const SESSION_SECRET = getEnv("SESSION_SECRET");
export const BASE_URL = getEnv("BASE_URL");

/**
 * Shared envs
 */
export const NODE_ENV = getEnv("NODE_ENV", {
  isSecret: false,
  isRequired: false,
});
export const GA_TRACKING_ID = getEnv("GA_TRACKING_ID", {
  isSecret: false,
  isRequired: false,
});
export const SUPABASE_URL = getEnv("SUPABASE_URL", { isSecret: false });
export const SUPABASE_ANON_KEY = getEnv("SUPABASE_ANON_KEY", {
  isSecret: false,
});

export function getBrowserEnv() {
  return {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    GA_TRACKING_ID,
  };
}
