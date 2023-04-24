import { LoadingSpinner } from "~/components/icons";
import Link from "~/components/link";

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
      <title id="upload-title">Upload .jep.json file</title>
      <path
        fillRule="evenodd"
        d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6.905 9.97a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72V18a.75.75 0 001.5 0v-4.19l1.72 1.72a.75.75 0 101.06-1.06l-3-3z"
        clipRule="evenodd"
      />
      <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
    </svg>
  );
}

export default function Upload({
  loading,
  onChange,
}: {
  loading: boolean;
  onChange?: () => void;
}) {
  // TODO: drag and drop with react-dropzone
  return (
    <div className="flex flex-col items-center">
      <label
        tabIndex={loading ? undefined : 0}
        role={loading ? undefined : "button"}
        className={`flex rounded-lg border-2 border-dashed border-blue-600
        text-slate-900
        focus:outline-none focus:ring-2 focus:ring-blue-500
        focus:ring-offset-2`}
      >
        <div
          className={`flex flex-col items-center justify-center rounded-lg
          bg-slate-100 p-6 text-sm transition-colors
          hover:bg-slate-200`}
        >
          {loading ? <LoadingSpinner className="mb-2" /> : <UploadIcon />}
          <p className="font-medium">Upload .jep.json file</p>
          <input
            id="upload"
            type="file"
            disabled={loading}
            accept=".jep.json,application/json"
            name="upload"
            aria-describedby="upload_help"
            className="hidden"
            onChange={onChange}
          />
        </div>
      </label>
      <Link to="/help">
        <p id="upload_help" className="mt-1 text-sm">
          File format help
        </p>
      </Link>
    </div>
  );
}
