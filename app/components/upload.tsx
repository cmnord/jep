import clsx from "clsx";
import * as React from "react";
import { useDropzone } from "react-dropzone";
import type { FetcherWithComponents } from "react-router";
import { useLocation, useSubmit } from "react-router";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
import { WarningMessage } from "~/components/error";
import {
  DocumentArrowUp,
  ExclamationTriangle,
  LoadingSpinner,
} from "~/components/icons";
import Link from "~/components/link";

const UPLOAD_TEXT = "Upload new game";

function UploadBox({
  loading,
  onChange,
}: {
  loading: boolean;
  onChange: (file?: File) => void;
}) {
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
    accept: { "application/json": [".jep.json", ".json"] },
    multiple: false,
    disabled: loading,
    noClick: true,
  });

  let label = UPLOAD_TEXT;
  if (isDragActive) {
    label = isDragReject ? "Invalid file type" : "Drop file here";
  }

  return (
    <div className="my-2 flex flex-col items-center">
      <button
        {...getRootProps({ role: "button" })}
        id="upload-button"
        type="button"
        onClick={() => inputRef.current?.click()}
        className={clsx(
          `flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-sm text-slate-900 shadow-sm transition-colors focus:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none`,
          {
            "border-green-500 bg-green-50": isDragActive && !isDragReject,
            "border-red-500 bg-red-50": isDragReject,
            "border-blue-600 hover:border-blue-700 hover:shadow-md":
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
            {UPLOAD_TEXT}
          </span>
          <span
            className="invisible col-start-1 row-start-1"
            aria-hidden="true"
          >
            Invalid file type
          </span>
        </p>
        <input
          id="upload"
          type="file"
          disabled={loading}
          accept=".jep.json,application/json"
          name="upload"
          aria-describedby="upload_help"
          className="hidden"
          ref={inputRef}
          onChange={(e) => onChange(e.target.files?.[0])}
        />
      </button>
      <Link to="/help">
        <p id="upload_help" className="mt-1 text-sm">
          Upload help
        </p>
      </Link>
    </div>
  );
}

export default function Upload({
  fetcher,
  formRef,
  loggedIn,
  redirectTo,
}: {
  fetcher: FetcherWithComponents<never>;
  formRef: React.RefObject<HTMLFormElement | null>;
  loggedIn: boolean;
  redirectTo: string;
}) {
  const [showModal, setShowModal] = React.useState(false);
  const [file, setFile] = React.useState<File | undefined>();
  const submit = useSubmit();
  const location = useLocation();

  function handleChangeUpload(newFile?: File) {
    if (loggedIn) {
      submit(formRef.current);
      return;
    }
    setShowModal(true);
    setFile(newFile);
  }

  return (
    <fetcher.Form
      method="POST"
      action={`/game?redirectTo=${redirectTo}`}
      encType="multipart/form-data"
      ref={formRef}
    >
      <Dialog
        isOpen={showModal}
        title={
          <div className="flex items-center gap-4">
            <ExclamationTriangle title="Warning" className="h-8 w-8" />
            <p>Confirm public upload</p>
          </div>
        }
        onClickClose={() => setShowModal(false)}
        description={`Do you want to upload the game "${
          file?.name ?? "unknown"
        }" publicly?`}
      >
        <div className="mb-4 flex flex-col gap-2 text-sm text-slate-300">
          <WarningMessage>
            As a guest, you will not be able to edit or delete the game later.
          </WarningMessage>
          <p>Log in to upload private games, edit games, or delete games.</p>
          <p>
            Games must follow the{" "}
            <Link to="/community">community guidelines</Link>.
          </p>
        </div>
        <Dialog.Footer>
          <Button
            onClick={() => {
              submit(formRef.current);
              setShowModal(false);
            }}
          >
            Upload publicly
          </Button>
          <Link
            to={
              location.pathname === "/"
                ? "/login"
                : `/login?redirectTo=${encodeURIComponent(location.pathname)}`
            }
          >
            <Button type="primary" htmlType="button" autoFocus>
              Log in
            </Button>
          </Link>
        </Dialog.Footer>
      </Dialog>
      <UploadBox
        loading={fetcher.state === "submitting"}
        onChange={handleChangeUpload}
      />
    </fetcher.Form>
  );
}
