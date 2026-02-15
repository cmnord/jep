import * as ToastPrimitive from "@radix-ui/react-toast";
import type {
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { Analytics } from "@vercel/analytics/react";
import * as React from "react";

import { CodeBlock } from "~/components/code";
import Footer from "~/components/footer";
import Header from "~/components/header";
import { getValidAuthSession } from "~/models/auth";
import { getUserByEmail } from "~/models/user";
import { BASE_URL, getBrowserEnv, NODE_ENV } from "~/utils";
import { SoundContext } from "~/utils/use-sound";

import stylesheet from "./styles.css?url";

const META_URL = "https://whatis.club";
const META_TITLE = "Jep!";
const META_DESCRIPTION =
  "A website for sharing J! trivia and playing collaboratively with friends in real time.";
const META_IMAGE = META_URL + "/images/meta.png";

export const meta: MetaFunction = () => [
  { title: META_TITLE },
  { name: "title", content: META_TITLE },
  { name: "description", content: META_DESCRIPTION },

  // Open Graph / Facebook
  { property: "og:type", content: "website" },
  { property: "og:url", content: META_URL },
  { property: "og:title", content: META_TITLE },
  { property: "og:description", content: META_DESCRIPTION },
  { property: "og:image", content: META_IMAGE },

  // Twitter
  { property: "twitter:card", content: "summary_large_image" },
  { property: "twitter:url", content: META_URL },
  { property: "twitter:title", content: META_TITLE },
  { property: "twitter:description", content: META_DESCRIPTION },
  { property: "twitter:image", content: META_IMAGE },
];

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "16x16" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Inter:wght@100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const authSession = await getValidAuthSession(request);
  const env = getBrowserEnv();

  try {
    const user = authSession
      ? await getUserByEmail(authSession.email, authSession.accessToken)
      : undefined;
    return json({ user, env, BASE_URL, NODE_ENV });
  } catch {
    return json({
      user: undefined,
      env,
      BASE_URL,
      NODE_ENV,
    });
  }
}

export default function App() {
  const [volume, setVolume] = React.useState(0.5);
  const [mute, setMute] = React.useState(false);

  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="relative flex min-h-screen flex-col">
        {data.NODE_ENV === "production" && data.env.GA_TRACKING_ID ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${data.env.GA_TRACKING_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                gtag('config', '${data.env.GA_TRACKING_ID}');
              `,
              }}
            />
            <Analytics />
          </>
        ) : null}
        <SoundContext.Provider
          value={{
            volume,
            setVolume,
            mute,
            setMute,
          }}
        >
          <ToastPrimitive.Provider swipeDirection="right">
            <ToastPrimitive.Viewport
              className={`fixed bottom-0 right-0 z-50 m-0 flex w-96 max-w-full
              list-none flex-col gap-3 p-[var(--viewport-padding)] outline-none
              [--viewport-padding:_25px]`}
            />
            <Header user={data.user} BASE_URL={data.BASE_URL} />
            <Outlet />
            <Footer />
            <ScrollRestoration />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.env = ${JSON.stringify(data.env)}`,
              }}
            />
            <Scripts />
          </ToastPrimitive.Provider>
        </SoundContext.Provider>
      </body>
    </html>
  );
}

const errorHeader = (
  <nav className="bg-blue-bright p-4">
    <a href="/">
      <h1 className="text-shadow-md font-korinna text-2xl font-bold text-white">
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
