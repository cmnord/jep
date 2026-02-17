import * as ToastPrimitive from "@radix-ui/react-toast";
import * as React from "react";

import { LinkIcon } from "~/components/icons";

export default function CopyLinkButton({
  className,
  url,
  text,
}: {
  url: string;
  text?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef(0);

  React.useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <>
      <button
        type="button"
        className={
          (className ?? "") +
          ` inline-flex items-center rounded-md p-1 text-slate-200 hover:bg-white/10 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none`
        }
        onClick={() => {
          navigator.clipboard.writeText(url);
          setOpen(false);
          window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            setOpen(true);
          }, 100);
        }}
      >
        <LinkIcon className="h-6 w-6" title="Copy link" />
        {text ? <span className="pr-1 pl-2 text-sm">{text}</span> : null}
      </button>

      <ToastPrimitive.Root
        className={`items-center rounded-md bg-slate-100 p-4 shadow-md data-[state=closed]:animate-hide data-[state=open]:animate-slide-in data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipe-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]`}
        open={open}
        onOpenChange={setOpen}
      >
        <ToastPrimitive.Description asChild>
          <p className="text-sm text-slate-700">Copied link to clipboard</p>
        </ToastPrimitive.Description>
      </ToastPrimitive.Root>
    </>
  );
}
