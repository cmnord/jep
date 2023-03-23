import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
} from "@remix-run/react";
import * as React from "react";

import { CodeBlock } from "~/components/code";
import { DefaultErrorBoundary } from "~/components/error";
import Header from "~/components/header";

import stylesheet from "./styles.css";
import { SoundContext } from "./utils/use-sound";

export const meta: MetaFunction = () => ({
  title: "jep!",
  description: "A J! trivia app",
});

export const links: LinksFunction = () => [
  {
    rel: "icon",
    href: "/favicon.png",
    type: "image/png",
    sizes: "16x16",
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

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
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
        <DefaultErrorBoundary error={error} />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

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
          <h1 className="text-3xl font-bold">Caught</h1>
          <p>Status: {caught.status}</p>
          <CodeBlock text={JSON.stringify(caught.data, null, 2)} />
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
