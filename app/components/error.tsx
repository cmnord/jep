export default function Error({ error }: { error: Error }) {
  return (
    <div className="p-12">
      <h1 className="text-xl font-bold mb-4">Error :(</h1>
      <div className="bg-red-100 rounded-md p-3">
        <p className="text-sm text-red-500 mb-2 font-mono">{error.message}</p>
        <p className="text-sm text-red-500 font-mono">{error.stack}</p>
      </div>
    </div>
  );
}
