import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

export default function Popover({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={`max-w-xs rounded-md bg-blue-600 px-3 py-2 text-sm
          text-white shadow-lg
          data-[state=open]:data-[side=bottom]:animate-slideUpAndFade
          data-[state=open]:data-[side=left]:animate-slideRightAndFade
          data-[state=open]:data-[side=right]:animate-slideLeftAndFade
          data-[state=open]:data-[side=top]:animate-slideDownAndFade`}
          side="top"
          sideOffset={5}
        >
          {content}
          <PopoverPrimitive.Arrow className="fill-blue-600" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
