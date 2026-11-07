/** Request header asking POST /game to answer with JSON (`{ redirectTo }`,
 * the form state flashed into the session cookie) instead of a redirect: an
 * XMLHttpRequest follows redirects itself, which would consume the flash
 * message before the page could show it. */
export const UPLOAD_PROGRESS_HEADER = "X-Jep-Upload";

/** The JSON answer of POST /game to a progress upload. */
export interface UploadResult {
  redirectTo: string;
}

export type UploadErrorKind = "network" | "server" | "aborted";

export class UploadError extends Error {
  constructor(
    readonly kind: UploadErrorKind,
    readonly status?: number,
  ) {
    super(status ? `upload ${kind} error (${status})` : `upload ${kind} error`);
    this.name = "UploadError";
  }
}

function parseResult(text: string): UploadResult | undefined {
  try {
    const value: unknown = JSON.parse(text);
    if (
      value &&
      typeof value === "object" &&
      "redirectTo" in value &&
      typeof value.redirectTo === "string"
    ) {
      return { redirectTo: value.redirectTo };
    }
  } catch {
    // Not JSON: e.g. a proxy error page.
  }
  return undefined;
}

/** uploadWithProgress posts `body` with an XMLHttpRequest (fetch cannot
 * report upload progress) and reports the bytes sent. `onUploaded` fires once
 * every byte is sent and the server is processing the file. */
export function uploadWithProgress(
  url: string,
  body: FormData,
  {
    onProgress,
    onUploaded,
  }: {
    onProgress: (loaded: number, total: number) => void;
    onUploaded: () => void;
  },
): { promise: Promise<UploadResult>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<UploadResult>((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.upload.onload = () => onUploaded();
    xhr.onload = () => {
      const result = parseResult(xhr.responseText);
      if (result) resolve(result);
      else reject(new UploadError("server", xhr.status));
    };
    xhr.onerror = () => reject(new UploadError("network"));
    xhr.onabort = () => reject(new UploadError("aborted"));
  });
  xhr.open("POST", url);
  xhr.setRequestHeader(UPLOAD_PROGRESS_HEADER, "1");
  xhr.send(body);
  return { promise, abort: () => xhr.abort() };
}
