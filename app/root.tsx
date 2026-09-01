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
} from "react-router";
import { ENV } from "varlock/env";

import { CodeBlock } from "~/components/code";
import Footer from "~/components/footer";
import Header from "~/components/header";
import { getValidAuthSession } from "~/models/auth";
import { getUserByEmail } from "~/models/user";
import { parseUserSettings } from "~/models/user-settings.server";
import { redactAnalyticsEvent } from "~/utils/analytics";
import {
  getSearchMetadata,
  NO_INDEX_DIRECTIVES,
  SITE_DESCRIPTION,
} from "~/utils/seo";
import { UserSettingsProvider } from "~/utils/user-settings";

import type { Route } from "./+types/root";

import stylesheet from "./styles.css?url";

const META_TITLE = "Jep!";

export const meta: Route.MetaFunction = ({ loaderData }) => {
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

export async function loader({ request }: Route.LoaderArgs) {
  const authSession = await getValidAuthSession(request);
  const showAnalytics = ENV.NODE_ENV === "production" && ENV.VERCEL;

  try {
    const user = authSession
      ? await getUserByEmail(authSession.email, authSession.accessToken)
      : undefined;
    const userSettings = user ? parseUserSettings(user.settings) : undefined;
    return { user, userSettings, BASE_URL: ENV.BASE_URL, showAnalytics };
  } catch {
    return {
      user: undefined,
      userSettings: undefined,
      BASE_URL: ENV.BASE_URL,
      showAnalytics,
    };
  }
}

export default function App({ loaderData }: Route.ComponentProps) {
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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
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
          <UserSettingsProvider
            initialSettings={loaderData.userSettings}
            loggedIn={!!loaderData.user}
          >
            <Header user={loaderData.user} BASE_URL={loaderData.BASE_URL} />
            <Outlet />
            <Footer />
            <ScrollRestoration />
            <Scripts />
          </UserSettingsProvider>
        </ToastPrimitive.Provider>
      </body>
    </html>
  );
}

const errorHeader = (
  <nav className="bg-blue-bright p-4">
    <a href="/">
      <h1 className="font-korinna text-2xl font-bold text-white text-shadow-md">
        Jep!
      </h1>
    </a>
  </nav>
);

function ErrorDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <title>Oh no!</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="robots" content={NO_INDEX_DIRECTIVES} />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col">
        {errorHeader}
        {children}
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

  if (isRouteErrorResponse(error)) {
    return (
      <ErrorDocument>
        <div className="flex flex-col gap-4 p-12">
          <h1 className="text-3xl font-bold">Caught error</h1>
          <p>Status: {error.status}</p>
          <CodeBlock text={JSON.stringify(error.data, null, 2)} />
        </div>
      </ErrorDocument>
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return (
    <ErrorDocument>
      <div className="p-12">
        <h1 className="mb-4 text-xl font-bold">Error</h1>
        <p className="font-mono text-sm text-red-500">{message}</p>
      </div>
    </ErrorDocument>
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
