import * as React from "react";
import Button from "./button";

export default function Modal(props: {
  buttonContent: React.ReactNode;
  title: React.ReactNode;
  isOpen: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const handleClickOK = () => {
    if (props.onClick) {
      props.onClick();
    }
  };

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
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg animate-bouncein">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3
                    className="text-2xl font-medium leading-6 text-gray-900"
                    id="modal-title"
                  >
                    {props.title}
                  </h3>
                  <div className="mt-2">{props.children}</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <Button type="primary" onClick={handleClickOK}>
                {props.buttonContent}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}