export default function Search({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string | undefined;
}) {
  return (
    <div className="mb-4 md:w-96">
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
          name={name}
          className={
            "block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 " +
            "focus:ring-blue-500 focus:border-blue-500"
          }
          placeholder="Search games..."
          defaultValue={defaultValue}
        />
        <button
          type="submit"
          className={
            "text-white absolute right-2.5 bottom-2.5 bg-blue-700 " +
            "hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2"
          }
        >
          Search
        </button>
      </div>
    </div>
  );
}
