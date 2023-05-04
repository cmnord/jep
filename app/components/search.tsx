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
          {/* Heroicon name: solid/magnifying-glass */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            role="img"
            aria-labelledby="search-title"
          >
            <title id="search-title">Search</title>
            <path
              fillRule="evenodd"
              d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
              clipRule="evenodd"
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
