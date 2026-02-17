import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useFetcher } from "react-router";

import { UserMinus } from "~/components/icons";
import type { Action, Player } from "~/engine";
import { useEngineContext } from "~/engine";
import useSoloAction from "~/utils/use-solo-action";

import { PlayerIcon } from "./player";

export function KickablePlayerIcon({
  player,
  roomId,
  isSelf,
}: {
  player: Player;
  roomId: number;
  isSelf: boolean;
}) {
  const { soloDispatch } = useEngineContext();

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          className="cursor-pointer self-start rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label={isSelf ? "Leave game" : `Kick player ${player.name}`}
        >
          <PlayerIcon player={player} />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className="w-56 rounded-md bg-blue-600 p-1 text-white shadow-lg will-change-[opacity,transform] data-[side=bottom]:animate-slide-up-and-fade data-[side=left]:animate-slide-right-and-fade data-[side=right]:animate-slide-left-and-fade data-[side=top]:animate-slide-down-and-fade"
          sideOffset={5}
        >
          <DropdownMenuPrimitive.Label className="p-1 font-bold">
            {player.name}
          </DropdownMenuPrimitive.Label>
          <DropdownMenuPrimitive.Separator className="m-1 h-px bg-white/30" />
          <DropdownMenuPrimitive.Item
            asChild
            onSelect={(e: Event) => e.preventDefault()}
            className="group relative flex cursor-pointer items-center rounded-md p-1 outline-none select-none data-[highlighted]:bg-white/10"
          >
            <fetcher.Form method="DELETE" action={`/room/${roomId}/player`}>
              <input type="hidden" name="userId" value={player.userId} />
              <input type="hidden" name="name" value={player.name} />
              <button
                type="submit"
                className="flex grow cursor-pointer items-center text-red-200"
              >
                <UserMinus className="absolute left-0 m-1 h-5 w-5" />
                <span className="pl-7">
                  {isSelf ? "Leave game" : "Kick player"}
                </span>
              </button>
            </fetcher.Form>
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Arrow className="fill-blue-600" />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
