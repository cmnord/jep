import { useRouteError } from "@remix-run/react";
import classNames from "classnames";

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

export function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-red-100 p-3" role="alert">
      <p className="text-sm text-red-500">{children}</p>
    </div>
  );
}

export function WarningMessage({
  theme = "light",
  children,
}: {
  theme?: "dark" | "light";
  children: React.ReactNode;
}) {
  return (
    <div
      className={classNames("flex-wrap items-baseline rounded-md p-3", {
        "bg-yellow-700 text-yellow-100": theme === "dark",
        "bg-yellow-100 text-yellow-700": theme === "light",
      })}
    >
      <p className="text-sm">{children}</p>
    </div>
  );
}

export function SuccessMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-green-100 p-3">
      <p className="text-sm text-green-500">{children}</p>
    </div>
  );
}
