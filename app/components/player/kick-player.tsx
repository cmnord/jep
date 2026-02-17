import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useFetcher } from "react-router";

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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="absolute left-0 m-1 h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M22 10.5H16M13.75 6.375C13.75 8.23896 12.239 9.75 10.375 9.75C8.51104 9.75 7 8.23896 7 6.375C7 4.51104 8.51104 3 10.375 3C12.239 3 13.75 4.51104 13.75 6.375ZM4.00092 19.2343C4.00031 19.198 4 19.1615 4 19.125C4 15.6042 6.85418 12.75 10.375 12.75C13.8958 12.75 16.75 15.6042 16.75 19.125V19.1276C16.75 19.1632 16.7497 19.1988 16.7491 19.2343C14.8874 20.3552 12.7065 21 10.375 21C8.04353 21 5.86264 20.3552 4.00092 19.2343Z"
                  />
                </svg>
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
