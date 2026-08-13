import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import { EllipsisHorizontal } from "~/components/icons";

function Item({
  children,
  ...props
}: Omit<DropdownMenu.DropdownMenuItemProps, "className">) {
  return (
    <DropdownMenu.Item
      {...props}
      className="group relative flex items-center rounded-md p-1 text-slate-200 outline-none select-none data-[highlighted]:bg-white/10"
    >
      {children}
    </DropdownMenu.Item>
  );
}

function Content({
  children,
  ...props
}: Omit<DropdownMenu.DropdownMenuContentProps, "className" | "sideOffset">) {
  return (
    <DropdownMenu.Content
      {...props}
      className="w-56 rounded-md bg-blue-1000 p-1 text-white shadow-md will-change-[opacity,transform] data-[side=bottom]:animate-slide-up-and-fade data-[side=left]:animate-slide-right-and-fade data-[side=right]:animate-slide-left-and-fade data-[side=top]:animate-slide-down-and-fade"
      sideOffset={5}
    >
      {children}
      <DropdownMenu.Arrow className="fill-blue-1000" />
    </DropdownMenu.Content>
  );
}

function Label({
  children,
  ...props
}: Omit<DropdownMenu.DropdownMenuLabelProps, "className">) {
  return (
    <DropdownMenu.Label {...props} className="p-1">
      {children}
    </DropdownMenu.Label>
  );
}

function Separator() {
  return <DropdownMenu.Separator className="m-1 h-px bg-white/30" />;
}

function MoreActionsTrigger({
  onClick,
}: {
  onClick?: React.MouseEventHandler;
}) {
  return (
    <DropdownMenu.Trigger asChild>
      <button
        type="button"
        className="inline-flex rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="More actions"
        onClick={onClick}
      >
        <EllipsisHorizontal className="h-5 w-5" />
      </button>
    </DropdownMenu.Trigger>
  );
}

function Action({
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "className">) {
  return (
    <button {...props} className="flex w-full items-center">
      {children}
    </button>
  );
}

const Root = DropdownMenu.Root;
const Trigger = DropdownMenu.Trigger;
const Portal = DropdownMenu.Portal;

export {
  Action,
  Content,
  Item,
  Label,
  MoreActionsTrigger,
  Portal,
  Root,
  Separator,
  Trigger,
};
