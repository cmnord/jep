import { Eye, EyeSlash } from "~/components/icons";
import type { GameVisibility } from "~/models/game.server";

export function GameVisibilityTag({
  visibility,
}: {
  visibility: GameVisibility;
}) {
  return (
    <div
      className={`flex items-center rounded-md border border-slate-200 bg-slate-100 px-1 text-slate-500`}
    >
      <span className="text-xs">{visibility}</span>
      <GameVisibilityIcon variant="tag" visibility={visibility} />
    </div>
  );
}

export default function GameVisibilityIcon({
  variant,
  visibility,
}: {
  variant: "tag" | "menu";
  visibility: GameVisibility;
}) {
  const className =
    variant === "tag"
      ? "m-1 inline-block h-3 w-3"
      : "absolute left-0 m-1 h-5 w-5";
  switch (visibility) {
    case "PUBLIC":
      return (
        <Eye
          className={"text-green-600 group-hover:text-green-700 " + className}
          title="Public"
        />
      );
    case "PRIVATE":
      return <EyeSlash className={className} title="Private" />;
    case "UNLISTED":
      return <Eye className={className} title="Unlisted" />;
  }
}
