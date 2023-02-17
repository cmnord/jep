import { useDebounceEnd } from "~/utils/use-debounce";

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

export default function Search({
  name,
  defaultValue,
  onChange,
  loading,
}: {
  name: string;
  defaultValue: string | undefined;
  onChange: (value: string) => void;
  loading: boolean;
}) {
  const debouncedLoading = useDebounceEnd(loading, 100);

  return (
    <div className="mb-4">
      <label
        htmlFor={name}
        className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white"
      >
        Search
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {/* Heroicon name: outline/magnifying-glass */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <input
          type="search"
          id={name}
          name={name}
          className={
            "block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 " +
            "focus:ring-blue-500 focus:border-blue-500"
          }
          placeholder="Search games..."
          onChange={(e) => onChange(e.target.value)}
          defaultValue={defaultValue}
        />
        {debouncedLoading ? (
          <div className={"absolute right-2.5 bottom-2.5 p-2 text-blue-600"}>
            <LoadingSpinner />
          </div>
        ) : null}
      </div>
    </div>
  );
}
