import { LoadingSpinner, MagnifyingGlass } from "~/components/icons";
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
          <MagnifyingGlass className="h-5 w-5" />
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
          <div className={"absolute right-2.5 bottom-2.5 p-2 text-blue-600"}>
            <LoadingSpinner />
          </div>
        ) : null}
      </div>
    </div>
  );
}
