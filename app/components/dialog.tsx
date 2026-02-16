import * as DialogPrimitive from "@radix-ui/react-dialog";

/** Heroicon name: solid/x-mark */
function XMarkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      role="img"
      aria-labelledby="close-icon-title"
    >
      <title id="close-icon-title">Close</title>
      <path
        fillRule="evenodd"
        d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Dialog({
  isOpen,
  title,
  children,
  description,
  onClickClose,
}: {
  isOpen: boolean;
  title: React.ReactNode;
  description: React.ReactNode;
  children: React.ReactNode;
  /** onClickClose puts an "X" in the top right corner of the modal. */
  onClickClose?: () => void;
}) {
  return (
    <DialogPrimitive.Root open={isOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={`fixed top-0 right-0 bottom-0 left-0 grid animate-overlay-show place-items-center overflow-y-auto bg-slate-500/75 opacity-0`}
        >
          <DialogPrimitive.Content
            className={`animate-content-show rounded-md bg-blue-1000 p-4 opacity-0 shadow-xl focus:outline-none sm:max-w-lg`}
          >
            <DialogPrimitive.Title className="mb-4 text-2xl leading-6 font-medium text-white">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-3 mb-5 text-slate-300">
              {description}
            </DialogPrimitive.Description>
            {children}
            {onClickClose ? (
              <DialogPrimitive.Close asChild>
                <button
                  className={`absolute top-3 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-blue-600 hover:bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none`}
                  aria-label="Close"
                  onClick={onClickClose}
                >
                  <XMarkIcon />
                </button>
              </DialogPrimitive.Close>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-end gap-2 sm:flex-row">
      {children}
    </div>
  );
}

Dialog.Footer = Footer;
