import * as ToastPrimitive from "@radix-ui/react-toast";
import { Analytics } from "@vercel/analytics/react";
import * as React from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useMatches,
  useRouteError,
  useRouteLoaderData,
} from "react-router";
import { ENV } from "varlock/env";

import { getAdmin, isAdminEnabled } from "~/admin/auth.server";
import { CodeBlock } from "~/components/code";
import Footer from "~/components/footer";
import Header from "~/components/header";
import {
  createT,
  DEFAULT_LOCALE,
  I18nProvider,
  isLocale,
  type Locale,
  useTranslation,
} from "~/i18n";
import { metaT } from "~/i18n/meta";
import { resolveLocale, serializeLangCookie } from "~/i18n/resolve";
import { getValidAuthSession } from "~/models/auth";
import { getUserByEmail } from "~/models/user";
import { parseUserSettings } from "~/models/user-settings.server";
import { ThemeProvider } from "~/theme/context";
import {
  DEFAULT_THEME,
  isTheme,
  parseThemeCookie,
  resolveTheme,
  serializeThemeCookie,
  type Theme,
  type ThemeSource,
} from "~/theme/theme";
import { redactAnalyticsEvent } from "~/utils/analytics";
import { getSearchMetadata, NO_INDEX_DIRECTIVES } from "~/utils/seo";
import { UserSettingsProvider } from "~/utils/user-settings";

import type { Route } from "./+types/root";

import stylesheet from "./styles.css?url";

const META_TITLE = "Jep!";

export const meta: Route.MetaFunction = ({ loaderData, matches }) => {
  const SITE_DESCRIPTION = metaT(matches)("common.siteDescription");
  if (!loaderData) {
    return [
      { title: META_TITLE },
      { name: "title", content: META_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
    ];
  }

  const metaUrl = loaderData.BASE_URL;
  const metaImage = new URL("/images/meta.png", metaUrl).toString();

  return [
    { title: META_TITLE },
    { name: "title", content: META_TITLE },
    { name: "description", content: SITE_DESCRIPTION },

    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:url", content: metaUrl },
    { property: "og:title", content: META_TITLE },
    { property: "og:description", content: SITE_DESCRIPTION },
    { property: "og:image", content: metaImage },

    // Twitter
    { property: "twitter:card", content: "summary_large_image" },
    { property: "twitter:url", content: metaUrl },
    { property: "twitter:title", content: META_TITLE },
    { property: "twitter:description", content: SITE_DESCRIPTION },
    { property: "twitter:image", content: metaImage },
  ];
};

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "16x16" },
  {
    rel: "apple-touch-icon",
    href: "/apple-touch-icon.png",
    type: "image/png",
    sizes: "256x256",
  },
  { rel: "stylesheet", href: stylesheet },
];

/** Skip revalidating the root loader for game actions and settings saves.
 * The root loader fetches the user from the DB, which doesn't change during
 * gameplay. Settings are managed optimistically in local state.
 */
