export function DefaultErrorBoundary({ error }: { error: Error }) {
  const stack = error.stack ? error.stack.split("\n") : [];

  return (
    <div className="p-12">
      <h1 className="text-xl font-bold mb-4">Error :(</h1>
      <div className="bg-red-100 rounded-md p-3">
        <p className="text-sm text-red-500 mb-2 font-mono">{error.message}</p>
        {stack.map((s, i) => (
          <p key={i} className="ml-4 text-sm text-red-500 font-mono">
            {s}
          </p>
        ))}
      </div>
    </div>
  );
}