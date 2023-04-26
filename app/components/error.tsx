import { useRouteError } from "@remix-run/react";

export function DefaultErrorBoundary() {
  const error = useRouteError();

  const message = error instanceof Error ? error.message : "Unknown error";
  const stack =
    error instanceof Error && error.stack ? error.stack.split("\n") : [];

  return (
    <div className="p-12">
      <h1 className="mb-4 text-xl font-bold">Error :(</h1>
      <div className="rounded-md bg-red-100 p-3">
        <p className="mb-2 font-mono text-sm text-red-500">{message}</p>
        {stack.map((s, i) => (
          <p key={i} className="ml-4 font-mono text-sm text-red-500">
            {s}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-100 p-3" role="alert">
      <p className="text-sm text-red-500">{message}</p>
    </div>
  );
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-green-100 p-3">
      <p className="text-sm text-green-500">{message}</p>
    </div>
  );
}
