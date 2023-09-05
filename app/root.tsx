import * as ToastPrimitive from "@radix-ui/react-toast";
import type {
  LinksFunction,
  LoaderArgs,
  V2_MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  LiveReload,
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
import { DefaultErrorBoundary } from "~/components/error";
import Footer from "~/components/footer";
import Header from "~/components/header";
import { getValidAuthSession } from "~/models/auth";
import { getUserByEmail } from "~/models/user";
import { BASE_URL, getBrowserEnv, NODE_ENV } from "~/utils";
import { SoundContext } from "~/utils/use-sound";

import stylesheet from "./styles.css";

const META_URL = "https://whatis.club";
const META_TITLE = "Jep!";
const META_DESCRIPTION =
  "A website for sharing J! trivia and playing collaboratively with friends in real time.";
const META_IMAGE = META_URL + "/images/meta.png";

export const meta: V2_MetaFunction = () => [
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
    href: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: LoaderArgs) {
  const authSession = await getValidAuthSession(request);
  const env = getBrowserEnv();

  try {
    const user = authSession
      ? await getUserByEmail(authSession.email, authSession.accessToken)
      : undefined;
    return json({ user, env, BASE_URL, NODE_ENV });
  } catch (error: unknown) {
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
          </>
        ) : null}
        <Analytics />
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
            <LiveReload />
          </ToastPrimitive.Provider>
        </SoundContext.Provider>
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);

  if (isRouteErrorResponse(error)) {
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
          <Header />
          <div className="flex flex-col gap-4 p-12">
            <h1 className="text-3xl font-bold">Caught error</h1>
            <p>Status: {error.status}</p>
            <CodeBlock text={JSON.stringify(error.data, null, 2)} />
          </div>
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
        </body>
      </html>
    );
  }

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
        <Header />
        <DefaultErrorBoundary />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
