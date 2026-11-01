import { authenticateApiToken, type ApiScope } from "~/models/api-token.server";

/** Errors thrown by API request helpers remain JSON, outside UI error boundaries. */
export function apiFailure(
  status: number,
  code: string,
  message: string,
  issues?: unknown,
) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  // Do not reuse a connection with an unread oversized request body.
  if (status === 413) headers.set("Connection", "close");
  if (status === 401) headers.set("WWW-Authenticate", "Bearer");
  if (status === 405) headers.set("Allow", "POST");
  return Response.json(
    { apiVersion: "1", error: { code, message, issues } },
    { status, headers },
  );
}

/** Shared HTTP checks for API POST endpoints that require idempotency. */
export async function readIdempotentApiRequest(
  request: Request,
  scope: ApiScope,
  maxBodyBytes: number,
) {
  if (request.method !== "POST")
    throw apiFailure(405, "method_not_allowed", "Use POST.");
  const [scheme, token, extra] =
    request.headers.get("Authorization")?.split(" ") ?? [];
  const tokenHash =
    scheme?.toLowerCase() === "bearer" && token && extra === undefined
      ? await authenticateApiToken(token, scope)
      : null;
  if (!tokenHash)
    throw apiFailure(
      401,
      "unauthorized",
      "A valid API token with the required scope is required.",
    );

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey || !/^[\x21-\x7e]{1,200}$/.test(idempotencyKey)) {
    throw apiFailure(
      400,
      "invalid_idempotency_key",
      "Idempotency-Key must contain 1–200 printable ASCII characters without spaces.",
    );
  }
  if (
    request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw apiFailure(415, "unsupported_media_type", "Use application/json.");
  }
  const tooLarge = apiFailure(
    413,
    "payload_too_large",
    `Body exceeds ${maxBodyBytes.toLocaleString("en-US")} bytes.`,
  );
  if (Number(request.headers.get("Content-Length")) > maxBodyBytes)
    throw tooLarge;
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        // Release the reader's ownership without cancelling the request:
        // cancellation closes the socket before we can send the 413 response.
        reader.releaseLock();
        throw tooLarge;
      }
      chunks.push(value);
    }
  }
  let body: unknown;
  try {
    body = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch {
    throw apiFailure(400, "invalid_json", "Body must be valid UTF-8 JSON.");
  }
  return { tokenHash, idempotencyKey, body };
}
