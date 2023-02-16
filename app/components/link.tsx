import { Link } from "@remix-run/react";

export function Anchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="text-blue-600 hover:text-blue-500 underline transition-colors visited:text-purple-700"
      href={href}
    >
      {children}
    </a>
  );
}

export default function StyledLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="text-blue-600 hover:text-blue-500 underline transition-colors visited:text-purple-700"
      to={to}
    >
      {children}
    </Link>
  );
}
