import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import { DefaultErrorBoundary } from "~/components/error";
import Header from "~/components/header";
import Link, { Anchor } from "~/components/link";

import globalStylesheet from "./styles.css";
import styles from "./tailwind.css";

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "jep!",
  viewport: "width=device-width,initial-scale=1",
  description: "A J! trivia app",
});

export const links: LinksFunction = () => [
  {
    rel: "icon",
    href: "/favicon.png",
    type: "image/png",
    sizes: "16x16",
  },
  { rel: "stylesheet", href: styles },
  { rel: "stylesheet", href: globalStylesheet },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        <Header />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <footer className="mt-auto p-6 text-center text-sm text-gray-500">
          Made with &lt;3 by{" "}
          <Anchor href="https://github.com/cmnord">cmnord</Anchor>
        </footer>
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
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        <Header />
        <DefaultErrorBoundary error={error} />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <footer className="mt-auto p-6 text-center text-sm text-gray-500">
          Made with &lt;3 by <Link to="https://github.com/cmnord">cmnord</Link>
        </footer>
      </body>
    </html>
  );
}
