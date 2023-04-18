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
import * as React from "react";

import { CodeBlock } from "~/components/code";
import { DefaultErrorBoundary } from "~/components/error";
import Footer from "~/components/footer";
import Header from "~/components/header";
import { getAuthSession } from "~/models/auth";
import { getUserByEmail } from "~/models/user";
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
  { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "16x16" },
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
  const authSession = await getAuthSession(request);

  if (authSession) {
    const user = await getUserByEmail(authSession.email);
    return json({ user });
  }

  return json({ user: undefined });
}

export default function App() {
  const [volume, setVolume] = React.useState(0.5);
  const [mute, setMute] = React.useState(false);

  const { user } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="relative flex min-h-screen flex-col">
        <SoundContext.Provider
          value={{
            volume,
            setVolume,
            mute,
            setMute,
          }}
        >
          <Header user={user} />
          <Outlet />
          <Footer />
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
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
