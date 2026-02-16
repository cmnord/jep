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
        {/* Heroicon name: solid/link */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
          role="img"
          aria-labelledby="copy-title"
        >
          <title id="copy-title">Copy link</title>
          <path
            fillRule="evenodd"
            d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.035 6.037.75.75 0 01-.646 1.353 5.25 5.25 0 01-1.449-8.45l4.5-4.5a5.25 5.25 0 117.424 7.424l-1.757 1.757a.75.75 0 11-1.06-1.06l1.757-1.757a3.75 3.75 0 000-5.304zm-7.389 4.267a.75.75 0 011-.353 5.25 5.25 0 011.449 8.45l-4.5 4.5a5.25 5.25 0 11-7.424-7.424l1.757-1.757a.75.75 0 111.06 1.06l-1.757 1.757a3.75 3.75 0 105.304 5.304l4.5-4.5a3.75 3.75 0 00-1.035-6.037.75.75 0 01-.354-1z"
            clipRule="evenodd"
          />
        </svg>
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
