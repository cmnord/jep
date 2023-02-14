import { Link } from "@remix-run/react";

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
