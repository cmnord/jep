import type { MetaFunction, LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  Link,
  ScrollRestoration,
} from "@remix-run/react";

import Anchor from "~/components/link";

import styles from "./tailwind.css";
import globalStylesheet from "./styles.css";

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "jep!",
  viewport: "width=device-width,initial-scale=1",
  description: "A J! trivia app",
});

export const links: LinksFunction = () => [
  {
    rel: "icon",
    href: "https://cdn.glitch.com/a0ea5fd0-c422-4261-8950-fdebebccb098%2Fjeopardy.png?v=1604939463216",
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
        <nav className="p-6 bg-blue-1000">
          <Link to="/">
            <h1 className="text-2xl font-bold text-white font-korinna text-shadow-1">
              Jep!
            </h1>
          </Link>
        </nav>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <footer className="mt-auto p-6 text-center text-sm text-gray-500">
          Made with &lt;3 by{" "}
          <Anchor to="https://github.com/cmnord">cmnord</Anchor>
        </footer>
      </body>
    </html>
  );
}
