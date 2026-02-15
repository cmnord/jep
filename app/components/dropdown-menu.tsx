import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

function Item(props: DropdownMenu.DropdownMenuItemProps) {
  return (
    <DropdownMenu.Item
      className={`group relative flex select-none items-center rounded-md p-1
      text-slate-200 outline-none
      data-[highlighted]:bg-white/10`}
      {...props}
    >
      {props.children}
    </DropdownMenu.Item>
  );
}

function Content(props: DropdownMenu.DropdownMenuContentProps) {
  return (
    <DropdownMenu.Content
      className={`w-56 rounded-md bg-blue-1000 p-1 text-white shadow-md
          will-change-[opacity,transform]
          data-[side=bottom]:animate-slideUpAndFade
          data-[side=left]:animate-slideRightAndFade
          data-[side=right]:animate-slideLeftAndFade
          data-[side=top]:animate-slideDownAndFade`}
      sideOffset={5}
      {...props}
    >
      {props.children}
      <DropdownMenu.Arrow className="fill-blue-1000" />
    </DropdownMenu.Content>
  );
}

const Root = DropdownMenu.Root;
const Trigger = DropdownMenu.Trigger;
const Portal = DropdownMenu.Portal;
const Label = DropdownMenu.Label;
const Separator = DropdownMenu.Separator;

export { Content, Item, Label, Portal, Root, Separator, Trigger };
