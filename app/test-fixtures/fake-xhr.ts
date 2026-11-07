/** FakeXhr stands in for XMLHttpRequest in unit tests: it records what was
 * sent and lets the test drive upload progress and the response. Install it
 * with `installFakeXhr()`; the created requests are in `FakeXhr.instances`. */
export class FakeXhr {
  static instances: FakeXhr[] = [];

  method = "";
  url = "";
  body: unknown = null;
  headers: Record<string, string> = {};
  status = 0;
  responseText = "";
  aborted = false;

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  readonly upload: {
    onprogress:
      | ((e: {
          lengthComputable: boolean;
          loaded: number;
          total: number;
        }) => void)
      | null;
    onload: (() => void) | null;
  } = { onprogress: null, onload: null };

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: unknown) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
    this.onabort?.();
  }

  /** progress reports `loaded` of `total` bytes sent. */
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }

  /** uploaded reports that every byte was sent. */
  uploaded() {
    this.upload.onload?.();
  }

  /** respond finishes the request with a status and a body. */
  respond(status: number, body: string) {
    this.status = status;
    this.responseText = body;
    this.onload?.();
  }

  fail() {
    this.onerror?.();
  }
}

/** installFakeXhr replaces the global XMLHttpRequest and returns a restore
 * function. */
export function installFakeXhr(): () => void {
  const original = globalThis.XMLHttpRequest;
  FakeXhr.instances = [];
  Object.assign(globalThis, { XMLHttpRequest: FakeXhr });
  return () => {
    Object.assign(globalThis, { XMLHttpRequest: original });
  };
}
