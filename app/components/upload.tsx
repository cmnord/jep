import { DefaultErrorBoundary } from "~/components/error";

export default function Upload({ onChange }: { onChange?: () => void }) {
  // TODO: drag and drop with react-dropzone
  return (
    <div className="flex flex-col items-center">
      <label
        tabIndex={0}
        className={
          "flex rounded-lg text-gray-900 cursor-pointer " +
          "border-2 border-dashed border-blue-600 " +
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        }
      >
        <div
          className={
            "flex flex-col justify-center items-center px-4 py-6 text-sm bg-gray-100 rounded-lg transition-colors " +
            "hover:bg-gray-200 "
          }
        >
          {/* Heroicon name: outline/arrow-up-tray */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 mb-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="font-medium">Upload .jep.json file</p>
          <input
            type="file"
            accept="application/json"
            name="upload"
            aria-describedby="upload_help"
            className="hidden"
            onChange={onChange}
          />
        </div>
      </label>
      {/* TODO: help with format */}
    </div>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
