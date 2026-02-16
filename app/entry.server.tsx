import { PassThrough } from "node:stream";

declare module "@remix-run/server-runtime" {
  interface Future {
    v3_singleFetch: true;
  }
}

import type { EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";

export const streamTimeout = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  // Prevent browsers from MIME-sniffing a response away from the declared type
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  // Prevent clickjacking by blocking iframe embedding
  responseHeaders.set("X-Frame-Options", "DENY");
  // Limit referrer info sent cross-origin to prevent leaking URL paths/params
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Disable unused browser APIs to reduce XSS attack surface
  responseHeaders.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  // Force HTTPS for 2 years to prevent protocol downgrade attacks
  responseHeaders.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains",
  );
  // Process-isolate this tab to block cross-window and Spectre attacks
  responseHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
  // Prevent other sites from loading our resources (blocks cross-origin reads)
  responseHeaders.set("Cross-Origin-Resource-Policy", "same-origin");
  // Disable legacy XSS auditor — it's itself exploitable
  responseHeaders.set("X-XSS-Protection", "0");
  // Prevent DNS prefetching to avoid leaking which URLs are linked on the page
  responseHeaders.set("X-DNS-Prefetch-Control", "off");

  const prohibitOutOfOrderStreaming =
    isBotRequest(request.headers.get("user-agent")) || remixContext.isSpaMode;

  return prohibitOutOfOrderStreaming
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      );
}

function isBotRequest(userAgent: string | null) {
  if (!userAgent) {
    return false;
  }
  return isbot(userAgent);
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, streamTimeout + 1_000);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, streamTimeout + 1_000);
  });
}
