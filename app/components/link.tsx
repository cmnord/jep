import { Link as RemixLink } from "@remix-run/react";

export function Anchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className={`text-blue-600 underline decoration-blue-400 transition-colors
      visited:text-purple-700 visited:decoration-purple-500
      hover:text-blue-500 hover:decoration-blue-300`}
      href={href}
    >
      {children}
    </a>
  );
}

export default function Link({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RemixLink
      className={
        (className ?? "") +
        `text-blue-600 underline decoration-blue-400 transition-colors
        visited:text-purple-700 visited:decoration-purple-500
        hover:text-blue-500 hover:decoration-blue-300`
      }
      to={to}
    >
      {children}
    </RemixLink>
  );
}
