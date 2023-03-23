import * as React from "react";

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="w-full text-2xl font-medium leading-6 text-slate-900 mb-4"
      id="modal-title"
    >
      {children}
    </h3>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
      <div className="sm:flex sm:items-start">
        <div className="mt-3 sm:mt-0 w-full">{children}</div>
      </div>
    </div>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
      {children}
    </div>
  );
}

function Modal(props: { isOpen: boolean; children?: React.ReactNode }) {
  if (!props.isOpen) {
    return null;
  }

  return (
    <div
      className="relative z-10"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"></div>
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg animate-bouncein">
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
}

Modal.Title = Title;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
