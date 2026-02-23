import type { RoomProps } from "~/components/game";

import { ConnectedPrompt } from "./prompt";

export default function Prompt(props: RoomProps & { gameId: string }) {
  return <ConnectedPrompt {...props} />;
}
