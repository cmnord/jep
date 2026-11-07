import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { formatBytes } from "~/admin/format";
import Button from "~/components/button";
import { LoadingSpinner } from "~/components/icons";
import { useTranslation } from "~/i18n";

/** The stages of an upload the overlay shows. */
export type UploadProgress =
  | {
      stage: "uploading";
      name: string;
      size: number;
      loaded: number;
      total: number;
      siq: boolean;
    }
  | { stage: "processing"; name: string; size: number; siq: boolean };

export function uploadPercent(loaded: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
}

/** UploadProgressOverlay is a modal screen over the page while a game or a
 * pack uploads (real progress) and the server imports it (indeterminate). It
 * cannot be dismissed; only the upload stage can be canceled. */
export function UploadProgressOverlay({
  progress,
  onCancel,
}: {
  progress: UploadProgress;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const uploading = progress.stage === "uploading";
  const percent = uploading
    ? uploadPercent(progress.loaded, progress.total)
    : 0;
  let title = t("upload.uploading");
  let hint = t("upload.progress.uploadingHint");
  if (!uploading) {
    title = progress.siq
      ? t("upload.progress.importingTitle")
      : t("upload.progress.savingTitle");
    hint = progress.siq
      ? t("upload.progress.importingHint")
      : t("upload.progress.savingHint");
  }

  return (
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 grid animate-overlay-show place-items-center overflow-y-auto bg-slate-500/75 p-4 opacity-0 dark:bg-black/70">
          <DialogPrimitive.Content
            ref={contentRef}
            data-testid="upload-progress"
            className="w-full max-w-md animate-content-show rounded-md bg-blue-1000 p-5 text-white opacity-0 shadow-xl focus:outline-none dark:ring-1 dark:ring-white/15"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => {
              // Focus the dialog itself (the cancel button disappears when
              // the upload stage ends).
              e.preventDefault();
              contentRef.current?.focus();
            }}
            tabIndex={-1}
          >
            <div className="mb-3 flex items-center gap-3">
              <LoadingSpinner className="shrink-0 text-yellow-1000" />
              <DialogPrimitive.Title className="text-xl leading-6 font-medium">
                {title}
              </DialogPrimitive.Title>
            </div>
            <p className="truncate font-medium" title={progress.name}>
              {progress.name}
            </p>
            <p className="mb-4 text-sm text-slate-300">
              {uploading
                ? t("upload.progress.bytes", {
                    // The request is a bit larger than the file (multipart
                    // framing): show the file's share.
                    loaded: formatBytes((progress.size * percent) / 100, t),
                    total: formatBytes(progress.size, t),
                  })
                : formatBytes(progress.size, t)}
            </p>
            {uploading ? (
              <div className="flex items-center gap-3">
                <div
                  role="progressbar"
                  aria-label={t("upload.progress.barLabel")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  className="h-3 grow overflow-hidden rounded-full bg-white/20"
                >
                  <div
                    className="h-full rounded-full bg-yellow-1000 transition-[width] duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm tabular-nums">
                  {percent}%
                </span>
              </div>
            ) : (
              <div
                role="progressbar"
                aria-label={t("upload.progress.processingLabel")}
                aria-valuetext={title}
                className="h-3 overflow-hidden rounded-full bg-white/20"
              >
                <div className="h-full w-1/3 animate-upload-indeterminate rounded-full bg-yellow-1000" />
              </div>
            )}
            <DialogPrimitive.Description className="mt-4 text-sm text-slate-300">
              {hint}
            </DialogPrimitive.Description>
            {uploading ? (
              <div className="mt-4 flex justify-end">
                <Button variant="inverse" onClick={onCancel}>
                  {t("upload.progress.cancel")}
                </Button>
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
