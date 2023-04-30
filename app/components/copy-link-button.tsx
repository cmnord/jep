import * as ToastPrimitive from "@radix-ui/react-toast";
import * as React from "react";

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
          className +
          ` inline-flex items-center rounded-md p-1 text-slate-700
          hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500
          focus:ring-offset-2`
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6"
          role="img"
          aria-labelledby="copy-title"
        >
          <title id="copy-title">Copy link</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
          />
        </svg>
        {text ? <span className="pl-2 text-sm">{text}</span> : null}
      </button>

      <ToastPrimitive.Root
        className={`items-center rounded-md bg-slate-100 p-4 shadow-md
        data-[swipe=cancel]:translate-x-0
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
        data-[state=closed]:animate-hide data-[state=open]:animate-slideIn
        data-[swipe=end]:animate-swipeOut
        data-[swipe=cancel]:transition-[transform_200ms_ease-out]`}
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
