import { Link, type LinkProps } from "react-router";

import { LoadingSpinner } from "~/components/icons";

type ButtonProps = React.ComponentProps<"button">;
type ButtonVariant = "primary" | "secondary" | "inverse" | "danger";

type Props = {
  variant?: ButtonVariant;
  loading?: boolean;
} & Omit<ButtonProps, "className">;

const BASE_STYLES =
  "relative inline-flex w-full cursor-pointer justify-center rounded-md border px-4 py-2 text-base font-medium shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:w-auto sm:text-sm disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:shadow-none";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-blue-600 text-white hover:bg-blue-700",
  secondary:
    "border-blue-600 bg-white text-blue-600 hover:border-blue-700 hover:bg-slate-100 hover:text-blue-700",
  inverse: "text-white hover:border-blue-300 hover:text-blue-300",
  danger: "border-transparent bg-red-600 text-white hover:bg-red-700",
};

function ButtonContent({
  loading,
  children,
}: {
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center justify-center gap-1">
      {loading && <LoadingSpinner />}
      {children}
    </div>
  );
}

export default function Button({
  variant = "secondary",
  type = "button",
  loading,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`${BASE_STYLES} ${VARIANT_STYLES[variant]}`}
      type={type}
    >
      <ButtonContent loading={loading}>{children}</ButtonContent>
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  children,
  ...rest
}: {
  variant?: ButtonVariant;
} & Omit<LinkProps, "className">) {
  return (
    <Link {...rest} className={`${BASE_STYLES} ${VARIANT_STYLES[variant]}`}>
      <ButtonContent>{children}</ButtonContent>
    </Link>
  );
}