export function shouldRevalidate({
  formAction,
  defaultShouldRevalidate,
}: {
  formAction?: string;
  defaultShouldRevalidate: boolean;
}) {
  if (formAction?.match(/^\/room\/\d+\//) || formAction === "/settings") {
    return false;
  }
  return defaultShouldRevalidate;
}

/** requestLocale resolves the UI language on the server, so the server HTML
 * and the hydrating client render the same language (see `app/i18n`). */
function requestLocale(request: Request, account?: string) {
  return resolveLocale({
    cookie: request.headers.get("Cookie"),
    account,
    acceptLanguage: request.headers.get("Accept-Language"),
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const authSession = await getValidAuthSession(request);
  const showAnalytics = ENV.NODE_ENV === "production" && ENV.VERCEL === "1";
  // For the header's admin button: booleans only, never the session itself.
  const adminEnabled = isAdminEnabled();
  const isAdmin = adminEnabled && (await getAdmin(request)) !== null;

  try {
    const user = authSession
      ? await getUserByEmail(authSession.email, authSession.accessToken)
      : undefined;
    const userSettings = user ? parseUserSettings(user.settings) : undefined;
    const { locale, source: localeSource } = requestLocale(
      request,
      userSettings?.language,
    );
    const { theme, source: themeSource } = resolveTheme({
      cookie: request.headers.get("Cookie"),
      account: userSettings?.theme,
    });
    return {
      user,
      userSettings,
      BASE_URL: ENV.BASE_URL,
      showAnalytics,
      adminEnabled,
      isAdmin,
      locale,
      localeSource,
      theme,
      themeSource,
    };
  } catch {
    const { locale, source: localeSource } = requestLocale(request);
    const { theme, source: themeSource } = resolveTheme({
      cookie: request.headers.get("Cookie"),
    });
    return {
      user: undefined,
      userSettings: undefined,
      BASE_URL: ENV.BASE_URL,
      showAnalytics,
      adminEnabled,
      isAdmin,
      locale,
      localeSource,
      theme,
      themeSource,
    };
  }
}

/** useLocaleState keeps the UI language: the root loader's, or the one just
 * picked with the switcher (shown at once, before the loaders revalidate). */
function useLocaleState(loaderLocale: Locale, localeSource: string) {
  const [locale, setLocale] = React.useState(loaderLocale);
  React.useEffect(() => {
    setLocale(loaderLocale);
  }, [loaderLocale]);

  // The language came from the account (e.g. logging in on a new device):
  // remember it in the cookie too, so actions answer in the same language.
  React.useEffect(() => {
    if (localeSource === "account") {
      document.cookie = serializeLangCookie(loaderLocale);
    }
  }, [loaderLocale, localeSource]);

  return [locale, setLocale] as const;
}

/** useThemeState keeps the color theme: the root loader's, or the one just
 * picked with the switcher (shown at once). */
function useThemeState(loaderTheme: Theme, themeSource: ThemeSource) {
  const [theme, setTheme] = React.useState(loaderTheme);
  React.useEffect(() => {
    setTheme(loaderTheme);
  }, [loaderTheme]);

  // The theme came from the account (e.g. logging in on a new device):
  // remember it in the cookie too, so pages without the account (error
  // pages, the next visit before logging in) keep it.
  React.useEffect(() => {
    if (themeSource === "account") {
      document.cookie = serializeThemeCookie(loaderTheme);
    }
  }, [loaderTheme, themeSource]);

  return [theme, setTheme] as const;
}

/** useMarkHydrated sets `data-hydrated` on <html> once React has hydrated the
 * page, i.e. once buttons and forms have their event handlers. The root's
 * effects run after all of its children's, so this is the last effect of the
 * hydration commit. E2E tests wait for it before interacting (see
 * `e2e/helpers.ts`). */
function useMarkHydrated() {
  React.useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
}

export default function App({ loaderData }: Route.ComponentProps) {
  useMarkHydrated();
  const [locale, setLocale] = useLocaleState(
    loaderData.locale,
    loaderData.localeSource,
  );
  const [theme, setTheme] = useThemeState(
    loaderData.theme,
    loaderData.themeSource,
  );
  const SITE_DESCRIPTION = createT(locale)("common.siteDescription");
  const location = useLocation();
  const matches = useMatches();
  const publicGamePreview = matches.some(
    (match) =>
      match.id === "routes/game_.$gameId_" &&
      typeof match.loaderData === "object" &&
      match.loaderData !== null &&
      "game" in match.loaderData &&
      typeof match.loaderData.game === "object" &&
      match.loaderData.game !== null &&
      "visibility" in match.loaderData.game &&
      match.loaderData.game.visibility === "PUBLIC",
  );
  // Full-screen pages (the TV / presenter view) hide the site header and
  // footer.
  const chromeless = matches.some(
    (match) =>
      typeof match.handle === "object" &&
      match.handle !== null &&
      "chromeless" in match.handle &&
      match.handle.chromeless === true,
  );
  const searchMetadata = getSearchMetadata(
    location.pathname,
    loaderData.BASE_URL,
    publicGamePreview,
  );
  const applicationStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: META_TITLE,
    url: loaderData.BASE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
  };

  return (
    // translate="no" + notranslate: browser translation (e.g. Chrome's
    // Google Translate) rewrites text nodes behind React's back, and the next
    // update that removes one crashes the app ("Failed to execute
    // 'removeChild' on 'Node'"). The site has a real Ukrainian UI instead.
    <html lang={locale} data-theme={theme} translate="no">
      <head>
        <meta charSet="utf-8" />
        <meta name="google" content="notranslate" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="robots" content={searchMetadata.robots} />
        {searchMetadata.canonicalUrl ? (
          <link rel="canonical" href={searchMetadata.canonicalUrl} />
        ) : null}
        {location.pathname === "/" ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              // Keep a future dynamic value containing "</script>" from
              // terminating this script element and injecting markup.
              __html: JSON.stringify(applicationStructuredData).replace(
                /</g,
                "\\u003c",
              ),
            }}
          />
        ) : null}
        <Meta />
        <Links />
      </head>
      <body className="relative flex min-h-screen flex-col">
        {loaderData.showAnalytics ? (
          <Analytics beforeSend={redactAnalyticsEvent} />
        ) : null}
        <ToastPrimitive.Provider swipeDirection="right">
          <ToastPrimitive.Viewport
            className={`fixed right-0 bottom-0 z-50 m-0 flex w-96 max-w-full list-none flex-col gap-3 p-[var(--viewport-padding)] outline-none [--viewport-padding:_25px]`}
          />
          <I18nProvider locale={locale} onChangeLocale={setLocale}>
            <ThemeProvider theme={theme} onChangeTheme={setTheme}>
              <UserSettingsProvider
                initialSettings={loaderData.userSettings}
                loggedIn={!!loaderData.user}
              >
                {chromeless ? null : (
                  <Header
                    user={loaderData.user}
                    BASE_URL={loaderData.BASE_URL}
                    adminEnabled={loaderData.adminEnabled}
                    isAdmin={loaderData.isAdmin}
                  />
                )}
                <Outlet />
                {chromeless ? null : <Footer />}
                <ScrollRestoration />
                <Scripts />
              </UserSettingsProvider>
            </ThemeProvider>
          </I18nProvider>
        </ToastPrimitive.Provider>
      </body>
    </html>
  );
}

