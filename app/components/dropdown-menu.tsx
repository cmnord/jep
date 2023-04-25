import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

function Item(props: DropdownMenu.MenuItemProps) {
  return (
    <DropdownMenu.Item
      className={`group relative flex select-none items-center rounded-md p-1
      text-slate-500 outline-none
      data-[highlighted]:bg-slate-200 data-[highlighted]:text-slate-700`}
      {...props}
    >
      {props.children}
    </DropdownMenu.Item>
  );
}

function Content(props: DropdownMenu.MenuContentProps) {
  return (
    <DropdownMenu.Content
      className={`w-56 rounded-md bg-white p-1 text-slate-900 shadow-md
          will-change-[opacity,transform]
          data-[side=bottom]:animate-slideUpAndFade
          data-[side=left]:animate-slideRightAndFade
          data-[side=right]:animate-slideLeftAndFade
          data-[side=top]:animate-slideDownAndFade`}
      sideOffset={5}
      {...props}
    >
      {props.children}
      <DropdownMenu.Arrow className="fill-white" />
    </DropdownMenu.Content>
  );
}

const Root = DropdownMenu.Root;
const Trigger = DropdownMenu.Trigger;
const Portal = DropdownMenu.Portal;
const Label = DropdownMenu.Label;
const Separator = DropdownMenu.Separator;

export { Root, Trigger, Portal, Content, Item, Label, Separator };
