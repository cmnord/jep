import { Eye, EyeSlash } from "~/components/icons";

export default function ShowPasswordButton({
  showPassword,
  onClick,
}: {
  showPassword: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={"absolute right-0 top-0.5 p-2"}
      onClick={onClick}
    >
      {showPassword ? (
        <EyeSlash className="h-5 w-5" title="Hide password" />
      ) : (
        <Eye className="h-5 w-5" title="Show password" />
      )}
    </button>
  );
}