const errorHeader = (
  <nav className="bg-header p-4">
    <a href="/">
      <h1 className="font-korinna text-2xl font-bold text-white text-shadow-md">
        Jep!
      </h1>
    </a>
  </nav>
);

/** useErrorTheme is the color theme for error pages: the root loader's when
 * it ran. Otherwise (e.g. a 404, where no loader runs) the server renders
 * Classic and the browser switches to the `theme` cookie after hydration. */
function useErrorTheme(): Theme {
  const rootData = useRouteLoaderData("root");
  const loaderTheme: unknown =
    typeof rootData === "object" && rootData !== null && "theme" in rootData
      ? rootData.theme
      : undefined;
  const [cookieTheme, setCookieTheme] = React.useState<Theme>();
  React.useEffect(() => {
    setCookieTheme(parseThemeCookie(document.cookie));
  }, []);
  if (isTheme(loaderTheme)) return loaderTheme;
  return cookieTheme ?? DEFAULT_THEME;
}

/** useErrorLocale is the UI language for error pages: the root loader's when
 * it ran, English otherwise. */
function useErrorLocale(): Locale {
  const rootData = useRouteLoaderData("root");
  const locale: unknown =
    typeof rootData === "object" && rootData !== null && "locale" in rootData
      ? rootData.locale
      : undefined;
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

function ErrorDocument({ children }: { children: React.ReactNode }) {
  useMarkHydrated();
  const locale = useErrorLocale();
  const theme = useErrorTheme();
  const t = createT(locale);
  return (
    <html lang={locale} data-theme={theme} translate="no">
      <head>
        <title>{t("common.errorTitle")}</title>
        <meta charSet="utf-8" />
        <meta name="google" content="notranslate" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="robots" content={NO_INDEX_DIRECTIVES} />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col">
        {errorHeader}
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/** Renders route error details. Must be rendered within a router context. */
function RouteError() {
  const error = useRouteError();
  console.error(error);

  return (
    <ErrorDocument>
      <RouteErrorContent error={error} />
    </ErrorDocument>
  );
}

function RouteErrorContent({ error }: { error: unknown }) {
  const { t } = useTranslation();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex flex-col gap-4 p-12">
        <h1 className="text-3xl font-bold">{t("common.caughtError")}</h1>
        <p>{t("common.errorStatus", { status: error.status })}</p>
        <CodeBlock text={JSON.stringify(error.data, null, 2)} />
      </div>
    );
  }

  const message =
    error instanceof Error ? error.message : t("common.unknownError");
  return (
    <div className="p-12">
      <h1 className="mb-4 text-xl font-bold">{t("common.error")}</h1>
      <p className="font-mono text-sm text-red-500">{message}</p>
    </div>
  );
}

class SafeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <html>
          <head>
            <title>Oh no!</title>
            <meta charSet="utf-8" />
            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            />
          </head>
          <body className="flex flex-col p-12">
            <h1 className="mb-4 text-xl font-bold">Application Error</h1>
            <p>
              An unexpected error occurred. Check the browser console for
              details.
            </p>
          </body>
        </html>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary() {
  return (
    <SafeErrorBoundary>
      <RouteError />
    </SafeErrorBoundary>
  );
}
