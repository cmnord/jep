import classNames from "classnames";

interface Props {
  onClick?: () => void;
  type?: "primary" | "default";
  disabled?: boolean;
  htmlType?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  children: React.ReactNode;
  name?: string;
  value?: string;
  autoFocus?: boolean;
}

export default function Button({
  onClick,
  children,
  type = "default",
  disabled = false,
  htmlType,
  name,
  value,
  autoFocus,
}: Props) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex w-full justify-center rounded-md border px-4 py-2 text-base font-medium shadow-sm transition-colors " +
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 " +
          "sm:w-auto sm:text-sm " +
          "disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed",
        {
          "border-transparent bg-blue-600 text-white hover:bg-blue-700":
            type === "primary",
          "border-blue-600 bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-700 hover:border-blue-700":
            type === "default",
        }
      )}
      type={htmlType}
      name={name}
      value={value}
      autoFocus={autoFocus}
    >
      {children}
    </button>
  );
}
