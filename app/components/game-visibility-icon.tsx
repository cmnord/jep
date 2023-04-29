import { Eye, EyeSlash } from "~/components/icons";
import type { GameVisibility } from "~/models/game.server";

export function GameVisibilityTag({
  visibility,
}: {
  visibility: GameVisibility;
}) {
  return (
    <div
      className={`flex items-center rounded-md border border-slate-200
          bg-slate-100 px-1 text-slate-500`}
    >
      <span className="text-xs">{visibility}</span>
      <GameVisibilityIcon
        className="m-1 inline-block h-3 w-3"
        visibility={visibility}
      />
    </div>
  );
}

export default function GameVisibilityIcon({
  className,
  visibility,
}: {
  className: string;
  visibility: GameVisibility;
}) {
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
