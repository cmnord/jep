import clsx from "clsx";
import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
import { ErrorMessage, WarningMessage } from "~/components/error";
import {
  DocumentArrowUp,
  ExclamationTriangle,
  LoadingSpinner,
} from "~/components/icons";
import Link from "~/components/link";
import {
  type UploadProgress,
  UploadProgressOverlay,
} from "~/components/upload-progress";
import { useTranslation } from "~/i18n";
import {
  UploadError,
  type UploadResult,
  uploadWithProgress,
} from "~/utils/upload-with-progress";

/** Files the upload accepts: Jep! games and SIGame packs. Browsers report
 * .siq files as zip, octet-stream or nothing; the server checks the name. */
/** Uploads that finish sooner never show the overlay (no flash). */
export const OVERLAY_DELAY_MS = 300;
/** Once shown, the overlay stays at least this long. */
const OVERLAY_MIN_VISIBLE_MS = 500;

const ACCEPT_INPUT = [
  ".jep.json",
  ".json",
  "application/json",
  ".siq",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
].join(",");

export function isSiqFile(file?: { name: string }) {
  return file?.name.toLowerCase().endsWith(".siq") ?? false;
}

function UploadBox({
  loading,
  loadingText,
  onChange,
}: {
  loading: boolean;
  loadingText: string;
  onChange: (file?: File) => void;
}) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || !inputRef.current) return;

      // Set the file on the native input so form serialization works
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      inputRef.current.files = dataTransfer.files;

      onChange(file);
    },
    [onChange],
  );

  const { getRootProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".jep.json", ".json"],
      "application/zip": [".siq"],
    },
    multiple: false,
    disabled: loading,
    noClick: true,
  });

  const uploadText = t("upload.uploadOrImport");
  const invalidText = t("upload.invalidFileType");
  let label = loading ? loadingText : uploadText;
  if (isDragActive) {
    label = isDragReject ? invalidText : t("upload.dropFileHere");
  }

  return (
    <div className="my-2 flex flex-col items-center">
      <button
        {...getRootProps({ role: "button" })}
        id="upload-button"
        type="button"
        onClick={() => inputRef.current?.click()}
        className={clsx(
          `flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-sm text-ink-900 shadow-sm transition-colors focus:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-page focus:outline-none`,
          {
            "border-green-500 bg-green-50 dark:bg-green-950/40":
              isDragActive && !isDragReject,
            "border-red-500 bg-red-50 dark:bg-red-950/40": isDragReject,
            "border-blue-600 hover:border-blue-700 hover:shadow-md dark:border-accent dark:hover:border-accent-strong":
              !isDragActive,
          },
        )}
      >
        {loading ? (
          <LoadingSpinner className="mb-2" />
        ) : (
          <DocumentArrowUp className="mb-2 h-5 w-5" />
        )}
        <p className="grid text-center">
          <span className="col-start-1 row-start-1">{label}</span>
          <span
            className="invisible col-start-1 row-start-1"
            aria-hidden="true"
          >
            {uploadText}
          </span>
          <span
            className="invisible col-start-1 row-start-1"
            aria-hidden="true"
          >
            {invalidText}
          </span>
        </p>
        <input
          id="upload"
          type="file"
          disabled={loading}
          accept={ACCEPT_INPUT}
          name="upload"
          aria-describedby="upload_help"
          className="hidden"
          ref={inputRef}
          onChange={(e) => onChange(e.target.files?.[0])}
        />
      </button>
      <p id="upload_help" className="mt-1 text-center text-xs text-ink-500">
        {t("upload.hint")}
      </p>
      <Link to="/upload-help">
        <span className="text-sm">{t("upload.help")}</span>
      </Link>
    </div>
  );
}

