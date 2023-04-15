import { LoadingSpinner } from "~/components/icons";
import Input from "~/components/input";
import { useDebounceEnd } from "~/utils/use-debounce";

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
      <label htmlFor={name} className="sr-only">
        Search
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {/* Heroicon name: outline/magnifying-glass */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
            role="img"
            aria-labelledby="search-title"
          >
            <title id="search-title">Search</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <Input
          type="search"
          id={name}
          name={name}
          className="p-4 pl-10"
          placeholder="Search games..."
          onChange={(e) => onChange(e.target.value)}
          defaultValue={defaultValue}
        />
        {debouncedLoading ? (
          <div className={"absolute bottom-2.5 right-2.5 p-2 text-blue-600"}>
            <LoadingSpinner />
          </div>
        ) : null}
      </div>
    </div>
  );
}
