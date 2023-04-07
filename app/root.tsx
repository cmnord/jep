import type { LinksFunction, V2_MetaFunction } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import * as React from "react";

import { CodeBlock } from "~/components/code";
import { DefaultErrorBoundary } from "~/components/error";
import Header from "~/components/header";

import stylesheet from "./styles.css";
import { SoundContext } from "./utils/use-sound";

export const meta: V2_MetaFunction = () => [
  { title: "jep!" },
  { name: "description", content: "A J! trivia app" },
  { property: "og:title", content: "jep!" },
];

export const links: LinksFunction = () => [
  {
    rel: "icon",
    href: "/favicon.png",
    type: "image/png",
    sizes: "16x16",
  },
  {
    rel: "preconnect",
    href: "https://fonts.googleapis.com",
  },
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

export default function App() {
  const [volume, setVolume] = React.useState(0.5);
  const [mute, setMute] = React.useState(false);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        <SoundContext.Provider
          value={{
            volume,
            setVolume,
            mute,
            setMute,
          }}
        >
          <Header />
          <Outlet />
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
          <div className="p-12 flex flex-col gap-4">
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