type UploadFailure = { kind: "network" } | { kind: "server"; status: number };

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function Upload({
  formRef,
  loggedIn,
  redirectTo,
  onUploadStart,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  loggedIn: boolean;
  redirectTo: string;
  /** Called when an upload starts, e.g. to hide the previous result. */
  onUploadStart?: () => void;
}) {
  const { t, rich } = useTranslation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = React.useState(false);
  const [file, setFile] = React.useState<File | undefined>();
  const [progress, setProgress] = React.useState<UploadProgress | undefined>();
  const [overlayVisible, setOverlayVisible] = React.useState(false);
  const [failure, setFailure] = React.useState<UploadFailure | undefined>();
  const [announcement, setAnnouncement] = React.useState("");
  const busyRef = React.useRef(false);
  const abortRef = React.useRef<(() => void) | undefined>(undefined);
  const shownAtRef = React.useRef<number | undefined>(undefined);
  const showTimerRef = React.useRef<number | undefined>(undefined);

  // Leaving the page abandons the upload.
  React.useEffect(
    () => () => {
      abortRef.current?.();
      window.clearTimeout(showTimerRef.current);
    },
    [],
  );

  function reset() {
    busyRef.current = false;
    abortRef.current = undefined;
    window.clearTimeout(showTimerRef.current);
    shownAtRef.current = undefined;
    setOverlayVisible(false);
    setProgress(undefined);
    // Lets the same file be chosen again.
    formRef.current?.reset();
  }

  async function startUpload(upload: File) {
    if (busyRef.current) return;
    busyRef.current = true;
    onUploadStart?.();
    setFailure(undefined);

    const siq = isSiqFile(upload);
    const info = { name: upload.name, size: upload.size, siq };
    setProgress({ stage: "uploading", loaded: 0, total: upload.size, ...info });
    setAnnouncement(
      t("upload.progress.announceUploading", { name: upload.name }),
    );
    showTimerRef.current = window.setTimeout(() => {
      shownAtRef.current = Date.now();
      setOverlayVisible(true);
    }, OVERLAY_DELAY_MS);

    const body = new FormData();
    body.set("upload", upload, upload.name);
    const request = uploadWithProgress(`/game?redirectTo=${redirectTo}`, body, {
      onProgress: (loaded, total) =>
        setProgress((p) =>
          p?.stage === "uploading" ? { ...p, loaded, total } : p,
        ),
      onUploaded: () => {
        setProgress({ stage: "processing", ...info });
        setAnnouncement(
          siq
            ? t("upload.progress.announceImporting")
            : t("upload.progress.announceSaving"),
        );
      },
    });
    abortRef.current = request.abort;

    let result: UploadResult;
    try {
      result = await request.promise;
    } catch (error: unknown) {
      reset();
      if (error instanceof UploadError && error.kind === "aborted") {
        setAnnouncement(t("upload.progress.announceCanceled"));
        setFile(undefined);
        return;
      }
      setFailure(
        error instanceof UploadError && error.kind === "server"
          ? { kind: "server", status: error.status ?? 0 }
          : { kind: "network" },
      );
      setAnnouncement("");
      return;
    }

    // Don't flash the overlay: show it a little longer if it just appeared.
    window.clearTimeout(showTimerRef.current);
    if (shownAtRef.current !== undefined) {
      await sleep(
        Math.max(0, shownAtRef.current + OVERLAY_MIN_VISIBLE_MS - Date.now()),
      );
    }
    // The same navigation a form submission's redirect does: the page's
    // loader shows the flashed result (summary or error).
    await navigate(result.redirectTo, {
      replace: true,
      preventScrollReset: true,
    });
    setFile(undefined);
    setAnnouncement("");
    reset();
  }

  function handleChangeUpload(newFile?: File) {
    if (!newFile || busyRef.current) return;
    setFile(newFile);
    if (loggedIn) {
      void startUpload(newFile);
      return;
    }
    setShowModal(true);
  }

  return (
    <form
      method="POST"
      action={`/game?redirectTo=${redirectTo}`}
      encType="multipart/form-data"
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (file) void startUpload(file);
      }}
    >
      <Dialog
        isOpen={showModal}
        title={
          <div className="flex items-center gap-4">
            <ExclamationTriangle
              title={t("home.warning")}
              className="h-8 w-8"
            />
            <p>{t("upload.confirmPublic")}</p>
          </div>
        }
        onClose={() => setShowModal(false)}
        description={t("upload.confirmPublicDescription", {
          name: file?.name ?? t("upload.unknownFile"),
        })}
      >
        <div className="mb-4 flex flex-col gap-2 text-sm text-slate-300">
          <WarningMessage>{t("upload.guestWarning")}</WarningMessage>
          <p>
            {rich("upload.guidelines", {
              link: (chunks) => <Link to="/community">{chunks}</Link>,
            })}
          </p>
        </div>
        <Dialog.Footer>
          <Button
            onClick={() => {
              setShowModal(false);
              if (file) void startUpload(file);
            }}
          >
            {t("upload.uploadPublicly")}
          </Button>
          <Button
            variant="primary"
            autoFocus
            onClick={() => {
              formRef.current?.reset();
              setFile(undefined);
              setShowModal(false);
            }}
          >
            {t("upload.cancel")}
          </Button>
        </Dialog.Footer>
      </Dialog>
      <UploadBox
        loading={progress !== undefined}
        loadingText={
          isSiqFile(file) ? t("upload.importingSiq") : t("upload.uploading")
        }
        onChange={handleChangeUpload}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {failure ? (
        <div className="mb-4 flex flex-col items-center gap-2">
          <ErrorMessage>
            {failure.kind === "server"
              ? t("upload.error.server", { status: String(failure.status) })
              : t("upload.error.network")}
          </ErrorMessage>
          {file ? (
            <Button onClick={() => void startUpload(file)}>
              {t("upload.retry")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {progress && overlayVisible ? (
        <UploadProgressOverlay
          progress={progress}
          onCancel={() => abortRef.current?.()}
        />
      ) : null}
    </form>
  );
}
