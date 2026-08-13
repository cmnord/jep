import clsx from "clsx";

export function getClueButtonClassName({
  loading = false,
  playable,
}: {
  loading?: boolean;
  playable: boolean;
}) {
  return clsx(
    "group relative h-full w-full bg-blue-bright px-4 py-3 transition-colors",
    {
      "hover:bg-blue-700 focus:bg-blue-700": playable,
      "bg-slate-800": !playable,
      "border-spin opacity-75": loading,
    },
  );
}

export function BoardLayout({
  children,
  columns,
}: {
  children: React.ReactNode;
  columns: number;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div
        className="mx-auto max-w-screen-lg"
        style={{ minWidth: `${columns * 50}px` }}
      >
        <table className="h-1 w-full table-fixed bg-blue-bright text-white">
          {children}
        </table>
      </div>
    </div>
  );
}

export function EmptyBoard({
  columns,
  rows,
}: {
  columns: number;
  rows: number;
}) {
  return (
    <BoardLayout columns={columns}>
      <thead>
        <tr className="h-1">
          {Array.from({ length: columns }, (_, column) => (
            <th
              key={column}
              className="h-full border-2 border-blue-925 bg-black/30 leading-none sm:p-4"
            >
              <span className="block h-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row}>
            {Array.from({ length: columns }, (_, column) => (
              <td key={column} className="h-full border-2 border-blue-925">
                <button
                  type="button"
                  aria-label={`Hidden clue, row ${row + 1}, column ${column + 1}`}
                  className={getClueButtonClassName({ playable: true })}
                >
                  <span className="block h-8 sm:h-12 lg:h-14" />
                </button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </BoardLayout>
  );
}
