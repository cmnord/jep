import type { MetaFunction, LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

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
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <h1>Jep!</h1>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <div>
          Made with &lt;3 by <a href="https://github.com/cmnord">cmnord</a>
        </div>
      </body>
    </html>
  );
}
