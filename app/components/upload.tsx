import type { FetcherWithComponents } from "@remix-run/react";
import { useSubmit } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
import { WarningMessage } from "~/components/error";
import { ExclamationTriangle, LoadingSpinner } from "~/components/icons";
import Link from "~/components/link";

const UPLOAD_TEXT = "Upload new game";

/** Heroicon name: solid/document-arrow-up */
function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="mb-2 h-5 w-5"
      role="img"
      aria-labelledby="upload-title"
    >
      <title id="upload-title">{UPLOAD_TEXT}</title>
      <path
        fillRule="evenodd"
        d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6.905 9.97a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72V18a.75.75 0 001.5 0v-4.19l1.72 1.72a.75.75 0 101.06-1.06l-3-3z"
        clipRule="evenodd"
      />
      <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
    </svg>
  );
}

function UploadBox({
  loading,
  onChange,
}: {
  loading: boolean;
  onChange: (file?: File) => void;
}) {
  // TODO: drag and drop with react-dropzone
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="my-2 flex flex-col items-center">
      <button
        id="upload-button"
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-lg
        border-2 border-dashed border-blue-600 p-6 text-sm text-slate-900
        shadow-sm transition-colors
        hover:border-blue-700 hover:shadow-md
        focus:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500
        focus:ring-offset-2`}
      >
        {loading ? <LoadingSpinner className="mb-2" /> : <UploadIcon />}
        <p>{UPLOAD_TEXT}</p>
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
  formRef: React.RefObject<HTMLFormElement>;
  loggedIn: boolean;
  redirectTo: string;
}) {
  const [showModal, setShowModal] = React.useState(false);
  const [file, setFile] = React.useState<File | undefined>();
  const submit = useSubmit();

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
      replace
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
        <div className="mb-4 flex flex-col gap-2 text-sm text-slate-500">
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
          <Link to="/login">
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
